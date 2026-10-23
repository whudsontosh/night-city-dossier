/* 1.4.0: the desktop app also runs on macOS */
const IS_MAC=!!(window.desk&&window.desk.platform==="darwin")||(!window.desk&&/Mac/i.test(navigator.platform||""));

/* ============================== SHARED TABLE UI ============================== */
function b64e(s){return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64d(s){s=String(s).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return decodeURIComponent(escape(atob(s)))}
function makeInvite(u,p,n){return "NCD1."+b64e(JSON.stringify({u:String(u).replace(/\/+$/,""),p,n}))}
function readInvite(code){code=String(code||"").trim().replace(/\s+/g,"");const m=code.match(/NCD1\.([A-Za-z0-9_-]+)/);if(!m)return null;
  try{const j=JSON.parse(b64d(m[1]));if(!/^https?:\/\/[^\s/]+/.test(j.u||""))return null;return {u:j.u.replace(/\/+$/,""),p:String(j.p||""),n:String(j.n||"")}}catch(e){return null}}
function cleanText(s,n){return String(s??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,n)}
function copyText(text,okMsg){const done=()=>showNotice(okMsg||"Copied.");
  if(window.desk&&window.desk.copy){window.desk.copy(text).then(done,()=>showNotice(`Couldn't copy. Select the text and press ${IS_MAC?"Cmd":"Ctrl"}+C.`));return}
  try{navigator.clipboard.writeText(text).then(done,()=>showNotice(`Couldn't copy. Select the text and press ${IS_MAC?"Cmd":"Ctrl"}+C.`))}catch(e){showNotice(`Couldn't copy. Select the text and press ${IS_MAC?"Cmd":"Ctrl"}+C.`)}}
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
  trash:'<path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13h9l1-13M10 10v6.5M14 10v6.5"/>',
  map:'<path d="M3.5 6l5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2z"/><path d="M9 4v14M15 6v14"/>',
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
    if(e.kind==="roll")return `<div class="tl roll"><div style="min-width:0">${who} <span class="faint">rolled</span> ${esc(e.label||"")}<div class="det mono">${esc(e.detail||"")}</div>${rollVerdict(e)}</div><span class="tot num">${esc(e.total)}</span></div>`;
    if(e.kind==="chat")return `<div class="tl chat">${who} <span>${esc(e.text||"")}</span></div>`;
    return `<div class="tl sys">${esc(e.text||"")}</div>`}).join("");
}
function scrollLogs(){document.querySelectorAll(".tlog").forEach(el=>{if(el.dataset.stick!=="0")el.scrollTop=el.scrollHeight})}
document.addEventListener("scroll",ev=>{const el=ev.target;if(el.classList&&el.classList.contains("tlog"))el.dataset.stick=(el.scrollHeight-el.scrollTop-el.clientHeight<30)?"1":"0"},true);
function deskBackupScheduler(kind,getText){let t=null,pending=false;
  const run=()=>{if(!pending)return;pending=false;clearTimeout(t);try{window.desk.backup(typeof kind==="function"?kind():kind,getText())}catch(e){}};
  window.addEventListener("beforeunload",run);document.addEventListener("visibilitychange",()=>{if(document.hidden)run()});
  return ()=>{if(!window.desk||!window.desk.backup)return;pending=true;clearTimeout(t);t=setTimeout(()=>idle(run),4000)}}
function desktopBackupHTML(){return `<div style="display:grid;gap:6px"><span><span class="chip green">Automatic</span> Backup files are written to your <b>${IS_MAC?"Documents/Night City Dossier/backups":"Documents\\Night City Dossier\\backups"}</b> folder a few seconds after each change. One file per day is kept for 30 days.</span>
  <div class="row"><button class="btn sm" data-act="open-backups">Open backups folder</button></div></div>`}

/* ---------- map sidebar width (1.3.3): drag the sidebar's left edge; remembered on this computer ---------- */
const SIDE_KEY="ncd-map-side-w",SIDE_DEF=420,SIDE_MIN=300;
function sideMax(){return Math.max(SIDE_MIN,Math.min(900,Math.round(window.innerWidth*0.6)))}
function sideStored(){try{return Number(localStorage.getItem(SIDE_KEY))||SIDE_DEF}catch(e){return SIDE_DEF}}
function setSideW(w,keep){w=Math.round(Math.min(sideMax(),Math.max(SIDE_MIN,Number(w)||SIDE_DEF)));document.documentElement.style.setProperty("--map-side-w",w+"px");
  if(keep)try{localStorage.setItem(SIDE_KEY,String(w))}catch(e){}
  document.querySelectorAll(".map-resize").forEach(h=>{h.setAttribute("aria-valuenow",String(w));h.setAttribute("aria-valuemax",String(sideMax()))});return w}
function mapResizeHandle(){const w=Math.min(sideMax(),sideStored());return `<div class="map-resize" role="separator" aria-orientation="vertical" aria-label="Sidebar width. Drag, or use the arrow keys. Double-click to reset." title="Drag to resize the sidebar (double-click to reset)" tabindex="0" aria-valuemin="${SIDE_MIN}" aria-valuemax="${sideMax()}" aria-valuenow="${w}"></div>`}
setSideW(sideStored());
window.addEventListener("resize",()=>setSideW(sideStored()));
document.addEventListener("pointerdown",ev=>{const h=ev.target.closest&&ev.target.closest(".map-resize");if(!h||ev.button!==0)return;
  const side=h.parentElement&&h.parentElement.querySelector(".map-side");if(!side)return;ev.preventDefault();
  const x0=ev.clientX,w0=side.getBoundingClientRect().width;let w=w0;try{h.setPointerCapture(ev.pointerId)}catch(e){}document.body.classList.add("side-resizing");
  const move=e=>{w=setSideW(w0+(x0-e.clientX))};
  const up=()=>{h.removeEventListener("pointermove",move);h.removeEventListener("pointerup",up);h.removeEventListener("pointercancel",up);document.body.classList.remove("side-resizing");setSideW(w,true)};
  h.addEventListener("pointermove",move);h.addEventListener("pointerup",up);h.addEventListener("pointercancel",up)});
document.addEventListener("dblclick",ev=>{if(ev.target.closest&&ev.target.closest(".map-resize"))setSideW(SIDE_DEF,true)});
document.addEventListener("keydown",ev=>{const h=ev.target;if(!h.classList||!h.classList.contains("map-resize"))return;
  const cur=sideStored();let w=null;if(ev.key==="ArrowLeft")w=cur+30;else if(ev.key==="ArrowRight")w=cur-30;else if(ev.key==="Home")w=SIDE_MIN;else if(ev.key==="End")w=sideMax();else if(ev.key==="Enter")w=SIDE_DEF;
  if(w!=null){ev.preventDefault();ev.stopPropagation();setSideW(w,true)}},true);
