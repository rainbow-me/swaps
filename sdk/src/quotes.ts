import type { Address } from 'ox/Address';
import type { Hex } from 'ox/Hex';
import type { Hash, PublicClient, WalletClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { rainbowRouterAbi } from './abi/abis.js';
import type { BigIntish } from './types/index.js';
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
} from './types/index.js';
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
} from './utils/constants.js';
import { signPermit } from './utils/permit.js';
import { getReferrerCode } from './utils/referrer.js';
import { sanityCheckAddress } from './utils/sanity_check.js';

export let sdkConfig = {
  apiBaseUrl: API_BASE_URL,
};

export function configureSDK(options: { apiBaseUrl?: string }) {
  sdkConfig = { ...sdkConfig, ...options };
}

export const getRainbowRouterContractAddress = (chainId: ChainId): Address => {
  if (chainId === ChainId.zora) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA;
  } else if (chainId === ChainId.unichain) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN;
  } else if (chainId === ChainId.zksyncera) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_ZKSYNC;
  } else if (chainId === ChainId.abstract) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_ABSTRACT;
  } else if (chainId === ChainId.gnosis) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_GNOSIS;
  }
  return RAINBOW_ROUTER_CONTRACT_ADDRESS;
};

export const getAmmContractAddress = (
  chainId: ChainId
): Address | undefined => {
  return AMM_CONTRACT_ADDRESSES[chainId];
};

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
  buyAmount?: BigIntish;
  sellAmount?: BigIntish;
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
  sellAmount?: BigIntish;
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
  sellAmount?: BigIntish;
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

  return (BigInt(destinationChain.minAmount) * 2n).toString();
};

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

const calculateDeadline = async (publicClient: PublicClient) => {
  const block = await publicClient.getBlock();
  return Number(block.timestamp) + PERMIT_EXPIRATION_TS;
};

export const isAllowedTargetContract = (
  targetContract: Address,
  chainId: ChainId
) => {
  const rainbowRouterContractAddress =
    getRainbowRouterContractAddress(chainId) ?? '';
  const ammContractAddress = getAmmContractAddress(chainId) ?? '';
  return [
    rainbowRouterContractAddress.toLowerCase(),
    ammContractAddress.toLowerCase(),
  ].includes(targetContract.toLowerCase());
};

export const getTargetAddress = (quote: Quote) => {
  if (quote.fallback) {
    return quote.to;
  }
  return getRainbowRouterContractAddress(quote.chainId);
};

const requireAccount = (walletClient: WalletClient) => {
  if (!walletClient.account) {
    throw new Error('WalletClient must have an account attached');
  }
  return walletClient.account;
};

export const fillQuote = async (
  quote: Quote,
  transactionOptions: TransactionOptions,
  walletClient: WalletClient,
  permit: boolean,
  chainId: ChainId,
  referrer?: string,
  publicClient?: PublicClient
): Promise<Hash> => {
  const account = requireAccount(walletClient);
  const preparedTx = await prepareFillQuote(
    quote,
    transactionOptions,
    permit,
    chainId,
    referrer,
    publicClient,
    walletClient
  );

  return walletClient.sendTransaction({
    data: preparedTx.data,
    to: preparedTx.to,
    value: BigInt(preparedTx.value),
    account,
    chain: walletClient.chain,
  });
};

export const fillCrosschainQuote = async (
  quote: CrosschainQuote,
  _transactionOptions: TransactionOptions,
  walletClient: WalletClient,
  referrer?: string
): Promise<Hash> => {
  const account = requireAccount(walletClient);
  const preparedTx = await prepareFillCrosschainQuote(quote, referrer);

  return walletClient.sendTransaction({
    data: preparedTx.data,
    to: preparedTx.to,
    value: BigInt(preparedTx.value),
    account,
    chain: walletClient.chain,
  });
};

export const getQuoteExecutionDetails = (
  quote: Quote,
  transactionOptions: TransactionOptions,
  publicClient: PublicClient
): QuoteExecutionDetails => {
  const routerAddress = getRainbowRouterContractAddress(quote.chainId);

  const {
    sellTokenAddress,
    buyTokenAddress,
    fee,
    value,
    sellAmount,
    feePercentageBasisPoints,
  } = quote;

  const target = quote.to ?? routerAddress;
  const swapCallData = quote.data ?? ('0x' as Hex);
  const optionalValue = value != null ? BigInt(value) : undefined;
  const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

  if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    const args = [buyTokenAddress, target, swapCallData, BigInt(fee)] as const;
    return {
      method: () =>
        publicClient.estimateContractGas({
          address: routerAddress,
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteEthToToken',
          args,
          value: optionalValue,
        }),
      methodArgs: args,
      methodName: 'fillQuoteEthToToken',
      params: { ...transactionOptions, value },
      address: routerAddress,
      abi: rainbowRouterAbi,
    };
  } else if (buyTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    const args = [
      sellTokenAddress,
      target,
      swapCallData,
      BigInt(sellAmount),
      BigInt(feePercentageBasisPoints),
    ] as const;
    return {
      method: () =>
        publicClient.estimateContractGas({
          address: routerAddress,
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToEth',
          args,
          value: optionalValue,
        }),
      methodArgs: args,
      methodName: 'fillQuoteTokenToEth',
      params: { ...transactionOptions, value },
      address: routerAddress,
      abi: rainbowRouterAbi,
    };
  } else {
    const args = [
      sellTokenAddress,
      buyTokenAddress,
      target,
      swapCallData,
      BigInt(sellAmount),
      BigInt(fee),
    ] as const;
    return {
      method: () =>
        publicClient.estimateContractGas({
          address: routerAddress,
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToToken',
          args,
          value: optionalValue,
        }),
      methodArgs: args,
      methodName: 'fillQuoteTokenToToken',
      params: { ...transactionOptions, value },
      address: routerAddress,
      abi: rainbowRouterAbi,
    };
  }
};

export const getCrosschainQuoteExecutionDetails = (
  quote: CrosschainQuote,
  transactionOptions: TransactionOptions,
  publicClient: PublicClient
): CrosschainQuoteExecutionDetails => {
  const { from, value } = quote;

  if (!quote.to) {
    throw new Error('Crosschain quote must have a valid target address');
  }
  if (!quote.data) {
    throw new Error('Crosschain quote must have valid transaction data');
  }

  sanityCheckAddress(quote.to);

  return {
    method: publicClient.estimateGas({
      data: quote.data,
      account: from,
      to: quote.to,
      value: value != null ? BigInt(value) : undefined,
    }),
    params: {
      ...transactionOptions,
      value,
    },
  };
};

export interface BatchCall {
  to: Address;
  value: BigIntish;
  data: Hex;
}

export const prepareFillQuote = async (
  quote: Quote,
  _transactionOptions: TransactionOptions,
  permit: boolean,
  chainId: ChainId,
  referrer?: string,
  publicClient?: PublicClient,
  walletClient?: WalletClient
): Promise<BatchCall> => {
  const targetContract = getTargetAddress(quote);
  if (!targetContract || !isAllowedTargetContract(targetContract, chainId)) {
    throw new Error('Target contract unauthorized');
  }

  let txData: Hex | undefined;

  const {
    sellTokenAddress,
    buyTokenAddress,
    value,
    sellAmount,
    feePercentageBasisPoints,
  } = quote;
  const target = quote.to ?? targetContract;
  const swapCallData = quote.data ?? ('0x' as Hex);
  const feeAmount = BigInt(quote.fee);
  const sellAmt = BigInt(sellAmount);

  if (!quote.fallback) {
    const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

    if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
      txData = encodeFunctionData({
        abi: rainbowRouterAbi,
        functionName: 'fillQuoteEthToToken',
        args: [buyTokenAddress, target, swapCallData, feeAmount],
      });
    } else if (buyTokenAddress?.toLowerCase() === ethAddressLowerCase) {
      if (permit) {
        if (!publicClient) {
          throw new Error('publicClient required for permit transactions');
        }
        if (!walletClient) {
          throw new Error(
            'walletClient with account required for permit transactions'
          );
        }
        const deadline = await calculateDeadline(publicClient);
        const permitSignature = await signPermit(
          publicClient,
          walletClient,
          sellTokenAddress,
          quote.from,
          targetContract,
          MAX_INT,
          deadline,
          chainId
        );
        txData = encodeFunctionData({
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToEthWithPermit',
          args: [
            sellTokenAddress,
            target,
            swapCallData,
            sellAmt,
            BigInt(feePercentageBasisPoints),
            permitSignature,
          ],
        });
      } else {
        txData = encodeFunctionData({
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToEth',
          args: [
            sellTokenAddress,
            target,
            swapCallData,
            sellAmt,
            BigInt(feePercentageBasisPoints),
          ],
        });
      }
    } else {
      if (permit) {
        if (!publicClient) {
          throw new Error('publicClient required for permit transactions');
        }
        if (!walletClient) {
          throw new Error(
            'walletClient with account required for permit transactions'
          );
        }
        const deadline = await calculateDeadline(publicClient);
        const permitSignature = await signPermit(
          publicClient,
          walletClient,
          sellTokenAddress,
          quote.from,
          targetContract,
          MAX_INT,
          deadline,
          chainId
        );
        txData = encodeFunctionData({
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToTokenWithPermit',
          args: [
            sellTokenAddress,
            buyTokenAddress,
            target,
            swapCallData,
            sellAmt,
            feeAmount,
            permitSignature,
          ],
        });
      } else {
        txData = encodeFunctionData({
          abi: rainbowRouterAbi,
          functionName: 'fillQuoteTokenToToken',
          args: [
            sellTokenAddress,
            buyTokenAddress,
            target,
            swapCallData,
            sellAmt,
            feeAmount,
          ],
        });
      }
    }

    if (referrer && txData) {
      txData = `${txData}${getReferrerCode(referrer)}` as Hex;
    }
  } else {
    txData = quote.data;
  }

  if (!targetContract) {
    throw new Error('Quote must have a valid target address');
  }

  if (!txData) {
    throw new Error('Quote must have valid transaction data');
  }

  if (!value) {
    throw new Error('Quote must have a valid value');
  }

  return {
    data: txData,
    to: targetContract,
    value: value.toString(),
  };
};

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
    txData = `${txData}${getReferrerCode(referrer)}` as Hex;
  }

  return {
    data: txData,
    to: to,
    value: value.toString(),
  };
};
