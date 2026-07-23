# NEFES — Software Requirements Specification & Product Requirements Document

| Field | Value |
| --- | --- |
| **Product** | NEFES |
| **Subtitle** | Understand your habits. |
| **Document type** | Combined SRS + PRD |
| **Version** | **1.3.0** |
| **Status** | **ACTIVE** — Capture-first logging + portable application actions |
| **Platform (V1)** | **Flutter Web** · **Chrome (Windows)** · **installable PWA on Android Chrome** |
| **Architecture** | Feature-first Clean Architecture · MVVM · Repository · Event-sourced · Offline-first PWA |
| **Classification** | Commercial product design |
| **Audience** | Product, Engineering, Design, QA, Legal/Privacy |

---

## Document control

| Version | Date | Author | Notes |
| --- | --- | --- | --- |
| 1.0 | 2026-07-13 | Principal Software Architect | Initial design for approval |
| 1.1 | 2026-07-13 | Principal Software Architect | Locked D1–D20; AI/event-sourcing/design-system |
| **1.2** | **2026-07-22** | **Principal Software Architect** | **Web-first PWA strategy; replace Drift/SQLite V1 mandate; Chrome-only toolchain; redefine Milestone 1** |
| **1.2.1** | **2026-07-22** | **Principal Software Architect** | **Stakeholder approval: OD-1…OD-6 locked; D8/D9/D15/D18 + D21–D27 re-approved; M1 implementation authorized** |
| **1.3.0** | **2026-07-23** | **Principal Software Architect** | **Capture-first logging; optional triggers; retroactive log; event correction; delay durations; SmokingHabitActions; widget contract docs** |

**Delivery note:** Flutter Web/PWA is the V1 delivery platform, **not** a permanent architectural constraint. Core domain and application logic must remain portable to Flutter Android/iOS. See `docs/CAPTURE_FIRST_AND_ACTIONS.md` and `docs/ANDROID_WIDGET_ARCHITECTURE.md`.

### Locked product decisions (v1.3)

| ID | Decision | Locked choice |
| --- | --- | --- |
| **D28** | Logging friction | **Capture first** — cigarette persists on primary tap; no mandatory trigger modal |
| **D29** | Trigger/context | Optional enrichment; missing context is valid; omit empty labels in UI |
| **D30** | Application actions | Platform-agnostic `SmokingHabitActions` for UI + future widget/notification entry points |
| **D31** | Android widget | Documented contract only; **not implemented** in V1 |
| **D32** | Telemetry | `ProductTelemetryPort` no-op; no external analytics SDK |

---

# Locked & Revised Decisions

## Still binding (unchanged intent)

| ID | Decision | Locked choice |
| --- | --- | --- |
| **D1** | Logical schema | Smoking event store first (`smoking_logs` / equivalent store); multi-habit later |
| **D2** | Streak | Reduction streak (smoke count ≤ daily target); exceed today → 0 |
| **D3** | Week window | Rolling last 7 local days |
| **D4** | First / Last cigarette | Today only (local day) |
| **D5** | Navigation | Home hub + push routes |
| **D6** | Post-log feedback | Haptic **via `HapticPort`** (noop on web if unavailable) + optional snackbar; **never** confirmation dialog |
| **D7** | Primary keys | UUID |
| **D10** | Architecture shape | Feature-first: `presentation/`, `viewmodel/`, `domain/`, `repository/`, `data/` — no exceptions |
| **D11** | Local AI readiness | Rich temporal fields + extensible `payload_json` from day one |
| **D12** | Event sourcing | Immutable append-only events; never overwrite historical smoking events |
| **D13** | Statistics | Dedicated `StatisticsService`; no UI calculation |
| **D14** | Time handling | Store **UTC**; store timezone context; **display local** |
| **D16** | DI | Riverpod only; no singleton globals |
| **D17** | Design system | Reusable spacing, typography, colors, buttons, cards, animations |
| **D19** | Export readiness | `ExportPort` for CSV / JSON / PDF later |
| **D20** | AI Coach readiness | Conversation architecture without major refactor |

## Revised / superseded

| ID | Was (v1.1) | Now (v1.2) |
| --- | --- | --- |
| **D8** | Android minSdk 24 (V1) | **Deferred to future native Android target.** V1 has **no Android SDK / Android Studio requirement**. When native Android is added later, minSdk **24** remains the planned floor. |
| **D9** | Drift SQLite mandatory; SharedPreferences for settings | **Sembast + sembast_web** for all smoking events and domain data (OD-1). **`shared_preferences` only for simple app settings** (OD-2). Domain/presentation must not know the engine. |
| **D15** | No Drift in UI | **No persistence SDK** (Sembast/IndexedDB/SQLite/etc.) in `presentation/` or `viewmodel/` or `domain/`. Only `data/` may import the concrete DB. |
| **D18** | Offline 100% (native assumption) | **Offline-first PWA:** after first successful load/install, core features work **without network**. PWA caching + local persistence required. |

## New decisions (v1.2) — **LOCKED**

| ID | Decision | Locked choice |
| --- | --- | --- |
| **D21** | Platform strategy | **Web-first.** V1 = Flutter Web + Chrome. Installable **PWA on Android Chrome**. Native Android/iOS later **without rewriting domain/business logic**. |
| **D22** | V1 persistence engine | **Sembast + sembast_web (IndexedDB)** (OD-1). |
| **D23** | Toolchain constraint | **No Android SDK / Android Studio** in V1. Dev/test = Flutter Web + Chrome only. |
| **D24** | Schema/migrations | Versioned local schema + migration functions from day one. |
| **D25** | Local source of truth | V1 has **no backend/accounts**. Local store is SoT. |
| **D26** | Platform services | Haptics/notifications/etc. behind ports; web noop/stub in V1. |
| **D27** | First milestone | **M1** — Home + I Smoked + persist + today’s count/history + refresh/restart survival + basic PWA manifest (OD-4, OD-6). |

## Open decisions (v1.2) — **LOCKED (OD-1…OD-6)**

| ID | Decision | Locked choice |
| --- | --- | --- |
| **OD-1** | Concrete V1 DB | **Sembast + sembast_web** |
| **OD-2** | Settings vs events | **`shared_preferences` for simple settings only**; all smoking events/domain data in **Sembast** |
| **OD-3** | Browser eviction | **Accepted for V1**; architecture ready for future export/backup/sync |
| **OD-4** | M1 scope | Home, I Smoked, timestamp, local persist, today count, today history, refresh/restart survival — **no** Resist/streaks/stats/AI/auth/sync |
| **OD-5** | Web renderer | Flutter **stable default** web renderer |
| **OD-6** | PWA in M1 | Basic **manifest + installability foundation** in M1; full Android Chrome install QA later |

---

# 1. Product Vision

## 1.1 Vision statement

NEFES is an **AI-powered habit intelligence platform** that helps people understand, interrupt, and reshape compulsive habits — starting with cigarette smoking — through one-touch logging, honest analytics, and (later) predictive coaching.

NEFES is **not** a cigarette counter. Counting is the input. Insight is the product.

## 1.2 Mission

Make habit change feel like breathing: immediate, private, and grounded in the user's own data — not shame, lectures, or gamified guilt.

## 1.3 Positioning

| Dimension | Position |
| --- | --- |
| Category | Habit intelligence / digital health companion |
| Primary job-to-be-done | “Help me see my smoking patterns so I can change them.” |
| Differentiator | Instant one-touch capture + deep local analytics + future AI that predicts *when* risk rises |
| Tone | Calm, adult, clinical-minimal — never preachy |
| Trust model | Local-first, privacy-first, optional cloud later |
| Delivery (V1) | **Installable PWA** (Chrome) — phone-like without native store dependency |

## 1.4 Long-term north star (1M users)

- Cigarette / nicotine module (V1 web PWA)
- Native Android & iOS apps sharing the same domain layer
- Additional habits, AI Coach, sync, Wear OS / Apple Watch
- Optional cloud backup and premium intelligence

## 1.5 Success metrics (product)

| Horizon | Metric | Target (indicative) |
| --- | --- | --- |
| Activation | First “I Smoked” within 60 seconds | ≥ 80% |
| Persistence trust | Event still present after browser restart | 100% of successful writes |
| Offline use | Core loop after first load without network | Required |
| PWA | Installable on Android Chrome | Required for V1 exit |
| Trust | Crash-free primary paths | ≥ 99.5% |

---

# 2. User Personas

## 2.1 Primary — Alex, “The Quiet Quitter”

| Attribute | Detail |
| --- | --- |
| Age | 28–42 |
| Context | Smokes 10–30/day; wants to reduce |
| Pain | Apps that nag or require journals |
| Goal | See truth in numbers; reduce over weeks |
| Behavior | One-tap only; abandons friction |
| Device (V1) | **Android phone via Chrome PWA** and/or desktop Chrome |

## 2.2 Secondary — Sam, “The Data Rationalist”

Analyst mindset; trusts stats; cares about export/backup later.

## 2.3 Secondary — Jordan, “The Relapse Planner”

Uses History + future AI triggers; will use “I Resisted” after M1.

## 2.4 Anti-personas (V1)

- Users requiring native Play Store APK in V1
- Users requiring iOS Safari as a supported V1 target (later)
- Multi-user / clinical device compliance

---

# 3. Functional Requirements

## 3.1 Habit event capture

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Single-tap “I Smoked” logs an event | M |
| FR-02 | No confirmation dialog / blocking popup | M |
| FR-03 | Event stores UTC instant + local calendar fields + timezone context + AI `payload` | M |
| FR-04 | Real device/browser clock; persist UTC; derive local fields at write | M |
| FR-05 | “I Resisted” (post-M1 / full V1) | S for M1 · M for full V1 |
| FR-06 | Resist events distinct immutable types | M (when implemented) |
| FR-07 | Capture works offline after first load | M |
| FR-08 | Feedback via `HapticPort` + optional snackbar (D6) | M |
| FR-09 | Append-only; never overwrite historical smoking events (D12) | M |
| FR-09a | Corrections/deletions (future) via compensating events / tombstones — audit preserved | C (design now, UI later) |

## 3.2 Home (Milestone 1 focus)

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-10 | Today’s cigarette count | M (M1) |
| FR-11 | Daily target (default 30) — may be read-only default in M1 | S for M1 · M for full V1 |
| FR-12 | Reduction streak | S for M1 · M for full V1 |
| FR-13 | Primary action: I Smoked | M (M1) |
| FR-14 | Nav to History / Statistics / Settings | S for M1 · M for full V1 |
| FR-15 | Count updates immediately after log | M (M1) |
| FR-16 | Home shows **today’s event history** (times) | M (M1) |

## 3.3 History / Statistics / Settings

Full V1 retains grouped History (Today/Yesterday/Older), StatisticsService metrics, Settings (target, theme, Backup/AI placeholders). **M1** only requires today’s history on Home (or minimal History slice).

## 3.4 Platform / PWA

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-50 | App name NEFES; subtitle “Understand your habits.” | M |
| FR-52 | Material 3 + design system | M |
| FR-54 | No login in V1 | M |
| FR-55 | Core features offline after first successful load (D18/D21) | M |
| FR-56 | Localization-ready EN strings | M |
| FR-58 | Runs in **Chrome on Windows** | M (M1) |
| FR-59 | Installable as **PWA on Android Chrome** (manifest + service worker / Flutter PWA support) | M (V1; may follow M1) |
| FR-60 | No build/test path requires Android SDK (D23) | M |
| FR-61 | Persistence survives **page refresh** and **browser restart** | M (M1) |

## 3.5 Explicit non-requirements (V1)

| ID | Non-requirement |
| --- | --- |
| NR-01 | No OpenAI / remote AI |
| NR-02 | No push notifications (port stub only) |
| NR-03 | No location capture UI |
| NR-04 | No cloud sync / accounts |
| NR-05 | No Wear OS / watch |
| NR-06 | No native Android/iOS app builds in V1 |
| NR-07 | No Android Studio / Android SDK usage |
| NR-08 | No Drift/SQLite **as V1 mandatory engine** |
| NR-09 | Safari / Firefox not required for V1 certification (Chrome only) |

---

# 4. Non-Functional Requirements

| ID | Category | Requirement | Target |
| --- | --- | --- | --- |
| NFR-01 | Performance | “I Smoked” persist + UI update | ≤ 100 ms perceived (desktop Chrome) |
| NFR-02 | Performance | First interactive Home after cache warm | ≤ 2.5 s typical |
| NFR-03 | Reliability | Successful write durable in IndexedDB across refresh/restart | Critical |
| NFR-04 | Availability | Core loop offline after first load | 100% |
| NFR-05 | Scalability | ≥ 50,000 events usable | Stats & lists remain responsive |
| NFR-06 | Maintainability | Feature-first (D10); portable domain | Enforced |
| NFR-07 | Testability | StatisticsService / EventFactory unit-testable in VM | Required |
| NFR-08 | Accessibility | 48 dp targets; semantics | Required |
| NFR-09 | Security | Origin-isolated browser storage; no secrets in V1 | Web defaults |
| NFR-10 | Privacy | No third-party analytics in V1 | None |
| NFR-11 | Portability | Domain free of web/html/js and of concrete DB packages | Critical |
| NFR-12 | Toolchain | Flutter Web + Chrome only for V1 | D23 |
| NFR-13 | i18n | Externalized strings | EN |
| NFR-15 | Architecture | Persistence only in `data/` | D15 |
| NFR-16 | DI | No global service singletons | D16 |
| NFR-17 | PWA | Installability + offline asset caching | V1 |

---

# 5. User Stories

1. As Alex, I tap **I Smoked** once and the event is saved with the exact timestamp.
2. As Alex, I see **today’s count** update immediately.
3. As Alex, I see **today’s times** listed on Home.
4. As Alex, I refresh Chrome (or reopen later) and my events are still there.
5. As Alex, I use the app on my phone as an installed PWA without Play Store (V1).
6. As Alex, after the app has loaded once, I can log offline.

**M1 acceptance (critical path)**

- Given Chrome on Windows with the app loaded  
- When I tap I Smoked  
- Then an immutable event is stored (UTC + timezone context)  
- And today’s count increments  
- And today’s history shows the local time  
- And after F5 / full browser restart, data remains  

---

# 6. App Navigation

- GoRouter; **Home hub** (D5)
- M1: Home sufficient; stub routes optional
- Full V1 routes: `/`, `/history`, `/statistics`, `/settings`, `/settings/backup`, `/settings/ai`
- Future: `/coach`, `/export`, `/sync`, `/paywall`

---

# 7. Screen-by-Screen UX

## 7.1 Principles

One-tap capture; calm Material 3; design-system tokens; no smoke confirmation dialogs.

## 7.2 Home (M1)

1. Brand: **NEFES** + “Understand your habits.”
2. Today’s count (and target when available)
3. Large **I Smoked** button
4. **Today’s event history** (local HH:mm list)
5. Subtle haptic-port + optional snackbar

Full V1 adds: streak, I Resisted, links to History / Statistics / Settings.

## 7.3–7.6

History (grouped), Statistics (StatisticsService only), Settings, placeholders — as in v1.1, deferred past M1 where noted.

---

# 8. Information Architecture

```
NEFES (Flutter Web PWA)
├── Immutable Event Stream (local SoT)
│   ├── SmokeEvent
│   ├── ResistEvent (full V1)
│   └── Compensating events (future deletes)
├── Settings projection (local)
├── Derived read models (count, streak, StatisticsSnapshot)
└── Platform shell
    ├── PWA (manifest, service worker / Flutter caching)
    ├── Design system + theme
    └── Platform ports (haptics, notifications, …)
```

Streak / content inventory rules unchanged from v1.1 (D2).

---

# 9. Persistence Architecture (Web-First)

## 9.1 Principles (D9, D12, D14, D22, D24, D25)

- **Repository abstracts persistence completely**
- Domain & presentation **do not** know Sembast / IndexedDB / SQLite
- **Append-only** smoking events; no in-place overwrite of historical facts
- **UTC** storage + timezone context for local reconstruction
- **Schema versioning + migrations** from first open
- Local data = **source of truth** in V1
- Concrete engine **replaceable** for native (e.g. later Drift/SQLite) without domain rewrite

## 9.2 Recommended V1 technology: **Sembast** (`sembast` + `sembast_web`)

| Criterion | Why Sembast |
| --- | --- |
| Flutter Web maturity | Official web path uses **IndexedDB** via `sembast_web` |
| Structured logs | Records, stores, filters, sorts, transactions |
| Offline PWA | IndexedDB persists across refresh/restart (same origin) |
| Migrations | `databaseFactory.openDatabase(..., version:, onVersionChanged:)` |
| Abstraction fit | Easy to wrap in `SmokingLocalDataSource`; swap impl later |
| Toolchain | **No WASM/SQLite binary**, no Android SDK |
| Portability | Native later: keep repositories; implement `data/` with IO Sembast **or** SQL (Drift) |

### Alternatives considered (not recommended for V1)

| Option | Why not primary |
| --- | --- |
| **Drift + sqlite3.wasm** | Powerful SQL & native convergence, but heavier wasm load, more ops complexity; Drift is **explicitly not mandatory** for V1 |
| **Hive** | Fast KV; weaker query/migration story for analytics-shaped event logs |
| **raw IndexedDB / `idb`** | Too low-level; more boilerplate; easier to leak into domain |
| **localStorage** | Unsuitable for structured multi-thousand event history |
| **shared_preferences alone** | Settings only — not for event log |

## 9.3 Logical event record (AI-ready)

Logical document/record fields (store name e.g. `smoking_logs`):

| Field | Notes |
| --- | --- |
| `id` | UUID |
| `createdAtUtc` | Epoch ms UTC — SoT instant |
| `localDay` / `localMonth` / `localYear` | Local projection at write |
| `localHour` / `localMinute` / `localWeekday` | Local projection |
| `timezone` | IANA or equivalent string when available |
| `utcOffsetMinutes` | Offset at event time (DST-safe reconstruction aid) |
| `eventType` | `smoke` \| `resist` \| future compensating types |
| `parentEventId` | For tombstones / children |
| `source` | `manual` \| `wear` \| `import` \| `system` |
| `clientId` | Idempotency / future sync |
| `syncStatus` | `local` \| `pending` \| `synced` \| `conflict` |
| `schemaVersion` | Payload/record version |
| `payloadJson` | AI-ready extensible JSON |
| `insertedAtUtc` | Insert wall time |

**Forbidden:** updating temporal facts or `eventType` on an existing smoke/resist row to “fix” history.

## 9.4 Compensating actions (auditability)

Future delete/correct:

- Append `smoke_deleted` (or similar) with `parentEventId`
- Read models / StatisticsService ignore soft-deleted parents
- Raw history remains reconstructable for audit/AI

## 9.5 Settings

| Key | Allowed store |
| --- | --- |
| `daily_target` | `shared_preferences` **or** Sembast settings store (OD-2) |
| `theme_mode` | same |
| feature flags | same |

Event history **never** in `shared_preferences`.

## 9.6 Schema versioning

- Single DB name e.g. `nefes.db` (Sembast)
- Integer `schemaVersion` starting at `1`
- `onVersionChanged`: ordered migrations `1→2→…`
- Record-level `schemaVersion` inside payloads for AI field evolution
- Migration tests required when versions > 1 exist

## 9.7 Future native persistence

```
SmokingRepository (domain contract)
        ↑
SmokingRepositoryImpl
        ↑
SmokingLocalDataSource  ← interface
        ↑
   ┌────┴────┐
SembastWeb   Future: DriftSqliteNative / SembastIo
(data/web)   (data/native)
```

Conditional imports or DI overrides select implementation; **domain unchanged**.

---

# 10. Domain Model

Unchanged entities in spirit: `SmokingLogEvent`, `DailyTarget`, `ThemePreference`, `HomeSnapshot`, `StatisticsSnapshot`, `HistoryDayGroup`.

### Domain services (injectable)

- **`StatisticsService`** (D13)
- `StreakCalculator`, `HistoryGrouper`, `EventFactory`
- Ports: `ExportPort`, `AiCoachPort`, `HapticPort`, `NotificationPort`, `AnalyticsPort`, `SyncPort` (stubs)

### Invariants

1. Events immutable (D12)
2. UTC + timezone context (D14)
3. Stats invent nothing
4. No persistence types in domain

---

# 11. Folder Structure (D10)

```
lib/
  main.dart
  app.dart

  core/
    design_system/
    di/
    l10n/
    time/                 # UTC ↔ local helpers (pure)
    errors/
    ports/                # HapticPort, NotificationPort, SyncPort, …

  database/               # optional: open helpers — OR keep under features/*/data
    # MUST NOT be imported by presentation/viewmodel/domain

  routing/
  theme/
  services/               # thin wrappers around ports if needed

  features/
    smoking/
      presentation/
      viewmodel/
      domain/
      repository/         # contracts only
      data/               # Sembast datasources, mappers, repository impls
    ai_coach/ … (stubs with same five folders)
    export/ …
    notifications/ …
    sync/ …
```

**Hard rule:** no `sembast`, `indexed_db`, `shared_preferences` imports outside `data/` (and DI wiring that constructs datasources).

---

# 12. Clean Architecture

```
presentation → viewmodel → domain ← repository (contracts)
                                ↑
                         data (Sembast impl)
                                ↑
                         IndexedDB (browser)
```

- Domain: zero Flutter UI, zero DB packages, zero `dart:html` / web plugins
- ViewModels call use cases / services only

---

# 13. MVVM

Same screen → View / ViewModel / Freezed UI state mapping as v1.1.  
M1 implements Home View + ViewModel first.

---

# 14. Repository Pattern

```
abstract class SmokingRepository {
  Future<void> append(SmokingLogEvent event);
  Stream<List<SmokingLogEvent>> watchEvents();
  Future<List<SmokingLogEvent>> getEventsBetweenUtc(DateTime from, DateTime to);
}

abstract class SettingsRepository { /* target, theme */ }

/// Future-facing (stub V1)
abstract class SyncPort {
  Future<void> pushPending();
  Future<void> pullRemote();
}
```

UI never calls Sembast. Sync later decorates/outboxes without changing append-first local writes.

---

# 15. Dependency Injection (D16)

Riverpod provider graph:

```
localDatabaseProvider → smokingLocalDataSourceProvider
  → smokingRepositoryProvider → useCases → viewModels

hapticPortProvider → WebNoopHaptic / future NativeHaptic
syncPortProvider → NoopSyncPort
```

No singleton globals.

---

# 16. State Management

Riverpod + Freezed + repository streams.

**I Smoked path**

```
Tap → HomeViewModel.logSmoke()
   → LogSmoke / EventFactory (UTC + tz context + payload)
   → SmokingRepository.append
   → Sembast insert (data/)
   → stream emit → today count + today history
   → HapticPort + optional snackbar
```

---

# 17. Error Handling

Typed failures; ViewModel non-blocking errors; no empty catches. Failed persist → snackbar + retry; success path never uses a confirmation dialog.

---

# 18. Offline-First PWA Strategy (D18, D21)

## 18.1 Runtime modes

| Mode | Expectation |
| --- | --- |
| First visit online | Load app shell; cache assets (Flutter PWA / service worker) |
| Subsequent offline | Shell from cache; all CRUD against IndexedDB |
| Never loaded before + offline | Cannot start (acceptable) |

## 18.2 Core offline capabilities

- Create smoking events  
- Read today’s count & history  
- Full History / Statistics / Settings (full V1)  
- Theme/target persistence  

## 18.3 PWA packaging

- Web app manifest (name **NEFES**, icons, `display: standalone` / suitable mode)
- Service worker / Flutter’s recommended web renderer + offline caching approach for current stable Flutter
- Android Chrome: Add to Home Screen / Install
- Document install steps in README (no Play Store)

## 18.4 Storage caveats (product honesty)

Browser may evict storage under extreme quota pressure or user “clear site data”. V1 accepts origin storage risk; future export/sync mitigate. (OD-3)

---

# 19. Backup & Export (D19)

Unchanged: `ExportPort` + CSV/JSON/PDF formatters later; V1 placeholder UI.

---

# 20. Future AI Architecture (D20)

Unchanged intent: `features/ai_coach/` five-folder module; `payloadJson`; noop `AiCoachPort`; conversations later without schema redesign.

---

# 21. Future Notification Architecture

`NotificationPort` + `features/notifications/` stubs. Web may later use Web Push; native uses FCM/local notifications — **behind the port**.

---

# 22. Future Cloud Sync & Auth (D25)

- No backend in V1  
- `syncStatus` / `clientId` on events  
- `SyncPort` noop  
- Local append always first  
- Auth/identity bounded context later  

---

# 23. Security Considerations

| Topic | V1 (Web) | Future native |
| --- | --- | --- |
| Isolation | Browser origin sandbox | OS app sandbox |
| Storage | IndexedDB | SQLite/SQLCipher optional |
| Secrets | None | Secure storage for tokens |
| XSS | Flutter web standard hygiene | — |

---

# 24. Privacy Considerations

No accounts; no third-party analytics in V1; smoking history is sensitive behavioral data in browser storage; future AI/sync require opt-in.

---

# 25. Analytics Design

`AnalyticsPort` noop in V1.

---

# 26. Extensibility & Native Portability (D21, D26)

| Concern | Rule |
| --- | --- |
| Domain logic | Pure Dart; no web/native plugins |
| Persistence | `SmokingLocalDataSource` interface |
| Haptics | `HapticPort` (web noop / vibration stub) |
| Notifications | `NotificationPort` |
| Background | `BackgroundWorkPort` (future) |
| Rendering | Flutter multi-platform UI |

Adding Android/iOS later = new runners + native `data/`/port impls + (optional) Play/App Store packaging — **not** a domain rewrite.

---

# 27. Technical Roadmap

## Phase 0 — Design re-approval (current)

- Approve SRS/PRD **v1.2** + Appendix A open decisions

## Phase 1 — Web PWA MVP

- Flutter Web project; architecture; Sembast; M1 → full V1 screens; PWA installability

## Phase 2 — Hardening

- Migrations tests, large-N perf, export JSON/CSV, a11y, storage quota messaging

## Phase 3 — Intelligence

- On-device features, notifications (web/native ports)

## Phase 4 — AI Coach

## Phase 5 — Native Android/iOS + optional Drift/SQLite data impl + sync

## Phase 6 — Premium / wear / multi-habit

---

# 28. Sprint / Milestone Planning

## Sprint 0 — Design lock — **DONE (v1.1)**; **v1.2 re-approval REQUIRED**

## Milestone M1 — Web foundation + “I Smoked” — **FIRST IMPLEMENTATION AFTER APPROVAL**

**Toolchain:** Flutter Web + Chrome only (D23). **No Android SDK.**

Deliverables:

1. Create/run Flutter **Web** project  
2. Establish approved feature-first architecture + DI + routing shell  
3. Implement local persistence (Sembast web) + schema v1 + migration hook  
4. Home screen (brand + count + CTA + today’s history)  
5. Primary **I Smoked** action — one tap, no dialog  
6. Record exact timestamp (UTC + timezone context)  
7. Persist event locally  
8. Display today’s cigarette count  
9. Display today’s event history (local times)  
10. Verify survival across **page refresh** and **browser restart**  
11. Verify app runs in **Chrome (Windows)**  

**Explicitly out of M1:** Statistics page, full History grouping, Settings UI, PWA install polish (may start), Resist button, native builds, cloud.

## Sprint / Milestone M2 — Full Home + History + streak + Resist

## M3 — StatisticsService + Statistics screen

## M4 — Settings, theme, placeholders, PWA install verification on Android Chrome

## M5 — QA, offline checks, documentation

---

# 29. MVP Definition

## 29.1 V1 in scope (after M1–M4)

- Flutter **Web** NEFES PWA  
- Chrome Windows + Android Chrome installable PWA  
- Offline core after first load  
- Sembast (or approved OD-1 alternative) behind repositories  
- Immutable UTC events; AI-ready payload  
- Home, History, Statistics (StatisticsService), Settings  
- Design system; ports for haptic/sync/AI/export/notify  
- **No** Android SDK in the development path  

## 29.2 Out of scope (V1)

Native APK/IPA builds, Android Studio, Drift-as-mandatory, accounts, cloud, live AI, ads

## 29.3 Exit criteria

1. App runs in Chrome (Windows)  
2. M1 persistence tests pass (refresh + restart)  
3. Installable PWA on Android Chrome  
4. Airplane mode / offline works after first load  
5. Architecture review: no DB types in domain/UI; D21–D27 honored  

## 29.4 Definition of Done

- Five feature folders present  
- No hardcoded user strings  
- No stats in UI  
- No persistence imports outside `data/`  
- Injectable ports only  

---

# 30. Future Premium Features

Unchanged commercially: AI Coach, predictions, sync, wear, multi-habit, encrypted vault, export packs — delivered via ports + future native/web capabilities.

---

# Appendix A — Decision log (LOCKED)

| ID | Status | Resolution |
| --- | --- | --- |
| OD-1 | **APPROVED** | Sembast + sembast_web |
| OD-2 | **APPROVED** | shared_preferences for settings only; events in Sembast |
| OD-3 | **APPROVED** | Browser eviction risk accepted for V1 |
| OD-4 | **APPROVED** | Strict M1 scope as listed |
| OD-5 | **APPROVED** | Flutter stable default web renderer |
| OD-6 | **APPROVED** | Basic PWA manifest in M1; Android Chrome QA later |
| D8, D9, D15, D18 | **RE-APPROVED** | As revised in v1.2 |
| D21–D27 | **APPROVED** | As locked above |

---

# Appendix B — Quality attributes traceability

| Attribute | Sections |
| --- | --- |
| Web-first PWA | §1.3, §3.4, §18, D21, D23 |
| Portable domain | §9.7, §11–12, §26 |
| Immutable history | §9.3–9.4, D12 |
| UTC + timezone | §9.3, D14 |
| Offline | §18, D18 |
| Future sync | §14, §22, D25 |
| M1 scope | §28, §5, D27 |

---

# Appendix C — Approval checklist (v1.2.1)

- [x] Platform strategy D21 accepted  
- [x] Toolchain D23 accepted  
- [x] OD-1 Sembast accepted  
- [x] D9/D15 revisions accepted  
- [x] Offline PWA D18 accepted  
- [x] D12/D14 reaffirmed  
- [x] M1 scope OD-4 / PWA OD-6 accepted  
- [x] **Implementation of Milestone M1 authorized**  

---

**End of document.**

*NEFES — Understand your habits.*

**Status:** Design **v1.2.1 APPROVED**. Milestone **M1** implementation in progress. Do **not** start M2 until requested.
