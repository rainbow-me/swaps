// eslint-disable-next-line import/no-extraneous-dependencies
import { BigNumberish } from '@ethersproject/bignumber';

export type EthereumAddress = string;

export interface MessageParam {
  nonce: number;
  spender: EthereumAddress;
  holder?: EthereumAddress;
  allowed?: boolean;
  expiry?: number;
  value?: string;
  deadline?: number;
  owner?: EthereumAddress;
}

export interface DomainParam {
  chainId: number;
  name: string;
  verifyingContract: EthereumAddress;
  version?: string;
}

export enum Sources {
  Aggregator0x = '0x',
  Aggregotor1inch = '1inch',
}

export interface QuoteParams {
  source?: Sources;
  chainId?: number;
  fromAddress?: EthereumAddress;
  inputAsset: EthereumAddress;
  outputAsset: EthereumAddress;
  inputAmount?: BigNumberish;
  outputAmount?: BigNumberish;
  destReceiver?: EthereumAddress;
  feePercentageBasisPoints?: BigNumberish;
  slippage?: number;
}

export interface ProtocolShare {
  name: string;
  part: number;
}

export interface Quote {
  source?: Sources;
  from: EthereumAddress;
  to?: EthereumAddress;
  data?: string;
  value?: BigNumberish;
  allowanceTarget?: EthereumAddress;
  sellAmount: BigNumberish;
  sellAmountDisplay: BigNumberish;
  sellAmountMinusFees: BigNumberish;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  buyAmount: BigNumberish;
  buyAmountDisplay: BigNumberish;
  fee: BigNumberish;
  feeInEth: BigNumberish;
  feePercentageBasisPoints: number;
  protocols?: ProtocolShare[];
  inputTokenDecimals?: number;
  outputTokenDecimals?: number;
}

export interface TransactionOptions {
  gasLimit?: string | number;
  gasPrice?: string;
  nonce?: number;
  value?: number | BigNumberish;
  from?: EthereumAddress;
}

export interface QuoteExecutionDetails {
  method: any;
  methodArgs: (string | number | BigNumberish)[];
  params: TransactionOptions;
}
