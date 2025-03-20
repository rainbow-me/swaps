import { Signer } from '@ethersproject/abstract-signer';
import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import { default as WethAbi } from './abi/Weth.json';
import { EthereumAddress, Quote, SwapType, TransactionOptions } from './types';

/**
 * Function to wrap a specific amount of the native asset
 * for the specified wallet from its ERC20 version
 * @param {BigNumberish} amount
 * @param {Signer} wallet
 * @param {EthereumAddress} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const wrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Signer,
  wrappedAssetAddress: EthereumAddress,
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
 * @param {EthereumAddress} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const unwrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Signer,
  wrappedAssetAddress: EthereumAddress,
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
 * @param {EthereumAddress} wrappedAssetAddress
 * @returns {Promise<Transaction>}
 */
export const getWrappedAssetMethod = (
  name: string,
  provider: StaticJsonRpcProvider,
  wrappedAssetAddress: EthereumAddress
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
 * @returns {EthereumAddress}
 */
export const getWrappedAssetAddress = (quote: Quote): EthereumAddress => {
  switch (quote.swapType) {
    case SwapType.wrap:
      return quote.buyTokenAddress as EthereumAddress;
    case SwapType.unwrap:
      return quote.sellTokenAddress as EthereumAddress;
    default:
      throw new Error(
        `Getting wrapped asset address on a ${quote.swapType} swap is not supported`
      );
  }
};
