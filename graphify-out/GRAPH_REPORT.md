# Graph Report - gymapp  (2026-06-09)

## Corpus Check
- 96 files · ~100,650 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 510 nodes · 574 edges · 59 communities (43 shown, 16 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e93c9e1d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `get_admin_client()` - 14 edges
4. `expo` - 13 edges
5. `/graphify` - 11 edges
6. `What You Must Do When Invoked` - 11 edges
7. `send_whatsapp()` - 8 edges
8. `Icon()` - 8 edges
9. `🏋️ Lexus Fitness Group — Free Stack + WhatsApp` - 8 edges
10. `formatDate()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `MemberDetailPage()` --calls--> `formatDate()`  [EXTRACTED]
  web/src/pages/MemberDetail.tsx → web/src/lib/fees.ts
- `search_members()` --calls--> `get_db_client()`  [EXTRACTED]
  backend/api/routes/members.py → backend/api/database.py
- `run_cron_reminders()` --calls--> `get_admin_client()`  [EXTRACTED]
  backend/api/routes/cron.py → backend/api/database.py
- `payment_webhook()` --calls--> `get_admin_client()`  [EXTRACTED]
  backend/api/routes/payments.py → backend/api/database.py
- `save_settings()` --calls--> `get_admin_client()`  [EXTRACTED]
  backend/api/routes/settings.py → backend/api/database.py

## Import Cycles
- None detected.

## Communities (59 total, 16 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (37): get_current_user(), FastAPI dependency to validate user JWT session token.     Raises 401 Unauthoriz, get_admin_client(), get_db_client(), Returns a client-side Supabase client.     If an Authorization header is provide, Returns an admin Supabase client using the service role key, bypassing RLS., str, Request (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (34): dependencies, date-fns, framer-motion, jspdf, lucide-react, react, react-dom, react-router-dom (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (32): dependencies, expo, expo-constants, expo-font, expo-linking, expo-router, expo-splash-screen, expo-status-bar (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (14): unstable_settings, styles, styles, styles, ExternalLink(), MonoText(), Text(), TextProps (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (6): buildReminderMsg(), feeStatus, formatDate(), M, MemberRow(), Tab

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (10): blankDiary(), DiaryEntry, DiaryRow, DietItem, DietMeal, Exercise, FoodDiary(), MOODS (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (10): blankDay(), blankExercise(), blankItem(), blankMeal(), DAY_DEFAULTS, DietItem, DietMeal, Exercise (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (12): 1) Supabase, 2) WhatsApp — pick ONE, 3) App, 4) Deploy to Vercel (free), Customising messages, Features, 🏋️ Lexus Fitness Group — Free Stack + WhatsApp, License (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.21
Nodes (5): Icon(), ICONS, FLOAT_ICONS, NAV_LINKS, STARS

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (11): dependencies, express, puppeteer, qrcode-terminal, whatsapp-web.js, main, name, scripts (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (6): generateBill(), generateInvoice(), gymDetails, setGymDetails(), setLogoBase64(), setSealBase64()

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (9): dependencies, express, qrcode-terminal, whatsapp-web.js, name, private, scripts, start (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.38
Nodes (4): addDays(), getTodayString(), NewMember(), PLANS

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (7): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (7): apiFetch(), DEFAULT_SETTINGS, GYM_KEYS, MSG_KEYS, PLACEHOLDERS, SETTINGS_KEYS, supabase

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): app, client, { Client, LocalAuth, MessageMedia }, express, qrcode

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): app, client, { Client, LocalAuth }, express, qrcode

### Community 25 - "Community 25"
Cohesion: 0.40
Nodes (4): editor.codeActionsOnSave, source.fixAll, source.organizeImports, source.sortMembers

### Community 26 - "Community 26"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 27 - "Community 27"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 28 - "Community 28"
Cohesion: 0.50
Nodes (3): For /graphify explain, For /graphify path, graphify reference: query, path, explain

### Community 29 - "Community 29"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 30 - "Community 30"
Cohesion: 0.50
Nodes (3): builds, crons, routes

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 56 - "Community 56"
Cohesion: 0.70
Nodes (4): get_last_synced_id(), init_local_tracker(), start_sync(), update_last_synced_id()

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (12): generate_invoice_pdf(), InvoicePDF, Generates a premium invoice receipt PDF using fpdf2.     Matches coordinate offs, Unified WhatsApp sender. Selects provider based on WA_PROVIDER env variable., send_via_evolution(), send_via_local(), send_via_meta(), send_whatsapp() (+4 more)

## Knowledge Gaps
- **252 isolated node(s):** `PreToolUse`, `str`, `Request`, `Request`, `Response` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_admin_client()` connect `Community 0` to `Community 57`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `PreToolUse`, `str`, `FastAPI dependency to validate user JWT session token.     Raises 401 Unauthoriz` to the rest of the system?**
  _262 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06207482993197279 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._