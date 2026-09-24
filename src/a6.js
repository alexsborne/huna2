/* ===== pintura por aba ===== */
const cnt=(rows,f)=>rows.filter(f).length;
const byKey=(rows,k)=>rows.reduce((a,r)=>{const v=r[k]||'(não informado)';a[v]=(a[v]||0)+1;return a;},{});
const topN=(o,n)=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,n);
const shortT=(s,n)=>s.length>n?s.slice(0,n-1)+'…':s;
const fitBox=(id,n)=>{const b=document.getElementById(id); if(b) b.style.height=Math.max(320,n*23+72)+'px';};

/* ===== aba Gerente — helpers ===== */
const convFn=r=>METRICS.find(m=>m.k==='conv').fn(r);
const pctFmt=v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
function gerTable(rows){
  const by={};
  rows.forEach(r=>{ const k=r.responsavel||'(sem corretor)'; (by[k]=by[k]||[]).push(r); });
  return Object.keys(by).map(k=>{
    const rs=by[k], o={nome:k};
    METRICS.forEach(m=>{ o[m.k]=m.fn(rs); });
    return o;
  });
}
function convGroups(rows,keyFn,minN){
  const by={};
  rows.forEach(r=>{ const k=keyFn(r); (by[k]=by[k]||[]).push(r); });
  return Object.keys(by).map(k=>({valor:k, n:by[k].length, conv:convFn(by[k]), aprov:cnt(by[k],r=>r.etapa==='Pasta Aprovada com Pix')}))
    .filter(o=>o.n>=minN);
}
function convBar(id,groups,color){
  build(id,{type:'bar',data:{labels:groups.map(o=>shortT(String(o.valor),28)),
    datasets:[{data:groups.map(o=>+o.conv.toFixed(1)),backgroundColor:color,borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}]},
    options:{indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{
      title:c=>String(groups[c[0].dataIndex].valor),
      label:c=>{const o=groups[c.dataIndex]; return pctFmt(o.conv)+' de conversão · '+nf(o.aprov)+' de '+nf(o.n)+' cadastros';}
    }}},
    scales:{x:{...gx,grace:'12%'},y:gn}}});
}
const temContratoTag=r=>r.tags_list.some(t=>cat(t)==='CONTRATO');

/* ===== aba Pontos de Atenção — seleção local dos cards ===== */
let ALERTSEL=[];
function toggleAlert(key,additive){
  if(additive){ const i=ALERTSEL.indexOf(key); i>=0?ALERTSEL.splice(i,1):ALERTSEL.push(key); }
  else { ALERTSEL=(ALERTSEL.length===1&&ALERTSEL[0]===key)?[]:[key]; }
  paint();
}
function dupGroups(rows,keyFn){
  const m={}; rows.forEach(r=>{ const k=keyFn(r); if(!k) return; (m[k]=m[k]||[]).push(r); });
  return Object.values(m).filter(g=>g.length>1);
}

/* ===== aba Times_2 — mapa da hierarquia (imobiliária → equipe → gerente → corretor → clientes) ===== */
let MM={imob:null,equipe:null,corretor:null};
function mmSelect(level,val){
  if(level==='imob'){ MM.imob=(MM.imob===val?null:val); MM.equipe=null; MM.corretor=null; }
  else if(level==='equipe'){ MM.equipe=(MM.equipe===val?null:val); MM.corretor=null; }
  else if(level==='corretor'){ MM.corretor=(MM.corretor===val?null:val); }
  paintMindMap();
}
function mmMetrics(rows){
  if(!rows.length) return 'sem cadastros';
  const aprov=cnt(rows,r=>r.etapa==='Pasta Aprovada com Pix');
  return `${nf(rows.length)} cadastro(s) · ${pctFmt(100*aprov/rows.length)} aprov.`;
}
function mmClientCard(r){
  return `<div class="mm-client"><div class="nm">${esc(r.nome)}</div><dl>
    <dt>Telefone</dt><dd>${esc(r.telefone)||'—'}</dd>
    <dt>E-mail</dt><dd>${r.sem_email==='Sim'?'sem e-mail':esc(r.email)||'—'}</dd>
    <dt>Origem</dt><dd>${esc(r.origem)||'—'}</dd>
    <dt>Etapa</dt><dd>${esc(r.etapa)}</dd>
    <dt>Finalidade</dt><dd>${esc(r.finalidade)&&r.finalidade!=='-'?esc(r.finalidade):'—'}</dd>
    <dt>Valor de renda</dt><dd>${r.valor_renda?money(r.valor_renda):'—'}</dd>
    <dt>Tags</dt><dd>${r.tags_list.length?r.tags_list.map(t=>`<span class="tg">${esc(t)}</span>`).join(''):'—'}</dd>
    <dt>Cadastro em</dt><dd>${esc(r.cadastro)}</dd>
  </dl></div>`;
}
function mmNodeHtml(level,items){
  if(!items.length) return '<p class="mm-empty">Nada no recorte atual.</p>';
  return items.map(it=>`<div class="mm-node${it.sel?' sel':''}${it.clickable===false?' nc':''}"${it.clickable===false?'':` data-level="${level}" data-key="${esc(it.key)}"`}>`+
    `<div class="nm">${esc(it.label)}</div><div class="vl">${mmMetrics(it.rows)}</div></div>`).join('');
}
function paintMindMap(){
  const R=rowsFor();
  const cols=[];

  const mk=topN(byKey(R,'marca'),9999);
  cols.push({title:'Imobiliárias',level:'imob',
    items:mk.map(([v])=>({key:v,label:v,rows:R.filter(r=>r.marca===v),sel:MM.imob===v}))});

  let R2=[], equipeItems=[];
  if(MM.imob){
    R2=R.filter(r=>r.marca===MM.imob);
    const ek=topN(byKey(R2,'equipe'),9999);
    equipeItems=ek.map(([v])=>({key:v,label:gerLabel(v),rows:R2.filter(r=>r.equipe===v),sel:MM.equipe===v}));
    cols.push({title:'Equipes',level:'equipe',items:equipeItems});
  }

  let R3=[], corretorItems=[];
  if(MM.equipe){
    R3=R2.filter(r=>r.equipe===MM.equipe);
    cols.push({title:'Gerente responsável',level:'gerente',
      items:[{key:MM.equipe,label:gerLabel(MM.equipe),rows:R3,clickable:false}]});
    const ck=topN(byKey(R3,'responsavel'),9999);
    corretorItems=ck.map(([v])=>({key:v,label:v,rows:R3.filter(r=>r.responsavel===v),sel:MM.corretor===v}));
    cols.push({title:'Corretores',level:'corretor',items:corretorItems});
  }

  let R4=[];
  if(MM.corretor){
    R4=R3.filter(r=>r.responsavel===MM.corretor);
    cols.push({title:`Clientes (${nf(R4.length)})`,clients:R4});
  }

  document.getElementById('mmCols').innerHTML=cols.map(col=>
    `<div class="mm-col"><h4>${esc(col.title)}</h4>${col.clients
      ? (col.clients.length?col.clients.map(mmClientCard).join(''):'<p class="mm-empty">Nenhum cliente.</p>')
      : mmNodeHtml(col.level,col.items)}</div>`).join('');
  document.querySelectorAll('#mmCols .mm-node[data-level]').forEach(el=>{
    el.onclick=()=>mmSelect(el.dataset.level,el.dataset.key);
  });

  document.getElementById('nMM').textContent = !MM.imob
    ? `${nf(mk.length)} imobiliária(s)/lançadora(s) no recorte atual. Clique numa para começar.`
    : !MM.equipe ? `${nf(equipeItems.length)} equipe(s) em ${MM.imob}.`
    : !MM.corretor ? `${nf(corretorItems.length)} corretor(es) na equipe de ${gerLabel(MM.equipe)}.`
    : `${nf(R4.length)} cliente(s) de ${MM.corretor}, na equipe de ${gerLabel(MM.equipe)}.`;

  mmDrawLines();
}
function mmDrawLines(){
  const wrap=document.getElementById('mmWrap'); if(!wrap) return;
  const svg=document.getElementById('mmLines'), colsEl=document.getElementById('mmCols');
  const ww=colsEl.scrollWidth, wh=colsEl.scrollHeight;
  svg.setAttribute('width',ww); svg.setAttribute('height',wh); svg.setAttribute('viewBox',`0 0 ${ww} ${wh}`);
  const base={x:wrap.getBoundingClientRect().left-wrap.scrollLeft, y:wrap.getBoundingClientRect().top-wrap.scrollTop};
  const cols=[...colsEl.children];
  let paths='';
  cols.forEach((colEl,i)=>{
    if(i===0) return;
    const prevSel=cols[i-1].querySelector('.mm-node.sel, .mm-node.nc');
    if(!prevSel) return;
    const pr=prevSel.getBoundingClientRect();
    const p1={x:pr.right-base.x, y:pr.top+pr.height/2-base.y};
    colEl.querySelectorAll('.mm-node, .mm-client').forEach(node=>{
      const nr=node.getBoundingClientRect();
      const p2={x:nr.left-base.x, y:nr.top+nr.height/2-base.y};
      const mx=(p1.x+p2.x)/2;
      paths+=`<path d="M${p1.x},${p1.y} C${mx},${p1.y} ${mx},${p2.y} ${p2.x},${p2.y}" fill="none" style="stroke:var(--navy);stroke-opacity:.3;stroke-width:2"/>`;
    });
  });
  svg.innerHTML=paths;
}
addEventListener('resize',()=>{ if(TAB==='times2') mmDrawLines(); });

/* ===== aba Times_3 — 5 gráficos de barra em cascata (imobiliária→equipe→gerente→corretor→cliente) =====
   Regra do usuário: na string de `equipe` ("MARCA SUBUNIDADE - GERENTE"), a 1ª palavra é a Imobiliária,
   a(s) palavra(s) seguinte(s) até o "-" são a Equipe, e o que vem depois do "-" é o Gerente.
   Ex.: "ADAO SOLO - ALESSANDRO" -> imobiliária=ADAO, equipe=SOLO, gerente=ALESSANDRO.
   Isso é DELIBERADAMENTE diferente de `marca`/`grupoLancadora()` (usado em Times/Times_2) — aqui não há
   agrupamento por prefixo conhecido, é sempre a divisão mecânica pedida, mesmo pra prefixos de 2 palavras
   como "MY BROKER" (vira imobiliária=MY, equipe=BROKER ...). Usa a mesma regex `\s*-\s*` de `gerLabel()`
   (a1.js) pra aguentar hífen sem espaço (achado real: "W N NEGOCIOS IMOBILIARIOS -WANDERLEI..."). */
let T3={imob:null,eq:null,equipeFull:null,corretor:null,cliIdx:null};
function t3Parts(equipe){
  const p=(equipe||'').split(/\s*-\s*/);
  const prefix=(p[0]||'').trim();
  const gerente=p.length>1?p.slice(1).join(' - ').trim():'(sem gerente)';
  const words=prefix.split(/\s+/).filter(Boolean);
  return {imob:words[0]||'(sem imobiliária)', eq:words.slice(1).join(' ')||'(sem equipe)', gerente};
}
function t3Select(level,val){
  if(level==='imob'){ T3.imob=(T3.imob===val?null:val); T3.eq=null; T3.equipeFull=null; T3.corretor=null; T3.cliIdx=null; }
  else if(level==='eqpair'){ const [im,eq]=val.split('||');
    if(T3.imob===im&&T3.eq===eq){ T3.imob=null; T3.eq=null; } else { T3.imob=im; T3.eq=eq; }
    T3.equipeFull=null; T3.corretor=null; T3.cliIdx=null; }
  else if(level==='eq'){ T3.eq=(T3.eq===val?null:val); T3.equipeFull=null; T3.corretor=null; T3.cliIdx=null; }
  else if(level==='gerente'){ if(T3.equipeFull===val){ T3.equipeFull=null; } else { T3.equipeFull=val; const p=t3Parts(val); T3.imob=p.imob; T3.eq=p.eq; }
    T3.corretor=null; T3.cliIdx=null; }
  else if(level==='corretor'){ T3.corretor=(T3.corretor===val?null:val); T3.cliIdx=null; }
  paintTimes3();
}
function t3Bar(id,labels,values,color,selected,onSel,opts){
  opts=opts||{};
  const keys=opts.keys||labels;
  const bgs=labels.map((l,i)=>fade(color, selected==null||selected===keys[i]));
  build(id,{type:'bar',data:{labels:labels.map(l=>shortT(String(l),opts.trunc||30)),
      datasets:[{data:values,backgroundColor:bgs,borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}]},
    options:{indexAxis:'y',plugins:{legend:{display:false},dl:{total:opts.total||0},
      tooltip:{callbacks:{title:c=>String(labels[c[0].dataIndex]),
        label:c=>opts.tooltip?opts.tooltip(c.dataIndex):nf(c.raw)+' cadastro(s)'}}},
      scales:{x:{...gx,grace:'16%'},y:gn}}},
    (i)=>onSel(keys[i],i));
}
function t3Show(id,show){ const el=document.getElementById(id); if(el) el.style.display=show?'':'none'; }
function paintTimes3(){
  const R=rowsFor();
  const withParts=R.map(r=>({r,p:t3Parts(r.equipe)}));

  /* 1. Imobiliária — sempre a base toda */
  const g1={}; withParts.forEach(x=>(g1[x.p.imob]=g1[x.p.imob]||[]).push(x));
  const imobs=Object.keys(g1).sort((a,b)=>g1[b].length-g1[a].length);
  fitBox('innerT3Imob',imobs.length);
  t3Bar('t3Imob',imobs,imobs.map(k=>g1[k].length),'#2a78d6',T3.imob,v=>t3Select('imob',v),{total:R.length});
  document.getElementById('nT3Imob').textContent=`${nf(imobs.length)} imobiliária(s) no recorte; clique numa para restringir.`;

  /* 2. Equipe — sem imobiliária selecionada, mostra todos os pares (imobiliária,equipe) já qualificados,
        pra não misturar equipes de nome igual em imobiliárias diferentes (ex.: "IMOVEIS" existe em 6 delas) */
  let eqLabels,eqKeys,eqCounts,eqSel,eqTotal,eqClick;
  if(T3.imob){
    const escopo=g1[T3.imob]||[];
    const g2={}; escopo.forEach(x=>(g2[x.p.eq]=g2[x.p.eq]||[]).push(x));
    eqKeys=Object.keys(g2).sort((a,b)=>g2[b].length-g2[a].length);
    eqLabels=eqKeys; eqCounts=eqKeys.map(k=>g2[k].length);
    eqSel=T3.eq; eqTotal=escopo.length;
    eqClick=v=>t3Select('eq',v);
  } else {
    const g2={}; withParts.forEach(x=>{ const k=x.p.imob+'||'+x.p.eq; (g2[k]=g2[k]||[]).push(x); });
    eqKeys=Object.keys(g2).sort((a,b)=>g2[b].length-g2[a].length);
    eqLabels=eqKeys.map(k=>k.split('||').join(' '));
    eqCounts=eqKeys.map(k=>g2[k].length);
    eqSel=null; eqTotal=R.length;
    eqClick=k=>t3Select('eqpair',k);
  }
  fitBox('innerT3Eq',eqKeys.length);
  t3Bar('t3Eq',eqLabels,eqCounts,'#1baf7a',eqSel,eqClick,{total:eqTotal,keys:eqKeys,trunc:34});
  document.getElementById('nT3Eq').textContent = T3.imob
    ? `${nf(eqKeys.length)} equipe(s) em ${T3.imob}.`
    : `${nf(eqKeys.length)} equipe(s) no recorte todo (rótulo com a imobiliária); clique numa imobiliária acima pra restringir, ou direto aqui pra escolher as duas de uma vez.`;

  /* 3. Gerente — chave sempre é a string completa de `equipe` (pode haver >1 gerente por imobiliária+equipe) */
  const gerScope = T3.imob&&T3.eq ? (g1[T3.imob]||[]).filter(x=>x.p.eq===T3.eq)
    : T3.imob ? (g1[T3.imob]||[]) : withParts;
  const g3={}; gerScope.forEach(x=>(g3[x.r.equipe]=g3[x.r.equipe]||[]).push(x));
  const gerKeys=Object.keys(g3).sort((a,b)=>g3[b].length-g3[a].length);
  const gerQualificado = !(T3.imob&&T3.eq);
  const gerLabels=gerKeys.map(full=>{ const p=t3Parts(full); return gerQualificado?`${p.imob} ${p.eq} · ${p.gerente}`:p.gerente; });
  fitBox('innerT3Ger',gerKeys.length);
  t3Bar('t3Ger',gerLabels,gerKeys.map(k=>g3[k].length),'#eda100',T3.equipeFull,full=>t3Select('gerente',full),
    {total:gerScope.length,keys:gerKeys,trunc:44});
  document.getElementById('nT3Ger').textContent = T3.imob&&T3.eq
    ? (gerKeys.length>1 ? `${nf(gerKeys.length)} gerentes na equipe ${T3.eq} — mais de um gerente compartilha essa equipe.`
                        : `${nf(gerKeys.length)} gerente na equipe ${T3.eq}.`)
    : `${nf(gerKeys.length)} gerente(s) no recorte atual; clique num para escolher imobiliária+equipe+gerente de uma vez.`;

  /* 4. Corretor — se um gerente/equipe específico já está escolhido, restringe a ele; senão mostra todos */
  const corrScope = T3.equipeFull ? R.filter(r=>r.equipe===T3.equipeFull)
    : T3.imob&&T3.eq ? gerScope.map(x=>x.r)
    : T3.imob ? gerScope.map(x=>x.r)
    : R;
  const g4={}; corrScope.forEach(r=>(g4[r.responsavel]=g4[r.responsavel]||[]).push(r));
  const corretores=Object.keys(g4).sort((a,b)=>g4[b].length-g4[a].length);
  fitBox('innerT3Corr',corretores.length);
  t3Bar('t3Corr',corretores,corretores.map(k=>g4[k].length),'#e87ba4',T3.corretor,v=>t3Select('corretor',v),{total:corrScope.length});
  document.getElementById('nT3Corr').textContent = T3.equipeFull
    ? `${nf(corretores.length)} corretor(es) sob ${t3Parts(T3.equipeFull).gerente}.`
    : `${nf(corretores.length)} corretor(es) no recorte atual; clique num gerente acima pra restringir.`;

  /* 5. Cliente — barra = dias desde o cadastro (linha do tempo), mais antigo primeiro */
  const cliScope = T3.corretor ? corrScope.filter(r=>r.responsavel===T3.corretor) : corrScope;
  const R5=[...cliScope].sort((a,b)=>(b.dias_cadastro||0)-(a.dias_cadastro||0));
  fitBox('innerT3Cli',R5.length);
  const nomes=R5.map(r=>r.nome);
  t3Bar('t3Cli',nomes,R5.map(r=>r.dias_cadastro||0),'#4a3aa7',T3.cliIdx!=null?nomes[T3.cliIdx]:null,
    (v,i)=>{ T3.cliIdx=i; t3ShowDetalhe(); },
    {trunc:22, tooltip:i=>`Cadastrado em ${R5[i].cadastro} (${nf(R5[i].dias_cadastro||0)} dia(s) atrás)`});
  document.getElementById('nT3Cli').textContent = T3.corretor
    ? `${nf(R5.length)} cliente(s) de ${T3.corretor}, do mais antigo pro mais recente. A barra mostra há quantos dias foi cadastrado; clique numa pra ver os dados completos.`
    : `${nf(R5.length)} cliente(s) no recorte atual, do mais antigo pro mais recente; clique num corretor acima pra restringir.`;
  T3._clientRows=R5;

  t3ShowDetalhe();
}
function t3ShowDetalhe(){
  const rows=T3._clientRows||[];
  if(T3.cliIdx==null || !rows[T3.cliIdx]){ t3Show('t3DetalheBox',false); return; }
  t3Show('t3DetalheBox',true);
  document.getElementById('t3Detalhe').innerHTML=mmClientCard(rows[T3.cliIdx]);
}

function paint(){
  const R=rowsFor(), n=R.length;
  if(TAB==='visao'){
    kpis(R);
    const Re=rowsFor('etapa');
    const ev=ETAPAS.map(e=>cnt(Re,r=>r.etapa===e));
    bar('cEtapa','etapa',ETAPAS,ev,ETAPAS.map((_,i)=>corEtapa(i)),{total:Re.length});
    const mx=Math.max(...ev);
    document.getElementById('nEtapa').textContent=Re.length?`${pct(mx,Re.length)} dos cadastros estão em “${ETAPAS[ev.indexOf(mx)]}”. Chegaram à aprovação com Pix ${nf(cnt(Re,r=>r.etapa==='Pasta Aprovada com Pix'))} cadastros.`:'Sem cadastros.';

    const Rm=rowsFor(['mes','etapa']), meses=uniq('mes');
    const selM=ST.mes, selE=ST.etapa;
    build('cMes',{type:'bar',data:{labels:meses,datasets:ETAPAS.map((e,i)=>({label:e,
      backgroundColor:meses.map(m=>fade(corEtapa(i),(!selM.length||selM.includes(m))&&(!selE.length||selE.includes(e)))),
      borderColor:'#fff',borderWidth:2,data:meses.map(m=>cnt(Rm,r=>r.mes===m&&r.etapa===e))}))},
      options:{plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true,...gn},y:{stacked:true,...gx}}}},
      (i,d,add)=>{pushHist(); const m=meses[i],e=ETAPAS[d];
        ST.mes=(ST.mes.length===1&&ST.mes[0]===m)?[]:[m]; ST.etapa=(ST.etapa.length===1&&ST.etapa[0]===e)?[]:[e]; apply();});
    document.getElementById('nMes').textContent='Safras mensais empilhadas pela etapa em que o cadastro está hoje. Clique num segmento para filtrar mês e etapa juntos.';

    const Rd=rowsFor('data'), days=[...new Set(DATA.map(r=>r.data).filter(Boolean))].sort();
    const ax=[]; for(let d=new Date(days[0]+'T00:00:00'),z=new Date(days[days.length-1]+'T00:00:00');d<=z;d.setDate(d.getDate()+1))ax.push(d.toISOString().slice(0,10));
    const cd=byKey(Rd,'data'), selD=ST.data;
    build('cTempo',{type:'line',data:{labels:ax.map(d=>d.slice(8,10)+'/'+d.slice(5,7)),
      datasets:[{data:ax.map(d=>cd[d]||0),borderColor:'#2a78d6',backgroundColor:'rgba(42,120,214,.12)',borderWidth:2,
        fill:true,tension:.25,pointRadius:ax.map(d=>cd[d]?(selD.includes(d)?7:4):0),
        pointBackgroundColor:ax.map(d=>selD.length&&!selD.includes(d)?'#b9c6dd':'#2a78d6'),
        pointBorderColor:'#fff',pointBorderWidth:2}]},
      options:{plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,callbacks:{label:c=>nf(c.raw)+' cadastros'}}},
        interaction:{mode:'index',intersect:false},scales:{y:{beginAtZero:true,...gx},x:{...gn,ticks:{maxTicksLimit:14}}}}},
      (i,d,add)=>{ if(cd[ax[i]]) toggle('data',ax[i],add); });
    const pv=Math.max(0,...ax.map(d=>cd[d]||0)), pd=ax.find(d=>(cd[d]||0)===pv);
    document.getElementById('nTempo').textContent=Rd.length?`Pico de ${nf(pv)} cadastros em ${pd?pd.slice(8,10)+'/'+pd.slice(5,7):'—'}. Clique num ponto para isolar o dia.`:'Sem cadastros.';
  }

  if(TAB==='pagto'){
    const pgPlano=PLANOTAGS.filter(t=>ALLTAGS.includes(t));
    const Rt=rowsFor('tag');
    bar('cPgto','tag',pgPlano,pgPlano.map(t=>cnt(Rt,r=>has(r,t))),'#2a78d6',{total:Rt.length});

    const pg=PGTO.filter(t=>ALLTAGS.includes(t));
    const Rs=rowsFor(['etapa','tag']);
    const cols=pg.concat(['Sem tag de pagamento']);
    build('cStack',{type:'bar',data:{labels:ETAPAS,datasets:cols.map((t,i)=>({label:t,
      backgroundColor:i<pg.length?SER[i%8]:'#b9bcc8',borderColor:'#fff',borderWidth:2,
      data:ETAPAS.map(e=>{const s=Rs.filter(r=>r.etapa===e);
        return t==='Sem tag de pagamento'?s.filter(r=>!pg.some(p=>has(r,p))).length:s.filter(r=>has(r,t)).length;})}))},
      options:{indexAxis:'y',plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true,...gx,grace:'8%'},y:{stacked:true,...gn}}}},
      (i,d,add)=>{pushHist(); const e=ETAPAS[i];
        ST.etapa=(ST.etapa.length===1&&ST.etapa[0]===e)?[]:[e];
        if(d<pg.length){const t=pg[d]; ST.tag=(ST.tag.length===1&&ST.tag[0]===t)?[]:[t];} apply();});
    document.getElementById('nStack').textContent='Barras somam marcações, não cadastros — um cadastro pode ter mais de uma tag financeira.';

    build('cPix',{type:'bar',data:{labels:ETAPAS,datasets:[
      {label:'PIX confirmado',backgroundColor:'#1baf7a',borderColor:'#fff',borderWidth:2,data:ETAPAS.map(e=>cnt(Rs,r=>r.etapa===e&&has(r,'PIX')))},
      {label:'FALTA PIX',backgroundColor:'#eb6834',borderColor:'#fff',borderWidth:2,data:ETAPAS.map(e=>cnt(Rs,r=>r.etapa===e&&has(r,'FALTA PIX')))}]},
      options:{plugins:{legend:{position:'bottom'}},scales:{x:{...gn,ticks:{maxRotation:22,autoSkip:false,callback:function(v){const l=this.getLabelForValue(v);return shortT(l,18);}}},y:gx}}},
      (i,d,add)=>{pushHist(); const e=ETAPAS[i],t=d===0?'PIX':'FALTA PIX';
        ST.etapa=(ST.etapa.length===1&&ST.etapa[0]===e)?[]:[e]; ST.tag=(ST.tag.length===1&&ST.tag[0]===t)?[]:[t]; apply();});
    const pend=ETAPAS.map(e=>cnt(Rs,r=>r.etapa===e&&has(r,'FALTA PIX')));
    document.getElementById('nPix').textContent=`A maior concentração de pendências está em “${ETAPAS[pend.indexOf(Math.max(...pend))]}”, com ${nf(Math.max(...pend))} cadastros.`;
  }

  if(TAB==='tags'){
    const Rt=rowsFor('tag');
    const tv=ALLTAGS.map(t=>cnt(Rt,r=>has(r,t)));
    const idx=ALLTAGS.map((t,i)=>i).sort((a,b)=>tv[b]-tv[a]);
    const tl=idx.map(i=>ALLTAGS[i]), tvv=idx.map(i=>tv[i]);
    bar('cTags','tag',tl,tvv,tl.map(t=>CATCOLOR[cat(t)]||'#4a3aa7'),{total:Rt.length});
    document.getElementById('lgCat').innerHTML=[...new Set(tl.map(cat))].map(c=>`<span><i style="background:${CATCOLOR[c]||'#4a3aa7'}"></i>${c}</span>`).join('');

    const Rc=rowsFor('categoria');
    const cc={}; Rc.forEach(r=>{const s=new Set(r.tags_list.map(cat)); s.forEach(c=>cc[c]=(cc[c]||0)+1);});
    const ck=Object.keys(cc).sort((a,b)=>cc[b]-cc[a]);
    bar('cCat','categoria',ck,ck.map(k=>cc[k]),ck.map(k=>CATCOLOR[k]||'#4a3aa7'),{total:Rc.length});
    document.getElementById('nCat').textContent='Cada cadastro conta uma vez por categoria, mesmo com duas tags da mesma família.';

    const Rh=rowsFor(['etapa','tag']);
    heat('tHeat',ETAPAS,{dim:'etapa',label:'Etapa'},tl,
      rl=>cnt(Rh,r=>r.etapa===rl),(rl,c)=>cnt(Rh,r=>r.etapa===rl&&has(r,c)));

    const head=['Tag','Categoria',{t:'Cadastros (recorte)',num:1},{t:'% do recorte',num:1},{t:'Cadastros (base)',num:1}];
    tbl('tDim',head,tl.map((t,i)=>[{v:t,h:`<span class="tg">${esc(t)}</span>`},cat(t),{v:tvv[i]},
      {v:Rt.length?100*tvv[i]/Rt.length:0,h:pct(tvv[i],Rt.length)},{v:cnt(DATA,r=>has(r,t))}]),{k:2,d:-1});
  }

  if(TAB==='times'){
    const Rm=rowsFor('marca'), mk=topN(byKey(Rm,'marca'),9999);
    fitBox('innerImob',mk.length);
    document.getElementById('boxImob').style.display='';
    bar('cImob','marca',mk.map(x=>x[0]),mk.map(x=>x[1]),'#2a78d6',{total:Rm.length,short:l=>shortT(l,32)});
    document.getElementById('nImob').textContent=mk.length?`${nf(mk.length)} lançadoras no recorte; clique numa para ver os gerentes dela.`:'';

    const expGer=document.querySelector('.chart-export[data-chart="cGer"]');
    const Rg=rowsFor('equipe'), gk=topN(byKey(Rg,'equipe'),9999);
    const umaMarca=ST.marca.length===1;
    document.getElementById('boxGer').style.display=''; if(expGer) expGer.style.display='';
    fitBox('innerGer',gk.length);
    bar('cGer','equipe',gk.map(x=>x[0]),gk.map(x=>x[1]),'#1baf7a',{total:Rg.length,short:umaMarca?gerLabel:(l=>shortT(l,32))});
    document.getElementById('nGer').textContent = gk.length
      ? (umaMarca ? `${nf(gk.length)} equipe(s)/gerente(s) em ${ST.marca[0]}; clique numa para ver os corretores.`
                  : `${nf(gk.length)} equipe(s)/gerente(s) no total; clique numa imobiliária acima para restringir, ou clique direto numa equipe para ver os corretores dela.`)
      : 'Nenhum gerente no recorte atual.';

    const expCorr=document.querySelector('.chart-export[data-chart="cCorr"]');
    const Rc=rowsFor('responsavel'), ck=topN(byKey(Rc,'responsavel'),9999);
    const umaEquipe=ST.equipe.length===1;
    document.getElementById('boxCorr').style.display=''; if(expCorr) expCorr.style.display='';
    fitBox('innerCorr',ck.length);
    bar('cCorr','responsavel',ck.map(x=>x[0]),ck.map(x=>x[1]),'#eda100',{total:Rc.length,short:l=>shortT(l,26)});
    document.getElementById('nCorr').textContent = ck.length
      ? (umaEquipe ? `${nf(ck.length)} corretor(es) em ${gerLabel(ST.equipe[0])}.`
                   : `${nf(ck.length)} corretor(es) no total; clique num gerente acima para restringir, ou clique direto num corretor para filtrar o painel.`)
      : 'Nenhum corretor no recorte atual.';

    const Ro=rowsFor('origem'), og=topN(byKey(Ro,'origem'),12);
    bar('cOrigem','origem',og.map(x=>x[0]),og.map(x=>x[1]),'#1c5cab',{total:Ro.length,short:l=>shortT(l,40)});
    document.getElementById('nOrigem').textContent=og.length?`“${og[0][0]}” responde por ${pct(og[0][1],Ro.length)} dos cadastros do recorte.`:'';
  }

  if(TAB==='times2') paintMindMap();
  if(TAB==='times3') paintTimes3();

  if(TAB==='gerente'){
    const gate=document.getElementById('gerGate');
    const rotulo=GER?gerLabel(GER):'';
    const setExport=(id,name,title)=>{ const tb=document.querySelector('.tbar[data-table="'+id+'"]');
      if(tb){ tb.dataset.name=name+'_'+slug(rotulo); tb.dataset.title=title+' — '+rotulo; } };

    if(!GER){
      gate.style.display='none';
      document.getElementById('nGerSel').textContent='Selecione seu nome acima para ver os dados do seu time.';
    } else {
      gate.style.display='';
      const Rg=rowsFor('equipe').filter(r=>r.equipe===GER);
      document.getElementById('nGerSel').textContent = Rg.length
        ? `Time de ${rotulo}.`
        : `Time de ${rotulo} — nenhum cadastro no recorte atual (os filtros ativos no topo podem estar excluindo todos).`;

      /* --- 3. visão geral do time --- */
      const K=[['Cadastros do time',nf(Rg.length),pct(Rg.length,LEADS_TOTAL)+' da base toda',''],
        ['Corretores no time',nf(new Set(Rg.map(r=>r.responsavel)).size),'',''],
        ['Pix confirmado',nf(cnt(Rg,r=>has(r,'PIX'))),pct(cnt(Rg,r=>has(r,'PIX')),Rg.length),'k-good'],
        ['Falta Pix',nf(cnt(Rg,r=>has(r,'FALTA PIX'))),pct(cnt(Rg,r=>has(r,'FALTA PIX')),Rg.length),'k-warn'],
        ['Pasta Aprovada com Pix',nf(cnt(Rg,r=>r.etapa==='Pasta Aprovada com Pix')),pctFmt(convFn(Rg))+' de conversão','k-good']];
      document.getElementById('gerKpis').innerHTML=K.map(([l,v,s,k])=>
        `<div class="kpi ${k}"><div class="lb">${l}</div><div class="vl">${v}</div><div class="sb">${s}</div></div>`).join('');

      /* --- 4. corretores vinculados --- */
      const GT=gerTable(Rg).sort((a,b)=>b.leads-a.leads||a.nome.localeCompare(b.nome,'pt-BR'));
      fitBox('innerGerCorr',GT.length);
      document.getElementById('boxGerCorr').style.display='';
      bar('cGerCorr','responsavel',GT.map(o=>o.nome),GT.map(o=>o.leads),'#2a78d6',{total:Rg.length,short:l=>shortT(l,26)});
      document.getElementById('nGerCorr').textContent=GT.length?`${nf(GT.length)} corretor(es) no time.`:'Nenhum corretor no time.';

      const headCorr=[{t:'#',num:0},'Corretor',{t:'Cadastros',num:1},{t:'Aprovadas c/ Pix',num:1},{t:'Validadas',num:1},
        {t:'Pix confirmado',num:1},{t:'Falta Pix',num:1},{t:'Conversão',num:1},{t:'Renda mediana',num:1}];
      tbl('tGerCorr',headCorr,GT.map((o,i)=>[{v:i+1,h:(i+1)+'º'},
        {v:o.nome,h:`<span data-ger-corr="${esc(o.nome)}" style="cursor:pointer">${esc(o.nome)}</span>`},
        {v:o.leads},{v:o.aprov},{v:o.valid},{v:o.pix},{v:o.falta},
        {v:o.conv,h:pctFmt(o.conv)},{v:o.renda,h:o.renda?money(o.renda):'—'}]),{k:2,d:-1});
      document.querySelectorAll('#tGerCorr [data-ger-corr]').forEach(el=>el.onclick=e=>{
        e.stopPropagation(); toggle('responsavel',el.dataset.gerCorr,e.ctrlKey||e.metaKey); });

      const elig=GT.filter(o=>o.leads>=3), mediaTime=convFn(Rg);
      if(!elig.length){
        document.getElementById('nGerCorrTbl').textContent='Nenhum corretor do time tem 3 ou mais cadastros ainda para comparar conversão.';
      } else {
        const asc=[...elig].sort((a,b)=>a.conv-b.conv), pior=asc[0], melhor=asc[asc.length-1];
        document.getElementById('nGerCorrTbl').textContent = melhor.nome===pior.nome
          ? `${melhor.nome} é o único corretor do time com 3+ cadastros, com ${pctFmt(melhor.conv)} de conversão.`
          : `${melhor.nome} lidera o time com ${pctFmt(melhor.conv)} de conversão; ${pior.nome} está com ${pctFmt(pior.conv)}, abaixo da média do time (${pctFmt(mediaTime)}) — pode ser o próximo a receber apoio.`;
      }

      /* --- 6. pontos de melhoria --- */
      const semPix=Rg.filter(r=>has(r,'FALTA PIX'));
      const semDoc=Rg.filter(r=>r.etapa!=='Cadastro Cliente' && !temContratoTag(r));
      const semComercial=Rg.filter(r=>!fichaComercialCompleta(r));
      const estagnados=Rg.filter(estagnado);
      const faltas=semComercial.length?CAMPOS_COMERCIAIS.map(c=>({l:c.l,n:cnt(Rg,r=>!c.ok(r))})).sort((a,b)=>b.n-a.n):[];
      const Agr=[
        ['Falta de Pix',semPix.length,`${pct(semPix.length,Rg.length)} do time com a tag FALTA PIX.`],
        ['Documentos',semDoc.length,'Cadastros fora de "Cadastro Cliente" sem nenhuma tag da categoria CONTRATO (proxy — não há campo direto de documento pendente).'],
        ['Conclusão de cadastro',semComercial.length,`Falta finalidade, valor de venda, tag de plano ou tag de Pix.${faltas.length&&faltas[0].n?` O que mais falta: ${faltas[0].l} (${nf(faltas[0].n)}).`:''}`],
        ['Estagnados',estagnados.length,`${nf(estagnados.length)} cadastro(s) com 14+ dias sem sair de uma etapa não concluída.`]];
      document.getElementById('gerAlerts').innerHTML=Agr.map(([t,v,d])=>
        `<div class="card alert"><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3);font-weight:600">${t}</div>
         <div style="font-size:26px;font-weight:700;margin:5px 0;font-variant-numeric:tabular-nums">${nf(v)}</div><div>${d}</div></div>`).join('');

      const corretores=[...new Set(Rg.map(r=>r.responsavel))];
      const atencao=corretores.map(nome=>{
        const rs=Rg.filter(r=>r.responsavel===nome);
        const fp=cnt(rs,r=>has(r,'FALTA PIX')), doc=cnt(rs,r=>r.etapa!=='Cadastro Cliente'&&!temContratoTag(r)),
          inc=cnt(rs,r=>!fichaComercialCompleta(r)), est=cnt(rs,estagnado),
          convCorr=convFn(rs), sinal=(rs.length>=3&&convCorr<mediaTime)?'Abaixo da média do time':'';
        return {nome,fp,doc,inc,est,total:fp+doc+inc+est,convCorr,sinal};
      }).sort((a,b)=>b.total-a.total||a.nome.localeCompare(b.nome,'pt-BR'));
      const headAt=['Corretor',{t:'Falta Pix',num:1},{t:'Documentos',num:1},{t:'Cadastro incompleto',num:1},{t:'Estagnados',num:1},
        {t:'Total de pendências',num:1},{t:'Conversão do corretor',num:1},{t:'Conversão do time',num:1},'Sinal'];
      tbl('tGerAtencao',headAt,atencao.map(o=>[o.nome,{v:o.fp},{v:o.doc},{v:o.inc},{v:o.est},{v:o.total},
        {v:o.convCorr,h:pctFmt(o.convCorr)},{v:mediaTime,h:pctFmt(mediaTime)},o.sinal]),{k:5,d:-1});
      document.getElementById('nGerAtencao').textContent=corretores.length
        ?'Ordenado pelo total de pendências — o topo da lista é quem provavelmente precisa de mais apoio agora.'
        :'Nenhum corretor no time.';

      const acaoUniao=[...new Set([...semPix,...semDoc,...semComercial,...estagnados])];
      const headAcao=[{t:'Nº',num:1},'Cadastro','Telefone','Etapa','Motivo',{t:'Dias desde o cadastro',num:1},'Responsável','Equipe'];
      tbl('tGerAcao',headAcao,acaoUniao.map(r=>{
        const m=[]; if(semPix.includes(r))m.push('Falta Pix'); if(semDoc.includes(r))m.push('Documentos pendentes');
        if(semComercial.includes(r))m.push('Ficha comercial incompleta'); if(estagnados.includes(r))m.push('Estagnado');
        return [{v:+r.numero},r.nome,r.telefone,r.etapa,m.join(' · '),{v:r.dias_cadastro||0},r.responsavel,r.equipe];
      }),{k:5,d:-1});
      document.getElementById('nGerAcao').textContent=nf(acaoUniao.length)+' cadastro(s) do time com pelo menos um ponto de melhoria.';

      setExport('tGerCorr','desempenho_por_corretor','Desempenho por corretor');
      setExport('tGerAtencao','pontos_de_melhoria','Pontos de melhoria por corretor');
      setExport('tGerAcao','cadastros_para_acao','Cadastros que exigem ação');
    }
  }

  if(TAB==='previsao'){
    /* Não usa `rowsFor()`/`R` de propósito — a meta é acumulada do funil inteiro (sem período),
       comparar com um recorte filtrado do topo (ex.: só um mês) daria uma leitura incorreta.
       Ver nota em METAS (a1.js). */
    const withMeta=METAS.filter(m=>m.meta>0);
    const batendo=cnt(METAEXEC,m=>m.meta>0&&m.exec>=m.meta);
    const abaixo=cnt(METAEXEC,m=>m.meta>0&&m.exec<m.meta);
    const K=[
      ['Meta total (acumulada)',nf(METATOTAL),nf(METAS.length)+' linhas na planilha de previsão',''],
      ['Execução mapeada',nf(METAEXECTOTAL),pct(METAEXECTOTAL,METATOTAL)+' da meta total','k-good'],
      ['Equipes na meta ou acima',nf(batendo),pct(batendo,withMeta.length)+' das equipes com meta','k-good'],
      ['Equipes abaixo da meta',nf(abaixo),pct(abaixo,withMeta.length)+' das equipes com meta','k-warn'],
      ['Cadastros fora da previsão',nf(METAFORA),pct(METAFORA,DATA.length)+' da base toda','k-crit']
    ];
    kpiCards('prevKpis',K);

    build('cPrevImob',{type:'bar',data:{labels:METAIMOBS.map(x=>x.imob),
      datasets:[
        {label:'Meta',data:METAIMOBS.map(x=>x.meta),backgroundColor:'#b9c6dd',borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2},
        {label:'Execução',data:METAIMOBS.map(x=>x.exec),backgroundColor:METAIMOBS.map(x=>x.exec>=x.meta?'#1baf7a':'#eb6834'),borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}
      ]},
      options:{plugins:{legend:{position:'bottom'}},scales:{x:gn,y:{...gx,grace:'12%'}}}});
    const piores=METAIMOBS.filter(x=>x.meta>0).sort((a,b)=>(a.exec/a.meta)-(b.exec/b.meta));
    document.getElementById('nPrevImob').textContent = piores.length
      ? `${piores[0].imob} é quem está proporcionalmente mais distante da meta: ${nf(piores[0].exec)} de ${nf(piores[0].meta)} (${pct(piores[0].exec,piores[0].meta)}).`
      : '';

    const headPrev=['Imobiliária','Equipe','Gerente (previsão)',{t:'Meta',num:1},{t:'Execução',num:1},{t:'Diferença',num:1},{t:'% atingido',num:1}];
    tbl('tPrev',headPrev,METAEXEC.map(m=>{
      const diff=m.exec-m.meta;
      return [m.imob, m.equipe||'(imobiliária inteira)', m.gerente||'—', {v:m.meta},{v:m.exec},
        {v:diff,h:`<span style="color:${diff>=0?'var(--good)':'var(--crit)'};font-weight:600">${diff>=0?'+':''}${nf(diff)}</span>`},
        {v:m.meta?100*m.exec/m.meta:(m.exec?999:0), h:m.meta?pct(m.exec,m.meta):(m.exec?'sem meta':'—')}];
    }),{k:5,d:1});
    document.getElementById('nPrev').textContent=`${nf(METAEXEC.length)} linha(s) da planilha de previsão (meta acumulada do funil inteiro, fornecida pelo usuário em 09/09/2026). Ordenado pela maior diferença (execução − meta, piores primeiro); clique no cabeçalho pra reordenar.`;

    const foraRows=METAUNMAPPED.map(u=>[u.imob,u.equipe,{v:u.n}]);
    if(META_MERCADO_N) foraRows.push(['Mercado','(fora das 6 imobiliárias parceiras)',{v:META_MERCADO_N}]);
    const headFora=['Imobiliária','Equipe (como está no CRM)',{t:'Cadastros',num:1}];
    tbl('tPrevFora',headFora,foraRows,{k:2,d:-1});
    document.getElementById('nPrevFora').textContent=foraRows.length
      ? `${nf(METAFORA)} cadastro(s) sem meta correspondente — não entram em "Execução mapeada" acima.`
      : 'Todo cadastro da base tem uma meta correspondente.';
  }

  if(TAB==='previsao2'){
    /* Continua sem usar rowsFor()/R pros filtros de etapa/mês/etc (mesmo motivo de 'previsao'
       acima: meta acumulada do funil inteiro, um recorte por período daria leitura errada). O
       filtro "Imobiliária" (`tipo_imob`) é a exceção deliberada (11/09/2026, a pedido do usuário):
       ele não recorta por período, só escolhe qual metade do catálogo da SIENA olhar (Lançadora
       tem 6 entradas com `keys:null`, Mercado tem as ~29 com `keys` — toda imobiliária de Mercado
       sem meta correspondente é, por construção, sempre de Mercado, nunca de Lançadora). */
    const tSel=ST.tipo_imob, soLanc=tSel.length===1&&tSel[0]==='Lançadora', soMerc=tSel.length===1&&tSel[0]==='Mercado';
    const SV=soLanc?SIENA2EXEC.filter(s=>s.keys===null):soMerc?SIENA2EXEC.filter(s=>s.keys!==null):SIENA2EXEC;
    const svTotal=SV.reduce((a,s)=>a+s.meta,0), svExecTotal=SV.reduce((a,s)=>a+s.exec,0);
    const svFora=soLanc?0:SIENA2FORA;
    const svBaseN=soLanc?METABASE.filter(r=>r.tipo_imob==='Lançadora').length:soMerc?METABASE.filter(r=>r.tipo_imob==='Mercado').length:METABASE.length;

    const comMeta2=SV.filter(s=>s.meta>0);
    const batendo2=cnt(SV,s=>s.meta>0&&s.exec>=s.meta);
    const abaixo2=cnt(SV,s=>s.meta>0&&s.exec<s.meta);
    const K2=[
      ['Meta total (imobiliárias)',nf(svTotal),nf(SV.length)+' imobiliária(s) no recorte',''],
      ['Execução mapeada',nf(svExecTotal),svTotal?pct(svExecTotal,svTotal)+' da meta total':'—','k-good'],
      ['Imobiliárias na meta ou acima',nf(batendo2),comMeta2.length?pct(batendo2,comMeta2.length)+' das imobiliárias com meta':'—','k-good'],
      ['Imobiliárias abaixo da meta',nf(abaixo2),comMeta2.length?pct(abaixo2,comMeta2.length)+' das imobiliárias com meta':'—','k-warn'],
      ['Cadastros fora da previsão',nf(svFora),pct(svFora,svBaseN)+' do recorte','k-crit']
    ];
    kpiCards('prev2Kpis',K2);

    const ratio=s=>s.meta?s.exec/s.meta:(s.exec?999:0);
    const ordenado2=[...SV].sort((a,b)=>ratio(b)-ratio(a));
    fitBox('innerPrev2Imob',ordenado2.length);
    build('cPrev2Imob',{type:'bar',data:{labels:ordenado2.map(x=>x.imob),
      datasets:[
        {label:'Meta',data:ordenado2.map(x=>x.meta),backgroundColor:'#b9c6dd',borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2},
        {label:'Execução',data:ordenado2.map(x=>x.exec),backgroundColor:ordenado2.map(x=>x.exec>=x.meta?'#1baf7a':'#eb6834'),borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}
      ]},
      options:{indexAxis:'y',plugins:{legend:{position:'bottom'}},scales:{x:{...gx,grace:'12%'},y:gn}}});
    const perto=[...comMeta2].sort((a,b)=>Math.abs(1-ratio(a))-Math.abs(1-ratio(b)))[0];
    document.getElementById('nPrev2Imob').textContent = perto
      ? `${perto.imob} é quem está mais perto da expectativa: ${nf(perto.exec)} de ${nf(perto.meta)} (${pct(perto.exec,perto.meta)}).`
      : 'Nenhuma imobiliária no recorte atual.';

    const headPrev2=['Imobiliária','Grupo',{t:'Meta',num:1},{t:'Execução',num:1},{t:'Diferença',num:1},{t:'% atingido',num:1}];
    tbl('tPrev2',headPrev2,SV.map(s=>{
      const diff=s.exec-s.meta;
      return [s.imob, s.keys===null?'Lançadora':'Mercado', {v:s.meta},{v:s.exec},
        {v:diff,h:`<span style="color:${diff>=0?'var(--good)':'var(--crit)'};font-weight:600">${diff>=0?'+':''}${nf(diff)}</span>`},
        {v:s.meta?100*s.exec/s.meta:(s.exec?999:0), h:s.meta?pct(s.exec,s.meta):(s.exec?'sem meta':'—')}];
    }),{k:5,d:-1});
    document.getElementById('nPrev2').textContent=`${nf(SV.length)} imobiliária(s) da planilha SIENA no recorte (meta acumulada do funil inteiro, fornecida pelo usuário em 11/09/2026). Ordenado pelo maior % atingido; clique no cabeçalho pra reordenar.`;

    const foraRows2=soLanc?[]:SIENA2UNMAPPED.map(u=>[u.equipe,{v:u.n}]);
    const headFora2=['Equipe (como está no CRM, sem meta correspondente)',{t:'Cadastros',num:1}];
    tbl('tPrev2Fora',headFora2,foraRows2,{k:1,d:-1});
    document.getElementById('nPrev2Fora').textContent = soLanc
      ? 'Filtro "Lançadora" ativo — cadastros fora da previsão são sempre do Mercado.'
      : foraRows2.length
        ? `${nf(svFora)} cadastro(s) do Mercado sem imobiliária correspondente na planilha SIENA — não entram em "Execução mapeada" acima.`
        : 'Todo cadastro do Mercado tem uma imobiliária correspondente na planilha.';
  }

  if(TAB==='superMeta'){
    /* Não usa rowsFor()/R nem os filtros do topo — a meta é mensal (não acumulada do funil
       inteiro) e cada mês da campanha (Set-Dez/2026) precisa comparar contra o MESMO recorte de
       tempo (r.mes), então o período é escolhido pelo seletor próprio desta aba (SM_PERIODO),
       não pelo filtro "Mês" do topo (que serve pra outro recorte, o do cadastro dentro do
       funil inteiro). METABASE já exclui Desistente, mesmo critério de "execução" da aba
       Previsão x Execução (SIENA2EXEC): todo cadastro em qualquer etapa conta. */
    const pIdx=SM_PERIODO;
    const mesesAlvo = pIdx==='campanha' ? SUPERMETA_MESES.map(m=>m.mes) : [SUPERMETA_MESES[pIdx].mes];
    const rotuloPeriodo = pIdx==='campanha' ? 'campanha inteira (Set–Dez/2026)' : SUPERMETA_MESES[pIdx].nome+'/2026';
    const SM = SUPERMETA.map(s=>{
      const meta = pIdx==='campanha' ? s.campMeta : s.meses[pIdx].meta;
      const superMeta = pIdx==='campanha' ? s.campSuperMeta : s.meses[pIdx].superMeta;
      const exec = METABASE.filter(r=>mesesAlvo.includes(r.mes) && superMetaRowMatches(r,s)).length;
      return Object.assign({},s,{meta,superMeta,exec});
    });
    const smTotalMeta=SM.reduce((a,s)=>a+s.meta,0), smTotalSuper=SM.reduce((a,s)=>a+s.superMeta,0), smTotalExec=SM.reduce((a,s)=>a+s.exec,0);
    const comMetaSm=SM.filter(s=>s.superMeta>0);
    const naSuper=cnt(SM,s=>s.superMeta>0&&s.exec>=s.superMeta);
    const naMeta=cnt(SM,s=>s.meta>0&&s.exec>=s.meta&&s.exec<s.superMeta);
    const abaixoSm=cnt(SM,s=>s.meta>0&&s.exec<s.meta);
    const smForaRows=(()=>{
      const by={};
      METABASE.filter(r=>r.marca==='Mercado'&&mesesAlvo.includes(r.mes)&&!superMetaMatchMercado(r)).forEach(r=>{
        const k=(r.equipe||'').split(/\s*-\s*/)[0].trim()||'(sem equipe)';
        (by[k]=by[k]||[]).push(r);
      });
      return Object.keys(by).map(k=>({equipe:k,n:by[k].length})).sort((a,b)=>b.n-a.n);
    })();
    const smFora=smForaRows.reduce((a,u)=>a+u.n,0);

    const K3=[
      ['Meta total (imobiliárias)',nf(smTotalMeta),`Super Meta: ${nf(smTotalSuper)} · ${rotuloPeriodo}`,''],
      ['Execução',nf(smTotalExec),smTotalMeta?pct(smTotalExec,smTotalMeta)+' da meta total':'—','k-good'],
      ['Imobiliárias na Super Meta',nf(naSuper),comMetaSm.length?pct(naSuper,comMetaSm.length)+' das imobiliárias com meta':'—','k-good'],
      ['Imobiliárias na Meta (abaixo da Super Meta)',nf(naMeta),comMetaSm.length?pct(naMeta,comMetaSm.length)+' das imobiliárias com meta':'—',''],
      ['Imobiliárias abaixo da Meta',nf(abaixoSm),comMetaSm.length?pct(abaixoSm,comMetaSm.length)+' das imobiliárias com meta':'—','k-warn'],
      ['Cadastros fora da Super Meta',nf(smFora),'','k-crit']
    ];
    kpiCards('smKpis',K3);

    const ratioSm=s=>s.superMeta?s.exec/s.superMeta:(s.exec?999:0);
    const ordenadoSm=[...SM].sort((a,b)=>ratioSm(b)-ratioSm(a));
    fitBox('innerSmImob',ordenadoSm.length);
    const corExecSm=s=> s.superMeta>0&&s.exec>=s.superMeta ? '#1baf7a' : s.meta>0&&s.exec>=s.meta ? '#2a78d6' : '#eb6834';
    build('cSmImob',{type:'bar',data:{labels:ordenadoSm.map(x=>x.imob),
      datasets:[
        {label:'Super Meta',data:ordenadoSm.map(x=>x.superMeta),backgroundColor:'#b9c6dd',borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2},
        {label:'Execução',data:ordenadoSm.map(x=>x.exec),backgroundColor:ordenadoSm.map(corExecSm),borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}
      ]},
      options:{indexAxis:'y',plugins:{legend:{position:'bottom'}},scales:{x:{...gx,grace:'12%'},y:gn}}});
    const pertoSm=[...comMetaSm].sort((a,b)=>Math.abs(1-ratioSm(a))-Math.abs(1-ratioSm(b)))[0];
    document.getElementById('nSmImob').textContent = pertoSm
      ? `${pertoSm.imob} é quem está mais perto da Super Meta: ${nf(pertoSm.exec)} de ${nf(pertoSm.superMeta)} (${pct(pertoSm.exec,pertoSm.superMeta)}).`
      : 'Nenhuma imobiliária com meta no período selecionado.';

    const headSm=[{t:'Nº',num:1},'Imobiliária','Grupo',{t:'Base Zero',num:1},{t:'Meta',num:1},{t:'Super Meta',num:1},{t:'Execução',num:1},{t:'Nível',num:1}];
    tbl('tSm',headSm,SM.map(s=>{
      const nivel = s.superMeta>0&&s.exec>=s.superMeta
        ? {v:3,h:'<span style="color:var(--good);font-weight:600">Super Meta ✓</span>'}
        : s.meta>0&&s.exec>=s.meta
          ? {v:2,h:'<span style="color:#2a78d6;font-weight:600">Meta ✓</span>'}
          : s.meta>0||s.superMeta>0
            ? {v:1,h:'<span style="color:var(--crit);font-weight:600">Abaixo da meta</span>'}
            : {v:0,h:'<span style="opacity:.6">Sem meta no período</span>'};
      return [{v:s.num},s.imob, s.keys===null?'Lançadora':'Mercado', {v:s.baseZero},{v:s.meta},{v:s.superMeta},{v:s.exec}, nivel];
    }),{k:7,d:-1});
    document.getElementById('nSm').textContent=`${nf(SM.length)} imobiliária(s) da planilha Super Meta — período: ${rotuloPeriodo}. Ordenado pelo nível atingido (Super Meta primeiro); clique no cabeçalho pra reordenar.`;

    const headSmFora=['Equipe (como está no CRM, sem meta correspondente)',{t:'Cadastros',num:1}];
    tbl('tSmFora',headSmFora,smForaRows.map(u=>[u.equipe,{v:u.n}]),{k:1,d:-1});
    document.getElementById('nSmFora').textContent = smForaRows.length
      ? `${nf(smFora)} cadastro(s) do Mercado sem imobiliária correspondente na planilha Super Meta, no período selecionado.`
      : 'Todo cadastro do Mercado, no período selecionado, tem uma imobiliária correspondente na planilha.';
  }

  if(TAB==='perfil'){
    const Rf=rowsFor('faixa');
    const fc={}; Rf.forEach(r=>{const f=faixa(r.valor_renda); fc[f]=(fc[f]||0)+1;});
    bar('cRenda','faixa',FAIXAS,FAIXAS.map(f=>fc[f]||0),FAIXAS.map(f=>f===FAIXAS[0]?'#b9bcc8':'#2a78d6'),
      {total:Rf.length,vertical:true});
    const rd=R.map(r=>r.valor_renda).filter(v=>v);
    document.getElementById('nRenda').textContent=rd.length?`Mediana ${money(median(rd))} contra média ${money(Math.round(rd.reduce((a,b)=>a+b,0)/rd.length))}. ${pct(n-rd.length,n)} do recorte não tem renda preenchida.`:'Nenhuma renda informada no recorte.';
    const fi=byKey(R,'finalidade'), fk=Object.keys(fi).sort((a,b)=>fi[b]-fi[a]);
    bar('cFin','__none',fk,fk.map(k=>fi[k]),fk.map((k,i)=>SER[i%8]),{total:n});
    document.getElementById('nFin').textContent='Declaração feita no momento do cadastro.';
    const Q=[['Com e-mail válido',cnt(R,r=>r.sem_email==='Não')],['Com telefone',cnt(R,r=>!!r.telefone)],
      ['Com renda informada',cnt(R,r=>!!r.valor_renda)],['Com ao menos 1 tag',cnt(R,r=>r.tags_list.length>0)],
      ['Com plano de pagamento',cnt(R,r=>!!r.plano_pagamento)],['Com finalidade declarada',cnt(R,r=>r.finalidade&&r.finalidade!=='-')]];
    bar('cQual','__none',Q.map(x=>x[0]),Q.map(x=>x[1]),'#1c5cab',{total:n});
    document.getElementById('nQual').textContent=`Sobre ${nf(n)} cadastros do recorte. Campos em branco travam qualquer automação de contato ou de crédito.`;
  }

  if(TAB==='alertas'){
    // pedido do usuário (08/09/2026): aba só enxerga cadastros ainda em tramitação inicial —
    // Pasta Validada pendente de Pix, Pasta Aprovada com Pix e Desistente não são "ponto de atenção".
    const Ra=R.filter(r=>ETAPAS_ALERTA.includes(r.etapa)), na=Ra.length;
    const st=Ra.filter(r=>!r.tags_list.length);
    // FALTA PIX só é pendência de fato se a pasta já está em "Pasta com Pendência" — tag em
    // Cadastro Cliente/Pasta em Anállise é cedo demais pra cobrar Pix (pasta ainda não foi revisada).
    const fp=Ra.filter(r=>has(r,'FALTA PIX') && r.etapa==='Pasta com Pendência');
    const fpp=fp.filter(r=>r.dias_cadastro>=7), se=Ra.filter(r=>r.sem_email==='Sim');
    const estag=Ra.filter(estagnado);

    const dupTel=dupGroups(Ra,r=>r.telefone), dupEmail=dupGroups(Ra.filter(r=>r.sem_email!=='Sim'),r=>(r.email||'').toLowerCase());
    const dup=[...new Set([...dupTel.flat(),...dupEmail.flat()])];
    const conflito=new Set(); [...dupTel,...dupEmail].forEach(g=>{ if(new Set(g.map(r=>r.responsavel)).size>1) g.forEach(r=>conflito.add(r)); });

    const respAll={}; DATA.forEach(r=>{ (respAll[r.responsavel]=respAll[r.responsavel]||[]).push(r); });
    const respZero=new Set(Object.keys(respAll).filter(k=>respAll[k].length>=5 && !respAll[k].some(r=>r.etapa==='Pasta Aprovada com Pix')));
    const semConv=Ra.filter(r=>respZero.has(r.responsavel));
    // corretor não encontrado na listagem de usuários do Imobmeet (pedido do usuário, 10/09/2026):
    // só é "ponto de atenção" enquanto o cadastro ainda está em tramitação inicial (mesmo filtro
    // de Ra acima) — nesse caso, sem telefone/e-mail do corretor trava o follow-up do gerente.
    const semCorretor=Ra.filter(r=>r.corretor_sem_contato);

    const A=[
      ['semtag','Cadastros sem nenhuma marcação',st.length,`${pct(st.length,na)} do recorte (Cadastro/Anállise/Pendência) não tem tag — some de qualquer análise por forma de pagamento.`],
      ['pixatraso','“FALTA PIX” há 7 dias ou mais',fpp.length,`De ${nf(fp.length)} pendências de Pix em Pasta com Pendência, essas já passaram de uma semana desde o cadastro.`],
      ['sememail','Cadastros sem e-mail válido',se.length,'Fichas com e-mail no padrão telefone@sememail.com — sem canal de e-mail.'],
      ['estagnado','Estagnados 14+ dias sem concluir',estag.length,'Mesmo critério da aba Gerente: dias desde o cadastro, numa etapa que ainda não é Aprovada com Pix nem Desistente.'],
      ['duplicado','Possível cadastro duplicado',dup.length,`Mesmo telefone ou e-mail aparece em mais de um cadastro do recorte.${conflito.size?` ${nf(conflito.size)} envolvem corretores diferentes disputando o mesmo cliente.`:''}`],
      ['semconv','Corretor sem nenhuma aprovação',semConv.length,'Corretor(es) com 5+ cadastros em toda a base e nenhum "Pasta Aprovada com Pix" — considerando a base toda, não só o recorte.'],
      ['semcorretor','Corretor sem contato localizado',semCorretor.length,'Responsável não foi encontrado na listagem de usuários do Imobmeet — sem telefone/e-mail para contato, atrapalha o follow-up.']];
    document.getElementById('alerts').innerHTML=A.map(([key,t,v,d])=>
      `<div class="card alert${ALERTSEL.includes(key)?' on':''}" data-key="${key}"><div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3);font-weight:600">${t}</div>
       <div style="font-size:26px;font-weight:700;margin:5px 0;font-variant-numeric:tabular-nums">${nf(v)}</div><div>${d}</div></div>`).join('');
    document.querySelectorAll('#alerts .alert[data-key]').forEach(el=>el.onclick=e=>toggleAlert(el.dataset.key,e.ctrlKey||e.metaKey));

    const SETS={semtag:st,pixatraso:fpp,sememail:se,estagnado:estag,duplicado:dup,semconv:semConv,semcorretor:semCorretor};
    const acaoFull=[...new Set([...fpp,...st,...se,...estag,...dup,...semConv,...semCorretor])];
    const acao=ALERTSEL.length?acaoFull.filter(r=>ALERTSEL.some(k=>SETS[k].includes(r))):acaoFull;

    const head=[{t:'Nº',num:1},'Cadastro','Telefone','Etapa','Motivo',{t:'Dias desde o cadastro',num:1},'Responsável','Equipe'];
    tbl('tAcao',head,acao.map(r=>{const m=[];
      if(fpp.includes(r))m.push('Pix pendente há 7+ dias'); if(!r.tags_list.length)m.push('Sem tag');
      if(r.sem_email==='Sim')m.push('Sem e-mail'); if(estag.includes(r))m.push('Estagnado 14+ dias');
      if(dup.includes(r))m.push('Possível duplicidade'); if(semConv.includes(r))m.push('Corretor sem aprovação');
      if(semCorretor.includes(r))m.push('Corretor sem contato no Imobmeet');
      return [{v:+r.numero},r.nome,r.telefone,r.etapa,m.join(' · '),{v:r.dias_cadastro||0},r.responsavel,r.equipe];}),{k:5,d:-1});
    document.getElementById('nAcao').textContent = ALERTSEL.length
      ? `${nf(acao.length)} cadastro(s) no recorte com o(s) ponto(s) de atenção selecionado(s) (de ${nf(acaoFull.length)} no total com algum ponto de atenção). Clique de novo no card para limpar.`
      : `${nf(acao.length)} cadastros no recorte com pelo menos um ponto de atenção. Clique num card acima para restringir a tabela por motivo (Ctrl/Cmd+clique acumula).`;
  }

  if(TAB==='rank') paintRank();

  if(TAB==='base') tLeads(R);
  mountBars();
}

/* ===== aba Super Meta — seletor de período (independente dos filtros do topo, a meta é mensal) ===== */
function mountSuperMeta(){
  const sel=document.getElementById('smPeriodo'); if(!sel) return;
  sel.value=String(SM_PERIODO);
  sel.onchange=()=>{ SM_PERIODO = sel.value==='campanha' ? 'campanha' : Number(sel.value); paint(); };
}

/* ===== aba Gerente — seletor "Meu time" ===== */
function mountGerente(){
  const sel=document.getElementById('gerSel'); if(!sel) return;
  const marcaFor=e=>{const r=DATA.find(x=>x.equipe===e); return r?r.marca:'';};
  const equipes=uniq('equipe').slice().sort((a,b)=>gerLabel(a).localeCompare(gerLabel(b),'pt-BR'));
  sel.innerHTML='<option value="">Selecione seu nome…</option>'+
    equipes.map(e=>`<option value="${esc(e)}">${esc(gerLabel(e))} — ${esc(marcaFor(e))}</option>`).join('');
  let saved=''; try{ saved=localStorage.getItem('nexoGerenteSel')||''; }catch(e){}
  if(saved && equipes.includes(saved)){ GER=saved; sel.value=saved; }
  sel.onchange=()=>{ GER=sel.value||null; try{ localStorage.setItem('nexoGerenteSel',GER||''); }catch(e){} paint(); };
}

/* ===== ciclo ===== */
function apply(skipHist){
  const R=rowsFor(), n=R.length;
  syncFilters(); chips(n); writeHash();
  document.getElementById('empty').classList.toggle('on', n===0);
  document.getElementById('panels').style.display = n===0 ? 'none' : '';
  TABS.forEach(([k])=>{const e=document.querySelector('[data-cnt="'+k+'"]'); if(e) e.textContent = k==='base'?nf(n):'';});
  if(n) paint();
}
loadFiltersLS(); readHash(); mountTabs(); mountFilters(); mountRank(); mountTheme(); mountChartExports(); mountGerente(); mountSuperMeta();
document.getElementById('bTot').textContent=nf(DATA.length);
document.getElementById('bTags').textContent=ALLTAGS.length;
const _st=document.querySelector('.stamp .dt');
document.getElementById('fMeta').textContent='Página gerada em '+(_st?_st.textContent.trim():'—')+'. Relatório a partir de '+nf(DATA.length)+' cadastros e '+
  nf(DATA.reduce((a,r)=>a+r.tags_list.length,0))+' marcações de tag. Tags sem categoria conhecida: '+
  (ALLTAGS.filter(t=>cat(t)==='OUTROS').join(', ')||'nenhuma')+'.';
showTab(); apply(); sizeHeader();
setTimeout(sizeHeader,300);
