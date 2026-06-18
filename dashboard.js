const STATUS = {
  todo:{label:"Por iniciar", color:"#5B6B7B"},
  doing:{label:"En curso", color:"#C77D0A"},
  done:{label:"Completado", color:"#2E7D52"},
  block:{label:"Bloqueado", color:"#B23A48"}
};
const SORDER=["todo","doing","done","block"];
const ESTADOS_RIWI=["Pendiente por ingresar","Inducción","Mapeo operación","Productivo"];
const ESTADOS_RISK=["Abierto","En mitigación","Mitigado","Cerrado"];

function defaults(){
  let s=1; const nid=()=>"u"+(s++);
  const F=(name,acts)=>({id:nid(),name,actions:acts.map(a=>({uid:nid(),week:a[0],label:a[1],status:a[2]||"todo",note:a[3]||""}))});
  const frentes=[
    F("Construir y comunicar la política de automatización",[[25,"Construcción de la política","doing"],[26,"Aprobación","todo"],[27,"Despliegue en comité de presidencia","todo"]]),
    F("Levantar la arquitectura de procesos en cinco niveles",[[26,"Seleccionar cadenas E2E piloto (O2C, P2P)","todo"],[27,"Descomponer E2E → N4 (taxonomía)","todo"],[29,"Validar taxonomía con dueños de proceso","todo"]]),
    F("Construir con David los agentes para el inventario de los procesos",[[27,"Diseñar el agente clasificador con David","todo"],[28,"Probar el agente sobre el inventario N4","todo"],[29,"Ajustar y poner en operación","todo"]]),
    F("Clasificar cada actividad en tres categorías",[[29,"Clasificar actividades (auto / agent / manual)","todo"],[30,"Justificar y revisar la clasificación","todo"]]),
    F("Rediseñar los procesos con human-in-the-loop",[[31,"IA propone procesos to-be","todo"],[32,"Revisión del dueño del proceso (HITL)","todo"],[33,"Aprobar y publicar","todo"]]),
    F("Crear el backlog por cada cadena E2E",[[33,"Consolidar backlog por E2E","todo"],[34,"Priorizar por impacto × esfuerzo","todo"]]),
    F("Generar los reportes tecnológicos y de retail",[[26,"Definir reportes tecnológicos","todo"],[28,"Definir reportes de retail","todo"],[30,"Automatizar y publicar reportes","todo"]])
  ];
  const riwi=[
    {uid:nid(),cohorte:"RIWI-01",ingreso:"2026-02-02",estado:"Productivo",maxHoras:160,iniciativas:[{uid:nid(),nombre:"Conciliación de pagos (O2C)",horas:160,revenue:0}]},
    {uid:nid(),cohorte:"RIWI-02",ingreso:"2026-02-02",estado:"Mapeo operación",maxHoras:160,iniciativas:[{uid:nid(),nombre:"Validación de OC (P2P)",horas:120,revenue:0}]},
    {uid:nid(),cohorte:"RIWI-03",ingreso:"2026-03-02",estado:"Pendiente por ingresar",maxHoras:160,iniciativas:[]}
  ];
  const risks=[
    {uid:nid(),riesgo:"Roles TBD sin cubrir (Data PO, Ingeniero IA)",prob:4,imp:4,mitig:"Cerrar perfiles con GH y Comunidad IA",stake:"GH, David (Go to Cloud)",ini:"2026-01-15",fin:"2026-03-13",estado:"Abierto"},
    {uid:nid(),riesgo:"Demanda sin priorizar (sobrecarga de RIWIs)",prob:3,imp:3,mitig:"Gobierno de la Ficha + tablero único",stake:"Hub Digital",ini:"2026-01-12",fin:"2026-02-27",estado:"Abierto"},
    {uid:nid(),riesgo:"Resistencia al cambio en las áreas",prob:3,imp:4,mitig:"Gestión del cambio con el consultor",stake:"Consultor, GH",ini:"2026-02-01",fin:"2026-06-30",estado:"Abierto"}
  ];
  const acta=defaultActa(nid);
  return {seq:s, currentWeek:25, quotaMeta:8, frentes, riwi, risks, acta};
}
function defaultActa(gen){
  return {
    titulo:"Comité de Transformación Digital con IA",
    fecha:"", lugar:"", elaboradoPor:"",
    participantes:[{uid:gen(),nombre:"",rol:"Líder del proyecto"},{uid:gen(),nombre:"David",rol:"Comunidad IA (Go to Cloud)"},{uid:gen(),nombre:"",rol:"Consultor externo"}],
    temas:[{uid:gen(),tema:"Estado de los frentes y avance del programa"},{uid:gen(),tema:"Proyecto RIWI"},{uid:gen(),tema:"Riesgos y mitigación"}],
    acuerdos:[{uid:gen(),texto:""}],
    compromisos:[{uid:gen(),tarea:"",responsable:"",fecha:""}],
    proxima:""
  };
}

const KEY="jamar_dashboard_v3";
let state=null, detFilter="all", memCache={};
const uid=()=>"u"+(state.seq++);

async function loadState(){
  try{ const r=await window.storage.get(KEY); if(r&&r.value) return JSON.parse(r.value); }catch(e){}
  try{ const ls=localStorage.getItem(KEY); if(ls) return JSON.parse(ls); }catch(e){}
  if(memCache[KEY]) return memCache[KEY];
  return null;
}
let st1=null;
async function save(){ flashSaving(); const p=JSON.stringify(state);
  try{ await window.storage.set(KEY,p); }catch(e){ memCache[KEY]=JSON.parse(p); }
  try{ localStorage.setItem(KEY,p); }catch(e){}
  writeFile();
  flashSaved(); }

// ----- Auto-guardar en archivo (File System Access · Chrome/Edge) -----
let fileHandle=null;
function idbOpen(){ return new Promise((res,rej)=>{ const o=indexedDB.open("jamarDB",1); o.onupgradeneeded=()=>o.result.createObjectStore("kv"); o.onsuccess=()=>res(o.result); o.onerror=()=>rej(o.error); }); }
async function idbSet(k,v){ try{ const db=await idbOpen(); db.transaction("kv","readwrite").objectStore("kv").put(v,k); }catch(e){} }
async function idbGet(k){ try{ const db=await idbOpen(); return await new Promise(res=>{ const g=db.transaction("kv","readonly").objectStore("kv").get(k); g.onsuccess=()=>res(g.result||null); g.onerror=()=>res(null); }); }catch(e){ return null; } }
async function writeFile(){ if(!fileHandle||!fileHandle.createWritable) return; try{ const w=await fileHandle.createWritable(); await w.write(JSON.stringify(state,null,2)); await w.close(); }catch(e){} }
async function linkFile(){
  if(!window.showSaveFilePicker){ try{alert("Tu navegador no permite auto-guardar en archivo. Usa Exportar / Importar para respaldar.");}catch(_){} return; }
  try{ fileHandle=await window.showSaveFilePicker({suggestedName:"dashboard-jamar.json",types:[{description:"Backup JSON",accept:{"application/json":[".json"]}}]});
    await idbSet("fh",fileHandle); await writeFile(); setFileStatus(true,false);
  }catch(e){}
}
async function loadFromFileInteractive(){
  if(!fileHandle) return false;
  try{ let perm=await fileHandle.queryPermission({mode:"readwrite"});
    if(perm!=="granted") perm=await fileHandle.requestPermission({mode:"readwrite"});
    if(perm!=="granted") return false;
    const txt=await (await fileHandle.getFile()).text();
    if(txt){ const data=JSON.parse(txt); if(Array.isArray(data.frentes)){ state=data; if(typeof state.seq!=="number") state.seq=Date.now()%100000; migrate(); detFilter="all"; renderAll(); } }
    setFileStatus(true,false); return true;
  }catch(e){ return false; }
}
function setFileStatus(linked,needsReconnect){
  const b=document.getElementById("linkBtn"); if(!b) return;
  if(linked&&needsReconnect){ b.textContent="Reconectar archivo"; b.style.borderColor="#C77D0A"; b.style.color="#C77D0A"; }
  else if(linked){ b.textContent="Archivo vinculado ✓"; b.style.borderColor="#2E7D52"; b.style.color="#2E7D52"; }
  else { b.textContent="Vincular archivo"; b.style.borderColor=""; b.style.color=""; }
}
function flashSaving(){ const d=document.getElementById("saveDot"),t=document.getElementById("saveTxt"); d.style.background="var(--amber)"; t.textContent="Guardando…"; }
function flashSaved(){ clearTimeout(st1); st1=setTimeout(()=>{ const d=document.getElementById("saveDot"),t=document.getElementById("saveTxt"); d.style.background="var(--green)"; t.textContent="Guardado"; },300); }

function frenteProg(f){ if(!f.actions.length) return 0; const done=f.actions.filter(a=>a.status==="done").length; const doing=f.actions.filter(a=>a.status==="doing").length; return Math.round((done*100+doing*50)/f.actions.length); }
function allActions(){ const out=[]; state.frentes.forEach(f=>f.actions.forEach(a=>out.push({...a,fname:f.name,fid:f.id}))); return out; }

function renderFrentesKPI(){
  const progs=state.frentes.map(frenteProg);
  const g=Math.round(progs.reduce((a,b)=>a+b,0)/state.frentes.length);
  document.getElementById("kGlobal").textContent=g+"%";
  const C=2*Math.PI*28; const arc=document.getElementById("ringArc");
  arc.setAttribute("stroke-dasharray",C.toFixed(1)); arc.setAttribute("stroke-dashoffset",(C*(1-g/100)).toFixed(1));
  document.getElementById("kFdone").textContent=state.frentes.filter(f=>frenteProg(f)===100).length;
  const cw=state.currentWeek; const acts=allActions();
  document.getElementById("kThisWeek").textContent=acts.filter(a=>a.week===cw&&a.status!=="done").length;
  document.getElementById("kLate").textContent=acts.filter(a=>a.week<cw&&a.status!=="done").length;
  const pend=acts.filter(a=>a.status!=="done").sort((a,b)=>a.week-b.week)[0];
  document.getElementById("kNext").textContent=pend?pend.label:"Todo al día ✓";
  document.getElementById("kNextW").textContent=pend?("Semana "+pend.week):"";
}
function renderFrenteList(){
  const cw=state.currentWeek; const box=document.getElementById("frenteList"); box.innerHTML="";
  state.frentes.forEach(f=>{
    const p=frenteProg(f);
    const pend=f.actions.filter(a=>a.status!=="done").sort((a,b)=>a.week-b.week)[0];
    const col=p===100?"var(--green)":(p>0?"var(--petrol)":"var(--slate)");
    const late=pend&&pend.week<cw;
    const row=document.createElement("div"); row.className="frow";
    row.innerHTML=`<div><div class="fname">${esc(f.name)}</div><div class="fmeta">${f.actions.length} acciones</div></div>
      <div><div class="track"><div class="fill" style="width:${p}%;background:${col}"></div></div><div class="pct" style="margin-top:5px;color:${col}">${p}%</div></div>
      <div style="font-size:12.5px">${pend?`<b>S${pend.week}</b> · ${esc(pend.label)} ${late?'<span style="color:var(--red)">(atrasada)</span>':''}`:'<span style="color:var(--green)">Completado</span>'}</div>
      <div style="text-align:right"><button class="lnk" data-act="goto-detail" data-fid="${f.id}">Ver detalle →</button></div>`;
    box.appendChild(row);
  });
}
function renderTimeline(){
  const acts=allActions(); const cw=state.currentWeek;
  const weeks=acts.map(a=>a.week);
  const minW=weeks.length?Math.min(...weeks):cw;
  const startW=Math.max(1,Math.min(cw,minW));
  const endW=Math.max(cw+1,...(weeks.length?weeks:[cw]));
  const t=document.getElementById("tlTable");
  let h="<thead><tr><th class='fr'>Frente</th>"; for(let w=startW;w<=endW;w++) h+=`<th>S${w}</th>`; h+="</tr></thead><tbody>";
  state.frentes.forEach(f=>{
    h+=`<tr><td class='fr'>${esc(shortName(f.name))}</td>`;
    for(let w=startW;w<=endW;w++){
      const a=f.actions.find(x=>x.week===w);
      const now=w===cw?" now":"";
      if(a) h+=`<td class='cell${now}' title="S${w}: ${esc(a.label)}" style="background:${STATUS[a.status].color}">${a.status==="done"?"✓":""}</td>`;
      else h+=`<td class='cell${now}'></td>`;
    }
    h+="</tr>";
  });
  t.innerHTML=h+"</tbody>";
}
function shortName(n){ return n.length>34?n.slice(0,33)+"…":n; }

function renderRiwiKPI(){
  const active=state.riwi.filter(r=>r.estado!=="Pendiente por ingresar").length;
  document.getElementById("rActive").textContent=active;
  const meta=state.quotaMeta||0;
  document.getElementById("rQuotaNow").textContent=active;
  document.getElementById("rQuotaMeta").textContent=meta;
  const q=meta?Math.min(1,active/meta):0; const C=2*Math.PI*28; const arc=document.getElementById("rQuotaArc");
  arc.setAttribute("stroke-dasharray",C.toFixed(1)); arc.setAttribute("stroke-dashoffset",(C*(1-q)).toFixed(1));
  arc.setAttribute("stroke", active>=meta?"var(--green)":"var(--amber)");
  const up=state.riwi.filter(r=>r.estado==="Pendiente por ingresar"&&r.ingreso).sort((a,b)=>a.ingreso.localeCompare(b.ingreso))[0];
  document.getElementById("rNext").textContent=up?up.cohorte:"—";
  document.getElementById("rNextW").textContent=up?fmtDate(up.ingreso):"";
  const totHoras=state.riwi.reduce((s,r)=>s+(r.iniciativas||[]).reduce((x,i)=>x+(+i.horas||0),0),0);
  document.getElementById("rHours").innerHTML=totHoras+"<small> h</small>";
  const rev=state.riwi.reduce((s,r)=>s+(r.iniciativas||[]).reduce((x,i)=>x+(+i.revenue||0),0),0);
  document.getElementById("rRev").textContent=rev>0?("$"+rev.toLocaleString("es-CO")):"—";
}
function renderRiwiTable(){
  const box=document.getElementById("riwiCards"); box.innerHTML="";
  state.riwi.forEach(r=>{
    const inis=r.iniciativas||[];
    const used=inis.reduce((s,i)=>s+(+i.horas||0),0);
    const max=+r.maxHoras||0;
    const pct=max?Math.min(100,Math.round(used/max*100)):0;
    const over=max&&used>max;
    const col=over?"var(--red)":(pct>=90?"var(--amber)":"var(--petrol)");
    const card=document.createElement("div"); card.className="rcard";
    let h=`<div class="rhead">
      <div class="rf grow"><label>RIWI / Cohorte</label><input data-k="riwi" data-id="${r.uid}" data-f="cohorte" value="${esc(r.cohorte)}"></div>
      <div class="rf"><label>Ingreso</label><input type="date" data-k="riwi" data-id="${r.uid}" data-f="ingreso" value="${r.ingreso||''}"></div>
      <div class="rf"><label>Estado</label>${selectHTML(ESTADOS_RIWI,r.estado,"riwi",r.uid,"estado").replace('class="cell" ','')}</div>
      <div class="rf"><label>Horas (usadas / máx)</label>
        <div class="hwrap"><b style="color:${over?'var(--red)':'var(--ink)'}">${used}</b> / <input type="number" min="0" data-k="riwi" data-id="${r.uid}" data-f="maxHoras" value="${max}"> h${over?' <span style="color:var(--red);font-size:11px;font-weight:700">excede</span>':''}</div>
        <div class="rbar"><i style="width:${pct}%;background:${col}"></i></div>
      </div>
      <div class="rbtns">
        <button class="btn sm solid" data-act="add-init" data-id="${r.uid}">+ Iniciativa</button>
        <button class="delx" data-act="del-riwi" data-id="${r.uid}" title="Eliminar RIWI">×</button>
      </div></div>`;
    h+=`<div class="initwrap"><div class="initrow h"><div>Iniciativa</div><div>Horas</div><div>Revenue</div><div></div></div>`;
    if(!inis.length) h+=`<div style="padding:10px 14px;color:var(--slate);font-size:12.5px">Sin iniciativas — agrega la primera con “+ Iniciativa”.</div>`;
    inis.forEach(i=>{
      h+=`<div class="initrow">
        <input data-k="init" data-rid="${r.uid}" data-id="${i.uid}" data-f="nombre" value="${esc(i.nombre)}" placeholder="Nombre de la iniciativa">
        <input class="num" type="number" min="0" data-k="init" data-rid="${r.uid}" data-id="${i.uid}" data-f="horas" value="${i.horas}">
        <input class="num" type="number" min="0" data-k="init" data-rid="${r.uid}" data-id="${i.uid}" data-f="revenue" value="${i.revenue}">
        <button class="delx" data-act="del-init" data-rid="${r.uid}" data-id="${i.uid}" title="Eliminar iniciativa">×</button>
      </div>`;
    });
    h+=`</div>`;
    card.innerHTML=h; box.appendChild(card);
  });
}

function renderDetFilters(){
  const bar=document.getElementById("detFilters"); bar.innerHTML="";
  const mk=(k,l)=>{const b=document.createElement("button");b.className="chip";b.textContent=l;b.setAttribute("aria-pressed",detFilter===k);b.dataset.act="det-filter";b.dataset.k=k;bar.appendChild(b);};
  mk("all","Todos los frentes");
  state.frentes.forEach((f,i)=>mk(f.id,"F"+(i+1)));
}
function renderDetail(){
  const box=document.getElementById("detailList"); box.innerHTML="";
  state.frentes.forEach((f,i)=>{
    if(detFilter!=="all"&&detFilter!==f.id) return;
    const card=document.createElement("div"); card.className="fcard"; card.id="det-"+f.id;
    let h=`<div class="fhead"><div><span class="fp">F${i+1} · ${frenteProg(f)}%</span><div class="ft">${esc(f.name)}</div></div>
      <button class="btn sm solid" data-act="add-action" data-fid="${f.id}">+ Acción</button></div>`;
    h+=`<div class="arow h"><div>Semana</div><div>Acción</div><div>Estado</div><div>Notas / cómo se cumple</div><div></div></div>`;
    if(!f.actions.length) h+=`<div style="padding:12px 14px;color:var(--slate);font-size:12.5px">Sin acciones. Agrega la primera.</div>`;
    f.actions.slice().sort((a,b)=>a.week-b.week).forEach(a=>{
      const s=STATUS[a.status];
      h+=`<div class="arow">
        <div><input class="cell num" type="number" min="1" max="53" data-k="act" data-id="${a.uid}" data-fid="${f.id}" data-f="week" value="${a.week}"></div>
        <div><input class="cell" data-k="act" data-id="${a.uid}" data-fid="${f.id}" data-f="label" value="${esc(a.label)}"></div>
        <div><button class="stbtn" style="border-color:${s.color};color:${s.color}" data-act="cycle" data-id="${a.uid}" data-fid="${f.id}"><span class="sdot" style="background:${s.color}"></span>${s.label}</button></div>
        <div><input class="cell" data-k="act" data-id="${a.uid}" data-fid="${f.id}" data-f="note" value="${esc(a.note||'')}" placeholder="—"></div>
        <div><button class="delx" data-act="del-action" data-id="${a.uid}" data-fid="${f.id}" title="Eliminar">×</button></div>
      </div>`;
    });
    card.innerHTML=h; box.appendChild(card);
  });
}

function riskLevel(p,i){ const v=(+p||0)*(+i||0); let c="var(--green)",l="Bajo"; if(v>=15){c="var(--red)";l="Alto";} else if(v>=8){c="var(--amber)";l="Medio";} return {v,c,l}; }
function renderRiskTable(){
  const tb=document.getElementById("riskBody"); tb.innerHTML="";
  state.risks.forEach(r=>{
    const lv=riskLevel(r.prob,r.imp);
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td style="min-width:200px"><input class="cell" data-k="risk" data-id="${r.uid}" data-f="riesgo" value="${esc(r.riesgo)}"></td>
      <td><input class="cell num" type="number" min="1" max="5" data-k="risk" data-id="${r.uid}" data-f="prob" value="${r.prob}" style="width:48px"></td>
      <td><input class="cell num" type="number" min="1" max="5" data-k="risk" data-id="${r.uid}" data-f="imp" value="${r.imp}" style="width:48px"></td>
      <td><span class="pill" style="background:${lv.c}">${lv.v} · ${lv.l}</span></td>
      <td style="min-width:200px"><input class="cell" data-k="risk" data-id="${r.uid}" data-f="mitig" value="${esc(r.mitig)}"></td>
      <td style="min-width:140px"><input class="cell" data-k="risk" data-id="${r.uid}" data-f="stake" value="${esc(r.stake)}"></td>
      <td><input class="cell dt" type="date" data-k="risk" data-id="${r.uid}" data-f="ini" value="${r.ini||''}"></td>
      <td><input class="cell dt" type="date" data-k="risk" data-id="${r.uid}" data-f="fin" value="${r.fin||''}"></td>
      <td>${selectHTML(ESTADOS_RISK,r.estado,"risk",r.uid,"estado")}</td>
      <td><button class="delx" data-act="del-risk" data-id="${r.uid}" title="Eliminar">×</button></td>`;
    tb.appendChild(tr);
  });
}

function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function fmtDate(d){ if(!d) return ""; const p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0].slice(2); }
function selectHTML(opts,val,k,id,f){ return `<select class="cell" data-k="${k}" data-id="${id}" data-f="${f}">`+opts.map(o=>`<option ${o===val?"selected":""}>${esc(o)}</option>`).join("")+`</select>`; }
function findById(arr,id){ return arr.find(x=>x.uid===id); }
function findAction(fid,id){ const f=state.frentes.find(x=>x.id===fid); return f?f.actions.find(a=>a.uid===id):null; }

function renderActa(){
  const a=state.acta; if(!a) return;
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||""; };
  set("aTitulo",a.titulo); set("aFecha",a.fecha); set("aLugar",a.lugar); set("aElab",a.elaboradoPor); set("aProxima",a.proxima);
  const pp=document.getElementById("aParts"); pp.innerHTML="";
  (a.participantes||[]).forEach(x=>{ const r=document.createElement("div"); r.className="a-row a-part";
    r.innerHTML=`<input data-k="part" data-id="${x.uid}" data-f="nombre" value="${esc(x.nombre)}" placeholder="Nombre">
      <input data-k="part" data-id="${x.uid}" data-f="rol" value="${esc(x.rol)}" placeholder="Rol / área">
      <button class="delx" data-act="del-part" data-id="${x.uid}" title="Eliminar">×</button>`; pp.appendChild(r); });
  const tt=document.getElementById("aTemas"); tt.innerHTML="";
  (a.temas||[]).forEach((x,i)=>{ const r=document.createElement("div"); r.className="a-row a-list";
    r.innerHTML=`<div class="a-num">${i+1}.</div><input data-k="tema" data-id="${x.uid}" data-f="tema" value="${esc(x.tema)}" placeholder="Tema revisado">
      <button class="delx" data-act="del-tema" data-id="${x.uid}" title="Eliminar">×</button>`; tt.appendChild(r); });
  const ac=document.getElementById("aAcuerdos"); ac.innerHTML="";
  (a.acuerdos||[]).forEach((x,i)=>{ const r=document.createElement("div"); r.className="a-row a-list";
    r.innerHTML=`<div class="a-num">${i+1}.</div><input data-k="acuerdo" data-id="${x.uid}" data-f="texto" value="${esc(x.texto)}" placeholder="Acuerdo o decisión">
      <button class="delx" data-act="del-acuerdo" data-id="${x.uid}" title="Eliminar">×</button>`; ac.appendChild(r); });
  const cc=document.getElementById("aComp"); cc.innerHTML="";
  (a.compromisos||[]).forEach(x=>{ const r=document.createElement("div"); r.className="a-row a-comp";
    r.innerHTML=`<input data-k="comp" data-id="${x.uid}" data-f="tarea" value="${esc(x.tarea)}" placeholder="Compromiso / tarea">
      <input data-k="comp" data-id="${x.uid}" data-f="responsable" value="${esc(x.responsable)}" placeholder="Responsable">
      <input class="dt" type="date" data-k="comp" data-id="${x.uid}" data-f="fecha" value="${x.fecha||''}">
      <button class="delx" data-act="del-comp" data-id="${x.uid}" title="Eliminar">×</button>`; cc.appendChild(r); });
}
function renderAll(){ renderFrentesKPI(); renderFrenteList(); renderTimeline(); renderRiwiKPI(); renderRiwiTable(); renderDetFilters(); renderDetail(); renderRiskTable(); renderActa();
  document.getElementById("curWeek").value=state.currentWeek; document.getElementById("quotaMeta").value=state.quotaMeta; }
function refreshFrenteViews(){ renderFrentesKPI(); renderFrenteList(); renderTimeline(); }

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>gotoTab(t.dataset.view));
function gotoTab(v){ document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x.dataset.view===v));
  ["frentes","riwi","detalle","riesgos","acta"].forEach(k=>document.getElementById("view-"+k).classList.toggle("hide",k!==v)); }

document.body.addEventListener("click",e=>{
  const tab=e.target.closest(".tab"); if(tab){ gotoTab(tab.dataset.view); return; }
  const b=e.target.closest("[data-act]"); if(!b) return; const act=b.dataset.act;
  if(act==="goto-detail"){ detFilter=b.dataset.fid; gotoTab("detalle"); renderDetFilters(); renderDetail(); const el=document.getElementById("det-"+b.dataset.fid); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); }
  else if(act==="det-filter"){ detFilter=b.dataset.k; renderDetFilters(); renderDetail(); }
  else if(act==="cycle"){ const a=findAction(b.dataset.fid,b.dataset.id); if(a){ a.status=SORDER[(SORDER.indexOf(a.status)+1)%SORDER.length]; save(); renderDetail(); refreshFrenteViews(); } }
  else if(act==="add-action"){ const f=state.frentes.find(x=>x.id===b.dataset.fid); if(f){ f.actions.push({uid:uid(),week:state.currentWeek,label:"Nueva acción",status:"todo",note:""}); save(); renderDetail(); refreshFrenteViews(); } }
  else if(act==="del-action"){ const f=state.frentes.find(x=>x.id===b.dataset.fid); if(f){ f.actions=f.actions.filter(a=>a.uid!==b.dataset.id); save(); renderDetail(); refreshFrenteViews(); } }
  else if(act==="add-riwi"){ state.riwi.push({uid:uid(),cohorte:"RIWI-0"+(state.riwi.length+1),ingreso:"",estado:"Pendiente por ingresar",maxHoras:160,iniciativas:[]}); save(); renderRiwiTable(); renderRiwiKPI(); }
  else if(act==="del-riwi"){ state.riwi=state.riwi.filter(r=>r.uid!==b.dataset.id); save(); renderRiwiTable(); renderRiwiKPI(); }
  else if(act==="add-init"){ const r=findById(state.riwi,b.dataset.id); if(r){ (r.iniciativas=r.iniciativas||[]).push({uid:uid(),nombre:"Nueva iniciativa",horas:0,revenue:0}); save(); renderRiwiTable(); renderRiwiKPI(); } }
  else if(act==="del-init"){ const r=findById(state.riwi,b.dataset.rid); if(r){ r.iniciativas=(r.iniciativas||[]).filter(i=>i.uid!==b.dataset.id); save(); renderRiwiTable(); renderRiwiKPI(); } }
  else if(act==="add-risk"){ state.risks.push({uid:uid(),riesgo:"Nuevo riesgo",prob:3,imp:3,mitig:"",stake:"",ini:"",fin:"",estado:"Abierto"}); save(); renderRiskTable(); }
  else if(act==="del-risk"){ state.risks=state.risks.filter(r=>r.uid!==b.dataset.id); save(); renderRiskTable(); }
  else if(act==="add-part"){ (state.acta.participantes=state.acta.participantes||[]).push({uid:uid(),nombre:"",rol:""}); save(); renderActa(); }
  else if(act==="del-part"){ state.acta.participantes=(state.acta.participantes||[]).filter(x=>x.uid!==b.dataset.id); save(); renderActa(); }
  else if(act==="add-tema"){ (state.acta.temas=state.acta.temas||[]).push({uid:uid(),tema:""}); save(); renderActa(); }
  else if(act==="del-tema"){ state.acta.temas=(state.acta.temas||[]).filter(x=>x.uid!==b.dataset.id); save(); renderActa(); }
  else if(act==="add-acuerdo"){ (state.acta.acuerdos=state.acta.acuerdos||[]).push({uid:uid(),texto:""}); save(); renderActa(); }
  else if(act==="del-acuerdo"){ state.acta.acuerdos=(state.acta.acuerdos||[]).filter(x=>x.uid!==b.dataset.id); save(); renderActa(); }
  else if(act==="add-comp"){ (state.acta.compromisos=state.acta.compromisos||[]).push({uid:uid(),tarea:"",responsable:"",fecha:""}); save(); renderActa(); }
  else if(act==="del-comp"){ state.acta.compromisos=(state.acta.compromisos||[]).filter(x=>x.uid!==b.dataset.id); save(); renderActa(); }
  else if(act==="gen-pdf"){ window.print(); }
});

document.body.addEventListener("change",e=>{
  const el=e.target; const k=el.dataset.k;
  if(k==="act"){ const a=findAction(el.dataset.fid,el.dataset.id); if(a){ const f=el.dataset.f; a[f]=(f==="week")?parseInt(el.value||"1",10):el.value; save(); if(f==="week") renderDetail(); refreshFrenteViews(); } }
  else if(k==="riwi"){ const r=findById(state.riwi,el.dataset.id); if(r){ const f=el.dataset.f; r[f]=(f==="maxHoras")?(+el.value||0):el.value; save(); if(f==="maxHoras") renderRiwiTable(); renderRiwiKPI(); } }
  else if(k==="init"){ const r=findById(state.riwi,el.dataset.rid); const it=r&&(r.iniciativas||[]).find(i=>i.uid===el.dataset.id); if(it){ const f=el.dataset.f; it[f]=(f==="horas"||f==="revenue")?(+el.value||0):el.value; save(); if(f==="horas") renderRiwiTable(); renderRiwiKPI(); } }
  else if(k==="risk"){ const r=findById(state.risks,el.dataset.id); if(r){ const f=el.dataset.f; r[f]=(f==="prob"||f==="imp")?(+el.value||0):el.value; save(); if(f==="prob"||f==="imp") renderRiskTable(); } }
  else if(el.id==="curWeek"){ state.currentWeek=parseInt(el.value||"1",10); save(); refreshFrenteViews(); }
  else if(el.id==="quotaMeta"){ state.quotaMeta=parseInt(el.value||"0",10); save(); renderRiwiKPI(); }
  else if(k==="acta"){ state.acta[el.dataset.f]=el.value; save(); }
  else if(k==="part"){ const x=(state.acta.participantes||[]).find(p=>p.uid===el.dataset.id); if(x){ x[el.dataset.f]=el.value; save(); } }
  else if(k==="tema"){ const x=(state.acta.temas||[]).find(p=>p.uid===el.dataset.id); if(x){ x.tema=el.value; save(); } }
  else if(k==="acuerdo"){ const x=(state.acta.acuerdos||[]).find(p=>p.uid===el.dataset.id); if(x){ x.texto=el.value; save(); } }
  else if(k==="comp"){ const x=(state.acta.compromisos||[]).find(p=>p.uid===el.dataset.id); if(x){ x[el.dataset.f]=el.value; save(); } }
});

document.getElementById("resetBtn").onclick=async()=>{ state=defaults(); await save(); detFilter="all"; renderAll(); };
document.getElementById("linkBtn").onclick=async()=>{ if(fileHandle){ await loadFromFileInteractive(); } else { await linkFile(); } };
function dl(name,content,mime){ const b=new Blob([content],{type:mime}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(u); a.remove();},150); }
document.getElementById("exportBtn").onclick=async()=>{
  const d=new Date().toISOString().slice(0,10);
  dl("dashboard-jamar-"+d+".json", JSON.stringify(state,null,2), "application/json");
  let js=""; try{ js=await (await fetch("dashboard.js",{cache:"no-store"})).text(); }catch(e){}
  if(!js){ js=[...document.querySelectorAll("script:not([src])")].map(s=>s.textContent||"").filter(t=>t.indexOf("window.__SNAPSHOT__")!==0 && t.length>800).sort((a,b)=>b.length-a.length)[0]||""; }
  const snap=JSON.stringify(state).replace(/</g,"\\u003c");
  const O="<"+"script>", C="<"+"/script>";
  let html="<!doctype html>\n"+document.documentElement.outerHTML;
  html=html.replace(/<script src="dashboard\.js"><\/script>/,"");
  html=html.replace(/<script>window\.__SNAPSHOT__=[\s\S]*?<\/script>\s*/,"");
  const tail=O+"window.__SNAPSHOT__="+snap+";"+C+"\n"+(js?O+js+C+"\n":"");
  html=html.indexOf("</body>")>=0 ? html.replace("</body>",tail+"</body>") : html+tail;
  setTimeout(()=>dl("dashboard-jamar-"+d+".html", html, "text/html"), 300);
};
document.getElementById("importBtn").onclick=()=>document.getElementById("importFile").click();
document.getElementById("importFile").onchange=(e)=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return; const rd=new FileReader();
  rd.onload=()=>{ try{ const data=JSON.parse(rd.result);
      if(!data||!Array.isArray(data.frentes)) throw new Error("bad");
      state=data; if(typeof state.seq!=="number") state.seq=Date.now()%100000;
      migrate(); save(); detFilter="all"; renderAll();
      try{ alert("Copia restaurada correctamente."); }catch(_){}
    }catch(err){ try{ alert("No se pudo leer el archivo. Debe ser un backup .json de este tablero."); }catch(_){} }
    e.target.value=""; };
  rd.readAsText(f);
};

function migrate(){
  const map={"Por ingresar":"Pendiente por ingresar","Activo":"Productivo","En pausa":"Inducción","Finalizado":"Productivo"};
  (state.riwi||[]).forEach(r=>{
    if(!ESTADOS_RIWI.includes(r.estado)) r.estado=map[r.estado]||"Pendiente por ingresar";
    if(!Array.isArray(r.iniciativas)){
      const inis=[];
      if(r.proyecto||r.horas||r.revenue) inis.push({uid:uid(),nombre:r.proyecto||"",horas:+r.horas||0,revenue:+r.revenue||0});
      r.iniciativas=inis;
      r.maxHoras=Math.max(160,+r.horas||0);
      delete r.proyecto; delete r.horas; delete r.revenue;
    }
    if(r.maxHoras==null) r.maxHoras=160;
  });
  if(!state.acta) state.acta=defaultActa(uid);
}
(async function(){
  try{ const h=await idbGet("fh"); if(h) fileHandle=h; }catch(e){}
  let loaded=null, needRecon=false;
  if(fileHandle){
    try{ const perm=fileHandle.queryPermission?await fileHandle.queryPermission({mode:"readwrite"}):"prompt";
      if(perm==="granted"){ const txt=await (await fileHandle.getFile()).text(); if(txt) loaded=JSON.parse(txt); }
      else needRecon=true;
    }catch(e){ needRecon=true; }
  }
  if(!loaded) loaded=await loadState();
  state=loaded||(window.__SNAPSHOT__||defaults()); migrate(); renderAll();
  setFileStatus(!!fileHandle,needRecon);
})();
