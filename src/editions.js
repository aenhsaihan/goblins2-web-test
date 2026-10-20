// UI routing only. Both tested players retain their unchanged storage code.
export const EDITIONS=Object.freeze({
  floppy:Object.freeze({label:'Floppy',release:'English US · DOS floppy v1.03',zip:'Gobliins_2_floppy_ready.zip',player:'./player.html',config:'/goblins2-web.ini',gamePath:'/games/gob2-floppy',database:'goblins2-floppy-library',home:'/home/goblins2-floppy',shellSource:'goblins2-shell',playerSource:'goblins2-player'}),
  cd:Object.freeze({label:'CD',release:'English US · DOS CD v1.000',zip:'Gobliins_2_CD_ready.zip',player:'./cd/player.html',config:'/goblins2-cd.ini',gamePath:'/games/gob2-cd',database:'goblins2-cd-library',home:'/home/goblins2-cd',shellSource:'goblins2-cd-shell',playerSource:'goblins2-cd-player'}),
});
export const normalizeEdition=value=>value==='cd'?'cd':'floppy';
export function editionPlayerUrl(key,base,launch=Date.now()){
  const edition=EDITIONS[normalizeEdition(key)],url=new URL(edition.player,base);
  url.search=new URLSearchParams({build:'gob2-editions-1',audio_pipeline:'queued',SDL_AUDIO_DEVICE_SAMPLE_FRAMES:'1024',service_timers:'1',launch:String(launch)});
  url.hash=`--config=${edition.config} --music-driver=adlib --path=${edition.gamePath} gob:gob2`;
  return url;
}
