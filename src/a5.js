/* ===== KPIs ===== */
function kpiCards(id,K){
  document.getElementById(id).innerHTML=K.map(([l,v,s,k,dim,val,tip])=>
    `<div class="kpi ${k||''}${dim&&ST[dim].includes(val)?' on':''}"${dim?` data-dim="${dim}" data-val="${esc(val)}"`:''}${tip?` title="${esc(tip)}"`:''}>`+
    `<div class="lb">${esc(l)}</div><div class="vl">${v}</div><div class="sb">${s}</div></div>`).join('');
  document.querySelectorAll('#'+id+' .kpi[data-dim]').forEach(el=>el.onclick=e=>
    toggle(el.dataset.dim,el.dataset.val,e.ctrlKey||e.metaKey));
}
function kpiClassEtapa(e){
  if(/desist|descart/i.test(e)) return 'k-crit';
  if(/aprovad|ganh|vendid/i.test(e) && !/pend/i.test(e)) return 'k-good';
  if(/pend|pr[eé]\s*cadastro/i.test(e)) return 'k-warn';
  return '';
}
function kpis(rows){
  const n=rows.length;
  const c=t=>rows.filter(r=>has(r,t)).length;
  const et=e=>rows.filter(r=>r.etapa===e).length;
  const K=[['Cadastros no recorte',nf(n),pct(n,LEADS_TOTAL)+' da base','']];
  if(PANEL==='completo'){
    K.push(['Pix confirmado',nf(c('PIX')),pct(c('PIX'),n),'k-good','tag','PIX']);
    ETAPAS.forEach(e=>K.push([e,nf(et(e)),pct(et(e),n),kpiClassEtapa(e),'etapa',e]));
  } else {
    K.push(
      ['Pix confirmado',nf(c('PIX')),pct(c('PIX'),n),'k-good','tag','PIX'],
      ['Cadastro Cliente',nf(et('Cadastro Cliente')),pct(et('Cadastro Cliente'),n),'','etapa','Cadastro Cliente'],
      ['Pasta em Anállise',nf(et('Pasta em Anállise')),pct(et('Pasta em Anállise'),n),'','etapa','Pasta em Anállise'],
      ['Pasta com Pendência',nf(et('Pasta com Pendência')),pct(et('Pasta com Pendência'),n),'k-warn','etapa','Pasta com Pendência'],
      ['Pasta Validada pendente de Pix',nf(et('Pasta Validada pendente de Pix')),pct(et('Pasta Validada pendente de Pix'),n),'k-warn','etapa','Pasta Validada pendente de Pix'],
      ['Pasta Aprovada com Pix',nf(et('Pasta Aprovada com Pix')),pct(et('Pasta Aprovada com Pix'),n),'k-good','etapa','Pasta Aprovada com Pix']);
  }
  /* Card Desistente volta a aparecer (05/09/2026, a pedido do usuário) mas NÃO conta como lead:
     `rows` aqui já é `rowsFor()`, que exclui Desistente por padrão (v4.10) — por isso a contagem
     usa `rowsFor('etapa')` direto (mesmo truque do gráfico #cEtapa: ignora a própria etapa no
     filtro E a exclusão automática), sem entrar no `n`/`LEADS_TOTAL` usado pelos demais cards. */
  const nDesist=rowsFor('etapa').filter(r=>r.etapa==='Desistente').length;
  K.push(['Desistente',nf(nDesist),pct(nDesist,n)+' — não contam como lead','k-crit','etapa','Desistente',
    'Cadastros que desistiram. Aparecem aqui só pra visibilidade — não somam em "Cadastros no recorte" nem em nenhum outro indicador do painel.']);
  kpiCards('kpis',K);
}
/* ===== tabelas genéricas ===== */
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
/* ===== base de leads ===== */
function tLeads(rows){
  const q=(document.getElementById('q').value||'').trim().toLowerCase();
  let d=rows;
  if(q) d=d.filter(r=>[r.nome,r.telefone,r.email,r.equipe,r.responsavel,r.resp_tel,r.resp_email,r.origem,r.etapa,r.funil,r.tags_list.join(' ')]
    .join(' ').toLowerCase().includes(q));
  const head=[{t:'Nº',num:1},'Cadastro','Telefone','E-mail'].concat(PANEL==='completo'?['Funil']:[]).concat(['Etapa','Tags','Plano','Responsável','Telefone do corretor','E-mail do corretor','Equipe','Origem',{t:'Renda',num:1},'Cadastro em']);
  const wa=t=>String(t||'').replace(/\D/g,'');
  const rr=d.map(r=>{
    const cells=[{v:+r.numero},r.nome,r.telefone,
    {v:r.sem_email==='Sim'?'sem e-mail':r.email,h:r.sem_email==='Sim'?'<span style="color:#b06a00">sem e-mail</span>':esc(r.email)}];
    if(PANEL==='completo') cells.push(r.funil||'');
    cells.push(r.etapa,{v:r.tags_list.join(' | '),h:r.tags_list.length?r.tags_list.map(t=>`<span class="tg">${esc(t)}</span>`).join(''):'—'},
    r.plano_pagamento,r.responsavel,
    {v:r.resp_tel||'',h:r.resp_tel? `<a href="https://wa.me/55${wa(r.resp_tel)}" target="_blank" rel="noopener" style="color:var(--navy);font-weight:600;text-decoration:none">${esc(r.resp_tel)}</a>` : '—'},
    {v:r.resp_email||'',h:r.resp_email? `<a href="mailto:${esc(r.resp_email)}" style="color:var(--ink-2);text-decoration:none">${esc(r.resp_email)}</a>` : '—'},
    r.equipe,r.origem,
    {v:r.valor_renda||0,h:r.valor_renda?money(r.valor_renda):'—'},r.cadastro);
    return cells;
  });
  tbl('tLeads',head,rr,{k:0,d:-1});
  document.getElementById('nLeads').textContent=nf(rr.length)+' linhas exibidas'+(q?' (busca ativa)':'')+'. Clique no cabeçalho para ordenar; as exportações seguem exatamente o que está na tela.';
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
