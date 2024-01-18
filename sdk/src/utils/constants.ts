import { BigNumber } from '@ethersproject/bignumber';
import { ChainId, EthereumAddress } from '../types';
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const API_BASE_URL = 'https://swap.p.rainbow.me';
export const RAINBOW_ROUTER_CONTRACT_ADDRESS =
  '0x00000000009726632680fb29d3f7a9734e3010e2';

// SOCKET_GATEWAY_CONTRACT_ADDRESSES is mapped by int chain ID to avoid a breaking change
export const SOCKET_GATEWAY_CONTRACT_ADDRESSESS = new Map([
  [ChainId.mainnet, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.optimism, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.polygon, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.arbitrum, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.bsc, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.zora, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.base, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
  [ChainId.avalanche, '0x3a23F943181408EAC424116Af7b7790c94Cb97a5'],
]);

export type MultiChainAsset = {
  [key: string]: EthereumAddress;
};

export const WRAPPED_ASSET: MultiChainAsset = {
  [`${ChainId.mainnet}`]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  [`${ChainId.optimism}`]: '0x4200000000000000000000000000000000000006',
  [`${ChainId.polygon}`]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [`${ChainId.arbitrum}`]: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  [`${ChainId.bsc}`]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [`${ChainId.zora}`]: '0x4200000000000000000000000000000000000006',
  [`${ChainId.base}`]: '0x4200000000000000000000000000000000000006',
  [`${ChainId.avalanche}`]: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
};

export const DAI: MultiChainAsset = {
  [`${ChainId.mainnet}`]: '0x6b175474e89094c44da98b954eedeac495271d0f',
};
export const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
export const TORN_ADDRESS = '0x77777feddddffc19ff86db637967013e6c6a116c';
export const WNXM_ADDRESS = '0x0d438f3b5175bebc262bf23753c1e53d03432bde';
export const VSP_ADDRESS = '0x1b40183efb4dd766f11bda7a7c3ad8982e998421';
export const MAX_INT = BigNumber.from('2').pow('256').sub('1').toString();
export const PERMIT_EXPIRATION_TS = 3600;

export type PermitSupportedTokenList = {
  [key: string]: boolean;
};

export const ALLOWS_PERMIT: PermitSupportedTokenList = {
  // wNXM
  '0x0d438f3b5175bebc262bf23753c1e53d03432bde': true,

  // INCH
  '0x111111111117dc0aa78b770fa6a738034120c302': true,

  // VSP
  '0x1b40183efb4dd766f11bda7a7c3ad8982e998421': true,

  // UNI
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': true,

  // RAD
  '0x31c8eacbffdd875c74b94b077895bd78cf1e64a3': true,

  // DAI
  '0x6b175474e89094c44da98b954eedeac495271d0f': true,

  // LQTY
  '0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d': true,

  // TORN
  '0x77777feddddffc19ff86db637967013e6c6a116c': true,

  // DFX
  '0x888888435fde8e7d4c54cab67f206e4199454c60': true,

  // OPIUM
  '0x888888888889c00c67689029d7856aac1065ec11': true,

  // MIST
  '0x88acdd2a6425c3faae4bc9650fd7e27e0bebb7ab': true,

  // FEI
  '0x956f47f50a910163d8bf957cf5846d573e7f87ca': true,

  // USDC
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': true,

  // BAL
  '0xba100000625a3754423978a60c9317c58a424e3d': true,

  // TRIBE
  '0xc7283b66eb1eb5fb86327f08e1b5816b0720212b': true,
};
