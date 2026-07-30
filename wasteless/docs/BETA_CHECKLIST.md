# Beta Production Checklist

Use before each beta release candidate.

## PWA

- [ ] `manifest.json` icons and `start_url` correct
- [ ] Service worker registers and updates via Settings → Güncelle
- [ ] Offline shell loads (static assets cached)
- [ ] Add flow shows offline recovery when network unavailable

## Privacy

- [ ] `/privacy` page linked from Settings
- [ ] No third-party analytics SDK
- [ ] Product events stored in localStorage only
- [ ] Feedback queue local-only until export
- [ ] Data wipe (Settings → Tüm verileri temizle) clears IndexedDB

## Terms

- [ ] `/terms` page linked from Settings
- [ ] Beta disclaimer visible in terms stub

## Analytics (local)

- [ ] `session_start` / `session_end` on app lifecycle
- [ ] `screen_view` on navigation
- [ ] `first_receipt_saved` fires once
- [ ] `time_to_scan_start` / `time_to_parse_complete` on add flow
- [ ] `insight_viewed` on insight card tap
- [ ] `feedback_submitted` on feedback form
- [ ] Retention markers: `firstOpen`, D1, D7

## Accessibility

- [ ] Focus order sane on review form (merchant auto-focus in OCR flow)
- [ ] Error recovery actions keyboard reachable
- [ ] Empty state CTAs have visible labels
- [ ] Trust banner readable at low confidence
- [ ] Color contrast on amber/teal banners (WCAG AA spot check)

## UX / Product

- [ ] Onboarding last step: İlk fişi tara + Başla
- [ ] Empty states on history, calendar, memory, tags
- [ ] Welcome banner dismissible on `/add?welcome=1`
- [ ] Premium teaser shows Free vs Pro columns
- [ ] Feedback form + JSON export in Settings

## Quality

- [ ] `npm test` — all tests pass
- [ ] Manual smoke: scan → review → save → home
- [ ] Manual smoke: feedback submit → export JSON

## Sign-off

| Role | Name | Date |
|---|---|---|
| Product | | |
| Engineering | | |
