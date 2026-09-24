/* ===== dados e constantes ===== */
const DATA = __DATA__;
const CATMAP = __CATMAP__;
const LOGO = "__LOGO__";
const HOJE = "__EXTRACAO__";
const PRODUTO_LABEL = "85 VILLAGIO SIENA";

/* Ordem canônica dos passos do Funil de Venda, lida diretamente do quadro Kanban
   do Imobmeet (/leads/gestao/126) em 23/09/2026 — cobre TODOS os produtos do funil,
   não só Village Siena; por isso a lista é maior do que os passos que de fato têm
   cadastro de Siena hoje (ver ETAPAS abaixo, que filtra pelos presentes). */
const ETAPAS_VENDA_TODAS = ["Visitante Stand","Pré Cadastro","Em atendimento","Lead Frio","Lead Quente",
  "Visita Agendada","Negociação Corretor","Reserva","Proposta","Conferência BrDU","Pendente Nexo",
  "Proposta Enviada para Assinatura","Proposta assinada","Elaboração Contrato","Enviado para assinatura",
  "Contrato c/pendência","Devolvido Ass. Cliente","Contrato Finalizado","Venda Perdida","Descarte"];
const ETAPAS_FINAIS = ["Contrato Finalizado","Venda Perdida","Descarte"];
const SER=["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#4a3aa7","#e34948","#6b5b95","#00a6a6","#c2185b","#795548"];
const CATCOLOR={"PAGAMENTO":"#2a78d6","CONTRATO":"#eb6834","TEMPERATURA":"#1baf7a","CANAL/PARCEIRO":"#eda100","CAMPANHA":"#e87ba4","RELACIONAMENTO":"#008300","OUTROS":"#4a3aa7"};
const FAIXAS=["0 / não informado","até R$ 3 mil","R$ 3–5 mil","R$ 5–8 mil","R$ 8–12 mil","R$ 12–20 mil","acima de R$ 20 mil"];
const FAIXAS_NEG=["0 / não informado","até R$ 400 mil","R$ 400–500 mil","R$ 500–650 mil","acima de R$ 650 mil"];

/* ===== temas (mesmo mecanismo do Funil de Pasta) ===== */
const THEMES=[
  {id:'nexo',label:'Nexo (padrão)'},
  {id:'midnight',label:'Meia-Noite'},
  {id:'abissal',label:'Abissal'},
  {id:'bordo',label:'Bordô'},
  {id:'terracota',label:'Terracota'}
];
const cssVar=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
(function initTheme(){
  let saved='nexo';
  try{ saved=localStorage.getItem('nexoVendaTema')||'nexo'; }catch(e){}
  if(!THEMES.some(t=>t.id===saved)) saved='nexo';
  if(saved!=='nexo') document.documentElement.dataset.theme=saved;
})();
let INK=cssVar('--ink')||"#141414", INK2=cssVar('--ink-2')||"#4a4a52", LINE=cssVar('--line')||"#e3e5ec", NAVY=cssVar('--navy')||"#1F2A66";
function applyTheme(id){
  if(!THEMES.some(t=>t.id===id)) id='nexo';
  document.documentElement.dataset.theme=id;
  try{ localStorage.setItem('nexoVendaTema',id); }catch(e){}
  INK=cssVar('--ink'); INK2=cssVar('--ink-2'); LINE=cssVar('--line'); NAVY=cssVar('--navy');
  if(typeof gx!=='undefined') gx.grid.color=LINE;
  if(typeof Chart!=='undefined'){
    Chart.defaults.color=INK2;
    Chart.defaults.plugins.tooltip.backgroundColor=cssVar('--navy-d');
  }
  if(typeof paint==='function') paint();
}

/* ===== agrupamento imobiliária (mesmo critério do Funil de Pasta) ===== */
const GRUPOS_LANCADORA=[
  {label:'HUNA',     re:/^HUNA(\s|$)/},
  {label:'Lopes',    re:/^LOPES(\s|$)/},
  {label:'URBS',     re:/^URBS(\s|$)/},
  {label:'AEVO',     re:/^AEVO(\s|$)/},
  {label:'Adão',     re:/^ADAO(\s|$)/},
  {label:'MyBroker', re:/^MY\s+BROKER(\s|$)/}
];
const normMarca=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[^\x00-\x7F]/g,'');
function grupoLancadora(raw){
  const n=normMarca(raw);
  const g=GRUPOS_LANCADORA.find(g=>g.re.test(n));
  return g? g.label : 'Mercado';
}
DATA.forEach(r=>{
  const raw=(r.equipe||'').split(/\s*-\s*/)[0].trim() || '(sem equipe)';
  r.marca = grupoLancadora(raw);
  r.tipo_imob = r.marca==='Mercado' ? 'Mercado' : 'Lançadora';
});
function orderedEtapas(){
  const seen=new Set(DATA.map(r=>r.etapa).filter(Boolean));
  return ETAPAS_VENDA_TODAS.filter(e=>seen.has(e)).concat([...seen].filter(e=>!ETAPAS_VENDA_TODAS.includes(e)).sort((a,b)=>String(a).localeCompare(String(b),'pt-BR')));
}
const ETAPAS=orderedEtapas();
const corEtapa=i=>SER[i%SER.length];
const nf=n=>Number(n).toLocaleString('pt-BR');
const money=n=>n==null?'—':'R$ '+Number(n).toLocaleString('pt-BR',{maximumFractionDigits:0});
const pct=(a,b)=>b?(100*a/b).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%':'—';
const cat=t=>CATMAP[t]||'OUTROS';
const faixa=v=>(v==null||v===0)?FAIXAS[0]:v<=3000?FAIXAS[1]:v<=5000?FAIXAS[2]:v<=8000?FAIXAS[3]:v<=12000?FAIXAS[4]:v<=20000?FAIXAS[5]:FAIXAS[6];
const faixaNeg=v=>(v==null||v===0)?FAIXAS_NEG[0]:v<=400000?FAIXAS_NEG[1]:v<=500000?FAIXAS_NEG[2]:v<=650000?FAIXAS_NEG[3]:FAIXAS_NEG[4];
const has=(r,t)=>r.tags_list.includes(t);
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const uniq=k=>[...new Set(DATA.map(r=>r[k]).filter(v=>v!==''&&v!=null))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
const ALLTAGS=(()=>{const c={};DATA.forEach(r=>r.tags_list.forEach(t=>c[t]=(c[t]||0)+1));
  return Object.keys(c).sort((a,b)=>c[b]-c[a]||a.localeCompare(b,'pt-BR'));})();
const ALLCATS=[...new Set(ALLTAGS.map(cat))];
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const estagnado=r=>(r.dias_sem_movimento||0)>=14 && !ETAPAS_FINAIS.includes(r.etapa);
const LEADS_TOTAL=DATA.length;

/* ===== estado / filtros ===== */
const DIMS=['etapa','tipo_imob','equipe','responsavel','origem','finalidade','mes','tag','categoria','faixa'];
const DIMLABEL={etapa:'Passo',tipo_imob:'Imobiliária',equipe:'Equipe',responsavel:'Responsável',origem:'Origem',
  finalidade:'Finalidade',mes:'Mês',tag:'Tag',categoria:'Categoria',faixa:'Faixa de renda'};
let ST={}; DIMS.forEach(d=>ST[d]=[]); ST.tagMode='or';
const HIST=[];
const snap=()=>JSON.parse(JSON.stringify(ST));
const pushHist=()=>{HIST.push(snap()); if(HIST.length>60)HIST.shift();};

function matchDim(r,d,v){
  if(!v.length) return true;
  if(d==='tag') return ST.tagMode==='and'? v.every(t=>has(r,t)) : v.some(t=>has(r,t));
  if(d==='categoria') return v.some(c=>r.tags_list.some(t=>cat(t)===c));
  if(d==='faixa') return v.includes(faixa(r.valor_renda));
  return v.includes(r[d]||'');
}
function rowsFor(except){
  const ex = except? (Array.isArray(except)?except:[except]) : [];
  return DATA.filter(r=>{
    if(ST.tagMode==='none' && !ex.includes('tag') && r.tags_list.length) return false;
    return DIMS.every(d=> ex.includes(d) || matchDim(r,d,ST[d]));
  });
}
const activeCount=()=>DIMS.reduce((a,d)=>a+ST[d].length,0)+(ST.tagMode==='none'?1:0);

function setDim(d,vals){ pushHist(); ST[d]=vals; apply(); }
function toggle(d,val,additive){
  pushHist();
  const cur=ST[d];
  if(additive){ const i=cur.indexOf(val); i>=0?cur.splice(i,1):cur.push(val); }
  else { ST[d] = (cur.length===1 && cur[0]===val) ? [] : [val]; }
  apply();
}
function clearAll(){ pushHist(); DIMS.forEach(d=>ST[d]=[]); ST.tagMode='or';
  const q=document.getElementById('q'); if(q)q.value=''; apply(); }
function undo(){ if(HIST.length){ ST=HIST.pop(); apply(true); } }

/* ===== url hash ===== */
let TAB='visao';
function writeHash(){
  const p=new URLSearchParams(); p.set('t',TAB);
  DIMS.forEach(d=>{ if(ST[d].length) p.set(d, ST[d].join('~')); });
  if(ST.tagMode!=='or') p.set('m',ST.tagMode);
  history.replaceState(null,'','#'+p.toString());
  saveFiltersLS();
}
function readHash(){
  const p=new URLSearchParams(location.hash.slice(1));
  if(p.get('t')) TAB=p.get('t');
  if(!TABS.some(([k])=>k===TAB)) TAB='visao';
  DIMS.forEach(d=>{ if(p.get(d)) ST[d]=p.get(d).split('~'); });
  if(p.get('m')) ST.tagMode=p.get('m');
}
const LS_KEY='nexoFiltros_venda';
function saveFiltersLS(){ try{ localStorage.setItem(LS_KEY, JSON.stringify({TAB,ST})); }catch(e){} }
function loadFiltersLS(){
  try{
    const o=JSON.parse(localStorage.getItem(LS_KEY)||'null'); if(!o) return;
    if(o.TAB && TABS.some(([k])=>k===o.TAB)) TAB=o.TAB;
    if(o.ST){ DIMS.forEach(d=>{ if(Array.isArray(o.ST[d])) ST[d]=o.ST[d]; }); if(o.ST.tagMode) ST.tagMode=o.ST.tagMode; }
  }catch(e){}
}

/* ===== plugin de rótulos + helpers de gráfico (Chart.js) ===== */
function lum(hex){const c=hex.replace('#','');const r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  return (0.2126*r+0.7152*g+0.0722*b)/255;}
function fade(hex,on){ if(on) return hex;
  const c=hex.replace('#','');return 'rgba('+parseInt(c.substr(0,2),16)+','+parseInt(c.substr(2,2),16)+','+parseInt(c.substr(4,2),16)+',0.22)'; }
const DL={
  id:'dl',
  afterDatasetsDraw(ch){
    const o=ch.options.plugins&&ch.options.plugins.dl; if(o&&o.off) return;
    const cx=ch.ctx, horiz=ch.options.indexAxis==='y';
    const stacked=!!(ch.options.scales&&((ch.options.scales.x&&ch.options.scales.x.stacked)||(ch.options.scales.y&&ch.options.scales.y.stacked)));
    const tot=(o&&o.total)||0;
    cx.save(); cx.font='600 11px Inter, Segoe UI, Arial, sans-serif';
    ch.data.datasets.forEach((ds,di)=>{
      if(!ch.isDatasetVisible(di)) return;
      const meta=ch.getDatasetMeta(di);
      meta.data.forEach((el,i)=>{
        const v=ds.data[i]; if(v==null||v===0) return;
        let txt=nf(v); if(tot&&!stacked) txt=nf(v)+' ('+pct(v,tot).replace(',0%','%')+')';
        const bg=Array.isArray(ds.backgroundColor)?ds.backgroundColor[i]:ds.backgroundColor;
        const solid=typeof bg==='string'&&bg.charAt(0)==='#';
        if(meta.type==='line'||ch.config.type==='line'){
          cx.fillStyle=INK2; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(txt,el.x,el.y-7); return;
        }
        const p=el.getProps(['x','y','base','width','height'],true);
        if(horiz){
          const w=Math.abs(p.x-p.base);
          if(stacked){
            if(w<30) return;
            cx.fillStyle = solid&&lum(bg)<0.62 ? '#fff' : INK;
            cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(txt,(p.x+p.base)/2,p.y);
          } else {
            cx.fillStyle=INK2; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillText(txt,p.x+6,p.y);
          }
        } else {
          const h=Math.abs(p.base-p.y);
          if(stacked){
            if(h<17) return;
            cx.fillStyle = solid&&lum(bg)<0.62 ? '#fff' : INK;
            cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(txt,p.x,(p.y+p.base)/2);
          } else {
            cx.fillStyle=INK2; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(txt,p.x,p.y-6);
          }
        }
      });
    });
    cx.restore();
  }
};
Chart.register(DL);
Chart.defaults.font.family="Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
Chart.defaults.font.size=12; Chart.defaults.color=INK2; Chart.defaults.maintainAspectRatio=false;
Chart.defaults.plugins.legend.labels.boxWidth=11; Chart.defaults.plugins.legend.labels.boxHeight=11;
Chart.defaults.plugins.tooltip.backgroundColor="#141C47"; Chart.defaults.plugins.tooltip.padding=10;
Chart.defaults.plugins.tooltip.cornerRadius=8;
Chart.defaults.layout = {padding:{right:74,top:18,left:2}};

const CH={};
const gx={grid:{color:LINE,drawTicks:false},border:{display:false},ticks:{precision:0}};
const gn={grid:{display:false},border:{display:false}};
function build(id,cfg,click){
  if(CH[id]) CH[id].destroy();
  const el=document.getElementById(id); if(!el) return;
  if(click){
    cfg.options=cfg.options||{};
    cfg.options.onClick=(e,els,ch)=>{ if(!els.length) return;
      const i=els[0].index,d=els[0].datasetIndex,add=!!(e.native&&(e.native.ctrlKey||e.native.metaKey));
      setTimeout(()=>click(i,d,add),0); };
    cfg.options.onHover=(e,els)=>{ e.native.target.style.cursor=els.length?'pointer':'default'; };
  }
  CH[id]=new Chart(el,cfg);
}
function bar(id,dim,labels,values,colors,opts){
  opts=opts||{};
  const sel=ST[dim]||[];
  const bgs=labels.map((l,i)=>fade(typeof colors==='string'?colors:colors[i], !sel.length||sel.includes(opts.key?opts.key(l,i):l)));
  const horiz=opts.vertical!==true;
  build(id,{type:'bar',data:{labels:labels.map(l=>opts.short?opts.short(l):l),
      datasets:[{data:values,backgroundColor:bgs,borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}]},
    options:{indexAxis:horiz?'y':'x',
      plugins:{legend:{display:false},dl:{total:opts.total||0},
        tooltip:{callbacks:{title:c=>labels[c[0].dataIndex],
          label:c=>opts.suffix? nf(c.raw)+' '+opts.suffix : nf(c.raw)+(opts.total?' cadastros ('+pct(c.raw,opts.total)+')':'')}}},
      scales: horiz?{x:{...gx,grace:'16%'},y:gn}:{y:{...gx,grace:'14%'},x:{...gn,ticks:{maxRotation:38,minRotation:0}}}}},
    dim? ((i,d,add)=>toggle(dim, opts.key?opts.key(labels[i],i):labels[i], add)) : null);
}

/* ===== exportação (CSV + Excel, sem PDF nesta versão) ===== */
function dl(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
let DLNS=null;
(async()=>{ try{ if(window.claude&&typeof claude.use==='function') DLNS=await claude.use('downloads'); }catch(e){}
  if(DLNS) document.querySelectorAll('.xlsBtn,.chart-export').forEach(b=>b.remove()); })();
async function saveFile(name,data,mime){
  if(DLNS){
    try{ await DLNS.save({filename:name,data}); }
    catch(e){ const c=e&&e.code;
      if(c==='declined'||c==='rate_limited') return;
      alert('Não foi possível salvar o arquivo neste ambiente'+(e&&e.message?': '+e.message:'.')); }
    return;
  }
  dl(new Blob([data],{type:mime||'application/octet-stream'}),name);
}
function stamp(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
function grab(id){
  const t=document.getElementById(id); if(!t) return {head:[],rows:[]};
  const head=[...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/[↕↑↓]/g,'').trim());
  const rows=[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>
    (td.innerText||td.textContent||'').trim().replace(/\s*\n+\s*/g,' · ').replace(/[ \t]+/g,' ')));
  return {head,rows};
}
function filtersText(){
  const out=[];
  DIMS.forEach(d=>{ if(ST[d].length) out.push(DIMLABEL[d]+': '+ST[d].join(', ')); });
  if(ST.tagMode==='none') out.push('Somente cadastros sem tag');
  else if(ST.tag.length&&ST.tagMode==='and') out.push('Tags combinadas com E');
  const q=document.getElementById('q'); if(q&&q.value.trim()) out.push('Busca: "'+q.value.trim()+'"');
  return out.length?out.join('  |  '):'Sem filtros — base completa';
}
function expCSV(id,name){
  const {head,rows}=grab(id);
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const csv=[head.map(q).join(';')].concat(rows.map(r=>r.map(q).join(';'))).join('\r\n');
  saveFile('nexo_funil_venda_'+name+'_'+stamp()+'.csv','﻿'+csv,'text/csv;charset=utf-8');
}
/* --- xlsx mínimo (zip store + OOXML), idêntico ao usado no Funil de Pasta --- */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipStore(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  files.forEach(f=>{
    const nm=enc.encode(f.name),d=f.data,crc=crc32(d);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint32(14,crc,true);
    lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(lh.buffer),nm,d);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);
    ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nm);
    off+=30+nm.length+d.length;
  });
  const cs=cen.reduce((a,b)=>a+b.length,0);
  const eo=new DataView(new ArrayBuffer(22));
  eo.setUint32(0,0x06054b50,true);eo.setUint16(8,files.length,true);eo.setUint16(10,files.length,true);
  eo.setUint32(12,cs,true);eo.setUint32(16,off,true);
  const all=parts.concat(cen,[new Uint8Array(eo.buffer)]);
  const total=all.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let p=0;
  all.forEach(b=>{out.set(b,p);p+=b.length;});
  return out;
}
function expXLSX(id,name,title){
  const {head,rows}=grab(id);
  const enc=new TextEncoder(),E=s=>enc.encode(s);
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
  const cell=(c,r,v,st)=>{
    const num = v!=='' && !isNaN(String(v).replace(/\./g,'').replace(',','.')) && /^-?[\d.,]+$/.test(String(v));
    if(num) return `<c r="${col(c)}${r}"${st?' s="1"':''}><v>${String(v).replace(/\./g,'').replace(',','.')}</v></c>`;
    return `<c r="${col(c)}${r}" t="inlineStr"${st?' s="1"':''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  let sd='<row r="1" ht="20" customHeight="1">'+head.map((h,i)=>cell(i,1,h,1)).join('')+'</row>';
  rows.forEach((r,ri)=>{ sd+=`<row r="${ri+2}">`+r.map((v,i)=>cell(i,ri+2,v,0)).join('')+'</row>'; });
  const widths=head.map((h,i)=>{const m=Math.max(h.length,...rows.map(r=>String(r[i]||'').length));
    return `<col min="${i+1}" max="${i+1}" width="${Math.min(48,Math.max(9,m+3))}" customWidth="1"/>`;}).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sd}</sheetData><autoFilter ref="A1:${col(head.length-1)}${rows.length+1}"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A66"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
  const files=[
   {name:'[Content_Types].xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')},
   {name:'_rels/.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
   {name:'xl/workbook.xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+esc((title||'Dados').slice(0,28))+'" sheetId="1" r:id="rId1"/></sheets></workbook>')},
   {name:'xl/_rels/workbook.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')},
   {name:'xl/styles.xml',data:E(styles)},
   {name:'xl/worksheets/sheet1.xml',data:E(sheet)}
  ];
  saveFile('nexo_funil_venda_'+name+'_'+stamp()+'.xlsx',zipStore(files),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
/* --- exportação de gráfico para Excel (com logo e rodapé de origem) --- */
const CHART_META={
  cEtapa:{dim:'Passo'}, cMes:{dim:'Mês'}, cTempo:{dim:'Data'}, cTempoEtapa:{dim:'Passo'},
  cTags:{dim:'Tag'}, cCat:{dim:'Categoria'}, cFin:{dim:'Finalidade'}, cRenda:{dim:'Faixa de renda'},
  cValorNeg:{dim:'Faixa de valor'}, cOrigem:{dim:'Origem'}, cImob:{dim:'Imobiliária'}, cEquipe:{dim:'Equipe'}
};
function chartRows(id){
  const ch=CH[id]; if(!ch) return {head:[],rows:[]};
  const meta=CHART_META[id]||{dim:'Categoria'};
  const labels=ch.data.labels.map(l=>Array.isArray(l)?l.join(' '):String(l));
  const dss=ch.data.datasets||[];
  if(dss.length<=1){
    const d=dss[0]?dss[0].data:[];
    return {head:[meta.dim,'Valor'], rows:labels.map((l,i)=>[l, d[i]==null?0:d[i]])};
  }
  return {head:[meta.dim, ...dss.map(d=>d.label)], rows:labels.map((l,i)=>[l, ...dss.map(d=>d.data[i]==null?0:d.data[i])])};
}
function b64ToBytes(b64){ return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }
const ACCENT_MAP={'a':'áàãâä','e':'éèêë','i':'íìîï','o':'óòõôö','u':'úùûü','c':'ç','n':'ñ'};
const UNACCENT={}; Object.keys(ACCENT_MAP).forEach(plain=>{ ACCENT_MAP[plain].split('').forEach(acc=>{ UNACCENT[acc]=plain; UNACCENT[acc.toUpperCase()]=plain; }); });
function slug(s){ return String(s).split('').map(c=>UNACCENT[c]||c).join('').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function expChartXLSX(canvasId, chartTitle){
  const {head,rows}=chartRows(canvasId);
  if(!head.length || !rows.length){
    const b=document.querySelector(`.chart-export[data-chart="${canvasId}"]`);
    if(b && !b.dataset.busy){ b.dataset.busy='1'; const old=b.textContent; b.textContent='Sem dados para exportar';
      setTimeout(()=>{ b.textContent=old; delete b.dataset.busy; },2200); }
    return;
  }
  const enc=new TextEncoder(), E=s=>enc.encode(s);
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
  const cell=(c,r,v,st)=>{
    const num = v!=='' && v!=null && !isNaN(String(v).replace(/\./g,'').replace(',','.')) && /^-?[\d.,]+$/.test(String(v));
    if(num) return `<c r="${col(c)}${r}"${st?` s="${st}"`:''}><v>${String(v).replace(/\./g,'').replace(',','.')}</v></c>`;
    return `<c r="${col(c)}${r}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${esc(v==null?'':v)}</t></is></c>`;
  };
  const tabEntry=TABS.find(([k])=>k===TAB); const tabLabel=tabEntry?tabEntry[1]:TAB;
  const now=new Date().toLocaleString('pt-BR');
  let r=1, sd='';
  sd+=`<row r="${r}">`+cell(2,r,'Nexo Gestão Imobiliária',2)+'</row>'; r++;
  sd+=`<row r="${r}">`+cell(2,r,'Painel do Funil de Venda — Village Siena',3)+'</row>'; r++;
  r+=2;
  sd+=`<row r="${r}">`+cell(0,r,chartTitle,2)+'</row>'; r++;
  const headerRow=r;
  sd+=`<row r="${r}" ht="20" customHeight="1">`+head.map((h,i)=>cell(i,r,h,1)).join('')+'</row>'; r++;
  rows.forEach(row=>{ sd+=`<row r="${r}">`+row.map((v,i)=>cell(i,r,v,0)).join('')+'</row>'; r++; });
  r++;
  const origem=`Fonte: Painel do Funil de Venda — Village Siena — Nexo Gestão Imobiliária  ·  Aba: ${tabLabel}  ·  Gráfico: ${chartTitle}  ·  Gerado em: ${now}`;
  sd+=`<row r="${r}">`+cell(0,r,origem,3)+'</row>';
  const widths=head.map((h,i)=>{const m=Math.max(String(h).length,...rows.map(rr=>String(rr[i]==null?'':rr[i]).length));
    return `<col min="${i+1}" max="${i+1}" width="${Math.min(48,Math.max(10,m+3))}" customWidth="1"/>`;}).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${widths}</cols><sheetData>${sd}</sheetData><autoFilter ref="A${headerRow}:${col(head.length-1)}${headerRow}"/><drawing r:id="rId1"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF1F2A66"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF7B7B86"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A66"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf xfId="0" fontId="2" applyFont="1"/><xf xfId="0" fontId="3" applyFont="1"/></cellXfs></styleSheet>`;
  const drawing=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>19050</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from><xdr:ext cx="1257300" cy="628650"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo Nexo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1257300" cy="628650"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
  let logoBytes; try{ logoBytes=b64ToBytes(LOGO); }catch(e){ logoBytes=new Uint8Array(0); }
  const files=[
   {name:'[Content_Types].xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>')},
   {name:'_rels/.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
   {name:'xl/workbook.xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+esc((chartTitle||'Grafico').slice(0,28))+'" sheetId="1" r:id="rId1"/></sheets></workbook>')},
   {name:'xl/_rels/workbook.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')},
   {name:'xl/styles.xml',data:E(styles)},
   {name:'xl/worksheets/sheet1.xml',data:E(sheet)},
   {name:'xl/worksheets/_rels/sheet1.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>')},
   {name:'xl/drawings/drawing1.xml',data:E(drawing)},
   {name:'xl/drawings/_rels/drawing1.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>')},
   {name:'xl/media/image1.png',data:logoBytes}
  ];
  saveFile('nexo_grafico_'+slug(chartTitle)+'_'+stamp()+'.xlsx',zipStore(files),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function mountChartExports(){
  document.querySelectorAll('.chart-export').forEach(b=>{
    if(b.dataset.ready) return; b.dataset.ready='1';
    b.title='Exportar os dados deste gráfico em Excel, com logo e rodapé de origem';
    b.onclick=()=>expChartXLSX(b.dataset.chart, b.dataset.title);
  });
}
function mountBars(){
  document.querySelectorAll('.tbar').forEach(b=>{
    if(b.dataset.ready) return; b.dataset.ready='1';
    const sp=document.createElement('span'); sp.className='sp'; b.appendChild(sp);
    const D=()=>[b.dataset.table,b.dataset.name,b.dataset.title];
    [['CSV',()=>{const[i,n]=D();expCSV(i,n);}],['Excel',()=>{const[i,n,t]=D();expXLSX(i,n,t);}]].forEach(([l,fn])=>{
      if(l==='Excel'&&DLNS) return;
      const btn=document.createElement('button'); btn.className='btn sec xs'+(l==='Excel'?' xlsBtn':''); btn.textContent=l;
      btn.title='Exportar a tabela como '+l+' respeitando os filtros atuais';
      btn.onclick=fn; b.appendChild(btn);
    });
  });
}

/* ===== abas ===== */
const TABS=[['visao','Visão Geral'],['tempo','Tempo por Etapa'],['tags','Tags'],['perfil','Perfil e Valores'],
            ['equipes','Equipes e Corretores'],['alertas','Pontos de Atenção'],['base','Base de Cadastros']];
function mountTabs(){
  const c=document.getElementById('tabsIn');
  c.innerHTML=TABS.map(([k,l])=>`<button class="tab" role="tab" data-tab="${k}" aria-selected="false">${l}<span class="cnt" data-cnt="${k}"></span></button>`).join('');
  c.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{TAB=b.dataset.tab;showTab();writeHash();});
}
function showTab(){
  document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===TAB)));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('on',p.dataset.tab===TAB));
  paint();
  const a=document.querySelector('.tab[aria-selected=true]'); if(a) a.scrollIntoView({block:'nearest',inline:'nearest'});
}
function mountTheme(){
  const s=document.getElementById('fTema'); if(!s) return;
  s.innerHTML=THEMES.map(t=>`<option value="${t.id}">${t.label}</option>`).join('');
  s.value=document.documentElement.dataset.theme||'nexo';
  s.onchange=()=>applyTheme(s.value);
}
function sizeHeader(){
  const h=document.getElementById('hdr').offsetHeight;
  document.getElementById('spacer').style.height=h+'px';
}
addEventListener('scroll',()=>{ document.body.classList.toggle('shrunk',scrollY>90); requestAnimationFrame(sizeHeader); });
addEventListener('resize',sizeHeader);

/* ===== filtros de topo — combobox com checkbox (multi-seleção) ===== */
function mSelBuild(id,arr,placeholder){
  const box=document.getElementById(id);
  const dim=box.dataset.dim;
  box.dataset.placeholder=placeholder;
  const labelledby=box.getAttribute('aria-labelledby')||'';
  box.innerHTML=`<button type="button" class="msel-btn" aria-haspopup="listbox" aria-expanded="false"${labelledby?` aria-labelledby="${labelledby}"`:''}></button>
    <div class="msel-panel" role="listbox">
      ${arr.length>8?'<div class="msel-search"><input type="search" placeholder="Buscar…"></div>':''}
      <div class="msel-opts">${arr.map(v=>`<label class="msel-opt"><input type="checkbox" value="${esc(v)}">${esc(v)}</label>`).join('')}</div>
    </div>`;
  const opts=box.querySelector('.msel-opts');
  opts.querySelectorAll('input[type=checkbox]').forEach(cb=>cb.onchange=()=>{
    setDim(dim,[...opts.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value));
  });
  const search=box.querySelector('.msel-search input');
  if(search) search.oninput=()=>{
    const q=search.value.toLowerCase();
    opts.querySelectorAll('.msel-opt').forEach(l=>{ l.style.display=l.textContent.toLowerCase().includes(q)?'':'none'; });
  };
  box.querySelector('.msel-btn').onclick=e=>{
    e.stopPropagation();
    const willOpen=!box.classList.contains('open');
    mSelCloseAll();
    if(willOpen){ box.classList.add('open'); box.querySelector('.msel-btn').setAttribute('aria-expanded','true');
      if(search){ search.value=''; search.oninput(); search.focus(); } }
  };
  mSelSync(box);
}
function mSelSync(box){
  const dim=box.dataset.dim, v=ST[dim]||[];
  box.querySelectorAll('.msel-opts input[type=checkbox]').forEach(cb=>cb.checked=v.includes(cb.value));
  const btn=box.querySelector('.msel-btn');
  if(!btn) return;
  btn.textContent = v.length===0 ? box.dataset.placeholder : v.length===1 ? v[0] : `(${v.length} selecionados)`;
}
function mSelCloseAll(){
  document.querySelectorAll('.msel.open').forEach(m=>{ m.classList.remove('open'); m.querySelector('.msel-btn').setAttribute('aria-expanded','false'); });
}
document.addEventListener('click',e=>{ if(!e.target.closest('.msel')) mSelCloseAll(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') mSelCloseAll(); });

function mountFilters(){
  mSelBuild('fEtapa',ETAPAS.filter(e=>uniq('etapa').includes(e)),'Todos os passos');
  mSelBuild('fMarca',uniq('tipo_imob'),'Todas as imobiliárias');
  mSelBuild('fEquipe',uniq('equipe'),'Todas as equipes');
  mSelBuild('fResp',uniq('responsavel'),'Todos os responsáveis');
  mSelBuild('fOrigem',uniq('origem'),'Todas as origens');
  mSelBuild('fFin',uniq('finalidade'),'Todas as finalidades');
  mSelBuild('fRenda',FAIXAS.filter(f=>DATA.some(r=>faixa(r.valor_renda)===f)),'Todas as faixas');
  mSelBuild('fMes',uniq('mes'),'Todos os meses');
  mSelBuild('fTag',ALLTAGS,'Todas as tags');
  mSelBuild('fCat',ALLCATS,'Todas as categorias');
  document.getElementById('fModo').onchange=e=>{pushHist();ST.tagMode=e.target.value;apply();};
  document.getElementById('btnClear').onclick=clearAll;
  document.getElementById('btnClear2').onclick=clearAll;
  document.getElementById('btnUndo').onclick=undo;
  document.getElementById('q').oninput=()=>{tLeads(rowsFor());mountBars();};
  const fbarToggle=document.getElementById('fbarToggle');
  fbarToggle.onclick=()=>{
    const open=document.getElementById('fbar').classList.toggle('open');
    fbarToggle.setAttribute('aria-expanded',String(open));
  };
}
function syncFilters(){
  document.querySelectorAll('.msel[data-dim]').forEach(mSelSync);
  document.getElementById('fModo').value=ST.tagMode;
}
function chips(n){
  const out=[];
  DIMS.forEach(d=>ST[d].forEach(v=>out.push(
    `<span class="chip"><b>${DIMLABEL[d]}:</b> ${esc(v)}<button class="x" data-d="${d}" data-v="${esc(v)}" title="Remover">×</button></span>`)));
  if(ST.tagMode==='none') out.push(`<span class="chip"><b>Somente sem tag</b><button class="x" data-mode="1" title="Remover">×</button></span>`);
  else if(ST.tagMode==='and'&&ST.tag.length>1) out.push(`<span class="chip"><b>Tags combinadas com E</b><button class="x" data-mode="1">×</button></span>`);
  out.push(`<span class="chip stat">${nf(n)} de ${nf(LEADS_TOTAL)} cadastros</span>`);
  if(activeCount()) out.push(`<button class="btn sec xs clAll">Limpar tudo</button>`);
  const el=document.getElementById('chips'); el.innerHTML=out.join('');
  el.querySelectorAll('.x').forEach(b=>b.onclick=()=>{
    if(b.dataset.mode){pushHist();ST.tagMode='or';apply();}
    else toggle(b.dataset.d,b.dataset.v,true);
  });
  el.querySelectorAll('.clAll').forEach(b=>b.onclick=clearAll);
  const hc=document.getElementById('hchips');
  if(activeCount()){ hc.classList.add('on');
    hc.innerHTML='<div class="in">'+out.join('')+'</div>';
    hc.querySelectorAll('.x').forEach(b=>b.onclick=()=>{
      if(b.dataset.mode){pushHist();ST.tagMode='or';apply();} else toggle(b.dataset.d,b.dataset.v,true);});
    hc.querySelectorAll('.clAll').forEach(b=>b.onclick=clearAll);
  } else { hc.classList.remove('on'); hc.innerHTML=''; }
  const fbarToggle=document.getElementById('fbarToggle');
  if(fbarToggle) fbarToggle.textContent = activeCount() ? `Filtros (${activeCount()})` : 'Filtros';
  sizeHeader();
}

/* ===== KPIs e tabelas genéricas ===== */
function kpiCards(id,K){
  document.getElementById(id).innerHTML=K.map(([l,v,s,k,dim,val,tip])=>
    `<div class="kpi ${k||''}${dim&&ST[dim].includes(val)?' on':''}"${dim?` data-dim="${dim}" data-val="${esc(val)}"`:''}${tip?` title="${esc(tip)}"`:''}>`+
    `<div class="lb">${esc(l)}</div><div class="vl">${v}</div><div class="sb">${s}</div></div>`).join('');
  document.querySelectorAll('#'+id+' .kpi[data-dim]').forEach(el=>el.onclick=e=>
    toggle(el.dataset.dim,el.dataset.val,e.ctrlKey||e.metaKey));
}
function kpiClassEtapa(e){
  if(/descart|perdid|frio/i.test(e)) return 'k-crit';
  if(/finalizad|reserva|assinada/i.test(e)) return 'k-good';
  if(/pendente|pend.ncia|devolvid|pr.\s*cadastro/i.test(e)) return 'k-warn';
  return '';
}
const SORT={};
function tbl(id,head,rows,opts){
  opts=opts||{};
  const s=SORT[id]||(SORT[id]={k:opts.k!=null?opts.k:0,d:opts.d||1});
  const d=[...rows].sort((a,b)=>{
    let x=a[s.k],y=b[s.k];
    const nx=typeof x==='object'?x.v:x, ny=typeof y==='object'?y.v:y;
    if(typeof nx==='number'||typeof ny==='number') return ((nx||0)-(ny||0))*s.d;
    return String(nx==null?'':nx).localeCompare(String(ny==null?'':ny),'pt-BR')*s.d;
  });
  const num=head.map(h=>typeof h==='object'&&h.num);
  let h='<thead><tr>'+head.map((c,i)=>{const t=typeof c==='object'?c.t:c;
    return `<th class="${num[i]?'num':''}${s.k===i?' on':''}" data-a="${s.d>0?'↑':'↓'}" data-i="${i}">${t}</th>`;}).join('')+'</tr></thead><tbody>';
  d.forEach(r=>{ h+='<tr>'+r.map((c,i)=>{const v=typeof c==='object'?(c.h!=null?c.h:c.v):c;
    return `<td class="${num[i]?'num':''}">${v==null||v===''?'—':v}</td>`;}).join('')+'</tr>'; });
  h+='</tbody>';
  const t=document.getElementById(id); t.innerHTML=h;
  t.querySelectorAll('th').forEach(th=>th.onclick=()=>{
    const i=+th.dataset.i;
    if(s.k===i) s.d=-s.d; else {s.k=i; s.d = num[i]?-1:1;}
    tbl(id,head,rows,opts);
  });
  return d.length;
}
/* ===== mapa de calor clicável ===== */
function heat(id,rowsLabel,rowsKeyDim,cols,rowsData,getCount){
  const max=Math.max(1,...rowsLabel.map(rl=>cols.map(c=>getCount(rl,c)).reduce((a,b)=>Math.max(a,b),0)));
  let h='<thead><tr><th>'+rowsKeyDim.label+'</th>'+cols.map(c=>`<th class="num">${esc(c)}</th>`).join('')+'<th class="num">Total</th></tr></thead><tbody>';
  rowsLabel.forEach(rl=>{
    const tot=rowsData(rl);
    h+=`<tr><td class="lbl" data-dim="${rowsKeyDim.dim}" data-v="${esc(rl)}">${esc(rl)}</td>`+
      cols.map(c=>{const v=getCount(rl,c),a=v/max;
        return `<td data-dim="${rowsKeyDim.dim}" data-v="${esc(rl)}" data-dim2="tag" data-v2="${esc(c)}" style="${v?`background:rgba(42,120,214,${(0.10+0.80*a).toFixed(2)});`:''}${a>0.55?'color:#fff;font-weight:600;':''}">${v||'—'}</td>`;}).join('')+
      `<td class="tot">${tot}</td></tr>`;
  });
  h+='</tbody>';
  const t=document.getElementById(id); t.innerHTML=h;
  t.querySelectorAll('td[data-dim]').forEach(td=>td.onclick=e=>{
    const add=e.ctrlKey||e.metaKey;
    if(td.dataset.v2){ pushHist(); const d=td.dataset.dim,v=td.dataset.v;
      ST[d]=(ST[d].length===1&&ST[d][0]===v)?[]:[v];
      const t2=td.dataset.v2; ST.tag=(ST.tag.length===1&&ST.tag[0]===t2)?[]:[t2]; apply(); }
    else toggle(td.dataset.dim,td.dataset.v,add);
  });
}
const cnt=(rows,f)=>rows.filter(f).length;
const byKey=(rows,k)=>rows.reduce((a,r)=>{const v=r[k]||'(não informado)';a[v]=(a[v]||0)+1;return a;},{});
const topN=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);
const shortT=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
const fitBox=(id,n)=>{const b=document.getElementById(id); if(b) b.style.height=Math.max(300,n*23+40)+'px';};

/* ===== Visão Geral ===== */
function kpis(rows){
  const n=rows.length;
  const et=e=>rows.filter(r=>r.etapa===e).length;
  const K=[['Cadastros no recorte',nf(n),pct(n,LEADS_TOTAL)+' da base','']];
  ETAPAS.forEach(e=>K.push([e,nf(et(e)),pct(et(e),n),kpiClassEtapa(e),'etapa',e]));
  kpiCards('kpis',K);
}

/* ===== Base de Cadastros ===== */
function tLeads(rows){
  const q=(document.getElementById('q').value||'').trim().toLowerCase();
  let d=rows;
  if(q) d=d.filter(r=>[r.nome,r.telefone,r.email,r.equipe,r.responsavel,r.resp_tel,r.resp_email,r.origem,r.etapa,r.tags_list.join(' ')]
    .join(' ').toLowerCase().includes(q));
  const head=[{t:'Nº',num:1},'Cliente','Telefone','E-mail','Passo','Tags','Responsável','Telefone do corretor','E-mail do corretor',
    'Equipe','Origem','Finalidade',{t:'Renda',num:1},{t:'Valor negócio',num:1},{t:'Dias no passo',num:1},{t:'Dias desde cadastro',num:1},'Cadastro em'];
  const wa=t=>String(t||'').replace(/\D/g,'');
  const rr=d.map(r=>[{v:+r.numero},r.nome,r.telefone,
    {v:r.sem_email==='Sim'?'sem e-mail':r.email,h:r.sem_email==='Sim'?'<span style="color:#b06a00">sem e-mail</span>':esc(r.email)},
    r.etapa,{v:r.tags_list.join(' | '),h:r.tags_list.length?r.tags_list.map(t=>`<span class="tg">${esc(t)}</span>`).join(''):'—'},
    r.responsavel,
    {v:r.resp_tel||'',h:r.resp_tel? `<a href="https://wa.me/55${wa(r.resp_tel)}" target="_blank" rel="noopener" style="color:var(--navy);font-weight:600;text-decoration:none">${esc(r.resp_tel)}</a>` : '—'},
    {v:r.resp_email||'',h:r.resp_email? `<a href="mailto:${esc(r.resp_email)}" style="color:var(--ink-2);text-decoration:none">${esc(r.resp_email)}</a>` : '—'},
    r.equipe,r.origem,r.finalidade&&r.finalidade!=='-'?r.finalidade:'—',
    {v:r.valor_renda||0,h:r.valor_renda?money(r.valor_renda):'—'},
    {v:r.valor_negocio||0,h:r.valor_negocio?money(r.valor_negocio):'—'},
    {v:r.dias_sem_movimento},{v:r.dias_cadastro},r.cadastro]);
  tbl('tLeads',head,rr,{k:0,d:-1});
  document.getElementById('nLeads').textContent=nf(rr.length)+' linhas exibidas'+(q?' (busca ativa)':'')+'. Clique no cabeçalho para ordenar; as exportações seguem exatamente o que está na tela.';
}

/* ===== Pontos de Atenção ===== */
let ALERTSEL=[];
function toggleAlert(key,additive){
  if(additive){ const i=ALERTSEL.indexOf(key); i>=0?ALERTSEL.splice(i,1):ALERTSEL.push(key); }
  else { ALERTSEL = (ALERTSEL.length===1&&ALERTSEL[0]===key) ? [] : [key]; }
  paint();
}
function alertDefs(){
  const byTel={}; DATA.forEach(r=>{ if(r.telefone){ (byTel[r.telefone]=byTel[r.telefone]||[]).push(r); } });
  const dupIds=new Set(Object.values(byTel).filter(a=>a.length>1).flat().map(r=>r.lead_id));
  return [
    {key:'estagnado',  label:'Parado 14+ dias sem concluir', test:r=>estagnado(r),
      tip:'Sem nenhuma atualização na ficha há 14 dias ou mais, e ainda não chegou em Contrato Finalizado, Venda Perdida ou Descarte.'},
    {key:'semtag',     label:'Sem nenhuma tag', test:r=>r.tags_list.length===0, tip:'Cadastro sem nenhuma marcação de tag.'},
    {key:'sememail',   label:'Sem e-mail válido', test:r=>r.sem_email==='Sim'||!r.email, tip:'E-mail vazio ou placeholder automático do CRM.'},
    {key:'semcontato', label:'Corretor sem contato localizado', test:r=>r.corretor_sem_contato,
      tip:'O responsável não foi encontrado (ou está sem telefone/e-mail) na listagem de usuários do Imobmeet.'},
    {key:'duplicado',  label:'Possível cadastro duplicado', test:r=>dupIds.has(r.lead_id), tip:'Mesmo telefone aparece em mais de um cadastro de Village Siena.'},
    {key:'faltapix',   label:'Tag FALTA PIX', test:r=>has(r,'FALTA PIX'), tip:'Cadastro com a marcação FALTA PIX.'}
  ];
}
function alerts(rows){
  const defs=alertDefs().map(a=>({...a, rows:rows.filter(a.test)}));
  document.getElementById('alerts').innerHTML=defs.map(a=>
    `<div class="card alert${ALERTSEL.includes(a.key)?' on':''}" data-key="${a.key}" title="${esc(a.tip)}">`+
    `<p class="ch-t">${nf(a.rows.length)}</p><p class="ch-s">${esc(a.label)}</p></div>`).join('');
  document.querySelectorAll('#alerts .card[data-key]').forEach(el=>el.onclick=e=>toggleAlert(el.dataset.key,e.ctrlKey||e.metaKey));

  const active=defs.filter(a=>ALERTSEL.includes(a.key));
  const shown = active.length? rows.filter(r=>active.some(a=>a.rows.includes(r))) : [];
  const head=['Nº','Cliente','Passo','Telefone','E-mail','Responsável','Motivo(s)'];
  const rr=shown.map(r=>{
    const motivos=active.filter(a=>a.rows.includes(r)).map(a=>a.label);
    return [{v:+r.numero},r.nome,r.etapa,r.telefone,r.sem_email==='Sim'?'sem e-mail':r.email,r.responsavel,motivos.join(' · ')];
  });
  tbl('tAcao',head,rr,{k:0,d:-1});
  document.getElementById('nAcao').textContent = active.length
    ? `${nf(rr.length)} cadastro(s) para o(s) motivo(s) selecionado(s), no recorte atual.`
    : 'Selecione um ou mais cards acima para listar os cadastros correspondentes.';
}

/* ===== ciclo principal ===== */
function paint(){
  const R=rowsFor(), n=R.length;
  if(TAB==='visao'){
    kpis(R);
    const Re=rowsFor('etapa');
    const ev=ETAPAS.map(e=>cnt(Re,r=>r.etapa===e));
    bar('cEtapa','etapa',ETAPAS,ev,ETAPAS.map((_,i)=>corEtapa(i)),{total:Re.length});
    const mx=Math.max(0,...ev);
    document.getElementById('nEtapa').textContent=Re.length?`${pct(mx,Re.length)} dos cadastros do recorte estão em "${ETAPAS[ev.indexOf(mx)]}".`:'Sem cadastros neste recorte.';

    const Rm=rowsFor(['mes','etapa']), meses=uniq('mes');
    const selM=ST.mes, selE=ST.etapa;
    build('cMes',{type:'bar',data:{labels:meses,datasets:ETAPAS.map((e,i)=>({label:e,
      backgroundColor:meses.map(m=>fade(corEtapa(i),(!selM.length||selM.includes(m))&&(!selE.length||selE.includes(e)))),
      borderColor:'#fff',borderWidth:2,data:meses.map(m=>cnt(Rm,r=>r.mes===m&&r.etapa===e))}))},
      options:{plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true,...gn},y:{stacked:true,...gx}}}},
      (i,d,add)=>{pushHist(); const m=meses[i],e=ETAPAS[d];
        ST.mes=(ST.mes.length===1&&ST.mes[0]===m)?[]:[m]; ST.etapa=(ST.etapa.length===1&&ST.etapa[0]===e)?[]:[e]; apply();});
    document.getElementById('nMes').textContent='Safras mensais empilhadas pelo passo em que o cadastro está hoje. Clique num segmento para filtrar mês e passo juntos.';

    const days=[...new Set(DATA.map(r=>r.data).filter(Boolean))].sort();
    if(days.length){
      const ax=[]; for(let d=new Date(days[0]+'T00:00:00'),z=new Date(days[days.length-1]+'T00:00:00');d<=z;d.setDate(d.getDate()+1))ax.push(d.toISOString().slice(0,10));
      const cd=byKey(R,'data');
      build('cTempo',{type:'line',data:{labels:ax.map(d=>d.slice(8,10)+'/'+d.slice(5,7)),
        datasets:[{data:ax.map(d=>cd[d]||0),borderColor:'#2a78d6',backgroundColor:'rgba(42,120,214,.12)',borderWidth:2,
          fill:true,tension:.25,pointRadius:ax.map(d=>cd[d]?4:0),pointBackgroundColor:'#2a78d6',pointBorderColor:'#fff',pointBorderWidth:2}]},
        options:{plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>nf(c.raw)+' cadastros'}}},
          interaction:{mode:'index',intersect:false},scales:{y:{beginAtZero:true,...gx},x:{...gn,ticks:{maxTicksLimit:14}}}}});
    }
    document.getElementById('nTempo').textContent='Data de entrada do cadastro de Village Siena no Funil de Venda.';

    const comVal=R.filter(r=>r.valor_negocio>0);
    const soma=comVal.reduce((a,r)=>a+r.valor_negocio,0);
    document.getElementById('nValor').innerHTML = comVal.length
      ? `${nf(comVal.length)} de ${nf(n)} cadastros do recorte (${pct(comVal.length,n)}) têm valor de negócio informado. Soma: <b>${money(soma)}</b> · Média: <b>${money(soma/comVal.length)}</b> · Mediana: <b>${money(median(comVal.map(r=>r.valor_negocio)))}</b>.`
      : 'Nenhum cadastro do recorte tem valor de negócio informado.';

  } else if(TAB==='tempo'){
    const Re=rowsFor('etapa');
    const medEtapa=ETAPAS.map(e=>{ const arr=Re.filter(r=>r.etapa===e).map(r=>r.dias_sem_movimento); return arr.length?median(arr):0; });
    bar('cTempoEtapa','etapa',ETAPAS,medEtapa,ETAPAS.map((_,i)=>corEtapa(i)),{suffix:'dia(s), mediana'});

    const resumoHead=['Passo',{t:'Cadastros',num:1},{t:'Mediana (dias)',num:1},{t:'Média (dias)',num:1},{t:'Mín (dias)',num:1},{t:'Máx (dias)',num:1},{t:'Parados 14+ dias',num:1}];
    const resumoRows=ETAPAS.map(e=>{
      const rs=R.filter(r=>r.etapa===e), arr=rs.map(r=>r.dias_sem_movimento);
      return [e,{v:rs.length},{v:arr.length?median(arr):0},{v:arr.length?Math.round(mean(arr)):0},{v:arr.length?Math.min(...arr):0},{v:arr.length?Math.max(...arr):0},{v:rs.filter(estagnado).length}];
    });
    tbl('tTempoResumo',resumoHead,resumoRows,{k:2,d:-1});

    const cliHead=[{t:'Nº',num:1},'Cliente','Passo',{t:'Dias no passo',num:1},{t:'Dias desde o cadastro',num:1},'Responsável','Equipe','Última atualização'];
    const cliRows=R.map(r=>[{v:+r.numero},r.nome,r.etapa,{v:r.dias_sem_movimento},{v:r.dias_cadastro},r.responsavel,r.equipe,r.ultima_atualizacao]);
    tbl('tTempoCli',cliHead,cliRows,{k:3,d:-1});

  } else if(TAB==='tags'){
    const Rt=rowsFor('tag');
    bar('cTags','tag',ALLTAGS,ALLTAGS.map(t=>cnt(Rt,r=>has(r,t))),ALLTAGS.map(t=>CATCOLOR[cat(t)]||'#4a3aa7'),{total:Rt.length});
    document.getElementById('lgCat').innerHTML=ALLCATS.map(c=>`<span><i style="background:${CATCOLOR[c]||'#4a3aa7'}"></i>${esc(c)}</span>`).join('');

    const Rc=rowsFor('categoria');
    bar('cCat','categoria',ALLCATS,ALLCATS.map(c=>cnt(Rc,r=>r.tags_list.some(t=>cat(t)===c))),ALLCATS.map(c=>CATCOLOR[c]||'#4a3aa7'),{total:Rc.length,vertical:true});
    document.getElementById('nCat').textContent='Um cadastro pode contar em mais de uma categoria se tiver tags de naturezas diferentes.';

    heat('tHeat', ETAPAS, {dim:'etapa',label:'Passo'}, ALLTAGS, e=>R.filter(r=>r.etapa===e).length,
      (e,t)=>R.filter(r=>r.etapa===e&&has(r,t)).length);

    const dimHead=['Tag','Categoria',{t:'Cadastros',num:1},{t:'% da base',num:1}];
    const dimRows=ALLTAGS.map(t=>{const c=cnt(R,r=>has(r,t)); return [t,cat(t),{v:c},{v:c,h:pct(c,n)}];});
    tbl('tDim',dimHead,dimRows,{k:2,d:-1});

  } else if(TAB==='perfil'){
    const fins=uniq('finalidade');
    const Rf=rowsFor('finalidade');
    bar('cFin','finalidade',fins,fins.map(f=>cnt(Rf,r=>r.finalidade===f)),SER,{total:Rf.length,vertical:true,short:l=>shortT(l,22)});

    const faixasPresentes=FAIXAS.filter(f=>DATA.some(r=>faixa(r.valor_renda)===f));
    const Rr=rowsFor('faixa');
    bar('cRenda','faixa',faixasPresentes,faixasPresentes.map(f=>cnt(Rr,r=>faixa(r.valor_renda)===f)),SER,{total:Rr.length,vertical:true});

    const comVal=R.filter(r=>r.valor_negocio>0);
    const faixasNeg=FAIXAS_NEG.filter(f=>DATA.some(r=>r.valor_negocio>0&&faixaNeg(r.valor_negocio)===f));
    bar('cValorNeg',null,faixasNeg,faixasNeg.map(f=>cnt(comVal,r=>faixaNeg(r.valor_negocio)===f)),SER,{total:comVal.length,vertical:true});
    document.getElementById('nValorFaixa').textContent=`${nf(comVal.length)} de ${nf(n)} cadastros do recorte têm valor de negócio informado (${pct(comVal.length,n)}). Os demais aparecem como "0 / não informado".`;

    const origens=uniq('origem');
    const Ro=rowsFor('origem');
    bar('cOrigem','origem',origens,origens.map(o=>cnt(Ro,r=>r.origem===o)),'#2a78d6',{total:Ro.length,short:l=>shortT(l,34)});
    document.getElementById('nOrigem').textContent='Origem declarada do cadastro no Imobmeet.';

  } else if(TAB==='equipes'){
    const imobs=uniq('tipo_imob');
    const Ri=rowsFor('tipo_imob');
    bar('cImob','tipo_imob',imobs,imobs.map(i=>cnt(Ri,r=>r.tipo_imob===i)),SER,{total:Ri.length,vertical:true});

    const eqCounts=byKey(R,'equipe'), eqTop=topN(eqCounts,9999);
    fitBox('innerEquipe',eqTop.length);
    const Req=rowsFor('equipe');
    bar('cEquipe','equipe',eqTop.map(x=>x[0]),eqTop.map(x=>x[1]),'#2a78d6',{total:Req.length,short:l=>shortT(l,38)});

    const corrHead=['Corretor','Equipe',{t:'Cadastros',num:1},{t:'% do recorte',num:1},'Corretor sem contato'];
    const corrs=[...new Set(R.map(r=>r.responsavel))];
    const corrRows=corrs.map(c=>{
      const rs=R.filter(r=>r.responsavel===c), v=rs.length;
      return [c, rs[0]?rs[0].equipe:'', {v}, {v,h:pct(v,n)}, rs.some(r=>r.corretor_sem_contato)?'Sim':'Não'];
    });
    tbl('tCorr',corrHead,corrRows,{k:2,d:-1});

  } else if(TAB==='alertas'){
    alerts(R);
  } else if(TAB==='base'){
    tLeads(R);
  }
  mountChartExports(); mountBars();
}
function apply(skipHist){
  const R=rowsFor(), n=R.length;
  syncFilters(); chips(n); writeHash();
  document.getElementById('empty').classList.toggle('on', n===0);
  document.getElementById('panels').style.display = n===0 ? 'none' : '';
  TABS.forEach(([k])=>{const e=document.querySelector('[data-cnt="'+k+'"]'); if(e) e.textContent = k==='base'?nf(n):'';});
  if(n) paint();
}
loadFiltersLS(); readHash(); mountTabs(); mountFilters(); mountTheme(); mountChartExports();
document.getElementById('bTot').textContent=nf(DATA.length);
document.getElementById('bTags').textContent=ALLTAGS.length;
const _st=document.querySelector('.stamp .dt');
document.getElementById('fMeta').textContent='Página gerada em '+(_st?_st.textContent.trim():'—')+'. Relatório a partir de '+nf(DATA.length)+' cadastros de Village Siena no Funil de Venda e '+
  nf(DATA.reduce((a,r)=>a+r.tags_list.length,0))+' marcações de tag. Tags sem categoria conhecida: '+
  (ALLTAGS.filter(t=>cat(t)==='OUTROS').join(', ')||'nenhuma')+'.';
showTab(); apply(); sizeHeader();
setTimeout(sizeHeader,300);
