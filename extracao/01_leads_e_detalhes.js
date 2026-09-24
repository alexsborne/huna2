/* ============================================================================
   EXTRAÇÃO 1 — Leads do Funil de Pasta + dados da ficha
   ----------------------------------------------------------------------------
   ONDE RODAR: console do navegador, com sessão ativa em crm.imobmeet.com.br,
               na página https://crm.imobmeet.com.br/leads/list
   PRÉ-REQUISITO: esperar a página carregar por completo (~20 s). A listagem é
               um componente Livewire 3 chamado 'leads-table'.
   SAÍDA: baixa um .tsv e guarda cópia em localStorage.

   POR QUE ASSIM: não existe endpoint de exportação no Imobmeet. A listagem é
   server-rendered via Livewire; manipular o $wire é o único caminho estável.
   ATENÇÃO: renderizar 151 linhas E disparar fetches em paralelo trava a aba.
   Por isso o script captura as linhas, VOLTA o perPage para 5 e só então
   busca as fichas, além de persistir em localStorage a cada etapa.
   ========================================================================== */
window.__st = 'init';

window.__main = async function () {
  const w = Livewire.all().find(c => c.name === 'leads-table').$wire;

  // 1) filtra pelo Funil de Pasta (id 128) e mostra todas as linhas
  await w.set('tableFilters.funil.funil', '128');   // 126 = Funil de Venda
  await w.set('tableRecordsPerPage', 'all');
  await new Promise(r => setTimeout(r, 12000));

  // 2) captura as linhas da tabela
  let rows = [...document.querySelectorAll('table tbody tr')].map(tr => {
    const c = [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\s*\n\s*/g, '|').trim());
    const a = tr.querySelector('a[href*="/leads/details/"]');
    return a ? {
      id: a.getAttribute('href').split('/').pop(),
      num: c[1], nome: c[2], resp: c[3], funil: c[4],
      produto: c[5], origem: c[6], cadastro: c[7]
    } : null;
  }).filter(Boolean);
  const seen = {}; rows = rows.filter(r => seen[r.id] ? false : (seen[r.id] = 1));
  localStorage.setItem('__pastaRows', JSON.stringify(rows));
  window.__st = 'rows:' + rows.length;

  // 3) alivia o DOM antes de buscar as fichas
  await w.set('tableRecordsPerPage', '5');
  await new Promise(r => setTimeout(r, 4000));

  // 4) abre a ficha de cada lead em lotes de 4
  const det = {};
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(rows.slice(i, i + 4).map(async r => {
      try {
        const h = await fetch('/leads/details/' + r.id, { credentials: 'same-origin' }).then(x => x.text());
        const d = document.implementation.createHTMLDocument('');
        d.body.innerHTML = h.replace(/<script[\s\S]*?<\/script>/gi, '');

        // TAGS ATIVAS: são as <option selected> do select2 de marcações.
        // NÃO usar o texto visível da página — ele lista as 29 tags disponíveis.
        const tags = [...d.querySelectorAll('#tagsSelect2 option')]
          .filter(o => o.hasAttribute('selected')).map(o => o.textContent.trim());
        const sv = sel => { const o = d.querySelector(sel + ' option[selected]'); return o ? o.textContent.trim() : ''; };
        const pp = sv('select[name=planodepagamento]');   // campo personalizado, separado das tags

        // demais campos saem do texto corrido da ficha
        const t = (d.body.textContent || '').replace(/\s+/g, ' ');
        const g = re => { const m = t.match(re); return m ? m[1].trim() : ''; };
        det[r.id] = {
          tags, pp,
          email:  g(/Email:\s*(\S+)/i),
          tel:    g(/Telefone:\s*([+\d()\-\s]{8,25})/i),
          neg:    g(/Valor do Neg.cio:\s*(R\$[\d.,\s]+)/i),
          renda:  g(/Valor de Renda:\s*(R\$[\d.,\s]+)/i),
          fin:    g(/Finalidade da compra:\s*([^:]{0,40}?)\s*Cadastrado:/i),
          cad:    g(/Cadastrado:\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/),
          upd:    g(/ltima atualiza..o:\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/)
        };
        d.body.innerHTML = '';   // libera memória — sem isso a aba trava
      } catch (e) { det[r.id] = { err: 1 }; }
    }));
    window.__st = 'det:' + Object.keys(det).length + '/' + rows.length;
  }
  localStorage.setItem('__pastaDet', JSON.stringify(det));

  // 5) monta o TSV e dispara o download
  const hdr = ['Numero','Nome','Telefone','Email','Etapa','Responsavel','Equipe','Produto',
               'Origem','Finalidade','ValorRenda','ValorNegocio','PlanoPagamento','Tags',
               'Cadastro','UltimaAtualizacao','LeadID'];
  const tsv = [hdr.join('\t')].concat(rows.map(r => {
    const d = det[r.id] || {}, rp = (r.resp || '').split('|');
    return [r.num, r.nome, d.tel || '', d.email || '', (r.funil || '').split('|')[1] || '',
            rp[0] || '', rp[1] || '', r.produto || '', r.origem || '', d.fin || '',
            d.renda || '', d.neg || '', d.pp || '', (d.tags || []).join(' ;; '),
            r.cadastro || '', d.upd || '', r.id]
           .map(v => String(v).replace(/[\t\n]/g, ' ')).join('\t');
  })).join('\n');
  localStorage.setItem('__pastaData', tsv);

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + tsv], { type: 'text/tab-separated-values;charset=utf-8' }));
  a.download = 'funil_de_pasta.tsv';
  document.body.appendChild(a); a.click(); a.remove();
  window.__st = 'done:' + rows.length;
};

window.__main().catch(e => { window.__st = 'ERR ' + String(e).slice(0, 120); });
// acompanhe o progresso digitando:  window.__st
