# @rainbow-me/swaps

## 0.41.0

### Minor Changes

- 648d603: Added quote preparation functions for batching. This exposes new functions to prepare quote transaction data without executing them:
  - `prepareFillQuote`: Extracts transaction data from regular quotes without executing
  - `prepareFillCrosschainQuote`: Extracts transaction data from crosschain quotes without executing
  - `BatchCall` interface - Standardized format for transaction data `({ data, to, value })`
- 9dd0c66: Improved API type safety:
  - Replaced the loose `EthereumAddress` string alias with `Address` and `Hex` types from `ox` (the `viem` standard library)
  - Added a static `Currency` union type for fiat currency parameters

## 0.40.0

### Minor Changes

- Add `destReceiver` parameter support across all quote functions to enable specifying a custom destination address for receiving swapped tokens (#119)

## 0.39.0

### Minor Changes

- Add flag to prevent failed swaps and improve swap reliability (#115)

## 0.38.0

### Minor Changes

- Add support for 19 new blockchain networks (#111):
  - Scroll (Chain ID: 534352)
  - Linea (Chain ID: 59144)
  - HyperEVM (Chain ID: 999)
  - Lisk (Chain ID: 1135)
  - Katana (Chain ID: 747474)
  - Sonic (Chain ID: 146)
  - Abstract (Chain ID: 2741)
  - Soneium (Chain ID: 1868)
  - B3 (Chain ID: 8333)
  - Mantle (Chain ID: 5000)
  - World Chain (Chain ID: 480)
  - Swell Chain (Chain ID: 1923)
  - Celo (Chain ID: 42220)
  - Plasma (Chain ID: 9745)
  - Bob (Chain ID: 60808)
  - Ronin (Chain ID: 2020)
  - Plume (Chain ID: 98866)
  - zkSync Era (Chain ID: 324)
  - Gnosis (Chain ID: 100)

## 0.36.0

### Minor Changes

- Fix address comparison to safely lowercase addresses, preventing case-sensitivity issues in token address matching (#105)

## 0.35.0

### Minor Changes

- Add compatibility support for Sanko and Gravity chains, including test coverage for chain-specific functionality (#104)

## 0.34.0

### Minor Changes

- Expose `getTargetAddress` function for AMM fallback routing support (#103)
- Add support for fallback quote mechanism when primary aggregators fail (#100)

## 0.33.0

### Minor Changes

- Implement fallback quote system for improved swap reliability using Uniswap SwapRouter02 as fallback when aggregators are unavailable (#100)
- Add direct SwapRouter02 integration for executing swaps when 0x/1inch aggregators fail
- Add comprehensive linter and test suite for SDK
- Use raw transaction data for fallback transactions instead of contract interaction helpers

## 0.32.0

### Minor Changes

- Add support for Unichain network (Chain ID: 130) with Rainbow Router contract address (#99)

## 0.31.0

### Minor Changes

- Add ability to pass abort signal to quote fetchers for request cancellation (#97)

## 0.30.1

### Patch Changes

- Add `getWrappedAssetAddress` helper function to retrieve wrapped native asset addresses for each chain (#94)

## 0.30.0

### Minor Changes

- Remove hardcoded wrapped asset addresses and use dynamic lookup from network configurations (#92)

## 0.29.0

### Minor Changes

- Add `configureSDK` function with options parameter to allow SDK configuration (#90)

## 0.28.0

### Minor Changes

- Remove unused code and provider guardrails that were causing compatibility issues with newer provider implementations (#88)

## 0.27.0

### Minor Changes

- Add support for Sanko network (Chain ID: 1996) (#87)

## 0.26.0

### Minor Changes

- Expose `tradeFeeAmountUSD` field in Quote response to show fee amount in USD (#85)

## 0.25.0

### Minor Changes

- Remove `as Quote` type cast that was suppressing TypeScript lint errors (#83)
- Remove unnecessary `shouldOverride` field from Quote interface (#82)

## 0.24.0

### Minor Changes

- Fix wrap and unwrap functionality for native asset conversions (#81)

## 0.23.0

### Minor Changes

- Introduce new dedicated types for buy/sell/fee assets: `TokenAsset` interface with comprehensive token metadata including price, decimals, and multi-network support (#79)

## 0.22.0

### Minor Changes

- Expose `buyAmountDisplayMinimum` field in Quote to show minimum expected output amount accounting for slippage (#77)

## 0.21.0

### Minor Changes

- Expose `relay source` information on crosschain swap quotes to identify the bridge/relay provider used (#76)

## 0.20.0

### Minor Changes

- Expose additional parameters in quote responses for better transparency (#74)
- Add Crosschain Swaps V3 support with improved routing and gas estimation (#71)

## 0.19.0

### Minor Changes

- Add DEX source attribution from 0x and 1inch aggregator APIs
- Categorize and standardize naming for swap sources including:
  - Uniswap, Uniswap V2, Uniswap V3
  - Balancer, Balancer V2
  - Curve
  - PancakeSwap, PancakeSwap Stable
  - DODO, DODO V2
  - QuickSwap, QuickSwap V3
  - Aave V2, Aave V3
  - SushiSwap
  - TraderJoe
  - Synapse
  - Mooniswap

## 0.18.0

### Minor Changes

- Add missing fields `allowanceTarget` and `allowanceNeeded` for wrapping/unwrapping native assets (#69)

## 0.17.0

### Minor Changes

- Add slippage configuration endpoint to validate and calculate optimal slippage values (#67)

## 0.16.0

### Minor Changes

- Add `buyAmountMinusFees` field to Quote type to show output amount after all fees deducted (#65)

## 0.15.0

### Minor Changes

- Add support for Degen Chain network (Chain ID: 666666666) (#63)

## 0.14.0

### Minor Changes

- Version bump for internal improvements

## 0.13.0

### Minor Changes

- Add version check to prevent older Rainbow Extension and mobile app versions from executing swaps on Zora network due to compatibility issues (#61)

## 0.12.0

### Minor Changes

- Fix Blast network WETH contract address for proper wrapped ETH handling (#57)
- Add support for different destination receiver addresses in swaps (#59)

## 0.11.0

### Minor Changes

- Add support for specifying different recipient addresses for swap outputs, enabling swaps to addresses other than the sender (#59)

## 0.10.0

### Minor Changes

- Add support for Blast network (Chain ID: 81457) including native swap and bridge functionality (#55)

## 0.9.1

### Patch Changes

- Add support for Avalanche network (Chain ID: 43114) (#53)

## 0.9.0

### Minor Changes

- Internal version bump

## 0.8.0

### Minor Changes

- Remove `ethereumjs-util` dependency to reduce bundle size and eliminate circular dependencies (#51)

## 0.7.0

### Minor Changes

- Upgrade `eth-sig-util` to v7.0.0 and remove circular dependency issues (#49)

## 0.6.0

### Minor Changes

- Add analytics tracking fields to quotes (#47)
- Add `rewards` field for promotional token rewards
- Add `tradeAmountUSD` field to show total trade value in USD

## 0.5.0

### Minor Changes

- Upgrade to Socket v2 API for crosschain swaps (#45)
- Add wrapping behavior support for Zora and Base networks
- Update Socket contract addresses to v2 deployment
- Add BSC native asset wrapping support

## 0.4.2

### Patch Changes

- Add `sellAmountDisplay`, `buyAmountDisplay`, and `feeInEth` fields to Quote interface for improved display formatting (#41)

## 0.4.1

### Patch Changes

- Introduced `sellAmountDisplay`, `buyAmountDisplay` and `feeInEth` (#39)

## 0.4.0

### Minor Changes

- Update Socket crosschain contract addresses for improved routing (#36)

## 0.3.1

### Patch Changes

- Update Quote type interface with additional metadata fields (#33)

## 0.3.0

### Minor Changes

- Upgrade ethers.js to v5.7.0 to match Rainbow mobile app dependencies (#29)
- Fix: Exclude immutable-states to prevent Rari failures (#31)
- Security: Update qs from 6.5.2 to 6.5.3 (#24)
- Security: Update json5 from 1.0.1 to 1.0.2 (#26)

## 0.2.0

### Minor Changes

- Change from using Wallet to Signer interface for better flexibility with different signing methods (#19)
- Security: Update decode-uri-component from 0.2.0 to 0.2.2 (#20)
- Security: Update minimatch from 3.0.4 to 3.1.2 (#17)
- Security: Update loader-utils from 1.4.0 to 1.4.2 (#18)

## 0.1.17

### Patch Changes

- Update API base URL to v1 (#14)

## 0.1.16

### Patch Changes

- Add minimum refuel amount value in crosschain quote response from socket (#13)

## 0.1.15

### Patch Changes

- Add crosschain swap support using Socket API integration (#12)

## 0.1.14

### Patch Changes

- Initial release of Rainbow Swap Aggregator SDK
