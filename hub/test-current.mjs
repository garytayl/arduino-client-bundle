import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('./dist/',import.meta.url), sha=x=>createHash('sha256').update(x).digest('hex');
const names=['index','next-visit','components','wiring','concepts'];
for(const name of names){
 const s=await fs.readFile(new URL(name+'.html',root),'utf8');
 assert.equal((s.match(/<h1[ >]/g)||[]).length,1,name);
 const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,name+' duplicate IDs');
 assert.ok(!s.includes('site-survey/'));assert.ok(!s.includes('actual photos'));assert.ok(!s.includes('diagnostic currently loaded'));
 for(const m of s.matchAll(/<(?:img|script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g))if(!/^(https?:|data:|#)/.test(m[1]))await fs.access(new URL(m[1].replace(/^\//,''),root));
 for(const m of s.matchAll(/<a\b[^>]*href="([^"?#]+)[^"]*"/g)) if(!/^(https?:|mailto:)/.test(m[1])){let local=m[1].replace(/^\//,'')||'index.html';if(!path.extname(local))local+='.html';await fs.access(new URL(local,root));}
 console.log('PASS heading, IDs, local links/assets and photo exclusion: '+name);
}
const home=await fs.readFile(new URL('index.html',root),'utf8');for(const s of ['0.0 Ω','VIN to SDA, SCL and RST','not visible together','No I²C scan was performed today','compiled but was not uploaded','About 80 LEDs','historical evidence'])assert.ok(home.includes(s),s);
const wiring=await fs.readFile(new URL('wiring.html',root),'utf8');for(const s of ['14 ft 2 in','74.37 ft','75 ft','950 mm','800 mm','not the sensor’s maximum range','9.2 ft','100 kHz','not a long-cable extender'])assert.ok(wiring.includes(s),s);
for(let i=0;i<8;i++){assert.ok(wiring.includes('S'+(i+1)+' / CH'+i));assert.ok(wiring.includes('<strong>'+(i*2+1)+' ft</strong>'));}
assert.equal(Math.round(((170/12)*4+8)*1.15*100)/100,74.37);
const components=await fs.readFile(new URL('components.html',root),'utf8');for(const s of ['28.5 × 23 mm','60 × 36 × 17 mm','55 × 31 × 12 mm','±2 mm','Price and stock are unverified','B07F3X2ZZ9'])assert.ok(components.includes(s),s);
const repo=new URL('../',import.meta.url);assert.equal(execFileSync('git',['diff','--name-only','64dd26633c69de46c6951508b4006fd84fc61523','--','bench','hub/src/images'],{cwd:repo}).toString(),'');
const pinned=execFileSync('git',['show','85364d5ed86d84dd3bd02fcd5e1f1753636ce0e7:Yvels_Staircase_v1/Yvels_Staircase_v1.ino'],{cwd:repo});assert.equal(sha(pinned),sha(await fs.readFile(new URL('downloads/Yvels_Staircase_v1-85364d5.ino',root))));
const map={'HW870_Sensor_Bench_v1.ino':'HW870_Sensor_Bench_v1/HW870_Sensor_Bench_v1.ino','VL53L1X_ToF_Bench_v1.ino':'VL53L1X_ToF_Bench_v1/VL53L1X_ToF_Bench_v1.ino','LED_Only_Bench_v1.ino':'LED_Only_Bench_v1/LED_Only_Bench_v1.ino','ToF_Rainbow_Ripple_90_Smooth_v2.ino':'releases/2026-10-24/ToF_Rainbow_Ripple_90_Smooth_v2.ino','Known_Good_ToF_LED_60_2026_10_24.zip':'releases/2026-10-24/Known_Good_ToF_LED_60_2026_10_24.zip'};
for(const [file,source] of Object.entries(map))assert.equal(sha(await fs.readFile(new URL('downloads/'+file,root))),sha(await fs.readFile(new URL('../bench/'+source,import.meta.url))));
const manifest=JSON.parse(await fs.readFile(new URL('./content/concepts.json',import.meta.url),'utf8'));assert.equal(manifest.concepts.length,13);for(const c of manifest.concepts)for(const a of Object.values(c.assets))assert.equal(sha(await fs.readFile(new URL('images/concepts/'+a.file,root))),a.sha256);
console.log('PASS current evidence, precise cable model, enclosure limits, all six download bytes and 39 historical image hashes');

// Resolve the download linked by the page, then verify its displayed integrity value.
const archivedLink=home.match(/href="([^"\s]*ToF_Rainbow_Ripple_90_Smooth_v2\.ino)"/);
assert.ok(archivedLink,'Archived firmware download link must exist');
const displayedHash=home.match(/Archived source SHA-256: ([a-f0-9]{64})<\/p>/);
assert.ok(displayedHash,'Archived checksum must be rendered, not a template token');
assert.equal(displayedHash[1],sha(await fs.readFile(new URL(archivedLink[1].replace(/^\//,''),root))),'Displayed archived checksum must match the linked download bytes');
console.log('PASS displayed archived SHA-256 matches the actual linked firmware download');
