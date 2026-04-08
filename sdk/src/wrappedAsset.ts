import type { Address } from 'ox/Address';
import type { Hash, PublicClient, WalletClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { wethAbi } from './abi/abis.js';
import type { BigIntish } from './types/index.js';
import { Quote, SwapType, TransactionOptions } from './types/index.js';

const requireAccount = (walletClient: WalletClient) => {
  if (!walletClient.account) {
    throw new Error('WalletClient must have an account attached');
  }
  return walletClient.account;
};

export const wrapNativeAsset = async (
  amount: BigIntish,
  walletClient: WalletClient,
  wrappedAssetAddress: Address,
  _transactionOptions: TransactionOptions = {}
): Promise<Hash> => {
  const account = requireAccount(walletClient);
  const data = encodeFunctionData({
    abi: wethAbi,
    functionName: 'deposit',
  });
  return walletClient.sendTransaction({
    to: wrappedAssetAddress,
    data,
    value: BigInt(amount),
    account,
    chain: walletClient.chain,
  });
};

export const unwrapNativeAsset = async (
  amount: BigIntish,
  walletClient: WalletClient,
  wrappedAssetAddress: Address,
  _transactionOptions: TransactionOptions = {}
): Promise<Hash> => {
  const account = requireAccount(walletClient);
  const data = encodeFunctionData({
    abi: wethAbi,
    functionName: 'withdraw',
    args: [BigInt(amount)],
  });
  return walletClient.sendTransaction({
    to: wrappedAssetAddress,
    data,
    account,
    chain: walletClient.chain,
  });
};

export const getWrappedAssetMethod = (
  functionName: 'deposit' | 'withdraw',
  publicClient: PublicClient,
  wrappedAssetAddress: Address
) => {
  return (params: { value?: bigint; args?: readonly unknown[] }) =>
    functionName === 'deposit'
      ? publicClient.estimateContractGas({
          address: wrappedAssetAddress,
          abi: wethAbi,
          functionName: 'deposit',
          value: params.value,
        })
      : publicClient.estimateContractGas({
          address: wrappedAssetAddress,
          abi: wethAbi,
          functionName: 'withdraw',
          args: (params.args ?? [0n]) as [bigint],
        });
};

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
