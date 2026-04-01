import { Interface } from '@ethersproject/abi';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Wallet } from '@ethersproject/wallet';
import RainbowRouterV2ABI from './abi/RainbowRouterV2.json';
import {
  buildRainbowQuoteUrl,
  fillQuote,
  getQuote,
  getQuoteExecutionDetails,
  isAllowedTargetContract,
  prepareFillQuote,
} from './quotes';
import { ChainId, Quote } from './types';
import {
  AMM_CONTRACT_ADDRESSES,
  RAINBOW_ROUTER_CONTRACT_ADDRESS,
  RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
} from './utils/constants';

describe('Quotes', () => {
  describe('prepareFillQuote', () => {
    const mockWallet = Wallet.createRandom();

    const uuidToBytes16 = (uuid: string) => {
      const hex = uuid.trim().toLowerCase().replace(/-/g, '');
      if (!/^[0-9a-f]{32}$/.test(hex)) {
        throw new Error(`Invalid swapId UUID for bytes16: ${uuid}`);
      }
      return `0x${hex}`;
    };

    it('should throw for v2 quote when swapId is missing', async () => {
      const v2QuoteMissingSwapId = {
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
        to: RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
        value: '1',
      } as unknown as Quote;

      await expect(
        prepareFillQuote(
          v2QuoteMissingSwapId,
          {},
          mockWallet,
          false,
          ChainId.base
        )
      ).rejects.toThrow('swapId (UUID string) is required for routerVersion=v2 quotes');
    });

    it('should prepare v2 calldata with bytes16 swapId in first position', async () => {
      const swapId = '550e8400-e29b-41d4-a716-446655440000';
      const swapTargetAddress = '0x2222222222222222222222222222222222222222';
      const quote = {
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
        swapId,
        to: swapTargetAddress,
        value: '1',
      } as unknown as Quote;

      const prepared = await prepareFillQuote(quote, {}, mockWallet, false, ChainId.base);
      const iface = new Interface(RainbowRouterV2ABI as any);
      const expectedData = iface.encodeFunctionData('fillQuoteTokenToToken', [
        uuidToBytes16(swapId),
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        swapTargetAddress,
        quote.data,
        quote.sellAmount,
        quote.fee,
      ]);
      const decodedArgs = iface.decodeFunctionData(
        'fillQuoteTokenToToken',
        prepared.data
      );

      expect(prepared.to.toLowerCase()).toBe(
        RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE.toLowerCase()
      );
      expect(prepared.data).toBe(expectedData);
      expect(decodedArgs[3].toLowerCase()).toBe(swapTargetAddress.toLowerCase());
      expect(prepared.data.slice(0, 10)).toBe(expectedData.slice(0, 10));
    });

    it('should ignore fallback=true for v2 quotes', async () => {
      const swapId = '550e8400-e29b-41d4-a716-446655440000';
      const quote = {
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.base,
        data: '0x1234',
        fallback: true,
        fee: '1',
        feePercentageBasisPoints: 0,
        from: '0x1111111111111111111111111111111111111111',
        routerVersion: 'v2',
        sellAmount: '100',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        swapId,
        to: RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE,
        value: '1',
      } as unknown as Quote;

      const prepared = await prepareFillQuote(quote, {}, mockWallet, false, ChainId.base);
      const iface = new Interface(RainbowRouterV2ABI as any);
      const expectedData = iface.encodeFunctionData('fillQuoteTokenToToken', [
        uuidToBytes16(swapId),
        quote.sellTokenAddress,
        quote.buyTokenAddress,
        quote.to,
        quote.data,
        quote.sellAmount,
        quote.fee,
      ]);

      expect(prepared.to.toLowerCase()).toBe(
        RAINBOW_ROUTER_V2_CONTRACT_ADDRESS_BASE.toLowerCase()
      );
      expect(prepared.data).toBe(expectedData);
    });
  });

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

  describe('getQuoteExecutionDetails', () => {
    it('should use provider estimateGas for fallback v1 quotes', () => {
      const provider = new StaticJsonRpcProvider('https://eth.llamarpc.com');
      const estimateGasSpy = jest.spyOn(provider, 'estimateGas').mockResolvedValue({
        toString: () => '21000',
      } as any);

      const fallbackQuote = {
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.mainnet,
        data: '0x1234',
        fallback: true,
        fee: '1',
        feePercentageBasisPoints: 0,
        from: '0x1111111111111111111111111111111111111111',
        sellAmount: '100',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        to: '0x2222222222222222222222222222222222222222',
        value: '1',
      } as unknown as Quote;

      const details = getQuoteExecutionDetails(fallbackQuote, {}, provider);

      expect(details.methodName).toBe('estimateGas');
      expect(details.methodArgs).toEqual([]);
      expect(estimateGasSpy).not.toHaveBeenCalled();
      details.method(...details.methodArgs);
      expect(estimateGasSpy).toHaveBeenCalledWith({
        data: fallbackQuote.data,
        from: fallbackQuote.from,
        to: fallbackQuote.to,
        value: fallbackQuote.value,
      });
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

    it('should not include routerVersion when routerVersion is undefined', () => {
      const url = buildRainbowQuoteUrl({
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.mainnet,
        currency: 'USD',
        fromAddress: '0x1111111111111111111111111111111111111111',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        slippage: 0.5,
      });

      expect(url).not.toContain('routerVersion=');
    });

  });

  describe('getQuote', () => {
    it('should throw when swapSessionId is not a valid UUID', async () => {
      await expect(
        getQuote({
          buyTokenAddress: '0x0987654321098765432109876543210987654321',
          chainId: ChainId.mainnet,
          currency: 'USD',
          fromAddress: '0x1111111111111111111111111111111111111111',
          sellAmount: '100',
          sellTokenAddress: '0x1234567890123456789012345678901234567890',
          slippage: 0.5,
          swapSessionId: 'not-a-uuid',
        })
      ).rejects.toThrow('swapSessionId must be a valid UUID');
    });

    it('should send X-Swap-Session-Id header when swapSessionId is provided', async () => {
      const swapSessionId = '550e8400-e29b-41d4-a716-446655440000';
      const originalFetch = (global as any).fetch;
      const fetchSpy = jest.fn().mockResolvedValue({
        json: async () => ({ data: 'ok' }),
      });
      (global as any).fetch = fetchSpy;

      await getQuote({
        buyTokenAddress: '0x0987654321098765432109876543210987654321',
        chainId: ChainId.mainnet,
        currency: 'USD',
        fromAddress: '0x1111111111111111111111111111111111111111',
        sellAmount: '100',
        sellTokenAddress: '0x1234567890123456789012345678901234567890',
        slippage: 0.5,
        swapSessionId,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy.mock.calls[0][1]).toMatchObject({
        headers: { 'X-Swap-Session-Id': swapSessionId },
      });
      (global as any).fetch = originalFetch;
    });
  });
});
