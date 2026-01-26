![Rainbow Swaps Image](../.github/hero.png)

# Rainbow Swaps SDK

[![npm version](https://img.shields.io/npm/v/@rainbow-me/swaps.svg)](https://www.npmjs.com/package/@rainbow-me/swaps)
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

Swap aggregator SDK used in Rainbow Wallet.

## Installation

```bash
yarn add @rainbow-me/swaps
```

```bash
npm install @rainbow-me/swaps
```

```bash
pnpm add @rainbow-me/swaps
```

## Usage

### Get a quote for a pair

```typescript
import { getQuote } from '@rainbow-me/swaps';

const quote = await getQuote({
  source,             // optional, "1inch" or "0x"
  chainId,            // numeric chain id
  fromAddress,        // address of the wallet to execute the swap from
  destReceiver,       // optional, address to receive the output tokens
  sellTokenAddress,   // address of the input token
  buyTokenAddress,    // address of the output token
  sellAmount,         // amount of the input token (required if not passing buyAmount)
  buyAmount,          // amount of the output token (required if not passing sellAmount)
  slippage,           // max slippage percentage allowed
});
```

### Estimate gas for the swap

```typescript
import { getQuoteExecutionDetails } from '@rainbow-me/swaps';

const { params, method, methodArgs } = getQuoteExecutionDetails(
  quote,                     // quote returned from getQuote
  { from: quote.from },      // transaction options
  provider                   // ethers provider
);

const estimatedGas = await method(methodArgs);
```

### Execute swap for a given quote

```typescript
import { fillQuote } from '@rainbow-me/swaps';

const hash = await fillQuote(
  quote,                // quote returned from getQuote
  transactionOptions,   // gasLimit, maxFeePerGas, maxPriorityFeePerGas, nonce, value, from
  permit,               // true if you want to use the permit
  chainId               // numeric chain id
);
```

### Prepare fill quote transaction

```typescript
import { prepareFillQuote } from '@rainbow-me/swaps';

const transaction = await prepareFillQuote(
  quote,                // quote returned from getQuote
  transactionOptions,   // gasLimit, maxFeePerGas, maxPriorityFeePerGas, nonce, value, from
  wallet,               // ethers signer
  permit,               // true if you want to use the permit
  chainId               // numeric chain id
);

// Returns a populated transaction object that can be sent later
const hash = await wallet.sendTransaction(transaction);
```

## Features

- Token to ETH swaps
- Token to Token swaps
- ETH to Token swaps
- Use of permit when supported (to avoid an extra approval)
- Supported chains: Mainnet, Optimism, Arbitrum, Polygon, Base, and more

## Development

```bash
nvm use
```

```bash
yarn install
```

```bash
yarn build
```

```bash
yarn test
```

```bash
yarn lint
```

## License

Licensed under the [GPL-3.0 License](../../LICENSE).
