# @wasteless/receipt-engine

Standalone Receipt Engine SDK extracted from the WasteLess monorepo.

## Current consumption (monorepo)

During development, import directly from the SDK entry:

```typescript
import { analyzeReceipt } from "@/lib/receipt-engine-sdk";
```

The package manifest points `main` and `types` at `src/lib/receipt-engine-sdk/index.ts` for path-alias consumption within the monorepo.

## Future packaging

A build step will compile the SDK and its dependencies (`receipt-engine`, `receipt-engine-quality`, `receipt-engine-debug`) into a publishable bundle with zero Next.js/React dependencies.

Planned steps:
1. Add `tsup` or `tsc` build targeting `packages/receipt-engine/dist/`
2. Externalize or bundle parser dependencies
3. Publish to npm as `@wasteless/receipt-engine`

## Install (future)

```bash
npm install @wasteless/receipt-engine
```

## Benchmark

```bash
npm run benchmark:sdk   # from monorepo root
npm run benchmark       # from packages/receipt-engine
```

## Constraints

- L2–L7 parser layers are wrapped, not modified
- No WasteLess UI imports inside SDK modules
- Validators are not weakened

See `src/lib/receipt-engine-sdk/docs/` for full documentation.
