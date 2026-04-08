# Migration Guide: ethers v5 → viem

This release replaces all ethers.js dependencies with [viem](https://viem.sh). This is a **breaking change** — all public API functions that previously accepted ethers types now accept viem types.

If your app already uses viem, you can pass your existing clients directly with no adapters needed.

## Quick setup

```bash
yarn add @rainbow-me/swaps viem
yarn remove @ethersproject/providers @ethersproject/abstract-signer  # etc.
```

Create viem clients to replace your ethers provider/signer:

```typescript
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { mainnet } from 'viem/chains';

// replaces: new StaticJsonRpcProvider(rpcUrl)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://your-rpc-url.com'),
});

// replaces: new Wallet(privateKey, provider) or provider.getSigner()
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum), // or http() for server-side
  account: '0x...', // your account address
});
```

## API changes

### Types

| Before (ethers)         | After (viem)                               |
| ----------------------- | ------------------------------------------ |
| `BigNumberish`          | `BigIntish` (`string \| number \| bigint`) |
| `BigNumber`             | `bigint`                                   |
| `Signer`                | `WalletClient`                             |
| `Wallet`                | `WalletClient` (with account)              |
| `StaticJsonRpcProvider` | `PublicClient`                             |
| `Contract`              | removed from public types                  |
| `Transaction` (return)  | `Hash` (tx hash string)                    |
| `PopulatedTransaction`  | `BatchCall` (`{ to, data, value }`)        |

The `BigIntish` type (`string | number | bigint`) is exported and used for fields that may come from JSON APIs as strings.

### `QuoteExecutionDetails`

The `router: Contract` field has been replaced with typed fields:

```typescript
// Before
interface QuoteExecutionDetails {
  method: any;
  methodArgs: any[];
  params: TransactionOptions;
  methodName: string;
  router: Contract; // ethers Contract instance
}

// After
interface QuoteExecutionDetails {
  method: (...args: readonly unknown[]) => Promise<bigint>;
  methodArgs: readonly (BigIntish | Address | Hex | undefined)[];
  params: TransactionOptions;
  methodName: string;
  address: Address; // contract address
  abi: readonly unknown[]; // typed contract ABI
}
```

The `method` is now a zero-arg function with its arguments already bound:

```typescript
// Before
const gas = await details.method(...details.methodArgs);

// After
const gas = await details.method();
```

### `fillQuote`

```typescript
// Before
const tx: Transaction = await fillQuote(
  quote,
  transactionOptions,
  signer,       // ethers Signer
  permit,
  chainId,
  referrer?,
);

// After
const txHash: Hash = await fillQuote(
  quote,
  transactionOptions,
  walletClient, // viem WalletClient
  permit,
  chainId,
  referrer?,
  publicClient?, // required when permit=true
);
```

Note: the return type changed from an ethers `Transaction` object to a `Hash` (hex string). Use `publicClient.waitForTransactionReceipt({ hash })` to get the receipt.

### `fillCrosschainQuote`

```typescript
// Before
const tx: Transaction = await fillCrosschainQuote(
  quote,
  transactionOptions,
  signer,       // ethers Signer
  referrer?,
);

// After
const txHash: Hash = await fillCrosschainQuote(
  quote,
  transactionOptions,
  walletClient, // viem WalletClient
  referrer?,
);
```

### `getQuoteExecutionDetails`

```typescript
// Before
const details = getQuoteExecutionDetails(quote, txOptions, provider);
//                                                         ^^^^^^^^
//                                                 StaticJsonRpcProvider

// After
const details = getQuoteExecutionDetails(quote, txOptions, publicClient);
//                                                         ^^^^^^^^^^^^
//                                                         PublicClient
```

### `getCrosschainQuoteExecutionDetails`

```typescript
// Before
const details = getCrosschainQuoteExecutionDetails(quote, txOptions, provider);

// After
const details = getCrosschainQuoteExecutionDetails(
  quote,
  txOptions,
  publicClient
);
```

### `prepareFillQuote`

```typescript
// Before
const batchCall = await prepareFillQuote(
  quote,
  transactionOptions,
  signer,   // ethers Signer
  permit,
  chainId,
  referrer?,
);

// After
const batchCall = await prepareFillQuote(
  quote,
  transactionOptions,
  permit,
  chainId,
  referrer?,
  publicClient?,  // required when permit=true
  walletClient?,  // required when permit=true
);
```

Note: the `signer` parameter has been removed. `publicClient` and `walletClient` are passed at the end and are only required for permit-based swaps.

### `wrapNativeAsset` / `unwrapNativeAsset`

```typescript
// Before
const tx: Transaction = await wrapNativeAsset(
  amount,
  signer,
  address,
  txOptions
);

// After
const txHash: Hash = await wrapNativeAsset(
  amount,
  walletClient,
  address,
  txOptions
);
```

### `getWrappedAssetMethod`

```typescript
// Before
const method = getWrappedAssetMethod(name, provider, address);

// After
const method = getWrappedAssetMethod(
  'deposit', // or 'withdraw' — typed union instead of arbitrary string
  publicClient,
  address
);
```

### `signPermit`

```typescript
// Before
const permit = await signPermit(
  wallet, // ethers Wallet
  tokenAddress,
  owner,
  spender,
  value,
  deadline,
  chainId
);

// After
const permit = await signPermit(
  publicClient, // viem PublicClient
  walletClient, // viem WalletClient (signs the EIP-712 permit)
  tokenAddress,
  owner,
  spender,
  value,
  deadline,
  chainId
);
```

The function now uses `walletClient.signTypedData()` under the hood, so it works with any account type (browser wallets, hardware wallets, etc.) — no raw private key needed.

## Common patterns

### Waiting for a transaction

```typescript
// Before (ethers)
const tx = await fillQuote(quote, txOptions, signer, false, chainId);
const receipt = await tx.wait();

// After (viem)
const hash = await fillQuote(quote, txOptions, walletClient, false, chainId);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
```

### Working with BigNumber values

```typescript
// Before
import { BigNumber } from '@ethersproject/bignumber';
const amount = BigNumber.from('1000000');
const doubled = amount.mul(2);

// After
const amount = BigInt('1000000'); // or 1000000n
const doubled = amount * 2n;
```

### Using with wagmi / RainbowKit

If you're using wagmi, you already have viem clients:

```typescript
import { usePublicClient, useWalletClient } from 'wagmi';

const publicClient = usePublicClient();
const { data: walletClient } = useWalletClient();

const hash = await fillQuote(quote, txOptions, walletClient, false, chainId);
```
