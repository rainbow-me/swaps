import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Contract, PopulatedTransaction } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import { Wallet } from '@ethersproject/wallet';
import type { Address } from 'ox/Address';
import type { Hex } from 'ox/Hex';
import RainbowRouterABI from './abi/RainbowRouter.json';
import RainbowRouterV2ABI from './abi/RainbowRouterV2.json';
import SwapRouter02ABI from './abi/SwapRouter02.json';
import {
  ChainId,
  CrosschainQuote,
  CrosschainQuoteExecutionDetails,
  Currency,
  Quote,
  QuoteError,
  QuoteExecutionDetails,
  QuoteParams,
  SocketChainsData,
  Source,
  TransactionOptions,
} from './types';
import {
  AMM_CONTRACT_ADDRESSES,
  API_BASE_URL,
  ETH_ADDRESS,
  MAX_INT,
  PERMIT_EXPIRATION_TS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_ABSTRACT,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_GNOSIS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_ZKSYNC,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA,
  RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
  RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_MAINNET,
} from './utils/constants';
import { signPermit } from './utils/permit';
import { getReferrerCode } from './utils/referrer';
import { sanityCheckAddress } from './utils/sanity_check';

const uuidToBytes16 = (uuid: string): Hex => {
  const hex = uuid.trim().toLowerCase().replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error(`Invalid swapId UUID for bytes16: ${uuid}`);
  }

  return `0x${hex}` as Hex;
};

/**
 * Configure SDK for mocking or fallback to API_BASE_URL
 *
 */
export let sdkConfig = {
  apiBaseUrl: API_BASE_URL,
};

export function configureSDK(options: { apiBaseUrl?: string }) {
  sdkConfig = { ...sdkConfig, ...options };
}

/**
 * Function to get the rainbow router contract address based on the chainId
 *
 * @param {ChainId} chainId
 * @param {'v1' | 'v2'} routerVersion
 * @returns {Address}
 */
export const getRainbowRouterContractAddressV2 = (chainId: ChainId): Address => {
  switch (chainId) {
    case ChainId.mainnet:
      return RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_MAINNET;
    case ChainId.base:
      return RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE;
    default:
      throw new Error(`Unsupported chainId for routerVersion=v2: ${chainId}`);
  }
};

export const getRainbowRouterContractAddressV1 = (chainId: ChainId): Address => {
  switch (chainId) {
    case ChainId.zora:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA;
    case ChainId.unichain:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN;
    case ChainId.zksyncera:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS_ZKSYNC;
    case ChainId.abstract:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS_ABSTRACT;
    case ChainId.gnosis:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS_GNOSIS;
    default:
      return RAINBOW_ROUTER_CONTRACT_ADDRESS;
  }
};

export const getRainbowRouterContractAddress = (
  chainId: ChainId,
  routerVersion: 'v1' | 'v2' = 'v1'
): Address => {
  return routerVersion === 'v2'
    ? getRainbowRouterContractAddressV2(chainId)
    : getRainbowRouterContractAddressV1(chainId);
};

/**
 * Function to get the amm contract address based on the chainId
 *
 * @param {ChainId} chainId
 * @returns {Address | undefined}
 */
export const getAmmContractAddress = (chainId: ChainId): Address | undefined => {
  return AMM_CONTRACT_ADDRESSES[chainId];
};

/**
 * Function to get a swap formatted quote url to use with backend
 *
 * @param {ChainId} params.chainId
 * @param {Address} params.sellTokenAddress
 * @param {Address} params.buyTokenAddress
 * @param {BigNumberish} params.buyAmount
 * @param {BigNumberish} params.sellAmount
 * @param {Address} params.fromAddress
 * @param {string} params.source
 * @param {number} params.feePercentageBasisPoints
 * @param {number} params.slippage
 * @returns {string}
 */
export const buildRainbowQuoteUrl = ({
  chainId,
  destReceiver,
  sellTokenAddress,
  buyTokenAddress,
  buyAmount,
  sellAmount,
  fromAddress,
  source,
  feePercentageBasisPoints,
  slippage,
  currency,
}: {
  chainId: number;
  destReceiver?: Address;
  toChainId?: number;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  buyAmount?: BigNumberish;
  sellAmount?: BigNumberish;
  fromAddress: Address;
  feePercentageBasisPoints?: number;
  source?: Source;
  slippage: number;
  currency: Currency;
}) => {
  const searchParams = new URLSearchParams({
    allowFallback: String(true),
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    currency,
    enableNewChainSwaps: String(true),
    fromAddress,
    sellToken: sellTokenAddress,
    slippage: String(slippage),
    ...(source ? { source } : {}),
    ...(sellAmount
      ? { sellAmount: String(sellAmount) }
      : { buyAmount: String(buyAmount) }),
    ...(feePercentageBasisPoints !== undefined
      ? { feePercentageBasisPoints: String(feePercentageBasisPoints) }
      : {}),
    ...(destReceiver ? { destReceiver } : {}),
  });
  return `${sdkConfig.apiBaseUrl}/v1/quote?` + searchParams.toString();
};

/**
 * Function to get a crosschain swap formatted quote url to use with backend
 *
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @param {Address} params.sellTokenAddress
 * @param {Address} params.buyTokenAddress
 * @param {BigNumberish} params.sellAmount
 * @param {Address} params.fromAddress
 * @param {number} params.slippage
 * @param {boolean} params.refuel
 * @param {number?} params.feePercentageBasisPoints
 * @returns {string}
 */
export const buildRainbowCrosschainQuoteUrl = ({
  chainId,
  toChainId,
  sellTokenAddress,
  buyTokenAddress,
  sellAmount,
  fromAddress,
  destReceiver,
  slippage,
  refuel,
  feePercentageBasisPoints,
  currency,
}: {
  chainId: number;
  toChainId?: number;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  sellAmount?: BigNumberish;
  fromAddress: Address;
  destReceiver?: Address;
  slippage: number;
  refuel?: boolean;
  feePercentageBasisPoints?: number;
  currency: Currency;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    currency: currency.toLowerCase(),
    fromAddress,
    refuel: String(refuel),
    sellAmount: String(sellAmount),
    sellToken: sellTokenAddress,
    slippage: String(slippage),
    toChainId: String(toChainId),
    ...(feePercentageBasisPoints !== undefined
      ? { feePercentageBasisPoints: String(feePercentageBasisPoints) }
      : {}),
    ...(destReceiver ? { destReceiver } : {}),
  });
  return (
    `${sdkConfig.apiBaseUrl}/v1/quote?bridgeVersion=4&` +
    searchParams.toString()
  );
};

/**
 * Function to build the swap API URI to get the claim bridge quote
 */
export const buildRainbowClaimBridgeQuoteUrl = ({
  chainId,
  toChainId,
  sellTokenAddress,
  buyTokenAddress,
  sellAmount,
  fromAddress,
  destReceiver,
  slippage,
  refuel,
  currency,
}: {
  chainId: number;
  toChainId?: number;
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  sellAmount?: BigNumberish;
  fromAddress: Address;
  destReceiver?: Address;
  slippage: number;
  refuel?: boolean;
  currency: Currency;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    claim: String(true),
    currency: currency.toLowerCase(),
    feePercentageBasisPoints: '0',
    fromAddress,
    refuel: String(refuel),
    sellAmount: String(sellAmount),
    sellToken: sellTokenAddress,
    slippage: String(slippage),
    source: Source.CrosschainAggregatorRelay.toString(),
    toChainId: String(toChainId),
    ...(destReceiver ? { destReceiver } : {}),
  });
  return (
    `${sdkConfig.apiBaseUrl}/v1/quote?bridgeVersion=4&` +
    searchParams.toString()
  );
};

/**
 * Function to get a minimum amount of source chain gas token to perform a refuel swap
 *
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @returns {string}
 */
export const getMinRefuelAmount = async (params: {
  chainId: ChainId;
  toChainId: ChainId;
}) => {
  const { chainId, toChainId } = params;
  const url = `${sdkConfig.apiBaseUrl}/v1/chains`;
  const response = await fetch(url);
  const chainsData = (await response.json()) as SocketChainsData;

  const sourceChain = chainsData.result.find((c) => c.chainId === chainId);

  if (!sourceChain) return null;

  const destinationChain = sourceChain.limits.find(
    (c) => c.chainId === toChainId
  );

  if (!destinationChain) return null;

  // We multiply the min amount by 2 as that is what is required according to sockets docs
  // Ref: https://docs.socket.tech/socket-api/v2/guides/refuel-integration#refuel-as-a-middleware
  return BigNumber.from(destinationChain.minAmount).mul(2).toString();
};

/**
 * Function to get a quote from rainbow's swap aggregator backend
 *
 * @param {QuoteParams} params
 * @param {Source} params.source
 * @param {ChainId} params.chainId
 * @param {Address} params.fromAddress
 * @param {Address} params.sellTokenAddress
 * @param {Address} params.buyTokenAddress
 * @param {BigNumberish} params.sellAmount
 * @param {BigNumberish} params.buyAmount
 * @param {number} params.slippage
 * @param {number} params.feePercentageBasisPoints
 * @returns {Promise<Quote | null>}
 */
export const getQuote = async (
  params: QuoteParams,
  abortSignal?: AbortSignal
): Promise<Quote | QuoteError | null> => {
  const {
    source,
    chainId = ChainId.mainnet,
    destReceiver,
    fromAddress,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
    slippage,
    feePercentageBasisPoints,
    currency,
  } = params;

  if (isNaN(Number(sellAmount)) && isNaN(Number(buyAmount))) {
    return null;
  }

  const url = buildRainbowQuoteUrl({
    buyAmount,
    buyTokenAddress,
    chainId,
    currency,
    destReceiver,
    feePercentageBasisPoints,
    fromAddress,
    sellAmount,
    sellTokenAddress,
    slippage,
    source,
  });

  const response = await fetch(url, { signal: abortSignal });
  const quote = await response.json();
  if (quote.error) {
    return quote as QuoteError;
  }
  return quote as Quote;
};

/**
 * Function to get a crosschain swap quote from rainbow's swap aggregator backend
 *
 * @param {QuoteParams} params
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @param {Address} params.fromAddress
 * @param {Address} params.sellTokenAddress
 * @param {Address} params.buyTokenAddress
 * @param {BigNumberish} params.sellAmount
 * @param {number} params.slippage
 * @param {boolean} params.refuel
 * @returns {Promise<CrosschainQuote | QuoteError | null>} returns error in case the request failed or the
 *                                                         destination address is not consistent with the SDK's
 *                                                         stored destination address
 */
export const getCrosschainQuote = async (
  params: QuoteParams,
  abortSignal?: AbortSignal
): Promise<CrosschainQuote | QuoteError | null> => {
  const {
    chainId = ChainId.mainnet,
    toChainId,
    currency,
    destReceiver,
    fromAddress,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    slippage,
    refuel = false,
    feePercentageBasisPoints,
  } = params;

  if (!sellAmount || !toChainId) {
    return null;
  }

  const url = buildRainbowCrosschainQuoteUrl({
    buyTokenAddress,
    chainId,
    currency,
    destReceiver,
    feePercentageBasisPoints,
    fromAddress,
    refuel,
    sellAmount,
    sellTokenAddress,
    slippage,
    toChainId,
  });

  return fetchAndSanityCheckCrosschainQuote(url, abortSignal);
};

/**
 * Function to get a crosschain swap quote from rainbow's swap aggregator backend
 */
export const getClaimBridgeQuote = async (
  params: QuoteParams,
  abortSignal?: AbortSignal
): Promise<CrosschainQuote | QuoteError | null> => {
  const {
    chainId = ChainId.optimism,
    toChainId,
    currency,
    fromAddress,
    destReceiver,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    slippage,
    refuel = false,
  } = params;

  if (!sellAmount || !toChainId) {
    return null;
  }

  const url = buildRainbowClaimBridgeQuoteUrl({
    buyTokenAddress,
    chainId,
    currency,
    destReceiver,
    fromAddress,
    refuel,
    sellAmount,
    sellTokenAddress,
    slippage,
    toChainId,
  });

  return fetchAndSanityCheckCrosschainQuote(url, abortSignal);
};

/**
 * Function to encapsulate logic to fetch and check a crosschain quote
 */
const fetchAndSanityCheckCrosschainQuote = async (
  crosschainQuoteURL: string,
  abortSignal?: AbortSignal
): Promise<CrosschainQuote | QuoteError | null> => {
  const response = await fetch(crosschainQuoteURL, { signal: abortSignal });
  const quote = await response.json();
  if (quote.error) {
    return quote as QuoteError;
  }

  try {
    sanityCheckAddress(quote?.to);
  } catch (e) {
    return {
      error: true,
      message:
        e instanceof Error
          ? e.message
          : `unexpected error happened while checking crosschain quote's address: ${quote?.to}`,
    } as QuoteError;
  }

  return quote;
};

const calculateDeadline = async (wallet: Wallet) => {
  const { timestamp } = await wallet.provider.getBlock('latest');
  return timestamp + PERMIT_EXPIRATION_TS;
};

/**
 * Helper function to check if a target contract is allowed
 */
export const isAllowedTargetContract = (
  targetContract: Address,
  chainId: ChainId,
  routerVersion: 'v1' | 'v2' = 'v1'
) => {
  const targetContractLowerCase = targetContract.toLowerCase();

  try {
    const routerContractAddress = getRainbowRouterContractAddress(
      chainId,
      routerVersion
    );
    if (routerContractAddress.toLowerCase() === targetContractLowerCase) {
      return true;
    }
  } catch (_error) {
    // Unsupported router version/chain combination; treat as not allowed.
    return false;
  }

  if (routerVersion === 'v1') {
    const ammContractAddress = getAmmContractAddress(chainId) ?? '';
    if (ammContractAddress.toLowerCase() === targetContractLowerCase) {
      return true;
    }
  }

  return false;
};

/**
 * Function to get the target contract address for a quote
 *
 * @param {Quote} quote
 * @returns {Address}
 */
export const getTargetAddress = (quote: Quote) => {
  if (quote.fallback) {
    return quote.to;
  }
  return getRainbowRouterContractAddress(quote.chainId, quote.routerVersion ?? 'v1');
};

/**
 * Function that fills a quote onchain via rainbow's swap aggregator smart contract
 *
 * @param {Quote} quote
 * @param {TransactionOptions} transactionOptions
 * @param {Signer} wallet
 * @param {boolean} permit
 * @param {number} chainId
 * @param {string} referrer
 * @returns {Promise<Transaction>}
 */
export const fillQuote = async (
  quote: Quote,
  transactionOptions: TransactionOptions,
  wallet: Signer,
  permit: boolean,
  chainId: ChainId,
  referrer?: string
): Promise<Transaction> => {
  // Use the prepare function to get transaction data
  const preparedTx = await prepareFillQuote(
    quote,
    transactionOptions,
    wallet,
    permit,
    chainId,
    referrer
  );

  // Send the transaction
  const newSwapTx = await wallet.sendTransaction({
    data: preparedTx.data,
    to: preparedTx.to,
    value: preparedTx.value,
    ...transactionOptions,
  });

  return newSwapTx;
};

/**
 * Function that fills a crosschain swap quote onchain via rainbow's swap aggregator smart contract
 *
 * @param {CrosschainQuote} quote
 * @param {TransactionOptions} transactionOptions
 * @param {Signer} wallet
 * @param {string} referrer
 * @returns {Promise<Transaction>}
 */
export const fillCrosschainQuote = async (
  quote: CrosschainQuote,
  transactionOptions: TransactionOptions,
  wallet: Signer,
  referrer?: string
): Promise<Transaction> => {
  // Use the prepare function to get transaction data
  const preparedTx = await prepareFillCrosschainQuote(quote, referrer);

  // Send the transaction
  const swapTx = await wallet.sendTransaction({
    data: preparedTx.data,
    to: preparedTx.to,
    value: preparedTx.value,
    ...transactionOptions,
  });

  return swapTx;
};

export const getQuoteExecutionDetails = (
  quote: Quote,
  transactionOptions: TransactionOptions,
  provider: StaticJsonRpcProvider
): QuoteExecutionDetails => {
  const isRouterV2 = quote.routerVersion === 'v2';
  const instance = new Contract(
    getRainbowRouterContractAddress(quote.chainId, quote.routerVersion ?? 'v1'),
    isRouterV2 ? RainbowRouterV2ABI : RainbowRouterABI,
    provider
  );

  const {
    sellTokenAddress,
    buyTokenAddress,
    to,
    data,
    fee,
    value,
    sellAmount,
    feePercentageBasisPoints,
    swapId,
  } = quote;

  if (isRouterV2 && !swapId)
    throw new Error('swapId (valid UUID string) is required for routerVersion=v2 quotes');

  const swapIdBytes16 = isRouterV2 ? uuidToBytes16(swapId!) : undefined;

  const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

  if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    return {
      method: instance.estimateGas['fillQuoteEthToToken'],
      methodArgs: isRouterV2
        ? [swapIdBytes16, buyTokenAddress, to, data, fee]
        : [buyTokenAddress, to, data, fee],
      methodName: 'fillQuoteEthToToken',
      params: {
        ...transactionOptions,
        value,
      },
      router: instance,
    };
  } else if (buyTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    return {
      method: instance.estimateGas['fillQuoteTokenToEth'],
      methodArgs: [
        ...(isRouterV2 ? [swapIdBytes16] : []),
        sellTokenAddress,
        to,
        data,
        sellAmount,
        feePercentageBasisPoints,
      ],
      methodName: 'fillQuoteTokenToEth',
      params: {
        ...transactionOptions,
        value,
      },
      router: instance,
    };
  } else {
    return {
      method: instance.estimateGas['fillQuoteTokenToToken'],
      methodArgs: [
        ...(isRouterV2 ? [swapIdBytes16] : []),
        sellTokenAddress,
        buyTokenAddress,
        to,
        data,
        sellAmount,
        fee,
      ],
      methodName: 'fillQuoteTokenToToken',
      params: {
        ...transactionOptions,
        value,
      },
      router: instance,
    };
  }
};

export const getCrosschainQuoteExecutionDetails = (
  quote: CrosschainQuote,
  transactionOptions: TransactionOptions,
  provider: StaticJsonRpcProvider
): CrosschainQuoteExecutionDetails => {
  const { from, data, value, to } = quote;

  sanityCheckAddress(to);

  return {
    method: provider.estimateGas({
      data,
      from,
      to,
      value,
    }),
    params: {
      ...transactionOptions,
      value,
    },
  };
};

/**
 * Interface for batch call data compatible with EIP-7702 batching
 */
export interface BatchCall {
  to: Address;
  value: BigNumberish;
  data: Hex;
}

/**
 * Function that prepares a quote transaction data for batching without executing it
 *
 * @param {Quote} quote
 * @param {TransactionOptions} transactionOptions
 * @param {Signer} wallet
 * @param {boolean} permit
 * @param {number} chainId
 * @param {string} referrer
 * @returns {Promise<BatchCall>}
 */
export const prepareFillQuote = async (
  quote: Quote,
  transactionOptions: TransactionOptions,
  wallet: Signer,
  permit: boolean,
  chainId: ChainId,
  referrer?: string
): Promise<BatchCall> => {
  const targetContract = getTargetAddress(quote);
  const routerVersion = quote.routerVersion ?? 'v1';
  if (
    !targetContract ||
    !isAllowedTargetContract(targetContract, chainId, routerVersion)
  ) {
    throw new Error('Target contract unauthorized');
  }

  const isRouterV2 = routerVersion === 'v2';
  if (isRouterV2 && !quote.swapId)
    throw new Error('swapId (UUID string) is required for routerVersion=v2 quotes');
  const swapIdBytes16 = isRouterV2 ? uuidToBytes16(quote.swapId!) : undefined;

  const ABI = quote.fallback
    ? SwapRouter02ABI
    : isRouterV2
      ? RainbowRouterV2ABI
      : RainbowRouterABI;
  const instance = new Contract(targetContract, ABI, wallet);
  let swapTx: PopulatedTransaction;

  const {
    sellTokenAddress,
    buyTokenAddress,
    to,
    data,
    fee,
    value,
    sellAmount,
    feePercentageBasisPoints,
  } = quote;

  if (!quote.fallback) {
    const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

    if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
      swapTx = await instance.populateTransaction.fillQuoteEthToToken(
        ...(isRouterV2 ? [swapIdBytes16] : []),
        buyTokenAddress,
        to,
        data,
        fee,
        {
          ...transactionOptions,
          value,
        }
      );
    } else if (buyTokenAddress?.toLowerCase() === ethAddressLowerCase) {
      if (permit) {
        const deadline = await calculateDeadline(wallet as Wallet);
        const permitSignature = await signPermit(
          wallet as Wallet,
          sellTokenAddress,
          quote.from,
          instance.address as Address,
          MAX_INT,
          deadline,
          chainId
        );
        swapTx =
          await instance.populateTransaction.fillQuoteTokenToEthWithPermit(
            ...(isRouterV2 ? [swapIdBytes16] : []),
            sellTokenAddress,
            to,
            data,
            sellAmount,
            feePercentageBasisPoints,
            permitSignature,
            {
              ...transactionOptions,
              value,
            }
          );
      } else {
        swapTx = await instance.populateTransaction.fillQuoteTokenToEth(
          ...(isRouterV2 ? [swapIdBytes16] : []),
          sellTokenAddress,
          to,
          data,
          sellAmount,
          feePercentageBasisPoints,
          {
            ...transactionOptions,
            value,
          }
        );
      }
    } else {
      if (permit) {
        const deadline = await calculateDeadline(wallet as Wallet);
        const permitSignature = await signPermit(
          wallet as Wallet,
          sellTokenAddress,
          quote.from,
          instance.address as Address,
          MAX_INT,
          deadline,
          chainId
        );
        swapTx =
          await instance.populateTransaction.fillQuoteTokenToTokenWithPermit(
            ...(isRouterV2 ? [swapIdBytes16] : []),
            sellTokenAddress,
            buyTokenAddress,
            to,
            data,
            sellAmount,
            fee,
            permitSignature,
            {
              ...transactionOptions,
              value,
            }
          );
      } else {
        swapTx = await instance.populateTransaction.fillQuoteTokenToToken(
          ...(isRouterV2 ? [swapIdBytes16] : []),
          sellTokenAddress,
          buyTokenAddress,
          to,
          data,
          sellAmount,
          fee,
          {
            ...transactionOptions,
            value,
          }
        );
      }
    }

    if (referrer) {
      swapTx.data = `${swapTx.data}${getReferrerCode(referrer)}`;
    }
  } else {
    swapTx = {
      data: quote.data,
      from: quote.from,
      to: quote.to,
    };
  }

  if (!swapTx.to) {
    throw new Error('Quote must have a valid target address');
  }

  if (!swapTx.data) {
    throw new Error('Quote must have valid transaction data');
  }

  if (!swapTx.value && !value) {
    throw new Error('Quote must have a valid value');
  }

  return {
    data: swapTx.data as Hex,
    to: swapTx.to as Address,
    value: (swapTx.value || value)!.toString(),
  };
};

/**
 * Function that prepares a crosschain swap quote transaction data for batching without executing it
 *
 * @param {CrosschainQuote} quote
 * @param {string} referrer
 * @returns {Promise<BatchCall>}
 */
export const prepareFillCrosschainQuote = async (
  quote: CrosschainQuote,
  referrer?: string
): Promise<BatchCall> => {
  const { data, value, to } = quote;

  if (!to) {
    throw new Error('Quote must have a valid target address');
  }

  if (!data) {
    throw new Error('Quote must have valid transaction data');
  }

  if (!value) {
    throw new Error('Quote must have a valid value');
  }

  sanityCheckAddress(to);

  let txData = data;
  if (referrer) {
    txData = `${txData}${getReferrerCode(referrer)}`;
  }

  return {
    data: txData,
    to: to,
    value: value.toString(),
  };
};
