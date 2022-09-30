## 🌈 Rainbow Swap Aggregator JS SDK [![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

This SDK handles

- Token to ETH swaps
- Token to Token swaps
- ETH to Token swaps
- Use of permit when supported (to avoid an extra approval)

- Supported chains are: Mainnet, Ropsten, Rinkeby, Kovan, Optimism, Arbitrum and Polygon


### Installation

```
yarn add @rainbow-me/swaps
```


### Usage

#### Get a quote for a pair

```
const quote = await getQuote(
    { 
        source,             // optional, "1inch" or "0x"
        chainId,            // numeric chain id
        fromAddress,        // address of the wallet to execute the swap from
        sellTokenAddress,   // address of the input token
        buyTokenAddress,    // address of the output token
        sellAmount,         // amount of the input token (required if not passing buyAmount)
        buyAmount,          // amount of the output token (required if not passing sellAmount)
        slippage            // max slippage percentage allowed
    }   
);

```

####  Estimate gas for the swap 

```
const { params, method, methodArgs } = getQuoteExecutionDetails(
        quote,                     //  quote returned from getQuote
        { from: quote.from },      //  transaction options
        provider                   //  ethers provider
      );

const estimatedGas = await method(methodArgs);

```


####  Execute swap for a given quote

```
const tx = await fillQuote(
      quote,                //  quote returned from getQuote
      transactionOptions,   //  gasLimit, maxFeePerGas, maxPriorityFeePerGas, nonce, value, from 
      permit,               //  true if you want to use the permit
      chainId,              //  numeric chain id
);

```
