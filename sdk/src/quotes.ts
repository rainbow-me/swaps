import { Contract } from '@ethersproject/contracts';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Transaction } from '@ethersproject/transactions';
import { Wallet } from '@ethersproject/wallet';
import RainbowRouterABI from './abi/RainbowRouter.json';
import {
  ChainId,
  Quote,
  QuoteError,
  QuoteExecutionDetails,
  QuoteParams,
  TransactionOptions,
} from './types';
import {
  API_BASE_URL,
  ETH_ADDRESS,
  MAX_INT,
  PERMIT_EXPIRATION_TS,
  RAINBOW_ROUTER_CONTRACT_ADDRESS,
  WRAPPED_ASSET,
} from './utils/constants';
import { signPermit } from '.';

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
 * @returns {Promise<Quote | null>}
 */
export const getQuote = async (
  params: QuoteParams
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
  } = params;
  // When wrapping or unwrapping ETH, the quote is always 1:1
  // so we don't need to call our backend.
  const sellTokenAddressLowercase = sellTokenAddress.toLowerCase();
  const buyTokenAddressLowercase = buyTokenAddress.toLowerCase();
  const ethAddressLowerCase = ETH_ADDRESS.toLowerCase();
  const wrappedAssetLowercase = WRAPPED_ASSET[chainId]?.toLowerCase();
  const isWrap =
    sellTokenAddressLowercase === ethAddressLowerCase &&
    buyTokenAddressLowercase === wrappedAssetLowercase;
  const isUnwrap =
    sellTokenAddressLowercase === wrappedAssetLowercase &&
    buyTokenAddressLowercase === ethAddressLowerCase;

  if (isWrap || isUnwrap) {
    return {
      buyAmount: sellAmount || buyAmount,
      buyTokenAddress,
      defaultGasLimit: isWrap ? '30000' : '40000',
      fee: 0,
      feePercentageBasisPoints: 0,
      from: fromAddress,
      inputTokenDecimals: 18,
      outputTokenDecimals: 18,
      sellAmount: sellAmount || buyAmount,
      sellAmountMinusFees: sellAmount || buyAmount,
      sellTokenAddress,
    } as Quote;
  }

  let url = `${API_BASE_URL}/quote?chainId=${chainId}&fromAddress=${fromAddress}&buyToken=${buyTokenAddress}&sellToken=${sellTokenAddress}&slippage=${slippage}`;
  if (source) {
    url += `&source=${source}`;
  }
  if (sellAmount) {
    url += `&sellAmount=${sellAmount}`;
  } else if (buyAmount) {
    url += `&buyAmount=${buyAmount}`;
  }
  if (isNaN(Number(sellAmount)) && isNaN(Number(buyAmount))) {
    return null;
  }

  // When buying ETH, we need to tell the aggregator
  // to return the funds to the contract if we need to take a fee
  if (buyTokenAddress === ETH_ADDRESS) {
    url += `&destReceiver=${RAINBOW_ROUTER_CONTRACT_ADDRESS}`;
  }

  // @ts-ignore
  if (params.feePercentageBasisPoints !== undefined) {
    // @ts-ignore
    url += `&feePercentageBasisPoints=${params.feePercentageBasisPoints}`;
  }

  const response = await fetch(url);
  const quote = await response.json();
  if (quote.error) {
    return quote as QuoteError;
  }
  return quote as Quote;
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
 * @param {Wallet} wallet
 * @param {boolean} permit
 * @param {number} ChainId
 * @returns {Promise<Transaction>}
 */
export const fillQuote = async (
  quote: Quote,
  transactionOptions: TransactionOptions,
  wallet: Wallet,
  permit: boolean,
  chainId: ChainId
): Promise<Transaction> => {
  const instance = new Contract(
    RAINBOW_ROUTER_CONTRACT_ADDRESS,
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
    swapTx = await instance.fillQuoteEthToToken(
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
      const deadline = await calculateDeadline(wallet);
      const permitSignature = await signPermit(
        wallet,
        sellTokenAddress,
        quote.from,
        instance.address,
        MAX_INT,
        deadline,
        chainId
      );
      swapTx = await instance.fillQuoteTokenToEthWithPermit(
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
      swapTx = await instance.fillQuoteTokenToEth(
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
      const deadline = await calculateDeadline(wallet);
      const permitSignature = await signPermit(
        wallet,
        sellTokenAddress,
        quote.from,
        instance.address,
        MAX_INT,
        deadline,
        chainId
      );
      swapTx = await instance.fillQuoteTokenToTokenWithPermit(
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
      swapTx = await instance.fillQuoteTokenToToken(
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
  return swapTx;
};

export const getQuoteExecutionDetails = (
  quote: Quote,
  transactionOptions: TransactionOptions,
  provider: StaticJsonRpcProvider
): QuoteExecutionDetails => {
  const instance = new Contract(
    RAINBOW_ROUTER_CONTRACT_ADDRESS,
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
