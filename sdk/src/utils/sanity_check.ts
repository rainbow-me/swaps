import { ChainId, CrosschainQuote, Source } from '../types';
import {
  ERC20_TRANSFER_SIGNATURE,
  ETH_ADDRESS,
  RELAY_LINK_BRIDGING_RELAYER_ADDRESS,
  SOCKET_GATEWAY_CONTRACT_ADDRESSESS,
} from './constants';

/**
 * Sanity checks the quote's allowance address against the expected address stored in the SDK.
 * Relay works with an EOA an direct transfers, so no allowance is expected.
 *
 * @param quoteSource The aggregator used for the quote.
 * @param chainID The origin network chain ID for the quote.
 * @param assertedAddress The allowance address provided by the quote.
 * @returns {string} The allowance address expected in the SDK for the provided (source, chainID) combination.
 * @throws {Error} Throws an error if any of the following conditions are met:
 *   - It's a relay's quote and the quote's allowance address is not empty/undefined.
 *   - It's a socket's quote and the quote's allowance address is undefined or different to the expected one.
 *   - No destination address is defined in the SDK for the provided (source, chainID) combination.
 */
export function sanityCheckAllowanceAddress(
  quoteSource: Source | undefined,
  chainID: ChainId,
  assertedAddress: string | undefined
): string {
  const validSource = quoteSource !== undefined;
  if (validSource && quoteSource === Source.CrosschainAggregatorSocket) {
    return sanityCheckDestinationAddress(quoteSource, chainID, assertedAddress);
  }
  if (validSource && quoteSource === Source.CrosschainAggregatorRelay) {
    if (assertedAddress === undefined || assertedAddress === '') {
      return '';
    }
    throw new Error(
      `relay should not bring allowance address: ${assertedAddress}`
    );
  }
  throw new Error(`unknown crosschain swap source ${quoteSource}`);
}

/**
 * Sanity checks the quote's returned address against the expected address stored in the SDK.
 * This function ensures the integrity and correctness of the destination address provided by the quote source.
 *
 * @param quoteSource The aggregator used for the quote.
 * @param chainID The origin network chain ID for the quote.
 * @param assertedAddress The destination address provided by the quote.
 * @returns {string} The destination address stored in the SDK for the provided (source, chainID) combination.
 * @throws {Error} Throws an error if any of the following conditions are met:
 *   - The quote's destination address is undefined.
 *   - No destination address is defined in the SDK for the provided (source, chainID) combination.
 *   - The provided quote's destination address does not case-insensitively match the SDK's stored destination address.
 */
export function sanityCheckDestinationAddress(
  quoteSource: Source | undefined,
  chainID: ChainId,
  assertedAddress: string | undefined
): string {
  if (assertedAddress === undefined || assertedAddress === '') {
    throw new Error(
      `quote's destination addresses must be defined (API Response)`
    );
  }
  let expectedAddress = getExpectedDestinationAddress(quoteSource, chainID);
  if (expectedAddress === undefined || expectedAddress === '') {
    throw new Error(
      `expected source ${quoteSource}'s destination address on chainID ${chainID} must be defined (Swap SDK)`
    );
  }
  if (expectedAddress.toLowerCase() !== assertedAddress?.toLowerCase()) {
    throw new Error(
      `source ${quoteSource}'s destination address '${assertedAddress}' on chainID ${chainID} is not consistent, expected: '${expectedAddress}'`
    );
  }
  return expectedAddress!.toString();
}

/**
 * Retrieves the destination address from a cross-chain quote object, returning undefined
 * when the quote source is not known or the quote does not contain a valid destination address.
 *
 * @param quote The cross-chain quote object returned by the API.
 *
 * @returns The destination address as a string if available.
 * Returns undefined if the quote does not properly specify a destination.
 *
 * @example
 * // Example for a quote from socket
 * const quoteSocket = {
 *   to: '0x1234567890123456789012345678901234567890',
 *   data: '0x...',
 *   sellTokenAddress: '0x...'
 * };
 * console.log(getToAddressFromCrosschainQuote(Source.CrosschainAggregatorSocket, quoteSocket));
 * // Output: '0x1234567890123456789012345678901234567890'
 *
 * // Example for a quote from CrosschainAggregatorRelay where the sell token is ETH
 * const quoteRelayETH = {
 *   to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
 *   data: '0x...',
 *   sellTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
 * };
 * console.log(getToAddressFromCrosschainQuote(Source.CrosschainAggregatorRelay, quoteRelayETH));
 * // Output: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef'
 *
 * // Example for a quote from CrosschainAggregatorRelay where the sell token is not ETH
 * const quoteRelayERC20 = {
 *   to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
 *   data: '0xa9059cbb000000000000000000000000f70da97812cb96acdf810712aa562db8dfa3dbef...',
 *   sellTokenAddress: '0x1234567890123456789012345678901234567890'
 * };
 * console.log(getToAddressFromCrosschainQuote(Source.CrosschainAggregatorRelay, quoteRelayERC20));
 * // Output: '0xf70da97812cb96acdf810712aa562db8dfa3dbef' (assuming the call data was a ERC20 transfer)
 */
export function extractDestinationAddress(
  quote: CrosschainQuote
): string | undefined {
  const quoteSource = quote.source;
  const validQuoteSource = quoteSource !== undefined;
  if (validQuoteSource && quoteSource === Source.CrosschainAggregatorSocket) {
    return quote.to;
  }
  if (validQuoteSource && quoteSource === Source.CrosschainAggregatorRelay) {
    if (quote.sellTokenAddress?.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
      return quote.to;
    }
    return decodeERC20TransferToData(quote.data);
  }
  return undefined;
}

/**
 * Decodes the ERC-20 token transfer data from a transaction's input data.
 * This function expects the input data to start with the ERC-20 transfer method ID (`0xa9059cbb`),
 * followed by the 64 hexadecimal characters for the destination address and 64 hexadecimal characters
 * for the transfer amount. The function will check and parse the input data, extracting the recipient's address
 *
 * The method assumes the data is properly formatted and begins with the correct method ID.
 * If the data does not conform to these expectations, the function will return an 'undefined' object.
 *
 * @param data The hex encoded input data string from an ERC-20 transfer transaction. This string
 * should include the method ID followed by the encoded parameters (address and amount).
 *
 * @returns { string | undefined } The destination address. If any error happens.
 * Returns 'undefined' if it could not decode the call data.
 */
export function decodeERC20TransferToData(
  data: string | undefined
): string | undefined {
  if (!data?.startsWith(ERC20_TRANSFER_SIGNATURE)) {
    return undefined;
  }
  const paramsData = data.slice(ERC20_TRANSFER_SIGNATURE.length);
  if (paramsData.length < 64 * 2) {
    return undefined;
  }
  return `0x${paramsData.slice(0, 64).replace(/^0+/, '')}`;
}

/**
 * Retrieves the destination address stored in the SDK corresponding to the specified aggregator and chain ID.
 *
 * @param quoteSource The aggregator used for the quote.
 * @param chainID The origin network chain ID for the quote.
 * @returns {string | undefined} The destination address stored in the SDK for the provided (source, chainID) combination.
 * Returns `undefined` if no address is stored for the specified combination.
 */
export function getExpectedDestinationAddress(
  quoteSource: Source | undefined,
  chainID: ChainId
): string | undefined {
  const validSource = quoteSource !== undefined;
  if (validSource && quoteSource === Source.CrosschainAggregatorSocket) {
    return SOCKET_GATEWAY_CONTRACT_ADDRESSESS.get(chainID);
  } else if (validSource && quoteSource === Source.CrosschainAggregatorRelay) {
    return RELAY_LINK_BRIDGING_RELAYER_ADDRESS;
  }
  return undefined;
}
