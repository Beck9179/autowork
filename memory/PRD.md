# Cash Claw — PRD

## Vision
A mobile "cash claw" that lets users **discover AI agents from GitHub, deploy them with one tap, watch them evolve (learn), and earn money on autopilot.** Cyberpunk/neon aesthetic.

## Stack
- Frontend: Expo SDK 54, expo-router, react-native-reanimated, @expo/vector-icons
- Backend: FastAPI + MongoDB (Motor)
- No auth for v1 (single demo user, `user_demo`)

## Screens (tabs + detail)
1. **Vault (Dashboard)** — Hero total-earnings card (live tick), active/pending KPIs, featured agent, my fleet.
2. **Cluster (Marketplace)** — Category chips (all/trading/content/social/scraping/tasks) + agent cards with deploy button.
3. **Ranks (Leaderboard)** — Top agents ranked by total earned with top-3 gold/cyan/magenta glow.
4. **Wallet** — USDC balance, withdraw modal, recent payouts list.
5. **Operator (Profile)** — Avatar, handle, stats (agents / XP / earned), settings list.
6. **Agent Detail** `/agent/[id]` — Hero, simulated earnings sparkline, evolution XP/level bar, community stats, deploy/pause CTA.

## Backend endpoints
`GET /api/agents`, `GET /api/agents/{id}`, `POST /api/deploy`, `POST /api/deploy/{id}/toggle`,
`GET /api/my-agents`, `GET /api/dashboard`, `GET /api/leaderboard`,
`GET /api/wallet`, `POST /api/wallet/withdraw`, `GET /api/profile`, `GET /api/categories`.

## Earnings simulation
Tick-on-request: whenever a deployed agent is queried, backend advances `earned_total` and `xp` proportional to seconds elapsed since `last_tick_at`, scaled by the agent's `base_daily_earning`, `volatility`, and the deployment `level`. Wallet balance grows in real time.

## Data seed
12 curated agents (Quantum Scalper, GhostWriter.ai, ReelRider, etc.) spanning trading / content / social / scraping / tasks.

## Business enhancement
Leaderboard creates social pull ("trending agents"), community earned counter creates FOMO, and the XP/evolution bar drives retention — users return to see their agents level up. Monetization hook ready: take a cut of simulated payouts or charge for featured agent slots.

## Known limitations / future
- LLM-powered "agent insights" (Claude via Emergent Universal Key) skipped in v1 per user request — integration playbook already obtained.
- Single-user; auth layer can be added via Emergent Google Auth.
