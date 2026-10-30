import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, update } from "../lib/store.js";
import { Button, Card, Empty, Eyebrow, Field, Naira, SectionTitle, CITIES, MODES, TYPES, inputCls, spring } from "./ui.jsx";

function riskFor(l) { const text = `${l.title} ${l.description}`.toLowerCase(); let score = 0; if (/urgent|today only|pay outside|send now|transfer/.test(text)) score += 2; if (/registered|c of o|survey plan|verified/.test(text)) score -= 1; if (l.created && Date.now() - new Date(l.created).getTime() < 7 * 86400000) score += 1; return score >= 2 ? "Elevated" : score === 1 ? "Review" : "Lower"; }

export default function Explore({ go, role }) {
  const store = useStore();
  const [city, setCity] = useState("All");
  const [type, setType] = useState("all");
  const [mode, setMode] = useState("all");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [income, setIncome] = useState("");
  const [compare, setCompare] = useState([]);

  const results = useMemo(
    () =>
      store.listings.filter((l) => {
        if (city !== "All" && l.city !== city) return false;
        if (type !== "all" && l.type !== type) return false;
        if (mode !== "all" && l.mode !== mode) return false;
        if (min && l.price < Number(min)) return false;
        if (savedOnly && !store.savedIds.includes(l.id)) return false;
        return true;
      }),
    [store.listings, store.savedIds, city, type, mode, max, savedOnly],
  );

  const reset = () => { setCity("All"); setType("all"); setMode("all"); setMax(""); setSavedOnly(false); };
  const toggleSaved = (id) => update(s => { s.savedIds ||= []; s.savedIds = s.savedIds.includes(id) ? s.savedIds.filter(x => x !== id) : [...s.savedIds, id]; return s; });
  const cap = Number(income) * 12 * 0.3;
  const purchaseCap = Number(income) * 36;
  const affordable = income ? store.listings.filter(l => l.mode === "rent" ? l.price <= cap : l.price <= purchaseCap) : [];
  const handoverCounts = (store.handoverItems || []).reduce((counts, item) => {
    if (item.listingId && item.status !== "sold") counts[item.listingId] = (counts[item.listingId] || 0) + 1;
    return counts;
  }, {});
  const fmt = n => `₦${Math.round(n || 0).toLocaleString("en-NG")}`;

  return (
    <div className="grid gap-8">
      <SectionTitle eyebrow="Explore" title="Homes, land and shops in Lagos, Abuja and Ibadan">
        Filter by place, kind and naira price. Every figure is seeded demo data.
      </SectionTitle>

      <Card className="p-5 grid gap-4 md:grid-cols-2 border-[#d8d4ce] rounded-[1.5rem]">
        <Field label="Monthly income (₦)" hint="Illustrative only. Rent budget is 30% of annual income; purchase budget is 36 months of income."><input inputMode="numeric" className={inputCls} value={income} onChange={e=>setIncome(e.target.value.replace(/\D/g,""))} placeholder="e.g. 500000" /></Field>
        <div className="self-end text-sm text-[#615d59]">{income ? <>Illustrative annual rent ceiling: <b>{fmt(cap)}</b><br/>Illustrative purchase ceiling: <b>{fmt(purchaseCap)}</b> · {affordable.length} matching listings</> : "Enter income to see an illustrative budget and matching listings."}<p className="mt-1 text-xs">Not financial advice, loan assessment or offer.</p></div>
      </Card>
      {income && <Card className="p-5 grid gap-2"><Eyebrow>Matches for your estimate</Eyebrow>{affordable.length ? affordable.map(l=><button key={l.id} onClick={()=>go({name:"detail",id:l.id})} className="text-left border-t py-2 flex justify-between gap-3"><span>{l.title} · {l.mode}</span><Naira value={l.price}/></button>) : <p className="text-sm text-[#615d59]">No listings under these illustrative ceilings.</p>}</Card>}
      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap"><p className="text-sm">{store.savedIds.length} saved · compare {compare.length}/3</p><div className="flex gap-2"><Button variant="secondary" onClick={()=>setSavedOnly(v=>!v)}>{savedOnly?"Show all":"Saved only"}</Button>{compare.length>0&&<Button variant="ghost" onClick={()=>setCompare([])}>Clear compare</Button>}</div>{compare.length>0&&<div className="w-full grid sm:grid-cols-3 gap-3">{compare.map(id=>{const l=store.listings.find(x=>x.id===id);return l&&<div key={id} className="rounded-xl bg-[#f6f5f4] p-3"><b>{l.title}</b><p>{l.area}, {l.city}</p><Naira value={l.price}/></div>})}</div>}</Card>
      <Card className="p-5 grid gap-5 md:grid-cols-2 xl:grid-cols-[repeat(5,1fr)] items-end border-[#d8d4ce] bg-white shadow-[0_18px_50px_rgba(23,30,35,.09)] rounded-[1.5rem]">
        <Field label="City">
          <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
            <option>All</option>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Kind">
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All kinds</option>
            {Object.entries(TYPES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <Field label="Rent or sale">
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="all">Rent or sale</option>
            {Object.entries(MODES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <Field label="Price ceiling (₦)">
          <input inputMode="numeric" className={inputCls} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="No limit" />
        </Field>
      </Card>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[15px] text-[#31302e]" aria-live="polite">{results.length} {results.length === 1 ? "listing" : "listings"} match</p>
        <Button variant="ghost" onClick={reset}>Clear filters</Button>
      </div>

      {results.length === 0 ? (
        <Empty title="Nothing matches yet" body="Try a wider price range or another city." action={reset} actionLabel="Show all listings" />
      ) : (
        <motion.ul layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {results.map((l) => (
              <motion.li layout key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring}>
                <div className="relative min-w-0">
                <button
                  onClick={() => go({ name: "detail", id: l.id })}
                  className="group w-full text-left rounded-2xl bg-white border border-[#e6e6e6] shadow-card overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]"
                >
                  <div className="relative aspect-[4/3] bg-[#213183] text-white flex flex-col justify-between overflow-hidden">
                    {l.image && <img src={l.image} alt={`Photo of ${l.area}, ${l.city}`} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/35" />
                    <span className="relative m-5 font-mono text-[11px] uppercase tracking-widest">{TYPES[l.type]} · {MODES[l.mode]} · risk: {riskFor(l)} (demo)</span>
                    <span className="relative m-5 font-display text-[28px] leading-[1.05]">{l.area}</span>
                  </div>
                  <div className="p-5 grid gap-2">
                    <p className="font-semibold text-[16px]">{l.title}</p>
                    <p className="text-[13px] text-[#615d59]">{l.city}</p>
                    <Naira value={l.price} className="text-[18px] font-semibold" />
                    {l.status === "escrow" && <p className="text-[12px] text-[#793400]">In simulated escrow</p>}
                    {l.status === "sold" && <p className="text-[12px] text-[#615d59]">Sold (simulated)</p>}
                    {handoverCounts[l.id] > 0 && <p className="mt-2 border-t border-[#e6e2dc] pt-3 text-[12px] uppercase tracking-[.12em] text-[#315c4c]">Handover · {handoverCounts[l.id]} {handoverCounts[l.id] === 1 ? "item" : "items"} from previous renter</p>}
                  </div>
                </button>
                <button aria-label={store.savedIds.includes(l.id)?"Remove from saved":"Save listing"} onClick={()=>toggleSaved(l.id)} className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-white/95 text-xl shadow">{store.savedIds.includes(l.id)?"♥":"♡"}</button>
                <button onClick={()=>setCompare(v=>v.includes(l.id)?v.filter(x=>x!==l.id):v.length<3?[...v,l.id]:v)} className="absolute right-3 bottom-3 min-h-[44px] rounded-full bg-white/95 px-4 text-[13px] shadow">{compare.includes(l.id)?"Selected":"Compare"}</button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  );
}
