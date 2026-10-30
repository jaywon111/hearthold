import { useState } from "react";
import { newId, update, useStore } from "../lib/store.js";
import { Button, Card, Eyebrow, Field, Simulated, inputCls, money } from "./ui.jsx";

const blank = { title: "", price: "", description: "", image: "" };

export default function HandoverMarketplace({ role }) {
  const store = useStore();
  const items = store.handoverItems || [];
  const [form, setForm] = useState(blank);
  const [offerDrafts, setOfferDrafts] = useState({});
  const [notice, setNotice] = useState("");
  const amara = role === "amara";

  const createItem = (e) => {
    e.preventDefault();
    const item = { id: newId("hi"), ...form, price: Number(form.price), seller: "amara", status: "available", offer: null, createdAt: new Date().toISOString() };
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

  return <section className="grid min-w-0 gap-5" aria-label="Handover item marketplace">
    <div className="flex items-center justify-between gap-3 flex-wrap"><div><Eyebrow>Handover marketplace</Eyebrow><h2 className="font-display text-[26px] mt-1">Items staying in the flat</h2><p className="text-sm text-[#615d59] mt-1">Amara and Tunde can agree a price before move-in.</p></div><Simulated>Offers and escrow are simulated</Simulated></div>
    {amara && <Card className="p-5 md:p-6 grid gap-4"><h3 className="font-display text-[22px]">Sell an item</h3><form onSubmit={createItem} className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Item name"><input required className={inputCls} placeholder="e.g. dining table" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></Field><Field label="Price (₦)"><input required min="1" type="number" className={inputCls} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></Field></div><Field label="Description"><input className={inputCls} placeholder="Condition, size, pickup details" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field><Field label="Photo URL"><input type="url" className={inputCls} placeholder="https://…" value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/></Field><div className="flex items-center gap-3"><Button type="submit">List item</Button>{notice&&<span role="status" className="text-sm text-[#087443]">{notice}</span>}</div></form></Card>}
    {items.length === 0 ? <Card className="p-5 text-sm text-[#615d59]">No items listed yet.</Card> : <div className="grid min-w-0 gap-4 md:grid-cols-2">{items.map(item => {
      const incoming = item.offer;
      const isSeller = amara;
      return <Card key={item.id} className="overflow-hidden"><div className="grid sm:grid-cols-[150px_1fr]">{item.image && <img src={item.image} alt={item.title} className="h-40 w-full object-cover sm:h-full"/>}<div className="p-4 grid content-start gap-2"><div className="flex flex-wrap justify-between gap-2"><h3 className="min-w-0 font-semibold capitalize break-words">{item.title}</h3><span className={`text-xs font-medium ${item.status === "sold" ? "text-[#793400]" : "text-[#087443]"}`}>{item.status === "sold" ? "Sold" : "Available"}</span></div><p className="font-display text-xl">{money.format(item.price)}</p>{item.description&&<p className="text-sm text-[#615d59]">{item.description}</p>}
        {incoming && <div className="rounded-lg bg-[#f6f5f4] p-3 text-sm grid gap-2"><p>Offer: {money.format(incoming.amount)}{incoming.counterUsed&&incoming.counterAmount?` · Amara countered ${money.format(incoming.counterAmount)}`:""}</p><p className="text-[#615d59]">{incoming.state === "pending" ? "Waiting for Amara" : incoming.state === "countered" ? "Your response needed" : incoming.state === "accepted" ? "Offer accepted" : incoming.state === "held" ? "Payment held in simulated escrow" : incoming.state === "released" ? "Funds released · item sold" : incoming.state === "rejected" ? "Offer declined" : ""}</p>
          {isSeller && incoming.state === "pending" && <div className="flex flex-wrap gap-2"><Button onClick={()=>act(item,"accept")}>Accept offer</Button>{!incoming.counterUsed&&<Button variant="secondary" onClick={()=>{const val=window.prompt("Counter-offer amount in naira");if(val&&Number(val)>0)act(item,"counter",Number(val));}}>Counter once</Button>}<Button variant="ghost" onClick={()=>act(item,"reject")}>Reject</Button></div>}
          {!isSeller && incoming.state === "countered" && <div className="flex gap-2"><Button onClick={()=>act(item,"accept")}>Accept counter</Button><Button variant="ghost" onClick={()=>act(item,"reject")}>Reject</Button></div>}
          {!isSeller && incoming.state === "accepted" && <Button onClick={()=>act(item,"hold")}>Confirm payment held</Button>}
          {!isSeller && incoming.state === "held" && <Button onClick={()=>act(item,"release")}>Release funds to Amara</Button>}
        </div>}
        {!isSeller && item.status === "available" && (!incoming || ["rejected"].includes(incoming.state)) && <form className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end" onSubmit={e=>{e.preventDefault();offer(item,offerDrafts[item.id]);}}><label className="grid gap-1 flex-1"><span className="text-xs font-medium">Your offer (₦)</span><input aria-label={`Offer for ${item.title}`} type="number" min="1" required className={inputCls} value={offerDrafts[item.id]||""} onChange={e=>setOfferDrafts({...offerDrafts,[item.id]:e.target.value})}/></label><Button type="submit">Make an offer</Button></form>}
      </div></div></Card>;
    })}</div>}
  </section>;
}
