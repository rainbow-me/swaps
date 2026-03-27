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
  RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
} from './utils/constants';

describe('Quotes', () => {
  describe('fillQuote', () => {
    const mockWallet = Wallet.createRandom();
    const provider = new StaticJsonRpcProvider('https://eth.llamarpc.com');
    mockWallet.connect(provider);

    it('should throw error if target contract is not allowed', async () => {
      const invalidQuote = {
        chainId: ChainId.mainnet,
        fallback: true,
        to: '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC',
      } as unknown as Quote;

      let error: Error | undefined;
      try {
        await fillQuote(invalidQuote, {}, mockWallet, false, ChainId.mainnet);
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).toMatch('Target contract unauthorized');
    });

    it('should throw for v2 quote with invalid swapId UUID', async () => {
      const invalidV2Quote = {
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.base,
        data: '0x1234',
        fallback: false,
        fee: '1',
        feePercentageBasisPoints: 0,
        from: '0x1111111111111111111111111111111111111111',
        routerVersion: 'v2',
        sellAmount: '100',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        swapId: 'not-a-uuid',
        to: RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
        value: '1',
      } as unknown as Quote;

      await expect(
        fillQuote(invalidV2Quote, {}, mockWallet, false, ChainId.base)
      ).rejects.toThrow('Invalid swapId UUID for bytes16');
    });
  });

  describe('isAllowedTargetContract', () => {
    it('should allow Rainbow Router address', () => {
      const result = isAllowedTargetContract(
        RAINBOW_ROUTER_CONTRACT_ADDRESS,
        ChainId.mainnet
      );
      expect(result).toEqual(true);

      const resultSanko = isAllowedTargetContract(
        RAINBOW_ROUTER_CONTRACT_ADDRESS,
        ChainId.sanko
      );
      expect(resultSanko).toEqual(true);

      const resultGravity = isAllowedTargetContract(
        RAINBOW_ROUTER_CONTRACT_ADDRESS,
        ChainId.gravity
      );
      expect(resultGravity).toEqual(true);
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

    it('should allow v2 base router address for v2 quotes', () => {
      const result = isAllowedTargetContract(
        RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
        ChainId.base,
        'v2'
      );
      expect(result).toEqual(true);
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
      expect(url).toContain('enableNewChainSwaps=true');
    });
  });
});
