# WasteLess Master Product Guide

> **Status:** Official Product Bible — single source of truth for product, design, AI, OCR, privacy, security, and engineering decisions.  
> **Audience:** Founders, product, design, engineering, and future contributors.  
> **Rule:** When a feature proposal conflicts with this guide, this guide wins unless the guide itself is intentionally updated.

---

## 1. Product Vision

### Mission

WasteLess helps people remember what they bought, where they bought it, when they bought it, and how prices changed over time.

WasteLess is not an expense tracker, budgeting app, or accounting tool.

WasteLess is a Personal Purchase Memory.

### Vision

People rarely remember their purchases, but they often need them later.

Instead of manually searching receipts, bank statements, or gallery photos, WasteLess becomes the user's second memory.

Every purchase should be easy to find, understand, and learn from.

### Core Promise

Users should be able to answer questions like:

- Where did I buy this?
- When did I last buy it?
- How much did I pay?
- Was it cheaper before?
- Which store sells it cheaper?
- How often do I buy it?

within a few seconds.

### Product Identity

WasteLess remembers purchases.

It does not manage budgets.

It does not calculate wealth.

It does not replace accounting software.

Its purpose is remembering purchases and helping users make better buying decisions.

### What WasteLess Is

- A Personal Purchase Memory
- A shopping companion that quietly observes and explains
- A receipt-to-memory pipeline with human review
- A progressive-disclosure product: show less first, reveal more on request
- An offline-first, privacy-respecting mobile PWA



### What WasteLess Is Not

- An expense tracker
- A budgeting or envelope system
- Accounting / bookkeeping software
- A bank aggregator
- A spreadsheet with a UI
- A statistics dashboard for finance nerds
- A chatbot that talks for the sake of talking



### Emotional Positioning

Users should feel:

- “I don’t need to remember it anymore — WasteLess already does.”
- “This app is smart, but calm.”
- “I’ll find what I’m looking for in seconds.”
- Curiosity about their own shopping history — not guilt about spending.

Purchases are **memories**, not transactions.

---



## 2. Product Philosophy



### Every feature must answer one question

Before implementing any feature, ask:

"Does this help users remember their purchases more easily?"

If the answer is no, the feature should not be implemented.

### WasteLess is built around memory, not money

Money is part of the purchase.

The purchase itself is the product.

Users come to WasteLess because they remember buying something, but not the details.

WasteLess helps reconstruct that memory instantly.

### Tell stories, not numbers

Instead of showing raw statistics, explain what happened.

Good:

"You paid ₺42 more than your previous purchase."

Better:

"You usually buy this every 10 days. This time you waited 18 days."

Bad:

"Price +18%"

Never show bare trend glyphs without comparison context (for example `↑ 7%` alone). Always explain **what changed** and **compared to what**.

### AI should feel helpful, not robotic

The assistant should communicate naturally.

Never overwhelm users with data.

Surface only information that is useful right now.

### Simplicity beats features

If two solutions solve the same problem, always choose the simpler one.

Avoid adding features that increase complexity without improving the user's ability to remember purchases.

When multiple UX solutions exist, always choose the one with:

- fewer visible elements
- fewer taps
- less cognitive effort
- greater consistency



### Every screen must have a purpose

No screen should exist only to display data.

Every screen must help users:

- remember
- discover
- compare
- understand



### Progressive disclosure

Every screen should reveal information progressively.

Never overload users.

Hide advanced information until requested.

Use expandable sections whenever appropriate.

Users should never feel like they are looking at a database.

They should feel like they are browsing their own shopping memory.

### Consistency over special cases

Even categories with a single product type (for example Fuel) follow the same Purchase Card pattern.

Special cases that optimize one flow but break the mental model are forbidden.

---



## 3. Product Principles



### 1. Purchase First

The purchase is the center of the application.

Everything else (products, merchants, categories, insights) exists to provide context for a purchase.

Canonical browsing pattern:

**Category → Purchase List → Purchase Detail / Expandable Card → Products**

Never display products as the first screen of a category.

Purchases are the primary browsing unit.

Products are details of a purchase.

---



### 2. Offline First

The application must work without an internet connection whenever possible.

Cloud features should enhance the experience, not be required.

OCR / Vision analysis may require network when used; browsing, searching, and reviewing saved purchases must work offline.

---



### 3. User Input Should Be Minimal

Users should never type information that can be extracted automatically.

Prefer:

- OCR
- AI
- Suggestions
- History
- Smart Defaults
- User Correction Memory (reusing past edits)

over manual input.

---



### 4. AI Assists, Users Decide

AI may recommend, organize, summarize and explain.

AI must never silently modify user data.

Users always have the final decision.

OCR drafts are always reviewable before save.

---



### 5. Every Screen Must Be Useful

Every screen should help users:

- remember purchases
- find purchases
- compare purchases
- understand purchases

If a screen does not provide one of these values, it should be redesigned or removed.

---



### 6. Reduce Friction

Complete common tasks in as few steps as possible.

Avoid unnecessary dialogs, confirmations and forms.

Back behavior should follow native expectations (preserve search, filters, scroll, and history).

---



### 7. Explain Instead of Visualizing

Charts are optional.

Insights are essential.

Whenever possible, explain changes using natural language instead of charts.

---



### 8. Consistency Over Creativity

Similar actions should behave the same across the application.

Users should never wonder how something works.

---



### 9. Search Everywhere

Search is one of the core features.

Users should be able to find purchases by:

- merchant
- product
- category
- amount
- date
- notes
- tags

Search is memory retrieval, not filtering for its own sake.

---



### 10. Learning Never Stops

WasteLess should continuously improve by learning from:

- corrected OCR
- favorite merchants
- repeated purchases
- user edits
- search history
- expanded purchases / frequently opened details (when local signals exist)

without requiring explicit model retraining.

---



### 11. Purchase Date Is Truth

Users care about **when they bought it**, not when they entered it.

Use **actual purchase date / timestamp** consistently for:

- Recent Purchases
- timelines
- memory stats
- sorting lists

Entry creation time (`createdAt`) is metadata, not the primary sort key.

---



### 12. Never Overwrite Original OCR

Original OCR text and raw merchant / line values must be preserved.

Corrections are stored separately and applied to future drafts.

Learning improves drafts; it must not erase history of what the model originally saw.

---



## 4. User Experience Principles



### Design for Memory, Not Data

Every screen should help users remember something they have forgotten.

Avoid displaying information without context.

---



### Reduce Cognitive Load

Users should not think about where to tap next.

The interface should naturally guide them toward the next action.

---



### Show Only What Matters

Avoid visual clutter.

If information is not useful right now, don't display it.

Progressive disclosure is preferred.

Every visible component must justify its existence.

Prefer fewer high-quality sections over many average ones.

---



### Fast Feels Better Than Fancy

Animations should improve clarity.

Never slow users down.

Responsiveness is more important than visual effects.

Use subtle motion for presence and hierarchy (fade-in, soft expand, assistant crossfade). Do not decorate for decoration’s sake.

---



### Empty States Should Teach

An empty screen should never feel broken.

Every empty state should explain:

- why it is empty
- what users can do next
- why the feature is valuable

---



### Loading Should Feel Alive

Avoid blank screens.

Use skeleton loaders whenever possible.

Loading indicators should reassure users that progress is happening.

---



### Errors Should Help

Never blame users.

Every error message should:

- explain what happened
- explain why
- explain how to recover

---



### Less Typing, More Choosing

Prefer:

- smart suggestions
- history
- OCR
- quick actions

over manual typing.

---



### One Primary Action

Every screen should have one obvious primary action.

Avoid competing buttons with equal importance.

---



### Delight Through Small Details

Small interactions create trust.

Examples:

- subtle animations
- intelligent greetings
- live clock that makes the Home feel active
- contextual insights
- meaningful empty states
- smooth transitions
- localized dates (`27.07.2026`, Today, Yesterday — never raw `2026-07-27` in UI)

Avoid unnecessary decoration.

---



### Native Navigation Behavior

Follow native Android / mobile expectations:

- Hardware Back while the keyboard is open: first press closes the keyboard; second press navigates.
- Back from Purchase Detail after Memory search must return to **search results**, not Home.
- Preserve search text, scroll position, filters, and navigation history.

Hardcoding Back to Home is a product bug.

---



### Localized Time

Use localized dates everywhere.

Prefer:

- `27.07.2026`
- `Today` / `Yesterday` / relative forms when helpful
- Live clock on Home: `HH:mm:ss` while the app is open

Never present ISO date strings as the primary user-facing format.

---



## First Impression

Within the first 10 seconds, users should feel:

- "Wow, this looks great."
- "This app is smart."
- "I'll easily find what I'm looking for."
- "Now I'm curious about my past purchases."

Every first-time experience should create curiosity.

Users should immediately want to explore their purchase history.

The Home screen should invite exploration, not simply display information.

### First Five Seconds (No Scroll Target)

Within five seconds — ideally without scrolling — users should understand:

- what happened today (or in the selected period)
- what they recently bought
- where their money went (categories peek)
- what interesting observation the application discovered

Without feeling like they opened a finance dashboard.

### Delight Within Thirty Seconds

The application should create delight within the first 30 seconds of use.

It should feel:

- alive
- modern
- lightweight
- intelligent

---



## 5. Purchase Memory



### The Core Concept

WasteLess is a Purchase Memory application.

Its primary purpose is helping users remember purchases, not manage finances.

Everything in the application revolves around purchases.

Purchase Memory is the **flagship feature** of WasteLess.

---



### A Purchase Is More Than Money

A purchase is a memory.

Every purchase answers questions like:

- What did I buy?
- Where did I buy it?
- When did I buy it?
- How much did I pay?
- How often do I buy it?
- Was it cheaper before?

The application should preserve this memory.

---



### Purchases Are the Primary Entity

The purchase is the most important object in the application.

Products belong to purchases.

Merchants belong to purchases.

Categories organize purchases.

Insights explain purchases.

Everything starts from a purchase.

---



### Searching Is Remembering

Search is not a filtering tool.

Search is a memory retrieval tool.

Users should be able to search by:

- merchant
- product
- date
- category
- amount
- notes
- tags

Search results should help users instantly recognize the correct purchase.

---



### Timeline Over Lists

People remember events chronologically.

Whenever possible, purchases should be presented as a timeline instead of disconnected lists.

Time provides context.

---



### Calendar Memory

Many users remember purchases by date.

Examples:

"I bought it last Friday."

"It was around Christmas."

"I think it was in May."

Calendar browsing should be treated as a **first-class navigation method**, not an optional feature.

#### Why Calendar Memory Is Primary

People often remember **dates before products**.

A user may not recall the SKU name, but they remember:

- “it was last weekend”
- “right after payday”
- “during the trip in May”

Calendar Memory turns vague temporal memory into a browsable surface.

Calendar is not a reporting widget. It is a **memory door**.

---



### Timeline View

Timeline View presents purchases in chronological order with human-readable relative dates.

It should support:

- scanning by day / week clusters when helpful
- jumping from a hit into Purchase Detail
- preserving context when returning (Back stack)

Timeline is how users “walk through” their shopping past.

---



### Purchase Cards

Purchase Cards are the standard browsing atom across lists (category, history, tags, search hits where appropriate).

#### Collapsed (default)

- Merchant
- Date (localized + relative)
- Total
- Product count

Collapsed cards must stay calm. Do not dump tags, OCR badges, receipt chips, or full product lists on the collapsed face.

#### Expanded (on request)

- Products
- Receipt affordance
- OCR indicator / context
- Tags
- Notes

Users decide whether they want to see products.

Expandable sections transition smoothly.

---



### Purchase Details

Opening a purchase should answer every important question without requiring additional navigation.

A purchase detail page should clearly present:

- merchant
- purchase date and time (when known)
- total amount
- payment method (if available)
- purchased products
- categories / subcategory context
- receipt image (optional)
- notes
- tags
- AI / assistant insights when relevant
- related purchases when available

Editing must preserve original OCR fields (`rawText`, `merchantRaw`, item `rawText`).

---



### Merchant History

Every merchant should support a memory view:

- visit count
- first / last visit
- typical spend
- products commonly bought there
- price changes observed at that merchant

Merchant pages (or Memory results scoped to a merchant) help answer: “What do I usually get at Shell / Migros?”

---



### Product History

Every product memory should immediately surface:

- purchase count
- merchant count
- first purchase
- last purchase
- average price / unit price
- lowest price
- highest price
- latest price
- purchase frequency
- trend explanation in natural language

Example trend language:

**Good:** “Unit price increased 7%. Compared to your previous purchase.”

**Bad:** “↑ 7%”

---



### Related Purchases

Wherever helpful, surface related purchases:

- same product at other merchants
- same merchant around the same time
- same category in the same period

Related purchases deepen memory without forcing a new mental model.

---



### Purchase Comparison

Comparisons should be conversational:

- last time vs this time
- cheapest vs usual merchant
- this month vs last month for a category

Never require the user to do mental math across two tables.

---



### Purchase Frequency

Frequency observations are core memory:

- “You usually buy milk every 9 days.”
- “You haven’t purchased vitamins in 45 days.”

Frequency is derived from history — never from fixed schedules.

---



### Rich Purchase Context

Context includes:

- plate / fuel details when relevant
- pack counts
- subcategory nuance
- tags as lightweight memory labels (not a second category system)

Context should appear when it helps recognition, and stay hidden when it adds noise.

---



### Natural Language Explanations

Prefer sentences over labels.

Prefer stories over charts.

Prefer “why this matters” over “here is a metric.”

A purchase should never feel like a database record.

It should feel like revisiting a moment in time.

The application should help users understand how their buying habits evolve over time.

---



### Purchase Memory Flagship Summary (After Product Search)

After searching a product in Purchase Memory, display a rich summary including:

- Purchase count
- Merchant count
- First purchase
- Last purchase
- Average price
- Lowest price
- Highest price
- Latest price
- Trend explanation
- Purchase frequency
- Habits (most frequent merchant, cheapest / most expensive observations)
- Timeline of hits

Always explain trends.

---



## 6. AI Assistant



### Role

The AI Assistant is a **shopping companion**, not a chatbot.

It quietly observes, remembers, analyzes, and helps.

It presents **one helpful message at a time** on Home (rotating), and deeper lists on the Insights screen.

Users should eventually feel:

“I don’t need to remember it anymore. WasteLess already does.”

---



### Personality

- Calm
- Warm
- Observant
- Concise
- Respectful of privacy and attention
- Never preachy about spending guilt
- Never sarcastic about user habits

The assistant is a companion who notices patterns — not a financial advisor, not a parent, not a spreadsheet.

---



### Tone

Natural language. Conversational. Human.

Avoid robotic wording.

Do not display isolated labels like:

- Price Difference
- Purchase Frequency
- Merchant Trend

Instead use natural sentences:

- “Fuel prices have increased since your last visit.”
- “You usually buy this every 12 days.”
- “This is your cheapest purchase so far.”
- “You’ve been shopping more at Migros lately.”

---



### Natural Language Rules

- Prefer full sentences.
- Always include comparison context when talking about change.
- Prefer concrete names (products, merchants) over abstract metrics.
- Keep messages short enough to read in two seconds.
- One idea per message.

---



### What the Assistant Surfaces



#### Purchase summaries

- Recent activity framing (“Today you recorded 4 purchases…”)
- Milestone celebrations (“100 purchases recorded.”)



#### Price observations

- Unit price up / down vs previous purchase
- Cheaper merchant alternatives for the same product
- Fuel price averages and changes



#### Habit observations

- Purchase frequency
- Usual shopping weekday
- Days since last purchase
- “You haven’t visited Starbucks in 38 days.”



#### Merchant observations

- Most visited merchant
- Merchant becoming more frequent this month



#### Category observations

- Highest spending category
- Month-over-month category shifts explained in language



#### Recommendations (optional, never intrusive)

Recommendations must be soft and skippable.

Examples of acceptable companion suggestions (when implemented carefully):

- “You always buy fuel from Shell. A Quick Action could save a tap.”

Unacceptable:

- Blocking modals
- Nagging
- Forced pinning
- Upsells

This Product Bible prioritizes **observation messages** over recommendation CTAs. Recommendations may enter the Insight pool as conversational lines; they must not become a second Home product surface.

---



### Learning

The Assistant (and surrounding systems) should continuously improve from:

- OCR corrections (User Correction Memory)
- Frequently opened pages
- Most searched products
- Frequently expanded purchases
- Favourite merchants
- Pinned categories (if introduced)
- Quick Actions usage

Learning is local-first. Do not require cloud training loops for basic personalization.

---



### Memory

The Assistant’s “memory” is the user’s purchase history + correction memory + settings (for example display name for greetings).

It must not invent purchases.

If confidence is low, say less — or say nothing.

---



### Friendly Communication

Home Assistant card labeling should feel soft (“Asistan”), not clinical (“Akıllı içgörü engine output”).

Tap-through should lead to the relevant Memory / Category / Expense destination so the user can verify the story.

---



### Rotation Behavior (Home)

- Display one Assistant message at a time.
- Automatically rotate about every **5 seconds**.
- Pause when the user manually interacts (swipe / dots).
- Resume automatically afterwards.
- Never repeat the same message continuously.
- Prefer diversity across insight families on each Home visit.

---



### Things AI Must Never Do

- Silently overwrite user-edited fields.
- Overwrite original OCR (`rawText`, `merchantRaw`, item `rawText`).
- Invent merchants, prices, or products when unsure.
- Shame the user for spending.
- Pretend to be a licensed financial advisor.
- Require chat UI to deliver value.
- Dump multiple unrelated insights at once on Home.
- Use emoji spam or sticker-like overlays as the primary communication style.
- Call external models from the client with exposed API keys.
- Train on user data outside the product’s privacy commitments without explicit consent and architecture.

---



## 7. Insight Engine



### Purpose

The Insight Engine turns purchase history into **stories**.

Insights explain what happened. They do not dump charts.

Dashboard philosophy: **tell stories, avoid meaningless statistics, prefer natural language.**

---



### Insight Pool

Build an Insight Pool with multiple families, for example:

- Price Intelligence (increases, decreases, cheaper merchant)
- Shopping Habits (weekday, frequency, days since)
- Merchant Trends (most visited, rising merchant)
- Category Trends (highest spending category, MoM shifts)
- Purchase Frequency
- Savings / cheaper alternatives
- Records (largest purchase, average receipt, fuel average)
- Milestones (N purchases recorded)
- Reminders (habitual product overdue)
- Comparisons (week / month)
- Patterns
- Achievements / streaks (when meaningful and non-gamified)

Every Home visit should feel slightly different.

---



### Rotating Insights

On Home, insights appear through the Assistant card (one at a time).

On `/insights`, users can browse a fuller list.

---



### Priority System

Not every possible insight should be displayed.

Rank observations by:

- Importance
- Recency
- Uniqueness
- User behaviour relevance
- Interestingness

Surface only the highest-value observations.

Each generator assigns a priority score; the engine sorts and caps the pool.

---



### Freshness System

Avoid repeating identical cards unless the underlying data changed.

For Home:

- de-prioritize insight ids shown earlier in the session (`sessionStorage` or equivalent)
- prefer family spread so Home does not always open on the same price alert
- rotate starting position so the first card varies across visits

---



### Insight Expiration

Insights should become stale when:

- the underlying comparison window moves on
- the user has already acted / visited the destination repeatedly with no new data
- a stronger, more recent observation exists in the same family

Do not keep a “Price increased” insight forever after the next purchase resets the story.

---



### Categories of Insights (Engine Modules)

Documented families include (non-exhaustive; engine may grow carefully):

- Price increased / decreased
- Cheaper merchant for a product
- Monthly category comparison
- Highest spending product / category
- Most purchased product
- Most visited merchant
- Largest purchase
- Average receipt
- Average fuel price
- Most used tag
- Shopping weekday habit
- Days since last purchase
- Purchase milestones
- Purchase frequency reminders

---



### Milestones

Celebrate history without turning the app into a game:

- “100 purchases recorded.”
- “12 months of purchase history.”
- “50 fuel purchases tracked.”

Milestones create emotional attachment to the memory archive.

---



### Reminder Insights

Reminders must be based on historical patterns:

- “You usually buy pet food every 30 days. You may need it again soon.”

Never use fixed calendar schedules unrelated to the user’s own history.

---



### Title Clarity

Titles must describe exactly what the user is seeing.

Prefer:

- Highest Spending Category
- Most Visited Merchant
- Largest Purchase
- Unit price increased

Avoid misleading shorthand like “Most Category” or “Most Merchant”.

---



### Stories Instead of Statistics

Every insight should be readable as a sentence a friend might say.

If an insight cannot be spoken aloud naturally, rewrite it.

---



## 8. OCR & Receipt Intelligence



### Purpose

Turn a receipt photo (or bank screenshot) into **clean structured purchase data**, with human review before save.

Always prioritize the cleanest structured purchase data rather than raw OCR text dumps in the UI.

---



### OCR Pipeline (High Level)

1. Capture / select image
2. Image preprocessing (client): deskew, contrast enhancement, adaptive threshold variants
3. Primary Vision pass (server proxy — OpenAI Vision via Worker / API route)
4. JSON validation (Zod) + money / field preprocessing
5. Receipt Intelligence post-processing (structure, totals, VAT, products)
6. Optional second Vision pass when confidence remains low (alternate preprocess / fallback model)
7. Apply User Correction Memory for this merchant (draft only)
8. Present Review UI (progressive disclosure; products may start collapsed)
9. User edits → save
10. Record new corrections (append-only learning)

Never require model retraining for continuous improvement.

---



### Receipt Preprocessing

Improve difficult receipts using:

- deskew
- perspective correction (when feasible)
- contrast enhancement
- adaptive thresholding
- multiple OCR / Vision passes
- receipt structure analysis

Store / display the original photo for the user when possible; send enhanced variants to Vision for recognition quality.

---



### Merchant Normalization

Normalize merchant names to canonical forms where known (chains, fuel brands, etc.).

Keep `merchantRaw` as the original OCR merchant string.

Display uses normalized merchant when available.

---



### Product Cleaning

Product name cleaning must:

- strip VAT rate fragments (`%10`, `%20`, `KDV`) from display names
- preserve pack size in names when meaningful (`Su 1.5 L`)
- keep `rawText` as original line text
- merge split name fragments when structure analysis supports it

---



### VAT Cleanup

Never treat VAT totals (`TOPLAM KDV`) as the grand total.

Grand total candidates include forms like `GENEL TOPLAM`, `TOPLAM`, `ÖDENECEK`, cash/card paid amounts — with product-sum validation.

---



### Confidence Score

Confidence is a 0..1 signal from Vision + downstream checks.

Low confidence must:

- warn in Review UI
- encourage user verification
- optionally trigger a second Vision pass before review

---



### Validation

Validate structured output before accepting it into the draft:

- schema validation
- money coercion for Turkish formats (`1.023,50`)
- null over invention when unclear

---



### Sum Verification

Compare product line sums to the trusted total.

When inconsistent:

- surface a clear inconsistency warning
- offer to align total to product sum
- allow explicit user acknowledgment before save

---



### Impossible Value Detection

Filter impossible or corrupted prices (barcode-sized numbers, ghost zero-price menu sides when appropriate, quantities mistaken for money amounts such as `x999,99` as line totals).

Lower confidence when corruption is detected.

---



### OCR Correction Memory (Self-Improving OCR)

Whenever a user manually edits OCR results, store:

- Merchant key (normalized)
- Field type (merchant, itemName, total, category, date, …)
- Original OCR value
- Corrected value
- Correction source (`user`)
- Timestamp

Rules:

- Append corrections; do not overwrite history rows casually.
- Never overwrite the original OCR on the expense record.
- Future OCR drafts from the same merchant should reuse previous corrections when match confidence is sufficiently high (exact / normalized raw match).
- Lightly acknowledge in Review when prior corrections were applied (“Önceki düzeltmen uygulandı”).

This is continuous improvement **without** model retraining.

---



### Learning From Corrections

Correction Memory feeds the next draft.

Receipt Intelligence continues to clean structure independently of corrections.

Together they form a self-improving loop: **Vision → Intelligence → Corrections → Review → Save → Memory**.

---



### Review UX Principles for OCR

- Prefer structured fields over dumping `rawText`.
- Collapse long product lists by default on OCR review.
- Category picker must stay lightweight (parents first; expand one section).
- User remains the final authority.

---



## 9. Dashboard (Home Experience)



### Purpose

The Home screen is not a dashboard.

It is the application's welcome experience.

Its purpose is to make users feel:

- Welcome
- Curious
- Engaged

The Home screen should encourage users to return every day.

It should feel alive — never static.

---



### Emotional Goals of Home

Users should feel:

- Wow.
- This app is smart.
- I’ll easily find what I’m looking for.
- I’m curious about my previous purchases.

Home is a **purchase companion welcome**, not a finance cockpit.

---



### The Home Screen Should

- welcome the user
- highlight meaningful changes
- surface interesting insights (one at a time)
- make users curious about their purchase history
- answer “How active was today?” quickly

---



### The Home Screen Should NOT

- overwhelm users with statistics
- show every available feature
- become a reporting page
- become a settings page
- host Tags as a primary dashboard section
- dominate with the brand wordmark as the hero
- feel identical every day

---



### Information Priority (Recommended Order)

1. Greeting (+ optional name) and live date/time
2. Today’s / period Spending Summary (activity card)
3. Quiet Purchase Memory search field
4. Today’s Insight / Assistant (rotating)
5. Parent Categories
6. Recent Purchases (always at the bottom)
7. Quick Actions (if present — useful, but must not crowd the first viewport; may live on Add / dedicated management)

Settings remain available via header/nav — not as a Home content block.

---



### Greeting

Display a dynamic greeting based on time of day:

- Good morning / Günaydın
- Good afternoon / İyi günler
- Good evening / İyi akşamlar
- Good night / İyi geceler

Optionally greet by name when available:

“Günaydın, Umut”

Keep the greeting friendly but minimal.

The greeting — not the brand title — is the emotional entry point.

---



### Live Date & Time

Show a localized long date and a **live clock** that updates while the application is open.

This small detail makes the application feel active.

---



### Spending Summary Card

The Spending Summary Card is the primary card on the Home screen.

Its purpose is to immediately answer:

- How much have I spent today? (or this week / month / year)
- How many purchases / merchants / products are in scope?
- What was the latest purchase? (merchant + time), when available

The card should display:

- Today’s Spending (or period equivalent label such as “Bugünün harcaması”)
- Today’s Purchase Count
- Merchant count / Product count in scope
- This Month’s Spending and This Month’s Purchase Count when the product surfaces multi-horizon summary (period control may focus one horizon at a time while still supporting week/month/year)
- Optional meaningful comparison (vs yesterday / last week / last month) with understandable language — avoid percentage-only comparisons whenever possible

Compact period control (Bugün / Hafta / Ay / Yıl) belongs **inside** the summary card, not as a competing full-width strip that steals calm.

Quiet links to largest category / merchant may remain, but must not compete with the Assistant.

---



### Today’s Insight / Assistant

One Assistant observation at a time.

Auto-rotation (~5s) with pause on manual interaction.

This is the “smart companion” heartbeat of Home.

---



### Recent Purchases

Recent Purchases must:

- appear at the bottom of Home
- sort by **actual purchase date**
- use consistent Purchase Card language

Users return here to re-enter their latest memories quickly.

---



### Quick Actions

Quick Actions are one-tap purchase shortcuts for habitual spends (coffee, cigarettes, fuel, etc.).

Purpose:

- reduce friction for repeated memories
- capture something in one tap

They must never dominate Home if they create widget overload. Prefer availability from Add / Quick Buttons management when Home needs calm.

Editing a Quick Action must not rewrite historical purchases created from it.

---



### Purchase Memory Search on Home

A single quiet search field routes into Purchase Memory.

It is the flagship entry to remembering — not a chip carnival.

Avoid example chip rows that crowd the first viewport.

---



### Why Users Return Every Day

Users primarily return to WasteLess to:

1. Discover something new about their purchases.
2. Quickly add a new purchase.
3. Find a previous purchase.

The Home screen should always provide a reason to come back.

If nothing interesting has changed, the application should still surface meaningful observations, milestones, trends, or reminders.

The Home experience should feel fresh every day.

Different Assistant messages. Different insights. Different highlights.

---



### Remove Low-Value Content

Every visible component must justify its existence.

If a widget provides little value, remove it.

Tags belong on Tag pages, Purchase Detail, and Search — not as dashboard occupancy.

---



## 10. Search



### Purpose

Search is **memory retrieval**.

It is not a power-user filter panel first.

Users open search because they remember a fragment: a product name, a store, a rough amount, a trip tag, a date vibe.

---



### Universal Search

Support searching by:

- Merchant
- Product
- Date
- Amount
- Category
- Tags
- Notes

Results should help instant recognition (merchant, date, amount, product line context).

---



### Purchase Memory Search Experience

After a successful product/merchant query, show the flagship memory summary (counts, prices, trends, frequency, timeline).

Preserve query in the URL so Back restores results.

---



### Search UX Rules

- Treat empty query states as invitations (“What did I buy…?”), not errors.
- Do not auto-open the keyboard aggressively when arriving from a chip/deep link if that fights Android Back.
- Ranking should prefer recognizable purchases over exhaustive dumps.

---



## 11. Categories



### Purpose

Categories organize purchases into a browsable memory map.

They are not an accounting chart of accounts.

---



### Parent Categories

Users should initially see **Parent Categories** (Vehicle, Food, Shopping, Health, Home, Entertainment, …).

Parent categories reduce cognitive load on Home and in pickers.

---



### Child Categories

Parent categories expand into children.

In pickers:

- show parents first
- tap a parent to expand **only that section**
- collapsed sections stay hidden
- support nested expandable sections when needed
- allow “parent (genel)” spend when appropriate

The picker must always feel lightweight.

Avoid displaying dozens of options simultaneously.

---



### Purchase Organization

Expenses store a category id (leaf or parent) and optional subcategory detail when useful.

Canonical hierarchy uses parent/child relationships.

Special fuel / cigarette UX may exist as helpers, but browsing remains Purchase-first.

---



### Category Pages

Category pages follow:

**Category → (optional Subcategory) → Purchase List → Purchase Detail / Expand**

Never open with a product-first screen.

Fuel and similar categories still use Purchase Cards for consistency.

---



### Category Insights

Category pages may show:

- totals and trends with comparison captions
- quiet filters (collapsed by default when heavy)
- purchase lists grouped by time

Insights should remain stories, not chart walls.

---



## 12. Onboarding



### Purpose

Onboarding personalizes memory — it does not interrogate the user like a bank KYC form.

Collect only what improves recognition, defaults, and insights.

---



### Adaptive Personalization Themes

Onboarding may ask about (progressively, skippable):

- Vehicle (enables fuel / plate memory UX)
- Fuel type preferences
- Smoking (quick actions / category emphasis)
- Pets (frequency reminders for pet products)
- Children (relevant shopping patterns)
- Favorite supermarket (merchant normalization / insights)
- Goals (lightweight: “remember prices”, “track fuel”, “reduce duplicate buys” — never budget police)

---



### Adaptive Personalization Rules

- Everything is optional.
- Never block entering the app on a long form.
- Use answers to seed Quick Actions, category emphasis, and insight relevance.
- Allow changing answers later in Settings.
- Do not invent a heavy profile system before it earns its place.

---



### First-Run Emotional Goal

After onboarding (or skipping it), the first Home visit should still deliver the First Impression promise: calm, smart, curious.

---



## 13. Privacy



### Privacy Promise

Purchase memories are personal.

WasteLess defaults to **local-first** ownership of user data.

---



### Privacy Policy (Product Requirements)

The product and public policy must clearly state:

- What is stored on device
- What is sent to servers (receipt images for Vision analysis when used)
- That there is no account system required for core memory
- How to export and delete data
- How long photos / AI raw responses are retained on device
- That the user owns their data

---



### AI Disclosure

When Vision / AI analysis is used:

- Disclose that images are sent to the analysis provider via the app backend proxy.
- Disclose that results are reviewable before save.
- Do not imply that AI “sees everything forever in the cloud” if data is not retained server-side.

---



### Export

Users must be able to export their data (JSON or equivalent) including purchases, categories, tags, settings, and correction memory when present.

---



### Delete All

Users must be able to wipe local data completely.

Confirm destructively. Reseed only safe defaults (categories / quick buttons) after wipe.

---



### Photo Retention

Receipt images may be stored locally with the purchase for memory.

Users should understand this is on-device storage.

Do not upload photos to arbitrary third parties beyond the documented analysis path.

---



### Local-First Architecture

IndexedDB (Dexie) is the system of record on device.

Browsing and memory work offline.

---



### Cloud-Ready Architecture

The codebase should remain ready for optional future sync (for example Supabase) via repository abstraction — without making cloud mandatory.

Cloud sync, if introduced, must be explicit, consent-driven, and privacy-reviewed.

---



### User Ownership of Data

The user owns their purchase memory.

WasteLess is a steward of the experience, not the owner of the life archive.

---



## 14. Security



### Public GitHub Safety

Assume the repository may be public.

Never commit secrets.

Never commit `.env.local`, `.dev.vars`, private keys, or production credentials.

---



### Secret Management

- Local: `.env.local` for `OPENAI_API_KEY`
- Cloudflare: `wrangler secret put OPENAI_API_KEY`
- CI: repository secrets only (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, optional `OPENAI_API_KEY`)

---



### Backend Proxy

Vision / OpenAI calls go through the server Worker / API route.

The browser must never hold the OpenAI API key.

---



### API Key Protection

- No `NEXT_PUBLIC_` exposure of private keys
- No keys in client bundles
- No keys in `manifest.json`, PWA assets, or screenshots

---



### .env Rules

- Provide `.env.example` without real secrets
- Keep `.env*.local` gitignored
- Document required variables in README / deployment docs

---



### .gitignore Rules

Must ignore at minimum:

- `node_modules`
- `.next/` / `out/`
- `.env*.local`
- `.dev.vars`
- private keys (`*.pem`)
- local PWA generated service worker artifacts as configured by the project

---



### Security Checklist (Release)

- [ ] No secrets in git history for the release commit
- [ ] API routes / Worker require server-side key
- [ ] Dependencies audited for obvious critical issues when practical
- [ ] Destructive actions confirmed in UI
- [ ] Export / delete paths tested
- [ ] Privacy disclosure matches actual data flows

---



## 15. Architecture



### Offline-First

UI + IndexedDB operate without network.

Network is required for Vision analysis and deploy-time updates.

---



### Repository Abstraction

Data access should remain behind clear modules (`db` / future repositories) so swapping IndexedDB for a cloud-backed store does not rewrite the entire UI.

---



### Future Cloud Sync

Design for eventual optional sync:

- stable entity ids
- `updatedAt` timestamps
- exportable JSON shapes
- separation between local media and structured fields

Do not build sync prematurely.

---



### IndexedDB

Dexie schemas version carefully.

Migrations must preserve user memories.

Correction memory lives alongside expenses as first-class local data.

---



### Supabase Readiness

Keep domain types clean and serializable.

Avoid UI components talking to vendor SDKs directly.

If Supabase arrives, it should plug under the repository layer.

---



### Separation of Concerns

- `src/app` — routes / screens
- `src/components` — UI
- `src/lib` — domain logic (analytics, insights, OCR intelligence, money, merchants, categories)
- `worker` — Cloudflare Worker API for analyze
- `docs` — product + deployment truth

---



### Folder Structure Philosophy

Prefer domain modules over giant utils dumps.

Insight generators stay small and composable.

OCR intelligence stays testable without UI.

---



### Scalability

Scale by clarity first:

- progressive disclosure in UI
- capped insight pools
- indexed queries by date / category / merchant
- avoid loading entire photo blobs into every list row

---



### Runtime Shape (Current)

- Next.js 14 App Router PWA
- Static export for UI assets on Cloudflare
- Worker serves assets + `/api/analyze`
- OpenAI Vision for receipt parsing
- Dexie for local persistence

---



## 16. Coding Rules



### Product Alignment

Every PR should be justifiable against this Product Bible.

If a change makes WasteLess feel more like accounting software, reject it.

---



### TypeScript & Quality

- Prefer explicit domain types
- Validate external AI JSON
- Do not ignore confidence / inconsistency signals in OCR flows

---



### UI Rules

- Progressive disclosure by default
- Localized dates
- Purchase-date sorting for user-facing lists
- Smart Back — do not hardcode Home
- Category pickers: parents first
- Purchase Cards: collapsed calm / expanded detail

---



### AI / OCR Rules

- Never overwrite original OCR fields
- Record user corrections
- Prefer structured data in UI
- Keep API keys server-side

---



### Insights Rules

- Natural language descriptions
- Clear titles
- Priority + diversity for Home
- No bare percentage badges without context

---



### Dependencies

Add dependencies sparingly.

Prefer existing stack (Next, Tailwind, Dexie, date-fns, Zod).

---



### Comments & Docs

Do not comment the obvious.

Update this guide when product rules change — code and Bible must not drift silently.

---



## 17. Release Rules



### Production Readiness Requirements

Before calling a build production-ready:

1. **Product check:** Does this help purchase memory?
2. **UX check:** Is Home calmer / smarter — not denser?
3. **Navigation check:** Back stacks preserve context.
4. **OCR check:** Review path works; originals preserved; corrections recorded when applicable.
5. **Privacy check:** Disclosure matches data flow.
6. **Security check:** No secrets shipped to client or git.
7. **Version bump:** `package.json` + `app-version.ts` (+ `version.json` on deploy).
8. **Build:** `npm run build` succeeds.
9. **Deploy:** only when explicitly requested; use project deploy scripts.
10. **PWA cache:** document that users may need Settings → Update after deploy.

---



### Versioning

Use semver-style app versions visible in Settings.

Each meaningful production ship bumps the visible version so users can confirm they are on the intended build.

---



### Deploy Discipline

- Do not deploy half-finished mental model changes.
- Prefer cohesive releases (IA + companion voice + OCR learning) over isolated micro-features that conflict.
- Keep deployment docs accurate (`docs/DEPLOYMENT.md`).

---



### Definition of Done (Feature)

A feature is done when:

- it matches this guide
- empty / error / loading states exist
- Back behavior is correct
- copy is natural language where insights are involved
- it does not introduce an Anti Pattern below

---



## 18. Anti Patterns

WasteLess must **NEVER** become the following.

### Budgeting App

No envelopes, no “you are over budget” guilt loops, no monthly allowance policing as the product core.

### Accounting Software

No double-entry, no tax filing workflows, no chart-of-accounts complexity as the primary IA.

### Expense Tracker Identity

If marketing or UI starts saying “track expenses” more loudly than “remember purchases,” stop and correct course.

### Widget Overload

Do not fill Home with every feature the codebase can render.

Tags carousels, merchant carousels, quick-add strips, chip storms, and stacked insight lists that compete for attention are anti-patterns when they destroy calm.

### Statistics Dashboard

Charts without stories. Tables without recognition. Percentages without comparison context.

### Feature Dumping

Shipping many average features instead of fewer excellent memory experiences.

### Complex Forms

Long create flows that ask users to type what OCR / history could provide.

### Unnecessary Manual Typing

Forcing keyboard entry for merchant/product/category when suggestions exist.

### Duplicate Navigation

Multiple ways to the same place that disagree (for example Back to Home vs Back to search results).

### Confusing UX / Broken Mental Models

Product-first category screens for some categories and purchase-first for others.

Special-case UIs that teach the wrong model.

### Robotic Assistant

Label dumps, emoji spam, nagging recommendations, chatbot walls of text.

### Silent AI Mutation

Changing saved purchases without review.

Overwriting OCR originals.

### Secret Leakage

Client-side API keys. Secrets in git. Logging PII carelessly.

### Date Lies

Sorting “Recent” by entry time while labeling it as purchase recency.

### Static Home Forever

A Home that looks identical every day with no living assistant / insight freshness.

### Gamification Theater

Streaks and badges that distract from memory value.

Milestones are allowed; addiction loops are not.

### Cloud Mandatory Core

Making basic memory browsing require login or network.

---



## 19. Navigation & Information Architecture



### Bottom Navigation (Product Intent)

Provide fast access to:

- Home (companion welcome)
- Purchase Memory (flagship search/remember)
- Add (capture)
- Tags (organization layer — not Home occupancy)
- Settings

Exact tab set may evolve, but Memory and Add must remain first-class.

---



### Canonical Flows

1. **Capture:** Add → OCR/Manual → Review → Save → Home (or stay in flow if product decides later)
2. **Remember:** Memory → Query → Summary + Timeline → Purchase Detail → Back to results
3. **Browse:** Home Categories → Parent → Child → Purchases → Detail
4. **Organize:** Tags → Tag Detail → Purchases

---



### Back Stack Contract

- Preserve search query (`?q=`)
- Preserve scroll when browser history allows
- Prefer `history.back()` with safe fallback
- Keyboard-first Back guard on editable focus

---



## 20. Microcopy & Language



### Language

Primary product language for the current market build is Turkish in UI, with this Bible written in English for the team.

UI microcopy should stay warm, short, and specific.

---



### Forbidden Microcopy Patterns

- Bare `↑ 7%`
- ISO dates as primary display
- “Most Category” style ambiguity
- Blameful error text

---



### Preferred Microcopy Patterns

- “Unit price increased 7%. Compared to your previous purchase.”
- “Bugün” / “Dün” / `27.07.2026`
- “Önceki düzeltmen uygulandı.”
- “Detaya git →”

---



## 21. Success Metrics (Product, Not Vanity)

Measure whether WasteLess is succeeding as Purchase Memory:

- Time-to-find a remembered purchase
- OCR review completion rate (save after analyze)
- Correction reuse rate (drafts improved by prior edits)
- Daily return driven by Home curiosity (Assistant engagement)
- Search success (query → open purchase)
- Low friction capture (steps to save)

Do not optimize for “features shipped” or “widgets on Home.”

---



## 22. Document Governance



### This Guide Wins

When implementation drifts, update either the code or this guide — consciously.

### Expansion Rules

- Do not remove sections casually.
- Prefer expanding the correct section over inventing parallel docs.
- Keep the writing style: clear, firm, product-first.



### Related Docs

- `docs/DEPLOYMENT.md` — deploy mechanics
- `README.md` — developer quickstart

The Master Product Guide remains the product source of truth.

---

*End of WasteLess Master Product Guide.*