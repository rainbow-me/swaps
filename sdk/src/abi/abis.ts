import { parseAbi } from 'viem';

export const rainbowRouterAbi = parseAbi([
  'function fillQuoteEthToToken(address buyTokenAddress, address target, bytes swapCallData, uint256 feeAmount) payable',
  'function fillQuoteTokenToEth(address sellTokenAddress, address target, bytes swapCallData, uint256 sellAmount, uint256 feePercentageBasisPoints) payable',
  'function fillQuoteTokenToEthWithPermit(address sellTokenAddress, address target, bytes swapCallData, uint256 sellAmount, uint256 feePercentageBasisPoints, (uint256 value, uint256 nonce, uint256 deadline, bool isDaiStylePermit, uint8 v, bytes32 r, bytes32 s) permitData) payable',
  'function fillQuoteTokenToToken(address sellTokenAddress, address buyTokenAddress, address target, bytes swapCallData, uint256 sellAmount, uint256 feeAmount) payable',
  'function fillQuoteTokenToTokenWithPermit(address sellTokenAddress, address buyTokenAddress, address target, bytes swapCallData, uint256 sellAmount, uint256 feeAmount, (uint256 value, uint256 nonce, uint256 deadline, bool isDaiStylePermit, uint8 v, bytes32 r, bytes32 s) permitData) payable',
]);

export const wethAbi = parseAbi([
  'function deposit() payable',
  'function withdraw(uint256 amount)',
]);

export const erc20PermitAbi = parseAbi([
  'function name() view returns (string)',
  'function nonces(address owner) view returns (uint256)',
  'function _nonces(address owner) view returns (uint256)',
  'function version() view returns (string)',
  'function DOMAIN_SEPARATOR() view returns (bytes32)',
]);
