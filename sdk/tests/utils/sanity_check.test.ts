import type { Address } from 'ox/Address';
import { sanityCheckAddress } from '../../src/utils/sanity_check.js';

describe('sanityCheckAddress', () => {
  it('should not throw on valid address', () => {
    expect(() => {
      sanityCheckAddress('0x3a23F943181408EAC424116Af7b7790c94Cb97a5');
    }).not.toThrow();
  });
  it('should throw on invalid address', () => {
    expect(() => {
      sanityCheckAddress('' as Address);
    }).toThrow('provided address is not defined');
  });
});
