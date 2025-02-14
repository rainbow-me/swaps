import { BigNumber } from '@ethersproject/bignumber';
import { ChainId, EthereumAddress } from '../types';
export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const API_BASE_URL = 'https://swap.p.rainbow.me';
export const RAINBOW_ROUTER_CONTRACT_ADDRESS =
  '0x00000000009726632680fb29d3f7a9734e3010e2';

export const RAINBOW_ROUTER_CONTRACT_ADDRESS_ZORA =
  '0xa61550e9ddd2797e16489db09343162be98d9483';

export const RAINBOW_ROUTER_CONTRACT_ADDRESS_UNICHAIN = '0x2a0332e28913a06fa924d40a3e2160f763010417';

export type MultiChainAsset = {
  [key: string]: EthereumAddress;
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
