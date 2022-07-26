/**
 * This file tests all the possible combinations of:
 * TOKEN => ETH
 * TOKEN => TOKEN
 * ETH => TOKEN
 *
 * through both aggregators (0x and 1inch)
 *
 * with different fees (0%, 0.5% and 1%)
 *
 * based on the input amount
 *
 */

import path from 'path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { BigNumberish } from '@ethersproject/bignumber';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { EthereumAddress, Sources } from '../types';
import {
  DAI_ADDRESS,
  ETH_ADDRESS,
  getQuoteFromFile,
  getVaultBalanceForToken,
  init,
  Logger,
  showGasUsage,
  WETH_ADDRESS,
} from '../utils';

const SELL_AMOUNT = '0.1';
const TESTDATA_DIR = path.resolve(__dirname, 'testdata/input');

describe('RainbowRouter Aggregators', function () {
  let swapTokenToToken: any,
    swapETHtoToken: any,
    swapTokenToETH: any,
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

    const { signer, rainbowRouterInstance, getEthVaultBalance } = await init();
    currentVaultAddress = rainbowRouterInstance.address;

    swapTokenToToken = async (
      source: Sources,
      inputAsset: EthereumAddress,
      outputAsset: EthereumAddress,
      sellAmount: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const initialVaultInputTokenBalance = await getVaultBalanceForToken(
        inputAsset,
        rainbowRouterInstance.address
      );
      const initialVaultOutputTokenBalance = await getVaultBalanceForToken(
        outputAsset,
        rainbowRouterInstance.address
      );

      const inputAssetContract = await ethers.getContractAt(
        inputAsset.toLowerCase() === WETH_ADDRESS.toLowerCase()
          ? 'IWETH'
          : '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
        inputAsset
      );
      const inputAssetSymbol = await inputAssetContract.symbol();
      const inputAssetDecimals = await inputAssetContract.decimals();

      const outputAssetContract = await ethers.getContractAt(
        outputAsset.toLowerCase() === WETH_ADDRESS.toLowerCase()
          ? 'IWETH'
          : '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
        outputAsset
      );

      const outputAssetSymbol = await outputAssetContract.symbol();
      const outputAssetDecimals = await outputAssetContract.decimals();

      const sellAmountWei = ethers.utils.parseEther(sellAmount.toString());

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'input',
        inputAsset,
        outputAsset,
        sellAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        'Input amount',
        ethers.utils.formatUnits(sellAmountWei, inputAssetDecimals),
        inputAssetSymbol
      );
      Logger.log(
        'Fee',
        ethers.utils.formatUnits(quote.fee, inputAssetDecimals),
        inputAssetSymbol
      );
      Logger.log(
        `User will get ~ `,
        ethers.utils.formatUnits(quote.buyAmount, outputAssetDecimals),
        outputAssetSymbol
      );

      if (inputAsset === WETH_ADDRESS) {
        Logger.log(
          `User wrapping ${sellAmount} into WETH to have input token available...`
        );
        const depositTx = await inputAssetContract.deposit({
          value: sellAmountWei,
        });
        await depositTx.wait();
      }

      const initialInputAssetBalance = await inputAssetContract.balanceOf(
        signer.address
      );
      const initialOutputAssetBalance = await outputAssetContract.balanceOf(
        signer.address
      );

      Logger.log(
        `Initial user ${inputAssetSymbol} balance`,
        ethers.utils.formatUnits(initialInputAssetBalance, inputAssetDecimals)
      );
      Logger.log(
        `Initial user balance ${outputAssetSymbol}: `,
        ethers.utils.formatUnits(initialOutputAssetBalance, outputAssetDecimals)
      );

      // Grant the contact an allowance to spend our token.
      const approveTx = await inputAssetContract.approve(
        rainbowRouterInstance.address,
        sellAmountWei
      );

      await approveTx.wait();
      Logger.log(`Approved token allowance of `, sellAmountWei.toString());

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

      const finalInputAssetBalance = await inputAssetContract.balanceOf(
        signer.address
      );
      const finalOutputAssetBalance = await outputAssetContract.balanceOf(
        signer.address
      );
      const inputTokenBalanceVault = await inputAssetContract.balanceOf(
        currentVaultAddress
      );
      Logger.log(
        `Final user balance (${outputAssetSymbol}): `,
        ethers.utils.formatUnits(finalOutputAssetBalance, outputAssetDecimals)
      );
      Logger.log(
        `Final VAULT balance (${inputAssetSymbol}): `,
        ethers.utils.formatUnits(inputTokenBalanceVault, inputAssetDecimals)
      );

      const finalVaultInputTokenBalance = await getVaultBalanceForToken(
        inputAsset,
        rainbowRouterInstance.address
      );
      const finalVaultOutputTokenBalance = await getVaultBalanceForToken(
        outputAsset,
        rainbowRouterInstance.address
      );

      expect(finalInputAssetBalance.lt(initialInputAssetBalance)).to.be.equal(
        true
      );
      expect(finalOutputAssetBalance.gt(initialOutputAssetBalance)).to.be.equal(
        true
      );
      expect(inputTokenBalanceVault.gte(quote.fee)).to.be.equal(true);

      expect(
        finalVaultInputTokenBalance.gte(initialVaultInputTokenBalance)
      ).to.be.equal(true);
      expect(
        finalVaultOutputTokenBalance.gte(initialVaultOutputTokenBalance)
      ).to.be.equal(true);

      return true;
    };

    swapETHtoToken = async (
      source: Sources,
      outputAsset: EthereumAddress,
      sellAmount: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const initialVaultOutputTokenBalance = await getVaultBalanceForToken(
        outputAsset,
        rainbowRouterInstance.address
      );

      const tokenContract = await ethers.getContractAt(
        outputAsset.toLowerCase() === WETH_ADDRESS.toLowerCase()
          ? 'IWETH'
          : '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
        outputAsset
      );
      const initialEthBalance = await signer.getBalance();
      const initialTokenBalance = await tokenContract.balanceOf(signer.address);
      const tokenSymbol = await tokenContract.symbol();
      const tokenDecimals = await tokenContract.decimals();

      Logger.log(
        'Initial user balance (ETH)',
        ethers.utils.formatEther(initialEthBalance)
      );
      Logger.log(
        `Initial user balance (${tokenSymbol}): `,
        ethers.utils.formatUnits(initialTokenBalance, tokenDecimals)
      );

      const sellAmountWei = ethers.utils.parseEther(sellAmount.toString());

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'input',
        ETH_ADDRESS,
        outputAsset,
        sellAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        'Input amount',
        ethers.utils.formatEther(sellAmountWei),
        'ETH'
      );
      Logger.log('Fee', ethers.utils.formatEther(quote.fee), 'ETH');
      Logger.log(
        'Amount to be swapped',
        ethers.utils.formatEther(quote.sellAmountMinusFees),
        'ETH'
      );
      Logger.log(
        `User will get ~ `,
        ethers.utils.formatUnits(quote.buyAmount),
        tokenSymbol
      );

      const ethBalanceVaultBeforeSwap = await getEthVaultBalance();

      Logger.log(
        `Executing swap... with `,
        ethers.utils.formatEther(sellAmountWei)
      );
      Logger.log('calldata is: ', quote.data);
      Logger.log('target is: ', quote.to);
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

      const tokenBalanceSigner = await tokenContract.balanceOf(signer.address);
      const ethBalanceSigner = await signer.getBalance();
      const ethBalanceVault = await getEthVaultBalance();
      const ethVaultDiff = ethBalanceVault.sub(ethBalanceVaultBeforeSwap);
      Logger.log(
        `Final user balance (${tokenSymbol}): `,
        ethers.utils.formatEther(tokenBalanceSigner)
      );
      Logger.log(
        'Final user balance (ETH): ',
        ethers.utils.formatEther(ethBalanceSigner)
      );
      Logger.log(
        'Final vault balance (ETH): ',
        ethers.utils.formatEther(ethBalanceVault)
      );
      Logger.log(
        'Vault increase (ETH): ',
        ethers.utils.formatEther(ethVaultDiff)
      );

      const finalVaultOutputTokenBalance = await getVaultBalanceForToken(
        outputAsset,
        rainbowRouterInstance.address
      );

      expect(tokenBalanceSigner.gt(initialTokenBalance)).to.be.equal(true);
      expect(ethBalanceSigner.lt(initialEthBalance)).to.be.equal(true);
      expect(ethers.utils.formatEther(ethVaultDiff)).to.be.equal(
        ethers.utils.formatEther(quote.fee)
      );

      expect(ethBalanceVault.gte(ethBalanceVaultBeforeSwap)).to.be.equal(true);
      expect(
        finalVaultOutputTokenBalance.gte(initialVaultOutputTokenBalance)
      ).to.be.equal(true);
    };

    swapTokenToETH = async (
      source: Sources,
      inputAsset: EthereumAddress,
      _: BigNumberish,
      feePercentageBasisPoints: BigNumberish
    ) => {
      const initialVaultInputTokenBalance = await getVaultBalanceForToken(
        inputAsset,
        rainbowRouterInstance.address
      );
      const tokenContract = await ethers.getContractAt(
        inputAsset.toLowerCase() === WETH_ADDRESS.toLowerCase()
          ? 'IWETH'
          : '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
        inputAsset
      );
      const initialEthBalance = await signer.getBalance();
      const initialTokenBalance = await tokenContract.balanceOf(signer.address);
      const tokenSymbol = await tokenContract.symbol();
      const tokenDecimals = await tokenContract.decimals();
      const ethBalanceVaultBeforeSwap = await getEthVaultBalance();

      Logger.log(
        `Initial user balance (${tokenSymbol}): `,
        ethers.utils.formatUnits(initialTokenBalance, tokenDecimals)
      );
      Logger.log(
        'Initial user balance (ETH)',
        ethers.utils.formatEther(initialEthBalance)
      );

      const sellAmountWei = initialTokenBalance;

      const quote = await getQuoteFromFile(
        TESTDATA_DIR,
        source,
        'input',
        inputAsset,
        ETH_ADDRESS,
        sellAmountWei.toString(),
        feePercentageBasisPoints.toString()
      );
      if (!quote) return;

      Logger.log(
        'Input amount',
        ethers.utils.formatUnits(sellAmountWei, tokenDecimals),
        tokenSymbol
      );
      Logger.log('Fee', ethers.utils.formatEther(quote.fee), 'ETH');
      Logger.log(
        'Amount to be swapped',
        ethers.utils.formatUnits(quote.sellAmountMinusFees, tokenDecimals),
        tokenSymbol
      );
      Logger.log(
        `User will get ~ `,
        ethers.utils.formatEther(quote.buyAmount),
        'ETH'
      );

      // Grant the allowance target an allowance to spend our WETH.
      const approveTx = await tokenContract.approve(
        rainbowRouterInstance.address,
        sellAmountWei
      );

      await approveTx.wait();

      Logger.log(`Executing swap...`);
      Logger.log('calldata is: ', quote.data);
      Logger.log('target is: ', quote.to);

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

      const tokenBalanceSigner = await tokenContract.balanceOf(signer.address);
      const ethBalanceSigner = await signer.getBalance();
      const ethBalanceVault = await getEthVaultBalance();
      const ethVaultDiff = ethBalanceVault.sub(ethBalanceVaultBeforeSwap);

      Logger.log(
        `Final user balance (${tokenSymbol}): `,
        ethers.utils.formatUnits(tokenBalanceSigner, tokenDecimals)
      );
      Logger.log(
        'Final user balance (ETH): ',
        ethers.utils.formatEther(ethBalanceSigner)
      );
      Logger.log(
        'Final VAULT balance (ETH): ',
        ethers.utils.formatEther(ethBalanceVault)
      );
      Logger.log(
        'Vault increase (ETH): ',
        ethers.utils.formatEther(ethVaultDiff)
      );

      const finalVaultInputTokenBalance = await getVaultBalanceForToken(
        inputAsset,
        rainbowRouterInstance.address
      );

      expect(tokenBalanceSigner).to.be.equal('0');
      expect(ethBalanceSigner.gt(initialEthBalance)).to.be.equal(true);
      if (feePercentageBasisPoints > 0) {
        expect(ethVaultDiff.gt(ethers.BigNumber.from('0'))).to.be.equal(true);
      }
      expect(ethBalanceVault.gte(ethBalanceVaultBeforeSwap)).to.be.equal(true);
      expect(
        finalVaultInputTokenBalance.gte(initialVaultInputTokenBalance)
      ).to.be.equal(true);
    };
  });

  describe('Trades based on input amount', function () {
    // =====> 1inch trades

    // No fee
    it('Should be able to swap wETH to DAI with no fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        WETH_ADDRESS,
        DAI_ADDRESS,
        SELL_AMOUNT,
        0
      );
    });

    it('Should be able to swap DAI to wETH with no fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        DAI_ADDRESS,
        WETH_ADDRESS,
        SELL_AMOUNT,
        0
      );
    });

    it('Should be able to swap ETH to DAI with no fee on 1inch', async function () {
      return swapETHtoToken('1inch', DAI_ADDRESS, SELL_AMOUNT, 0);
    });

    it('Should be able to swap DAI to ETH with no fee on 1inch', async function () {
      return swapTokenToETH('1inch', DAI_ADDRESS, SELL_AMOUNT, 0);
    });

    // 0.5 % fee
    it('Should be able to swap wETH to DAI with a 0.5% fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        WETH_ADDRESS,
        DAI_ADDRESS,
        SELL_AMOUNT,
        50
      );
    });

    it('Should be able to swap DAI to wETH with a 0.5% fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        DAI_ADDRESS,
        WETH_ADDRESS,
        SELL_AMOUNT,
        50
      );
    });

    it('Should be able to swap ETH to DAI with a 0.5% fee on 1inch', async function () {
      return swapETHtoToken('1inch', DAI_ADDRESS, SELL_AMOUNT, 50);
    });

    it('Should be able to swap DAI to ETH with a 0.5% fee on 1inch', async function () {
      return swapETHtoToken('1inch', DAI_ADDRESS, SELL_AMOUNT, 50);
    });

    // 1% fee
    it('Should be able to swap wETH to DAI with a 1% fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        WETH_ADDRESS,
        DAI_ADDRESS,
        SELL_AMOUNT,
        100
      );
    });

    it('Should be able to swap DAI to wETH with a 1% fee on 1inch', async function () {
      return swapTokenToToken(
        '1inch',
        DAI_ADDRESS,
        WETH_ADDRESS,
        SELL_AMOUNT,
        100
      );
    });

    it('Should be able to swap ETH to DAI with a 1% fee on 1inch', async function () {
      return swapETHtoToken('1inch', DAI_ADDRESS, SELL_AMOUNT, 100);
    });

    it('Should be able to swap DAI to ETH with a 1% fee on 1inch', async function () {
      return swapETHtoToken('1inch', DAI_ADDRESS, SELL_AMOUNT, 100);
    });

    // ====>  0x trades

    // No fee
    it('Should be able to swap wETH to DAI with no fee on 0x', async function () {
      return swapTokenToToken('0x', WETH_ADDRESS, DAI_ADDRESS, SELL_AMOUNT, 0);
    });

    it('Should be able to swap DAI to wETH with no fee on 0x', async function () {
      return swapTokenToToken('0x', DAI_ADDRESS, WETH_ADDRESS, SELL_AMOUNT, 0);
    });

    it('Should be able to swap ETH to DAI with no fee on 0x', async function () {
      return swapETHtoToken('0x', DAI_ADDRESS, SELL_AMOUNT, 0);
    });

    it('Should be able to swap DAI to ETH with no fee on 0x', async function () {
      return swapTokenToETH('0x', DAI_ADDRESS, SELL_AMOUNT, 0);
    });

    // 0.5 % fee
    it('Should be able to swap wETH to DAI with a 0.5% fee on 0x', async function () {
      return swapTokenToToken('0x', WETH_ADDRESS, DAI_ADDRESS, SELL_AMOUNT, 50);
    });

    it('Should be able to swap DAI to wETH with a 0.5% fee on 0x', async function () {
      return swapTokenToToken('0x', DAI_ADDRESS, WETH_ADDRESS, SELL_AMOUNT, 50);
    });

    it('Should be able to swap ETH to DAI with a 0.5% fee on 0x', async function () {
      return swapETHtoToken('0x', DAI_ADDRESS, SELL_AMOUNT, 50);
    });

    it('Should be able to swap DAI to ETH with a 0.5% fee on 0x', async function () {
      return swapETHtoToken('0x', DAI_ADDRESS, SELL_AMOUNT, 50);
    });

    // 1% fee
    it('Should be able to swap wETH to DAI with a 1% fee on 0x', async function () {
      return swapTokenToToken(
        '0x',
        WETH_ADDRESS,
        DAI_ADDRESS,
        SELL_AMOUNT,
        100
      );
    });

    it('Should be able to swap DAI to wETH with a 1% fee on 0x', async function () {
      return swapTokenToToken(
        '0x',
        DAI_ADDRESS,
        WETH_ADDRESS,
        SELL_AMOUNT,
        100
      );
    });

    it('Should be able to swap ETH to DAI with a 1% fee on 0x', async function () {
      return swapETHtoToken('0x', DAI_ADDRESS, SELL_AMOUNT, 100);
    });

    it('Should be able to swap DAI to ETH with a 1% fee on 0x', async function () {
      return swapETHtoToken('0x', DAI_ADDRESS, SELL_AMOUNT, 100);
    });
  });
});
