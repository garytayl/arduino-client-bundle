import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.dirname(fileURLToPath(import.meta.url));
const base=process.env.BASE_URL||'http://127.0.0.1:4187';
const data=JSON.parse(await fs.readFile(path.join(root,'content/concepts.json'),'utf8'));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const checks=[];const pass=message=>{checks.push(message);console.log('PASS '+message);};
await fs.mkdir(path.join(root,'evidence'),{recursive:true});
const gallery=base+'/concepts';
const dialog=page.locator('#concept-lightbox');
async function readyImage(){await page.locator('#lightbox-image').evaluate(img=>img.decode());}
async function closed(){await page.waitForFunction(()=>!document.querySelector('#concept-lightbox').open);}
try{
  assert.equal((await page.goto(gallery)).status(),200);
  await page.locator('.concept-toolbar:not([hidden])').waitFor();
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('nav a').count(),5);
  assert.equal(await page.locator('.concept-card').count(),13);
  assert.equal(await page.locator('#current-concepts .concept-card').count(),10);
  assert.equal(await page.locator('#earlier-grid .concept-card').count(),3);
  assert.equal(await page.locator('#earlier-concepts').evaluate(el=>el.open),false);
  assert.deepEqual(await page.locator('.concept-card').evaluateAll(nodes=>nodes.map(node=>node.dataset.id)),data.concepts.map(c=>c.id));
  for(const c of data.concepts){
    const card=page.locator(`.concept-card[data-id="${c.id}"]`);
    assert.equal(await card.locator('h2').textContent(),c.title);
    assert.equal(await card.locator('.concept-caption').textContent(),c.caption);
    assert.equal(await card.locator('img').getAttribute('alt'),c.alt);
    for(const asset of Object.values(c.assets)){
      const response=await page.request.get(base+'/images/concepts/'+asset.file);
      assert.equal(response.status(),200,asset.file);
      const bytes=await response.body();
      assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
    }
  }
  pass('All 13 exact caption/alt/series mappings and 39 responsive asset hashes match');
  await page.locator('#earlier-concepts summary').click();
  for(const card of await page.locator('.concept-card').all()){
    await card.scrollIntoViewIfNeeded();
    assert.ok(await card.locator('img').evaluate(async img=>{await img.decode();return img.complete&&img.naturalWidth>0;}));
  }
  await page.locator('#earlier-concepts summary').click();
  pass('All 13 thumbnails decode; earlier three are separated in a closed details section by default');
  for(const category of ['lighting','sensors','cabling','enclosure','all']){
    await page.locator(`[data-filter="${category}"]`).click();
    assert.equal(await page.locator(`[data-filter="${category}"]`).getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#current-concepts .concept-card:not([hidden])').count(),data.concepts.filter(c=>c.series==='current'&&(category==='all'||c.category===category)).length);
  }
  await page.locator('[data-filter="sensors"]').click();await page.reload();
  assert.equal(await page.locator('#current-concepts .concept-card:not([hidden])').count(),2);
  await page.locator('[data-filter="all"]').click();
  pass('Category filters show correct counts, announce selection and survive a direct reload');
  const first=page.locator('[data-concept="warm-night"]');
  await first.click();await readyImage();
  assert.ok(await dialog.evaluate(el=>el.open));
  assert.ok(page.url().includes('#concept=warm-night'));
  assert.equal(await page.evaluate(()=>document.activeElement.className),'lightbox-close');
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('#concept-lightbox')));}
  await page.keyboard.press('ArrowRight');await readyImage();
  assert.equal(await page.locator('#lightbox-title').textContent(),data.concepts[1].title);
  await page.keyboard.press('ArrowLeft');await readyImage();
  assert.equal(await page.locator('#lightbox-title').textContent(),data.concepts[0].title);
  await page.keyboard.press('Escape');await closed();
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.concept),'warm-night');
  await first.click();await readyImage();await page.goBack();await closed();
  await page.goForward();assert.ok(await dialog.evaluate(el=>el.open));await readyImage();
  await page.locator('.lightbox-close').click();await closed();
  pass('Lightbox supports focus containment/return, arrows, Escape, Close and browser Back/Forward');
  for(const c of data.concepts){
    await page.goto(gallery+'#concept='+c.id);await readyImage();
    assert.ok(await dialog.evaluate(el=>el.open));
    assert.equal(await page.locator('#lightbox-title').textContent(),c.title);
    assert.equal(await page.locator('#lightbox-caption').textContent(),c.caption);
    assert.equal(await page.locator('#lightbox-image').getAttribute('alt'),c.alt);
    assert.equal(await page.locator('#lightbox-image').evaluate(img=>img.naturalWidth),c.assets[1600].width);
    await page.locator('.lightbox-close').click();await closed();
    assert.equal(new URL(page.url()).pathname,'/concepts');
  }
  pass('All 13 enlarged images decode with correct captions; direct links close within the gallery');
  for(const width of [320,375,390,768,1024,1440]){
    await page.setViewportSize({width,height:844});await page.goto(gallery);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'gallery overflow '+width);
    await page.locator('[data-concept="open-controller"]').click();await readyImage();
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false,'dialog overflow '+width);
    await page.keyboard.press('Escape');await closed();
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(gallery);
  await page.locator('#current-concepts img').evaluateAll(async images=>{for(const img of images)img.loading='eager';await Promise.all(images.map(img=>img.decode()));});
  await page.screenshot({path:path.join(root,'evidence/gallery-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto(gallery+'?category=sensors');
  await page.locator('[data-filter="sensors"][aria-pressed="true"]').waitFor();
  await page.screenshot({path:path.join(root,'evidence/gallery-mobile.png'),fullPage:true});
  await page.locator('[data-concept="sensor-aiming"]').click();await readyImage();
  await page.screenshot({path:path.join(root,'evidence/gallery-mobile-lightbox.png')});
  await page.keyboard.press('Escape');await closed();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).scrollBehavior),'auto');
  assert.equal(await page.locator('.concept-card').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  pass('Gallery and lightbox fit six widths; mobile/desktop screenshots and reduced-motion checks captured');
  const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await noJs.goto(gallery);assert.equal(await noJs.locator('#current-concepts .concept-card').count(),10);
  assert.ok(await noJs.locator('.concept-toolbar').evaluate(el=>el.hidden));
  await noJs.locator('#earlier-concepts summary').click();
  assert.ok(await noJs.locator('#earlier-concepts').evaluate(el=>el.open));
  assert.ok((await noJs.locator('[data-concept="earlier-surface"]').getAttribute('href')).endsWith('.webp'));
  await noJs.close();
  pass('No-JavaScript reading and full-image links remain available');
  for(const route of ['/','/next-visit','/components','/wiring']){
    await page.goto(base+route);assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('script,input,button').count(),0);
    assert.equal(await page.locator('nav a').count(),5);
  }
  await page.goto(base+'/wiring');assert.ok(await page.locator('main a[href="/concepts"]').count());
  await page.goto(base+'/components');const components=await page.locator('main').textContent();
  assert.ok(components.includes('ten CQRobot VL53L1X'));assert.ok(components.includes('not installed inventory'));
  await page.goto(base);const downloads=await page.locator('a[download]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  assert.equal(downloads.length,6);
  for(const name of downloads){const response=await page.request.get(new URL(name,base).href);assert.equal(response.status(),200);assert.ok((await response.body()).equals(await fs.readFile(path.join(root,'dist',name))));}
  assert.equal(execFileSync('git',['diff','a419b4b','--','bench','Yvels_Staircase_v1'],{cwd:path.join(root,'..'),encoding:'utf8'}),'');
  pass('Newer four-page guide, all six firmware/recovery downloads and every firmware source preserved');
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  const version=await(await page.request.get(base+'/site-version.json')).json();
  await fs.writeFile(path.join(root,'evidence/gallery-checks.json'),JSON.stringify({base,checks,version,images:data.concepts.length,assets:39},null,2));
  console.log(JSON.stringify({version}));
}finally{await browser.close();}
