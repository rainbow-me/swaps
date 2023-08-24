import { keccak256 } from '@ethersproject/keccak256';
import { toUtf8Bytes } from '@ethersproject/strings';

export function getReferrerCode(referrer: string): string {
  // Skip 0x and concatenate after 8 characters
  return keccak256(toUtf8Bytes(referrer)).substring(2, 10);
}
