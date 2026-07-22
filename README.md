# NEFES

**Alışkanlıklarını anla.**

Sigara azaltma odaklı habit intelligence — Milestone **M2** (Flutter Web PWA).

## Prerequisites

- Flutter stable (3.44+ recommended)
- Google Chrome
- **No Android SDK / Android Studio required for V1**

## Run (Chrome) — recommended

Debug mode browser refresh is slow. Prefer release:

```bash
cd c:\Users\ukursun\Documents\nefes
flutter pub get
flutter run -d chrome --release --no-web-resources-cdn
```

Or:

```powershell
.\tool\run_chrome_fast.ps1
```

### Development (debug)

```bash
flutter run -d chrome
```

Use terminal **`R` (hot restart)** instead of browser F5 while debugging.

## M2 features

- Turkish UI
- Live “Son sigaradan beri” timer
- Daily target + minimal onboarding
- “Sigara İçtim” one-touch logging
- “Son kaydı geri al” (compensating delete / audit-safe)
- Today’s history with sequence + interval

## Analyze & test

```bash
flutter analyze
flutter test
```

## Architecture

Feature-first Clean Architecture under `lib/features/smoking/`:

- `presentation/` · `viewmodel/` · `domain/` · `repository/` · `data/`

Persistence: **Sembast + sembast_web** (events). Settings: **shared_preferences** only.

Design document: [`docs/NEFES_SRS_PRD.md`](docs/NEFES_SRS_PRD.md)
