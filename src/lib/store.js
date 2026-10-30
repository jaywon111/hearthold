import { useCallback, useSyncExternalStore } from "react";

const KEY = "hearthold:v1";

export const ROLES = {
  ada: { id: "ada", name: "Ada Okafor", short: "Ada", label: "Landlord, Lagos" },
  tunde: { id: "tunde", name: "Tunde Balogun", short: "Tunde", label: "Buyer and incoming renter" },
  amara: { id: "amara", name: "Amara Eze", short: "Amara", label: "Outgoing renter" },
};

export const FRAUD_PHRASES = ["pay outside the app", "send money to this account", "agent fee via transfer", "today only", "send now"];
export function detectFraud(text) {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  return FRAUD_PHRASES.filter((p) => t.includes(p));
}

const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();
export const FLAGGED_DEMO = "Pay outside the app today only, send money to this account and I will confirm.";

export function seedData() {
  return {
    savedIds: [],
    listings: [
      { id: "l1", owner: "ada", title: "Four-bedroom duplex with boys' quarters", type: "house", mode: "rent", price: 4500000, city: "Lagos", area: "Lekki Phase 1", description: "Bright duplex on a quiet street, borehole water, 24h power backup, two parking spaces.", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", photos: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80"], video: "", status: "available", created: daysAgo(12), fixtures: ["Split AC in 3 rooms", "Built-in wardrobes", "Solar inverter"] },
      { id: "l2", owner: "ada", title: "Serviced 2-plot land, Lugbe", type: "land", mode: "sale", price: 28000000, city: "Abuja", area: "Lugbe", description: "Registered C of O, dry plot next to the new estate road. Survey plan available on request.", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", photos: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80"], video: "", status: "available", created: daysAgo(30), fixtures: [] },
      { id: "l3", owner: "ada", title: "Ground-floor shop, Bodija Market Road", type: "commercial", mode: "rent", price: 1200000, city: "Ibadan", area: "Bodija", description: "Open-plan shop front with a store room and toilet. Busy frontage, good for a pharmacy or salon.", image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", photos: ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"], video: "", status: "available", created: daysAgo(5), fixtures: ["Glass shop front", "Store room shelving"] },
      { id: "l4", owner: "ada", title: "3-bedroom flat, Gwarinpa", type: "house", mode: "rent", price: 2600000, city: "Abuja", area: "Gwarinpa 2nd Avenue", description: "Newly tiled flat with fitted kitchen and a private compound gate.", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80", photos: ["https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"], video: "", status: "available", created: daysAgo(2), fixtures: ["Fitted kitchen"] },
      { id: "l5", owner: "ada", title: "Commercial plot, Ring Road", type: "land", mode: "sale", price: 65000000, city: "Ibadan", area: "Ring Road", description: "Corner plot with road frontage on the Ring Road. Ideal for a showroom or small plaza.", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", photos: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"], video: "", status: "available", created: daysAgo(40), fixtures: [] },
    ],
    messages: [
      { id: "m1", listingId: "l1", from: "tunde", to: "ada", text: "Good day. Is the duplex still available from December?", at: daysAgo(2), flagged: [] },
      { id: "m2", listingId: "l1", from: "ada", to: "tunde", text: "Yes it is. Viewing is on Saturday between 10 and 2.", at: daysAgo(2), flagged: [] },
      { id: "m3", listingId: "l1", from: "ada", to: "tunde", text: FLAGGED_DEMO, at: daysAgo(1), flagged: detectFraud(FLAGGED_DEMO) },
    ],
    escrows: [],
    handoverItems: [
      { id: "hi-cooker", title: "Gas cooker", price: 85000, description: "4-burner cooker, working well and staying in the kitchen.", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=80", seller: "amara", status: "available", offer: null, createdAt: daysAgo(1) },
      { id: "hi-table", title: "Dining table", price: 120000, description: "Wooden dining table with four chairs.", image: "https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=900&q=80", seller: "amara", status: "available", offer: null, createdAt: daysAgo(1) },
      { id: "hi-fridge", title: "Fridge", price: 175000, description: "Good condition, available for pickup at move-in.", image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80", seller: "amara", status: "available", offer: null, createdAt: daysAgo(1) },
    ],
    handovers: { amara: { moveOut: daysAhead(21), notes: "Left the wall shelves and the gas cooker. Painted the sitting room in March.", fixtures: ["Gas cooker", "Wall shelves", "Ceiling fan (sitting room)"], upgrades: ["Replaced the kitchen tap", "Installed a water tank stand"], updatedAt: daysAgo(1), listingId: "l4" } },
    handoverEvents: [{ id: "h1", at: daysAgo(6), text: "Move-out date set to 21 days from now" }, { id: "h2", at: daysAgo(1), text: "Notes on fixtures and upgrades added" }],
    handoverMessages: [{ id: "hm1", listingId: "l4", from: "amara", to: "tunde", text: "I left the cooker and shelves for you. Let me know if you need anything before move-in.", at: daysAgo(1), flagged: [] }],
  };
}

function migrate(data) {
  const seed = seedData();
  data.listings ||= [];
  data.savedIds ||= [];
  for (const base of seed.listings) {
    const current = data.listings.find((l) => l.id === base.id);
    if (current) { current.image = base.image; current.photos = base.photos || [base.image]; }
  }
  data.messages ||= [];
  for (const base of seed.messages) {
    const current = data.messages.find((m) => m.id === base.id);
    if (!current) data.messages.push(base);
  }
  data.escrows ||= seed.escrows;
  data.handoverItems ||= seed.handoverItems;
  data.handovers ||= seed.handovers;
  data.handoverEvents ||= seed.handoverEvents;
  data.handoverMessages ||= seed.handoverMessages;
  data.handoverMessages.forEach((m) => { if (!m.listingId) m.listingId = data.handovers.amara?.listingId || seed.handovers.amara.listingId; });
  return data;
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch { /* fall through to seed */ }
  return seedData();
}
let state = null;
const listeners = new Set();
function getState() { if (state === null) state = load(); return state; }
function emit(next) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep in-memory state */ }
  listeners.forEach((l) => l());
}
export function resetData() { emit(seedData()); }
export function update(fn) { emit(fn(structuredClone(getState()))); }
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function useStore() { return useSyncExternalStore(subscribe, getState, getState); }
export function useActions() { return useCallback((fn) => update(fn), []); }
export function newId(prefix) { return `${prefix}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`; }
export { now };
