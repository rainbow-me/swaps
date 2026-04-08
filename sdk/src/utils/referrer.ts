import { keccak256, stringToHex } from 'viem';

export function getReferrerCode(referrer: string): string {
  return keccak256(stringToHex(referrer)).substring(2, 10);
}
