
/* ===== rankings ===== */
function modeWithTieBreak(arr,keyFn,tieBreakFn){
  const c={};
  arr.forEach(item=>{const k=keyFn(item);if(!c[k])c[k]={n:0,t:0};c[k].n++;c[k].t+=tieBreakFn(item);});
  let bk=null,bn=0,bt=0;
  for(const[k,v]of Object.entries(c)){if(v.n>bn||(v.n===bn&&v.t>bt)){bk=k;bn=v.n;bt=v.t;}}
  return bk;}
const METRICS=[
  {k:'leads', l:'Total de cadastros na pasta', un:'cadastros', fn:rs=>rs.length, fmt:v=>nf(v)},
  {k:'aprov', l:'Pastas aprovadas com Pix', un:'aprovadas', fn:rs=>rs.filter(r=>r.etapa==='Pasta Aprovada com Pix').length, fmt:v=>nf(v)},
  {k:'valid', l:'Pastas validadas pendentes de Pix', un:'validadas', fn:rs=>rs.filter(r=>r.etapa==='Pasta Validada pendente de Pix').length, fmt:v=>nf(v)},
  {k:'pix',   l:'Cadastros com Pix confirmado (tag PIX)', un:'com Pix', fn:rs=>rs.filter(r=>has(r,'PIX')).length, fmt:v=>nf(v)},
  {k:'falta', l:'Pendências de Pix (tag FALTA PIX)', un:'pendências', fn:rs=>rs.filter(r=>has(r,'FALTA PIX')).length, fmt:v=>nf(v)},
  {k:'conv',  l:'Taxa de conversão (aprovadas ÷ cadastros)', un:'de conversão', pctMode:1,
    fn:rs=>rs.length? 100*rs.filter(r=>r.etapa==='Pasta Aprovada com Pix').length/rs.length : 0,
    fmt:v=>v.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'},
  {k:'renda', l:'Renda mediana dos cadastros', un:'mediana', money:1,
    fn:rs=>{const a=rs.map(r=>r.valor_renda).filter(v=>v); return a.length? median(a):0;}, fmt:v=>v?money(v):'—'}
];
let RK={tipo:'marca', met:'leads', min:0};

function rkRows(){ return rowsFor(RK.tipo); }
function rkTable(){
  const rows=rkRows(), by={};
  rows.forEach(r=>{ const k=r[RK.tipo]||'(não informado)'; (by[k]=by[k]||[]).push(r); });
  const M=METRICS.find(m=>m.k===RK.met);
  let out=Object.keys(by).map(k=>{
    const rs=by[k], o={nome:k, leads:rs.length};
    METRICS.forEach(m=>{ o[m.k]=m.fn(rs); });
    o.val=o[M.k];
    /* --- compute associated broker/brand pair (imobiliária + corretor) --- */
    if(RK.tipo==='marca'){
      o.imob=o.nome; /* the lançadora is itself the imobiliária */
      o.corretor=modeWithTieBreak(rs,
        r=>r.responsavel||'(sem corretor)',
        r=>r.etapa==='Pasta Aprovada com Pix'?1:0);
    }else{
      o.corretor=o.nome; /* the ranked entity is the broker */
      o.imob=modeWithTieBreak(rs,
        r=>r.marca||'(sem marca)',
        r=>r.etapa==='Pasta Aprovada com Pix'?1:0);
    }
    return o;
  });
  if(RK.min) out=out.filter(o=>o.leads>=RK.min);
  out.sort((a,b)=> b.val-a.val || b.leads-a.leads || a.nome.localeCompare(b.nome,'pt-BR'));
  let pos=0,last=null,skip=0;
  out.forEach(o=>{ skip++; if(o.val!==last){ pos=skip; last=o.val; } o.pos=pos; });
  return out;
}

function mountRank(){
  const s=document.getElementById('rkMet');
  s.innerHTML=METRICS.map(m=>`<option value="${m.k}">${m.l}</option>`).join('');
  s.value=RK.met;
  s.onchange=()=>{ RK.met=s.value; paint(); };
  const mn=document.getElementById('rkMin');
  mn.value=String(RK.min);
  mn.onchange=()=>{ RK.min=+mn.value; paint(); };
  document.querySelectorAll('#rkTipo button').forEach(b=>b.onclick=()=>{
    RK.tipo=b.dataset.v;
    document.querySelectorAll('#rkTipo button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    paint();
  });
}

function paintRank(){
  const M=METRICS.find(m=>m.k===RK.met), T=rkTable();
  const dimLabel = RK.tipo==='marca' ? 'lançadoras' : 'corretores';
  const sel=ST[RK.tipo]||[];
  const total=rkRows().length;

  document.getElementById('rkNota').textContent =
    `${nf(T.length)} ${dimLabel} no recorte, classificados por ${M.l.toLowerCase()}`+
    (RK.min?`, considerando apenas quem tem ${RK.min} leads ou mais`:'')+
    `. Empates dividem a mesma posição.`;

  // pódio
  const pod=document.getElementById('rkPod');
  if(!T.length){ pod.innerHTML='<div class="card rk-empty">Nenhum colocado com os filtros atuais.</div>'; }
  else{
    const three=T.slice(0,3), order=[three[1],three[0],three[2]];
    pod.innerHTML=order.map((o,i)=>{
      if(!o) return '<div></div>';
      const p=o.pos, cls=p===1?'p1':p===2?'p2':'p3';
      const med=p===1?'1º':p===2?'2º':'3º';
      const sub = M.k==='leads' ? `${nf(o.aprov)} aprovadas com Pix`
        : M.k==='conv' ? `${nf(o.aprov)} de ${nf(o.leads)} cadastros`
        : `${nf(o.leads)} cadastros no total`;
      const sub2 = RK.tipo==='marca'
        ? (o.corretor?`Corretor: ${esc(o.corretor)}`:'')
        : (o.imob?`Imobiliária: ${esc(o.imob)}`:'');
      return `<div class="pod ${cls}${sel.includes(o.nome)?' sel':''}" data-n="${esc(o.nome)}">
        <div class="medal">${med}</div>
        <div class="nm">${esc(o.nome)}</div>
        <div class="vl">${M.fmt(o.val)}</div>
        <div class="un">${M.un}</div>
        <div class="sub">${sub}</div>${sub2?`<div class="sub2">${sub2}</div>`:''}
        <div class="base">${med} lugar</div></div>`;
    }).join('');
    pod.querySelectorAll('.pod').forEach(el=>el.onclick=e=>toggle(RK.tipo, el.dataset.n, e.ctrlKey||e.metaKey));
  }

  // top 10
  const top=T.slice(0,10);
  document.getElementById('rkChTit').textContent =
    (RK.tipo==='marca'?'Top 10 lançadoras':'Top 10 corretores')+' — '+M.l;
  document.getElementById('rkChSub').textContent =
    'Ordenado pelo critério escolhido acima. Clique numa barra para filtrar o painel por esse colocado.';
  const bg=top.map(o=>{
    const base = o.pos===1?'#eda100' : o.pos===2?'#7b8794' : o.pos===3?'#c98b53' : '#2a78d6';
    return fade(base, !sel.length||sel.includes(o.nome));
  });
  build('cRank',{type:'bar',
    data:{labels:top.map(o=>[o.pos+'º  '+shortT(o.nome,26), RK.tipo==='marca'?(o.corretor?'Corretor: '+shortT(o.corretor,20):''):(o.imob?'Imobiliária: '+shortT(o.imob,20):'')]),
      datasets:[{data:top.map(o=>M.pctMode?+o.val.toFixed(1):o.val),backgroundColor:bg,
        borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}]},
    options:{indexAxis:'y',plugins:{legend:{display:false},dl:{},
      tooltip:{callbacks:{title:c=>top[c[0].dataIndex].nome,
        label:c=>{
          const o=top[c.dataIndex], l1=M.fmt(o.val)+' · '+M.un+' · '+nf(o.leads)+' cadastros';
          const l2=RK.tipo==='marca'?(o.corretor?'Corretor: '+o.corretor:''):(o.imob?'Imobiliária: '+o.imob:'');
          return l2?[l1,l2]:l1;
        }}}},
      scales:{x:{...gx,grace:'16%'},y:gn}}},
    (i,d,add)=>toggle(RK.tipo, top[i].nome, add));

  // tabela
  document.getElementById('rkTbSub').textContent =
    `Posição de todas as ${dimLabel} conforme os filtros aplicados. Clique numa linha para isolar o colocado; clique no cabeçalho para reordenar.`;
  const head=[{t:'#',num:0},RK.tipo==='marca'?'Lançadora':'Corretor',{t:'Cadastros',num:1},
    {t:'Aprovadas c/ Pix',num:1},{t:'Validadas',num:1},{t:'Pix confirmado',num:1},{t:'Falta Pix',num:1},
    {t:'Conversão',num:1},{t:'Renda mediana',num:1}];
  const body=T.map(o=>[
    {v:o.pos,h:`<span class="pos">${o.pos}º</span>`},
    {v:o.nome,h:`<span data-rk="${esc(o.nome)}" style="cursor:pointer;font-weight:${o.pos<=3?'700':'400'}">${esc(o.nome)}</span>`},
    {v:o.leads},{v:o.aprov},{v:o.valid},{v:o.pix},{v:o.falta},
    {v:o.conv,h:o.conv.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%'},
    {v:o.renda,h:o.renda?money(o.renda):'—'}
  ]);
  const tb=document.querySelector('.tbar[data-table="tRank"]');
  if(tb){ tb.dataset.name='ranking_'+(RK.tipo==='marca'?'lancadoras':'corretores')+'_'+RK.met;
          tb.dataset.title='Ranking de '+(RK.tipo==='marca'?'lançadoras':'corretores')+' — '+M.l; }
  tbl('tRank',head,body,{k:0,d:1});
  document.querySelectorAll('#tRank [data-rk]').forEach(el=>el.onclick=e=>{
    e.stopPropagation(); toggle(RK.tipo, el.dataset.rk, e.ctrlKey||e.metaKey);
  });
  document.getElementById('nRank').textContent =
    `${nf(T.length)} ${dimLabel} · ${nf(total)} cadastros no recorte. As exportações desta tabela seguem exatamente esta classificação.`;
}
