import { SwapType } from '../types';

/**
 * @param swapType The swap type provided by the quote.
 * @param isCrossChain Whether the swap is cross-chain.
 * @throws {Error} Throws an error if the swap type is not correct.
 */

export function checkSwapType(swapType: SwapType, isCrossChain: boolean) {
  if (isCrossChain && swapType !== SwapType.crossChain) {
    throw new Error('Normal quote provided for cross-chain swap');
  }
  if (!isCrossChain && swapType !== SwapType.normal) {
    throw new Error('Crosschain quote provided for normal swap');
  }
}
