import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {identifyGameRoot,validateFloppyFile} from '../docs/game-library.js';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const records=['INTRO.STK','DISK2.STK','DISK3.STK','ALL.ASK'].map(path=>({path:'game/'+path,size:path==='INTRO.STK'?805146:100}));
test('engine is the byte-identical, iPhone-confirmed audio-fixed pair',()=>{
  const hashes=['41a8319a4999f486b4883e11f3797f7e915aeee0f0f256fb79bfd177583999b7','7eeac96190be191ec3f87f62ec1a1987660fe4862b1cbe93f7e697796f3c8b42'];
  for(const [i,ext] of ['js','wasm'].entries())assert.equal(createHash('sha256').update(readFileSync(new URL(`docs/engine/7eeac96190be191e/scummvm.${ext}`,root))).digest('hex'),hashes[i]);
});
test('root detection requires all three assembled floppy archives in one folder',()=>{
  assert.equal(identifyGameRoot(records).root,'game');
  assert.match(identifyGameRoot(records).release,/v1.03/);
  assert.throws(()=>identifyGameRoot(records.filter(r=>!r.path.endsWith('DISK3.STK'))),/assembled DISK3/);
  assert.throws(()=>identifyGameRoot(records.map(r=>({...r,path:r.path.replace('DISK3.STK','DISK3.$00')}))),/assembled DISK3/);
  assert.throws(()=>identifyGameRoot([...records,{path:'game/mus_gob2.lic',size:1}]),/CD edition/);
});
test('hash validation rejects damaged or different-release files before storage',async()=>{
  await assert.rejects(validateFloppyFile('game/INTRO.STK',new Blob(['not the game'])),/different or damaged/);
  await validateFloppyFile('game/ALL.ASK',new Blob(['optional keyboard data']));
});
function load(){
  const elements=new Map(),fetches=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{style:{},value:'',addEventListener(){},classList:{add(){},toggle(){}}});return elements.get(id);};
  const document={getElementById:element,querySelector:element,createElement:()=>({}),addEventListener(){},body:{appendChild:script=>document.script=script}};
  const location=new URL('https://example.github.io/goblins2-web-test/player.html');
  const window={parent:{postMessage(){}},fetch:async(input,options)=>{fetches.push({input,options});return new Response('ok');}};
  const context={window,document,location,history:{replaceState:(_a,_b,url)=>{context.rewritten=url;}},URL,URLSearchParams,Request,Response,Headers,navigator:{userAgent:'Test',platform:'Test',maxTouchPoints:0},XMLHttpRequest:class{open(){}},innerWidth:800,innerHeight:600,addEventListener(){},setTimeout,clearTimeout,console};
  runInNewContext(read('docs/player.html').match(/<script>([\s\S]*?)<\/script>/)[1],context);
  return {window,document,context,fetches};
}
test('bundled runtime and timer fix are always selected under the project subpath',()=>{
  const p=load();assert.match(p.document.script.src,/^\/goblins2-web-test\/engine\/7eeac96190be191e\/scummvm.js$/);assert.match(p.context.rewritten,/service_timers=1/);assert.equal(p.context.midiOutputMap.size,0);
});
test('virtual data requests use the project subpath, not the account root',async()=>{
  const p=load();await p.window.fetch('/data/index.json');assert.equal(p.fetches[0].input,'https://example.github.io/goblins2-web-test/data/index.json');
});
test('game files and IDBFS HOME are isolated from Goblins 3',()=>{
  const player=read('docs/player.html'),library=read('docs/game-library.js'),shell=read('docs/shell.js');
  assert.match(library,/goblins2-floppy-library/);assert.match(player,/indexedDB.open\('goblins2-floppy-library'/);
  assert.match(player,/ENV.HOME = '\/home\/goblins2-floppy'/);assert.match(player,/savepath=\/home\/goblins2-floppy/);
  assert.match(shell,/--path=\/games\/gob2-floppy gob:gob2/);assert.match(shell,/--config=\/goblins2-web.ini/);
  assert.doesNotMatch(player,/goblins3|gob3|web_user|kuendig.io|blackbrush12|game-v5/);
  assert.deepEqual(JSON.parse(read('docs/data/index.json')).games,{});
});
test('phone save-name keyboard invokes ScummVM virtual keyboard, not a fake overlay',()=>{
  const player=read('docs/player.html');
  assert.match(player,/id="keyboard"/);
  assert.match(player,/key\('keydown', 'Control', 'ControlLeft', 17, true\)/);
  assert.match(player,/key\('keydown', 'F7', 'F7', 118, true\)/);
  assert.match(player,/key\('keyup', 'Control', 'ControlLeft', 17, false\)/);
});
test('published tree contains no game archives, images or supplied prepared ZIP',()=>{
  const files=readdirSync(new URL('docs/',root),{recursive:true}).filter(x=>typeof x==='string');
  assert.equal(files.some(x=>/\.(stk|itk|img|7z|s\d\d)$/i.test(x)),false);
  assert.equal(files.some(x=>/floppy_ready\.zip/i.test(x)),false);
  assert.equal(files.some(x=>/\.zip$/i.test(x)&&!x.startsWith('data/')),false);
});
