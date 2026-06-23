# CalorieDef — Product Roadmap

**Last updated:** 2026-06-21
**Owner:** Ethel (non-developer founder) · **Goal:** turn the personal prototype into a shareable, sellable app.

> **How to resume this project in a NEW chat session:** The AI assistant does **not** remember past
> sessions — but this file does. In a new session, open this repo and say:
> *"Read ROADMAP.md and let's continue from the current phase."*
> Keep the **Status Tracker** (bottom of this file) updated as we finish each step, so any future
> session knows exactly where we are. This file is the project's memory.

---

## The vision
A monthly meal-planning + calorie app (for Ethel & Yona today; for paying customers later) with:
- Reliable recipes, calories, and per-user calorie targets.
- Smart AI features (generate recipes from what's in the fridge, suggest a balanced day, answer questions).
- Multiple users, each with their own private account and synced data across devices.
- A path to charging money (subscription).

## Decisions already locked in
- **Data model:** a real **database is the source of truth** for recipes & calories; **AI adds smart
  features on top.** (We are NOT making the AI generate all core data live — LLMs can get calorie
  numbers wrong, which is unsafe for a nutrition app, and it would be slow + costly.)
- **AI provider:** start with **Google Gemini** (has a free tier). Can add ChatGPT/OpenAI later.
- **Keep the prototype:** the current GitHub Pages app stays live for testing & demos (see Two Tracks).

---

## Two tracks (they never interfere)

| | **Track A — Prototype** | **Track B — Real app** |
|---|---|---|
| Where | Current GitHub Pages site (single `index.html`) | New copy + a free backend (Supabase) |
| Data | Saved in your browser only | Cloud database, shared across users/devices |
| Use it for | Testing ideas, showing friends/family | The grown-up multi-user, sellable version |
| Login / sharing | No | Yes |
| Live link to show people | Yes (GitHub Pages) | Yes (Vercel/Netlify free link) |

**Workflow:** prove simple, in-the-browser ideas (design, layout) on Track A → build the real,
multi-user features on Track B. Some features (login, husband's shared data, a secure AI key)
**only** work on Track B because they need a backend.

---

## The phases

### Phase 0 — Prototype ✅ (done / ongoing)
- Working app on GitHub Pages, browser-only data.
- Recent fixes: fridge recipe matcher, day-popup sizing, shopping icons, custom-list visibility,
  optional Gemini AI recipe button (BYO key in browser).
- **Cost:** free. **Keep this as the demo.**

### Phase 1 — Foundation: accounts + shared data 🔑 (NEXT — biggest unlock)
**Goal:** Ethel & Yona each log in and share the same synced data on any device.
- Add **login** (email/password, and/or "Sign in with Google").
- Move data from the browser into a **cloud database** (Supabase).
- Put the app on real hosting (Vercel or Netlify) with a shareable link.
- **You do:** create free Supabase + Vercel accounts (guided, click-by-click); test on both phones.
- **I do:** all code, database setup, wiring login + sync.
- **Tools:** Supabase (free), Vercel/Netlify (free).
- **Cost:** ~free. **Effort:** the largest single leap; done in small steps.
- **Done when:** you and Yona log in on separate phones and see/edit the same data.

### Phase 2 — AI done right 🤖
**Goal:** AI features that scale safely to many users.
- Move the Gemini key onto the **server** (a small serverless function) — customers never paste keys;
  you hold one key and control cost.
- Database stays the source of truth; AI generates recipes, suggests days, answers questions, all
  grounded in the user's real data and calorie targets.
- **Tools:** Supabase Edge Function (or similar), Gemini.
- **Cost:** ~free at small scale (Gemini free tier). **Done when:** AI works with no user-pasted key.

### Phase 3 — Make it sellable 💳
**Goal:** strangers can sign up and pay.
- Visual polish, onboarding flow, your branding.
- **Payments:** Stripe subscription (free trial → monthly).
- **Legal:** privacy policy, terms of service, and a **nutrition/health disclaimer** (templates provided).
- **Tools:** Stripe, a legal-template generator.
- **Cost:** Stripe ~2.9% + 30¢ per charge; custom domain ~$12/yr.
- **Done when:** a test customer can subscribe and use the app end-to-end.

### Phase 4 — Launch & grow 🚀
- Custom domain, basic analytics, feedback collection.
- Optional later: native app-store version (iOS/Android).

---

## Cost summary (honest)
- **Phases 1–2:** basically **free** (free tiers cover you, Yona, and early testers).
- **Real money starts in Phase 3**, and grows mainly **as paying customers arrive** (i.e., when the
  app funds itself). A typical "we have real users now" bill is roughly **$25–50/month**, not upfront.

## Recommended toolkit
| Tool | Role | Where |
|---|---|---|
| **Supabase** | Accounts + database + secure AI key | supabase.com |
| **Vercel** or **Netlify** | Hosting + free shareable link | vercel.com / netlify.com |
| **Google Gemini** | AI features | aistudio.google.com/apikey |
| **Stripe** | Payments (Phase 3) | stripe.com |
| (keep) the current app design | Frontend | this repo |

## Accounts you'll create (when we reach each phase) — checklist
- [x] Google Gemini API key (aistudio.google.com/apikey) — done for the prototype
- [ ] Supabase account (Phase 1)
- [ ] Vercel **or** Netlify account (Phase 1)
- [ ] Stripe account (Phase 3)
- [ ] Domain name (Phase 3/4)

---

## What's mine vs yours (so expectations are clear)
- **I handle:** all code, database/server setup, AI integration, security, fixing errors, and giving
  you exact click-by-click instructions for any sign-up or configuration.
- **You handle:** decisions (features, design, pricing), creating free accounts (guided), testing on
  real devices, and the business/legal bits (with my templates). **No coding required from you.**

---

## Status Tracker  ← update this as we go
- **Current phase:** **Phase 1 in progress.**
- **Supabase project:** created — URL `https://teatxctcpkpgjmzaekvf.supabase.co` (publishable key embedded in `/app/index.html`).
- **Track B app:** lives at `/app/` in this repo (login + cloud-synced test page) — `app/index.html`.
- **Next concrete step:** user runs the database SQL + disables email confirmation (dev), then assistant merges so `/app/` goes live for cross-device sync testing.
- **After that:** add household sharing (so Yona sees the same data), then port the full meal-planner UI into Track B.
- **Open questions:** none blocking.

### Progress log
- 2026-06-21 — Repo cleaned up; prototype fixes shipped; Gemini AI recipe button added (BYO key);
  this roadmap created.
- 2026-06-21 — Phase 1 started: Supabase project created; built Track B login + cloud-sync page at
  `/app/`; database schema (table `app_state` + RLS) provided for the user to run.
