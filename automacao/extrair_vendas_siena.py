#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrai o Funil de Venda (ID 126) do Imobmeet, filtrado para o produto
"85 VILLAGIO SIENA" (produto_id=428 no Imobmeet), e grava em
dados/rows_vendas.json — usado pelo Painel do Funil de Venda (funilvendas.html,
ver src/rebuild_vendas.py). NUNCA toca em dados/rows.json nem em index.html
(esses pertencem só ao Painel do Funil de Pasta). `contatos.tsv` é
compartilhado entre os dois relatórios e só é estendido (nunca substituído).

USO (na pasta automacao, mesmo ambiente do atualizar.py):
    python extrair_vendas_siena.py
    HEADLESS=0 python extrair_vendas_siena.py   # abre o Chrome visível (depurar)

Login sempre via LOGIN_MODE=auto (IMOBMEET_USER/IMOBMEET_PASS do .env) — não
há modo manual aqui ainda porque a extração é rápida (~140 cadastros, ~2min).

Como foi descoberto (23/09/2026): a listagem /leads/list tem filtros nativos do
Livewire além de `tableFilters.funil.funil` (já usado pelo Funil de Pasta) —
`tableFilters.produto_id.values` filtra por produto. O id do produto NÃO é o
número que aparece no nome (ex.: "85 VILLAGIO SIENA" não é produto_id=85) — foi
lido direto do <select id="produto"> da página (option value=428, texto
"85 VILLAGIO SIENA"). Se o Imobmeet um dia trocar esse id, rodar novamente a
sonda: abrir /leads/list, `document.querySelector('#produto').outerHTML` e
procurar a opção "85 VILLAGIO SIENA".
"""
import sys
import os
import re
import json
import datetime
from pathlib import Path
from collections import Counter

AUTOMACAO_DIR = Path(__file__).resolve().parent
BASE = AUTOMACAO_DIR.parent
sys.path.insert(0, str(AUTOMACAO_DIR))
import atualizar as A  # noqa: E402

OUT_PATH = BASE / 'dados' / 'rows_vendas.json'
LOG_PATH = AUTOMACAO_DIR / 'log_vendas_siena.txt'

FUNIL_ID = '126'
PRODUTO_ID = '428'  # "85 VILLAGIO SIENA"

HEADLESS = os.environ.get('HEADLESS', '1') != '0'


def log(msg):
    line = '[{}] {}'.format(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), msg)
    print(line, flush=True)
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


A.log = log

SET_FILTERS_JS = r"""
async ([funilId, produtoId]) => {
  const w = Livewire.all().find(c => c.name === 'leads-table').$wire;
  await w.set('tableFilters.funil.funil', funilId);
  await w.set('tableFilters.produto_id.values', [produtoId]);
  await w.set('tableRecordsPerPage', '50');
}
"""


def main():
    t0 = datetime.datetime.now()
    log('==== início extração Funil de Venda — Village Siena ====')
    A.load_env(AUTOMACAO_DIR / '.env')
    user, pwd = os.environ.get('IMOBMEET_USER'), os.environ.get('IMOBMEET_PASS')
    if not user or not pwd:
        raise SystemExit('IMOBMEET_USER / IMOBMEET_PASS não definidos (automacao/.env).')
    login_url = os.environ.get('IMOBMEET_LOGIN_URL', A.IMOBMEET_BASE)

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, channel='chrome')
        page = browser.new_page()
        page.set_default_timeout(90000)
        try:
            page.goto(login_url, wait_until='domcontentloaded')
            page.locator('#email').fill(user, timeout=15000)
            page.locator('#senha').fill(pwd, timeout=15000)
            page.get_by_role('button', name=re.compile('entrar|login|acessar|sign ?in', re.I)).first.click()
            page.wait_for_timeout(6000)
            if 'login' in page.url.lower():
                raise RuntimeError('login não confirmado: ' + page.url)
            log('login ok')

            A.open_leads_table(page)
            page.evaluate(SET_FILTERS_JS, [FUNIL_ID, PRODUTO_ID])
            page.wait_for_timeout(9000)
            log('filtros aplicados (funil={}, produto={})'.format(FUNIL_ID, PRODUTO_ID))

            total = page.evaluate(A.PAG_TOTAL_JS) or 0
            per_page = 50
            n_pages = max(1, (total + per_page - 1) // per_page)
            log('total anunciado: {} ({} página(s))'.format(total, n_pages))

            all_rows, seen = [], set()
            prev_first = None
            pnum = 1
            while pnum <= n_pages and pnum <= 20:
                if pnum > 1:
                    page.evaluate(A.GOTO_PAGE_JS, pnum)
                    first = A._wait_first_id(page, prev_first)
                    if first == prev_first:
                        page.wait_for_timeout(3000)
                batch = page.evaluate(A.PARSE_ROWS_JS)
                new = 0
                for r in batch:
                    if r['id'] not in seen:
                        seen.add(r['id'])
                        all_rows.append(r)
                        new += 1
                prev_first = page.evaluate(A.FIRST_ID_JS)
                log('página {}/{}: +{} (acc {}/{})'.format(pnum, n_pages, new, len(all_rows), total))
                pnum += 1

            log('linhas coletadas: {}'.format(len(all_rows)))
            prods = Counter(r.get('produto') or '(vazio)' for r in all_rows)
            log('produtos na coleta (deve ser só "85 VILLAGIO SIENA"): ' + json.dumps(dict(prods), ensure_ascii=False))
            if len(prods) > 1 or (prods and '85 VILLAGIO SIENA' not in prods):
                log('AVISO: produto inesperado na coleta — confira se PRODUTO_ID ainda é 428.')

            ids = [r['id'] for r in all_rows]
            det = A.fetch_details(page, ids)
            for r in all_rows:
                r['det'] = det.get(r['id']) or {'err': 'sem resposta'}
            log('fichas buscadas: {}'.format(len(det)))

            rows, erros = A.build_rows(all_rows, t0)
            if erros:
                log('AVISO {} ficha(s) com problema: {}'.format(len(erros), erros[:15]))

            contatos_path = BASE / 'dados' / 'contatos.tsv'
            contatos = A.load_contatos(contatos_path)
            faltantes = sorted({r['responsavel'] for r in rows if r['responsavel'] and A.norm(r['responsavel']) not in contatos})
            if faltantes:
                log('buscando contato de {} corretor(es) novo(s)'.format(len(faltantes)))
                novos = {}
                for i in range(0, len(faltantes), 40):
                    chunk = faltantes[i:i + 40]
                    novos.update(A.extract_contatos(page, chunk))
                for nome, info in novos.items():
                    contatos[A.norm(nome)] = info
                A.save_contatos(contatos_path, contatos)
                log('contatos.tsv atualizado com {} novo(s)'.format(len(novos)))

            for r in rows:
                c = contatos.get(A.norm(r['responsavel']))
                if c:
                    r['resp_tel'], r['resp_email'] = c['tel'], c['email']
                r['corretor_sem_contato'] = not r['resp_tel'] and not r['resp_email']
        finally:
            browser.close()

    used_tags = sorted({t for r in rows for t in r['tags_list']})
    log('tags distintas encontradas ({}): {}'.format(len(used_tags), used_tags))
    catmap = json.loads((BASE / 'dados' / 'catmap.json').read_text(encoding='utf-8'))
    desconhecidas = sorted(t for t in used_tags if t not in catmap)
    if desconhecidas:
        log('AVISO: tag(s) nova(s) fora de dados/catmap.json (categorizar manualmente): {}'.format(desconhecidas))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    log('gravado {} — {} cadastro(s)'.format(OUT_PATH, len(rows)))
    dur = (datetime.datetime.now() - t0).total_seconds()
    log('==== fim — {:.1f}s ===='.format(dur))


if __name__ == '__main__':
    main()
