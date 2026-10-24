
/* ============================== PLAYER: JOINING A TABLE ============================== */
const PID=(()=>{let id=LS.get("ncd-player-id",null);if(!id||!/^[A-Za-z0-9_-]{8,64}$/.test(id)){id=(uid()+uid()).replace(/[^A-Za-z0-9]/g,"");LS.set("ncd-player-id",id)}return id})();
const Net={ws:null,state:"off",url:"",pass:"",table:"",scene:null,players:[],log:[],err:"",retry:0,manual:true,charId:null,name:"",sendT:null,retryT:null,gmAway:false};
const lastJoin=LS.get("ncd-net-last",{})||{};
function netSend(o){if(Net.ws&&Net.ws.readyState===1)Net.ws.send(JSON.stringify(o))}
function myChar(){return Net.charId?S.chars.get(Net.charId):null}
function myColor(){const c=myChar();return (c&&c.color)||"#7d95ff"}
function assetUrl(id){return `${Net.url}/asset/${encodeURIComponent(id)}?k=${encodeURIComponent(Net.pass)}`}
function netConnect(code,name,charId){
  const inv=readInvite(code);if(!inv){Net.err="That invite code isn't complete. Copy the whole code from your GM (it starts with NCD1.).";render();return}
  const c=S.chars.get(charId);if(!c||!c.created){Net.err="Pick a finished runner to bring to the table.";render();return}
  Net.url=inv.u;Net.pass=inv.p;Net.table=inv.n||"the table";Net.name=cleanText(name,40)||c.handle||"Player";Net.charId=charId;Net.err="";Net.manual=false;Net.retry=0;
  LS.set("ncd-net-last",{code,name:Net.name,charId});Object.assign(lastJoin,{code,name:Net.name,charId});
  openSocket();
}
function openSocket(){
  clearTimeout(Net.retryT);if(Net.ws){try{Net.ws.onclose=null;Net.ws.close()}catch(e){}}
  Net.state=Net.retry?"reconnecting":"connecting";render();
  let ws;try{ws=new WebSocket(Net.url.replace(/^http/i,"ws")+"/ws")}catch(e){Net.state="off";Net.err="That address can't be reached.";render();return}
  Net.ws=ws;
  const opened=setTimeout(()=>{if(ws.readyState!==1)try{ws.close()}catch(e){}},15000);
  ws.onopen=()=>{clearTimeout(opened);const c=myChar();netSend({t:"hello",v:1,password:Net.pass,playerId:PID,name:Net.name,character:c})};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}try{onNet(m)}catch(err){console.error(err)}};
  ws.onclose=()=>{clearTimeout(opened);if(Net.ws!==ws)return;Net.ws=null;
    if(Net.manual){Net.state="off";render();return}
    Net.retry++;Net.state="reconnecting";const wait=[1,2,4,8,15][Math.min(Net.retry-1,4)]*1000;
    if(Net.retry>12){Net.state="off";Net.manual=true;Net.err="Lost the connection to the table. Check your internet, then rejoin.";render();return}
    Net.retryT=setTimeout(openSocket,wait);render()};
}
function netLeave(){Net.manual=true;clearTimeout(Net.retryT);if(Net.ws){try{Net.ws.close()}catch(e){}}Net.ws=null;Net.state="off";Net.scene=null;Net.players=[];render()}
function onNet(m){
  switch(m.t){
    case "welcome":Net.state="online";Net.retry=0;Net.gmAway=false;Net.table=(m.table&&m.table.name)||Net.table;Net.scene=m.scene||null;Net.log=m.log||[];Net.players=m.players||[];
      if(m.char)applyGmChar(m.char,true);
      if(ui.view!=="table"){ui.view="table"}render();showNotice(`Joined ${Net.table}.`);if(PMapV)PMapV.invalidate();return;
    case "scene":Net.scene=m.scene||null;if(PMapV){if(PMapV.drag&&PMapV.drag.k==="tok"&&Net.scene){const t=Net.scene.tokens.find(x=>x.id===PMapV.drag.id);const cur=PMapV.lastDragPos;if(t&&cur){t.x=cur.x;t.y=cur.y}}PMapV.invalidate()}requestRender();return;
    case "tok":{const sc=Net.scene;if(!sc)return;const t=sc.tokens.find(x=>x.id===m.id);if(!t)return;if(PMapV&&PMapV.drag&&PMapV.drag.k==="tok"&&PMapV.drag.id===m.id)return;t.x=m.x;t.y=m.y;if(PMapV)PMapV.invalidate();return}
    case "ping":if(PMapV)PMapV.addPing(Number(m.x)||0,Number(m.y)||0,m.color||"#ff4459");return;
    case "ruler":if(PMapV)PMapV.setRemoteRuler(String(m.by),m.r?{...m.r,name:m.name,color:m.color}:null);return;
    case "log":{const e=m.e||{};Net.log.push(e);if(Net.log.length>200)Net.log.shift();
      if(e.kind==="roll"&&e.pid!==PID)Dice.push({who:e.who,label:e.label,detail:e.detail,total:e.total,dv:e.dv,crit:!!e.crit,fumble:!!e.fumble,t:Date.now(),remote:true});
      else if(e.kind==="chat"&&e.pid!==PID&&ui.view!=="table")showNotice(`${e.who}: ${e.text}`);
      if(ui.view==="table")requestRender();return}
    case "presence":Net.players=m.players||[];requestRender();return;
    case "char":applyGmChar(m.character,false);return;
    case "gm-away":Net.gmAway=true;requestRender();return;
    case "error":Net.manual=true;Net.err=m.reason||"The table refused the connection.";Net.state="off";render();return;
    case "kicked":Net.manual=true;Net.err=m.reason||"You were removed from the table.";Net.state="off";Net.scene=null;render();return;
    case "end":Net.manual=true;Net.err=m.reason||"The GM closed the table.";Net.state="off";Net.scene=null;render();return;
  }
}
let gmNoteT=0;
function applyGmChar(raw,quiet){let inc;try{inc=normalizeChar(raw)}catch(e){return}const cur=S.chars.get(inc.id);if(!cur)return;
  if((Number(inc.updatedAt)||0)<=(Number(cur.updatedAt)||0))return;
  snapshot(cur,"Before GM update");inc.created=true;S.chars.set(inc.id,inc);persist();requestRender();
  if(!quiet&&Date.now()-gmNoteT>4000){gmNoteT=Date.now();showNotice(`Your GM updated ${inc.handle||"your runner"}.`)}}
function queueCharSend(){clearTimeout(Net.sendT);Net.sendT=setTimeout(()=>{const c=myChar();if(c&&Net.state==="online")netSend({t:"char",character:c})},700)}

/* hooks into the player app */
{const _saveChar=saveChar;saveChar=function(c,i){_saveChar(c,i);if(Net.state==="online"&&c&&c.id===Net.charId)queueCharSend()}}
{const _push=Dice.push.bind(Dice);Dice.push=function(e){_push(e);if(!e.remote&&Net.state==="online")netSend({t:"roll",e:{label:e.label,detail:e.detail,total:e.total,dv:e.dv||null,crit:!!e.crit,fumble:!!e.fumble}})}}
{const _who=whoName;whoName=function(){const c=curChar()||myChar();return c?(c.handle||c.name||"Unnamed"):"Player"}}
const pDeskBackup=deskBackupScheduler("characters",()=>backupText(allChars()));
{const _persist=persist;persist=function(){_persist();pDeskBackup()}}
if(window.desk){fileLinkHTML=desktopBackupHTML}

/* ============================== PLAYER: TABLE VIEW ============================== */
let PMapV=null;
function initPlayerMap(){PMapV=new MapView({role:"player",getMap:()=>Net.state==="online"||Net.state==="reconnecting"?Net.scene:null,
  canMove:t=>t.owner===PID&&Net.scene&&Net.scene.settings&&Net.scene.settings.playersMove!==false&&Net.state==="online",
  canErase:d=>d.by===PID,onEvent:playerMapEvent,imgUrl:assetUrl,me:()=>({color:myColor(),name:Net.name,playerId:PID}),ringFor:t=>t.ring,activeTok:()=>Net.scene&&Net.scene.active})}
function playerMapEvent(type,d){const sc=Net.scene;if(!sc)return;
  switch(type){
    case "move":PMapV.lastDragPos={x:d.x,y:d.y};netSend({t:"move",id:d.id,x:d.x,y:d.y,final:d.final});if(d.final)PMapV.lastDragPos=null;return;
    case "draw-add":if(sc.settings&&sc.settings.playersDraw===false){showNotice("The GM has turned off drawing for players.");return}d.by=PID;sc.drawings.push(d);netSend({t:"draw",op:"add",d});PMapV.invalidate();return;
    case "draw-del":{const i=sc.drawings.findIndex(x=>x.id===d.id&&x.by===PID);if(i>=0){sc.drawings.splice(i,1);netSend({t:"draw",op:"del",id:d.id});PMapV.invalidate()}return}
    case "ping":netSend({t:"ping",x:Math.round(d.x),y:Math.round(d.y)});return;
    case "ruler":netSend({t:"ruler",r:d});return;
    case "tool":ui.pTool=d;PMapV.setTool(d);render();return;
  }}
function tableNavBtn(){const s=Net.state;
  const label=s==="online"?`<span class="dot live"></span>${esc(Net.table)}`:s==="connecting"||s==="reconnecting"?`<span class="dot warn"></span>Connecting…`:"Join game";
  return `<button class="hostpill ${s==="online"?"on":""} ${ui.view==="table"?"cur":""}" data-act="go-table">${label}</button>`}
function afterRender(){
  document.body.classList.toggle("mapmode",ui.view==="table"&&(Net.state==="online"||Net.state==="reconnecting"));
  if(ui.view==="table"&&PMapV){const slot=document.getElementById("map-slot");if(slot&&PMapV.el.parentNode!==slot){slot.appendChild(PMapV.el);PMapV.resize()}PMapV.invalidate();scrollLogs()}
}
function viewTable(){
  if(Net.state==="off"||Net.state==="connecting"&&!Net.scene)return joinView();
  const sc=Net.scene;const tool=ui.pTool||"select";const c=myChar();
  const tools=[toolBtn("select",tool,"select","Select & move your token (V)"),toolBtn("pan",tool,"pan","Pan (H, or hold Space)"),toolBtn("ruler",tool,"ruler","Measure (R)"),toolBtn("draw",tool,"draw","Draw (D)"),toolBtn("ping",tool,"ping",`Ping (P, or ${IS_MAC?"Option":"Alt"}+click)`),
    `<div class="mtool-sep"></div>`,`<button class="mtool" data-act="pmap-zoom" data-v="in" title="Zoom in (+)">${icon("zin")}</button>`,`<button class="mtool" data-act="pmap-zoom" data-v="out" title="Zoom out (−)">${icon("zout")}</button>`,`<button class="mtool" data-act="pmap-zoom" data-v="fit" title="Fit map (0)">${icon("fit")}</button>`,
    `<button class="mtool" data-act="pmap-find" title="Find my token">${icon("select")}</button>`].join("");
  const sub=sc&&tool==="draw"?inkBar(PMapV,true):"";
  const banner=Net.state==="reconnecting"?`<div class="map-banner">Reconnecting to the table…</div>`:Net.gmAway?`<div class="map-banner">The GM's app is offline. Waiting for them to come back…</div>`:"";
  const stage=`<div class="map-stage"><div class="map-slot" id="map-slot" data-keep></div>${sub}${banner}${!sc?`<div class="map-empty"><h3>No map yet</h3><p>The GM hasn't put a map on the table. You can still chat and roll.</p></div>`:""}</div>`;
  let mine="";
  if(c){const k=calc(c);const top=Object.keys(c.skills||{}).filter(n=>skillLevel(c,n)>0).sort((a,b)=>skillLevel(c,b)-skillLevel(c,a)).slice(0,6);
    mine=rg("pt-me",`<section class="ms"><div class="row" style="justify-content:space-between"><h3>${esc(c.handle||"Your runner")}</h3><span class="chip ${woundChipClass(k.level)}">${woundLabel(k.level)} · ${k.w}</span></div>
      <div class="row" style="gap:4px">${top.map(n=>{const def=skillDef(c,n);let base=(k.eff[def.s]||0)+skillLevel(c,n);if(n==="Awareness/Notice"&&c.role==="Solo")base+=skillLevel(c,"Combat Sense");return `<button class="rollbtn" data-act="pt-roll" data-l="${esc(n)}" data-b="${base}">${esc(n)} <b>${base}</b></button>`}).join("")}</div>
      <div class="row" style="gap:4px">${(c.weapons||[]).slice(0,4).map((w,i)=>`<button class="rollbtn" data-act="atk-open" data-id="${esc(w.id)}" title="Attack with ${esc(w.name)}">${esc(w.name)} <b>${esc(w.dmg)}</b></button>`).join("")}<button class="btn sm ghost" data-act="open-char" data-id="${esc(c.id)}">Open sheet</button></div>
      <div class="row" style="gap:6px"><button class="btn primary" style="flex:1" data-act="ck-open">Skill check…</button><button class="btn primary" style="flex:1" data-act="atk-open">Attack…</button></div></section>`)}
  const side=`${rg("pt-conn",`<section class="ms"><div class="row" style="justify-content:space-between"><h3>${esc(Net.table)}</h3>${Net.state==="online"?`<span class="chip green">Connected</span>`:`<span class="chip amber">Reconnecting</span>`}</div>
      <div class="plist">${(Net.players||[]).map(p=>`<div class="pl"><span class="dot" style="background:${esc(p.color)}"></span><b>${esc(p.handle||p.name)}</b><span class="faint">${esc(p.playerId===PID?"you":p.name)}</span></div>`).join("")}</div>
      <div class="row"><button class="btn sm ghost" data-act="net-leave">Leave table</button></div></section>`)}
    ${mine}
    <section class="ms tlog-wrap"><h3>Table log</h3>${rg("tlog",`<div class="tlog">${logHTML(Net.log||[],PID)}</div>`)}
      <div class="row" style="flex-wrap:nowrap"><input id="chat-in" placeholder="Message the table" aria-label="Message the table" ${Net.state==="online"?"":"disabled"}><button class="btn sm" data-act="chat-send" ${Net.state==="online"?"":"disabled"}>Send</button></div>
      <p class="faint" style="margin:0;font-size:12px">Rolls you make anywhere in the app are shared with the table while you're connected.</p></section>`;
  return `<div class="mapwrap"><nav class="map-tools" aria-label="Map tools">${tools}</nav>${stage}${mapResizeHandle()}<aside class="map-side">${side}</aside></div>`;
}
function joinView(){
  const chars=allChars().filter(c=>c.created).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const sel=lastJoin.charId&&S.chars.has(lastJoin.charId)?lastJoin.charId:(chars[0]?.id||"");
  const busy=Net.state==="connecting";
  return `<div class="join">
    <div class="roster-head"><h1><small>Online play</small>Join a game</h1></div>
    ${Net.err?`<div class="banner warnb" style="margin-bottom:14px"><b>${esc(Net.err)}</b></div>`:""}
    <div class="panel"><div class="panel-b" style="display:grid;gap:14px">
      <div class="field"><label class="label" for="join-code">Invite code from your GM</label><textarea id="join-code" class="mono" style="min-height:80px;font-size:12px" placeholder="NCD1.…">${esc(lastJoin.code||"")}</textarea></div>
      <div class="grid2"><div class="field"><label class="label" for="join-name">Your name</label><input id="join-name" value="${esc(lastJoin.name||"")}" placeholder="What the GM calls you"></div>
        <div class="field"><label class="label" for="join-char">Runner you're bringing</label>${chars.length?`<select id="join-char">${chars.map(c=>`<option value="${esc(c.id)}" ${c.id===sel?"selected":""}>${esc(c.handle||"Unnamed")} · ${esc(c.role)}</option>`).join("")}</select>`:`<div class="faint" style="font-size:13.5px">No finished runners yet. <button class="btn sm" data-act="open-modal" data-m="newchar">Build one</button></div>`}</div></div>
      <div class="row"><button class="btn primary" data-act="net-join" ${chars.length&&!busy?"":"disabled"}>${busy?"Connecting…":"Join the table"}</button><span class="faint" style="font-size:13px">Your runner is saved to the GM's campaign and gets a token on the map. Changes you and the GM make to it sync both ways.</span></div>
    </div></div>
    <p class="faint" style="font-size:13px;margin-top:12px">Your GM gets the invite code from <b>Host game</b> in their app. The code works until they stop hosting or change the password.</p>
  </div>`}
Object.assign(A,{
  "go-table":()=>{ui.view="table";ui.charId=null;ui.modal=null;render();window.scrollTo(0,0)},
  "net-join":()=>{const code=document.getElementById("join-code").value;const name=document.getElementById("join-name").value;const cs=document.getElementById("join-char");netConnect(code,name,cs?cs.value:"")},
  "net-leave":()=>{netLeave();showNotice("You left the table.")},
  "map-tool":el=>{ui.pTool=el.dataset.t;PMapV.setTool(el.dataset.t);render()},
  "pmap-zoom":el=>{const v=el.dataset.v;if(v==="fit")PMapV.fit();else PMapV.zoomBy(v==="in"?1.25:0.8)},
  "pmap-find":()=>{const sc=Net.scene;const t=sc&&sc.tokens.find(x=>x.owner===PID);if(!t){showNotice("You don't have a token on this map yet.");return}PMapV.cam.x=t.x-PMapV.cw/2/PMapV.cam.z;PMapV.cam.y=t.y-PMapV.ch/2/PMapV.cam.z;PMapV.saveCam();PMapV.addPing(t.x,t.y,myColor())},
  "ink-mode":el=>{PMapV.drawMode=el.dataset.v;render()},"ink-color":el=>{PMapV.inkColor=el.dataset.v;if(PMapV.drawMode==="erase")PMapV.drawMode="pen";render()},"ink-width":el=>{PMapV.inkWidth=Number(el.dataset.v);render()},
  "chat-send":()=>{const el=document.getElementById("chat-in");const text=cleanText(el&&el.value,500);if(!text)return;el.value="";netSend({t:"chat",text})},
  "pt-roll":el=>Dice.check(el.dataset.l,Number(el.dataset.b),{who:whoName()}),
  "pt-wpn":el=>{const c=myChar();const w=c&&c.weapons[Number(el.dataset.i)];if(!w)return;const k=calc(c);const skill=w.skill||WTYPE_SKILL[w.type]||"Handgun";const hit=k.eff.REF+skillLevel(c,skill)+(Number(w.wa)||0)+(k.smart&&w.type!=="MEL"?2:0);Dice.check(`Attack · ${w.name}`,hit,{who:whoName()})},
  "open-backups":()=>window.desk&&window.desk.openBackups(),
});
document.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&ev.target.id==="chat-in"){ev.preventDefault();A["chat-send"]()}});

/* ---------- start ---------- */
initPlayerMap();
playerBoot();
