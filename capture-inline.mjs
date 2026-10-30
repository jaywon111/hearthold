import playwright from '/usr/local/lib/node_modules/playwright/index.js';
const { chromium } = playwright;
const browser = await chromium.launch({headless:true});
for (const [name, viewport, mobile] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]) {
 const page = await browser.newPage({viewport,isMobile:mobile,hasTouch:mobile});
 await page.goto('http://127.0.0.1:5173/listing/l4',{waitUntil:'networkidle'});
 await page.evaluate(()=>{localStorage.setItem('hearthold:role','tunde')});
 await page.reload({waitUntil:'networkidle'});
 await page.waitForTimeout(2500);
 console.log(name, page.url(), (await page.locator('body').innerText()).slice(0,1800));
 await page.screenshot({path:`screenshots/${name}-listing-inline-handover.png`,fullPage:true});
 await page.close();
}
await browser.close();
