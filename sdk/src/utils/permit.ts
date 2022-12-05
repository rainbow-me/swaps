import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { splitSignature } from '@ethersproject/bytes';
import { Contract } from '@ethersproject/contracts';
import { Signer } from 'ethers';
import {
  signTypedData,
  SignTypedDataVersion,
  TypedDataUtils,
} from '@metamask/eth-sig-util';
import { addHexPrefix, toBuffer } from 'ethereumjs-util';
import { DAI, TORN_ADDRESS, VSP_ADDRESS, WNXM_ADDRESS } from '..';
import DAIAbi from '../abi/DAI.json';
import IERC2612Abi from '../abi/IERC2612.json';
import { ChainId, EthereumAddress } from '../types';

const EIP712_DOMAIN_TYPE = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export interface MessageParam {
  nonce: number;
  spender: EthereumAddress;
  holder?: EthereumAddress;
  allowed?: boolean;
  expiry?: number;
  value?: BigNumberish;
  deadline?: number;
  owner?: EthereumAddress;
}

export interface DomainParam {
  chainId: ChainId;
  name: string;
  verifyingContract: EthereumAddress;
  version?: string;
}

const getDomainSeparator = async (
  name: string,
  version: string,
  chainId: ChainId,
  verifyingContract: EthereumAddress
) => {
  return (
    '0x' +
    TypedDataUtils.hashStruct(
      'EIP712Domain',
      { chainId, name, verifyingContract, version },
      { EIP712Domain: EIP712_DOMAIN_TYPE },
      SignTypedDataVersion.V4
    ).toString('hex')
  );
};

const getPermitVersion = async (
  token: { version: () => any; DOMAIN_SEPARATOR: () => any; address: string },
  name: string,
  chainId: ChainId,
  verifyingContract: EthereumAddress
) => {
  try {
    const version = await token.version();
    return version;
  } catch (e) {
    const version = '1';
    try {
      const domainSeparator = await token.DOMAIN_SEPARATOR();
      const domainSeparatorValidation = await getDomainSeparator(
        name,
        version,
        chainId,
        verifyingContract
      );

      if (domainSeparator === domainSeparatorValidation) {
        return version;
      }
    } catch (_) {
      if (
        chainId === 1 &&
        [TORN_ADDRESS, WNXM_ADDRESS, VSP_ADDRESS]
          .map((t) => t.toLowerCase())
          .indexOf(token.address.toLowerCase()) !== -1
      ) {
        return '1';
      }
      return null;
    }
    return null;
  }
};

const getNonces = async (token: Contract, owner: EthereumAddress) => {
  try {
    const nonce = await token.nonces(owner);
    return nonce;
  } catch (e) {
    try {
      const nonce = await token._nonces(owner);
      return nonce;
    } catch (e) {
      return 0;
    }
  }
};

const EIP712_DOMAIN_TYPE_NO_VERSION = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const EIP2612_TYPE = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

const PERMIT_ALLOWED_TYPE = [
  { name: 'holder', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'expiry', type: 'uint256' },
  { name: 'allowed', type: 'bool' },
];

export async function signPermit(
  wallet: Signer,
  tokenAddress: EthereumAddress,
  owner: EthereumAddress,
  spender: EthereumAddress,
  value: BigNumberish,
  deadline: BigNumberish,
  chainId: number
): Promise<any> {
  const isDaiStylePermit =
    tokenAddress.toLowerCase() === DAI[chainId]?.toLowerCase();

  const token = new Contract(
    tokenAddress,
    isDaiStylePermit ? DAIAbi : IERC2612Abi,
    wallet
  );

  const name = await token.name();
  const [nonce, version] = await Promise.all([
    getNonces(token, owner),
    getPermitVersion(token as any, name, chainId, token.address),
  ]);

  const message: MessageParam = {
    nonce: Number(nonce.toString()),
    spender,
  };

  if (isDaiStylePermit) {
    message.holder = owner;
    message.allowed = true;
    message.expiry = Number(deadline.toString());
  } else {
    message.value = BigNumber.from(value).toHexString();
    message.deadline = Number(deadline.toString());
    message.owner = owner;
  }

  const domain: DomainParam = {
    chainId,
    name,
    verifyingContract: token.address,
  };
  if (version !== null) {
    domain.version = version;
  }

  const types = {
    EIP712Domain:
      version !== null ? EIP712_DOMAIN_TYPE : EIP712_DOMAIN_TYPE_NO_VERSION,
    Permit: isDaiStylePermit ? PERMIT_ALLOWED_TYPE : EIP2612_TYPE,
  };

  const data = {
    domain,
    message,
    primaryType: 'Permit',
    types,
  };

  const privateKeyBuffer = toBuffer(addHexPrefix(wallet.privateKey));

  const signature = signTypedData({
    data: data as any,
    privateKey: privateKeyBuffer,
    version: SignTypedDataVersion.V4,
  });

  const { v, r, s } = splitSignature(signature);

  return {
    deadline,
    isDaiStylePermit,
    nonce,
    r,
    s,
    v,
    value: message.value || BigNumber.from('0').toHexString(),
  };
}
