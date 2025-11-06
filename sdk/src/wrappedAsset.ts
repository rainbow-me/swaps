import { Signer } from '@ethersproject/abstract-signer';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import type { Address } from 'ox/Address';
import { default as WethAbi } from './abi/Weth.json';
import { Quote, SwapType, TransactionOptions } from './types';

/**
 * Function to wrap a specific amount of the native asset
 * for the specified wallet from its ERC20 version
 * @param {BigNumberish} amount
 * @param {Signer} wallet
 * @param {Address} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const wrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Signer,
  wrappedAssetAddress: Address,
  transactionOptions: TransactionOptions = {}
): Promise<Transaction> => {
  const instance = new Contract(
    wrappedAssetAddress,
    JSON.stringify(WethAbi),
    wallet
  );

  return instance.deposit({
    ...transactionOptions,
    value: amount,
  });
};

/**
 * Function to unwrap a specific amount of the native asset
 * for the specified wallet from its ERC20 version
 * @param {BigNumberish} amount
 * @param {Signer} wallet
 * @param {Address} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const unwrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Signer,
  wrappedAssetAddress: Address,
  transactionOptions: TransactionOptions = {}
): Promise<Transaction> => {
  const instance = new Contract(
    wrappedAssetAddress,
    JSON.stringify(WethAbi),
    wallet
  );

  return instance.withdraw(amount, transactionOptions);
};

/**
 * Function that returns a pointer to the smart contract
 * function that wraps or unwraps, to be used by estimateGas calls
 * @param {string} name
 * @param {StaticJsonRpcProvider} provider
 * @param {Address} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const getWrappedAssetMethod = (
  name: string,
  provider: StaticJsonRpcProvider,
  wrappedAssetAddress: Address
): any => {
  const instance = new Contract(
    wrappedAssetAddress,
    JSON.stringify(WethAbi),
    provider
  );
  return instance.estimateGas[name];
};

/**
 * Get the wrapped asset address from a quote on a wrap/unwrap
 * @param quote
 * @returns {Address}
 */
export const getWrappedAssetAddress = (quote: Quote): Address => {
  switch (quote.swapType) {
    case SwapType.wrap:
      return quote.buyTokenAddress;
    case SwapType.unwrap:
      return quote.sellTokenAddress;
    default:
      throw new Error(
        `Getting wrapped asset address on a ${quote.swapType} swap is not supported`
      );
  }
};
