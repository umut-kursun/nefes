# Configuration

## SdkEngineConfig

Extends `EngineConfig` from `receipt-engine`:

| Field | Default | Description |
|-------|---------|-------------|
| `language` | `"tr"` | Receipt language hint |
| `currency` | `"TRY"` | Expected currency |
| `country` | `"TR"` | Country code |
| `merchantProfiles` | empty registry | Optional merchant boosts |
| `ocrProviderId` | `"mock"` | OCR provider registry key |
| `modes.debug` | `false` | Debug trace |
| `modes.quality` | `true` | Build debug report |
| `modes.performance` | `true` | Collect timings |
| `modes.validation` | `true` | Run L7 validators |
| `confidenceThresholds.overall` | `0.5` | Overall confidence gate |
| `defaultLayoutProfileId` | `"generic-tr"` | Layout profile |

## resolveSdkConfig

```typescript
import { resolveSdkConfig } from "@/lib/receipt-engine-sdk";

const config = resolveSdkConfig({
  language: "en",
  currency: "USD",
  modes: { performance: false },
});
```

Merges with `DEFAULT_ENGINE_CONFIG` and `DEFAULT_SDK_ENGINE_CONFIG`.

## OCR providers

| ID | Status |
|----|--------|
| `mock` | Wired |
| `openai` | Wired (requires apiKey) |
| `google-vision` | Stub |
| `azure-ocr` | Stub |
| `aws-textract` | Stub |
| `tesseract` | Stub |
| `local-ocr` | Stub |

Register custom providers via `ocrProviderRegistry.register(id, provider)`.
