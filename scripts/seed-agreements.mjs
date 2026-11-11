// Hearthold Run 2b seed script — DRY RUN BY DEFAULT. Sends nothing unless --execute.
//
// Usage:
//   node scripts/seed-agreements.mjs                 # dry run: prints the plan only
//   node scripts/seed-agreements.mjs --execute       # requires all env vars below
//
// Env (all .testnet account ids; validated format before any send):
//   HEARTHOLD_LANDLORD, HEARTHOLD_RENTER, HEARTHOLD_ARBITRATOR
//   HEARTHOLD_SELLER, HEARTHOLD_BUYER, HEARTHOLD_TREASURY
//   HEARTHOLD_CONTRACT_ID (default hearthold-jay.testnet)
//   HEARTHOLD_TOKEN_ID    (default ft.hearthold-jay.testnet)

import pkg from 'near-api-js';
const { KeyPair, JsonRpcProvider, PublicKey, Transaction, SignedTransaction, encodeTransaction, actions, baseDecode, Signature, KeyType } = pkg;
import { sha256 } from '@noble/hashes/sha256';
import fs from 'fs';

const EXECUTE = process.argv.includes('--execute');
const RPC = 'https://rpc.testnet.near.org';
const CONTRACT_ID = process.env.HEARTHOLD_CONTRACT_ID || 'hearthold-jay.testnet';
const TOKEN_ID = process.env.HEARTHOLD_TOKEN_ID || 'ft.hearthold-jay.testnet';

const ACCOUNTS = {
  landlord: process.env.HEARTHOLD_LANDLORD,
  renter: process.env.HEARTHOLD_RENTER,
  arbitrator: process.env.HEARTHOLD_ARBITRATOR,
  seller: process.env.HEARTHOLD_SELLER,
  buyer: process.env.HEARTHOLD_BUYER,
  treasury: process.env.HEARTHOLD_TREASURY,
};
const ACCOUNT_RE = /^[a-z0-9_-]{2,64}\.testnet$/;

function validateAccounts() {
  const missing = Object.entries(ACCOUNTS).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing testnet account env vars: ${missing.join(', ')} (HEARTHOLD_<ROLE>)`);
  for (const [k, v] of Object.entries(ACCOUNTS)) {
    if (!ACCOUNT_RE.test(v)) throw new Error(`Invalid ${k} account id: ${v}`);
  }
  if (new Set(Object.values(ACCOUNTS)).size !== 6) throw new Error('The six testnet accounts must be distinct.');
}

function buildPlan() {
  // 1) list two rent properties, 2) fund escrow via ft_transfer_call,
  // 3) one sale handover (uses sale listing path once Run 2b contract ships),
  // 4) landlord ratings recorded on-chain (once rating methods ship).
  return [
    { kind: 'list_property', maker: ACCOUNTS.landlord, args: { token: TOKEN_ID, rent_ngn: '480000', description: '2-bedroom apartment, Yaba, Lagos', move_in_at: String((Date.now() + 7 * 86400000) * 1e6), dispute_window_ns: String(24 * 60 * 60 * 1e9) } },
    { kind: 'ft_transfer_call', maker: ACCOUNTS.renter, args: { receiver_id: CONTRACT_ID, amount: '480000', msg: '1' } },
    { kind: 'list_property', maker: ACCOUNTS.landlord, args: { token: TOKEN_ID, rent_ngn: '650000', description: '1-bedroom flat, Ikeja GRA, Lagos', move_in_at: String((Date.now() + 2 * 86400000) * 1e6), dispute_window_ns: String(24 * 60 * 60 * 1e9) } },
    { kind: 'ft_transfer_call', maker: ACCOUNTS.renter, args: { receiver_id: CONTRACT_ID, amount: '650000', msg: '2' } },
    { kind: 'sale_handover', maker: ACCOUNTS.seller, args: { note: 'requires Run 2b contract method; blocked until deployed' } },
    { kind: 'rate_landlord', maker: ACCOUNTS.renter, args: { note: 'requires Run 2b contract method; blocked until deployed' } },
  ];
}

if (!EXECUTE) {
  console.log('DRY RUN — no transactions will be sent. Pass --execute with the six HEARTHOLD_* env vars to send.');
  try { validateAccounts(); console.log('accounts: all six provided and valid'); }
  catch (e) { console.log('accounts: NOT validated ->', e.message); }
  for (const step of buildPlan()) console.log(JSON.stringify(step));
  process.exit(0);
}

validateAccounts();
const keyjson = JSON.parse(fs.readFileSync('./.near-local/testnet-credentials/hearthold-jay.testnet.json'));
const kp = KeyPair.fromString(keyjson.private_key || keyjson.secret_key);
const provider = new JsonRpcProvider({ url: RPC });

async function send(receiverId, acts) {
  const pk = PublicKey.from(kp.getPublicKey().toString());
  const ak = await provider.query({ request_type: 'view_access_key', account_id: keyjson.account_id, public_key: pk.toString(), finality: 'final' });
  const tx = new Transaction({ signerId: keyjson.account_id, publicKey: pk, nonce: ak.nonce + 1, receiverId, actions: acts, blockHash: baseDecode(ak.block_hash) });
  const raw = kp.sign(new Uint8Array(sha256(encodeTransaction(tx))));
  const signed = new SignedTransaction({ transaction: tx, signature: new Signature({ keyType: KeyType.ED25519, data: raw.signature }) });
  const res = await provider.sendTransaction(signed);
  return res.transaction_outcome.id;
}

for (const step of buildPlan()) {
  if (step.kind === 'sale_handover' || step.kind === 'rate_landlord') { console.log('SKIP (needs Run 2b contract):', step.kind); continue; }
  const id = step.kind === 'list_property'
    ? await send(CONTRACT_ID, [actions.functionCall('list_property', step.args, 30000000000000n, 0n)])
    : await send(TOKEN_ID, [actions.functionCall('ft_transfer_call', step.args, 100000000000000n, 1n)]);
  console.log('sent', step.kind, 'tx:', id);
}
