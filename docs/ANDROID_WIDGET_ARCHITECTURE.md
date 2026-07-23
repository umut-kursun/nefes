# NEFES — Future Android Widget Architecture

| Field | Value |
| --- | --- |
| Status | Planned — **not implemented** |
| Platform today | Flutter Web PWA (V1 delivery) |
| Future | Flutter Android/iOS + Android home-screen widget |
| Last updated | 2026-07-23 |

## Purpose

Document the contract so today's domain/application layer stays portable.
Widget code must **never** duplicate persistence or business rules.

## Product principles that apply

1. **Capture first** — widget “+ Sigara” logs immediately with no trigger UI.
2. Context enrichment stays in the main app (optional).
3. Core actions live in `SmokingHabitActions` (application layer).

## Widget information (read model)

| Field | Source |
| --- | --- |
| Active habit | `HabitType.smoking` (V1) |
| Today's count | `HomeSnapshot.todayCount` / `HomeSnapshotBuilder` |
| Daily limit | `AppSettings.dailyTarget` (+ target history for historical days) |
| Time since last event | `lastSmokeAtUtc` vs now |
| Active delay | `ActiveDelaySession` via `DelaySessionResolver` |

Refresh strategy (future):

- After any action invoked from the widget, rebuild snapshot and push to
  `HomeWidget` / Glance / AppWidget update APIs.
- Also refresh on app resume and (optionally) a short periodic worker.
- Never scan the full event log on a 1 Hz timer inside the widget process;
  reuse the same snapshot builder the app uses.

## Widget actions → application use cases

| Widget control | Application API |
| --- | --- |
| + Sigara / Log now | `SmokingHabitActions.logCigarette()` |
| Ertele / Start delay | `SmokingHabitActions.beginDelay(intendedDuration: …)` |
| Open NEFES | deep link / `nefes://today` (presentation only) |

Optional later:

| Action | API |
| --- | --- |
| Undo latest | `SmokingHabitActions.undoLatest()` |
| Urge passed | `SmokingHabitActions.finishDelayUrgePassed()` |

## Platform adapter (future)

```
Android Widget UI
    → WidgetActionBridge (platform adapter)
        → SmokingHabitActions / use cases
            → SmokingRepository / SettingsRepository
                → Sembast (or future SQLite) data layer
```

Rules:

- Adapter may translate intents / PendingIntents only.
- No SQL, no Sembast imports in widget UI code.
- Same use cases as Flutter UI and notification actions.

## Native migration note

Flutter Web/PWA is a **delivery platform**, not an architectural constraint.
Domain + application layers under `lib/features/**/domain` and repositories
must remain free of `dart:html`, browser IndexedDB APIs, and web-only UI.

When native Android lands:

1. Swap `sembast_web` factory for a mobile Sembast/path provider (or Drift)
   behind the same repository interfaces.
2. Implement a real `HapticPort` / notification port.
3. Add the widget adapter above — **without rewriting** `RecordSmoke`,
   `StartDelay`, etc.

## Out of scope now

- No Android Gradle / SDK dependency in this repo yet.
- No widget UI implementation.
- No Firebase / push infrastructure.
