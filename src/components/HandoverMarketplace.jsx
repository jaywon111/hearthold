import { useState } from "react";
import { newId, update, useStore } from "../lib/store.js";
import { Button, Card, Eyebrow, Field, Simulated, inputCls, money } from "./ui.jsx";

const blank = { title: "", price: "", description: "", image: "" };

export default function HandoverMarketplace({ role, listingId: listingIdProp }) {
  const store = useStore();
  const listings = store.listings.filter((listing) => listing.mode === "rent");
  const [selectedListingId, setSelectedListingId] = useState(listingIdProp || (window.location.pathname === "/handover" ? "l4" : listings[0]?.id) || "");
  const listingId = listingIdProp || selectedListingId;
  const items = (store.handoverItems || []).filter(item => item.listingId === listingId);
  const [form, setForm] = useState(blank);
  const [offerDrafts, setOfferDrafts] = useState({});
  const [notice, setNotice] = useState("");
  const amara = role === "amara";

  const createItem = (e) => {
    e.preventDefault();
    const item = { id: newId("hi"), ...form, price: Number(form.price), seller: "amara", listingId, status: "available", offer: null, createdAt: new Date().toISOString() };
    update((s) => { s.handoverItems ||= []; s.handoverItems.unshift(item); return s; });
    setForm(blank); setNotice("Item listed for Tunde.");
  };
  const offer = (item, amount) => {
    if (!amount || item.status !== "available") return;
    update((s) => { const target = s.handoverItems.find((x) => x.id === item.id); if (target?.status === "available") target.offer = { amount: Number(amount), state: "pending", counterUsed: false }; return s; });
    setOfferDrafts((d) => ({ ...d, [item.id]: "" })); setNotice("Offer sent to Amara.");
  };
  const act = (item, action, amount) => {
    update((s) => {
      const target = s.handoverItems.find((x) => x.id === item.id);
      if (!target?.offer) return s;
      if (action === "counter" && !target.offer.counterUsed && amount > 0) target.offer = { ...target.offer, state: "countered", counterAmount: Number(amount), counterUsed: true };
      if (action === "accept") target.offer = { ...target.offer, state: "accepted", agreedAmount: target.offer.state === "countered" ? target.offer.counterAmount : target.offer.amount };
      if (action === "reject") target.offer = { ...target.offer, state: "rejected" };
      if (action === "hold" && target.offer.state === "accepted") target.offer.state = "held";
      if (action === "release" && target.offer.state === "held") { target.offer.state = "released"; target.status = "sold"; }
      return s;
    });
  };

  return <section className="relative grid min-w-0 gap-8 border-y border-[#d8d0c4] bg-[#f6f3ec] px-5 py-10 sm:px-8 md:gap-12 md:px-12 md:py-16 lg:px-16" aria-label="Handover item marketplace">
    <div className="grid gap-5 border-b border-[#d8d0c4] pb-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)] md:items-end md:gap-12 md:pb-12"><div><Eyebrow>Handover marketplace</Eyebrow><h2 className="mt-3 max-w-[16ch] font-display text-[clamp(36px,5.3vw,64px)] leading-[0.98] tracking-[-0.035em]">What stays. What moves on.</h2></div><div className="md:pb-1"><p className="max-w-[38ch] text-base leading-relaxed text-[#615d59] md:text-lg">A considered handover starts with the pieces that make a place feel like home. Agree a price before move-in.</p><p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#615d59]">Offers only · no payment collected here</p></div></div>
    {amara && !listingIdProp && <div className="border-b border-[#d8d0c4] pb-8"><h3 className="font-display text-[32px]">List a piece</h3><form onSubmit={createItem} className="mt-5 grid gap-5"><Field label="Flat"><select required disabled={!listings.length} className={inputCls} value={selectedListingId} onChange={e=>{setSelectedListingId(e.target.value);setForm(blank);}}>{listings.map(listing=><option key={listing.id} value={listing.id}>{listing.title}</option>)}</select></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Item name"><input required className={inputCls} placeholder="e.g. dining table" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Price (₦)"><input required min="1" type="number" className={inputCls} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field></div><Field label="Description"><input className={inputCls} placeholder="Condition, size, pickup details" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field><Field label="Photo URL"><input type="url" className={inputCls} placeholder="https://…" value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/></Field><div className="flex items-center gap-3"><Button type="submit">List item</Button>{notice&&<span role="status" className="text-sm text-[#087443]">{notice}</span>}</div></form></div>}
    {items.length === 0 ? <p className="py-5 text-base text-[#615d59]">No items listed for this home yet.</p> : <div className="grid min-w-0 gap-0">{items.map(item => {
      const incoming = item.offer;
      const isSeller = amara;
      return <article key={item.id} className="grid min-w-0 grid-cols-1 gap-0 border-b border-[#d8d0c4] py-7 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1fr)] md:gap-10 md:py-10 lg:gap-16">
        <div className="relative min-h-56 overflow-hidden bg-[#e6e0d5] md:min-h-[300px]">{item.image ? <img src={item.image} alt={item.title} className="absolute inset-0 size-full object-cover"/> : <div className="absolute inset-0 grid place-items-center font-display text-3xl text-[#8c8377]">A piece with a story</div>}</div><div className="grid content-start gap-5 py-5 md:py-2"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#615d59]">{item.status === "sold" ? "Placed" : "Available for handover"}</p><h3 className="mt-2 font-display text-[clamp(30px,3vw,42px)] leading-tight capitalize">{item.title}</h3></div><p className="font-display text-[25px]">{money.format(item.price)}</p></div>{item.description&&<p className="max-w-[52ch] text-base leading-relaxed text-[#615d59]">{item.description}</p>}
        {incoming && <div className="border-y border-[#d8d0c4] py-4 text-sm grid gap-3"><p className="font-medium">Offer: {money.format(incoming.amount)}{incoming.counterUsed&&incoming.counterAmount?` · Amara countered ${money.format(incoming.counterAmount)}`:""}</p><p className="text-[#615d59]">{incoming.state === "pending" ? "Waiting for Amara" : incoming.state === "countered" ? "Your response needed" : incoming.state === "accepted" ? "Offer accepted" : incoming.state === "held" ? "Payment step is simulated" : incoming.state === "released" ? "Funds released · item placed" : incoming.state === "rejected" ? "Offer declined" : ""}</p>
          {isSeller && incoming.state === "pending" && <div className="flex flex-wrap gap-2"><Button onClick={()=>act(item,"accept")}>Accept offer</Button>{!incoming.counterUsed&&<Button variant="secondary" onClick={()=>{const val=window.prompt("Counter-offer amount in naira");if(val&&Number(val)>0)act(item,"counter",Number(val));}}>Counter once</Button>}<Button variant="ghost" onClick={()=>act(item,"reject")}>Reject</Button></div>}
          {!isSeller && incoming.state === "countered" && <div className="flex gap-2"><Button onClick={()=>act(item,"accept")}>Accept counter</Button><Button variant="ghost" onClick={()=>act(item,"reject")}>Reject</Button></div>}
          {!isSeller && incoming.state === "accepted" && <Button onClick={()=>act(item,"hold")}>Confirm payment held</Button>}
          {!isSeller && incoming.state === "held" && <Button onClick={()=>act(item,"release")}>Release funds to Amara</Button>}
        </div>}
        {!isSeller && item.status === "available" && (!incoming || ["rejected"].includes(incoming.state)) && <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={e=>{e.preventDefault();offer(item,offerDrafts[item.id]);}}><label className="grid gap-1 flex-1"><span className="text-xs font-medium">Your offer (₦)</span><input aria-label={`Offer for ${item.title}`} type="number" min="1" required className={inputCls} value={offerDrafts[item.id]||""} onChange={e=>setOfferDrafts({...offerDrafts,[item.id]:e.target.value})}/></label><Button type="submit">Make an offer</Button></form>}
      </div></article>;
    })}</div>}
  </section>;
}
