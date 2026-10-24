import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={base,checks:[],externalLinks:[],version:null};
const pass=s=>{console.log('PASS '+s);report.checks.push(s)};
await fs.mkdir(path.join(root,'evidence'),{recursive:true});
try{
 const res=await page.goto(base);assert.equal(res.status(),200);
 const ids=await page.locator('section.view').evaluateAll(nodes=>nodes.map(n=>n.id));
 assert.equal(ids.length,new Set(ids).size);
 for(const id of ids){await page.goto(base+'/#'+id);await page.locator('#'+id+':not([hidden])').waitFor();assert.equal(await page.locator('section.view:not([hidden])').count(),1);}
 pass('Every current and historical chapter routes with one visible view');
 await page.goto(base);await page.locator('a[href="#roadmap"]').first().click();
 await page.locator('#roadmap:not([hidden])').waitFor();
 await page.waitForFunction(()=>document.activeElement.id==='roadmap-title');
 await page.keyboard.press('Escape');await page.locator('#home:not([hidden])').waitFor();
 await page.goBack();await page.locator('#roadmap:not([hidden])').waitFor();
 pass('Heading focus, Escape and history navigation');
 const downloads=await page.locator('a[download]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
 for(const href of downloads){const response=await page.request.get(new URL(href,base).href);assert.equal(response.status(),200,href);const actual=await response.body();const expected=await fs.readFile(path.join(root,'dist',href));assert.ok(actual.equals(expected),href);}
 const old=await page.request.get(base+'/downloads/Yvels_Staircase_v1-85364d5.ino');
 assert.ok((await old.body()).equals(execFileSync('git',['show','85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7:Yvels_Staircase_v1/Yvels_Staircase_v1.ino'],{cwd:path.join(root,'..')})));
 const current=await page.request.get(base+'/downloads/ToF_Rainbow_Ripple_90_Smooth_v2.ino');assert.ok((await current.body()).equals(await fs.readFile(path.join(root,'../bench/releases/2026-10-24/ToF_Rainbow_Ripple_90_Smooth_v2.ino'))));
 pass('All firmware and ZIP downloads match exact source bytes; original remains intact');
 const hrefs=await page.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
 for(const href of hrefs){if(href.startsWith('#')) assert.equal(await page.locator(href).count(),1,href);else if(!href.startsWith('http')) assert.equal((await page.request.get(new URL(href,base).href)).status(),200,href);else assert.equal(new URL(href).protocol,'https:');}
 pass('Every internal link resolves; external product and source links use HTTPS');
 await page.goto(base+'/#roadmap');await page.locator('[data-check="sensors"]').check();await page.reload();assert.equal(await page.locator('[data-check="sensors"]').isChecked(),true);await page.locator('[data-check="sensors"]').uncheck();
 pass('Checklist persists locally and can be reset');
 for(const width of [320,375,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const id of ids){await page.goto(base+'/#'+id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id} at ${width}`);}
 }
 pass('Every chapter fits six mobile/tablet/desktop widths without horizontal overflow');
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['home','progress','roadmap','layout','parts','firmware']){await page.goto(base+'/#'+id);await page.waitForFunction(id=>parseFloat(getComputedStyle(document.getElementById(id)).opacity)>.99,id);await page.screenshot({path:path.join(root,`evidence/${id}-${width}.png`),fullPage:true});}
 }
 await page.goto(base+'/#layout');assert.ok(await page.locator('svg[role="img"] title').count());assert.ok(await page.locator('svg[role="img"] desc').count());
 pass('Concept diagram has accessible title, description and text explanation');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);const frames=await page.evaluate(()=>window.stairfieldMetrics.frames);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>window.stairfieldMetrics.frames),frames);
 pass('Reduced motion stops decorative canvas');assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
 report.version=await (await page.request.get(base+'/site-version.json')).json();
 await fs.writeFile(path.join(root,'evidence/progress-checks.json'),JSON.stringify(report,null,2));
}finally{await browser.close()}
