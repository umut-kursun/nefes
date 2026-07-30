# Receipt Engine SDK Architecture

The Receipt Engine SDK wraps the existing L0–L7 parser pipeline without modifying layer internals. WasteLess is one consumer; the SDK is standalone.

## Layer diagram

```mermaid
flowchart TB
  subgraph SDK["receipt-engine-sdk"]
    API["analyzeReceipt / ReceiptEngineSDK"]
    CFG["SdkEngineConfig"]
    PLG["PluginRegistry"]
    OCR["ocrProviderRegistry"]
    EVT["ReceiptEngineEventEmitter"]
    EXP["export/*"]
    VER["versioning"]
  end

  subgraph Engine["receipt-engine (L2-L7 unchanged)"]
    L2["L2 Layout"]
    L3["L3 Graph"]
    L4["L4 Classify"]
    L5["L5 Blocks"]
    L6["L6 Purchase"]
    L7["L7 Validate"]
  end

  subgraph Quality["receipt-engine-quality"]
    DBG["buildDebugReport"]
    CONF["buildConfidenceModel"]
    BENCH["runRegressionBenchmark"]
  end

  API --> CFG
  API --> PLG
  API --> OCR
  API --> EVT
  API --> L2
  L2 --> L3 --> L4 --> L5 --> L6 --> L7
  API --> DBG
  API --> CONF
  API --> EXP
  API --> VER
  BENCH --> API
```

## Design principles

1. **Parser immutability** — L2–L7 logic is invoked, never rewritten.
2. **Orchestration at SDK boundary** — lifecycle events emit after each stage in `orchestratePipeline.ts`.
3. **Config-driven behavior** — merchant profiles, OCR provider, modes, and plugins adjust SDK behavior without parser changes.
4. **Zero UI coupling** — no imports from `@/app` or React components.

## Module map

| Module | Responsibility |
|--------|----------------|
| `analyzeReceipt.ts` | Public entry, result assembly |
| `orchestratePipeline.ts` | Stage-by-stage orchestration + events |
| `config/SdkEngineConfig.ts` | Extended engine configuration |
| `plugins/` | Optional app-specific extensions |
| `ocr/` | Provider registry + stubs |
| `export/` | JSON, CSV, Excel, Markdown, HTML, bundles |
| `events/lifecycle.ts` | Pipeline lifecycle hooks |
| `versioning/` | Version metadata on every result |
| `benchmark/` | SDK benchmark wrapper |
