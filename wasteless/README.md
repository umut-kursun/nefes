# WasteLess

Mobile-first PWA spending assistant + purchase memory.

**Harcama asistanı ve satın alma hafızası**

## Features (MVP)

- Upload receipt photos or bank screenshots
- OpenAI vision extraction via secure API route
- Review / edit / save before persisting
- Daily, monthly, yearly totals + trend vs previous period
- Category detail pages for Yeme-İçme, Sigara, Akaryakıt
- One-tap quick expense buttons
- Local IndexedDB persistence (Dexie)
- Installable PWA

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- OpenAI API
- Dexie (IndexedDB)
- `@ducanh2912/next-pwa`

## Setup

```bash
cd wasteless
npm install
cp .env.example .env.local
```

Add your OpenAI key to `.env.local`:

```
OPENAI_API_KEY=sk-...
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- API key never ships to the browser; analysis goes through `/api/analyze`.
- Expense and quick-button data stay on-device.
- Editing a quick button does not rewrite past expenses created from it.
