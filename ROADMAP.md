# CalorieDef — Product Roadmap

**Last updated:** 2026-06-28
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

### Phase 2 — AI done right 🤖 (mostly done ✅)
**Goal:** AI features that scale safely to many users.
- ✅ Gemini key moved onto the **server** as a secret — two Supabase Edge Functions live:
  `fridge-recipes` (recipes from what's in the fridge) and `scan-meal` (photo → calories).
  Customers never paste keys; one key, cost controlled centrally.
- ✅ Database stays the source of truth; AI adds smart features on top (fridge recipes grounded in
  the user's calorie targets; the built-in recipe matcher only suggests dishes the user can mostly make).
- **Remaining:** broaden AI (suggest a balanced day, Q&A) and verify the Edge Functions are deployed
  with the latest prompt + the `GEMINI_API_KEY` secret set in the live Supabase project.
- **Tools:** Supabase Edge Function, Gemini.
- **Cost:** ~free at small scale (Gemini free tier). **Done when:** AI works with no user-pasted key. ✅

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
- **Current phase:** **Phase 1 (accounts + shared data) nearly complete; Phase 2 (server-side AI) mostly done ✅**
- **Supabase project:** created — URL `https://teatxctcpkpgjmzaekvf.supabase.co` (publishable key embedded in `/app/index.html`). Table `app_state` + RLS created; email confirmation OFF for dev.
- **Track B app:** lives at `/app/` → https://etheldayan-lab.github.io/CalorieDef/app/ (login + cloud-synced). Tested working across devices with a shared login.
- **Full app ported:** `/app/` = login gate (`app/index.html`) → full meal-planner (`app/menu.html`) backed by cloud data. Track B uses its own localStorage key `menuapp.cloud.v1` (isolated from the prototype) and pushes changes to Supabase `app_state`. Logout button injected top-left.
- **Server-side AI ✅:** Edge Functions `supabase/functions/fridge-recipes` and `scan-meal` hold the Gemini key as a server secret (no BYO-key needed in Track B).
- **Recent app work (June 28):** Settings units-in-labels + centered values; narrowed BMI target band (~3 kg around BMI 22); fridge "set as today's breakfast/lunch/dinner" buttons; fridge scroll-to-top fix; food **dislikes** now hide matching recipes everywhere; **stricter fridge matcher** (must have the main ingredients; pantry/seasoning assumed); **period mode reshapes the whole menu by phase**; period feature is **gender-aware** (female shows, male hidden, "no gender" gets a Settings toggle) and **per-user**. Also fixed a build bug where the bundled template's `</script>` wasn't escaped (app rendered blank) — now verified rendering in a headless browser before each push.
- **Next concrete step → household sharing:** give Ethel & Yona their own separate logins that share one household's data (needed for selling: each customer = one household). Needs a `households` table, member linking, and updated RLS so `app_state` is keyed by household, not by individual user.
- **Also still to do:** test full app across both phones; broaden AI (balanced-day suggestion, Q&A); turn email confirmation back ON before launch.
- **Open questions:** none blocking.

### Progress log
- 2026-06-21 — Repo cleaned up; prototype fixes shipped; Gemini AI recipe button added (BYO key);
  this roadmap created.
- 2026-06-21 — Phase 1: Supabase project + `app_state` table/RLS; built `/app/` login gate +
  cloud-synced full app (`menu.html`); two-way sync via Realtime + poll/focus, normalized-compare
  to avoid reload loops.
- 2026-06-21 — Applied new "calm modern wellness" redesign as `/app/menu.html` (clean React/CDN
  build, same data/features, key renamed to `menuapp.cloud.v1`, cloud-sync shim re-attached).
  Root prototype still shows the OLD look.
- 2026-06-21 — Swapped the redesign to the **offline-bundled** version (fonts + React embedded in
  the file, no external CDN for the app) for reliability — the CDN build may have failed to load on
  mobile. Same look + features; cloud-sync shim re-attached in the outer head.
- 2026-06-28 — Settings polish (units in labels, centered numbers, ~3 kg BMI target band);
  fridge "set as today's meal" buttons + scroll-to-top fix; food dislikes hide matching recipes;
  stricter fridge matcher (have the main ingredients; pantry assumed); period mode now reshapes the
  whole menu by phase and is gender-aware + per-user. Confirmed Phase 2's server-side AI Edge
  Functions are in the repo. Fixed a blank-screen build bug (unescaped `</script>` in the bundled
  template) and added a headless-browser render check to the edit workflow.
