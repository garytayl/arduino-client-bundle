import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url)),base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s)};
await fs.mkdir(path.join(root,'evidence'),{recursive:true});
try{
 const response=await page.goto(base);assert.equal(response.status(),200);
 const sections=await page.locator('main>section').evaluateAll(n=>n.map(e=>e.id));
 assert.deepEqual(sections,['progress','next-visit','materials','layout','installation','files']);
 assert.equal(await page.locator('script,input,button,.view,.chapter-grid').count(),0);
 assert.equal(await page.locator('h1').count(),1);
 pass('One read-only linear guide, six visible sections, no router, scripts, checklist or buttons');
 for(const id of sections)assert.ok(await page.locator('#'+id).isVisible());
 await page.locator('nav a[href="#materials"]').click();assert.ok((await page.url()).endsWith('#materials'));
 assert.ok(await page.locator('#progress').isVisible());pass('Anchor jumps keep all content available in one scroll');
 await page.locator('#materials details').first().locator('summary').click();assert.ok((await page.locator('#materials').innerText()).includes('Fluke 324'));
 await page.locator('#materials .parts-grid details').last().locator('summary').click();
 const needed=await page.locator('#materials .parts-grid').innerText();for(const t of ['3–4','$19.99','CQRobot','2717','Currently unavailable','headers'])assert.ok(needed.includes(t),t);
 assert.equal(await page.locator('a[href^="https://www.amazon.com/dp/"]').count(),2);assert.ok(!(await page.locator('body').innerText()).includes('Also pack'));
 await page.locator('#materials .parts-grid details').last().locator('summary').click();
 pass('Tailored owned inventory and two actionable buying recommendations; no duplicate jumper/tool list');
 const anchors=await page.locator('a[href^="#"]').evaluateAll(n=>n.map(e=>e.getAttribute('href')));for(const id of anchors)assert.equal(await page.locator(id).count(),1,id);
 const downloads=await page.locator('a[download]').evaluateAll(n=>n.map(e=>e.getAttribute('href')));
 for(const f of downloads){const res=await page.request.get(new URL(f,base).href);assert.equal(res.status(),200,f);assert.ok((await res.body()).equals(await fs.readFile(path.join(root,'dist',f))),f)}
 const original=await page.request.get(base+'/downloads/Yvels_Staircase_v1-85364d5.ino');assert.ok((await original.body()).equals(execFileSync('git',['show','85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7:Yvels_Staircase_v1/Yvels_Staircase_v1.ino'],{cwd:path.join(root,'..')})));
 pass('Internal anchors and all six firmware/recovery downloads resolve; byte integrity preserved');
 assert.ok(await page.locator('svg[role="img"] title').count());assert.ok(await page.locator('svg[role="img"] desc').count());pass('Mux diagram has accessible title, description and text explanation');
 for(const width of [320,375,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.goto(base);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+width);for(const id of sections)assert.ok(await page.locator('#'+id).isVisible());}
 pass('Full linear content fits six mobile/tablet/desktop widths');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.goto(base);await page.screenshot({path:path.join(root,`evidence/guide-${width}.png`),fullPage:true});}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto');assert.deepEqual(errors,[]);pass('Reduced motion respected; no browser errors');
 const noJs=await browser.newPage({javaScriptEnabled:false});await noJs.goto(base);assert.ok(await noJs.locator('#layout').isVisible());assert.ok(await noJs.locator('#materials').isVisible());await noJs.close();pass('Guide remains fully readable with JavaScript disabled');
 const version=await(await page.request.get(base+'/site-version.json')).json();await fs.writeFile(path.join(root,'evidence/guide-checks.json'),JSON.stringify({base,checks,version},null,2));console.log(JSON.stringify({version}));
}finally{await browser.close()}
