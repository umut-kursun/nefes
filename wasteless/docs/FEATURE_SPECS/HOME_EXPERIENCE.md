# Feature Spec: Home Experience

**Product:** WasteLess — Personal Purchase Memory  
**Feature name:** Home Experience  
**Document type:** Standalone product specification  
**Status:** Spec (definitive product contract for the Home screen)  
**Related:** Master Product Guide §9 Dashboard (Home Experience); Insight Engine; AI Assistant; Purchase Memory  
**Non-goals for this file:** This is not a summary of the Master Guide. It is the complete operational specification for Home as the welcome surface of WasteLess.

---

## 1. Why Home Exists

### 1.1 Home is not a dashboard

Home is the application’s **welcome experience** and **daily companion surface**.

It is not:

- a finance cockpit
- a reporting console
- a widget shelf
- a settings page
- a feature directory

Users do not open Home to “manage accounts.”  
They open Home to feel oriented, curious, and able to remember.

### 1.2 The job of Home

Home must answer, quickly and calmly:

1. **What happened today?** (or in the selected period)
2. **What is interesting right now?** (Assistant observation)
3. **Where can I go next to remember or capture?** (search, categories, recent, add)

If Home fails those jobs, WasteLess feels like software.  
If Home succeeds, WasteLess feels like a shopping companion.

### 1.3 Why users return every day

Users primarily return to:

1. Discover something new about their purchases.
2. Quickly add a new purchase.
3. Find a previous purchase.

Home must always give at least one reason to come back:

- a fresh Assistant observation
- a clear today summary
- an inviting path into Memory
- recent purchases that spark recognition

A Home that looks identical every day is a product failure.

### 1.4 What success feels like

Within **5 seconds** (ideally without scrolling), the user understands:

- today’s activity
- something interesting the app noticed
- where money went at a glance (categories peek)
- that finding an old purchase will be easy

Within **30 seconds**, the user feels delight: alive, modern, lightweight, intelligent.

Emotional targets:

- Wow.
- This app is smart.
- I’ll easily find what I’m looking for.
- I’m curious about my previous purchases.

---

## 2. Product Philosophy

### 2.1 Governing question

Every Home decision must answer:

> Does this help the user feel welcomed, oriented, and curious about their purchase memory — without making WasteLess feel like an expense tracker?

If the answer is no, it does not belong on Home.

### 2.2 Principles specific to Home

1. **Companion welcome, not finance dashboard.**  
   Stories over spreadsheets. Observations over charts.

2. **Fewer high-quality sections beat many average widgets.**  
   Every block must justify its existence on every visit.

3. **Progressive disclosure.**  
   Home shows the tip of memory. Depth lives in Memory, Category, Detail.

4. **Alive but calm.**  
   Live clock, rotating Assistant, subtle motion — never visual panic.

5. **Brand is not the hero.**  
   Greeting and today’s activity dominate. The wordmark does not.

6. **Purchase date is truth.**  
   Recent Purchases and period summaries use purchase date, not entry time.

7. **One idea at a time for intelligence.**  
   Assistant shows one observation; full lists live on Insights.

8. **Consistency with the product atom.**  
   Recent items use the same purchase language as the rest of the app.

9. **Native mobile behavior.**  
   Back stacks, keyboard Back, and scroll restoration must feel platform-native when leaving Home and returning via history where applicable.

10. **Local-first.**  
    Home must render from on-device memory offline. Network is not required for welcome, summary, recent, or categories.

### 2.3 Explicit non-identity

Home must never become:

- a budgeting scoreboard
- an accounting period closer
- a notification center dump
- a marketing wall
- a chatbot transcript
- a “for you” feed of unrelated cards
- a second Settings page

---

## 3. Emotional Goals

### 3.1 Primary emotions

| Emotion | How Home creates it |
|---------|---------------------|
| Welcome | Time-aware greeting (+ optional name) |
| Clarity | Spending summary answers “how active was today?” |
| Intelligence | Assistant observation in natural language |
| Curiosity | Fresh insights; paths into Memory / categories |
| Calm | Sparse hierarchy; no widget overload |
| Confidence | “I’ll find it” via quiet search entry |

### 3.2 Emotions to avoid

- Guilt (“you overspent”)
- Anxiety (red heatmaps, alerts without help)
- Confusion (competing primary actions)
- Boredom (static identical Home)
- Overwhelm (Tags + Quick Add + merchants + stacked insights + chips)

### 3.3 First Impression contract

Within the first 10 seconds, users should feel:

- “Wow, this looks great.”
- “This app is smart.”
- “I’ll easily find what I’m looking for.”
- “Now I’m curious about my past purchases.”

Home must invite exploration, not merely display information.

### 3.4 Daily Return contract

Each day should feel slightly different:

- different Assistant messages
- different insight families when data allows
- updated today totals / latest purchase
- same calm structure (predictable layout, fresh content)

Predictable chrome + fresh meaning = habit without fatigue.

---

## 4. Information Hierarchy

### 4.1 Canonical order (top → bottom)

1. **Header** — Greeting + live date/time + Settings affordance  
2. **Spending Summary card** — period activity (default: Today)  
3. **Search entry** — quiet Purchase Memory gateway  
4. **Assistant card** — one rotating observation  
5. **Parent Categories** — where money went (browse door)  
6. **Recent Purchases** — always last  
7. **Quick Actions** — optional; never crowd the first viewport (see §11)

Settings shortcuts as a content section are forbidden. Settings live in header/nav.

### 4.2 First viewport (no-scroll) priority

Must fit on a typical phone first screen when possible:

- Greeting + clock
- Spending Summary (including compact period control)
- Search field
- Assistant card (at least its top)

Categories and Recent may require a short scroll — acceptable.  
They must not push Assistant below two folds of junk widgets.

### 4.3 Priority rationale

| Rank | Section | Why |
|------|---------|-----|
| 1 | Greeting / time | Emotional entry; makes app feel alive |
| 2 | Summary | Orientation: what happened |
| 3 | Search | Flagship memory door |
| 4 | Assistant | Meaning: why care today |
| 5 | Categories | Spatial map of spending memory |
| 6 | Recent | Fast re-entry to latest memories |
| 7 | Quick Actions | Capture shortcuts — secondary to welcome |

### 4.4 What must not appear on Home

- Tags section / tag carousel
- Merchant carousel as a peer hero
- Stacked multi-insight card lists duplicating Assistant
- Example search chip rows that clutter the fold
- Large WasteLess wordmark as `h1` hero
- Duplicate “En çok …” modules that fight Assistant
- Promotional banners

---

## 5. Header Behavior

### 5.1 Layout

- Left: greeting + date + live clock  
- Right: Settings gear (single calm icon button)

No competing icons in the header. Add belongs in bottom nav.

### 5.2 Brand

Do **not** place a large “WasteLess” title as the visual focus.

Brand lives in:

- PWA name / install surface
- Settings / about
- System chrome

Home’s hero signal is the **greeting**, not the logo word.

### 5.3 Typography

- Greeting is the primary text (display/friendly weight, not a billboard)
- Date/time are secondary, quieter
- Avoid oversized titles that consume the fold

---

## 6. Greeting Behavior

### 6.1 Purpose

Greeting creates welcome and personalization without ceremony.

### 6.2 Time-of-day rules

Use local device time:

| Local hour | Greeting (TR product build) |
|------------|-----------------------------|
| 00:00–05:59 | İyi geceler |
| 06:00–11:59 | Günaydın |
| 12:00–17:59 | İyi günler |
| 18:00–23:59 | İyi akşamlar |

English documentation equivalents: Good night / Good morning / Good afternoon / Good evening.

### 6.3 Name personalization

If `displayName` is set in Settings:

> Günaydın, Umut

If not set:

> Günaydın

Rules:

- Optional — never force onboarding name to use Home
- Trim whitespace; ignore empty strings
- Do not invent nicknames
- Keep friendly but minimal — no exclamation storms

### 6.4 Update behavior

Greeting must update if the user keeps the app open across a time boundary (e.g. 11:59 → 12:00).

Tied to the same live clock tick used for time display (see §7).

### 6.5 Anti-patterns

- “Hello, valued customer”
- Long motivational quotes
- Guilt greetings (“Ready to cut spending?”)
- Emoji-leading greetings as default

---

## 7. Live Date & Time

### 7.1 Purpose

A ticking clock makes Home feel **active**.

This is a deliberate delight detail, not decoration for its own sake.

### 7.2 Display

- Localized long date, e.g. `Pazartesi, 27 Temmuz 2026`
- Live clock `HH:mm:ss` updating every second while Home is mounted

Never show raw ISO `2026-07-27` as the primary date line.

### 7.3 Lifecycle

- Start interval on mount
- Clear interval on unmount
- Do not freeze `now` in an empty-deps memo for the header clock
- Analytics / insight generation should not recompute every second unless necessary — clock tick ≠ insight rebuild

### 7.4 Accessibility

Announce date meaningfully; avoid aggressive live-region spam every second for screen readers. Clock can be presentational if date text already conveys the day.

---

## 8. Spending Summary

### 8.1 Purpose

The Spending Summary is the primary orientation card.

It answers:

- How much activity in this period?
- How many purchases / merchants / products?
- What was the latest purchase? (recognition cue)
- How does this compare to the previous period? (optional, understandable)

It must feel like **today’s activity**, not a P&L statement.

### 8.2 Default period

Default: **Today** (`day`).

User may switch: Bugün / Hafta / Ay / Yıl.

### 8.3 Period control placement

Period control lives **inside** the summary card header (compact segmented control).

It must not be a full-width competing strip above the card that burns vertical calm.

### 8.4 Labels by period

| Period | Title example |
|--------|----------------|
| Day | Bugünün harcaması |
| Week | Bu haftanın harcaması |
| Month | Bu ayın harcaması |
| Year | Bu yılın harcaması |

### 8.5 Required metrics

Always show when data model allows:

- Period total amount (animated amount acceptable)
- Purchase count
- Merchant count
- Product count (line items with names)

Comparison badge vs previous period when available, with caption:

- Düne göre
- Geçen haftaya göre
- Geçen aya göre
- Geçen yıla göre

Avoid percentage-only comparisons without context. Prefer understandable language via existing Trend patterns.

### 8.6 Latest purchase row

When the scoped period has ≥1 purchase, show a quiet row:

- Label: Son alışveriş
- Merchant (normalized when possible)
- Time (`HH:mm`) if known, else relative date
- Tap → Purchase Detail

This supports recognition: “Yes, that Shell stop this morning.”

### 8.7 Quiet deep links

Largest category / merchant may appear as **quiet text links**, not a second hero module.

They must not compete with Assistant.

If they add clutter, remove them — Categories section already covers browse.

### 8.8 Multi-horizon display

The card focuses one selected horizon at a time via period control.

“Today’s Spending” and “This Month’s Spending” need not both be permanent twin totals if that densifies the card. Period switching is the product mechanism.

If a future design shows today + month simultaneously, it must remain one card with clear hierarchy — not two rival scoreboards.

### 8.9 Data rules

- Scope expenses by `expense.date` within period range
- Totals use purchase amounts
- Merchant normalization for counts
- Product count = named line items

### 8.10 Zero state inside card

If period has no purchases:

- Total `₺0` (or localized zero)
- Counts at zero
- No latest purchase row
- Calm, not broken

---

## 9. Assistant Card

### 9.1 Purpose

The Assistant is the **smart companion heartbeat** of Home.

It replaces stacked insight lists on Home with **one helpful observation at a time**.

It is a shopping companion message — not a chatbot thread.

### 9.2 Content source

Insight Engine pool (priority + diversity).

Home uses a dedicated picker (family spread + session freshness), not merely “top 2 static cards.”

### 9.3 Presentation

- Section label: `Asistan` (calm)
- Link: `Tümü` → `/insights`
- One message: title (short hook) + description (spoken observation)
- Icon from insight
- Tap entire message → `insight.href` (Memory / Category / Expense / History)

### 9.4 Rotation

- Auto-advance about every **5 seconds** when ≥2 insights
- Manual swipe / dot interaction **pauses ~12 seconds**, then resumes
- Crossfade ~200–300ms
- Never repeat the same message continuously in a tight loop without advancing the pool

### 9.5 Diversity / freshness

- Prefer insight family spread (price / habit / merchant / category / record / …)
- De-prioritize ids shown earlier in the session
- Rotate starting offset across visits so Home does not always open on the same price alert

### 9.6 Tone

Natural language. Concrete names. Comparison context.

Good:

> Motorin birim fiyatı önceki alımına göre %7 arttı.

Bad:

> ↑ 7%

### 9.7 Empty Assistant

If no insights can be generated (new user / insufficient history):

- Hide Assistant section entirely, **or**
- Show a single teaching observation inviting first capture

Do not show an empty chrome box with dots.

### 9.8 What Assistant must never do on Home

- Show 3+ insight cards stacked
- Nag with Quick Action pin modals
- Shame spending
- Require chat UI
- Emoji-spam as primary language
- Auto-play audio

---

## 10. Search Entry

### 10.1 Purpose

Quiet gateway into **Purchase Memory** — the flagship remember door.

### 10.2 UI

- Single field
- Placeholder inviting memory: `Ne ödemiştim…`
- Submit / enter → `/memory?q=…` (or `/memory` if empty)

### 10.3 Explicitly removed

Example chip rows (Kahve, Shell, …) on Home.

Chips create fold noise and teach the wrong density. Memory page can teach search.

### 10.4 Keyboard / Back

Do not auto-focus search on every Home landing if that fights Android Back.

If focused, AppShell keyboard Back guard applies: first Back blurs keyboard.

### 10.5 Visual weight

Search is important but quieter than Summary.

Height roughly compact (`h-12` class of calm), not a second hero billboard.

---

## 11. Quick Actions

### 11.1 Purpose

One-tap capture for habitual purchases (coffee, cigarettes, fuel, …).

They reduce friction for repeated memories.

### 11.2 Placement philosophy

Quick Actions are **valuable but dangerous to Home calm**.

**Spec default for Home density:**

- Prefer Quick Actions on **Add** and `/quick-buttons` management.
- Home may omit the Quick Actions strip when the first viewport needs calm.
- If Home includes Quick Actions, they must appear **below Categories and above Recent**, or only after Assistant — never above Summary/Assistant — and must not revive widget overload.

Editing a Quick Action must never rewrite historical purchases created from it.

### 11.3 Behavior when shown

- Horizontal scroll of action pills/cards
- Tap → create purchase + toast confirmation
- “Daha fazla” → management screen

### 11.4 Anti-patterns

- Giant Quick Action grid as Home hero
- Recommendation modals “Pin Migros as Quick Action?” blocking Home
- Mixing Quick Actions into Assistant messages as forced CTAs

---

## 12. Categories Section

### 12.1 Purpose

Parent Categories answer:

> Where did my money go — as a memory map?

They are a browse door into Purchase-first category flows.

### 12.2 Rules

- Show **parent categories only** on Home
- Sorted by period spend (aligned with selected summary period when possible)
- Limit to a small set (e.g. top 5) + “Tümü”
- Child preview lines may appear quietly on the card
- Tap → Category page (`/category?id=…`)

### 12.3 Trends

Trend badges need comparison captions (“Düne göre”, etc.) — never bare arrows.

### 12.4 Empty

If period has no categorized spend:

> Bu dönemde kayıt yok.

Calm empty, not a chart hole.

### 12.5 Consistency

Category pages remain:

**Parent → Child → Purchases → Detail**

Home must not deep-link into product-first screens.

---

## 13. Recent Purchases

### 13.1 Purpose

Fast re-entry into the latest memories.

Always the **last** major content section on Home.

### 13.2 Data rules

- Sort by **purchase date** (`date`), then time/`createdAt` tie-break
- Show a small number (e.g. 3)
- “Tümü” → History

### 13.3 Presentation

Use purchase-consistent rows/cards (merchant, date, amount).

Prefer recognition over analytics.

Tap → Purchase Detail with smart Back to Home (Home is a root; Back may exit or return within web history — Detail opened from Home should Back to Home).

### 13.4 Empty

> Henüz satın alma yok.  
> Fiş yükle veya hızlı butonla ekle.

CTA path toward Add.

---

## 14. Scrolling Behavior

### 14.1 Principles

- First viewport teaches the companion story without requiring scroll.
- Scroll reveals browse depth (categories, recent) — not more widgets of equal weight.
- No horizontal carousels of unrelated modules fighting vertical rhythm (Assistant may use internal swipe only).

### 14.2 Scroll anchoring

- Returning to Home from bottom nav typically resets to top (tab root behavior).
- Returning via browser Back from a child opened from Home should restore scroll when the platform allows.

### 14.3 Nested scroll

- Avoid nested vertical scroll regions on Home.
- Horizontal scroll only for intentional strips (Quick Actions if present).

### 14.4 Overscroll

Keep native overscroll feel; do not trap the user in a custom pager for the whole Home.

### 14.5 Section spacing

Tighten vertical rhythm: greeting → summary should feel connected, not a desert of whitespace.

Use intentional whitespace, not accidental emptiness.

---

## 15. Widget Philosophy

### 15.1 Definition

A “widget” on Home is any self-contained module competing for attention.

### 15.2 Rules

1. Every widget must earn a permanent place by serving welcome, orientation, curiosity, or a clear door.
2. If two widgets tell the same story, keep one.
3. Widgets must not multiply because the codebase has components available.
4. Home is not a showcase of engineering capability.

### 15.3 Allowed widget classes

- Summary (orientation)
- Assistant (meaning)
- Search (door)
- Categories (map)
- Recent (re-entry)
- Optional Quick Actions (capture) under strict placement rules

### 15.4 Disallowed widget classes on Home

- Tags occupancy
- Merchant leaderboard carousel
- Multi-insight stacked lists
- Timeline charts for last 7 days as default hero
- Promo cards
- Streak / gamification badges
- Weather / unrelated OS widgets

---

## 16. Card Philosophy

### 16.1 Visual system

- Shared radius, border calm, soft shadow language with the rest of WasteLess
- White / soft surface cards on atmospheric background
- One primary card (Summary) visually strongest
- Assistant card peer-strong but not louder than Summary
- Category / Recent cards quieter

### 16.2 Content density

Cards should breathe.

If removing a border, shadow, or label does not hurt understanding, remove it.

### 16.3 Interaction

- Cards that navigate should have clear tap targets and active scale feedback
- Do not place multiple equal CTAs inside one card
- Summary period control is the exception (segmented control is the card’s mode switch)

### 16.4 Motion

- Section `fade-up` on first paint
- Amount animation in Summary acceptable
- Assistant crossfade on rotate
- No continuous bouncing, pulsing CTAs, or parallax gimmicks

---

## 17. Loading States

### 17.1 Initial Home load

Use Dashboard skeleton that approximates:

- header lines
- summary card block
- search bar
- list rows

Avoid blank white.

### 17.2 Period switch

- Prefer instant recompute from local data
- If slow, keep previous numbers visible until next ready (no zero-flash lie)

### 17.3 Assistant pool

- May appear after expenses ready
- Do not flash empty Assistant chrome

### 17.4 Offline

Home must load from IndexedDB offline.

No blocking “connect to internet” gate for Home content.

### 17.5 Failure

If store fails to load:

> Bir şeyler ters gitti. Tekrar dene.

Retry. No blame.

---

## 18. Empty States

### 18.1 Brand-new user (no purchases)

Home still shows:

- Greeting + clock (alive)
- Summary at zero
- Search (teach Memory)
- Optional teaching Assistant / hide Assistant
- Empty Categories message
- Empty Recent with Add guidance

Emotional goal: invitation, not brokenness.

### 18.2 Returning user, empty today

Summary zeros for Today are normal.

Assistant should still try habits/history insights (not only today).

Recent still shows last purchases from other days.

### 18.3 No insights yet

Hide Assistant rather than filler fluff — unless a single teaching line helps first capture.

### 18.4 No categories spend in period

Calm empty line under Categories header.

---

## 19. Navigation & Integration

### 19.1 Bottom nav

Home tab is the root welcome.

Switching to Home from another tab typically shows Home root.

### 19.2 Outbound doors

| Element | Destination |
|---------|-------------|
| Settings gear | `/settings` |
| Search | `/memory` (+ `q`) |
| Assistant message | insight `href` |
| Assistant Tümü | `/insights` |
| Category card | `/category?id=` |
| Categories Tümü | `/categories` |
| Recent row | `/expense?id=` |
| Recent Tümü | `/history` |
| Quick Action (if any) | creates expense / management |

### 19.3 Back

From destinations opened from Home, smart Back should return to Home when history says so.

Do not specially break Memory’s own Back contracts when user reached Memory via Home search — Memory owns its query restoration.

### 19.4 Period state

Period selection may be session-local on Home (acceptable).

Persisting last period is optional; default Today remains the product preference for first impression.

---

## 20. Edge Cases

### 20.1 Clock across midnight

When date rolls over while Home is open:

- date line updates
- greeting may update
- Today scope should refresh to the new day

### 20.2 Display name changes in Settings

Returning to Home updates greeting without restart.

### 20.3 Huge histories

Home aggregations must stay cheap:

- period filter first
- top N categories
- top N recent
- capped insight pool

Do not render all expenses as DOM on Home.

### 20.4 Multi-currency

If multiple currencies exist, Summary should not lie with a naive sum. Prefer primary currency or suppress total with explanation (product-wide money policy).

### 20.5 Latest purchase without merchant

Fall back to category label.

### 20.6 Latest purchase without time

Show relative date instead of `HH:mm`.

### 20.7 Assistant href missing

Insights require href. Do not show non-actionable dead messages on Home.

### 20.8 Rapid period tapping

Debounce visually; avoid flicker; always end on the user’s last selected period.

### 20.9 PWA resume from background

Clock resumes; data refresh on focus is welcome if store supports it.

### 20.10 First install / skeleton flash

Avoid content jump that shifts tap targets under the user’s finger.

---

## 21. Copy Deck

### 21.1 Header

- Greetings as specified
- Settings aria: `Ayarlar`

### 21.2 Summary

- Period titles as specified
- `Son alışveriş`
- Count words: `alışveriş` · `işyeri` · `ürün`

### 21.3 Assistant

- `Asistan`
- `Tümü`
- `Detaya git →`

### 21.4 Search

- `Ne ödemiştim…`

### 21.5 Sections

- `Kategoriler`
- `Son satın almalar`
- Empty: `Henüz satın alma yok.` / `Bu dönemde kayıt yok.`

### 21.6 Forbidden

- Bare `↑ 7%`
- ISO primary dates
- “Dashboard”, “Transactions”, “Budget remaining”
- “Most Category” ambiguity

---

## 22. Acceptance Criteria

Home Experience is complete when all of the following are true:

1. No large WasteLess wordmark dominates Home.
2. Greeting is time-based and optionally includes display name.
3. Date is localized long form; clock ticks while Home is open.
4. Information order matches §4 (Summary → Search → Assistant → Categories → Recent last).
5. Period control is inside Summary; default Today.
6. Summary shows amount + purchase/merchant/product counts for the period.
7. Latest purchase row appears when scoped data exists; uses purchase date ordering truth.
8. Search is a single quiet field without Home chip rows.
9. Assistant shows one rotating observation (~5s) with pause-on-interact.
10. Assistant diversity avoids identical continuous repetition when pool allows.
11. Tags section is absent from Home.
12. Recent Purchases sit at the bottom and sort by purchase date.
13. Categories show parents with Purchase-first destinations.
14. First viewport communicates today + intelligence without widget overload.
15. Loading uses skeletons; empty states teach.
16. Offline Home renders from local data.
17. Visual language is calm, premium, consistent with companion polish.
18. No stacked duplicate insight lists on Home.
19. Trend/comparison UI includes comparison context.
20. Quick Actions (if present) do not outrank Summary/Assistant in hierarchy.

---

## 23. Future Improvements

Ordered by product value:

### 23.1 Dual-horizon summary without clutter

Today + month in one glance if hierarchy stays clear.

### 23.2 Weather-independent “moment” lines

Assistant seasonal shopping memory (coats, school start) from history only.

### 23.3 Smarter latest purchase

Show product snippet when single-item purchase (fuel litre, coffee).

### 23.4 Home → Calendar Memory door

Quiet temporal door once Calendar ships — without a new widget pile.

### 23.5 Local learning signals

Weight Assistant using expanded cards / search frequency — still on-device.

### 23.6 Soft Quick Action suggestions inside Assistant copy only

Never modal. Always dismissible by rotation.

### 23.7 Reduced-motion mode

Respect OS reduced motion: disable amount animation / crossfades.

### 23.8 Tablet / wide layout

Keep one-column companion composition; do not become a multi-pane analytics console.

---

## 24. Anti-Patterns

Home must **never**:

- Look like a bank dashboard
- Lead with brand typography over greeting
- Freeze the clock at mount forever
- Sort Recent by entry creation time while implying purchase recency
- Host Tags as dashboard occupancy
- Stack multiple insight cards duplicating Assistant
- Use search chip carnivals on the fold
- Encode shame via red spend heat
- Force recommendation pin modals
- Auto-focus search every visit fighting Android Back
- Place Quick Actions above the welcome story
- Show charts without stories as the hero
- Become a static wallpaper of metrics
- Add widgets because components exist
- Compete with itself via two equal heroes

---

## 25. Design QA Checklist

Before shipping a Home change, review on a real phone:

- [ ] Do I feel welcomed in one second?
- [ ] Do I understand today without scrolling?
- [ ] Does the Assistant feel smart — not spammy?
- [ ] Is there any section I would not miss if deleted?
- [ ] Does Home still feel calm with a full purchase history?
- [ ] Does empty Home invite the first receipt?
- [ ] Does it feel like a companion — not an expense tracker?

If any answer is no, it is not done.

---

## 26. One-Sentence Definition

**Home is WasteLess’s living welcome: a calm companion surface that greets you, orients you in today’s purchase activity, surfaces one intelligent observation, and opens clear doors into remembering — without ever becoming a finance dashboard.**

---

*End of Home Experience feature specification.*
