/* eslint-disable import/no-extraneous-dependencies */
/**
 * This file tests all the "admin" features:
 * - fee withdrawals
 * - token approvals
 */

import { Contract } from '@ethersproject/contracts';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { init, MAINNET_ADDRESS_1INCH, WETH_ADDRESS } from '../utils';

describe('Admin', function () {
  let instance: Contract;
  let weth: Contract;

  before(async () => {
    await network.provider.request({
      method: 'hardhat_reset',
      params: [
        {
          forking: {
            blockNumber: 15214922,
            jsonRpcUrl: process.env.MAINNET_RPC_ENDPOINT,
          },
        },
      ],
    });

    const { rainbowRouterInstance, wethContract } = await init();
    instance = rainbowRouterInstance;
    weth = wethContract;
  });

  it('Should be able to withdraw tokens', async function () {
    // 1 - Send some tokens to the contract
    const amount = '10000000';
    const accounts = await ethers.getSigners();
    const receiver = accounts[2];

    const depositTx = await weth.deposit({
      value: amount,
    });
    await depositTx.wait();
    await weth.transfer(instance.address, amount);

    // 2 - Check that the router contract is holding some tokens
    const wethBalanceInContractBeforeWithdraw = await weth.balanceOf(
      instance.address
    );
    expect(wethBalanceInContractBeforeWithdraw.toString()).to.equal(amount);

    // 3 - Withdraw the tokens
    await expect(instance.withdrawToken(weth.address, receiver.address, amount))
      .to.emit(instance, 'TokenWithdrawn')
      .withArgs(
        ethers.utils.getAddress(weth.address),
        ethers.utils.getAddress(receiver.address),
        amount
      );

    const wethBalanceInContractAfterWithdraw = await weth.balanceOf(
      instance.address
    );
    const wethBalanceInReceiver = await weth.balanceOf(receiver.address);

    // 4 - Confirm the tokens were moved
    expect(wethBalanceInContractAfterWithdraw.toString()).to.equal('0');
    expect(wethBalanceInReceiver.toString()).to.equal(amount);
  });

  it('Should revert if attempting to withdraw tokens when sender is not the owner', async function () {
    // 1 - Send some tokens to the contract
    const amount = '10000000';
    const accounts = await ethers.getSigners();
    const receiver = accounts[2];

    const depositTx = await weth.deposit({
      value: amount,
    });
    await depositTx.wait();
    await weth.transfer(instance.address, amount);

    // 2 - Check that the router contract is holding some tokens
    const wethBalanceInContractBeforeWithdraw = await weth.balanceOf(
      instance.address
    );
    expect(wethBalanceInContractBeforeWithdraw.toString()).to.equal(amount);

    // 3 - Withdraw the tokens
    expect(
      instance
        .connect(accounts[2])
        .withdrawToken(weth.address, receiver.address, amount)
    ).to.be.revertedWith('ONLY_OWNER');
  });

  it('Should be able to withdraw ETH', async function () {
    // 1 - Send some ETH to the contract
    const amount = ethers.BigNumber.from('10000000');
    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const receiver = accounts[2];
    await signer.sendTransaction({ to: instance.address, value: amount });

    // 2 - Check that the router contract is holding some ETH
    const startingEthBalanceInReceiver = await receiver.getBalance();
    const ethBalanceInContractBeforeWithdraw = await ethers.provider.getBalance(
      instance.address
    );
    expect(ethBalanceInContractBeforeWithdraw.toString()).to.equal(
      amount.toString()
    );

    // 3 - Withdraw the ETH
    await expect(instance.withdrawEth(receiver.address, amount))
      .to.emit(instance, 'EthWithdrawn')
      .withArgs(receiver.address, amount);

    const ethBalanceInContractAfterWithdraw = await ethers.provider.getBalance(
      instance.address
    );
    const ethBalanceInReceiver = await receiver.getBalance();

    // 4 - Confirm the tokens were moved
    expect(ethBalanceInContractAfterWithdraw.toString()).to.equal('0');

    const finalReceiverExpectedBalance =
      startingEthBalanceInReceiver.add(amount);
    expect(ethBalanceInReceiver.toString()).to.equal(
      finalReceiverExpectedBalance.toString()
    );
  });

  it('Should revert if attempting to withdraw ETH when sender is not the owner', async function () {
    // 1 - Send some ETH to the contract
    const amount = ethers.BigNumber.from('10000000');
    const accounts = await ethers.getSigners();
    const signer = accounts[0];
    const receiver = accounts[2];
    await signer.sendTransaction({ to: instance.address, value: amount });

    // 2 - Check that the router contract is holding some ETH
    const ethBalanceInContractBeforeWithdraw = await ethers.provider.getBalance(
      instance.address
    );
    expect(ethBalanceInContractBeforeWithdraw.toString()).to.equal(
      amount.toString()
    );

    // 3 - Withdraw the ETH
    expect(
      instance.connect(accounts[2]).withdrawEth(receiver.address, amount)
    ).to.be.revertedWith('ONLY_OWNER');
  });

  it('Should be able to add swap targets', async function () {
    await expect(instance.updateSwapTargets(MAINNET_ADDRESS_1INCH, true))
      .to.emit(instance, 'SwapTargetAdded')
      .withArgs(ethers.utils.getAddress(MAINNET_ADDRESS_1INCH));
    const exists = await instance.swapTargets(MAINNET_ADDRESS_1INCH);
    expect(exists).to.equal(true);
  });

  it('Should be able to remove swap targets', async function () {
    await expect(instance.updateSwapTargets(MAINNET_ADDRESS_1INCH, false))
      .to.emit(instance, 'SwapTargetRemoved')
      .withArgs(ethers.utils.getAddress(MAINNET_ADDRESS_1INCH));
    const exists = await instance.swapTargets(MAINNET_ADDRESS_1INCH);
    expect(exists).to.equal(false);
  });

  it('Should revert if attempting to add swap targets when sender is not the owner', async function () {
    const accounts = await ethers.getSigners();
    expect(
      instance
        .connect(accounts[2])
        .updateSwapTargets(MAINNET_ADDRESS_1INCH, true)
    ).to.be.revertedWith('ONLY_OWNER');
  });

  it('Should revert if attempting to remove swap targets when sender is not the owner', async function () {
    const accounts = await ethers.getSigners();
    expect(
      instance
        .connect(accounts[2])
        .updateSwapTargets(MAINNET_ADDRESS_1INCH, false)
    ).to.be.revertedWith('ONLY_OWNER');
  });

  it('Should revert if attempting to transfer ownership to ZERO_ADDRESS', async function () {
    expect(
      instance.transferOwnership(ethers.constants.AddressZero)
    ).to.be.revertedWith('ZERO_ADDRESS');
  });

  it('Should be able to transfer ownership', async function () {
    const accounts = await ethers.getSigners();
    const previousOwner = accounts[0].address;
    const newOwnerAddress = accounts[1].address;

    await expect(instance.transferOwnership(newOwnerAddress))
      .to.emit(instance, 'OwnerChanged')
      .withArgs(newOwnerAddress, previousOwner);

    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwnerAddress);
  });

  it('Should revert if attempting transferOwnership when sender is not the owner', async function () {
    const accounts = await ethers.getSigners();
    const newOwnerAddress = accounts[1].address;
    expect(
      instance.connect(accounts[2]).transferOwnership(newOwnerAddress)
    ).to.be.revertedWith('ONLY_OWNER');
  });

  it('Should revert if an attacker attempts "Approval snatching" from a victim that previously approved an ERC20 token on RainbowRouter', async function () {
    const amount = '10000000';
    const attackerSellAmount = '1';
    const accounts = await ethers.getSigners();
    const victim = accounts[1];
    const attacker = accounts[2];

    // 1 - Get some WETH to the victim
    await weth.connect(victim).deposit({
      value: amount,
    });

    // 2 - Approve the Rainbow contract to transfer WETH from the victim's account
    await weth.connect(victim).approve(instance.address, amount);

    // 3 - Get some WETH to the attacker
    await weth.connect(attacker).deposit({
      value: attackerSellAmount,
    });

    // 4 - Approve the Rainbow contract to transfer WETH from the attacker's account
    await weth.connect(attacker).approve(instance.address, attackerSellAmount);

    // WETH.transferFrom(victim, attacker, amount);
    const malicousCalldata = weth.interface.encodeFunctionData('transferFrom', [
      victim.address,
      attacker.address,
      amount,
    ]);

    // 5 - Call swap aggregator with the malicious calldata
    // to execute approval snatching attack
    const hackTx = instance
      .connect(attacker)
      .fillQuoteTokenToEth(
        WETH_ADDRESS,
        WETH_ADDRESS,
        malicousCalldata,
        attackerSellAmount,
        '0',
        {
          value: '0',
        }
      );

    expect(hackTx).to.be.revertedWith('TARGET_NOT_AUTH');
  });

  it('Should revert if an attacker attempts "Approval snatching" trying to steal collected fees from RainbwoRouter', async function () {
    const amount = '10000000';
    const attackerSellAmount = '1';
    const accounts = await ethers.getSigners();
    const attacker = accounts[2];

    // 1 - Check that the router contract is holding some tokens
    const wethBalanceInContract = await weth.balanceOf(instance.address);
    expect(wethBalanceInContract.toString()).to.equal(amount.toString());

    // 2 - Get some WETH to the attacker
    await weth.connect(attacker).deposit({
      value: attackerSellAmount,
    });

    // 4 - Approve the Rainbow contract to transfer WETH from the attacker's account
    await weth.connect(attacker).approve(instance.address, attackerSellAmount);

    // WETH.transferFrom(instance.address, attacker, amount);
    const malicousCalldata = weth.interface.encodeFunctionData('transferFrom', [
      instance.address,
      attacker.address,
      wethBalanceInContract,
    ]);

    // 5 - Call swap aggregator with the malicious calldata
    // to execute approval snatching attack
    const hackTx = instance
      .connect(attacker)
      .fillQuoteTokenToEth(
        WETH_ADDRESS,
        WETH_ADDRESS,
        malicousCalldata,
        attackerSellAmount,
        '0',
        {
          value: '0',
        }
      );

    expect(hackTx).to.be.revertedWith('TARGET_NOT_AUTH');
  });

  it('Should revert if someone that is not an allowed swap target sends eth', async function () {
    const accounts = await ethers.getSigners();
    const sender = accounts[0];
    const tx = sender.sendTransaction({
      to: instance.address,
    });
    expect(tx).to.be.revertedWith('NO_RECEIVE');
  });
});
