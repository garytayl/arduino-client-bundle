import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=JSON.parse(await fs.readFile(path.join(root,'content/project.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const template=await fs.readFile(path.join(root,'src/index.html'),'utf8');
const versions=[];
await fs.mkdir(path.join(root,'dist/downloads'),{recursive:true});
const benchSource=await fs.readFile(path.join(root,'../bench/HW870_Sensor_Bench_v1/HW870_Sensor_Bench_v1.ino'));
await fs.writeFile(path.join(root,'dist/downloads/HW870_Sensor_Bench_v1.ino'),benchSource);
const tofSource=await fs.readFile(path.join(root,'../bench/VL53L1X_ToF_Bench_v1/VL53L1X_ToF_Bench_v1.ino'));
await fs.writeFile(path.join(root,'dist/downloads/VL53L1X_ToF_Bench_v1.ino'),tofSource);
await fs.copyFile(path.join(root,'../bench/LED_Only_Bench_v1/LED_Only_Bench_v1.ino'),path.join(root,'dist/downloads/LED_Only_Bench_v1.ino'));
for(const v of data.versions){
  if(!/^[a-f0-9]{40}$/.test(v.commit)||!/^\w[\w.-]*\.ino$/.test(v.download))throw Error('Invalid version metadata');
  // Resolve each download from its pinned Git object, never from a moving working file.
  const source=execFileSync('git',['show',`${v.commit}:${v.path}`],{cwd:path.join(root,'..')});
  await fs.writeFile(path.join(root,'dist/downloads',v.download),source);
  const hash=createHash('sha256').update(source).digest('hex');
  versions.push(`<article class="release"><div class="release-head"><span class="pill">${escape(v.label)}</span><span class="mono">${escape(v.date)} · ${v.commit.slice(0,7)}</span></div><h2>${escape(v.name)}</h2><p>Direction-aware RGB animation with two digital inputs. This is the only firmware revision verified in the repository.</p><div class="specs"><span>FastLED</span><span>WS2812B · GRB</span><span>Brightness 70 / 255</span></div><div class="actions"><a class="button primary" href="downloads/${v.download}" download>↓ Download original .ino</a><a class="button" href="${data.repository}/blob/${v.commit}/${v.path}">View pinned source ↗</a></div><details><summary>Download integrity</summary><p class="mono hash">SHA-256<br>${hash}</p><p>Byte-for-byte copy of the original sketch. Open in Arduino IDE with the correct board, port and FastLED library. Hardware setup must be confirmed before upload.</p></details></article>`);
}
const notes=data.notes.map((n,i)=>`<article class="note"><span class="index">0${i+1}</span><div><span class="eyebrow">${escape(n.status)}</span><h2>${escape(n.title)}</h2><p>${escape(n.body)}</p></div></article>`).join('');
const benchPage=await fs.readFile(path.join(root,'src/bench.html'),'utf8');
const ledPage=await fs.readFile(path.join(root,'src/led.html'),'utf8');
const tofPage=await fs.readFile(path.join(root,'src/tof.html'),'utf8');
await fs.writeFile(path.join(root,'dist/index.html'),template.replace('{{VERSIONS}}',versions.join('')).replace('{{NOTES}}',notes).replace('{{BENCH}}',benchPage).replace('{{TOF}}',tofPage).replace('{{LED}}',ledPage).replaceAll('{{VERIFIED}}',data.verifiedOn));
for(const file of ['styles.css','app.js','favicon.svg'])await fs.copyFile(path.join(root,'src',file),path.join(root,'dist',file));
await fs.copyFile(path.join(root,'vercel.json'),path.join(root,'dist/vercel.json'));
console.log(`Built static hub: ${data.versions.length} verified firmware revision; downloads preserve original bytes.`);
