
/* ============================== DICE CORE ============================== */
function d10x(){const rolls=[d(10)];if(rolls[0]===10){let x;do{x=d(10);rolls.push(x)}while(x===10&&rolls.length<8)}return rolls}
const Dice={log:[],key:"",who:()=>"",onChange:null,
  init(key,who){this.key=key;this.who=who;this.log=LS.get(key,[])||[]},
  push(e){this.log.unshift(e);this.log=this.log.slice(0,60);LS.set(this.key,this.log.slice(0,40));showToast(e);Tray.render()},
  check(label,base,opts={}){const rolls=d10x();const sum=rolls.reduce((a,b)=>a+b,0);const fumble=rolls[0]===1;
    const e={who:opts.who||this.who(),label,detail:`${base} + d10 (${rolls.join("+")})${fumble?" · FUMBLE":""}${rolls[0]===10?" · CRIT":""}`,total:base+sum,dv:opts.dv?Number(opts.dv):null,crit:rolls[0]===10,fumble,t:Date.now()};
    this.push(e);return e},
  expr(label,expr,bonus=0,who){const r=rollDice(expr);if(!r){showNotice(`"${expr}" isn't a dice expression. Try 2D6+3.`);return null}
    const e={who:who||this.who(),label,detail:`${expr}${bonus?" "+sgn(bonus):""} → ${r.text}${bonus?" "+sgn(bonus):""}`,total:Math.max(0,r.total+bonus),t:Date.now()};this.push(e);return e},
  raw(label,detail,total,who){this.push({who:who||this.who(),label,detail,total,t:Date.now()})}
};
const Tray={open:false,shareNote:"Rolls stay on this device",
  render(){const host=document.getElementById("tray-host");if(!host)return;if(!this.open){host.innerHTML="";return}
    const L=Dice.log;
    host.innerHTML=`<div class="tray" role="dialog" aria-label="Dice tray">
    <div class="tray-b"><div class="row" style="justify-content:space-between"><b style="font-family:var(--f-display);font-size:22px;text-transform:uppercase">Dice</b><button class="btn sm ghost" data-act="tray-clear">Clear log</button></div>
      <div class="row" style="gap:6px">${["1D10","1D6","2D6","3D6","4D6","1D10x"].map(e=>`<button class="btn sm" data-act="quick-roll" data-e="${e}">${e==="1D10x"?"D10 (exploding)":e}</button>`).join("")}</div>
      <div class="row" style="flex-wrap:nowrap"><input id="tray-expr" placeholder="e.g. 4D6+1" aria-label="Dice expression"><button class="btn primary" data-act="tray-roll">Roll</button></div></div>
    <div class="tray-log">${L.length?L.slice(0,40).map(r=>`<div class="rl"><div style="min-width:0"><div class="who">${esc(r.who)}</div><div class="lbl">${esc(r.label)}</div><div class="det">${esc(r.detail)}</div>${r.dv?`<span class="chip ${r.total>=r.dv?"green":"red"}">${r.total>=r.dv?"Beats":"Misses"} DV ${r.dv}</span>`:""}</div><div class="tot num">${r.total}</div></div>`).join(""):`<p class="faint" style="font-size:13px">Rolls land here.</p>`}</div>
  </div>`}
};
const CORE_ACTIONS={
  "toggle-tray":()=>{Tray.open=!Tray.open;Tray.render()},
  "quick-roll":el=>{const e=el.dataset.e;if(e==="1D10x"){Dice.check("D10",0);return}Dice.expr(e,e)},
  "tray-roll":()=>{const v=document.getElementById("tray-expr").value.trim();if(v)Dice.expr(v,v)},
  "tray-clear":()=>{Dice.log=[];LS.set(Dice.key,[]);Tray.render()},
};
let toastT=null;
function showToast(e){
  const host=document.getElementById("toast-host");if(!host)return;
  const verdict=e.dv?(e.total>=e.dv?`<span class="chip green">Beats DV ${e.dv}</span>`:`<span class="chip red">Misses DV ${e.dv}</span>`):"";
  host.innerHTML=`<div class="toast" role="status"><div class="tot num">${e.total}</div><div><div class="lbl">${esc(e.who)} · ${esc(e.label)}</div><div class="det">${esc(e.detail)}</div>${verdict}</div></div>`;
  clearTimeout(toastT);toastT=setTimeout(()=>host.innerHTML="",4200);
}
function showNotice(text){const host=document.getElementById("toast-host");if(!host)return;host.innerHTML=`<div class="toast" role="status"><div><div class="lbl">${esc(text)}</div></div></div>`;clearTimeout(toastT);toastT=setTimeout(()=>host.innerHTML="",4500)}

/* ============================== COMBAT MATH ============================== */
function rollLocation(){const r=d(10);return {r,loc:r===1?"head":r<=4?"torso":r===5?"rarm":r===6?"larm":r<=8?"rleg":"lleg"}}
function locName(l){return (LOCS.find(x=>x[0]===l)||[,l])[1]}
function computeHit({amount,loc,sp,ap,btm}){
  const name=locName(loc);let s=ap?Math.floor(sp/2):sp;let pen=amount-s;
  if(pen<=0) return {final:0,text:`${amount} damage vs SP ${s} at the ${name}: stopped by armor. No wounds.`};
  const steps=[`${amount} − SP ${s} = ${pen}`];
  if(ap){pen=Math.max(1,Math.floor(pen/2));steps.push(`AP halves → ${pen}`)}
  if(loc==="head"){pen*=2;steps.push(`head ×2 → ${pen}`)}
  const fin=Math.max(1,pen+btm);steps.push(`BTM ${btm} → ${fin}`);
  let note="";if(fin>8&&loc!=="torso")note=loc==="head"?" Over 8 to the head: instant death unless the GM rules otherwise.":" Over 8 to a limb: severed or crushed. Death save at Mortal 0.";
  return {final:fin,text:`${name}: ${steps.join(" · ")}. Takes ${fin} damage.${note}`};
}
function woundEffects(eff,level){
  if(level===2) eff.REF=Math.max(0,eff.REF-2);
  if(level===3) ["REF","INT","COOL"].forEach(k=>eff[k]=Math.ceil(eff[k]/2));
  if(level>=4) ["REF","INT","COOL"].forEach(k=>eff[k]=Math.ceil(eff[k]/3));
  return eff;
}
function woundTrackHTML(w,save,opts={}){
  return `<div class="wounds">${WOUND_LEVELS.map((lab,g)=>`<div class="wg ${g>=3?"mortal":""}"><span class="wl">${lab}</span><div class="bx">${[1,2,3,4].map(j=>{const n=g*4+j;return `<button class="${n<=w?"f":""}" ${opts.act?`data-act="${opts.act}" data-n="${n}" ${opts.extra||""}`:""} ${opts.disabled?"disabled":""} aria-label="${n} damage"></button>`}).join("")}</div><span class="ss num">Stun ${save-g}</span></div>`).join("")}</div>`;
}

/* ============================== FILES & BACKUPS ============================== */
function stamp(t=Date.now()){const x=new Date(t),p=n=>String(n).padStart(2,"0");return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}_${p(x.getHours())}${p(x.getMinutes())}`}
function fmtTime(t){if(!t)return "never";const x=new Date(t);const same=new Date().toDateString()===x.toDateString();return same?x.toLocaleTimeString([], {hour:"numeric",minute:"2-digit",second:"2-digit"}):x.toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
function ago(t){if(!t)return "never";const s=Math.round((Date.now()-t)/1000);if(s<10)return "just now";if(s<60)return s+"s ago";const m=Math.round(s/60);if(m<60)return m+" min ago";const h=Math.round(m/60);if(h<48)return h+" h ago";return Math.round(h/24)+" days ago"}
function safeName(s){return String(s||"character").replace(/[^a-z0-9_-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,40)||"character"}
function downloadText(filename,text,type="application/json"){
  try{const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},1500);return true}
  catch(e){showNotice("Your browser blocked the download.");return false}
}
function readFiles(fileList){return Promise.all([...fileList].map(f=>f.text().then(text=>({name:f.name,text})).catch(()=>({name:f.name,text:""}))))}
function charFileText(c){return JSON.stringify({format:"cp2020-character",version:2,exportedAt:new Date().toISOString(),character:c},null,1)}
function backupText(chars,extra={}){return JSON.stringify({format:"cp2020-backup",version:2,app:"Night City Dossier",savedAt:new Date().toISOString(),characters:chars,...extra},null,1)}
function parseBackup(text){
  let data;try{data=JSON.parse(text)}catch(e){return {error:"not valid JSON"}}
  const out={chars:[],gm:null};
  const isChar=x=>x&&typeof x==="object"&&x.stats&&typeof x.stats==="object";
  if(Array.isArray(data)) data.forEach(x=>{if(isChar(x))out.chars.push(x)});
  else if(data&&data.format==="cp2020-character"&&isChar(data.character)) out.chars.push(data.character);
  else if(data&&Array.isArray(data.characters)) data.characters.forEach(x=>{if(isChar(x))out.chars.push(x)});
  else if(isChar(data)) out.chars.push(data);
  if(data&&data.format==="cp2020-gm-backup"&&data.state) out.gm=data.state;
  if(data&&data.party&&Array.isArray(data.party)) data.party.forEach(x=>{if(isChar(x))out.chars.push(x)});
  return out;
}
function normalizeChar(x){const b=blankChar();const c={...b,...clone(x)};
  ["skills","roleChoices","stats","lifestyle","lifepath","ip"].forEach(k=>{if(!c[k]||typeof c[k]!=="object")c[k]=b[k]});
  ["customSkills","ipLog","armor","weapons","cyber","gear","contacts"].forEach(k=>{if(!Array.isArray(c[k]))c[k]=[]});
  STAT_KEYS.forEach(k=>{if(typeof c.stats[k]!=="number")c.stats[k]=Number(c.stats[k])||2});
  if(!c.id)c.id=uid();return c}

/* IndexedDB keeps the linked backup file handle between visits */
const IDB={db:null,
  open(){if(this.db)return Promise.resolve(this.db);return new Promise((res,rej)=>{try{const r=indexedDB.open("ncd-files",1);r.onupgradeneeded=()=>r.result.createObjectStore("h");r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>rej(r.error)}catch(e){rej(e)}})},
  async get(k){const db=await this.open();return new Promise((res)=>{const t=db.transaction("h").objectStore("h").get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>res(null)})},
  async set(k,v){const db=await this.open();return new Promise((res)=>{const t=db.transaction("h","readwrite").objectStore("h").put(v,k);t.onsuccess=()=>res(true);t.onerror=()=>res(false)})},
  async del(k){const db=await this.open();return new Promise((res)=>{const t=db.transaction("h","readwrite").objectStore("h").delete(k);t.onsuccess=()=>res(true);t.onerror=()=>res(false)})},
};
function makeFileLink(key,getText,onStatus){
  const L={supported:typeof window.showSaveFilePicker==="function",handle:null,name:"",status:"none",lastWrite:0,timer:null,error:"",
    async init(){if(!this.supported)return;try{const h=await IDB.get(key);if(h){this.handle=h;this.name=h.name;const p=await h.queryPermission({mode:"readwrite"});this.status=p==="granted"?"linked":"needs-permission"}}catch(e){}onStatus()},
    async link(suggested){try{const h=await window.showSaveFilePicker({suggestedName:suggested,types:[{description:"Night City backup",accept:{"application/json":[".json"]}}]});
      this.handle=h;this.name=h.name;this.status="linked";await IDB.set(key,h).catch(()=>{});await this.write();onStatus();showNotice(`Backing up to ${h.name} on every save.`)}catch(e){if(e&&e.name!=="AbortError")showNotice("Couldn't link that file.")}},
    async reconnect(){if(!this.handle)return;try{const p=await this.handle.requestPermission({mode:"readwrite"});this.status=p==="granted"?"linked":"needs-permission";if(this.status==="linked")await this.write();onStatus()}catch(e){}},
    async unlink(){this.handle=null;this.name="";this.status="none";await IDB.del(key).catch(()=>{});onStatus()},
    schedule(){if(this.status!=="linked")return;clearTimeout(this.timer);this.timer=setTimeout(()=>idle(()=>this.write()),3000)},
    async write(){if(this.status!=="linked"||!this.handle)return;try{const w=await this.handle.createWritable();await w.write(getText());await w.close();this.lastWrite=Date.now();this.error="";onStatus()}catch(e){this.status="needs-permission";this.error=String(e&&e.message||e);onStatus()}},
  };
  return L;
}
function lsSize(prefix){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(prefix))n+=(localStorage.getItem(k)||"").length}}catch(e){}return n}
function fmtKB(n){return n>1e6?(n/1e6).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB"}
/* ---- performance helpers ---- */
// Two balanced columns in plain grid (CSS multi-column layout was the main source of click lag).
function cols2(parts,weights){const total=weights.reduce((a,b)=>a+b,0);let acc=0,cut=parts.length;
  for(let i=0;i<parts.length;i++){if(acc+weights[i]/2>=total/2){cut=i;break}acc+=weights[i]}
  if(cut===0&&parts.length>1)cut=1;
  return `<div class="cols2"><div>${parts.slice(0,cut).join("")}</div><div>${parts.slice(cut).join("")}</div></div>`}
const idle=fn=>(window.requestIdleCallback?window.requestIdleCallback(fn,{timeout:1200}):setTimeout(fn,120));
// Patch the DOM instead of rebuilding it: unchanged nodes stay put, focus and scroll survive.
// Regions: rg(key,html) marks a panel. On redraw a panel whose HTML is unchanged is skipped entirely.
const RG={pending:[],cache:new WeakMap()};
function rg(key,html){key=String(key).replace(/[^a-z0-9_-]/gi,"_");RG.pending.push([key,html]);return `<div class="rg" data-rg="${key}"></div>`}
const MORPH_OPTS={
  onBeforeElUpdated(from,to){
    if(from.isEqualNode(to))return false;
    // a node changing into (or out of) a different panel must not reuse that panel's cached HTML
    if((from.dataset&&from.dataset.rg||"")!==(to.dataset&&to.dataset.rg||""))RG.cache.delete(from);
    if(from===document.activeElement&&(from.tagName==="TEXTAREA"||from.tagName==="SELECT"||(from.tagName==="INPUT"&&from.type!=="checkbox"&&from.type!=="radio")))return false;
    return true},
  onBeforeElChildrenUpdated(from){return !(from.dataset&&(from.dataset.rg||from.dataset.keep!==undefined))}};
function patch(el,html){
  const pending=RG.pending;RG.pending=[];
  if(typeof morphdom!=="function"){el.innerHTML=html;fillRegions(el,pending,true);return}
  morphdom(el,"<div>"+html+"</div>",{childrenOnly:true,...MORPH_OPTS});
  fillRegions(el,pending,false);
}
function fillRegions(root,pending,plain){
  // outer regions were registered after their inner ones, so walk backwards
  for(let i=pending.length-1;i>=0;i--){const [key,html]=pending[i];
    const node=root.querySelector(`[data-rg="${key}"]`);if(!node)continue;
    if(RG.cache.get(node)===html)continue;
    if(plain||!node.firstChild)node.innerHTML=html;
    else morphdom(node,"<div>"+html+"</div>",{childrenOnly:true,...MORPH_OPTS});
    RG.cache.set(node,html)}
}
/* Version history lives in IndexedDB: one record per version, written in the background. */
const Versions={db:null,ok:false,ready:false,q:[],mem:{},fbKey:"",
  async init(fbKey){this.fbKey=fbKey;try{this.db=await new Promise((res,rej)=>{const r=indexedDB.open("ncd-versions",1);r.onupgradeneeded=()=>{const os=r.result.createObjectStore("v",{keyPath:"key"});os.createIndex("scope","scope")};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>rej(new Error("blocked"))});this.ok=true}
    catch(e){this.ok=false;this.mem=LS.get(fbKey,{})||{}}this.ready=true;const q=this.q;this.q=[];q.forEach(f=>f())},
  _tx(mode){return this.db.transaction("v",mode).objectStore("v")},
  async listAll(prefix){ // -> {scope:[meta newest first]}
    const out={};
    if(!this.ok){for(const sc in this.mem)if(sc.startsWith(prefix))out[sc]=this.mem[sc].map(({data,...m})=>m);return out}
    await new Promise(res=>{const r=this._tx("readonly").openCursor();r.onsuccess=()=>{const cur=r.result;if(!cur){res();return}const v=cur.value;if(v.scope.startsWith(prefix)){(out[v.scope]||(out[v.scope]=[])).push({key:v.key,scope:v.scope,t:v.t,label:v.label,summary:v.summary})}cur.continue()};r.onerror=()=>res()});
    for(const k in out)out[k].sort((a,b)=>b.t-a.t);return out},
  add(scope,label,data,summary){const rec={key:scope+"|"+Date.now()+"|"+Math.random().toString(36).slice(2,6),scope,t:Date.now(),label,summary:summary||"",data};
    if(!this.ready){this.q.push(()=>this._put(rec));const {data:_,...meta}=rec;return meta}
    this._put(rec);const {data:_,...meta}=rec;return meta},
  _put(rec){const scope=rec.scope;
    if(!this.ok){const l=this.mem[scope]||(this.mem[scope]=[]);l.unshift(rec);if(l.length>3)l.length=3;idle(()=>lsSet(this.fbKey,this.mem));}
    else idle(()=>{try{this._tx("readwrite").put(rec)}catch(e){}})},
  async get(key){if(!this.ok){for(const sc in this.mem){const r=this.mem[sc].find(x=>x.key===key);if(r)return r}return null}
    return new Promise(res=>{const r=this._tx("readonly").get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})},
  del(keys){if(!keys.length)return;if(!this.ready){this.q.push(()=>this.del(keys));return}if(!this.ok){for(const sc in this.mem)this.mem[sc]=this.mem[sc].filter(x=>!keys.includes(x.key));idle(()=>lsSet(this.fbKey,this.mem));return}
    idle(()=>{try{const os=this._tx("readwrite");keys.forEach(k=>os.delete(k))}catch(e){}})},
};
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}

/* ============================== PAPER SHEET ============================== */
const PAPER_CSS=`
.page{width:8.5in;min-height:11in;padding:.4in;margin:0 auto 24px;background:#fff;color:#111;box-shadow:0 4px 24px rgba(0,0,0,.35);font-family:"Barlow","Segoe UI",Arial,sans-serif;font-size:10px;line-height:1.3;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;flex-direction:column;gap:7px}
.page *{box-sizing:border-box}
.pp-head{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:stretch;border:2px solid #111}
.pp-title{background:#111;color:#fff;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;min-width:1.9in}
.pp-title b{font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;font-size:30px;font-weight:900;font-style:italic;line-height:.9;letter-spacing:.01em}
.pp-title span{font-family:"IBM Plex Mono",Consolas,monospace;font-size:8px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;margin-top:4px}
.pp-fields{display:grid;grid-template-columns:repeat(4,1fr);gap:0;padding:6px 8px 6px 0}
.pf{border-bottom:1px solid #111;padding:2px 6px 1px;margin:0 4px 4px;min-height:24px}
.pf label{display:block;font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:#444}
.pf div{font-size:12px;font-weight:600;min-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf.w2{grid-column:span 2}
.pp-sec{border:1.5px solid #111}
.pp-sec>h3{margin:0;background:#111;color:#fff;font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:2px 8px;display:flex;justify-content:space-between;align-items:baseline}
.pp-sec>h3 small{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7.5px;font-weight:400;letter-spacing:.1em}
.pp-body{padding:6px 8px}
.pp-stats{display:grid;grid-template-columns:repeat(9,1fr);gap:4px}
.ps{border:1px solid #111;text-align:center;padding:2px 2px 3px}
.ps label{display:block;font-family:"IBM Plex Mono",Consolas,monospace;font-size:8px;font-weight:600;letter-spacing:.08em}
.ps b{display:block;font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;font-size:24px;font-weight:900;line-height:1;min-height:24px}
.ps i{display:block;font-style:normal;border-top:1px dashed #888;font-size:8px;color:#444;padding-top:1px;min-height:12px}
.pp-derived{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-top:5px}
.pd{border:1px solid #111;padding:2px 5px}
.pd label{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;letter-spacing:.1em;text-transform:uppercase;color:#444;display:block}
.pd b{font-size:13px;font-weight:700;min-height:16px;display:block}
.pp-two{display:grid;grid-template-columns:2.6in 1fr;gap:8px}
.pp-loc{width:100%;border-collapse:collapse;text-align:center}
.pp-loc th,.pp-loc td{border:1px solid #111;padding:2px 3px}
.pp-loc th{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;background:#eee}
.pp-loc td{font-size:13px;font-weight:700;height:20px}
.pp-loc td.k{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7.5px;font-weight:600;text-transform:uppercase;text-align:left;background:#eee;width:40px}
.pp-wounds{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}
.pw label{display:block;font-family:"IBM Plex Mono",Consolas,monospace;font-size:6.5px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;text-align:center}
.pw .bx{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;border:1px solid #111;padding:1px}
.pw .bx span{aspect-ratio:1;border:1px solid #111;display:block}
.pw .bx span.f{background:#111}
.pw small{display:block;text-align:center;font-family:"IBM Plex Mono",Consolas,monospace;font-size:6.5px;color:#444}
.pp-saves{display:flex;gap:10px;margin-top:5px;font-family:"IBM Plex Mono",Consolas,monospace;font-size:8px}
.pp-saves span{border:1px solid #111;padding:2px 6px}
.pp-skills{columns:3;column-gap:12px}
.pk{break-inside:avoid;margin-bottom:3px}
.pk h4{margin:0 0 1px;font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;font-size:11px;font-weight:800;text-transform:uppercase;border-bottom:1.5px solid #111;display:flex;justify-content:space-between}
.pk h4 span{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7.5px;font-weight:600}
.pr{display:flex;justify-content:space-between;gap:4px;border-bottom:1px dotted #999;line-height:11.6px;min-height:12px;font-size:8.6px}
.pr b{min-width:16px;text-align:center;border-left:1px solid #111;font-weight:700}
.pr.on span{font-weight:600}
.pr .line{flex:1}
table.pt{width:100%;border-collapse:collapse}
table.pt th{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;text-align:left;border-bottom:1.5px solid #111;padding:2px 4px;background:#eee}
table.pt td{border-bottom:1px solid #bbb;padding:2px 4px;height:17px;font-size:9.5px}
table.pt td.n{text-align:center;font-family:"IBM Plex Mono",Consolas,monospace;font-size:9px}
.pp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pp-dl{display:grid;grid-template-columns:1.35in 1fr;gap:0}
.pp-dl dt,.pp-dl dd{margin:0;border-bottom:1px solid #bbb;padding:3px 4px;min-height:18px}
.pp-dl dt{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7.5px;letter-spacing:.06em;text-transform:uppercase;color:#444}
.pp-lines div{border-bottom:1px solid #bbb;height:18px;font-size:9.5px;padding:3px 4px;overflow:hidden}
.pp-foot{margin-top:auto;display:flex;justify-content:space-between;font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;color:#666;letter-spacing:.08em;text-transform:uppercase}
.pp-hum{display:flex;gap:8px;align-items:center;margin-top:4px;font-size:9px}
.pp-hum .bar{flex:1;height:8px;border:1px solid #111;position:relative}
.pp-hum .bar i{position:absolute;inset:0 auto 0 0;background:#111}
.npc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.npc{border:1.5px solid #111;break-inside:avoid;display:flex;flex-direction:column}
.npc h3{margin:0;background:#111;color:#fff;font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif;font-size:15px;font-weight:800;text-transform:uppercase;padding:2px 8px;display:flex;justify-content:space-between;align-items:baseline}
.npc h3 small{font-family:"IBM Plex Mono",Consolas,monospace;font-size:7.5px;font-weight:400}
.npc .b{padding:5px 7px;display:grid;gap:4px;font-size:9px}
.npc .st{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;text-align:center}
.npc .st div{border:1px solid #111;font-family:"IBM Plex Mono",Consolas,monospace;font-size:7px;padding:1px 0}
.npc .st div b{display:block;font-size:12px;font-family:"Big Shoulders Display","Arial Narrow",Impact,sans-serif}
.npc .wt{display:grid;grid-template-columns:repeat(10,1fr);gap:2px}
.npc .wt div{display:grid;grid-template-columns:repeat(4,1fr);gap:1px}
.npc .wt span{aspect-ratio:1;border:1px solid #111}
`;
function paperWounds(w){return `<div class="pp-wounds">${WOUND_LEVELS.map((lab,g)=>`<div class="pw"><label>${lab}</label><div class="bx">${[1,2,3,4].map(j=>`<span class="${g*4+j<=w?"f":""}"></span>`).join("")}</div><small>Stun −${g}</small></div>`).join("")}</div>`}
function padRows(rows,min,cols){const out=[...rows];while(out.length<min)out.push(`<tr>${"<td></td>".repeat(cols)}</tr>`);return out.join("")}
function sheetPages(c,o){
  const B=!!o.blank;const S=!B&&o.state!==false;const k=B?null:calc(c);
  const v=x=>B?"":esc(x??"");const role=B?null:ROLES[c.role];
  const ab=role?role.ab:"";const abLv=role?skillLevel(c,ab):"";
  const pf=(lab,val,cls="")=>`<div class="pf ${cls}"><label>${lab}</label><div>${val}</div></div>`;
  const statBox=key=>{const b=B?"":c.stats[key];const e=B?"":k.eff[key];return `<div class="ps"><label>${key}</label><b>${b}</b><i>${S&&e!==b?"now "+e:"&nbsp;"}</i></div>`};
  const dv=(lab,val)=>`<div class="pd"><label>${lab}</label><b>${val}</b></div>`;
  // skills
  const groups={};const order=["REF","INT","TECH","COOL","EMP","ATTR","BODY"];
  const names=new Set(SKILL_DEFS.map(x=>x[0]));if(!B)(c.customSkills||[]).forEach(s=>names.add(s.n));if(!B)Object.keys(c.skills||{}).forEach(n=>{if(!ABILITIES[n])names.add(n)});
  [...names].forEach(n=>{const def=B?SKILL_BY_NAME[n]:skillDef(c,n);if(!def)return;const lv=B?0:skillLevel(c,n);if(!B&&!o.allSkills&&!lv)return;(groups[def.s]||(groups[def.s]=[])).push([n,lv])});
  const skillsHTML=`<div class="pp-skills">
    <div class="pk"><h4>Special ability</h4><div class="pr on"><span>${B?`<span class="line" style="display:inline-block;width:1.2in"></span>`:esc(ab)}</span><b>${B?"":abLv}</b></div></div>
    ${order.filter(g=>groups[g]).map(g=>`<div class="pk"><h4>${g}<span>[${B?"&nbsp;&nbsp;":k.eff[g]}]</span></h4>${groups[g].sort((a,b)=>a[0].localeCompare(b[0])).map(([n,lv])=>`<div class="pr ${lv?"on":""}"><span>${esc(n)}${(SKILL_BY_NAME[n]?.m||1)>1?` <small>×${SKILL_BY_NAME[n].m}</small>`:""}</span><b>${lv||""}</b></div>`).join("")}</div>`).join("")}
    <div class="pk"><h4>Other skills</h4>${Array.from({length:3},()=>`<div class="pr"><span class="line"></span><b>&nbsp;</b></div>`).join("")}</div>
  </div>`;
  const ipFree=B?"":(c.ip?.total||0)-(c.ip?.spent||0);
  const foot=n=>`<div class="pp-foot"><span>Night City Dossier · Cyberpunk 2020 character record</span><span>${B?"":esc(c.handle||"")+" · "}page ${n}</span></div>`;
  const p1=`<div class="page">
    <div class="pp-head"><div class="pp-title"><b>CYBERPUNK<br>2020</b><span>Character record</span></div>
      <div class="pp-fields">${pf("Handle",v(c.handle),"w2")}${pf("Role",v(c.role))}${pf("Age",v(c.age))}
        ${pf("Real name",v(c.name),"w2")}${pf("Special ability",B?"":esc(ab)+" "+abLv)}${pf("Reputation",B?"":c.rep||0)}
        ${pf("Character points",B?"":statSum(c))}${pf("IP earned / free",B?"":(c.ip?.total||0)+" / "+ipFree)}${pf("Gender",v(c.gender))}${pf("Cash",B?"":S?fmtEb(c.eb):"")}</div></div>
    <div class="pp-sec"><h3>Stats <small>base value · current below when modified</small></h3><div class="pp-body">
      <div class="pp-stats">${STAT_KEYS.map(statBox).join("")}</div>
      <div class="pp-derived">${dv("Run",B?"":k.run+"m")}${dv("Leap",B?"":k.leap+"m")}${dv("Lift",B?"":k.lift+"kg")}${dv("Carry",B?"":k.carry+"kg")}${dv("Save",B?"":k.save)}${dv("BTM",B?"":k.btm)}${dv("Humanity",B?"":k.humanity+" / "+k.humMax)}${dv("Current EMP",B?"":k.eff.EMP)}</div>
    </div></div>
    <div class="pp-two">
      <div class="pp-sec"><h3>Armor <small>${B?"":"EV "+(k.ev||0)}</small></h3><div class="pp-body"><table class="pp-loc"><tr><td class="k">Location</td>${LOCS.map(l=>`<th>${l[1]}</th>`).join("")}</tr><tr><td class="k">Roll</td>${LOCS.map(l=>`<td style="font-size:9px;font-weight:600">${l[2]}</td>`).join("")}</tr><tr><td class="k">SP</td>${LOCS.map(l=>`<td>${B?"":spAt(c,l[0])||""}</td>`).join("")}</tr></table></div></div>
      <div class="pp-sec"><h3>Damage <small>${B?"":S?woundLabel(k.level)+" · "+k.w+"/40":""}</small></h3><div class="pp-body">${paperWounds(S?k.w:0)}
        <div class="pp-saves"><span>Stun save ≤ ${B?"___":S?k.stunSave:k.save}</span>${!B&&S&&k.deathSave!=null?`<span>Death save ≤ ${k.deathSave}</span>`:`<span>Death save ≤ BODY − mortal level</span>`}<span>Serious −2 REF · Critical ½ · Mortal ⅓</span></div></div></div>
    </div>
    <div class="pp-sec"><h3>Skills <small>${!B&&!o.allSkills?"trained skills":"all skills · level in the box"}</small></h3><div class="pp-body">${skillsHTML}</div></div>
    ${foot(1)}</div>`;
  const wRows=B?[]:(c.weapons||[]).map(w=>`<tr><td>${esc(w.name)}</td><td class="n">${esc(w.type)}</td><td class="n">${sgn(Number(w.wa)||0)}</td><td class="n">${esc(w.conc||"")}</td><td class="n">${esc(w.avail||"")}</td><td class="n">${esc(w.dmg)}</td><td class="n">${esc(w.shots||"")}${S&&w.shots?` <small>(${w.ammo})</small>`:""}</td><td class="n">${esc(w.rof)}</td><td class="n">${esc(w.rel)}</td><td class="n">${esc(w.range)}</td></tr>`);
  const aRows=B?[]:(c.armor||[]).map(a=>`<tr><td>${esc(a.name)}${S&&!a.worn?" <small>(stowed)</small>":""}</td><td class="n">${esc(a.sp)}</td><td>${(a.locs||[]).map(locName).join(", ")}</td><td class="n">${esc(a.ev)}</td></tr>`);
  const cRows=B?[]:(c.cyber||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.cat||"")}</td><td class="n">${esc(x.hc||"")}</td><td class="n">${esc(x.hcLoss)}</td><td class="n">${fmtEb(x.cost)}</td></tr>`);
  const gRows=B?[]:(c.gear||[]).map(g=>`<tr><td>${esc(g.name)}</td><td class="n">${esc(g.qty)}</td><td class="n">${fmtEb(g.cost)}</td></tr>`);
  const ls=B?{}:(c.lifestyle||{});
  const p2=`<div class="page">
    <div class="pp-sec"><h3>Weapons</h3><div class="pp-body"><table class="pt"><tr><th style="width:30%">Weapon</th><th>Type</th><th>WA</th><th>Conc</th><th>Avail</th><th>Damage</th><th>Shots</th><th>ROF</th><th>Rel</th><th>Range</th></tr>${padRows(wRows,7,10)}</table></div></div>
    <div class="pp-grid2">
      <div class="pp-sec"><h3>Armor worn</h3><div class="pp-body"><table class="pt"><tr><th style="width:45%">Item</th><th>SP</th><th>Covers</th><th>EV</th></tr>${padRows(aRows,5,4)}</table></div></div>
      <div class="pp-sec"><h3>Money & lifestyle</h3><div class="pp-body"><dl class="pp-dl"><dt>Cash on hand</dt><dd>${B||!S?"":fmtEb(c.eb)}</dd><dt>Housing</dt><dd>${v(ls.housing)}</dd><dt>Rent / month</dt><dd>${B?"":fmtEb(ls.rent)}</dd><dt>Food / month</dt><dd>${B?"":fmtEb(ls.food)}</dd><dt>Other / month</dt><dd>${B?"":fmtEb(ls.other)}</dd></dl></div></div>
    </div>
    <div class="pp-sec"><h3>Cyberware <small>${B?"Humanity ____ / ____":"Humanity "+k.humanity+" / "+k.humMax+" · loss "+k.hcLoss}</small></h3><div class="pp-body"><table class="pt"><tr><th style="width:40%">Cyberware</th><th>Type</th><th>HC dice</th><th>Hum. lost</th><th>Cost</th></tr>${padRows(cRows,9,5)}</table>
      ${B?"":`<div class="pp-hum"><span>Humanity</span><div class="bar"><i style="width:${k.humMax?clamp(k.humanity/k.humMax*100,0,100):0}%"></i></div><span>${k.humanity}</span></div>`}</div></div>
    <div class="pp-grid2">
      <div class="pp-sec"><h3>Gear</h3><div class="pp-body"><table class="pt"><tr><th style="width:62%">Item</th><th>Qty</th><th>Cost</th></tr>${padRows(gRows,12,3)}</table></div></div>
      <div class="pp-sec"><h3>Contacts</h3><div class="pp-body"><table class="pt"><tr><th style="width:38%">Name</th><th>Who / notes</th></tr>${padRows(B?[]:(c.contacts||[]).map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.role)}${x.notes?" · "+esc(x.notes):""}</td></tr>`),12,2)}</table></div></div>
    </div>
    ${foot(2)}</div>`;
  let p3="";
  if(o.lifepath!==false){
    const lp=B?{}:(c.lifepath||{});const st=lp.style||{},f=lp.family||{},m=lp.motive||{};
    const ev=B?[]:(lp.events||[]).map(e=>`<tr><td class="n">${esc(e.age)}</td><td>${esc(e.kind)}</td><td>${esc(e.text)}</td></tr>`);
    const noteLines=B?[]:String(c.notes||"").split(/\n/).flatMap(line=>line.match(/.{1,110}(\s|$)/g)||[""]);
    p3=`<div class="page">
      <div class="pp-grid2">
        <div class="pp-sec"><h3>Style & origins</h3><div class="pp-body"><dl class="pp-dl"><dt>Clothes</dt><dd>${v(st.clothes)}</dd><dt>Hairstyle</dt><dd>${v(st.hair)}</dd><dt>Affectations</dt><dd>${v(st.affect)}</dd><dt>Ethnic origin</dt><dd>${v(lp.ethnic)}</dd><dt>Language</dt><dd>${v(lp.language)}</dd></dl></div></div>
        <div class="pp-sec"><h3>Motivations</h3><div class="pp-body"><dl class="pp-dl"><dt>Personality</dt><dd>${v(m.trait)}</dd><dt>Valued person</dt><dd>${v(m.person)}</dd><dt>Values most</dt><dd>${v(m.value)}</dd><dt>Feels about people</dt><dd>${v(m.people)}</dd><dt>Valued possession</dt><dd>${v(m.possession)}</dd></dl></div></div>
      </div>
      <div class="pp-sec"><h3>Family background</h3><div class="pp-body"><dl class="pp-dl"><dt>Family ranking</dt><dd>${v(f.ranking)}</dd><dt>Parents</dt><dd>${v(f.parents)}</dd><dt>Family status</dt><dd>${v(f.status)}</dd><dt>Childhood</dt><dd>${v(f.childhood)}</dd><dt>Siblings</dt><dd>${B?"":(f.siblings||[]).length?(f.siblings).map(s=>`${esc(s.gender)} (${esc(s.age)}) — ${esc(s.feel)}`).join("; "):"Only child"}</dd></dl></div></div>
      <div class="pp-sec"><h3>Life events</h3><div class="pp-body"><table class="pt"><tr><th style="width:36px">Age</th><th style="width:80px">Event</th><th>What happened</th></tr>${padRows(ev,10,3)}</table></div></div>
      <div class="pp-sec" style="flex:1"><h3>Notes</h3><div class="pp-body pp-lines">${Array.from({length:Math.max(14,noteLines.length)},(_,i)=>`<div>${esc(noteLines[i]||"")}</div>`).join("")}</div></div>
      ${foot(3)}</div>`;
  }
  return p1+p2+p3;
}
const Print={host:null,cfg:null,opts:{},
  ensure(){if(this.host)return;const h=document.createElement("div");h.id="print-host";document.body.appendChild(h);this.host=h;
    const st=document.createElement("style");st.textContent=PAPER_CSS+`
#print-host{position:fixed;inset:0;z-index:80;background:#2a2c35;display:flex;flex-direction:column}
#print-host[hidden]{display:none}
.pv-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:calc(10px + env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 10px max(16px,env(safe-area-inset-left,0px));background:var(--band);color:var(--band-ink)}
.pv-bar h2{font-family:var(--f-display);font-size:22px;font-weight:900;font-style:italic;text-transform:uppercase;margin:0 8px 0 0}
.pv-bar label{display:flex;gap:6px;align-items:center;font-size:13px;color:var(--band-ink2)}
.pv-bar .sp{flex:1}
.pv-bar .btn:not(.primary){color:var(--ink)}
.pv-scroll{flex:1;overflow:auto;padding:24px 16px 40px}
@media (max-width:900px){.pv-scroll .page{zoom:.55}}
@media print{
  @page{size:letter;margin:.35in}
  html,body{background:#fff!important;padding:0!important}
  body::before{display:none!important}
  body>*:not(#print-host){display:none!important}
  #print-host{position:static!important;display:block!important;background:#fff!important}
  .pv-bar{display:none!important}
  .pv-scroll{overflow:visible!important;padding:0!important}
  .pv-scroll .page{zoom:1!important;width:auto!important;min-height:0!important;padding:0!important;margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always}
  .pv-scroll .page:last-child{break-after:auto;page-break-after:auto}
}`;document.head.appendChild(st);
    h.addEventListener("click",ev=>{const b=ev.target.closest("[data-pv]");if(!b)return;const a=b.dataset.pv;
      if(a==="close"){h.hidden=true;h.innerHTML="";document.body.style.overflow=""}
      if(a==="pdf"&&window.desk){window.desk.savePdf(safeName(this.cfg.title)).then(r=>{if(r&&r.saved)showNotice("PDF saved.")}).catch(()=>showNotice("Couldn't save the PDF."))}
      if(a==="print"){try{window.print()}catch(e){showNotice("Printing isn't available here. Open the file directly in your browser.")}}});
    h.addEventListener("change",ev=>{const t=ev.target;if(t.dataset.pvopt){this.opts[t.dataset.pvopt]=t.checked;this.draw()}});
  },
  open(cfg){this.ensure();this.cfg=cfg;this.opts={};(cfg.options||[]).forEach(o=>this.opts[o.key]=o.def);this.host.hidden=false;document.body.style.overflow="hidden";this.draw()},
  draw(){const c=this.cfg;this.host.innerHTML=`<div class="pv-bar"><h2>${esc(c.title)}</h2>${(c.options||[]).map(o=>`<label><input type="checkbox" data-pvopt="${o.key}" ${this.opts[o.key]?"checked":""}> ${esc(o.label)}</label>`).join("")}<span class="sp"></span>
    ${window.desk?`<button class="btn primary" data-pv="pdf">Save as PDF…</button><button class="btn" data-pv="print">Print…</button>`:`<button class="btn primary" data-pv="print">Print / Save as PDF</button>`}<button class="btn" data-pv="close">Close</button></div>
    <div class="pv-scroll">${c.render(this.opts)}</div>`},
};
function printCharacter(c){Print.open({title:`Paper sheet · ${c.handle||"Unnamed"}`,options:[{key:"allSkills",label:"All skills (paper style)",def:true},{key:"state",label:"Current wounds, cash & ammo",def:true},{key:"lifepath",label:"Lifepath & notes page",def:true}],render:o=>sheetPages(c,o)})}
function printBlank(){Print.open({title:"Blank character sheet",options:[{key:"lifepath",label:"Lifepath & notes page",def:true}],render:o=>sheetPages(blankChar(),{...o,blank:true,allSkills:true})})}
