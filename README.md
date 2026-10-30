# Hearthold

Property rent escrow concept for the NEAR Real-World Money track. Rust NEP-141 escrow contract and React demo UI.

## Build and tests

Contract unit tests: `cd contract && cargo test`

WASM release build: `cd contract && RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release`

Frontend: `npm install && npm run build`; `npm run dev` starts the local preview.

## MVP boundaries

The contract accepts deposits only from its configured NEP-141 token account using `ft_transfer_call`, checks the agreement ID and amount, blocks early landlord withdrawal, supports renter confirmation, time-gated permissionless release, dispute freeze and arbitrator resolution. Installment schedules are prefunded in full. NEAR contracts do not debit renter wallets or wake themselves up, so release calls require a transaction after the deadline. The frontend is a static demo and does not connect a wallet or send transactions yet. Its buttons explain the transaction flow without pretending a chain action occurred.

The UI uses an illustrative NGN rent amount and a clearly labeled test token amount. No token address, testnet deployment or redeemable stablecoin is claimed. Listings are demo data and do not verify property title. Message safety screening is an in-browser keyword stub, advisory only, with messages kept off-chain.

## Security/demo notes

Deploy only to testnet after verifying the specific FT contract and decimals. Configure an explicit allowlisted FT and a disclosed demo arbitrator. The demo arbitrator resolution sends all remaining escrow to one party; this is not independent adjudication. Add sandbox tests for NEP-141 transfer callbacks and promise failures before any deployment.
