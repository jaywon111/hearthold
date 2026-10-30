import { useEffect, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import { getSelector, showWalletModal } from "./lib/near.js";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "framer-motion";
import { ROLES, resetData, useStore } from "./lib/store.js";
import { Button, Card, Eyebrow, Simulated, soft, spring } from "./components/ui.jsx";
import Explore from "./components/Explore.jsx";
import Detail from "./components/Detail.jsx";
import Landlord from "./components/Landlord.jsx";
import Handover from "./components/Handover.jsx";
import HeroLightform from "./components/HeroLightform.jsx";

const ROLE_KEY = "hearthold:role";
const ROLE_FOR_ROUTE = { landlord: "ada", explore: "tunde", handover: "amara", detail: "tunde", owner: "ada" };
const ROUTE_FOR_ROLE = { ada: "landlord", tunde: "explore", amara: "handover" };
function routeFromPath(path) {
  if (path === "/" || path === "/home") return { name: "home" };
  if (path === "/explore") return { name: "explore" };
  if (path === "/landlord") return { name: "landlord" };
  if (path === "/handover") return { name: "handover" };
  if (path.startsWith("/listing/")) return { name: "detail", id: decodeURIComponent(path.slice(9)) };
  if (path.startsWith("/owner/")) return { name: "owner", id: decodeURIComponent(path.slice(7)) };
  return { name: "home" };
}
function pathForRoute(route) { return route.name === "detail" || route.name === "owner" ? `/${route.name === "detail" ? "listing" : "owner"}/${encodeURIComponent(route.id || "")}` : ({ home: "/", explore: "/explore", landlord: "/landlord", handover: "/handover" })[route.name] || "/"; }

function Home({ go }) {
  const store = useStore();
  const demos = [
    { id: "ada", title: "Landlord", who: "Ada Okafor", line: "Publish a flat, read messages, hold and release escrow.", to: { name: "landlord" } },
    { id: "tunde", title: "Buyer", who: "Tunde Balogun", line: "Explore Lagos, Abuja and Ibadan, message owners, use testnet escrow.", to: { name: "explore" } },
    { id: "amara", title: "Outgoing renter", who: "Amara Eze", line: "Set a move-out date and log fixtures for the next renter.", to: { name: "handover", role: "amara" } },
  ];
  return <div className="grid gap-10">
    <section className="relative isolate min-w-0 overflow-hidden rounded-[2rem] bg-[#111c26] text-white p-6 sm:p-7 md:p-12 lg:p-16 grid gap-8 grid-cols-1 lg:grid-cols-[1.2fr_.8fr] items-end sm:min-h-[490px] shadow-xl">
      <div className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85')] bg-cover bg-center opacity-35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#101a22] via-[#101a22]/85 to-[#101a22]/30" /><HeroLightform />
      <motion.div className="grid gap-5 max-w-3xl" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{...soft,delay:.05}}>
        <Eyebrow><span className="text-[#c9e7df]">Hearthold · Nigeria</span></Eyebrow>
        <motion.h1 initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{...soft,delay:.12}} className="font-display text-[clamp(40px,11vw,104px)] break-words leading-[.92] tracking-[-0.04em] font-bold">Find the place.<br/>Move with ease.</motion.h1>
        <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{...soft,delay:.22}} className="text-[17px] text-white/80 max-w-xl">Rent or buy homes, land and shops across Lagos, Abuja and Ibadan. Keep the paperwork, handover and every message in one place.</motion.p>
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{...soft,delay:.3}} className="flex flex-wrap gap-3 pt-2"><Button onClick={()=>go({name:"explore"})}>Explore listings</Button><Button variant="secondary" onClick={()=>go({name:"landlord"})}>List a property</Button><Button variant="ghost" onClick={()=>go({name:"handover"})} className="text-white">Handover</Button></motion.div>
        <Simulated>Demo listings and walkthroughs are local. Escrow uses NEAR testnet tokens.</Simulated>
      </motion.div>
      <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{...soft,delay:.36}} className="w-full"><Card className="p-6 grid gap-4 bg-white/95 text-[#181a20] border-0 shadow-2xl backdrop-blur"><Eyebrow>Try a demo account</Eyebrow><div className="grid gap-3">{demos.map(d=><motion.button key={d.id} whileTap={{scale:.98}} transition={spring} onClick={()=>go(d.to)} className="text-left rounded-xl bg-[#f2f1ee] hover:bg-[#e7efec] p-4 border border-black/5"><span className="block font-semibold">{d.who}</span><span className="block text-[13px] text-[#615d59]">{d.title}. {d.line}</span></motion.button>)}</div></Card></motion.div>
    </section>
    <section className="grid gap-4 md:grid-cols-3">{[["Explore",`${store.listings.length} seeded listings`,`Homes, land and shops with photos across three cities.`],["Escrow","NEAR testnet","Buyers hold the price, sellers see a status timeline."],["Safety","Scam wording flagged","Suspicious payment requests show a warning in chat."]].map(([t,k,b])=><Card key={t} className="p-5 grid gap-2"><Eyebrow>{t}</Eyebrow><p className="font-display text-[22px]">{k}</p><p className="text-[15px] text-[#31302e]">{b}</p></Card>)}</section>
  </div>;
}
function Nav({route,go,role,onRoleChange,onReset}) {
 const tabs=[["explore","Explore"],["landlord","Landlord"],["handover","Handover"]];
 return <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e6e6e6]"><div className="mx-auto max-w-6xl px-4 md:px-6 py-3 flex items-center gap-4 flex-wrap"><button onClick={()=>go({name:"home"})} className="font-display text-[22px] font-semibold tracking-tight rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]">Hearthold</button><nav aria-label="Main" className="flex gap-1 flex-wrap">{tabs.map(([name,label])=><button key={name} onClick={()=>go({name})} aria-current={route.name===name?"page":undefined} className="relative min-h-[40px] px-3 rounded-full text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]">{route.name===name&&<motion.span layoutId="nav-pill" transition={spring} className="absolute inset-0 rounded-full bg-[#f6f5f4]"/>}<span className="relative">{label}</span></button>)}</nav><div className="ml-auto flex items-center gap-2 flex-wrap max-[640px]:w-full max-[640px]:justify-end"><label className="sr-only" htmlFor="role">Signed in as</label><select id="role" value={role} onChange={e=>onRoleChange(e.target.value)} className="min-h-[40px] rounded-full border border-[#ddd] bg-white px-3 text-[14px]">{Object.values(ROLES).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><WalletControls/><button onClick={onReset} className="min-h-[40px] px-3 rounded-full text-[13px] text-[#615d59] hover:bg-[#f6f5f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de]">Reset demo data</button></div></div></header>;
}
export default function App() { return <BrowserRouter><AppRoutes/></BrowserRouter>; }
function AppRoutes() {
 const location=useLocation(),navigate=useNavigate();const [route,setRoute]=useState(()=>routeFromPath(location.pathname));const [role,setRoleState]=useState(()=>{const saved=localStorage.getItem(ROLE_KEY);return ROUTE_FOR_ROLE[saved]?saved:"tunde";});const [dir,setDir]=useState(1);const order=["home","explore","detail","landlord","handover"];
 useEffect(()=>{const next=routeFromPath(location.pathname);setDir(order.indexOf(next.name)>=order.indexOf(route.name)?1:-1);setRoute(next);const r=ROLE_FOR_ROUTE[next.name];if(r&&localStorage.getItem(ROLE_KEY)!==r){localStorage.setItem(ROLE_KEY,r);setRoleState(r);}},[location.pathname]);
 const setRole=r=>{const safe=ROLES[r]?r:"tunde";localStorage.setItem(ROLE_KEY,safe);setRoleState(safe);navigate(pathForRoute({name:ROUTE_FOR_ROLE[safe]}));};
 const go=next=>{const r=next.role||ROLE_FOR_ROUTE[next.name];setDir(order.indexOf(next.name)>=order.indexOf(route.name)?1:-1);if(r){localStorage.setItem(ROLE_KEY,r);setRoleState(r);}navigate(pathForRoute(next));window.scrollTo({top:0});};
 const onRoleChange=r=>{if(route.name==="handover"&&r==="tunde"){localStorage.setItem(ROLE_KEY,r);setRoleState(r);return;}setRole(r);};
 const reset=()=>{if(!window.confirm("Reset all demo data to the seeded version?"))return;resetData();localStorage.setItem(ROLE_KEY,"tunde");setRoleState("tunde");navigate("/explore");};
 return <MotionConfig reducedMotion="user"><div className="min-h-screen overflow-x-hidden bg-[#f6f5f4] text-black font-body"><Nav route={route} go={go} role={role} onRoleChange={onRoleChange} onReset={reset}/><main className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-12"><LayoutGroup><AnimatePresence mode="wait" custom={dir}><motion.div className="min-w-0" key={route.name+(route.id||"")} custom={dir} initial={{opacity:0,x:dir*24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:dir*-24}} transition={spring}>{route.name==="home"&&<Home go={go}/ >}{route.name==="explore"&&<Explore go={go} role={role}/ >}{route.name==="detail"&&<Detail id={route.id} role={role} go={go}/ >}{route.name==="owner"&&<Detail id={route.id} role="ada" go={go} ownerView/>}{route.name==="landlord"&&<Landlord go={go}/ >}{route.name==="handover"&&<Handover role={role}/ >}</motion.div></AnimatePresence></LayoutGroup></main><footer className="mx-auto max-w-6xl px-4 md:px-6 pb-10 text-[13px] text-[#615d59]">Hearthold keeps listings, messages and handovers in this browser. Escrow actions and status are read from NEAR testnet.</footer></div></MotionConfig>;
}
function WalletControls() {const [account,setAccount]=useState("");useEffect(()=>{let sub;getSelector().then(s=>{const update=()=>setAccount(s.store.getState().accounts[0]?.accountId||"");update();sub=s.store.observable.subscribe(update);}).catch(()=>{});return()=>sub?.unsubscribe?.();},[]);return <button onClick={()=>showWalletModal()} className="min-h-[40px] rounded-full border border-[#10261c] bg-[#10261c] px-2 sm:px-4 text-[11px] sm:text-[13px] font-medium shadow-none text-[#f6f5f4] hover:bg-[#1d3a2c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0075de] whitespace-nowrap">{account||"Connect NEAR testnet wallet"}</button>;}
