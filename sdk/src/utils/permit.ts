import type { Address } from 'ox/Address';
import type { PublicClient, WalletClient } from 'viem';
import { domainSeparator, parseSignature } from 'viem';
import { erc20PermitAbi } from '../abi/abis.js';
import type { BigIntish, PermitSignature } from '../types/index.js';
import { ChainId } from '../types/index.js';
import { DAI, TORN_ADDRESS, VSP_ADDRESS, WNXM_ADDRESS } from './constants.js';

const EIP2612_TYPE = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const;

const PERMIT_ALLOWED_TYPE = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
] as const;

const getPermitVersion = async (
  publicClient: PublicClient,
  tokenAddress: Address,
  name: string,
  chainId: ChainId,
  verifyingContract: Address
): Promise<string | null> => {
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20PermitAbi,
      functionName: 'version',
    });
  } catch {
    const version = '1';
    try {
      const onChainSeparator = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20PermitAbi,
        functionName: 'DOMAIN_SEPARATOR',
      });
      const computedSeparator = domainSeparator({
        domain: { name, version, chainId, verifyingContract },
      });

      if (onChainSeparator === computedSeparator) {
        return version;
      }
    } catch {
      if (
        chainId === 1 &&
        [TORN_ADDRESS, WNXM_ADDRESS, VSP_ADDRESS]
          .map((t) => t.toLowerCase())
          .indexOf(tokenAddress.toLowerCase()) !== -1
      ) {
        return '1';
      }
      return null;
    }
    return null;
  }
};

const getNonces = async (
  publicClient: PublicClient,
  tokenAddress: Address,
  owner: Address
): Promise<bigint> => {
  try {
    return await publicClient.readContract({
      address: tokenAddress,
      abi: erc20PermitAbi,
      functionName: 'nonces',
      args: [owner],
    });
  } catch {
    try {
      return await publicClient.readContract({
        address: tokenAddress,
        abi: erc20PermitAbi,
        functionName: '_nonces',
        args: [owner],
      });
    } catch {
      return 0n;
    }
  }
};

export async function signPermit(
  publicClient: PublicClient,
  walletClient: WalletClient,
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  value: BigIntish,
  deadline: BigIntish,
  chainId: number
): Promise<PermitSignature> {
  if (!walletClient.account) {
    throw new Error('WalletClient must have an account to sign permits');
  }

  const isDaiStylePermit =
    tokenAddress.toLowerCase() === DAI[chainId]?.toLowerCase();

  const name = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20PermitAbi,
    functionName: 'name',
  });

  const [nonce, version] = await Promise.all([
    getNonces(publicClient, tokenAddress, owner),
    getPermitVersion(publicClient, tokenAddress, name, chainId, tokenAddress),
  ]);

  const domain = {
    name,
    ...(version !== null ? { version } : {}),
    chainId,
    verifyingContract: tokenAddress,
  };

  const signature = isDaiStylePermit
    ? await walletClient.signTypedData({
        account: walletClient.account,
        domain,
        types: { Permit: PERMIT_ALLOWED_TYPE },
        primaryType: 'Permit' as const,
        message: {
          holder: owner,
          spender,
          nonce,
          expiry: BigInt(deadline),
          allowed: true,
        },
      })
    : await walletClient.signTypedData({
        account: walletClient.account,
        domain,
        types: { Permit: EIP2612_TYPE },
        primaryType: 'Permit' as const,
        message: {
          owner,
          spender,
          value: BigInt(value),
          nonce,
          deadline: BigInt(deadline),
        },
      });

  const { v, r, s } = parseSignature(signature);

  return {
    value: isDaiStylePermit ? 0n : BigInt(value),
    nonce,
    deadline: BigInt(deadline),
    isDaiStylePermit,
    v: Number(v),
    r,
    s,
  };
}
