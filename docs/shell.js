import * as floppyLibrary from './game-library.js';
import * as cdLibrary from './cd-library.js?v=editions-1';
import {EDITIONS,normalizeEdition,editionPlayerUrl} from './editions.js?v=editions-1';
const $=id=>document.getElementById(id),player=$('player');
const libraries={floppy:floppyLibrary,cd:cdLibrary};
const states=Object.fromEntries(Object.keys(EDITIONS).map(key=>[key,{metadata:null,loading:true,error:'',notice:'',revision:0}]));
const radios=Array.from(document.querySelectorAll('input[name="edition"]'));
const preferenceKey='goblins2-preferred-edition';
let preferred='floppy';
try{preferred=localStorage.getItem(preferenceKey)||preferred;}catch{}
const requested=new URLSearchParams(location.search).get('edition');
let selectedEdition=normalizeEdition(requested==='floppy'||requested==='cd'?requested:preferred);
let runningEdition=null,importingEdition=null,expanded=false;
const errorText=error=>error?.message||String(error);
function render(){
  const key=selectedEdition,edition=EDITIONS[key],state=states[key];
  for(const radio of radios)radio.checked=radio.value===key;
  for(const editionKey of Object.keys(EDITIONS)){
    const item=states[editionKey];
    $(`${editionKey}-ready`).textContent=item.loading?'Checking…':item.metadata?'Imported':item.error?'Storage unavailable':'Import your copy';
  }
  $('edition-heading').textContent=`Bring your ${key==='cd'?'CD':'floppy'} game`;
  $('edition-description').textContent=edition.release;
  $('prepared-name').textContent=edition.zip;
  $('library').textContent=state.loading?'Checking local game storage…':state.metadata
    ?`${state.metadata.release} · ${state.metadata.fileCount} files · ${libraries[key].formatBytes(state.metadata.totalBytes)} stored in this browser.`
    :`No ${key==='cd'?'CD':'floppy'} game imported in this browser yet.`;
  $('status').textContent=state.notice;$('error').textContent=state.error;
  $('play').textContent=`${runningEdition===key?'Restart':'Play'} ${edition.label} edition`;
  $('play').disabled=Boolean(importingEdition)||state.loading||!state.metadata;
  $('zip').disabled=$('folder').disabled=Boolean(importingEdition);
  $('edition-picker').disabled=Boolean(importingEdition);
  $('continue').hidden=!runningEdition;
  $('continue').textContent=runningEdition?`Return to ${EDITIONS[runningEdition].label} game`:'Return to game';
  $('session-note').textContent=runningEdition&&runningEdition!==key?`Your ${EDITIONS[runningEdition].label} game is still running. Save it before starting the ${edition.label} edition.`:'';
  $('cd-test-link').hidden=key!=='cd';
}
function selectEdition(key){
  selectedEdition=normalizeEdition(key);
  try{localStorage.setItem(preferenceKey,selectedEdition);}catch{}
  render();
}
for(const radio of radios)radio.addEventListener('change',event=>{if(!importingEdition)selectEdition(event.target.value);});
async function readLibrary(key){
  const state=states[key],revision=state.revision;
  try{const metadata=await libraries[key].getGameLibraryMetadata();if(state.revision===revision)state.metadata=metadata;}
  catch(error){if(state.revision===revision)state.error=errorText(error);}
  finally{if(state.revision===revision)state.loading=false;render();}
}
async function importFiles(kind,files){
  if(!files?.length||importingEdition)return;
  const key=selectedEdition,state=states[key];
  importingEdition=key;state.revision++;state.error='';state.notice='';
  $('progress').hidden=false;$('progress').value=0;render();
  try{
    const options={sourceName:files[0].name,onProgress:({percent,detail})=>{$('progress').value=percent;state.notice=detail;render();}};
    state.metadata=kind==='zip'?await libraries[key].importGameZip(files[0],options):await libraries[key].importGameFolder(files,options);
    state.notice=`${EDITIONS[key].label} edition ready. Your save files have not been changed.`;
  }catch(error){state.error=errorText(error);}
  finally{importingEdition=null;state.loading=false;$('zip').value=$('folder').value='';$('progress').hidden=true;render();}
}
$('zip').addEventListener('change',event=>importFiles('zip',event.target.files));
$('folder').addEventListener('change',event=>importFiles('folder',event.target.files));
function showGame(){document.body.classList.add('playing');$('game').hidden=false;syncDisplay();}
function showMenu(){
  document.body.classList.remove('playing');$('game').hidden=true;expanded=false;
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  sendToPlayer('fullscreen-state',{expanded:false});render();
}
function launch(){
  if(importingEdition||states[selectedEdition].loading||!states[selectedEdition].metadata)return;
  if(runningEdition&&!confirm(`Starting the ${EDITIONS[selectedEdition].label} edition will close your running ${EDITIONS[runningEdition].label} game. Save first if you want to keep your progress. Continue?`))return;
  states[selectedEdition].error='';runningEdition=selectedEdition;expanded=false;
  player.src=editionPlayerUrl(runningEdition,location.href).href;showGame();render();
}
$('play').onclick=launch;$('menu').onclick=showMenu;
$('continue').onclick=()=>{if(runningEdition){selectEdition(runningEdition);showGame();}};
function sendToPlayer(type,extra={}){
  if(runningEdition)player.contentWindow?.postMessage({source:EDITIONS[runningEdition].shellSource,type,...extra},location.origin);
}
function syncDisplay(){
  const standalone=matchMedia('(display-mode: standalone)').matches||Boolean(navigator.standalone);
  sendToPlayer('display-mode',{standalone});sendToPlayer('viewport-change');
}
player.addEventListener('load',syncDisplay);
addEventListener('resize',syncDisplay);addEventListener('orientationchange',syncDisplay);
window.visualViewport?.addEventListener('resize',syncDisplay);
addEventListener('message',async event=>{
  if(!runningEdition||event.origin!==location.origin||event.source!==player.contentWindow||event.data?.source!==EDITIONS[runningEdition].playerSource)return;
  const state=states[runningEdition];
  if(event.data.type==='error'){state.error=event.data.text;runningEdition=null;player.src='about:blank';showMenu();return;}
  if(event.data.type==='status'){state.notice=event.data.text;render();}
  if(event.data.type==='ready')syncDisplay();
  if(event.data.type==='toggle-fullscreen'){
    expanded=!expanded;
    if(expanded){try{await $('game').requestFullscreen?.();}catch{}}
    else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}showMenu();}
    sendToPlayer('fullscreen-state',{expanded});syncDisplay();
  }
});
render();
// One unavailable edition must not hold up the other one's existing library.
for(const key of Object.keys(EDITIONS))void readLibrary(key);
