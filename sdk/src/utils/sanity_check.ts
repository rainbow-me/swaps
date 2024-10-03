/**
 * sanityCheckAddress ensures the integrity and correctness of the destination address to prevent transactions to null address
 *
 * @param assertedAddress The destination address provided by the quote.
 * @throws {Error} Throws an error if any of the following conditions are met:
 *   - The quote's destination address is undefined.
 *   - No destination address is defined in the SDK for the provided (source, chainID) combination.
 *   - The provided quote's destination address does not case-insensitively match the SDK's stored destination address.
 */
export function sanityCheckAddress(assertedAddress: string | undefined) {
  if (
    assertedAddress === undefined ||
    assertedAddress === '' ||
    assertedAddress === '0x0000000000000000000000000000000000000000'
  ) {
    throw new Error(`provided address is not defined (API issue)`);
  }
}
