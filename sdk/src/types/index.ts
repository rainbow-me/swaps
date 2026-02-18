import type { Address } from 'ox/Address';
import type { Hex } from 'ox/Hex';

export enum ChainId {
  mainnet = 1,
  ropsten = 3,
  kovan = 42,
  goerli = 5,
  rinkeby = 4,
  optimism = 10,
  bsc = 56,
  polygon = 137,
  arbitrum = 42161,
  zora = 7777777,
  base = 8453,
  avalanche = 43114,
  blast = 81457,
  degen = 666666666,
  apechain = 33139,
  sanko = 1996,
  gravity = 1625,
  unichain = 130,
  ink = 57073,
  berachain = 80094,
  scroll = 534352,
  linea = 59144,
  hyperevm = 999,
  lisk = 1135,
  katana = 747474,
  sonic = 146,
  abstract = 2741,
  soneium = 1868,
  b3 = 8333,
  mantle = 5000,
  worldChain = 480,
  swellChain = 1923,
  celo = 42220,
  plasma = 9745,
  bob = 60808,
  ronin = 2020,
  plume = 98866,
  zksyncera = 324,
  gnosis = 100,
}

export enum Source {
  Aggregator0x = '0x',
  Aggregator1inch = '1inch',
  AggregatorRainbow = 'rainbow',
  // DEPRECATED: Use Aggregator1inch instead
  Aggregotor1inch = '1inch',

  // Crosschain
  CrosschainAggregatorSocket = 'socket',
  CrosschainAggregatorRelay = 'relay',
}

export enum SwapType {
  normal = 'normal',
  crossChain = 'cross-chain',
  wrap = 'wrap',
  unwrap = 'unwrap',
}

export type Currency =
  | 'ETH'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CNY'
  | 'KRW'
  | 'RUB'
  | 'INR'
  | 'JPY'
  | 'TRY'
  | 'CAD'
  | 'NZD'
  | 'ZAR';

export type BigIntish = string | number | bigint;

export interface QuoteParams {
  source?: Source;
  chainId: number;
  fromAddress: Address;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  sellAmount?: BigIntish;
  buyAmount?: BigIntish;
  slippage: number;
  destReceiver?: Address;
  refuel?: boolean;
  feePercentageBasisPoints?: number;
  toChainId?: number;
  currency: Currency;
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
  from: Address;
  to?: Address;
  data?: Hex;
  value?: BigIntish;
  sellAmount: BigIntish;
  sellAmountDisplay: BigIntish;
  sellAmountInEth: BigIntish;
  sellAmountMinusFees: BigIntish;
  sellTokenAddress: Address;
  sellTokenAsset?: TokenAsset;
  buyTokenAddress: Address;
  buyTokenAsset?: TokenAsset;
  buyAmount: BigIntish;
  buyAmountDisplay: BigIntish;
  buyAmountDisplayMinimum: BigIntish;
  buyAmountInEth: BigIntish;
  buyAmountMinusFees: BigIntish;
  fee: BigIntish;
  feeTokenAsset?: TokenAsset;
  feeInEth: BigIntish;
  feePercentageBasisPoints: number;
  protocols?: ProtocolShare[];
  inputTokenDecimals?: number;
  outputTokenDecimals?: number;
  defaultGasLimit?: string;
  swapType: SwapType;
  tradeAmountUSD: number;
  tradeFeeAmountUSD: number;
  rewards?: Reward[];
  chainId: number;
  allowanceTarget: string;
  allowanceNeeded: boolean;
  fallback?: boolean;
}

export interface TokenAsset {
  assetCode: string;
  decimals: number;
  iconUrl: string;
  name: string;
  network: string;
  symbol: string;
  networks: Partial<Record<ChainId, { address: Address; decimals: number }>>;
  chainId: ChainId;
  price: TokenPrice;
  totalPrice: TokenPrice;
}

export interface TokenPrice {
  value: number;
  available: boolean;
}

export interface Reward {
  amount: number;
  token: {
    asset_code: string;
    decimals: number;
    icon_url: string;
    name: string;
    network: string;
    symbol: string;
    networks: Record<ChainId, { address: Address; decimals: number }>;
  };
}

interface SocketGasFees {
  gasAmount: BigIntish;
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
  amount: BigIntish;
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
  fromAmount: BigIntish;
  toAmount: BigIntish;
  usedBridgeNames: string[];
  minimumGasBalances: {
    [chaind: string]: BigIntish;
  };
  totalUserTx: number;
  sender: Address;
  recipient: Address;
  totalGasFeesInUsd: BigIntish;
  userTxs: {
    userTxType: string;
    txType: string;
    chainId: number;
    toAmount: BigIntish;
    toAsset: SocketAsset;
    stepCount: number;
    routePath: string;
    sender: Address;
    approvalData: {
      minimumApprovalAmount: number;
      approvalTokenAddress: Address;
      allowanceTarget: Address;
      owner: Address;
    } | null;
    steps: {
      type: string;
      protocol: SocketProtocol;
      fromChainId: number;
      fromAsset: SocketAsset;
      fromAmount: BigIntish;
      toChainId: number;
      toAsset: SocketAsset;
      toAmount: BigIntish;
      minAmountOut: BigIntish;
      bridgeSlippage: number;
      protocolFees: SocketProtocolFees;
      gasFees: SocketGasFees;
      serviceTime: number;
      maxServiceTime: number;
    }[];
    gasFees: SocketGasFees;
    serviceTime: number;
    maxServiceTime: number;
    recipient: Address;
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
  recipient: Address;
  serviceTime: number;
  fromAsset: SocketAsset;
  toAsset: SocketAsset;
  fromChainId: number;
  toChainId: number;
}

interface SocketAsset {
  address: Address;
  chainAgnosticId: number | null;
  chainId: number;
  decimals: number;
  icon: string;
  logoURI: string;
  name: string;
  symbol: string;
}

export interface SocketChainsData {
  success: boolean;
  result: {
    _id: string;
    name: string;
    chainId: ChainId;
    icon: string;
    isSendingEnabled: boolean;
    isReceivingEnabled: boolean;
    blockExplorer: string;
    nativeAsset: string;
    limits: {
      chainId: ChainId;
      isEnabled: boolean;
      minAmount: BigIntish;
      maxAmount: BigIntish;
    }[];
    gasLimit: BigIntish;
    __v: number;
  }[];
}

export interface CrosschainQuote extends Quote {
  routes: SocketRoute[];
  refuel: SocketRefuelData | null;
}

export interface TransactionOptions {
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: string;
  value?: number | BigIntish;
  from?: Address;
}

export interface PermitSignature {
  value: bigint;
  nonce: bigint;
  deadline: bigint;
  isDaiStylePermit: boolean;
  v: number;
  r: Hex;
  s: Hex;
}

export interface QuoteExecutionDetails {
  method: (...args: readonly unknown[]) => Promise<bigint>;
  methodArgs: readonly (BigIntish | Address | Hex | undefined)[];
  params: TransactionOptions;
  methodName: string;
  address: Address;
  abi: readonly unknown[];
}

export interface CrosschainQuoteExecutionDetails {
  method: Promise<bigint>;
  params: TransactionOptions;
}

export interface SlippageParams {
  chainId: number;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  sellAmount?: BigIntish;
  buyAmount?: BigIntish;
  toChainId?: number;
}

export interface SlippageError {
  error: boolean;
  error_code?: number;
  message: string;
}

export interface Slippage {
  slippagePercent: number;
}
