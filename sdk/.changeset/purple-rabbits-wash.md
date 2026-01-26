---
"@rainbow-me/swaps": minor
---

Added quote preparation functions for batching. This exposes new functions to prepare quote transaction data without executing them:
- `prepareFillQuote`: Extracts transaction data from regular quotes without executing
- `prepareFillCrosschainQuote`: Extracts transaction data from crosschain quotes without executing
- `BatchCall` interface - Standardized format for transaction data `({ data, to, value })`
