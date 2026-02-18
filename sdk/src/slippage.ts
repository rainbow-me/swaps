import type { Address } from 'ox/Address';
import { sdkConfig } from './quotes.js';
import {
  BigIntish,
  ChainId,
  Slippage,
  SlippageError,
  SlippageParams,
} from './types/index.js';

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
  sellTokenAddress: Address;
  buyTokenAddress: Address;
  buyAmount?: BigIntish;
  sellAmount?: BigIntish;
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
