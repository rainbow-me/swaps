import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import {
  buildRainbowQuoteUrl,
  fillQuote,
  isAllowedTargetContract,
} from './quotes';
import { ChainId, Quote } from './types';
import {
  AMM_CONTRACT_ADDRESSES,
  RAINBOW_ROUTER_CONTRACT_ADDRESS,
} from './utils/constants';

describe('Quotes', () => {
  describe('fillQuote', () => {
    const mockWallet = Wallet.createRandom();
    const provider = new StaticJsonRpcProvider('https://eth.llamarpc.com');
    mockWallet.connect(provider);

    it('should throw error if target contract is not allowed', async () => {
      const invalidQuote = {
        chainId: ChainId.mainnet,
        to: '0x1234567890123456789012345678901234567890',
      } as Quote;

      let error: Error | undefined;
      try {
        await fillQuote(invalidQuote, {}, mockWallet, false, ChainId.mainnet);
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).toMatch('Target contract unauthorized');
    });
  });

  describe('isAllowedTargetContract', () => {
    it('should allow Rainbow Router address', () => {
      const result = isAllowedTargetContract(
        RAINBOW_ROUTER_CONTRACT_ADDRESS,
        ChainId.mainnet
      );
      expect(result).toEqual(true);
    });

    it('should allow AMM contract address', () => {
      const result = isAllowedTargetContract(
        AMM_CONTRACT_ADDRESSES[ChainId.mainnet],
        ChainId.mainnet
      );
      expect(result).toEqual(true);
    });

    it('should not allow random address', () => {
      const result = isAllowedTargetContract(
        '0x1234567890123456789012345678901234567890',
        ChainId.mainnet
      );
      expect(result).toEqual(false);
    });
  });

  describe('buildRainbowQuoteUrl', () => {
    it('should include allowFallback=true in URL params', () => {
      const url = buildRainbowQuoteUrl({
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.mainnet,
        currency: 'USD',
        fromAddress: '0x1111111111111111111111111111111111111111',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        slippage: 0.5,
      });

      expect(url).toContain('allowFallback=true');
      expect(url).toContain('enableZoraSwaps=true');
    });
  });
});
