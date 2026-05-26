# 🏪 Mini Market AL SAYYAH

A Progressive Web App (PWA) for AL SAYYAH Mini Market — installable on Android, connected to Supabase.

## 🚀 Features

- **Splash Screen** with connection check
- **Home Screen** — browse categories (scrollable row), search products
- **Barcode Scanner** — uses phone camera with `BarcodeDetector` API + manual entry fallback
- **Admin Panel** — login, add/edit/delete products & categories, set exchange rate
- **Dual Pricing** — USD and Lebanese Pound (LBP) with live exchange rate
- **PWA** — installable on Android (and iOS via Safari "Add to Home Screen")
- **Supabase Backend** — real-time data from your database

---

## 📱 Install on Android

1. Open the app in Chrome on Android
2. Tap the **"⬇️ Install"** button (top right) OR
3. Chrome will show a banner: **"Add AL SAYYAH to Home Screen"**
4. Tap Install — the app opens like a native app!

---

## 🗄️ Database Setup

Run the SQL in `supabase_setup.sql` in your **Supabase SQL Editor**:

1. Go to [supabase.com](https://supabase.com) → your project
2. Click **SQL Editor**
3. Paste contents of `supabase_setup.sql` and click **Run**

This creates:
- `store_admins` — admin login (default: admin / admin123)
- `categories` — product categories with icons
- `items` — products with barcode, name, USD price, LBP price
- `system_settings` — exchange rate (default: 1 USD = 90,000 LBP)

---

## 📂 File Structure

```
alsayyah/
├── index.html          # Main app (all screens)
├── manifest.json       # PWA manifest (install config)
├── sw.js               # Service worker (offline support)
├── css/
│   └── style.css       # All styles
├── js/
│   ├── supabase.js     # Supabase API client
│   └── app.js          # App logic & routing
├── icons/
│   ├── icon-192.png    # App icon
│   └── icon-512.png    # App icon (large)
└── supabase_setup.sql  # Database setup script
```

---

## 🌐 Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `alsayyah-market`)
2. Upload all files in this folder to the repo
3. Go to **Settings → Pages**
4. Set source: **Deploy from branch → main → / (root)**
5. Your app is live at: `https://yourusername.github.io/alsayyah-market/`

---

## 🔑 Admin Login

Default credentials (change in Supabase):
- **Username:** `admin`
- **Password:** `admin123`

> ⚠️ Change your password in the `store_admins` table after first login!

---

## 📷 Barcode Scanner

The scanner uses the browser's **BarcodeDetector API** (supported in Chrome on Android).

- Works with: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR codes
- Fallback: manual barcode entry field (works everywhere)

---

## 💱 Exchange Rate

Admins can update the USD→LBP rate from the Admin Panel.
All product LBP prices auto-calculate when adding items based on the current rate.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework — fast & lightweight)
- **Backend:** Supabase (PostgreSQL + REST API)
- **PWA:** Web App Manifest + Service Worker
- **Barcode:** Native BarcodeDetector API
- **Fonts:** Google Fonts (Nunito + Poppins)
