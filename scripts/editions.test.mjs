import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {EDITIONS,normalizeEdition,editionPlayerUrl} from '../docs/editions.js';
import {identifyGameRoot as identifyCdRoot,validateCdFile} from '../docs/cd-library.js';
const root=new URL('../',import.meta.url),read=name=>readFileSync(new URL(name,root),'utf8');
const digest=name=>createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex');
test('tested floppy and CD players/importers are preserved byte for byte',()=>{
  for(const [name,hash]of Object.entries({
    'src/player.html':'9cfeb480df99f049a0b2479c4c5cd7372ec371306f0f890f82e97ba7e5b3c630',
    'src/game-library.ts':'87cdd0a450ecac4bee736334190b189e7a47c16ec1233e72a5dd88d94f922594',
    'src/cd/player.html':'6d4e4f3b9c47c2329c8b867d9e1587c7a14aa328f796e0dfa8563a1d6918518a',
    'src/cd-library.ts':'8c9e9c29ec1d39ce91e6fc3b556d81b304b074318b104340d373cd0fef5e9222',
  }))assert.equal(digest(name),hash,name);
  assert.equal(read('src/player.html'),read('docs/player.html'));
  assert.equal(read('src/cd/player.html'),read('docs/cd/player.html'));
});
test('launch URLs route to distinct tested players, configs and virtual game folders',()=>{
  for(const key of ['floppy','cd']){
    const e=EDITIONS[key],url=editionPlayerUrl(key,'https://example.github.io/goblins2-web-test/',123);
    assert.equal(url.pathname,`/goblins2-web-test/${key==='cd'?'cd/':''}player.html`);
    assert.equal(decodeURIComponent(url.hash),`#--config=${e.config} --music-driver=adlib --path=${e.gamePath} gob:gob2`);
    assert.equal(url.searchParams.get('audio_pipeline'),'queued');assert.equal(url.searchParams.get('service_timers'),'1');
  }
  assert.equal(normalizeEdition('invalid'),'floppy');
});
test('both existing save mounts/databases and installed app identity remain unchanged',()=>{
  assert.notEqual(EDITIONS.floppy.database,EDITIONS.cd.database);assert.notEqual(EDITIONS.floppy.home,EDITIONS.cd.home);
  for(const [key,prefix,library]of [['floppy','','game-library'],['cd','cd/','cd-library']]){
    const e=EDITIONS[key],player=read(`docs/${prefix}player.html`);
    assert.ok(player.includes(`indexedDB.open('${e.database}'`));
    assert.ok(player.includes(`ENV.HOME = '${e.home}'`));assert.ok(player.includes(`savepath=${e.home}`));
    assert.ok(read(`docs/${library}.js`).includes(e.database));
  }
  assert.doesNotMatch(read('docs/shell.js'),/clearGameLibrary|deleteDatabase|syncfs/);
  const manifest=JSON.parse(read('docs/manifest.webmanifest'));
  assert.equal(manifest.id,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
});
test('CD engine and complete support catalog stay in their own subdirectory',()=>{
  for(const ext of ['js','wasm'])assert.equal(digest(`docs/engine/7eeac96190be191e/scummvm.${ext}`),digest(`docs/cd/engine/7eeac96190be191e/scummvm.${ext}`));
  const check=dir=>{for(const [name,value]of Object.entries(JSON.parse(read(`docs/cd/data/${dir}index.json`)))){
    if(typeof value==='number')assert.equal(statSync(new URL(`docs/cd/data/${dir}${name}`,root)).size,value);
    else check(`${dir}${name}/`);
  }};check('');
});
test('CD importer accepts only its complete release and prepared audio',async()=>{
  const records=['INTRO.STK','GOBNEW.LIC','track1.ogg'].map(path=>({path,size:1}));
  assert.equal(identifyCdRoot(records).release,'English US · DOS CD v1.000');
  assert.throws(()=>identifyCdRoot(records.slice(0,2)),/track1.ogg/);
  await assert.rejects(validateCdFile('INTRO.STK',new Blob(['wrong edition'])),/different or damaged/);
  await assert.rejects(validateCdFile('track1.ogg',new Blob(['renamed FLAC'])),/Ogg Vorbis/);
});

const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function shell(options={}){
  const nodes=new Map(),listeners={},preferences=new Map(),calls=[],messages=[],confirmations=[];
  if(options.preference)preferences.set('goblins2-preferred-edition',options.preference);
  const element=id=>{
    if(!nodes.has(id))nodes.set(id,{textContent:'',value:'',hidden:false,disabled:false,checked:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});
    return nodes.get(id);
  };
  const radios=['floppy','cd'].map(value=>Object.assign(element(`radio-${value}`),{value}));
  const player=element('player');player.src='';player.contentWindow={postMessage:(...args)=>messages.push(args)};
  const metadata={floppy:{release:'floppy v1.03',fileCount:4,totalBytes:10},cd:{release:'CD v1.000',fileCount:4,totalBytes:20}};
  const library=key=>({
    getGameLibraryMetadata:options[key]||(()=>Promise.resolve(metadata[key])),
    importGameZip:async file=>{calls.push([key,'zip',file.name]);return {...metadata[key],release:`new ${key}`};},
    importGameFolder:async files=>{calls.push([key,'folder',files.length]);return metadata[key];},formatBytes:n=>`${n} bytes`,
  });
  const context={floppyLibrary:library('floppy'),cdLibrary:library('cd'),EDITIONS,normalizeEdition,editionPlayerUrl,
    document:{getElementById:element,querySelectorAll:()=>radios,body:{classList:{add(){},remove(){}}}},
    window:{},location:new URL(`https://example.github.io/goblins2-web-test/${options.query||''}`),URLSearchParams,
    localStorage:{getItem:key=>preferences.get(key),setItem:(key,value)=>preferences.set(key,value)},
    matchMedia:()=>({matches:false}),navigator:{standalone:false},
    confirm:text=>{confirmations.push(text);return options.allowRestart??true;},
    addEventListener:(type,fn)=>listeners[type]=fn,console,
  };
  runInNewContext(read('docs/shell.js').replace(/^import[^\n]+;\n/gm,''),context);
  await tick();
  return {nodes,element,player,radios,calls,messages,preferences,confirmations,listeners,
    select:async key=>{radios.find(r=>r.value===key).handlers.change({target:{value:key}});await tick();},
    click:async id=>{element(id).onclick();await tick();},
  };
}
test('existing libraries appear without importing and selector remembers the edition',async()=>{
  const s=await shell();assert.match(s.element('library').textContent,/floppy v1.03/);
  assert.equal(s.element('floppy-ready').textContent,'Imported');assert.equal(s.element('cd-ready').textContent,'Imported');
  await s.select('cd');assert.equal(s.element('prepared-name').textContent,'Gobliins_2_CD_ready.zip');
  assert.match(s.element('library').textContent,/CD v1.000/);assert.equal(s.preferences.get('goblins2-preferred-edition'),'cd');
  assert.equal(s.player.src,'');assert.equal(s.calls.length,0);
  const restored=await shell({preference:'cd'});assert.equal(restored.element('play').textContent,'Play CD edition');
});
test('selecting another edition and declining Play leave the running game untouched',async()=>{
  const s=await shell({allowRestart:false});await s.click('play');const original=s.player.src;
  await s.click('menu');await s.select('cd');assert.equal(s.player.src,original);
  assert.match(s.element('session-note').textContent,/Floppy game is still running/);
  await s.click('play');assert.equal(s.player.src,original);assert.equal(s.confirmations.length,1);
  await s.click('continue');assert.equal(s.player.src,original);assert.equal(s.radios[0].checked,true);
});
test('confirmed switch uses CD routing and messages from the other edition are ignored',async()=>{
  const s=await shell();await s.click('play');await s.click('menu');await s.select('cd');await s.click('play');
  assert.match(s.player.src,/\/cd\/player.html/);assert.ok(s.messages.some(([m])=>m.source==='goblins2-cd-shell'));
  await s.listeners.message({origin:'https://example.github.io',source:s.player.contentWindow,data:{source:'goblins2-player',type:'error',text:'wrong player'}});
  assert.notEqual(s.player.src,'about:blank');assert.equal(s.element('error').textContent,'');
});
test('imports target only the selected library and do not touch a running other edition',async()=>{
  const s=await shell();await s.click('play');const original=s.player.src;
  await s.click('menu');await s.select('cd');
  await s.element('zip').handlers.change({target:{files:[{name:'CD.zip'}]}});await tick();
  assert.deepEqual(s.calls,[['cd','zip','CD.zip']]);assert.equal(s.player.src,original);
  await s.select('floppy');assert.match(s.element('library').textContent,/floppy v1.03/);
});
test('unavailable CD storage cannot block the existing floppy edition',async()=>{
  const s=await shell({cd:()=>new Promise(()=>{})});
  assert.equal(s.element('play').disabled,false);await s.click('play');assert.match(s.player.src,/\/player.html/);
  await s.click('menu');await s.select('cd');assert.equal(s.element('play').disabled,true);
  await s.click('continue');assert.equal(s.element('play').disabled,false);
});
test('CD storage failure stays on CD and a missing CD import never launches floppy by mistake',async()=>{
  const s=await shell({cd:()=>Promise.reject(new Error('CD storage unavailable'))});
  assert.equal(s.element('error').textContent,'');await s.select('cd');assert.match(s.element('error').textContent,/CD storage unavailable/);
  await s.click('play');assert.equal(s.player.src,'');await s.select('floppy');assert.equal(s.element('error').textContent,'');
});
