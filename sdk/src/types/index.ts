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

export enum SwapType {
  normal = 'normal',
  crossChain = 'cross-chain',
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
  refuel?: boolean;
  swapType: SwapType;
  feePercentageBasisPoints?: number;
  toChainId?: number;
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
  swapType?: string;
}

interface SocketGasFees {
  gasAmount: BigNumberish;
  gasLimit: string;
  asset: SocketAsset;
  feesInUsd: number;
}

interface SocketProtocol {
  name: string;
  displayName: string;
  icon: string;
  securityScore: number;
  robustnessScore: number;
}
interface SocketProtocolFees {
  amount: BigNumberish;
  asset: SocketAsset;
  feesInUsd: number;
}

interface SocketRoute {
  chainGasBalances: {
    [chainId: string]: {
      minGasBalance: string;
      hasGasBalance: boolean;
    };
  };
  routeId: string;
  isOnlySwapRoute: boolean;
  fromAmount: BigNumberish;
  toAmount: BigNumberish;
  usedBridgeNames: string[];
  minimumGasBalances: {
    [chaind: string]: BigNumberish;
  };
  totalUserTx: number;
  sender: EthereumAddress;
  recipient: EthereumAddress;
  totalGasFeesInUsd: BigNumberish;
  userTxs: {
    userTxType: string;
    txType: string;
    chainId: number;
    toAmount: BigNumberish;
    toAsset: SocketAsset;
    stepCount: number;
    routePath: string;
    sender: EthereumAddress;
    approvalData: {
      minimumApprovalAmount: number;
      approvalTokenAddress: EthereumAddress;
      allowanceTarget: EthereumAddress;
      owner: EthereumAddress;
    } | null;
    steps: {
      type: string;
      protocol: SocketProtocol;
      fromChainId: number;
      fromAsset: SocketAsset;
      fromAmount: BigNumberish;
      toChainId: number;
      toAsset: SocketAsset;
      toAmount: BigNumberish;
      minAmountOut: BigNumberish;
      bridgeSlippage: number;
      protocolFees: SocketProtocolFees;
      gasFees: SocketGasFees;
      serviceTime: number;
      maxServiceTime: number;
    }[];
    gasFees: SocketGasFees;
    serviceTime: number;
    maxServiceTime: number;
    recipient: EthereumAddress;
    bridgeSlippage: number;
    userTxIndex: number;
  }[];
  serviceTime: number;
  maxServiceTime: number;
}

interface SocketRefuelData {
  fromAmount: string;
  toAmount: string;
  gasFees: SocketGasFees;
  recipient: EthereumAddress;
  serviceTime: number;
  fromAsset: SocketAsset;
  toAsset: SocketAsset;
  fromChainId: number;
  toChainId: number;
}

interface SocketAsset {
  address: EthereumAddress;
  chainAgnosticId: number | null;
  chainId: number;
  decimals: number;
  icon: string;
  logoURI: string;
  name: string;
  symbol: string;
}

export interface CrosschainQuote extends Quote {
  fromAsset: SocketAsset;
  fromChainId: number;
  toAsset: SocketAsset;
  toChainId: number;
  allowanceTarget?: string;
  routes: SocketRoute[];
  refuel: SocketRefuelData | null;
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

export interface CrosschainQuoteExecutionDetails {
  method: any;
  params: TransactionOptions;
}
