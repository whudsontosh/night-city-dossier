
/* ============================== SHARED TABLE UI ============================== */
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64d(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return decodeURIComponent(escape(atob(s)))}
function makeInvite(u,p,n){return "NCD1."+b64e(JSON.stringify({u:String(u).replace(/\/+$/,""),p,n}))}
function readInvite(code){code=String(code||"").trim().replace(/\s+/g,"");const m=code.match(/NCD1\.([A-Za-z0-9_-]+)/);if(!m)return null;
  try{const j=JSON.parse(b64d(m[1]));if(!/^https?:\/\/[^\s/]+/.test(j.u||""))return null;return {u:j.u.replace(/\/+$/,""),p:String(j.p||""),n:String(j.n||"")}}catch(e){return null}}
function cleanText(s,n){return String(s??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n)}
function copyText(text,okMsg){const done=()=>showNotice(okMsg||"Copied.");
  if(window.desk&&window.desk.copy){window.desk.copy(text).then(done,()=>showNotice("Couldn't copy. Select the text and press Ctrl+C."));return}
  try{navigator.clipboard.writeText(text).then(done,()=>showNotice("Couldn't copy. Select the text and press Ctrl+C."))}catch(e){showNotice("Couldn't copy. Select the text and press Ctrl+C.")}}
const ICONS={
  select:'<path d="M6 3.5l11.5 9-5.2 1.2-2.6 5.3z"/>',
  pan:'<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>',
  ruler:'<path d="M3.5 16.5L16.5 3.5l4 4-13 13z"/><path d="M7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
  draw:'<path d="M4 20l4.2-1L19 8.2 15.8 5 5 15.8z"/><path d="M13.8 7l3.2 3.2"/>',
  fogadd:'<path d="M7 17h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 17z" fill="currentColor" fill-opacity=".35"/>',
  fogcut:'<rect x="4" y="5" width="16" height="14" stroke-dasharray="3 2.5"/><path d="M9 12l2 2 4-4"/>',
  fogpoly:'<path d="M5 7l7-3 7 5-2 10H7z" fill="currentColor" fill-opacity=".35"/>',
  fogcutpoly:'<path d="M5 7l7-3 7 5-2 10H7z" stroke-dasharray="3 2.5"/>',
  ping:'<circle cx="12" cy="12" r="2.6" fill="currentColor"/><circle cx="12" cy="12" r="7.5"/>',
  zin:'<circle cx="11" cy="11" r="6.5"/><path d="M11 8v6M8 11h6M16 16l4 4"/>',
  zout:'<circle cx="11" cy="11" r="6.5"/><path d="M8 11h6M16 16l4 4"/>',
  fit:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
};
function icon(n){return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||""}</svg>`}
function toolBtn(t,cur,ic,title){return `<button class="mtool ${cur===t?"on":""}" data-act="map-tool" data-t="${t}" title="${esc(title)}" aria-label="${esc(title)}" aria-pressed="${cur===t}">${icon(ic)}</button>`}
function inkBar(view,allowErase=true){
  return `<div class="map-sub" role="toolbar" aria-label="Drawing">
    <span class="seg">${[["pen","Pen"],["line","Line"],["rect","Box"]].concat(allowErase?[["erase","Eraser"]]:[]).map(([k,l])=>`<button class="${view.drawMode===k?"on":""}" data-act="ink-mode" data-v="${k}">${l}</button>`).join("")}</span>
    <span class="inks">${INK_COLORS.map(c=>`<button class="inkdot ${view.inkColor===c?"on":""}" style="background:${c}" data-act="ink-color" data-v="${c}" aria-label="Color ${c}"></button>`).join("")}</span>
    <span class="seg">${[[2,"Thin"],[4,"Med"],[8,"Thick"]].map(([w,l])=>`<button class="${view.inkWidth===w?"on":""}" data-act="ink-width" data-v="${w}">${l}</button>`).join("")}</span>
  </div>`}
function logHTML(list,myPid){
  if(!list.length)return `<p class="faint" style="margin:0;font-size:13px">Rolls, chat and who joined show up here.</p>`;
  return list.slice(-80).map(e=>{
    const who=`<b style="color:${esc(e.color||"var(--ink)")}">${esc(e.who||"")}</b>`;
    if(e.kind==="roll")return `<div class="tl roll"><div style="min-width:0">${who} <span class="faint">rolled</span> ${esc(e.label||"")}<div class="det mono">${esc(e.detail||"")}</div>${e.dv?`<span class="chip ${e.total>=e.dv?"green":"red"}">${e.total>=e.dv?"Beats":"Misses"} DV ${e.dv}</span>`:""}</div><span class="tot num">${esc(e.total)}</span></div>`;
    if(e.kind==="chat")return `<div class="tl chat">${who} <span>${esc(e.text||"")}</span></div>`;
    return `<div class="tl sys">${esc(e.text||"")}</div>`}).join("");
}
function scrollLogs(){document.querySelectorAll(".tlog").forEach(el=>{if(el.dataset.stick!=="0")el.scrollTop=el.scrollHeight})}
document.addEventListener("scroll",ev=>{const el=ev.target;if(el.classList&&el.classList.contains("tlog"))el.dataset.stick=(el.scrollHeight-el.scrollTop-el.clientHeight<30)?"1":"0"},true);
function deskBackupScheduler(kind,getText){let t=null,pending=false;
  const run=()=>{if(!pending)return;pending=false;clearTimeout(t);try{window.desk.backup(kind,getText())}catch(e){}};
  window.addEventListener("beforeunload",run);document.addEventListener("visibilitychange",()=>{if(document.hidden)run()});
  return ()=>{if(!window.desk||!window.desk.backup)return;pending=true;clearTimeout(t);t=setTimeout(()=>idle(run),4000)}}
function desktopBackupHTML(){return `<div style="display:grid;gap:6px"><span><span class="chip green">Automatic</span> Backup files are written to your <b>Documents\\Night City Dossier\\backups</b> folder a few seconds after each change. One file per day is kept for 30 days.</span>
  <div class="row"><button class="btn sm" data-act="open-backups">Open backups folder</button></div></div>`}
