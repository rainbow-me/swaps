import { ChainId, CrosschainQuote, EthereumAddress, Source } from '../../src';
import {
  decodeERC20TransferToData,
  extractDestinationAddress,
  getExpectedDestinationAddress,
  sanityCheckAddress,
} from '../../src/utils/sanity_check';

const okERC20Data =
  '0xa9059cbb000000000000000000000000f70da97812cb96acdf810712aa562db8dfa3dbef0000000000000000000000000000000000000000000000056bc75e2d631000000085078f';

function getQuote(
  chainID: ChainId,
  source: Source | undefined = undefined,
  to: string | undefined = undefined,
  sellTokenAddress: string | undefined = undefined,
  data: string | undefined = undefined
): CrosschainQuote {
  return {
    buyAmount: '',
    buyAmountDisplay: '',
    buyAmountDisplayMinimum: '',
    buyAmountInEth: '',
    buyAmountMinusFees: '',
    buyTokenAddress: '' as EthereumAddress,
    buyTokenAsset: {
      assetCode: '',
      chainId: chainID,
      decimals: 18,
      iconUrl: '',
      name: '',
      network: '',
      networks: {
        '1': {
          address: '',
          decimals: 18,
        },
      },
      price: {
        available: false,
        value: 0,
      },
      symbol: '',
      totalPrice: {
        available: false,
        value: 0,
      },
    },
    chainId: chainID,
    data: data,
    fee: '',
    feeInEth: '',
    feePercentageBasisPoints: 0,
    feeTokenAsset: {
      assetCode: '',
      chainId: chainID,
      decimals: 18,
      iconUrl: '',
      name: '',
      network: '',
      networks: {
        '1': {
          address: '',
          decimals: 18,
        },
      },
      price: {
        available: false,
        value: 0,
      },
      symbol: '',
      totalPrice: {
        available: false,
        value: 0,
      },
    },
    from: '',
    fromAsset: {
      address: '',
      chainAgnosticId: chainID,
      chainId: chainID,
      decimals: 18,
      icon: '',
      logoURI: '',
      name: '',
      symbol: '',
    },
    fromChainId: chainID,
    no_approval: false,
    refuel: null,
    routes: [],
    sellAmount: '',
    sellAmountDisplay: '',
    sellAmountInEth: '',
    sellAmountMinusFees: '',
    sellTokenAddress: sellTokenAddress as EthereumAddress,
    sellTokenAsset: {
      assetCode: '',
      chainId: chainID,
      decimals: 18,
      iconUrl: '',
      name: '',
      network: '',
      networks: {
        '1': {
          address: '',
          decimals: 18,
        },
      },
      price: {
        available: false,
        value: 0,
      },
      symbol: '',
      totalPrice: {
        available: false,
        value: 0,
      },
    },
    source: source,
    to: to,
    toAsset: {
      address: '',
      chainAgnosticId: chainID,
      chainId: chainID,
      decimals: 18,
      icon: '',
      logoURI: '',
      name: '',
      symbol: '',
    },
    toChainId: 0,
    tradeAmountUSD: 0,
  };
}

describe('getToAddressFromCrosschainQuote', () => {
  it('should return undefined if non defined source', () => {
    const quote = getQuote(1, undefined, '0x1234');
    expect(extractDestinationAddress(quote)).toBeUndefined();
  });
  it('should just use to address for socket', () => {
    const quote = getQuote(1, Source.CrosschainAggregatorSocket, '0x1234');
    expect(extractDestinationAddress(quote)).toEqual('0x1234');
  });
});

describe('decodeERC20TransferData', () => {
  it('should correctly decode valid ERC20 transfer data', () => {
    expect(decodeERC20TransferToData(okERC20Data)).toEqual(
      '0xf70da97812cb96acdf810712aa562db8dfa3dbef'
    );
  });
  it('should return null for invalid data', () => {
    const data = '0xdeadbeef';
    expect(decodeERC20TransferToData(data)).toBeUndefined();
  });
  it('should return null for incomplete data', () => {
    const data =
      '0xa9059cbb000000000000000000000000f70da97812cb96acdf810712aa562db8dfa3dbef';
    expect(decodeERC20TransferToData(data)).toBeUndefined();
  });

  it('should return decode erc20 data', () => {
    const data =
      '0xa9059cbb000000000000000000000000f70da97812cb96acdf810712aa562db8dfa3dbef000000000000000000000000000000000000000000000001a055690d9db8000000878469';
    expect(decodeERC20TransferToData(data)).toEqual(
      `0xf70da97812cb96acdf810712aa562db8dfa3dbef`
    );
  });
});

describe('getExpectedDestinationAddress', () => {
  it('should return expected and true for socket', () => {
    expect(
      getExpectedDestinationAddress(
        Source.CrosschainAggregatorSocket,
        ChainId.mainnet
      )
    ).toEqual({
      expectedAddress: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
      shouldOverride: true,
    });
  });
  it('should return expected and false for relay', () => {
    expect(
      getExpectedDestinationAddress(
        Source.CrosschainAggregatorRelay,
        ChainId.mainnet
      )
    ).toEqual({
      expectedAddress: '0xf70da97812CB96acDF810712Aa562db8dfA3dbEF',
      shouldOverride: false,
    });
  });
});

describe('sanityCheckAddress', () => {
  it('should return expected and true for socket', () => {
    expect(
      sanityCheckAddress(
        Source.CrosschainAggregatorSocket,
        ChainId.mainnet,
        '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'
      )
    ).toEqual({
      expectedAddress: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
      shouldOverride: true,
    });
  });
  it('should return expected and false for relay', () => {
    expect(
      sanityCheckAddress(
        Source.CrosschainAggregatorRelay,
        ChainId.mainnet,
        '0xf70da97812CB96acDF810712Aa562db8dfA3dbEF'
      )
    ).toEqual({
      expectedAddress: '0xf70da97812CB96acDF810712Aa562db8dfA3dbEF',
      shouldOverride: false,
    });
  });
});
