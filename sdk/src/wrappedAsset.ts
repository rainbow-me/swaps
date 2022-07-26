import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import { Wallet } from '@ethersproject/wallet';
import { default as WethAbi } from './abi/Weth.json';
import { WRAPPED_ASSET } from './utils/constants';
import { ChainId, TransactionOptions } from '.';

/**
 * Function to wrap a specific amount of the native asset
 * for the specified wallet from its ERC20 version
 * @param {BigNumberish} amount
 * @param {Wallet} wallet
 * @returns {Promise<Transaction>}
 */
export const wrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Wallet,
  chainId: ChainId = ChainId.mainnet,
  transactionOptions: TransactionOptions = {}
): Promise<Transaction> => {
  const instance = new Contract(
    WRAPPED_ASSET[chainId],
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
 * @param {Wallet} wallet
 * @returns {Promise<Transaction>}
 */
export const unwrapNativeAsset = async (
  amount: BigNumberish,
  wallet: Wallet,
  chainId: ChainId = ChainId.mainnet,
  transactionOptions: TransactionOptions = {}
): Promise<Transaction> => {
  const instance = new Contract(
    WRAPPED_ASSET[chainId],
    JSON.stringify(WethAbi),
    wallet
  );

  return instance.withdraw(amount, transactionOptions);
};

/**
 * Function that returns a pointer to the smart contract
 * function that wraps or unwraps, to be used by estimateGas calls
 * @param {string} name
 * @param {StaticJsonRpcProvider} provider]
 * @returns {Promise<Transaction>}
 */
export const getWrappedAssetMethod = (
  name: string,
  provider: StaticJsonRpcProvider,
  chainId: ChainId = ChainId.mainnet
): any => {
  const instance = new Contract(
    WRAPPED_ASSET[chainId],
    JSON.stringify(WethAbi),
    provider
  );
  return instance.estimateGas[name];
};
