# WasteLess — Product Roadmap

Every feature must answer: *Does this help the user spend less or understand spending better?*

## Phase 1 — Foundation (shipped)

- [x] Dashboard with period trends
- [x] Purchase memory + price history
- [x] 22+ local insight generators (fuel, coffee, cigarette, recurring products, savings)
- [x] Category analytics (fuel, smoking, grocery)
- [x] Onboarding flow
- [x] Reports page (monthly/yearly)
- [x] Local product analytics (privacy-first)
- [x] Premium teaser (design only)
- [x] Receipt Engine SDK as dependency

## Phase 2 — Daily value (next)

| Priority | Feature | User value |
|----------|---------|------------|
| 1 | **Budgets by category** | "Am I over budget?" |
| 2 | **Trend charts** | Wire `SpendSparkline` + daily series on dashboard |
| 3 | **Car spend panel** | Wire `CarSpendPanel` on Araba category |
| 4 | **Shared EmptyState** | Consistent empty UX across all routes |
| 5 | **Subscription detection** | Recurring bills from `faturalar` + merchant patterns |

## Phase 3 — Intelligence

| Feature | User value |
|---------|------------|
| Price alerts | Notify when product price increases |
| Purchase reminders | "You usually buy milk every 5 days" → nudge |
| Inflation dashboard | Category-level price index from memory |
| Monthly report export | Shareable HTML/PDF summary |
| Expense forecasting | Project month-end spend |

## Phase 4 — Premium

Worth paying for (gates in product layer only):

- Unlimited receipt history
- Advanced AI insights (when LLM layer added)
- Price alerts + smart budgets
- CSV/Excel export (partially available)
- Family sharing
- Expense forecasting

## Technical debt

| Item | Impact | Action |
|------|--------|--------|
| `types.ts` imports parser `ChargeLine` etc. | Schema coupling | Introduce `ExpenseDraft` mapper at SDK boundary |
| Duplicate insight engine in `analytics.ts` | Drift | Remove unused `getSmartInsights()` |
| Unused components | Noise | Wire or delete `CarSpendPanel`, `SpendSparkline`, legacy `hero-*` |
| Dual analyze paths on `/add` | Complexity | Single SDK path only |
| Product KB in consumer settings | Confusion | Move to admin/dev route |

## Implementation order (recommended)

1. Budgets — highest daily utility
2. Trend charts — reuse existing analytics
3. Car spend panel — one import, big fuel UX win
4. Subscription detection — differentiated
5. Notifications — budget + renewal reminders
6. Premium monetization — after core loops prove retention

## Success metrics (local analytics)

Track via `product-analytics.ts`:

- Time to first receipt
- Receipt scan success rate
- Manual edit rate
- Screen views (home, memory, reports, add)
- Feature usage (insights opened, memory searches)

## Engine policy

**Frozen:** parser architecture, OCR prompts, validators.

Product work consumes `@/lib/receipt-engine-sdk` only. Engine improvements flow through SDK version bumps and regression suite.
