/* eslint-disable import/no-extraneous-dependencies */
/**
 * This file tests all the possible combinations of:
 * TOKEN => ETH
 * TOKEN => TOKEN
 * ETH => TOKEN
 *
 * through 0x
 *
 * with no fees
 *
 * based on the output amount
 *
 */
import path from 'path';
import { BigNumberish } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { EthereumAddress, Sources } from '../types';
import {
  DAI_ADDRESS,
  ETH_ADDRESS,
  getQuoteFromFile,
  init,
  Logger,
  showGasUsage,
  WETH_ADDRESS,
} from '../utils';

const TESTDATA_DIR = path.resolve(__dirname, 'testdata/output');

describe('RainbowRouter Aggregators', function () {
  let swapWETHtoDAIFromOutput: any,
    swapDAItoWETHFromOutput: any,
    swapETHtoDAIFromOutput: any,
    swapDAItoETHFromOutput: any,
    currentVaultAddress: EthereumAddress;

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

    const { signer, wethContract, daiContract, rainbowRouterInstance } =
      await init();
    currentVaultAddress = rainbowRouterInstance.address;

    // FROM OUTPUT
    swapWETHtoDAIFromOutput = async (
      source: Sources,
      buyAmount: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const buyAmountWei = ethers.utils.parseEther(buyAmount.toString());

      Logger.log(
        'Output amount',
        ethers.utils.formatEther(buyAmountWei),
        'DAI'
      );

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'output',
        WETH_ADDRESS,
        DAI_ADDRESS,
        buyAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        `User will get ~ `,
        ethers.utils.formatEther(quote.buyAmount),
        'DAI from ',
        ethers.utils.formatEther(quote.sellAmount),
        'WETH'
      );

      const amountToWrapWei = ethers.utils.parseEther('0.1');

      Logger.log(
        `User wrapping ${amountToWrapWei} into WETH to have input token available...`
      );
      const depositTx = await wethContract.deposit({
        value: amountToWrapWei,
      });
      await depositTx.wait();

      const initialWethBalance = await wethContract.balanceOf(signer.address);
      const initialDaiBalance = await daiContract.balanceOf(signer.address);

      Logger.log(
        'Initial user WETH balance',
        ethers.utils.formatEther(initialWethBalance)
      );
      Logger.log(
        'Initial user balance (DAI): ',
        ethers.utils.formatEther(initialDaiBalance)
      );

      // Grant the contact an allowance to spend our WETH.
      const approveTx = await wethContract.approve(
        rainbowRouterInstance.address,
        amountToWrapWei
      );

      await approveTx.wait();
      Logger.log(`Approved token allowance of `, amountToWrapWei.toString());

      Logger.log(`Executing swap...`, JSON.stringify(quote, null, 2));

      const swapTx = await rainbowRouterInstance.fillQuoteTokenToToken(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        quote.to,
        quote.data,
        quote.sellAmount,
        quote.fee,
        {
          value: quote.value,
        }
      );

      const receipt = await swapTx.wait();

      showGasUsage &&
        Logger.info('      ⛽  Gas usage: ', receipt.gasUsed.toString());

      const daiBalanceSigner = await daiContract.balanceOf(signer.address);
      Logger.log(
        'Final user balance (DAI): ',
        ethers.utils.formatEther(daiBalanceSigner)
      );

      const wethBalanceSigner = await wethContract.balanceOf(signer.address);
      Logger.log(
        'Final user balance (WETH): ',
        ethers.utils.formatEther(wethBalanceSigner)
      );

      expect(daiBalanceSigner.gt(initialDaiBalance)).to.be.equal(true);
      expect(wethBalanceSigner.lt(initialWethBalance)).to.be.equal(true);
      return true;
    };

    swapDAItoWETHFromOutput = async (
      source: Sources,
      buyAmount: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const initialWethBalance = await wethContract.balanceOf(signer.address);
      const initialDaiBalance = await daiContract.balanceOf(signer.address);
      Logger.log(
        'Initial user balance (DAI): ',
        ethers.utils.formatEther(initialDaiBalance)
      );
      Logger.log(
        'Initial user balance (WETH)',
        ethers.utils.formatEther(initialWethBalance)
      );

      const buyAmountWei = ethers.utils.parseEther('0.01');

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'output',
        DAI_ADDRESS,
        WETH_ADDRESS,
        buyAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        'Output amount',
        ethers.utils.formatEther(buyAmountWei),
        'WETH'
      );

      Logger.log(
        'Amount to be swapped',
        ethers.utils.formatEther(quote.sellAmount),
        'DAI'
      );

      Logger.log(
        `User will get ~ `,
        ethers.utils.formatEther(quote.buyAmount),
        'WETH'
      );

      // Grant the allowance target an allowance to spend our DAI.
      const approveTx = await daiContract.approve(
        rainbowRouterInstance.address,
        initialDaiBalance
      );

      await approveTx.wait();

      Logger.log(`Executing swap...`);
      const swapTx = await rainbowRouterInstance.fillQuoteTokenToToken(
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        quote.to,
        quote.data,
        quote.sellAmount,
        quote.fee,
        {
          value: quote.value,
        }
      );

      const receipt = await swapTx.wait();
      showGasUsage &&
        Logger.info('      ⛽  Gas usage: ', receipt.gasUsed.toString());

      const daiBalanceSigner = await daiContract.balanceOf(signer.address);
      const wethBalanceSigner = await wethContract.balanceOf(signer.address);
      const daiBalanceVault = await daiContract.balanceOf(currentVaultAddress);

      Logger.log(
        'Final user balance (DAI): ',
        ethers.utils.formatEther(daiBalanceSigner)
      );
      Logger.log(
        'Final user balance (WETH): ',
        ethers.utils.formatEther(wethBalanceSigner)
      );
      Logger.log(
        'Final VAULT balance (DAI): ',
        ethers.utils.formatEther(daiBalanceVault)
      );

      expect(daiBalanceSigner.lt(initialDaiBalance)).to.be.equal(true);
      expect(wethBalanceSigner.gt(initialWethBalance)).to.be.equal(true);
      expect(daiBalanceVault.gte(quote.fee)).to.be.equal(true);
    };

    swapETHtoDAIFromOutput = async (
      source: Sources,
      buyAmount: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const buyAmountWei = ethers.utils.parseEther(buyAmount.toString());

      Logger.log(
        'Output amount',
        ethers.utils.formatEther(buyAmountWei),
        'DAI'
      );

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'output',
        ETH_ADDRESS,
        DAI_ADDRESS,
        buyAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        `User will get ~ `,
        ethers.utils.formatEther(quote.buyAmount),
        'DAI from ',
        ethers.utils.formatEther(quote.sellAmount),
        'ETH'
      );

      const initialEthBalance = await signer.getBalance();
      const initialDaiBalance = await daiContract.balanceOf(signer.address);

      Logger.log(
        'Initial user ETH balance',
        ethers.utils.formatEther(initialEthBalance)
      );
      Logger.log(
        'Initial user balance (DAI): ',
        ethers.utils.formatEther(initialDaiBalance)
      );

      Logger.log(`Executing swap...`, JSON.stringify(quote, null, 2));

      const swapTx = await rainbowRouterInstance.fillQuoteEthToToken(
        quote.buyTokenAddress,
        quote.to,
        quote.data,
        quote.fee,
        {
          value: quote.value,
        }
      );

      const receipt = await swapTx.wait();

      showGasUsage &&
        Logger.info('      ⛽  Gas usage: ', receipt.gasUsed.toString());

      const daiBalanceSigner = await daiContract.balanceOf(signer.address);
      Logger.log(
        'Final user balance (DAI): ',
        ethers.utils.formatEther(daiBalanceSigner)
      );
      const ethBalanceSigner = await signer.getBalance();
      Logger.log(
        'Final user balance (ETH): ',
        ethers.utils.formatEther(ethBalanceSigner)
      );

      expect(daiBalanceSigner.gt(initialDaiBalance)).to.be.equal(true);
      expect(ethBalanceSigner.lt(initialEthBalance)).to.be.equal(true);
      return true;
    };

    swapDAItoETHFromOutput = async (
      source: Sources,
      _: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const initialEthBalance = await signer.getBalance();
      const initialDaiBalance = await daiContract.balanceOf(signer.address);
      Logger.log(
        'Initial user balance (DAI): ',
        ethers.utils.formatEther(initialDaiBalance)
      );
      Logger.log(
        'Initial user balance (ETH)',
        ethers.utils.formatEther(initialEthBalance)
      );

      const buyAmountWei = ethers.utils.parseEther('0.01');

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'output',
        DAI_ADDRESS,
        ETH_ADDRESS,
        buyAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        'Output amount',
        ethers.utils.formatEther(buyAmountWei),
        'ETH'
      );

      Logger.log(
        'Amount to be swapped',
        ethers.utils.formatEther(quote.sellAmount),
        'DAI'
      );

      Logger.log(
        `User will get ~ `,
        ethers.utils.formatEther(quote.buyAmount),
        'ETH'
      );

      // Grant the allowance target an allowance to spend our DAI.
      const approveTx = await daiContract.approve(
        rainbowRouterInstance.address,
        initialDaiBalance
      );

      await approveTx.wait();

      Logger.log(`Executing swap...`);
      const swapTx = await rainbowRouterInstance.fillQuoteTokenToEth(
        quote.sellTokenAddress,
        quote.to,
        quote.data,
        quote.sellAmount,
        quote.feePercentageBasisPoints,
        {
          value: quote.value,
        }
      );

      const receipt = await swapTx.wait();
      showGasUsage &&
        Logger.info('      ⛽  Gas usage: ', receipt.gasUsed.toString());

      const daiBalanceSigner = await daiContract.balanceOf(signer.address);
      const ethBalanceSigner = await signer.getBalance();
      const daiBalanceVault = await daiContract.balanceOf(currentVaultAddress);

      Logger.log(
        'Final user balance (DAI): ',
        ethers.utils.formatEther(daiBalanceSigner)
      );
      Logger.log(
        'Final user balance (ETH): ',
        ethers.utils.formatEther(ethBalanceSigner)
      );
      Logger.log(
        'Final VAULT balance (DAI): ',
        ethers.utils.formatEther(daiBalanceVault)
      );

      expect(daiBalanceSigner.lt(initialDaiBalance)).to.be.equal(true);
      expect(daiBalanceVault.gte(quote.fee)).to.be.equal(true);
    };
  });

  describe('Trades based on output amount instead of input', function () {
    // ====>  0x trades
    it('Should be able to swap wETH to DAI with no fee on 0x (FROM OUTPUT)', async function () {
      return swapWETHtoDAIFromOutput('0x', '100', 0);
    });

    it('Should be able to swap DAI to WETH with no fee on 0x (FROM OUTPUT)', async function () {
      return swapDAItoWETHFromOutput('0x', null, 0);
    });

    it('Should be able to swap ETH to DAI with no fee on 0x (FROM OUTPUT)', async function () {
      return swapETHtoDAIFromOutput('0x', '100', 0);
    });

    it('Should be able to swap DAI to ETH with no fee on 0x (FROM OUTPUT)', async function () {
      return swapDAItoETHFromOutput('0x', null, 0);
    });
  });
});
