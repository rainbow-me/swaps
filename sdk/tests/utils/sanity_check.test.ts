import { sanityCheckAddress } from '../../src/utils/sanity_check';

describe('sanityCheckAddress', () => {
  it('should not throw on valid address', () => {
    expect(() => {sanityCheckAddress('0x3a23F943181408EAC424116Af7b7790c94Cb97a5')}).not.toThrow();
  });
  it('should throw on invalid address', () => {
    expect(() => {sanityCheckAddress('')}).toThrow('provided address is not defined');
  });
});
