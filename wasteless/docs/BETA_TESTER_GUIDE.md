# WasteLess Beta Tester Guide

Thank you for testing WasteLess closed beta (`v1.0.0-beta.1`). This guide covers install, scanning, feedback export, and bug reporting.

## What you're testing

WasteLess is a **privacy-first spending assistant**:

- Scan receipts → auto-extract products, amounts, categories
- All saved expenses stay **on your device** (no account, no cloud sync)
- Receipt images are sent to our server **only during scan** for AI analysis

---

## Install the app

You need the beta URL from the team (Cloudflare Workers HTTPS endpoint).

### Android (Chrome)

1. Open the beta URL in **Chrome**
2. Tap the **menu (⋮)** → **Add to Home screen** or **Install app**
3. Confirm the install prompt
4. Launch **WasteLess** from your home screen

**Tip:** After install, the app opens in standalone mode (no browser chrome).

### iOS (Safari)

1. Open the beta URL in **Safari** (not Chrome — iOS PWA install works best in Safari)
2. Tap the **Share** button
3. Scroll down → **Add to Home Screen**
4. Tap **Add**
5. Launch from the home screen icon

**Note:** iOS does not support “Open with WasteLess” from the gallery; use the in-app scanner instead.

---

## First run

1. Complete the **onboarding tour** (4 slides)
2. Optionally enter your **display name** (used in home greeting)
3. You'll land on the home screen — tap **Ekle** (bottom nav) to scan your first receipt

---

## Scan a receipt

1. Go to **Ekle** (`/add`)
2. Choose a source:
   - **Kamera** — take a photo
   - **Galeri** — pick an existing image
   - **Manuel** — enter expense by hand
3. Wait for analysis (requires internet)
4. **Review** extracted merchant, date, line items, and total
5. Edit anything wrong (tap fields, fix categories)
6. Tap **Kaydet** to save

### Tips for better scans

- Flat, well-lit photo; avoid glare and shadows
- Include the full receipt including total
- Check **highlighted** or low-confidence lines before saving
- If scan fails, use **Tekrar dene** or switch to manual entry

### Android shortcut

If you installed the PWA, long-press the icon may show **Fiş tara** shortcut → opens `/add` directly.

---

## Main navigation

| Tab | Purpose |
|-----|---------|
| Ana Sayfa | Dashboard, quick stats, recent expenses |
| Hafıza | Search purchase history (“when did I last buy milk?”) |
| Ekle | Scan or add expense |
| Etiketler | Manage tags (trips, projects) |
| Ayarlar | Settings, feedback, export, update |

---

## Export feedback

Feedback is stored **locally** until you export it — nothing is sent automatically.

### Submit feedback

1. **Ayarlar** → **Geri bildirim**
2. Choose type: OCR error, parsing error, feature request, or rating
3. Write your message
4. Optionally attach last scan metadata (confidence score, app version)
5. Tap **Gönder**

### Export feedback JSON

1. **Ayarlar** → **Beta** section
2. If you have saved feedback, tap **Geri bildirimi dışa aktar (JSON)**
3. A file like `wasteless-feedback-2026-07-30.json` downloads
4. Send that file to the team (email, Slack, etc.)

You can submit multiple entries before exporting.

---

## Report bugs

Please include as much as possible:

| Field | How to get it |
|-------|---------------|
| What you did | Step-by-step |
| What you expected | |
| What happened | Screenshot or screen recording helps |
| Device | e.g. iPhone 14, Samsung S23 |
| Browser | Safari, Chrome |
| App version | **Ayarlar** → Sürüm (shows `1.0.0-beta.1`) |

### Preferred workflow

1. Submit in-app feedback (**Ayarlar → Geri bildirim**)
2. Export JSON (**Ayarlar → Geri bildirimi dışa aktar**)
3. Share the JSON + screenshots with the team

### Privacy reminder

- Feedback JSON may include scan confidence and app version — **not** your receipt image unless you attach a screenshot separately
- Expense data export is separate: **Ayarlar → Verileri dışa aktar**

---

## Update the app

When a new beta build is deployed:

1. Open WasteLess (online)
2. You may see a **Güncelleme hazır** banner → tap **Yenile**
3. Or go to **Ayarlar → Güncelle**

If the version under **Sürüm** matches the server version, you're up to date.

---

## Offline behavior

- Previously visited pages may work offline (service worker cache)
- **Saved expenses** are always available locally
- **New receipt scans** need internet
- If navigation fails offline, you'll see the **Çevrimdışı** page with a link home

---

## FAQ

**Do I need an account?**  
No. Everything is stored on your device.

**Is my data backed up?**  
Not automatically. Use **Verileri dışa aktar** in Settings for a JSON backup.

**Can I delete everything?**  
Yes — **Ayarlar → Tüm verileri sil** (irreversible).

**Why did OCR get something wrong?**  
Beta OCR isn't perfect. Edit before saving and send feedback so we can improve.

---

## Contact

Use the channel shared with your beta invite (email/Slack) and attach exported feedback JSON when possible.

**Version:** 1.0.0-beta.1
