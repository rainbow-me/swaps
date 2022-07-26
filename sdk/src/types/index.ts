import { BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';

export enum ChainId {
  mainnet = 1,
  ropsten = 3,
  kovan = 42,
  goerli = 5,
  rinkeby = 4,
  optimism = 10,
  polygon = 137,
  arbitrum = 42161,
}

export enum Source {
  Aggregator0x = '0x',
  Aggregotor1inch = '1inch',
}

export type EthereumAddress = string;

export interface QuoteParams {
  source?: Source;
  chainId: number;
  fromAddress: EthereumAddress;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  sellAmount?: BigNumberish;
  buyAmount?: BigNumberish;
  slippage: number;
  destReceiver?: EthereumAddress;
}

export interface ProtocolShare {
  name: string;
  part: number;
}

export interface QuoteError {
  error: boolean;
  error_code?: number;
  message: string;
}

export interface Quote {
  source?: Source;
  from: EthereumAddress;
  to?: EthereumAddress;
  data?: string;
  value?: BigNumberish;
  sellAmount: BigNumberish;
  sellAmountMinusFees: BigNumberish;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  buyAmount: BigNumberish;
  fee: BigNumberish;
  feePercentageBasisPoints: number;
  protocols?: ProtocolShare[];
  inputTokenDecimals?: number;
  outputTokenDecimals?: number;
  defaultGasLimit?: string;
}

export interface TransactionOptions {
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  value?: number | BigNumberish;
  from?: EthereumAddress;
}

export interface QuoteExecutionDetails {
  method: any;
  methodArgs: (string | number | BigNumberish | EthereumAddress | undefined)[];
  params: TransactionOptions;
  methodName: string;
  router: Contract;
}
