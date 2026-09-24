#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualiza o painel completo (index_2.html) com TODOS os funis do Imobmeet
(Funil de Pasta 128 + Funil de Venda 126). Não mexe em dados/rows.json nem
em index.html (Funil de Pasta).

USO (na pasta automacao):
    python atualizar_completo.py
    DRY_RUN=1 python atualizar_completo.py
"""
import os
import sys
import json
import datetime
import traceback
from collections import Counter
from pathlib import Path

AUTOMACAO_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AUTOMACAO_DIR))

import atualizar as A

FUNIS = [('128', 'Funil de Pasta'), ('126', 'Funil de Venda')]
ROWS_ALL = A.DADOS / 'rows_all.json'
LOG_PATH = AUTOMACAO_DIR / 'log_completo.txt'


def log(msg):
    line = '[{}] {}'.format(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), msg)
    print(line, flush=True)
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


A.log = log


def _fail(msg):
    log('ERRO — abortando SEM publicar: ' + msg)
    sys.exit(1)


def main():
    t0 = datetime.datetime.now()
    log('==== início COMPLETO ==== (DRY_RUN={}, LOGIN_MODE={}, HEADLESS={})'.format(
        A.DRY_RUN, A.LOGIN_MODE, A.HEADLESS))
    A.load_env(AUTOMACAO_DIR / '.env')
    if A.LOGIN_MODE == 'manual':
        user = pwd = login_url = None
    else:
        user, pwd = os.environ.get('IMOBMEET_USER'), os.environ.get('IMOBMEET_PASS')
        if not user or not pwd:
            _fail('IMOBMEET_USER / IMOBMEET_PASS não definidos.')
        login_url = os.environ.get('IMOBMEET_LOGIN_URL', A.IMOBMEET_BASE)

    prev_rows = json.loads(ROWS_ALL.read_text(encoding='utf-8')) if ROWS_ALL.exists() else []
    catmap = json.loads((A.DADOS / 'catmap.json').read_text(encoding='utf-8'))
    contatos_path = A.DADOS / 'contatos.tsv'
    contatos = A.load_contatos(contatos_path)

    from playwright.sync_api import sync_playwright
    raw = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=A.HEADLESS, channel='chrome')
        page = browser.new_page()
        page.set_default_timeout(180000)
        try:
            if A.LOGIN_MODE == 'manual':
                A.manual_login(page)
            else:
                A.login(page, user, pwd, login_url)
            log('login ok')

            for fid, nome in FUNIS:
                log('listando {} ({})...'.format(nome, fid))
                batch = A.extract_funil_list(page, fid)
                log('{}: {} linha(s)'.format(nome, len(batch)))
                if fid == '126' and len(batch) < 1000:
                    _fail('Funil de Venda veio com só {} cadastros — extração incompleta (esperado ~3000).'.format(len(batch)))
                if fid == '128' and len(batch) < 50:
                    _fail('Funil de Pasta veio com só {} cadastros — extração incompleta.'.format(len(batch)))
                raw.extend(batch)

            seen, uniq = set(), []
            for r in raw:
                if r['id'] in seen:
                    continue
                seen.add(r['id'])
                uniq.append(r)
            log('linhas únicas após merge: {} (bruto {})'.format(len(uniq), len(raw)))

            ids = [r['id'] for r in uniq]
            det = A.fetch_details(page, ids)
            for r in uniq:
                r['det'] = det.get(r['id']) or {'err': 'sem resposta'}

            rows, erros = A.build_rows(uniq, t0)
            if erros:
                log('aviso: {} ficha(s) com problema (seguem fora da base): {} ...'.format(
                    len(erros), erros[:8]))
                if len(erros) > max(20, int(len(uniq) * 0.05)):
                    _fail('demasiadas fichas com problema ({}/{})'.format(len(erros), len(uniq)))

            faltantes = sorted({r['responsavel'] for r in rows if A.norm(r['responsavel']) not in contatos})
            if faltantes:
                log('buscando contato de {} corretor(es) novo(s)'.format(len(faltantes)))
                # busca em lotes pra não derrubar a listagem de usuários
                novos = {}
                for i in range(0, len(faltantes), 40):
                    chunk = faltantes[i:i + 40]
                    log('contatos {}/{}'.format(min(i + 40, len(faltantes)), len(faltantes)))
                    novos.update(A.extract_contatos(page, chunk))
                for nome, info in novos.items():
                    contatos[A.norm(nome)] = info
                A.save_contatos(contatos_path, contatos)
        finally:
            browser.close()

    for r in rows:
        c = contatos.get(A.norm(r['responsavel']))
        if c:
            r['resp_tel'], r['resp_email'] = c['tel'], c['email']
        r['corretor_sem_contato'] = not r['resp_tel'] and not r['resp_email']

    sem_contato = [r['lead_id'] for r in rows if r['corretor_sem_contato']]
    if sem_contato:
        log('aviso: {} cadastro(s) com corretor sem contato: {}'.format(len(sem_contato), sem_contato[:10]))

    ok, motivo = A.validar(rows, prev_rows, catmap)
    if not ok:
        _fail(motivo)

    A.backup_prev(ROWS_ALL, prefix='completo')
    A.write_rows(ROWS_ALL, rows)
    log('dados/rows_all.json gravado: {} cadastros'.format(len(rows)))
    por_funil = Counter(r.get('funil') or '(sem funil)' for r in rows)
    log('por funil: ' + ', '.join('{}={}'.format(k, v) for k, v in sorted(por_funil.items())))

    A.rebuild('completo')
    A.publish_index_2()
    log('index_2.html regenerado (com metas noindex).')

    publicou = A.git_publish(['index_2.html'])
    log('resumo: ' + A.resumo_diff(prev_rows, rows))
    dur = (datetime.datetime.now() - t0).total_seconds()
    log('==== fim COMPLETO (sucesso, {}publicado) — {:.1f}s ===='.format('' if publicou else 'NÃO ', dur))


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        log('EXCEÇÃO NÃO TRATADA — abortando SEM publicar:\n' + traceback.format_exc())
        sys.exit(1)
