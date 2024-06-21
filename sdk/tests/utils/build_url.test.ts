import {buildRainbowClaimBridgeQuoteUrl, buildRainbowCrosschainQuoteUrl} from '../../src';

describe('when creating crosschain swap URL', () => {
  it('should consider feePercentageBasisPoints if passed', () => {
    expect(
      buildRainbowCrosschainQuoteUrl({
        buyTokenAddress: '0x456',
        chainId: 1,
        feePercentageBasisPoints: 0,
        fromAddress: '0x789',
        refuel: false,
        sellAmount: '100',
        sellTokenAddress: '0x123',
        slippage: 2,
        toChainId: 137,
      })
    ).toEqual(
      'https://swap.p.rainbow.me/v1/quote?bridgeVersion=3&buyToken=0x456&chainId=1&fromAddress=0x789&refuel=false&sellAmount=100&sellToken=0x123&slippage=2&swapType=cross-chain&toChainId=137&feePercentageBasisPoints=0'
    );
  });
  it('should ignore feePercentageBasisPoints if not passed', () => {
    expect(
      buildRainbowCrosschainQuoteUrl({
        buyTokenAddress: '0x456',
        chainId: 1,
        // feePercentageBasisPoints not passed
        fromAddress: '0x789',
        refuel: false,
        sellAmount: '100',
        sellTokenAddress: '0x123',
        slippage: 2,
        toChainId: 137,
      })
    ).toEqual(
      'https://swap.p.rainbow.me/v1/quote?bridgeVersion=3&buyToken=0x456&chainId=1&fromAddress=0x789&refuel=false&sellAmount=100&sellToken=0x123&slippage=2&swapType=cross-chain&toChainId=137'
    );
  });
});

describe('when creating claim bridge swap URL', () => {
  it('should set feePercentageBasisPoints to 0 and claim as true if passed', () => {
    expect(
      buildRainbowClaimBridgeQuoteUrl({
        buyTokenAddress: '0x456',
        chainId: 1,
        fromAddress: '0x789',
        refuel: false,
        sellAmount: '100',
        sellTokenAddress: '0x123',
        slippage: 2,
        toChainId: 137,
      })
    ).toEqual(
      'https://swap.p.rainbow.me/v1/quote?bridgeVersion=3&buyToken=0x456&chainId=1&claim=true&feePercentageBasisPoints=0&fromAddress=0x789&refuel=false&sellAmount=100&sellToken=0x123&slippage=2&source=relay&swapType=cross-chain&toChainId=137'
    );
  });
});
