import { chromium } from 'playwright/index.js';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
await p.goto('http://localhost:5173/listing/l4', {waitUntil:'networkidle'});
await p.waitForTimeout(4000);
await p.screenshot({path:'screenshots/mobile-listing-current.png', fullPage:true});
await b.close();
console.log('done');
