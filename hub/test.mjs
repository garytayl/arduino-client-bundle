import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
await fs.mkdir(path.join(root,'evidence'),{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={base,checks:[],performance:{},links:[]};
const pass=s=>{report.checks.push(s);console.log('PASS '+s);};
try{
  const response=await page.goto(base);assert.equal(response.status(),200);
  await page.locator('#home-title').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(root,'evidence/desktop.png'),fullPage:true});
  for(const id of ['code','hardware','testing','notes']){
    await page.locator(`.chapter[href="#${id}"]`).click();
    await page.locator(`#${id}:not([hidden])`).waitFor();
    assert.equal(await page.locator('section.view:not([hidden])').count(),1);
    assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
    await page.keyboard.press('Escape');
    await page.locator('#home:not([hidden])').waitFor();
  }pass('All four chapters, heading focus, Escape return');
  await page.locator('.chapter[href="#code"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'#hardware');
  await page.keyboard.press('Enter');await page.locator('#hardware:not([hidden])').waitFor();
  await page.goBack();await page.locator('#home:not([hidden])').waitFor();
  await page.goForward();await page.locator('#hardware:not([hidden])').waitFor();
  pass('Arrow navigation, Enter, browser Back and Forward');
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(root,'evidence/wiring.png'),fullPage:true});
  await page.goto(base+'/#code');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('a[download]').click()]);
  const local=await fs.readFile(await download.path());
  const original=execFileSync('git',['show','85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7:Yvels_Staircase_v1/Yvels_Staircase_v1.ino'],{cwd:path.join(root,'..')});
  assert.ok(local.equals(original));pass('Browser firmware download matches original bytes');
  const hrefs=await page.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.getAttribute('href')))]);
  for(const href of hrefs){if(href.startsWith('#'))assert.equal(await page.locator(href).count(),1);else if(!href.startsWith('http')){const r=await page.request.get(new URL(href,base).href);assert.equal(r.status(),200);}}
  pass('Every internal anchor and local asset resolves');
  for(const width of [320,375,390,768,1024,1440]){
    await page.setViewportSize({width,height:844});
    for(const id of ['home','code','hardware','testing','notes']){
      await page.goto(base+'/#'+id);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      assert.equal(overflow,false,`${id} horizontal overflow at ${width}`);
      const section=page.locator('#'+id);assert.ok(await section.isVisible());
    }
  }pass('All chapters fit widths 320, 375, 390, 768, 1024 and 1440');
  await page.setViewportSize({width:390,height:844});await page.goto(base);
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(root,'evidence/mobile.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(150);
  const f1=await page.evaluate(()=>window.stairfieldMetrics.frames);await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.stairfieldMetrics.frames),f1);
  assert.equal(await page.locator('.step-stack').evaluate(el=>getComputedStyle(el).animationName),'none');
  pass('Reduced motion stops canvas and staircase animation');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(150);
  await page.locator('#motion').click();
  const f2=await page.evaluate(()=>window.stairfieldMetrics.frames);await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.stairfieldMetrics.frames),f2);pass('Motion pause stops animation');
  await page.locator('#motion').click();
  for(const width of [390,1440]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(250);
    const start=await page.evaluate(()=>({frames:window.stairfieldMetrics.frames,time:performance.now()}));
    await page.waitForTimeout(2500);
    report.performance[width]=await page.evaluate(start=>{const m=window.stairfieldMetrics;const sorted=m.drawMs.slice().sort((a,b)=>a-b);return{stars:m.starCount,drawsPerSecond:+((m.frames-start.frames)*1000/(performance.now()-start.time)).toFixed(1),meanDrawMs:+(m.drawMs.reduce((a,b)=>a+b,0)/m.drawMs.length).toFixed(3),p95DrawMs:sorted[Math.floor(sorted.length*.95)]};},start);
    assert.ok(report.performance[width].p95DrawMs<8,'Starfield draw budget');
  }pass('Measured mobile and desktop starfield draw cost below 8ms p95');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  // Link verification uses actual HTTP responses and reports redirects/errors separately.
  for(const href of hrefs.filter(h=>h.startsWith('https://'))){const r=await page.request.get(href,{timeout:30000});report.links.push({url:href,status:r.status()});assert.equal(r.status(),200,href);}
  pass('All external project links return HTTP 200');
}finally{await fs.writeFile(path.join(root,'evidence/report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report.performance));
