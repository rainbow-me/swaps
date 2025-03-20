import { BigNumberish } from '@ethersproject/bignumber';
import { sdkConfig } from './quotes';
import {
  ChainId,
  EthereumAddress,
  Slippage,
  SlippageError,
  SlippageParams,
} from './types';

/**
 * Function to get a slippage formatted quote url to use with backend
 *
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
 * @param {BigNumberish} params.buyAmount
 * @param {BigNumberish} params.sellAmount
 * @returns {string}
 */
const buildRainbowSlippageUrl = ({
  chainId,
  toChainId,
  sellTokenAddress,
  buyTokenAddress,
  buyAmount,
  sellAmount,
}: {
  chainId: number;
  toChainId?: number;
  sellTokenAddress: EthereumAddress;
  buyTokenAddress: EthereumAddress;
  buyAmount?: BigNumberish;
  sellAmount?: BigNumberish;
}) => {
  const searchParams = new URLSearchParams({
    buyToken: buyTokenAddress,
    chainId: String(chainId),
    sellToken: sellTokenAddress,
    toChainId: String(toChainId),
    ...(sellAmount
      ? { sellAmount: String(sellAmount) }
      : { buyAmount: String(buyAmount) }),
  });
  return `${sdkConfig.apiBaseUrl}/v1/slippage?` + searchParams.toString();
};

/**
 * Function to get slippage from rainbow's swap aggregator backend
 *
 * @param {SlippageParams} params
 * @param {ChainId} params.chainId
 * @param {ChainId} params.toChainId
 * @param {EthereumAddress} params.sellTokenAddress
 * @param {EthereumAddress} params.buyTokenAddress
 * @param {BigNumberish} params.sellAmount
 * @param {BigNumberish} params.buyAmount
 * @returns {Promise<Slippage | SlippageError | null>}
 */
export const getSlippage = async (
  params: SlippageParams
): Promise<Slippage | SlippageError | null> => {
  const {
    chainId = ChainId.mainnet,
    toChainId,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
  } = params;

  if (isNaN(Number(sellAmount)) && isNaN(Number(buyAmount))) {
    return null;
  }

  const url = buildRainbowSlippageUrl({
    buyAmount,
    buyTokenAddress,
    chainId,
    sellAmount,
    sellTokenAddress,
    toChainId,
  });

  const response = await fetch(url);
  const slippage = await response.json();
  if (slippage.error) {
    return slippage as SlippageError;
  }
  return slippage?.data as Slippage;
};
