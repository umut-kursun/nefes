# NEFES — Capture-first & Habit Intelligence Foundations

| Version | 1.3.0 |
| Date | 2026-07-23 |

## Capture-first philosophy

Logging a cigarette is the primary job. Context is optional enrichment.

**Flow**

1. User taps **Sigara İçtim**
2. Event is persisted immediately (`RecordSmoke` / `SmokingHabitActions.logCigarette`)
3. UI updates count, timer, limit, history
4. An optional, non-blocking “Neden?” chip strip may appear
5. User may ignore it; no Skip required; auto-dismisses
6. Selecting a trigger appends `smokeTriggerNoted` related to the smoke id

Missing trigger context is **valid data**. UI omits the label rather than showing
“Unknown” / “Belirtilmedi”.

## Retroactive logging

Secondary action **Daha önce içtim**:

- Presets: 5 / 10 / 15 / 30 minutes ago
- Custom local time (rejects future)
- Stores correct UTC + local day fields via `DateTimeContext`
- Primary button always means **now**

## Event correction (Day Detail)

Subtle sheet on a timeline smoke:

- Edit time (delete + recreate, preserve trigger)
- Add / change / clear trigger
- Delete (compensating `smokeDeleted`, confirmed)

Derived metrics recompute from the event stream.

## Delay / resist

User picks intended duration (5/10/15/30) or starts without a duration.
`delayStarted.payload.intendedDurationMs` stores the plan.
Outcomes remain factual: urge passed / smoked / cancelled.

## Platform-agnostic actions

`SmokingHabitActions` is the application façade for:

- logCigarette / updateEventContext / removeEventContext
- beginDelay / finishDelayUrgePassed / abandonDelay
- undoLatest / deleteEvent / editEventTime

Future Android widget, notification actions, and quick settings must call this
layer (see `docs/ANDROID_WIDGET_ARCHITECTURE.md`).

## Behavior patterns

`BehaviorPatternService` derives at most one calm Today insight when enough
local data exists. No AI, no medical claims, no guilt copy.

## Reduction plans (future)

Current `DailyTargetPeriod` effective-from-local-day model already supports
scheduled stepped limits (append future-dated periods). No UI yet.

## Telemetry

`ProductTelemetryPort` + `TelemetryEvents` — no-op implementation.
No data leaves the device.

## Delivery vs architecture

Flutter Web PWA is V1 delivery. Core domain/application logic must stay
portable to Flutter Android/iOS.
