# Hearthold Run 2b — Verified Audit (Nov 10, 2026)

Scope recovered from task brief: GitHub main @ 26977df previously reported lacking (1) sale handover/receipt, (2) landlord ratings, (3) panic tests, (4) seed script, (5) fresh-deploy frontend/Vercel config. Six testnet accounts were previously created/funded by the user (not re-asked).

## Local repo state (verified this run)

- `hearthold/` is the working tree (no `.git`, no GitHub touched, no chain calls made).
- `hearthold-setup-20261106/` is identical to `hearthold/` except `src/` (React Router app) and `postcss.config.js`/`shot.mjs` exist only in `hearthold/`. The `src/` app is the newer frontend; `main.tsx`/`near.ts` is the older TS single-file app.
- `repo/` and `repo-run2b/` contain only Rust `target/` build artifacts, no source. No `.wasm` exists anywhere (release WASM was never produced in this workspace).
- Contract `hearthold/contract/src/lib.rs`: rent escrow with `list_property`, `set_schedule`, `ft_on_transfer`, `confirm_move_in`, `auto_release`, `open_dispute`, `resolve_dispute`, views `get_agreement`/`get_agreement_count`, and 6 unit tests. Confirmed ABSENT: sale mode listing, sale handover/receipt method, landlord rating storage/getter, event emission (`emit_str`), and sandbox/promise-failure (`ft_resolve_transfer`) tests. `src/lib/near.js` also hardcodes `TOKEN_ID="ft.hea...tnet"` (truncated placeholder, per prior instruction reproduced verbatim in HandoverMarketplace.jsx — it is not a deployable value).
- Frontend `src/` app: Explore/Detail/Landlord/Handover routes; HandoverMarketplace has the offer/counter/accept flow and a direct HETH `ft_transfer` to seller (explicitly noted in UI as NOT escrowed); escrow states are local demo state (`src/lib/store.js`) plus on-chain reads via `src/lib/near.js`. No landlord rating UI. Split-currency bug noted: token-amount inputs alongside NGN rent inputs with no visible conversion.
- Vercel: `vercel.json` (SPA rewrite only), `.vercel/project.json` = project `near-property-escrow` (prj_L8eRfm1ZNJeyEFAMkDjnxZqJ69E3, org team_HMJOlFzbxBoYai5wmmOk0qbM). No env vars, no fresh-project config, no `VITE_CONTRACT_ID`/`VITE_TOKEN_ID`/`VITE_ARBITRATOR_ID` set in repo (frontend falls back to `hearthold-jay.testnet` / `ft.hearthold-jay.testnet` / empty arbitrator).
- Testnet credential present: `hearthold/.near-local/testnet-credentials/hearthold-jay.testnet.json` (account `hearthold-jay.testnet`, keypair present, never printed). Other accounts referenced in scripts: `jayisagod.testnet` (fund/ft.mjs recipient), contract `hearthold-jay.testnet`, token `ft.hearthold-jay.testnet`. The six funded accounts' addresses were NOT in local files; validation step needed before any seed/deploy.

## Blockers (exact minimal next step each)

1. Rust toolchain missing (`cargo: command not found`) — cannot compile/test WASM. Next: install Rust stable + `wasm32-unknown-unknown` target (or use `cargo` via rustup) then `cd contract && cargo test`.
2. `npm install` completed but the first `vite build` did not finish inside the background window — rerun `npx vite build` and capture errors (likely `@fontsource-variable` / wallet-selector bundle issues).
3. `TOKEN_ID` in `src/lib/near.js` is a truncated literal `ft.hea...tnet` — needs the real FT account id before any frontend transaction works.
4. No GitHub remote/`.git` locally — cannot check main @ 26977df. Next: provide/clone the repo (done with user approval) or push after commit.

## Safe local work done this run (no chain, no deploy)

- `scripts/seed-agreements.mjs` — dry-run by default; builds listing/funding calls for validation, sends NOTHING unless `--execute` is passed and all six account ids are supplied via env.
- `contract/run2b-draft.patch` — contract extension draft (sale listing + handover/receipt event, landlord ratings, panic/sandbox test stubs) with exact insertion points; NOT applied, pending cargo verification.
- `.env.example` — documents the three VITE_ vars and the six testnet account env vars for fresh deploy.
- This audit file.

No deployment, no HETH transfer, no live seeding, no Vercel change.
