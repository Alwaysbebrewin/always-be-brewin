# Always Be Brewin — Technical Requirements v4.0
**Date:** September 2026  
**Changes from v3.0:** Full combo database (17 scored combos), live API integration plan, CORS solution, updated build status, web app launched on Netlify

---

## 1. Project Overview

**Always Be Brewin (ABB)** is a Magic: The Gathering Commander (EDH) deck building and combo discovery platform. Brewing companion — not just a deck organizer.

**Core user loop:** Spark → Discover → Refine → Complete

**Primary differentiator:** Proprietary ABB combo value scoring system (S/A/B/C grades, 0–100 score) across five weighted axes. No existing tool scores combos this way.

**Current status:** MVP web app live at https://sweet-concha-552c06.netlify.app — React via CDN, local combo database, live Scryfall pricing, TCGPlayer + Card Kingdom affiliate buy links. Next step: wire live Commander Spellbook search via backend proxy.

---

## 2. ABB Value Scoring System

### Five Axes — Default Weights

| Axis | Weight | Calculation |
|---|---|---|
| Effort | 35% | Piece count from Commander Spellbook API |
| Consistency | 30% | Color count from colorIdentity array |
| Budget | 20% | Live price sum from Scryfall API |
| Disruption Resistance | 10% | Inverse of piece count |
| Board Impact | 5% | Keyword classification of produces array |

### Scoring Algorithm (JavaScript — production ready)

```javascript
function scoreCombo(combo, totalPrice, style = 'all') {
  const w = styleWeights[style];
  const pieces = combo.uses.length;
  const colors = combo.colorIdentity.length;
  const desc = (combo.produces.map(p => p.feature?.name || '').join(' ')
    + ' ' + (combo.description || '')).toLowerCase();

  const effort      = Math.max(0, Math.round(100 - ((pieces - 2) / 4) * 100));
  const consistency = Math.max(0, Math.round(100 - colors * 12));
  const budget      = Math.max(0, Math.min(100, Math.round(100 - (totalPrice / 300) * 100)));
  const disrupt     = Math.max(0, Math.round(100 - pieces * 12));
  const impact      = desc.includes('win the game') ? 100
                    : desc.includes('infinite') || desc.includes('unlimited') ? 95
                    : desc.includes('each turn') || desc.includes('every turn') ? 85
                    : desc.includes('draw') || desc.includes('untap') ? 70
                    : desc.includes('damage') || desc.includes('token') ? 60 : 40;

  const total = Math.round(
    effort * w.effort + consistency * w.consistency +
    budget * w.budget + disrupt * w.disrupt + impact * w.impact
  );

  return {
    total,
    grade: total >= 80 ? 'S' : total >= 65 ? 'A' : total >= 45 ? 'B' : 'C',
    effort, consistency, budget, disrupt, impact
  };
}

const styleWeights = {
  all:    { effort:.35, consistency:.30, budget:.20, disrupt:.10, impact:.05 },
  glass:  { effort:.20, consistency:.30, budget:.15, disrupt:.10, impact:.25 },
  stax:   { effort:.40, consistency:.35, budget:.15, disrupt:.05, impact:.05 },
  turbo:  { effort:.15, consistency:.50, budget:.20, disrupt:.10, impact:.05 },
  tribal: { effort:.35, consistency:.35, budget:.20, disrupt:.05, impact:.05 },
  spell:  { effort:.30, consistency:.40, budget:.20, disrupt:.05, impact:.05 },
};
```

### Grades
- **S:** 80–100 — Elite. Run this combo.
- **A:** 65–79 — Strong. Worth including in most builds.
- **B:** 45–64 — Situational. Good in the right shell.
- **C:** 0–44 — Weak. Usually better options available.

---

## 3. Full ABB Combo Database — 17 Hand-Scored Combos

All combos scored, rules-verified, and ready for production database import.

### S Tier

#### Herd Baloth + Ivy Lane Denizen — S · 95
- **Colors:** Mono-Green | **Pieces:** 2 | **Price:** $1.79
- **Type:** Infinite Tokens
- **How it works:** Ivy Lane Denizen puts a +1/+1 counter on Herd Baloth when each green creature enters. Herd Baloth creates a 4/4 Beast token when a +1/+1 counter is placed on it. The Beast token is green, triggering Denizen again. Infinite 4/4 Beast tokens and infinite ETB triggers.
- **Upgrade path:** Hardened Scales (~$1), Ozolith (~$4), Hamza Guardian of Arashin (~$0.50)
- **Rules verified:** ✅ Confirmed

#### Presence of Gond + Midnight Guard — S · 93
- **Colors:** Selesnya (GW) | **Pieces:** 2 | **Price:** $0.52
- **Type:** Infinite Tokens
- **How it works:** Attach Presence of Gond to Midnight Guard. Tap Midnight Guard to create a 1/1 Elf token. The Elf entering untaps Midnight Guard via its triggered ability. Infinite 1/1 Elf tokens and infinite ETBs.
- **Upgrade path:** Impact Tremors (~$1), Altar of the Brood (~$1), Lightning Greaves (~$3)
- **Rules verified:** ✅ Confirmed — Midnight Guard untap is a triggered ability, not a cost

#### Basking Broodscale + Mazirek, Kraul Death Priest — S · 92
- **Colors:** Golgari (BG) | **Pieces:** 2 + trivial prereq | **Price:** $1.81
- **Type:** Infinite Loop (6 simultaneous infinite results)
- **How it works:** Sacrifice any permanent to trigger Mazirek — +1/+1 counter on each creature including Broodscale. Broodscale creates a 0/1 Eldrazi Spawn token. Sacrifice the Spawn for colorless mana, triggering Mazirek again. Loop produces: infinite colorless mana, infinite +1/+1 counters, infinite tokens, infinite ETBs, infinite death triggers, infinite sacrifice triggers.
- **Upgrade path:** Blood Artist (~$3), Zulaport Cutthroat (~$1), Altar of Dementia (~$5), Ashnod's Altar (~$4)
- **Rules verified:** ✅ Confirmed. Note: Broodscale is Pauper-banned due to this interaction.

#### Filigree Sages + Timeless Lotus — S · 92
- **Colors:** 5-Color (WUBRG) | **Pieces:** 2 | **Price:** $6.06
- **Type:** Infinite Mana
- **How it works:** Tap Timeless Lotus for WUBRG. Pay {2}{U} to Filigree Sages to untap Timeless Lotus. Net gain per cycle: +WBRG (the U is consumed by Sages but the rest accumulates). Zero prerequisites. Self-funding loop.
- **Upgrade path:** Exsanguinate (~$2), Lightning Greaves (~$3), Strionic Resonator (~$2)
- **Rules verified:** ✅ Confirmed. Note: No infinite blue mana — U is consumed each cycle.

#### Taii Wakeen + Blazing Volley (vs 2/2 tokens) — S · 91
- **Colors:** Boros (RW) | **Pieces:** 2 | **Price:** $0.75
- **Type:** Soft Lock + Mass Draw
- **How it works:** Activate Taii Wakeen paying {1}, tap — your damage sources deal +1 this turn. Cast Blazing Volley (R) dealing 2 damage to each opponent creature. Each 2/2 hit for exactly its toughness triggers Taii — draw a card per creature hit. Wipe boards of 2/2 tokens AND refill hand for {1}{R} flat. Scales freely — the more tokens opponents make, the more cards you draw for the same cost.
- **Upgrade path:** Revel in Riches (~$2 — per creature death, not per event), Zirda the Dawnwaker (~$3), Deflecting Palm (~$2)
- **Rules verified:** ✅ Confirmed. IMPORTANT: Spiteful Banditry is NOT a valid upgrade — "one or more creatures die" triggers once per event, not per creature. Revel in Riches IS per creature.

#### Radagast of Rhosgobel + Psychosis Crawler + Snake Umbra — S · 91
- **Colors:** Mono-Green | **Pieces:** 3 | **Price:** $4.92
- **Type:** Drain Engine + Self-Reinforcing Loop
- **How it works:** Radagast makes your first creature each turn cost {2} less with flash. ETB draw engines trigger on each free creature. Psychosis Crawler deals 1 damage to each opponent per draw. Attach Snake Umbra to Crawler — whenever Crawler deals damage, draw a card, triggering Crawler again. Self-reinforcing loop that can kill the table from one ETB trigger.
- **Upgrade path:** Garruk's Uprising (~$0.50), Guardian Project (~$3), Beast Whisperer (~$2)
- **Rules verified:** ✅ Confirmed. Radagast of Rhosgobel is from The Hobbit set (August 2026).

#### Scrawling Crawler + Forced Fruition + Narset, Parter of Veils — S · 88
- **Colors:** Mono-Blue | **Pieces:** 3 | **Price:** $15.53
- **Type:** Hard Lock
- **How it works:** Forced Fruition makes opponents draw 7 on each spell. Narset limits opponents to drawing 1 per turn — they discard 6 immediately. Scrawling Crawler deals 1 life per opponent draw. Every opponent spell costs 6 cards from hand and 1 life. Hard lock that empties hands and drains the table simultaneously.
- **Upgrade path:** Notion Thief (~$4), Alhammarret's Archive (~$8)
- **Rules verified:** ✅ Confirmed. Note: Scrawling Crawler also triggers on opponent's upkeep draw from its own ability — passive drain every turn.

#### Crackdown Construct + Lightning Greaves + Ornithopter — S · 88
- **Colors:** Colorless (any deck) | **Pieces:** 3 | **Price:** $3.50
- **Type:** Infinite Power — Glass Cannon
- **How it works:** Equip Lightning Greaves between Crackdown Construct and Ornithopter (or any other artifact creature). Each equip activation triggers Construct — +1/+1 until end of turn. Equip costs {0} so you can repeat infinitely. Construct becomes arbitrarily large. Attack for lethal. With Mountain + Sol Ring on T1, kills one opponent on Turn 2.
- **Kill speed:** T2 with Sol Ring acceleration. T3 without.
- **Upgrade path:** Chandra's Ignition (~$2 — deals damage equal to Construct's power to ALL opponents simultaneously), Grappling Hook (~$1), Kusari-Gama (~$2)
- **Rules verified:** ✅ Confirmed. Ornithopter is interchangeable — any 0-cost artifact creature works (Memnite, Phyrexian Walker, Shield Sphere).

#### Mind Over Matter + Otherworldly Atlas + Scrawling Crawler — S · 88
- **Colors:** Mono-Blue | **Pieces:** 3 | **Price:** $68.27
- **Type:** Draw Engine + Drain
- **How it works:** Tap Otherworldly Atlas (2+ charge counters) to draw cards for each player. Discard a card to Mind Over Matter to untap Atlas. Net +1 card per cycle. Scrawling Crawler deals 1 life to each opponent per draw. Loop until opponents drained or you draw your entire deck.
- **Note:** Mind Over Matter at ~$60 is the most expensive card on the leaderboard. The engine is S-tier power trapped in a B-tier budget score.
- **Budget alternative:** Freed from the Real + Otherworldly Atlas (~$2.50 total) — pay {U} per cycle instead of discarding. Estimated A · 82.
- **Win lines:** Thassa's Oracle (draw with empty library), Lab Maniac, Psychosis Crawler drain
- **Rules verified:** ✅ Confirmed

#### Mind Over Matter + Otherworldly Atlas (base) — A · 76
- **Colors:** Mono-Blue | **Pieces:** 2 + charged Atlas | **Price:** $61.50
- **Type:** Draw Engine
- **Note:** Opponents also draw from Atlas — without Narset or Scrawling Crawler this is table card advantage, not just yours. Score reflects the weakness.

---

### A Tier

#### Bloodthirsty Conqueror + Blight-Priest of Myrkul — A · 87
- **Colors:** Mono-Black | **Pieces:** 2 | **Price:** $18.98
- **Type:** Drain Engine
- **How it works:** Bloodthirsty Conqueror creates Vampire tokens when opponents lose life. Blight-Priest drains opponents when you gain life. Together create a drain and token engine that scales with life swings.
- **Rules verified:** ✅ Confirmed

#### Radagast of Rhosgobel + Psychosis Crawler (base) — S · 86
- **Colors:** Mono-Green | **Pieces:** 2 | **Price:** $3.42
- **Type:** Sustained Drain Engine
- **How it works:** Radagast makes first creature each turn free with flash. ETB draw engines trigger per creature. Psychosis Crawler deals 1 life per draw to each opponent. Net ~12 life drained per full turn cycle in 4-player pod. Scales exponentially as board grows.
- **Rules verified:** ✅ Confirmed

#### Electro, Assaulting Battery + Magda, the Hoardmaster + Soulbright Flamekin — A · 81
- **Colors:** Mono-Red | **Pieces:** 3 | **Price:** $6.85
- **Type:** Sustained Mana Engine
- **How it works:** Activate Soulbright Flamekin 3 times per opponent's turn targeting their creatures (committing crimes). Spend 6R, gain 8R, net +2R per activation set. Each crime triggers Magda for a Treasure token. Electro banks all red mana across turns. In 4-player pod: net +8R and 4 Treasures per full turn cycle.
- **Scoring note:** Uses "sustained exponential advantage" board impact category (85 pts) — not infinite but compounds each cycle.
- **Rules verified:** ✅ Confirmed. Soulbright generates 8R ONLY on the third activation — not 4th, 5th, or beyond.

#### Scrawling Crawler + Forced Fruition (base) — A · 76
- **Colors:** Mono-Blue | **Pieces:** 2 | **Price:** $13.53
- **Type:** Soft Lock + Drain
- **How it works:** Forced Fruition makes opponents draw 7 per spell. Scrawling Crawler drains 1 life per draw — 7 damage per opponent spell. Without Narset, opponents have large hands but the drain accumulates. Soft lock.
- **Rules verified:** ✅ Confirmed

#### Bramble Sovereign + The Notary Hobbits — A · 74
- **Colors:** Mono-Green | **Pieces:** 2 | **Price:** $6.15
- **Type:** Token Engine / Value Burst
- **How it works:** Cast The Notary Hobbits — Bramble Sovereign triggers ONCE (nontoken creature ETB). Pay {1}{G} → create one token copy. Original Notary ETB creates 2 Halfling tokens. Token copy ETB creates 2 more. Total: 5 Halflings on board for {1}{G}. Each Halfling taps for colorless equal to Halflings controlled. Net 25+ mana available with 7 invested.
- **RULES CORRECTION:** Previous score was S·88 — incorrect. Tokens do NOT re-trigger Bramble Sovereign ("nontoken creature" only). Cascade loop does not exist. Corrected to A·74.
- **Path to infinite:** Add Conjurer's Closet (~$2) — flicker Notary at end of turn returns it as a nontoken, triggering Bramble again each turn.
- **Rules verified:** ✅ Corrected and confirmed

---

### B Tier

#### Memnite + Bladehold War-Whip + Koll, the Forgemaster + Skullclamp — B · 57
- **Colors:** Boros (RW) | **Pieces:** 4 | **Price:** $3.06
- **Type:** Draw Engine / Value Loop
- **How it works:** Bladehold War-Whip reduces Skullclamp's equip cost from {1} to {0}. Equip Skullclamp to Memnite → becomes 2/0, dies immediately. Skullclamp triggers → draw 2. Koll triggers → Memnite (equipped nontoken) returns to hand. Recast Memnite free → equip free → repeat. Draw entire library for {0} mana per cycle.
- **Fun factor:** Very high — tells a story at the table. Opponents watch Memnite die and come back every cycle.
- **Needs win con:** Purphoros God of the Forge (~$12), Impact Tremors (~$1), Aetherflux Reservoir (~$8)
- **Scoring note:** 4 pieces is maximum effort penalty. B grade is honest and correct.
- **Rules verified:** ✅ Confirmed. Note: Koll is "Koll, the Forgemaster" — not Kirol.

#### Chatterfang Engine — B · 54
- **Colors:** Golgari (BG) | **Pieces:** 4 | **Price:** $7.75
- **Type:** Token Engine
- **Rules verified:** ✅ Confirmed

---

## 4. Rules Accuracy Flags — Known Misread Patterns

Two corrections made during scoring sessions. Flag these trigger patterns in the submission pipeline:

| Pattern | Risk | Example |
|---|---|---|
| "nontoken creature" | High | Tokens do NOT re-trigger Bramble Sovereign |
| "one or more creatures die" | High | Spiteful Banditry: 1 Treasure per EVENT not per creature |
| "whenever a creature dies" | Safe | Blood Artist, Revel in Riches: triggers per creature |
| Copy/token re-triggers | High | Copied tokens rarely re-trigger non-token abilities |
| Replacement effects vs triggers | Medium | Narset replaces draws, doesn't trigger on each draw |

**Submission pipeline rule:** Any combo description containing "nontoken" or "one or more" gets status `pending_rules_review` before publishing.

---

## 5. Live API Integration — Current Status & CORS Solution

### 5.1 Scryfall API
- **Status:** ✅ Working in production
- **CORS:** Browser-safe, no proxy needed
- **Use:** Card images, live prices, all printings sorted cheapest first
- **Rate limit:** 10 req/sec — cache 24 hours

```javascript
// Live price lookup
async function fetchPrice(cardName) {
  const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
  const data = await res.json();
  return parseFloat(data.prices?.usd || 0);
}

// All printings — cheapest first
async function getAllPrintings(cardName) {
  const q = encodeURIComponent(`!"${cardName}" -is:digital`);
  const res = await fetch(`https://api.scryfall.com/cards/search?q=${q}&unique=prints&order=usd&dir=asc`);
  const data = await res.json();
  return data.data.filter(c => c.prices?.usd || c.prices?.usd_foil);
}
```

### 5.2 Commander Spellbook API
- **Status:** ⚠️ CORS blocked in browser — requires backend proxy
- **Base URL:** `https://backend.commanderspellbook.com/api/variants/`
- **Auth:** None required
- **Search format:** `?q={cardName}&format=edh&limit=30`

### 5.3 CORS Solution — Three Options (pick one)

**Option A — Netlify Functions (recommended for current stack)**
Create a Netlify serverless function that proxies the Commander Spellbook call. Free on Netlify's free tier, no separate server needed, deploys alongside the existing site.

```javascript
// netlify/functions/spellbook.js
exports.handler = async (event) => {
  const { q } = event.queryStringParameters;
  const res = await fetch(
    `https://backend.commanderspellbook.com/api/variants/?q=${encodeURIComponent(q)}&format=edh&limit=30`
  );
  const data = await res.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
```

Frontend call (replaces all proxy attempts):
```javascript
const res = await fetch(`/.netlify/functions/spellbook?q=${encodeURIComponent(query)}`);
const data = await res.json();
```

**Option B — Railway backend (for full app build)**
Node.js/Express server on Railway. Required for user accounts, saved brews, and Stripe. Proxy is one route among many.

**Option C — Vercel Edge Functions**
Same as Netlify Functions but on Vercel. Works if frontend moves to Vercel.

**Recommendation:** Use Option A (Netlify Functions) now — it's free, requires no new account, and the existing site is already on Netlify. Unlocks the full Commander Spellbook database (54,000+ combos) with ABB scoring on every result.

### 5.4 File Structure for Netlify Functions

```
always-be-brewin/
├── index.html           ← existing app
├── netlify.toml         ← NEW: tells Netlify about functions
└── netlify/
    └── functions/
        └── spellbook.js ← NEW: the proxy function
```

**netlify.toml contents:**
```toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/.netlify/functions/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

**This is the next build step** — two new files and the app goes from 17 local combos to 54,000+ live searchable combos with full ABB scoring.

---

## 6. Cheapest Printing Finder

```javascript
// Deck-wide optimizer
async function findCheapestPrintings(deckCardNames) {
  const results = await Promise.all(
    deckCardNames.map(async name => {
      const printings = await getAllPrintings(name);
      if (!printings.length) return null;
      const cheapest = printings[0];
      const current = printings[printings.length - 1];
      const savings = (current.prices?.usd || 0) - (cheapest.prices?.usd || 0);
      return savings > 0.25 ? { name, cheapest, current, savings } : null;
    })
  );
  return results.filter(Boolean).sort((a, b) => b.savings - a.savings);
}
```

Real-world test result: $67.40 saved on a token Commander deck by swapping to cheaper printings of already-included cards.

---

## 7. Freemium Structure

### Free Tier
- Combo searches: 15/month
- Saved brews: 1
- Deck list view: text only
- Buy links (TCG + LGS): unlimited
- Cheapest printing finder: unlimited
- Daily Budget Combo: full access
- ABB scoring: full access

### Pro Tier — $4.99/month
- Unlimited searches and brews
- Visual brew page (card stacks, full art modal)
- Deck ranker + swap simulator
- Cut analysis
- Auto-fill with priority weights
- Mana base builder
- Maybe board + collection tracker
- Full import/export (Moxfield, Archidekt)
- Deck-wide cheapest printing optimizer

---

## 8. Tech Stack

| Layer | Technology |
|---|---|
| Frontend (current) | Vanilla HTML/JS/React via CDN — Netlify |
| Backend proxy (next) | Netlify Functions (serverless) |
| Backend (full build) | Node.js/Express on Railway |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Mobile (Phase 2) | React Native |

---

## 9. Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  search_count_this_month INT DEFAULT 0,
  search_count_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commander TEXT,
  color_identity TEXT[],
  card_list JSONB,
  combo_ids TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE combo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cards TEXT[] NOT NULL,
  description TEXT NOT NULL,
  submitter_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  rules_flags JSONB,
  abb_score INT,
  rules_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lgs_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  buy_link_template TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  monthly_fee DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE daily_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  cards TEXT[],
  abb_score INT,
  grade TEXT,
  total_price DECIMAL,
  description TEXT
);

CREATE TABLE search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  searched_at TIMESTAMPTZ DEFAULT NOW(),
  cards TEXT[],
  result_count INT
);
```

---

## 10. LGS Affiliate System

- **Model:** LGS pays flat monthly fee ($50–$150) for placement alongside TCGPlayer
- **User flow:** Set "preferred LGS" in profile — all buy link rows show LGS option
- **Phase 1:** Manual agreements with individual stores
- **Phase 2:** Self-serve LGS portal

---

## 11. Build Priority — What's Next

### Immediate (this week — no new accounts needed)
1. Create `netlify/functions/spellbook.js` — proxy function (15 min)
2. Create `netlify.toml` — build config (5 min)
3. Update `index.html` search function to call `/.netlify/functions/spellbook`
4. Push all three files to GitHub → Netlify auto-deploys
5. **Result:** 54,000+ live searchable combos with ABB scoring

### Short term (new developer pickup)
6. Add remaining 5 scored combos to local database as fallback
7. Supabase schema setup — paste provided SQL
8. Supabase Auth — Google + email login
9. Stripe — subscriptions, free trial, paywall
10. Saved brews — wire to Supabase
11. Free tier limits — search counter

### Launch
12. LGS partner onboarding — first store
13. Daily combo automation
14. QA + beta with playgroup
15. Post to r/EDH + r/CompetitiveEDH

---

## 12. Current Prototype

- **Live URL:** https://sweet-concha-552c06.netlify.app
- **GitHub:** https://github.com/alwaysbebrewin/always-be-brewin
- **Password:** None (public)
- **Old prototype:** https://steady-genie-b310d6.netlify.app (pw: My-Drop-Site)

---

## 13. Reference Links

| Resource | URL |
|---|---|
| Commander Spellbook API docs | https://commanderspellbook.com/api/docs/ |
| Scryfall API docs | https://scryfall.com/docs/api |
| TCGPlayer affiliate | https://www.tcgplayer.com/affiliates |
| Card Kingdom affiliate | https://www.cardkingdom.com/affiliates |
| Netlify Functions docs | https://docs.netlify.com/functions/overview/ |
| Supabase docs | https://supabase.com/docs |
| Stripe docs | https://stripe.com/docs |
| EDHREC (meta reference) | https://edhrec.com |
| Moxfield (import format ref) | https://moxfield.com |
| Archidekt (UI pattern ref) | https://archidekt.com |

---

*Always Be Brewin — Confidential & Proprietary*
*v4.0 — September 2026*
