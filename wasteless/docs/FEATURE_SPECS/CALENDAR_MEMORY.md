# Feature Spec: Calendar Memory

**Product:** WasteLess — Personal Purchase Memory  
**Feature name:** Calendar Memory  
**Document type:** Standalone product specification  
**Status:** Spec (implementation may follow this document)  
**Related:** Master Product Guide §5 Purchase Memory — Calendar Memory  
**Non-goals for this file:** This is not a summary of the Master Guide. It is the complete operational specification for Calendar Memory as a first-class product surface.

---

## 1. Why Calendar Memory Exists

### 1.1 The memory problem

People often remember **when** something happened before they remember **what** it was called.

Real user thoughts look like:

- “I bought it last Friday.”
- “It was around Christmas.”
- “Right after payday.”
- “During the Eskişehir trip in May.”
- “Sometime last week at the shell station.”

They rarely think:

- “I need the SKU string from row 14 of my expense table.”

If WasteLess only offers merchant/product search and chronological lists, it forces users to translate temporal memory into keywords. That translation is friction. It is also where many memory apps fail.

### 1.2 Calendar as a memory door

Calendar Memory exists to turn vague temporal recollection into a browsable surface.

It is not a reporting calendar.  
It is not a budgeting month grid.  
It is not a “spending heatmap for finance analytics.”

It is a **door into purchase memory**, keyed by date — because date is often the strongest remaining fragment of the memory.

### 1.3 Why it is first-class, not optional

In WasteLess product philosophy:

- Purchases are memories, not transactions.
- Search is memory retrieval, not filtering for its own sake.
- Timeline and Calendar are complementary memory doors.

Calendar Memory must be treated as a **primary navigation method**, equal in dignity to Purchase Memory search — not a buried filter chip inside History.

### 1.4 What success feels like

A user opens Calendar Memory, taps a day they vaguely remember, and instantly recognizes:

- the merchant name
- the amount
- the products
- the emotional “yes, that was it” moment

Time-to-recognition should feel like seconds, not a scavenger hunt.

---

## 2. Product Philosophy

### 2.1 Governing question

Every Calendar Memory decision must answer:

> Does this help the user remember a purchase more easily using time as the cue?

If the answer is no, the idea does not belong in Calendar Memory.

### 2.2 Principles specific to this feature

1. **Date is a cue, not a KPI.**  
   Days are entry points into memories, not cells for maximizing metric density.

2. **Purchases remain the atom.**  
   Calendar never replaces Purchase Cards / Purchase Detail. It routes into them.

3. **Progressive disclosure.**  
   Month view is calm. Day view reveals purchases. Detail reveals products/receipt/OCR.

4. **Purchase date is truth.**  
   Calendar always uses actual purchase date (`expense.date`), never entry creation time (`createdAt`).

5. **Recognition over analysis.**  
   Prefer recognizable merchant + amount over charts inside the calendar.

6. **Consistency with the rest of WasteLess.**  
   Same Purchase Card component language. Same Back-stack rules. Same localized dates.

7. **Alive but calm.**  
   Indicators should feel gentle. No heatmap panic colors that suggest “bad spending days.”

8. **Stories, not spreadsheets.**  
   Day summaries may use natural language (“3 purchases · 2 merchants”) rather than ledger jargon.

### 2.3 Explicit non-identity

Calendar Memory must not become:

- a budget calendar
- a bill reminder calendar
- a streak / habit tracker calendar
- an accounting period closer
- a Google Calendar clone with events

Those products solve different jobs.

---

## 3. User Psychology

### 3.1 How temporal memory works in shopping

Human recall for purchases is often:

1. **Rough time window** (“last weekend”)
2. **Place or ritual** (“Shell”, “after work”)
3. **Partial product** (“the oil filter” / “that milk”)
4. **Exact amount** (sometimes)

Calendar Memory optimizes for step 1 — unlocking steps 2–4.

### 3.2 Emotional states Calendar Memory must support

| User state | Need | Calendar response |
|------------|------|-------------------|
| Vague recall | “It was in May…” | Month browse + day markers |
| Specific day recall | “Last Friday” | Jump to day / highlight today±N |
| Exploration curiosity | “What did I buy that week?” | Day list + adjacent days |
| Anxiety / urgency | “I need the receipt from that day” | Fast path to Purchase Detail + receipt |
| Empty history | New user | Teaching empty state, not a broken grid |

### 3.3 Cognitive load rules

- Do not show every purchase title inside every month cell.
- Do not force users to interpret complex color scales.
- Do not mix fiscal “periods” language into the calendar chrome.
- One primary action per view: pick a day (month) or open a purchase (day).

### 3.4 Trust

Users must trust that:

- tapping a day shows purchases that truly happened that day
- timezone / local date handling does not “lose” evening purchases
- Back returns them to the month/day they were browsing

Broken date truth destroys Calendar Memory permanently in the user’s mind.

---

## 4. Goals and Non-Goals

### 4.1 Goals

- Provide a first-class temporal browse path into purchase memory.
- Make days with purchases visually discoverable at a glance.
- Make day → purchase → detail a short, consistent path.
- Integrate cleanly with Timeline, Search, and Purchase Detail.
- Feel native on mobile (thumb reach, swipe months, Back stack).

### 4.2 Non-goals (v1)

- Multi-select date ranges for bulk export from calendar UI.
- Drag-and-drop rescheduling of purchases (purchase date edits belong in edit flows, not calendar DnD).
- Recurring event creation.
- Shared / family calendars.
- Server-side calendar sync with Google/Apple Calendar.
- Spending heatmaps as the primary visual language.
- Budget caps per day.

### 4.3 Deferred (see Future Improvements)

- Week strip compact mode
- Year heatmap (memory density, not finance shame)
- Trip / tag overlays on calendar
- “Jump to last purchase day” smart affordance beyond Today

---

## 5. Information Architecture and Navigation

### 5.1 Placement in the product

Calendar Memory is a **primary memory door**, alongside:

- Purchase Memory search (`/memory`)
- Category browse
- Recent Purchases / History timeline

Recommended entry points:

1. **Purchase Memory hub** — peer control next to search (“Takvim” / Calendar)
2. **Home** — optional quiet link only if it does not create widget overload (prefer Memory hub)
3. **History** — “Takvim görünümü” switch if History remains list-first
4. **Deep links** from insights that mention a specific day (“Son alışveriş”) may open Day view

Exact chrome (tab vs button) may evolve; the requirement is: **reachable within one or two taps from Memory**, without hunting in Settings.

### 5.2 Route model (recommended)

| Route | Purpose |
|-------|---------|
| `/memory/calendar` or `/calendar` | Month view (default) |
| `/memory/calendar?month=2026-07` | Specific month |
| `/memory/calendar?date=2026-07-24` | Day view for that date |
| `/expense?id=…` | Purchase Detail (existing) |

Query params must be shareable and Back-friendly.

### 5.3 Navigation stack contracts

Canonical flows:

**A. Month → Day → Purchase → Back**

```
Calendar Month
  → Day View (selected date)
    → Purchase Detail
      → Back → Day View (same date, same scroll)
        → Back → Month View (same month)
```

**B. Search → Purchase → user opens Calendar from elsewhere**

Calendar should not hijack Search Back stacks. Each door keeps its own history.

**C. Insight “last purchase on date X”**

```
Insight
  → Day View (date X) or Purchase Detail directly
  → Back returns to previous surface
```

Hardcoding Back to Home from Day or Purchase Detail is a product bug.

### 5.4 Relationship to bottom navigation

If the user is in Calendar under Memory, Memory tab remains active.

Calendar is a mode of remembering, not a fifth competing identity.

---

## 6. Core Concepts and Data Rules

### 6.1 What makes a purchase “on a day”

A purchase belongs to calendar day `D` when:

- `expense.date` (ISO `YYYY-MM-DD` storage is fine internally) equals `D` in the user’s local calendar sense as already used across WasteLess.

Time (`expense.time`) does **not** move the purchase to another day. It only orders purchases within the day.

### 6.2 Aggregation for a day

For each day `D`:

- `purchaseCount` — number of expenses on `D`
- `merchantCount` — distinct normalized merchants on `D`
- `totalAmount` — sum of `totalAmount` (same currency assumption as rest of app; multi-currency edge case documented below)
- `hasReceipt` — true if any expense has `imageDataUrl`
- `topMerchants` — up to 2 merchant labels for day header context (optional)

### 6.3 Aggregation for a month

For month `M`:

- days with `purchaseCount > 0` get indicators
- optional month total in the header (secondary, calm)
- do not turn the month header into a finance dashboard

### 6.4 Sorting within a day

Primary: purchase `time` ascending (morning → evening) when present.  
Missing time: treat as unknown — place after timed items, then stable by `createdAt` or id.

Alternative accepted product choice: newest-first within day if user testing prefers “latest memory first.” Whichever is chosen must be consistent with Timeline day clusters.

**Spec default for Calendar Day view:** chronological ascending (story of the day), with a subtle note if needed.

### 6.5 Timezone philosophy

WasteLess stores purchase dates as calendar dates chosen/extracted for the receipt.

Calendar Memory must not re-interpret dates through aggressive timezone shifting that changes the day users believe they shopped.

If OCR extracted `2026-07-24`, it stays on 24 July in the calendar.

---

## 7. UI Behavior — General

### 7.1 Visual language

- Same card radius, spacing, and typography rhythm as Home / Memory.
- Calm background; month grid should feel light.
- Indicators are small and readable in outdoor glare.
- No brand wordmark competition inside Calendar.
- Localized month/day names (Turkish UI build: `Temmuz 2026`, weekday abbreviations).

### 7.2 Primary chrome (Month view)

- Back / close depending on entry (smart back)
- Title: month + year
- Previous / next month controls (chevrons)
- “Bugün” (Today) jump affordance when not already on current month/day
- Optional quiet month spend total (one line)

### 7.3 Gestures

- Horizontal swipe on month grid → previous / next month (with restraint; avoid fighting vertical scroll)
- Tap day cell → Day view
- Tap outside interactive elements → no accidental navigation
- Long-press (optional future): preview day summary tooltip — not required for v1

### 7.4 Animation

- Month transitions: short slide or crossfade (200–300ms)
- Day open: fade-up list of purchases
- Do not animate every cell independently (noise)

### 7.5 Accessibility

- Day cells are buttons with aria labels: `24 Temmuz 2026, 3 satın alma`
- Empty days still focusable for screen readers with `satın alma yok`
- Sufficient contrast for indicators
- Minimum touch target ~44×44 pt equivalent

### 7.6 Performance

- Precompute per-day aggregates for the visible month only (+/− 1 month cache acceptable)
- Do not mount full Purchase Detail trees inside cells
- Images never load in month cells

---

## 8. Month View

### 8.1 Purpose

Month view answers:

> Which days in this month hold purchase memories?

It is a **map of memory density**, not a ledger.

### 8.2 Layout

Standard mobile month grid:

- Weekday header row (localized short names)
- 6 rows × 7 columns max as needed
- Days outside current month: visually muted; tapping may either:
  - **Spec default:** navigate into that day (and thus adjacent month context), or
  - disable outside days  
  Prefer enabling outside days for fewer dead taps, then sync header month when day opens.

### 8.3 Day cell content (v1)

Each cell shows:

1. Day number
2. Purchase indicator (see §10)

Cells must **not** show:

- full merchant names
- amounts
- sparklines
- emoji stickers
- stacked event chips like a scheduling app

### 8.4 Selection and today

- **Today:** distinct calm ring or weight — not a screaming badge
- **Selected day** (when returning from day view): subtle selected state
- Days with purchases: indicator present
- Days without purchases: clean number only

### 8.5 Month header summary (optional, quiet)

One line maximum, examples:

- `12 alışveriş · 8 gün`
- `₺12.450 bu ay` (if currency consistent)

If this line starts attracting dashboard widgets, remove it.

### 8.6 Empty month

If the month has zero purchases:

- Grid still renders (orientation)
- Soft empty hint under grid:  
  “Bu ay henüz satın alma yok. Fiş ekleyerek hafızanı başlat.”
- CTA to Add is allowed once, not as a floating marketing banner

### 8.7 Dense months

If nearly every day has purchases:

- indicators remain minimal (dot / count)
- avoid turning the grid into a wall of ink
- prefer count badge only when `purchaseCount > 1`; single purchase = simple dot

---

## 9. Day View

### 9.1 Purpose

Day view answers:

> What did I buy on this day?

It is the recognition surface.

### 9.2 Header

Must include:

- Localized full date (`24 Temmuz 2026 · Cuma`)
- Relative helper when useful (`Bugün`, `Dün`, `3 gün önce`)
- Compact summary: purchase count · merchant count · day total
- Prev / next day controls (so users can walk adjacent days without returning to month)

Natural language example:

> 3 alışveriş · 2 işyeri · ₺1.842

### 9.3 Body

List of purchases using the **standard expandable Purchase Card**:

Collapsed:

- Merchant
- Time (if known) or relative placement
- Total
- Product count

Expanded:

- Products
- Receipt / OCR / tags / notes (same rules as rest of app)

Tap merchant row / card primary target → Purchase Detail.

### 9.4 Ordering

Chronological ascending through the day (spec default).

Show time as `HH:mm` when present.

### 9.5 Multiple purchases same merchant

Do not collapse distinct purchases into one fake “session” unless a future receipt-session model exists.

Two Shell visits on the same day are two memories.

### 9.6 Walking days

From Day view:

- Next day with zero purchases → still open Day view with empty state for that date (teaching continuity)
- Optional “Sonraki alışveriş günü” jump (future) to skip empty days

### 9.7 Return to month

Explicit “Ay’a dön” is optional if Back already returns to month; prefer native Back as primary.

---

## 10. Purchase Indicators (Month Cells)

### 10.1 Purpose

Indicators answer at a glance:

> Is there something to remember on this day?

### 10.2 v1 indicator system

| Condition | Indicator |
|-----------|-----------|
| 0 purchases | none |
| 1 purchase | single small dot |
| 2–3 purchases | small count `2` / `3` or double-dot treatment — prefer numeric badge for clarity |
| 4+ purchases | numeric badge `4` / `5+` (cap display at `9+` if needed) |

### 10.3 Visual rules

- Indicator sits under or beside the day number consistently.
- Active purchase days use primary/teal family already in WasteLess — not red “alert” colors.
- Do not encode spend magnitude as color intensity in v1 (avoids shame heatmap).
- Receipt presence may be a future micro-mark; not required in v1.

### 10.4 What indicators must never mean

- Red = overspent
- Green = under budget
- Flame = streak

Those meanings belong to anti-pattern products.

### 10.5 Accessibility for indicators

Do not rely on color alone. Count text or aria label must carry the meaning.

---

## 11. Timeline Integration

### 11.1 Shared truth

Timeline View and Calendar Memory read the same purchase-date ordered world.

A purchase visible on a Timeline day cluster for `2026-07-24` must appear on Calendar Day `2026-07-24`.

### 11.2 Complementary jobs

| Surface | Job |
|---------|-----|
| Timeline | Continuous scroll through memory narrative |
| Calendar | Jump via spatial/temporal map |

### 11.3 Cross-links

- From Timeline day header → optional “Takvimde aç” to that Day view
- From Calendar Day → purchases that also appear in Timeline use the same card component

### 11.4 No duplicate engines

Do not invent a second date model for Calendar.

Reuse existing datetime helpers (`formatDate`, `formatRelativeDate`, `formatTime`) and analytics date scoping patterns.

---

## 12. Purchase Detail Integration

### 12.1 Entry

Day view Purchase Card → `/expense?id=…`

### 12.2 Back behavior

Must return to the **same Day view** with:

- same `date` query
- preserved list scroll position when platform allows

### 12.3 Edit / delete from Detail

- After edit: day membership may change if user changes purchase date — Calendar must reflect new day on return
- After delete: day list updates; if day becomes empty, show empty day state (do not force pop to month unless product prefers that — **spec default:** stay on empty day)

### 12.4 Receipt viewing

Receipt remains part of Purchase Detail / expanded card — Calendar does not become an image gallery.

---

## 13. Search Relationship

### 13.1 Distinct doors, same archive

| Door | Cue type |
|------|----------|
| Search / Purchase Memory | name, merchant, product, amount fragment |
| Calendar | time |

They collaborate; neither replaces the other.

### 13.2 When Search should jump into Calendar

If a search result set is dominated by a single day (future intelligence), the UI may offer:

> “Hepsi 24 Temmuz’da — Takvimde gör”

Not required for v1.

### 13.3 When Calendar should jump into Search / Memory

Day view may offer a quiet action:

> “Bu gündeki ürünlerde ara”

Only if it reduces friction; avoid chrome clutter.

### 13.4 Query preservation

Opening Calendar must not wipe an active Memory `?q=` in a parallel stack. Different routes keep different state.

### 13.5 Amount/date hybrid recall

If a user remembers “about ₺500 last Friday,” ideal future flow is Search amount + Calendar day confirmation. v1 may not combine these; document as future.

---

## 14. Empty States

### 14.1 Empty app (no purchases anywhere)

Month view shows current month grid with no indicators.

Message:

> Henüz satın alma hafızan yok.  
> İlk fişini eklediğinde günler burada canlanacak.

Primary CTA: Add purchase / scan receipt.

### 14.2 Empty month (purchases exist in other months)

> Bu ay boş.  
> Önceki aya git veya yeni bir satın alma ekle.

Provide prev-month control emphasis + Today if relevant.

### 14.3 Empty day

> Bu günde kayıtlı satın alma yok.

Secondary actions:

- Previous / next day
- Add purchase prefilled with that date (strong delight: date memory → capture)

Prefilling Add with the selected calendar date is explicitly desirable.

### 14.4 Empty search-from-calendar (if exists)

Keep teaching tone; never “no results found” database voice.

---

## 15. Loading States

### 15.1 Month load

- Skeleton grid (7×N placeholder cells) or shimmer header + grid
- Do not flash empty indicators then populate (avoids lie frames)
- Prefer cached last month paint while recomputing

### 15.2 Day load

- Skeleton Purchase Cards (2–3)
- Header date visible immediately if date is known from route

### 15.3 Month swipe

- Keep old month visible until next month aggregates ready, or show lightweight transition overlay
- Avoid blank white during swipe

### 15.4 Offline

Calendar Memory is local-first. Loading should work offline from IndexedDB.

If data layer is slow, skeletons — not error — unless DB read fails.

### 15.5 Failure

If month aggregation fails:

> Takvim yüklenemedi. Tekrar dene.

Retry button. Do not blame the user.

---

## 16. Edge Cases

### 16.1 Purchase date missing / invalid

Normalize via existing expense normalization. Invalid dates must not crash the grid. Exclude from calendar with internal logging; prefer fixing at save time.

### 16.2 Future-dated purchases

Allow display on future days if user/OCR entered a future date. Do not silently clamp to today.

Optional quiet mark “ileri tarih” only if confusion appears in testing.

### 16.3 Very old history

Support year navigation across many years without performance collapse (lazy aggregate by month).

### 16.4 Multi-currency days

If multiple currencies appear on one day (rare):

- Do not sum blindly into one total
- Show count of purchases; suppress single total or show per-currency totals

### 16.5 Timezone travel / device change

Purchase date strings remain authoritative. Device timezone changes must not reshuffle historical days.

### 16.6 OCR date wrong

User corrects date in Review/Edit → purchase moves days. Correction Memory may learn date corrections per merchant when applicable (broader OCR system), Calendar simply follows stored `expense.date`.

### 16.7 Large days (festivals, trips)

Day with 20+ purchases:

- virtualize list if needed
- keep filters collapsed by default
- do not auto-expand all cards

### 16.8 Same second / identical timestamps

Stable secondary sort by id to avoid jitter.

### 16.9 Deleted last purchase of the day while viewing day

Show empty day state; keep date context.

### 16.10 Month boundary swipe during day walk

Prev day from the 1st goes to previous month’s last day; header date updates; Back stack should remain understandable (prefer replacing day query, not infinite history entries for each day walk — use `replace` for day-to-day walking, `push` for month→day).

**Spec navigation detail:**

- Month → Day: `push`
- Day → adjacent Day: `replace` (avoid Back purgatory through 30 days)
- Day → Purchase Detail: `push`

### 16.11 First day of week

Respect locale. Turkish product build: Monday-first week.

### 16.12 RTL

Not primary for current market; keep layout logic locale-aware for future.

---

## 17. Copy Deck (UI Microcopy)

### 17.1 Titles

- `Takvim` / `Takvim Hafızası` (prefer short `Takvim` in chrome)
- Month title: `Temmuz 2026`

### 17.2 Actions

- `Bugün`
- `Önceki ay` / `Sonraki ay` (aria)
- `Ay’a dön`
- `Satın alma ekle`

### 17.3 Summaries

- `{n} alışveriş`
- `{n} işyeri`
- `Bu günde kayıtlı satın alma yok.`
- `Bu ay henüz satın alma yok.`

### 17.4 Forbidden copy

- “Transactions on this date”
- “Budget remaining”
- “Overspending alert”
- Raw ISO date as primary header (`2026-07-24`)

---

## 18. Analytics Signals (Product Quality, Local-First)

If local anonymous metrics exist later, useful signals include:

- Month → Day open rate
- Day → Purchase Detail open rate
- Today jump usage
- Empty day → Add with prefilled date conversion
- Back-stack success (day restored vs bounce Home)

Do not build a surveillance product. Prefer on-device improvement signals.

---

## 19. Acceptance Criteria (v1)

Calendar Memory v1 is complete when all of the following are true:

1. User can open Calendar from Purchase Memory within two taps.
2. Month view shows localized month grid with Monday-first weeks (TR).
3. Days with purchases show clear indicators; empty days do not.
4. Indicators use purchase date, not `createdAt`.
5. Tapping a day opens Day view with correct purchases.
6. Day view uses standard Purchase Cards (collapsed/expanded rules respected).
7. Opening Purchase Detail and pressing Back returns to the same Day view.
8. Day-to-day walking uses `replace`; month-to-day uses `push`.
9. Today affordance jumps to current month and highlights today.
10. Empty month / empty day / empty app states teach and offer Add.
11. Prefilling Add with selected day date works from empty day (or day header action).
12. Offline browsing works from IndexedDB.
13. No budget/heatmap shame encoding in colors.
14. Screen readers can announce purchase counts per day.
15. Visual language matches WasteLess companion polish (calm, not dashboardy).

---

## 20. Implementation Notes (Guidance, Not a Task List)

These notes help engineering stay aligned; they are not a substitute for product rules above.

- Reuse `expense.date` and existing store ordering helpers.
- Precompute `Map<YYYY-MM-DD, DayAggregate>` per visible month.
- Prefer one route family under Memory to preserve tab activation.
- Reuse `PurchaseCard`, `formatDate`, `formatRelativeDate`, `formatTime`, smart Back helpers.
- Do not fork a second expense list component for Day view.

---

## 21. Future Improvements

Ordered by product value, not engineering novelty.

### 21.1 Skip to next purchase day

From an empty day, one tap to the next/previous day that has purchases.

### 21.2 Week strip mode

Compact horizontal week for one-hand jumpers who find full months heavy.

### 21.3 Year density map

A calm year view showing which months/days had memories — still not a finance heatmap of spend magnitude.

### 21.4 Tag / trip overlays

Light marks for tagged days (“Vacation 2026”) without turning cells into chip piles.

### 21.5 Receipt micro-indicator

Tiny mark when a day contains at least one receipt image — helps “I need the photo” recall.

### 21.6 Smart entry from Assistant

Assistant line: “3 gün önce Shell’deydin” → opens that Day view.

### 21.7 Amount + day combined recall

Assistive bridge between Search and Calendar when both fragments exist.

### 21.8 Multi-select days for Memory playback

Play a short “story” of a trip weekend — carefully, without becoming a report builder.

### 21.9 Pinch/zoom year ↔ month

Only if it stays effortless; otherwise skip.

### 21.10 Widget / live activity

Optional OS widget showing “last purchase day” — only after core calendar quality is excellent.

---

## 22. Anti-Patterns Specific to Calendar Memory

Never:

- Color days by “how bad you spent”
- Put budgeting goals inside day cells
- Show full transaction tables inside month cells
- Use Calendar as a generic event planner
- Break Back stacks to Home
- Sort calendar membership by `createdAt`
- Auto-expand all products on day open
- Add floating promotional banners on the grid
- Require network to browse past months
- Duplicate incompatible card UIs “just for calendar”

---

## 23. Design QA Checklist

Before shipping a Calendar Memory build, review on a real phone:

- [ ] Can I find last Friday in under five seconds?
- [ ] Does today read clearly without shouting?
- [ ] Are indicators legible outdoors?
- [ ] Does a busy Saturday still feel calm?
- [ ] Does empty day invite capture with the correct date?
- [ ] Does Back from a purchase feel native?
- [ ] Does the screen feel like memory — not accounting?

If any answer is no, it is not done.

---

## 24. One-Sentence Definition

**Calendar Memory is WasteLess’s temporal door into Personal Purchase Memory: a calm month map of days that hold purchases, opening into day stories told with the same Purchase Cards and Detail flows as the rest of the product — because people often remember dates before they remember product names.**

---

*End of Calendar Memory feature specification.*
