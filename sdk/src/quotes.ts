import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import { Wallet } from '@ethersproject/wallet';
import RainbowRouterABI from './abi/RainbowRouter.json';
import {
  ChainId,
  CrosschainQuote,
  CrosschainQuoteExecutionDetails,
  EthereumAddress,
  Quote,
  QuoteError,
  QuoteExecutionDetails,
  QuoteParams,
  SocketChainsData,
  Source,
  TransactionOptions,
} from './types';
import {
  API_BASE_URL,
  ETH_ADDRESS,
  MAX_INT,
  PERMIT_EXPIRATION_TS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN,
  RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA,
} from './utils/constants';
import { signPermit } from './utils/permit';
import { getReferrerCode } from './utils/referrer';
import { sanityCheckAddress } from './utils/sanity_check';


/**
 * Configure SDK for mocking or fallback to API_BASE_URL
 *
 */
export let sdkConfig = {
  apiBaseUrl: API_BASE_URL
};

export function configureSDK(options: { apiBaseUrl?: string }) {
  sdkConfig = { ...sdkConfig, ...options };
}

/**
 * Function to get the rainbow router contract address based on the chainId
 *
 * @param {ChainId} chainId
 * @returns {string}
 */
export const getRainbowRouterContractAddress = (chainId: ChainId) => {
  if (chainId === ChainId.zora) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA;
  } else if (chainId === ChainId.unichain) {
    return RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN;
  }
  return RAINBOW_ROUTER_CONTRACT_ADDRESS;
};

/**
 * Function to get a swap formatted quote url to use with backend
 *
 * @param {ChainId} params.chainId
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
 * @param {BigNumberish} params.buyAmount
 * @param {BigNumberish} params.sellAmount
 * @param {EthereumAddress} params.fromAddress
 * @param {string} params.source
 * @param {number} params.feePercentageBasisPoints
 * @param {number} params.slippage
 * @returns {string}
 */
const buildRainbowQuoteUrl = ({
  chainId,
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
  toChainId?: number;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  buyAmount?: BigNumberish;
  sellAmount?: BigNumberish;
  fromAddress: EthereumAddress;
  feePercentageBasisPoints?: number;
  source?: Source;
  slippage: number;
  currency: string;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    currency,
    enableZoraSwaps: String(true),
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
  });
  return `${sdkConfig.apiBaseUrl}/v1/quote?` + searchParams.toString();
};

/**
 * Function to get a crosschain swap formatted quote url to use with backend
 *
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
 * @param {BigNumberish} params.sellAmount
 * @param {EthereumAddress} params.fromAddress
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
  slippage,
  refuel,
  feePercentageBasisPoints,
  currency,
}: {
  chainId: number;
  toChainId?: number;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  sellAmount?: BigNumberish;
  fromAddress: EthereumAddress;
  slippage: number;
  refuel?: boolean;
  feePercentageBasisPoints?: number;
  currency: string;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    currency,
    fromAddress,
    refuel: String(refuel),
    sellAmount: String(sellAmount),
    sellToken: sellTokenAddress,
    slippage: String(slippage),
    toChainId: String(toChainId),
    ...(feePercentageBasisPoints !== undefined
      ? { feePercentageBasisPoints: String(feePercentageBasisPoints) }
      : {}),
  });
  return `${sdkConfig.apiBaseUrl}/v1/quote?bridgeVersion=4&` + searchParams.toString();
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
  slippage,
  refuel,
  currency,
}: {
  chainId: number;
  toChainId?: number;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  sellAmount?: BigNumberish;
  fromAddress: EthereumAddress;
  slippage: number;
  refuel?: boolean;
  currency: string;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    claim: String(true),
    currency,
    feePercentageBasisPoints: '0',
    fromAddress,
    refuel: String(refuel),
    sellAmount: String(sellAmount),
    sellToken: sellTokenAddress,
    slippage: String(slippage),
    source: Source.CrosschainAggregatorRelay.toString(),
    toChainId: String(toChainId),
  });
  return `${sdkConfig.apiBaseUrl}/v1/quote?bridgeVersion=4&` + searchParams.toString();
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
 * @param {EthereumAddress} params.fromAddress
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
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
 * @param {EthereumAddress} params.fromAddress
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
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
  const instance = new Contract(
    getRainbowRouterContractAddress(chainId),
    RainbowRouterABI,
    wallet
  );
  let swapTx;

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

  const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

  if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    swapTx = await instance.populateTransaction.fillQuoteEthToToken(
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
        instance.address,
        MAX_INT,
        deadline,
        chainId
      );
      swapTx = await instance.populateTransaction.fillQuoteTokenToEthWithPermit(
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
        instance.address,
        MAX_INT,
        deadline,
        chainId
      );
      swapTx =
        await instance.populateTransaction.fillQuoteTokenToTokenWithPermit(
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

  const newSwapTx = await wallet.sendTransaction({
    data: swapTx.data,
    from: swapTx.from,
    to: swapTx.to,
    ...{
      ...transactionOptions,
      value,
    },
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
  const { data, from, value } = quote;

  sanityCheckAddress(quote?.to);

  let txData = data;
  if (referrer) {
    txData = `${txData}${getReferrerCode(referrer)}`;
  }

  const swapTx = await wallet.sendTransaction({
    data: txData,
    from,
    to: quote.to,
    ...{
      ...transactionOptions,
      value,
    },
  });

  return swapTx;
};

export const getQuoteExecutionDetails = (
  quote: Quote,
  transactionOptions: TransactionOptions,
  provider: StaticJsonRpcProvider
): QuoteExecutionDetails => {
  const instance = new Contract(
    getRainbowRouterContractAddress(quote.chainId),
    RainbowRouterABI,
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
  } = quote;

  const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();

  if (sellTokenAddress?.toLowerCase() === ethAddressLowerCase) {
    return {
      method: instance.estimateGas['fillQuoteEthToToken'],
      methodArgs: [buyTokenAddress, to, data, fee],
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
  const { from, data, value } = quote;

  sanityCheckAddress(quote?.to);

  return {
    method: provider.estimateGas({
      data,
      from,
      to: quote.to,
      value,
    }),
    params: {
      ...transactionOptions,
      value,
    },
  };
};
