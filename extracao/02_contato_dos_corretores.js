/* ============================================================================
   EXTRAÇÃO 2 — Telefone e e-mail dos corretores responsáveis
   ----------------------------------------------------------------------------
   ONDE RODAR: https://crm.imobmeet.com.br/users  (componente 'users.list-users')
   POR QUE ASSIM: a base tem 1394 usuários — renderizar tudo é inviável.
   A estratégia é buscar UM A UM pelo nome que aparece na coluna Responsável
   dos leads, e depois abrir /users/edit/<id> para pegar o celular (a listagem
   mostra e-mail, mas não telefone).
   Preencha window.__N com os nomes distintos de 'responsavel' vindos da
   extração 1. Leva ~2,5 min para 56 nomes.
   ========================================================================== */
window.__N = [ /* "AFONSO JOSE NETO JUNIOR", "Vicente", ... */ ];
window.__U = {}; window.__st = '0';

window.__fase1 = async function () {
  const w = Livewire.all().find(c => c.name === 'users.list-users').$wire;
  const norm = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  for (let i = 0; i < window.__N.length; i++) {
    const nm = window.__N[i];
    try {
      await w.set('tableSearch', nm.split(' - ')[0].slice(0, 40));
      await new Promise(r => setTimeout(r, 2200));
      const rows = [...document.querySelectorAll('table tbody tr')].map(tr => {
        const td = [...tr.querySelectorAll('td')].map(c => c.innerText.replace(/\s+/g, ' ').trim());
        const a = tr.querySelector('a[href*="/users/edit/"]');
        // colunas: 0 vazio | 1 Foto | 2 Nome | 3 Email | 4 Perfil | 5 Ativo | 6 Equipe
        return { id: a ? a.getAttribute('href').split('/').pop() : null,
                 nome: td[2], email: td[3], perfil: td[4], equipe: td[6] };
      }).filter(r => r.id);
      const hit = rows.find(r => norm(r.nome) === norm(nm)) || rows[0] || null;
      window.__U[nm] = hit ? { id: hit.id, nome: hit.nome, email: hit.email, equipe: hit.equipe } : { miss: 1 };
    } catch (e) { window.__U[nm] = { err: String(e).slice(0, 40) }; }
    window.__st = (i + 1) + '/' + window.__N.length;
  }
  window.__st = 'fase1-ok';
};

window.__fase2 = async function () {
  const ks = Object.keys(window.__U);
  for (let i = 0; i < ks.length; i += 4) {
    await Promise.all(ks.slice(i, i + 4).map(async k => {
      const u = window.__U[k]; if (!u.id) return;
      const h = await fetch('/users/edit/' + u.id, { credentials: 'same-origin' }).then(x => x.text());
      const d = document.implementation.createHTMLDocument('');
      d.body.innerHTML = h.replace(/<script[\s\S]*?<\/script>/gi, '');
      const g = n => { const e = d.querySelector('[name="' + n + '"],#' + n); return e ? (e.value || '').trim() : ''; };
      u.cel = g('celular'); u.mail2 = g('email'); u.creci = g('creci'); u.nomeFull = g('name');
      d.body.innerHTML = '';
    }));
    window.__st = Math.min(i + 4, ks.length) + '/' + ks.length;
  }
  window.__st = 'fase2-ok';
  const out = Object.entries(window.__U)
    .map(([k, u]) => [k, u.nomeFull || u.nome || '', u.cel || '', u.mail2 || u.email || '', u.equipe || ''].join('\t'))
    .join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeffresp_lead\tnome_crm\tcelular\temail\tequipe_crm\n' + out],
    { type: 'text/tab-separated-values' }));
  a.download = 'contatos_responsaveis.tsv';
  document.body.appendChild(a); a.click(); a.remove();
};

// rodar em sequência:  await window.__fase1(); await window.__fase2();
