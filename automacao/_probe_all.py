#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sonda pontual: volume de leads SEM filtrar Funil de Pasta, e opções de funil."""
import os, re, json, sys
from pathlib import Path

AUTOMACAO = Path(__file__).resolve().parent
sys.path.insert(0, str(AUTOMACAO))

def load_env(path):
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

load_env(AUTOMACAO / '.env')
from atualizar import login, IMOBMEET_BASE, HEADLESS

user, pwd = os.environ.get('IMOBMEET_USER'), os.environ.get('IMOBMEET_PASS')
login_url = os.environ.get('IMOBMEET_LOGIN_URL', IMOBMEET_BASE)
if not user or not pwd:
    raise SystemExit('faltam IMOBMEET_USER/PASS')

PROBE_JS = r"""
() => {
  const c = Livewire.all().find(x => x.name === 'leads-table');
  const w = c ? c.$wire : null;
  const pagTxt = (document.body.innerText.match(/mostrando[^\n]{0,80}|showing[^\n]{0,80}|de\s+[\d.\s]+result/i) || [''])[0];
  const selects = [...document.querySelectorAll('select')].map(s => ({
    name: s.name || s.id || s.getAttribute('wire:model') || '',
    n: s.options.length,
    opts: [...s.options].slice(0, 40).map(o => ({v: o.value, t: o.textContent.trim()}))
  }));
  let snapshot = null;
  try {
    snapshot = c && c.snapshot ? {
      dataKeys: Object.keys(c.snapshot.data || {}),
      memKeys: Object.keys((c.snapshot.memo || {}).data || {}),
      paginators: (c.snapshot.data || {}).paginators || (c.snapshot.memo || {}).paginators || null,
      tableFilters: (c.snapshot.data || {}).tableFilters || null,
      tableRecordsPerPage: (c.snapshot.data || {}).tableRecordsPerPage || null,
    } : null;
  } catch (e) { snapshot = {err: String(e)}; }
  const nTr = document.querySelectorAll('table tbody tr').length;
  return {has: !!c, pagTxt, nTr, selects, snapshot, url: location.href};
}
"""

from playwright.sync_api import sync_playwright
out = {}
print('launch', flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    page = browser.new_page()
    try:
        print('login...', flush=True)
        login(page, user, pwd, login_url)
        print('login ok url=' + page.url, flush=True)
        last = None
        for attempt in range(4):
            try:
                page.goto(IMOBMEET_BASE + '/leads/list', wait_until='domcontentloaded', timeout=45000)
                last = None
                break
            except Exception as e:
                last = e
                print('goto retry {} {}'.format(attempt + 1, e), flush=True)
                page.wait_for_timeout(2000)
        if last:
            raise last
        page.wait_for_function(
            "window.Livewire && Livewire.all().some(c => c.name === 'leads-table')", timeout=30000)
        page.wait_for_timeout(4000)
        print('leads-table ok', flush=True)
        dump = page.evaluate(r"""() => {
          const html = document.documentElement.innerHTML;
          const ids = [...html.matchAll(/funil[^0-9]{0,20}(\d{2,5})/gi)].map(m => m[1]);
          const names = [...html.matchAll(/Funil de [A-Za-zÁ-ú0-9 \-]{2,40}/g)].map(m => m[0]);
          const gestao = [...html.matchAll(/\/leads\/gestao\/(\d+)/g)].map(m => m[1]);
          const selects = [...document.querySelectorAll('select')].map(s => ({
            name: s.getAttribute('name')||s.id||'',
            wire: s.getAttribute('wire:model')||s.getAttribute('wire:model.live')||'',
            n: s.options.length,
            opts: [...s.options].slice(0,25).map(o => o.value+'|'+o.textContent.trim())
          }));
          const comps = Livewire.all().map(c => c.name);
          return {comps, nSelects: selects.length, selects, uniqIds:[...new Set(ids)].slice(0,40),
                  names:[...new Set(names)].slice(0,40), gestao:[...new Set(gestao)]};
        }""")
        out['dump'] = dump
        print('dump=' + json.dumps(dump, ensure_ascii=False)[:5000], flush=True)

        # tenta abrir o filtro de funil na UI
        clicked = page.evaluate(r"""() => {
          const cand = [...document.querySelectorAll('button, a, label, span, div')]
            .filter(el => /^\s*funil\s*$/i.test((el.textContent||'').trim()) || /selecione um funil/i.test(el.textContent||''));
          return cand.slice(0,6).map(el => ({tag: el.tagName, t: (el.textContent||'').trim().slice(0,60), cls: el.className}));
        }""")
        out['cand'] = clicked
        print('cand=' + json.dumps(clicked, ensure_ascii=False)[:2000], flush=True)

        # Funil de Venda: volume + etapas
        venda = page.evaluate(r"""async () => {
          const w = Livewire.all().find(c => c.name === 'leads-table').$wire;
          await w.set('tableFilters.funil.funil', '126');
          await w.set('tableRecordsPerPage', '50');
          await new Promise(r => setTimeout(r, 12000));
          const nTr = document.querySelectorAll('table tbody tr a[href*="/leads/details/"]').length;
          const body = document.body.innerText.replace(/\s+/g, ' ');
          const pag = (body.match(/mostrando.{0,80}|showing.{0,80}|de\s+[\d.\s]+result.{0,20}/i) || [''])[0];
          const funis = [...document.querySelectorAll('td')].slice(0,0);
          const rows = [...document.querySelectorAll('table tbody tr')].map(tr => {
            const c = [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\s*\n\s*/g, '|').trim());
            return c[4] || '';
          });
          const pagHtml = (document.querySelector('.fi-pagination, nav[aria-label*=agina], .fi-ta-pagination') || {}).innerText || '';
          return {nTr, pag, pagHtml, funilSamples: rows.slice(0,8), nFunilVals: new Set(rows).size};
        }""")
        out['venda'] = venda
        print('venda=' + json.dumps(venda, ensure_ascii=False)[:3000], flush=True)

        for path in ('/leads/gestao/126', '/leads/gestao/128', '/funils'):
            try:
                page.goto(IMOBMEET_BASE + path, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(2500)
                info = page.evaluate(r"""() => {
                  const links = [...document.querySelectorAll('a[href*="/leads/gestao/"]')]
                    .map(a => ({href: a.getAttribute('href'), t: (a.textContent||'').replace(/\s+/g,' ').trim().slice(0,80)}));
                  const h = document.documentElement.innerHTML;
                  const ids = [...h.matchAll(/\/leads\/gestao\/(\d+)/g)].map(m => m[1]);
                  return {url: location.href, title: document.title, nLinks: links.length,
                          links: links.slice(0,40), ids: [...new Set(ids)]};
                }""")
                out[path] = info
                print(path + '=' + json.dumps(info, ensure_ascii=False)[:2500], flush=True)
            except Exception as e:
                print(path + ' ERR ' + str(e)[:200], flush=True)
    finally:
        browser.close()

Path(AUTOMACAO / '_probe_out.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
print('done', flush=True)
