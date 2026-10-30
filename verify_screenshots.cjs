const { chromium } = require('/usr/local/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const base = 'http://127.0.0.1:4180';
const out = '/w/hosts/2/u/6ada478de56518fe37365d4c/workspace/near-property-escrow/screenshots';
fs.mkdirSync(out, {recursive:true});
const fixture = {id:1,landlord:'landlord.testnet',renter:'renter.testnet',token:'hearthold-ft-jay.testnet',rent_ngn:'500000',description:'2-bedroom apartment, Yaba, Lagos',move_in_at:String((Date.now()+60*60*1000)*1e6),status:'funded',funded:'500000000000000000000000',installment_count:1,released_count:0};
const encode = x => Array.from(Buffer.from(JSON.stringify(x)));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const pages=[['onboarding','/app/onboarding','renter'],['renter-dashboard','/app/renter','renter'],['landlord-dashboard','/app/landlord','landlord'],['agreement-detail','/app/agreement/1','renter'],['landing','/','renter']];
 for(const [name,route,role] of pages){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await page.addInitScript(({role,thread})=>{localStorage.setItem('hearthold-role',role);localStorage.setItem('hearthold-thread-1',JSON.stringify(thread));}, {role,thread:[{from:'renter.testnet',text:'please send a deposit outside the agreement',at:new Date().toISOString()}]});
  await page.route('https://rpc.testnet.near.org/**', async route=>{
   const req=route.request(); let body={}; try{body=req.postDataJSON()}catch{}
   const method=body?.params?.method_name;
   const val=method==='get_agreement_count'?'1':method==='get_agreement'?fixture:null;
   if(val===null) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:'hearthold',result:{result:encode('')}})});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({jsonrpc:'2.0',id:'hearthold',result:{result:encode(val)}})});
  });
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+route,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1500);
  const body=await page.locator('body').innerText();
  const font=await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily);
  const size=await page.locator('h1').first().evaluate(el=>getComputedStyle(el).fontSize).catch(()=>'?');
  await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
  console.log(JSON.stringify({name,route,textLength:body.length,hasScamWarning:body.includes('SAFETY REVIEW'),countdown:body.match(/AUTO-RELEASE[^\n]*/)?.[0]||null,font,h1Size:size,errors, screenshot:path.join(out,name+'.png')}));
  await page.close();
 }
 await browser.close();
})();
