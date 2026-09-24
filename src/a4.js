/* ===== abas ===== */
const TABS=[['visao','Visão Geral'],['pagto','Pagamentos'],['times3','Times'],['gerente','Gerente'],
            ['previsao2','Previsão x Execução'],['superMeta','Super Meta'],
            ['perfil','Perfil e Valores'],['alertas','Pontos de Atenção'],['base','Base de Cadastros']];
/* 'previsao' desativada (11/09/2026) — fora de TABS, código/markup intactos, reversível, mesmo
   tratamento abaixo; a antiga aba "Previsão x Execução" (meta por equipe, planilha de 09/09/2026)
   foi substituída na navegação por 'previsao2' (meta por imobiliária, planilha SIENA de 11/09/2026),
   que herdou o rótulo "Previsão x Execução" — data-tab/nomes internos continuam 'previsao2'/SIENA2*
   de propósito, só o rótulo mudou (mesmo padrão já usado em 'times3'→"Times").
   'times' e 'times2' desativadas (04/09/2026) — fora de TABS, código/markup intactos, reversível,
   mesmo padrão já usado para 'tags'/'rank'. 'times3' (Chart.js, 5 gráficos sempre abertos) passa a
   ser a aba "Times" visível — data-tab e nomes internos (T3, t3*) continuam "times3"/"t3" de propósito,
   só o rótulo da aba mudou. */
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
/* ===== tema ===== */
function mountTheme(){
  const s=document.getElementById('fTema'); if(!s) return;
  s.innerHTML=THEMES.map(t=>`<option value="${t.id}">${t.label}</option>`).join('');
  s.value=document.documentElement.dataset.theme||'nexo';
  s.onchange=()=>applyTheme(s.value);
}
/* ===== cabeçalho ===== */
function sizeHeader(){
  const h=document.getElementById('hdr').offsetHeight;
  document.getElementById('spacer').style.height=h+'px';
}
addEventListener('scroll',()=>{ document.body.classList.toggle('shrunk',scrollY>90); requestAnimationFrame(sizeHeader); });
addEventListener('resize',sizeHeader);

/* ===== filtros de topo — combobox com checkbox (multi-seleção) ===== */
/* Cada filtro do topo já era uma dimensão de array em ST (suporta vários valores há muito
   tempo, via Ctrl/Cmd+clique nos gráficos) — só a UI do <select> nativo não deixava marcar
   mais de um item diretamente. mSelBuild troca o <select> por um botão + painel de checkboxes,
   mantendo ST/setDim/hash/chips exatamente como já funcionavam (não muda o modelo, só o input). */
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
  const wrapFunil=document.getElementById('wrapFunil');
  if(PANEL==='completo') mSelBuild('fFunil',uniq('funil'),'Todos os funis');
  else if(wrapFunil) wrapFunil.style.display='none';
  /* Desistente fica fora de ETAPAS de propósito (funil/#cMes não a exibem), mas continua
     selecionável aqui pra quem quiser ver só os desistentes (rowsFor() para de excluí-los
     quando o filtro pede exatamente essa etapa). */
  mSelBuild('fEtapa',[...ETAPAS.filter(e=>uniq('etapa').includes(e)), ...(uniq('etapa').includes('Desistente')?['Desistente']:[])],'Todas as etapas');
  mSelBuild('fMarca',uniq('tipo_imob'),'Todas as imobiliárias');
  mSelBuild('fEquipe',uniq('equipe'),'Todas as equipes');
  mSelBuild('fResp',uniq('responsavel'),'Todos os responsáveis');
  mSelBuild('fOrigem',uniq('origem'),'Todas as origens');
  mSelBuild('fPlano',uniq('plano_pagamento'),'Todos os planos');
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
