# 🏠 Hearthold

**Trustless Real Estate Escrow & Handover Marketplace on NEAR**

Built for the **NEAR Hackathon 2026** — Track: **Real-World Money (Bring the boring money onchain)**

[Live Demo](https://hearthold-one.vercel.app) · [Smart Contract](https://testnet.nearblocks.io/address/hearthold-escrow.testnet)

---

## 🎯 The Problem

Securing housing deposits in Nigeria (and across Africa) is riddled with trust issues. Renters fear losing their money to fake landlords or properties that don't match the description. Landlords fear tenants who squat, damage property, or refuse to pay. 

Furthermore, when a tenant moves out, they often want to sell furniture or appliances to the incoming tenant. This is usually done via unsecured cash transfers, leading to P2P scams.

## 💡 The Solution: Hearthold

Hearthold brings real-world rental and housing transactions onchain using NEAR’s fast, low-cost infrastructure. We built a fully functional dApp that combines a **Rental Escrow**, a **Sale Escrow**, and a **Renter-to-Renter Handover Marketplace**.

### Key Features

1. **Rental Escrow Engine:** Landlords lock a listing on-chain with a specific price (auto-converted from NGN to HETH) and a move-in date. Renters fund the escrow. Funds release only when the renter confirms move-in.
2. **Autonomous AI Arbitrator:** If a dispute arises (e.g., the landlord refuses to fix a leaking roof), the escrow freezes. An off-chain Node.js Keeper Bot reads the on-chain complaint and uses **Google Gemini AI** to make a neutral judgment, executing the resolution directly on the smart contract.
3. **Real Estate Sales Escrow:** A dual-confirmation flow for property sales. The seller confirms "Handover of documents/keys," and the buyer confirms "Receipt" before funds release.
4. **Handover Marketplace:** Outgoing renters (e.g., Amara) can list items (fridges, gas cookers) for the incoming renter (e.g., Tunde) to buy with direct HETH transfers.
5. **Auto-Release Timer:** If a renter funds the escrow but goes silent, the landlord can trigger an `auto_release` after the dispute window expires to claim the funds.

---

## 🛠 How NEAR is Used

- **Smart Contract (Rust / `near-sdk`):** Deployed to `hearthold-escrow.testnet`. Handles the state machine for agreements, dispute freezing, and token distribution.
- **NEP-141 Token (HETH):** We use a custom fungible token (`ft.hearthold-jay.testnet`) to simulate stablecoin payments, demonstrating how real-world fiat (NGN) can be brought onchain.
- **Wallet Selector:** Integrated to allow seamless connection with Meteor, MyNearWallet, and Here Wallet.
- **AI Keeper (GitHub Actions):** Runs every 5 minutes, polls the smart contract for disputes, queries Gemini AI, and signs the resolution transaction.

---

## 🏗 Architecture & Tech Stack

**Frontend:**
- React 18 + Vite + React Router
- Tailwind CSS + Framer Motion (Smooth UI transitions)
- Three.js (Interactive 3D room walkthroughs)
- `near-api-js` & `@near-wallet-selector`

**Backend / Smart Contract:**
- Rust + `near-sdk` v5.30.0
- Custom AI Keeper Bot written in Node.js (runs via GitHub Actions cron job)
- Google Gemini AI API (for dispute resolution)

---

## 🧪 How to Test the Demo (Judge's Guide)

The app features a **Persona Switcher** in the top left corner to simulate different users. 
*(Note: In this testnet demo, you will need to switch wallets in your browser extension to act as different personas).*

**Demo Accounts:**
- **Ada (Landlord):** `hearthold-landlord.testnet`
- **Tunde (Renter/Buyer):** `hearthold-renter.testnet`
- **Amara (Outgoing Renter):** `hearthold-outgoing.testnet`
- **AI Arbitrator:** `hearthold-arbitrator.testnet`

### Flow 1: The Happy Path (Rent)
1. Connect as **Ada** and create a listing. (Note the NGN price auto-converts to HETH).
2. Disconnect, switch to **Tunde**, and go to "Explore". Find the listing and click **Fund Escrow**. Approve the transaction.
3. As **Tunde**, click **Confirm Move-in**. The HETH instantly releases to Ada.

### Flow 2: The AI Dispute (Killer Feature)
1. As **Tunde**, fund a new listing.
2. Instead of confirming move-in, open a dispute with the text: *"The landlord refused to fix the leaking roof and the bedroom is flooded."*
3. The UI will freeze (Disputed status).
4. Wait 1-5 minutes (or check the GitHub Actions tab for the **AI Arbitrator Keeper** workflow). 
5. The AI bot will read the text, ask Gemini, and execute `resolve_dispute` on-chain. The funds are refunded to Tunde automatically.

### Flow 3: Sale Escrow
1. As **Ada**, create a listing and set the mode to **Sale**.
2. As **Tunde**, fund the escrow.
3. As **Ada**, click **Confirm Handover**. As **Tunde**, click **Confirm Receipt**. The funds release.

### Flow 4: Handover Marketplace
1. As **Amara**, go to the Handover tab and list an item (e.g., a Fridge).
2. As **Tunde**, go to the listing and make an offer.
3. As **Amara**, accept the offer.
4. As **Tunde**, click **Pay with HETH**. The HETH is transferred directly to Amara's wallet on-chain.

---

## 📍 Deployed Addresses (Testnet)

- **Escrow Contract:** `hearthold-escrow.testnet`
- **HETH Token Contract:** `ft.hearthold-jay.testnet`
- **Arbitrator Wallet:** `hearthold-arbitrator.testnet`

---

## 🚀 Running Locally

1. Clone the repository: `git clone https://github.com/jaywon111/hearthold.git`
2. Install dependencies: `npm install`
3. Add `.env` file with the following:
   ```env
   VITE_CONTRACT_ID=hearthold-escrow.testnet
