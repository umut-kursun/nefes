# Plugins

The SDK exposes a registry for optional extensions. The default registry is empty for most kinds; apps register plugins without changing core parser code.

## Plugin kinds

| Kind | Interface | Purpose |
|------|-----------|---------|
| `merchant` | `MerchantPlugin` | Merchant layout profiles |
| `country` | `CountryPlugin` | Locale defaults |
| `ocrProvider` | `OcrProviderPlugin` | Custom OCR backends |
| `currency` | `CurrencyPlugin` | Currency symbols/codes |
| `normalization` | `NormalizationPlugin` | Text normalization hooks |
| `validation` | `ValidationPlugin` | Post-validation extensions |
| `export` | `ExportPlugin` | Custom export formats |

## Register a plugin

```typescript
import { PluginRegistry } from "@/lib/receipt-engine-sdk";

PluginRegistry.register("currency", {
  id: "try",
  name: "Turkish Lira",
  currencyCode: "TRY",
  symbol: "₺",
});
```

## Merchant profiles

Use `SdkEngineConfig.merchantProfiles` (from `receipt-engine-quality`) for confidence boosts:

```typescript
import { createMerchantProfileRegistry } from "@/lib/receipt-engine-quality";

const config = resolveSdkConfig({
  merchantProfiles: createMerchantProfileRegistry([/* profiles */]),
});
```

Profiles never bypass validators — they only adjust confidence scoring at the SDK layer.
