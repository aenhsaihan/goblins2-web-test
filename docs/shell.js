import {getGameLibraryMetadata,importGameZip,importGameFolder,formatBytes} from './game-library.js';
const $=id=>document.getElementById(id);
const player=$('player');
let library=null,running=false,expanded=false;
const updateLibrary=()=>{
  $('library').textContent=library?`${library.release} · ${library.fileCount} files · ${formatBytes(library.totalBytes)} stored in this browser.`:'No game imported at this test address yet.';
  $('play').disabled=!library;
};
try{library=await getGameLibraryMetadata();updateLibrary();}
catch(error){$('error').textContent=error.message;$('library').textContent='Could not open local test storage. Close other test tabs and retry.';}
async function importFiles(kind,files){
  if(!files?.length)return;
  $('error').textContent='';$('progress').hidden=false;$('progress').value=0;
  $('zip').disabled=$('folder').disabled=$('play').disabled=true;
  try{
    const options={sourceName:files[0].name,onProgress:({percent,detail})=>{$('progress').value=percent;$('status').textContent=detail;}};
    library=kind==='zip'?await importGameZip(files[0],options):await importGameFolder(files,options);
    $('status').textContent='Floppy game ready. Tap Play Gobliins 2.';
  }catch(error){$('error').textContent=error.message;}
  finally{$('zip').disabled=$('folder').disabled=false;$('zip').value=$('folder').value='';$('progress').hidden=true;updateLibrary();}
}
$('zip').addEventListener('change',e=>importFiles('zip',e.target.files));
$('folder').addEventListener('change',e=>importFiles('folder',e.target.files));
function showGame(){document.body.classList.add('playing');$('game').hidden=false;syncDisplay();}
function showMenu(){document.body.classList.remove('playing');$('game').hidden=true;$('continue').hidden=!running;}
function launch(){
  if(!library)return;
  if(running&&!confirm('Restart Gobliins 2? Save first if you want to keep your progress.'))return;
  const url=new URL('./player.html',location.href);
  url.search=new URLSearchParams({build:'gob2-floppy-1',audio_pipeline:'queued',SDL_AUDIO_DEVICE_SAMPLE_FRAMES:'1024',service_timers:'1',launch:String(Date.now())});
  url.hash='--config=/goblins2-web.ini --music-driver=adlib --path=/games/gob2-floppy gob:gob2';
  player.src=url.href;running=true;expanded=false;showGame();
}
$('play').onclick=launch;$('menu').onclick=showMenu;$('continue').onclick=showGame;
function syncDisplay(){
  const standalone=matchMedia('(display-mode: standalone)').matches||Boolean(navigator.standalone);
  player.contentWindow?.postMessage({source:'goblins2-shell',type:'display-mode',standalone},location.origin);
  player.contentWindow?.postMessage({source:'goblins2-shell',type:'viewport-change'},location.origin);
}
player.addEventListener('load',syncDisplay);
addEventListener('resize',syncDisplay);addEventListener('orientationchange',syncDisplay);
window.visualViewport?.addEventListener('resize',syncDisplay);
addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.source!==player.contentWindow||event.data?.source!=='goblins2-player')return;
  if(event.data.type==='error'){$('error').textContent=event.data.text;showMenu();}
  if(event.data.type==='status')$('status').textContent=event.data.text;
  if(event.data.type==='ready')syncDisplay();
  if(event.data.type==='toggle-fullscreen'){
    expanded=!expanded;
    if(expanded){try{await $('game').requestFullscreen?.();}catch{}}
    else{try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}showMenu();}
    player.contentWindow?.postMessage({source:'goblins2-shell',type:'fullscreen-state',expanded},location.origin);
    syncDisplay();
  }
});
