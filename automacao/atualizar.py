#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automação de atualização do Painel do Funil de Pasta — Nexo Gestão Imobiliária.

Faz sozinho o que hoje é manual: login no Imobmeet -> extrai leads e contatos
de corretores -> valida os dados -> reconstrói o HTML -> publica no GitHub
Pages. Não chama a API da Claude em nenhum momento — é só Python + Playwright.

USO:
    cd automacao
    python atualizar.py            # roda tudo, publica se passar nas validações
    DRY_RUN=1 python atualizar.py  # roda tudo, mas NÃO publica (não commita/push)
    HEADLESS=0 python atualizar.py # abre o Chrome visível (útil para depurar login)

O navegador usado é o Google Chrome instalado na máquina (Playwright com
channel='chrome'), não o Chromium que o Playwright baixaria por padrão —
a pedido do usuário (09/09/2026), pra abrir o Imobmeet sempre no Chrome real.

PRÉ-REQUISITOS (ver README.md nesta pasta para o passo a passo completo):
    pip install playwright
    ter o Google Chrome instalado nesta máquina (não precisa de
    `playwright install chromium` — o script usa o Chrome real via channel='chrome')
    copiar .env.example para .env e preencher IMOBMEET_USER / IMOBMEET_PASS
    ter credencial git já configurada para a conta alexsborne nesta máquina
    (é a mesma exigida para o fluxo manual — ver CONTEXTO.md, seção 5)

✅ LOGIN AUTOMÁTICO VERIFICADO (09/09/2026): `login()` foi testado contra a
tela real (`HEADLESS=0`, `DRY_RUN=1`) e funciona de ponta a ponta. A 1ª versão
falhava por dois motivos, já corrigidos: (1) `IMOBMEET_LOGIN_URL` padrão
apontava para `<BASE_URL>/login`, que dá "página não encontrada" — a tela de
login é a própria raiz do site; (2) o Imobmeet tem um bug próprio no HTML
(`<label for="password">` não bate com o `id="senha"` real do campo), então
`get_by_label` nunca achava o campo de senha — troquei para `#email`/`#senha`
direto. Se o Imobmeet mudar o layout de novo, rode com `HEADLESS=0` pra ver
onde trava.

Passos, na ordem (ver CONTEXTO.md seção 8 para a lógica de conversão que este
script reproduz em Python em vez de fazer manualmente/ad-hoc):
  1. login no Imobmeet via Playwright
  2. extrai leads+fichas (extracao/01) e, só para responsáveis novos, contatos
     de corretores (extracao/02) — tudo via page.evaluate(), sem download nem
     localStorage: o valor volta direto pro Python no retorno do evaluate()
  3. converte para o formato de dados/rows.json e roda as validações da
     seção 8 do CONTEXTO.md — qualquer falha aborta ANTES de tocar em
     dados/rows.json ou publicar
  4. python rebuild2.py
  5. copia pra index.html com os metas noindex
  6. confere qualidade/quantitativos (automacao/verificar_quantitativos.js — mesma
     checagem usada pela skill atualizar_servidor: somas por etapa/responsável/equipe,
     n_tags, Previsão x Execução, sintaxe do HTML gerado) — falha aqui aborta ANTES de
     publicar, igual às validações do passo 3
  7. publica em alexsborne/huna (clone dedicado desta automação, nunca a
     pasta de trabalho do usuário)
  8. grava log com timestamp e resumo em automacao/log.txt
"""
import os
import re
import sys
import json
import shutil
import datetime
import unicodedata
import subprocess
import traceback
from pathlib import Path
from collections import Counter

AUTOMACAO_DIR = Path(__file__).resolve().parent
BASE = AUTOMACAO_DIR.parent                       # .../handoff
SRC = BASE / 'src'
DADOS = BASE / 'dados'
LOG_PATH = AUTOMACAO_DIR / 'log.txt'
BACKUP_DIR = AUTOMACAO_DIR / 'backups'
CLONE_DIR = Path(os.environ.get('GIT_CLONE_DIR', AUTOMACAO_DIR / '_publish_clone'))
REPO_URL = 'https://github.com/alexsborne/huna.git'
# GIT_INPLACE=1: usado pelo GitHub Actions — o próprio checkout do runner JÁ é o
# repositório alexsborne/huna (com push liberado via GITHUB_TOKEN), então publicar
# não precisa clonar/resetar um diretório separado: só commitar+dar push no lugar.
GIT_INPLACE = os.environ.get('GIT_INPLACE', '0') == '1'
IMOBMEET_BASE = os.environ.get('IMOBMEET_BASE_URL', 'https://crm.imobmeet.com.br')

DRY_RUN = os.environ.get('DRY_RUN', '0') == '1'
LOGIN_MODE = os.environ.get('LOGIN_MODE', 'auto')   # 'auto' (IMOBMEET_USER/PASS) ou 'manual' (humano loga na janela)
HEADLESS = (os.environ.get('HEADLESS', '1') != '0') and LOGIN_MODE != 'manual'


# ===== log / falha =====

def log(msg):
    line = '[{}] {}'.format(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'), msg)
    print(line)
    with open(LOG_PATH, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def fail(msg):
    log('ERRO — abortando SEM publicar: ' + msg)
    sys.exit(1)


def run(cmd, cwd=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8')
    if r.returncode != 0:
        raise RuntimeError('comando falhou ({}): {}\nstdout: {}\nstderr: {}'.format(
            r.returncode, ' '.join(cmd), r.stdout, r.stderr))
    return r.stdout


# ===== .env sem depender de pacote externo =====

def load_env(path):
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


# ===== normalização / parsing (replica CONTEXTO.md seção 8) =====

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'\s+', ' ', s).lower().strip()


def parse_valor(s):
    """"R$ 12.000,00" -> 12000 ; "R$ 0,00"/"" -> 0 (nunca None — convenção do resto do código)."""
    if not s:
        return 0
    s = s.replace('R$', '').strip().replace('.', '').replace(',', '.')
    try:
        return round(float(s))
    except ValueError:
        return 0


SEMEMAIL_RE = re.compile(r'^\d+@sememail\.com$', re.I)


# ===== extração 1: leads + ficha (porta de extracao/01_leads_e_detalhes.js) =====

LEADS_JS = r"""
async () => {
  const w = Livewire.all().find(c => c.name === 'leads-table').$wire;
  await w.set('tableFilters.funil.funil', '128');
  await w.set('tableRecordsPerPage', 'all');
  await new Promise(r => setTimeout(r, 12000));

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

  await w.set('tableRecordsPerPage', '5');
  await new Promise(r => setTimeout(r, 4000));

  const det = {};
  for (let i = 0; i < rows.length; i += 4) {
    await Promise.all(rows.slice(i, i + 4).map(async r => {
      try {
        const h = await fetch('/leads/details/' + r.id, { credentials: 'same-origin' }).then(x => x.text());
        const d = document.implementation.createHTMLDocument('');
        d.body.innerHTML = h.replace(/<script[\s\S]*?<\/script>/gi, '');
        const tags = [...d.querySelectorAll('#tagsSelect2 option')]
          .filter(o => o.hasAttribute('selected')).map(o => o.textContent.trim());
        const sv = sel => { const o = d.querySelector(sel + ' option[selected]'); return o ? o.textContent.trim() : ''; };
        const pp = sv('select[name=planodepagamento]');
        const t = (d.body.textContent || '').replace(/\s+/g, ' ');
        const g = re => { const m = t.match(re); return m ? m[1].trim() : ''; };
        det[r.id] = {
          tags, pp,
          email:  g(/Email:\s*(\S+)/i),
          tel:    g(/Telefone:\s*([+\d()\-\s]{8,25})/i),
          neg:    g(/Valor do Neg.cio:\s*(R\$[\d.,\s]+)/i),
          renda:  g(/Valor de Renda:\s*(R\$[\d.,\s]+)/i),
          fin:    g(/Finalidade da compra:\s*([^:]{0,40}?)\s*Cadastrado:/i),
          upd:    g(/ltima atualiza..o:\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/)
        };
        d.body.innerHTML = '';
      } catch (e) { det[r.id] = { err: String(e).slice(0, 120) }; }
    }));
  }
  return rows.map(r => Object.assign({}, r, { det: det[r.id] || { err: 'sem resposta' } }));
}
"""

# ===== extração 2: contato dos corretores (porta de extracao/02_contato_dos_corretores.js) =====

CONTATOS_JS = r"""
async (names) => {
  const w = Livewire.all().find(c => c.name === 'users.list-users').$wire;
  const norm = s => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const U = {};
  for (const nm of names) {
    try {
      await w.set('tableSearch', nm.split(' - ')[0].slice(0, 40));
      await new Promise(r => setTimeout(r, 2200));
      const rows = [...document.querySelectorAll('table tbody tr')].map(tr => {
        const td = [...tr.querySelectorAll('td')].map(c => c.innerText.replace(/\s+/g, ' ').trim());
        const a = tr.querySelector('a[href*="/users/edit/"]');
        return { id: a ? a.getAttribute('href').split('/').pop() : null, nome: td[2], email: td[3] };
      }).filter(r => r.id);
      const hit = rows.find(r => norm(r.nome) === norm(nm)) || rows[0] || null;
      U[nm] = hit ? { id: hit.id, nome: hit.nome, email: hit.email } : { miss: 1 };
    } catch (e) { U[nm] = { err: String(e).slice(0, 60) }; }
  }
  const ks = Object.keys(U);
  for (let i = 0; i < ks.length; i += 4) {
    await Promise.all(ks.slice(i, i + 4).map(async k => {
      const u = U[k]; if (!u.id) return;
      const h = await fetch('/users/edit/' + u.id, { credentials: 'same-origin' }).then(x => x.text());
      const d = document.implementation.createHTMLDocument('');
      d.body.innerHTML = h.replace(/<script[\s\S]*?<\/script>/gi, '');
      const g = n => { const e = d.querySelector('[name="' + n + '"],#' + n); return e ? (e.value || '').trim() : ''; };
      u.cel = g('celular'); u.mail2 = g('email');
      d.body.innerHTML = '';
    }));
  }
  return U;
}
"""


def login(page, user, pwd, login_url):
    """Verificado contra a tela de login real em 09/09/2026 (ver seção 8 do CONTEXTO.md).
    Usa `#email`/`#senha` diretos — a página tem um bug próprio (`<label for="password">`
    não bate com o `id="senha"` real do input), então `get_by_label` nunca encontrava o
    campo de senha; os IDs em si são estáveis e conferidos na tela real."""
    page.goto(login_url, wait_until='domcontentloaded')
    email_field = page.locator('#email')
    pass_field = page.locator('#senha')
    email_field.fill(user, timeout=15000)
    pass_field.fill(pwd, timeout=15000)
    page.get_by_role('button', name=re.compile('entrar|login|acessar|sign ?in', re.I)).first.click()
    page.wait_for_load_state('networkidle', timeout=30000)
    if 'login' in page.url.lower():
        raise RuntimeError(
            'login não confirmado — a página ainda está em /login depois de tentar entrar. '
            'Confira IMOBMEET_USER/IMOBMEET_PASS, se há 2FA, ou se os seletores do formulário '
            'mudaram (rode com HEADLESS=0 para ver a tela).')


def manual_login(page, timeout_s=300):
    """Alternativa ao login() automático: abre o Imobmeet numa janela visível
    e espera o humano logar manualmente ali — não precisa de IMOBMEET_USER/
    IMOBMEET_PASS, e a senha nunca passa pelo Python. Detecta sucesso pela URL
    mudar e sair de /login (sem re-navegar no meio, pra não atrapalhar quem
    está digitando). Usar com LOGIN_MODE=manual (força HEADLESS=0)."""
    import time
    page.goto(IMOBMEET_BASE, wait_until='domcontentloaded')
    start_url = page.url
    log('aguardando login manual na janela do Chrome (até {}s)...'.format(timeout_s))
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        page.wait_for_timeout(2000)
        try:
            cur = page.url
        except Exception:
            continue
        if 'login' not in cur.lower() and cur != start_url:
            log('login detectado — URL mudou para ' + cur)
            return
    raise RuntimeError('tempo esgotado esperando login manual (mais de {}s).'.format(timeout_s))


def goto_with_retry(page, url, attempts=4):
    last = None
    for i in range(attempts):
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=45000)
            return
        except Exception as e:
            last = e
            log('goto retry {} {}: {}'.format(i + 1, url, e))
            page.wait_for_timeout(2000)
    raise last


def extract_leads(page):
    goto_with_retry(page, IMOBMEET_BASE + '/leads/list')
    page.wait_for_function(
        "window.Livewire && Livewire.all().some(c => c.name === 'leads-table')", timeout=30000)
    page.wait_for_timeout(3000)
    return page.evaluate(LEADS_JS)


PARSE_ROWS_JS = r"""
() => [...document.querySelectorAll('table tbody tr')].map(tr => {
  const c = [...tr.querySelectorAll('td')].map(td => td.innerText.replace(/\s*\n\s*/g, '|').trim());
  const a = tr.querySelector('a[href*="/leads/details/"]');
  return a ? {
    id: a.getAttribute('href').split('/').pop(),
    num: c[1], nome: c[2], resp: c[3], funil: c[4],
    produto: c[5], origem: c[6], cadastro: c[7]
  } : null;
}).filter(Boolean)
"""

APPLY_FUNIL_JS = r"""
async (funilId) => {
  const w = Livewire.all().find(c => c.name === 'leads-table').$wire;
  await w.set('tableFilters.funil.funil', String(funilId));
  await w.set('tableRecordsPerPage', '50');
}
"""

PAG_TOTAL_JS = r"""
() => {
  const el = document.querySelector('.fi-pagination, nav[aria-label*=agina], .fi-ta-pagination');
  const t = (el && el.innerText) || document.body.innerText;
  const m = t.match(/Exibindo\s+[\d.,]+\s+a\s+[\d.,]+\s+de\s+([\d.,]+)/i);
  return m ? parseInt(m[1].replace(/[.,]/g, ''), 10) : null;
}
"""

CLICK_NEXT_JS = r"""
() => {
  const dead = b => !b || b.disabled || b.getAttribute('aria-disabled') === 'true' || /disabled/.test(b.className);
  const btn = [...document.querySelectorAll('button, a')].find(b => {
    const al = (b.getAttribute('aria-label') || '').toLowerCase();
    const click = (b.getAttribute('wire:click') || '');
    return /pr[oó]xima|next/.test(al) || click.includes('nextPage');
  });
  if (btn && !dead(btn)) { btn.click(); return true; }
  const items = [...document.querySelectorAll('.fi-pagination button, .fi-pagination a, nav[aria-label*=agina] button')];
  const cur = items.findIndex(b => b.getAttribute('aria-current') === 'page' || /fi-active|\bactive\b/.test(b.className));
  if (cur >= 0 && items[cur + 1] && !dead(items[cur + 1])) { items[cur + 1].click(); return true; }
  return false;
}
"""

DETAILS_JS = r"""
async (ids) => {
  const det = {};
  for (let i = 0; i < ids.length; i += 8) {
    await Promise.all(ids.slice(i, i + 8).map(async id => {
      try {
        const h = await fetch('/leads/details/' + id, { credentials: 'same-origin' }).then(x => x.text());
        const d = document.implementation.createHTMLDocument('');
        d.body.innerHTML = h.replace(/<script[\s\S]*?<\/script>/gi, '');
        const tags = [...d.querySelectorAll('#tagsSelect2 option')]
          .filter(o => o.hasAttribute('selected')).map(o => o.textContent.trim());
        const sv = sel => { const o = d.querySelector(sel + ' option[selected]'); return o ? o.textContent.trim() : ''; };
        const pp = sv('select[name=planodepagamento]');
        const t = (d.body.textContent || '').replace(/\s+/g, ' ');
        const g = re => { const m = t.match(re); return m ? m[1].trim() : ''; };
        det[id] = {
          tags, pp,
          email:  g(/Email:\s*(\S+)/i),
          tel:    g(/Telefone:\s*([+\d()\-\s]{8,25})/i),
          neg:    g(/Valor do Neg.cio:\s*(R\$[\d.,\s]+)/i),
          renda:  g(/Valor de Renda:\s*(R\$[\d.,\s]+)/i),
          fin:    g(/Finalidade da compra:\s*([^:]{0,40}?)\s*Cadastrado:/i),
          upd:    g(/ltima atualiza..o:\s*(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/)
        };
        d.body.innerHTML = '';
      } catch (e) { det[id] = { err: String(e).slice(0, 120) }; }
    }));
  }
  return det;
}
"""


def open_leads_table(page):
    goto_with_retry(page, IMOBMEET_BASE + '/leads/list')
    page.wait_for_function(
        "window.Livewire && Livewire.all().some(c => c.name === 'leads-table')", timeout=30000)
    page.wait_for_timeout(3000)


GOTO_PAGE_JS = r"""
async (n) => {
  const c = Livewire.all().find(x => x.name === 'leads-table');
  if (!c) throw new Error('leads-table sumiu');
  const w = c.$wire;
  if (typeof w.gotoPage === 'function') await w.gotoPage(n, 'page');
  else if (typeof w.call === 'function') await w.call('gotoPage', n, 'page');
  else throw new Error('gotoPage indisponível no $wire');
}
"""

FIRST_ID_JS = r"""
() => {
  const a = document.querySelector('table tbody tr a[href*="/leads/details/"]');
  return a ? a.getAttribute('href').split('/').pop() : null;
}
"""


def _apply_funil(page, funil_id):
    open_leads_table(page)
    page.evaluate(APPLY_FUNIL_JS, str(funil_id))
    page.wait_for_timeout(10000)


def _wait_first_id(page, previous, timeout_ms=15000):
    page.wait_for_timeout(800)
    elapsed = 0
    while elapsed < timeout_ms:
        cur = page.evaluate(FIRST_ID_JS)
        if cur and cur != previous:
            return cur
        page.wait_for_timeout(500)
        elapsed += 500
    return page.evaluate(FIRST_ID_JS)


def extract_funil_list(page, funil_id):
    """Lista paginada (50/página) de um funil — usado pelo painel completo (~3 mil no Funil de Venda)."""
    _apply_funil(page, funil_id)
    total = page.evaluate(PAG_TOTAL_JS) or 0
    per_page = 50
    n_pages = max(1, (total + per_page - 1) // per_page) if total else 80
    log('funil {}: {} cadastro(s) anunciado(s), {} página(s)'.format(funil_id, total or '?', n_pages))
    all_rows, seen = [], set()
    prev_first = None
    pnum = 1
    stall = 0
    while pnum <= n_pages and pnum <= 80:
        if pnum > 1:
            try:
                page.evaluate(GOTO_PAGE_JS, pnum)
            except Exception as e:
                log('gotoPage({}) falhou ({}) — recarregando listagem'.format(pnum, e))
                _apply_funil(page, funil_id)
                page.evaluate(GOTO_PAGE_JS, pnum)
            first = _wait_first_id(page, prev_first)
            if first == prev_first:
                stall += 1
                log('página {} não mudou o 1º id — recarregando (tentativa {})'.format(pnum, stall))
                _apply_funil(page, funil_id)
                page.evaluate(GOTO_PAGE_JS, pnum)
                first = _wait_first_id(page, prev_first, timeout_ms=20000)
                if first == prev_first:
                    if stall >= 3:
                        log('parado na página {} após 3 recargas sem linhas novas'.format(pnum))
                        break
                    pnum += 1
                    continue
                stall = 0
            else:
                stall = 0
        batch = page.evaluate(PARSE_ROWS_JS)
        new = 0
        for r in batch:
            if r['id'] not in seen:
                seen.add(r['id'])
                all_rows.append(r)
                new += 1
        prev_first = page.evaluate(FIRST_ID_JS)
        log('funil {} página {}/{}: +{} (acc {}/{})'.format(
            funil_id, pnum, n_pages, new, len(all_rows), total or '?'))
        if total and len(all_rows) >= total:
            break
        pnum += 1
    return all_rows


def fetch_details(page, ids):
    det = {}
    chunk = 40
    for i in range(0, len(ids), chunk):
        part_ids = ids[i:i + chunk]
        log('fichas {}/{}'.format(min(i + chunk, len(ids)), len(ids)))
        part = page.evaluate(DETAILS_JS, part_ids)
        det.update(part)
    missing = [i for i in ids if i not in det or det[i].get('err')]
    if missing:
        log('re-tentando {} ficha(s) com erro'.format(len(missing)))
        part = page.evaluate(DETAILS_JS, missing)
        det.update(part)
    return det


def extract_contatos(page, names):
    if not names:
        return {}
    goto_with_retry(page, IMOBMEET_BASE + '/users')
    page.wait_for_function(
        "window.Livewire && Livewire.all().some(c => c.name === 'users.list-users')", timeout=30000)
    page.wait_for_timeout(3000)
    result = page.evaluate(CONTATOS_JS, names)
    out, faltando = {}, []
    for nome, u in result.items():
        if u.get('miss') or u.get('err') or not u.get('id'):
            faltando.append(nome)
            continue
        out[nome] = {'nome': nome, 'tel': u.get('cel') or '', 'email': u.get('mail2') or u.get('email') or ''}
    if faltando:
        log('aviso: {} corretor(es) não encontrados na listagem de usuários: {}'.format(len(faltando), faltando))
    return out


# ===== contatos.tsv (nome \t celular \t email, sem cabeçalho) =====

def load_contatos(path):
    out = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if not line.strip():
                continue
            parts = line.split('\t')
            nome = parts[0] if len(parts) > 0 else ''
            tel = parts[1] if len(parts) > 1 else ''
            email = parts[2] if len(parts) > 2 else ''
            out[norm(nome)] = {'nome': nome, 'tel': tel, 'email': email}
    return out


def save_contatos(path, contatos):
    linhas = ['{}\t{}\t{}'.format(c['nome'], c['tel'], c['email'])
              for c in sorted(contatos.values(), key=lambda c: c['nome'])]
    path.write_text('\n'.join(linhas) + '\n', encoding='utf-8')


# ===== conversão para o formato de dados/rows.json (CONTEXTO.md seção 8) =====

def build_rows(raw, extraction_dt):
    rows, erros = [], []
    for r in raw:
        det = r.get('det') or {}
        rid = r.get('id') or '?'
        if det.get('err'):
            erros.append('{} — ficha não carregou: {}'.format(rid, det['err']))
            continue

        resp_parts = (r.get('resp') or '').split('|')
        responsavel = resp_parts[0].strip() if resp_parts else ''
        equipe = resp_parts[1].strip() if len(resp_parts) > 1 else ''

        funil_parts = (r.get('funil') or '').split('|')
        funil_nome = funil_parts[0].strip() if funil_parts else ''
        etapa = funil_parts[1].strip() if len(funil_parts) > 1 else funil_nome

        email = det.get('email') or ''
        sem_email = 'Sim' if SEMEMAIL_RE.match(email) else 'Não'

        cad_raw = r.get('cadastro') or ''
        try:
            cad_dt = datetime.datetime.strptime(cad_raw, '%d/%m/%Y %H:%M')
        except ValueError:
            erros.append('{} — data de cadastro ilegível: {!r}'.format(rid, cad_raw))
            continue

        upd_raw = det.get('upd') or ''
        try:
            upd_dt = datetime.datetime.strptime(upd_raw, '%d/%m/%Y %H:%M')
        except ValueError:
            upd_dt = None

        dias_cadastro = (extraction_dt.date() - cad_dt.date()).days
        dias_sem_mov = (extraction_dt.date() - upd_dt.date()).days if upd_dt else dias_cadastro
        iso = cad_dt.isocalendar()
        tags = det.get('tags') or []

        rows.append({
            'lead_id': rid, 'numero': r.get('num') or '', 'nome': r.get('nome') or '',
            'telefone': det.get('tel') or '', 'email': email, 'sem_email': sem_email,
            'etapa': etapa, 'funil': funil_nome, 'responsavel': responsavel, 'equipe': equipe,
            'produto': r.get('produto') or '', 'origem': r.get('origem') or '',
            'finalidade': det.get('fin') or '',
            'valor_renda': parse_valor(det.get('renda')), 'valor_negocio': parse_valor(det.get('neg')),
            'plano_pagamento': det.get('pp') or '',
            'cadastro': cad_raw, 'mes': cad_dt.strftime('%Y-%m'),
            'ultima_atualizacao': upd_raw,
            'dias_sem_movimento': dias_sem_mov, 'n_tags': len(tags), 'tags_list': tags,
            'dias_cadastro': dias_cadastro, 'semana': '{}-W{:02d}'.format(iso[0], iso[1]),
            'data': cad_dt.strftime('%Y-%m-%d'),
            'resp_tel': '', 'resp_email': '',
        })
    rows.sort(key=lambda x: int(x['lead_id']))
    return rows, erros


# ===== validações — seção 8 do CONTEXTO.md =====

def validar(rows, prev_rows, catmap):
    if not rows:
        return False, 'extração devolveu 0 cadastros.'

    ids = [r['lead_id'] for r in rows]
    if len(ids) != len(set(ids)):
        dup = [k for k, v in Counter(ids).items() if v > 1]
        return False, 'lead_id duplicado: {}'.format(dup)

    for r in rows:
        if r['n_tags'] != len(r['tags_list']):
            return False, 'n_tags não bate com tags_list em {}'.format(r['lead_id'])

    used_tags = set()
    for r in rows:
        used_tags.update(r['tags_list'])
    desconhecidas = sorted(t for t in used_tags if t not in catmap)
    if desconhecidas:
        return False, ('tag(s) nova(s) fora de dados/catmap.json — decidir a categoria manualmente antes de '
                        'publicar (regra do projeto: nunca deixar passar sem olhar): {}').format(desconhecidas)

    if prev_rows and len(rows) < len(prev_rows) * 0.5:
        return False, ('queda suspeita: {} cadastros contra {} da execução anterior (mais de 50% a menos) — '
                        'provável falha silenciosa na extração, não uma queda real de leads.').format(
            len(rows), len(prev_rows))

    return True, ''


def resumo_diff(prev_rows, rows):
    prev_ids = {r['lead_id'] for r in prev_rows}
    new_ids = {r['lead_id'] for r in rows}
    novos, sumidos = new_ids - prev_ids, prev_ids - new_ids
    et = Counter(r['etapa'] for r in rows)
    partes = [
        '{} cadastros ({} novo(s), {} sumiu/sumiram)'.format(len(rows), len(novos), len(sumidos)),
        '{} marcações de tag'.format(sum(r['n_tags'] for r in rows)),
        'etapas: ' + ', '.join('{}={}'.format(k, v) for k, v in sorted(et.items())),
    ]
    return ' · '.join(partes)


# ===== escrita / build / publicação =====

def write_rows(path, rows):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)


def backup_prev(rows_path, prefix='rows'):
    if not rows_path.exists():
        return
    BACKUP_DIR.mkdir(exist_ok=True)
    dest = BACKUP_DIR / '{}_{}.json'.format(prefix, datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
    shutil.copy(rows_path, dest)
    backups = sorted(BACKUP_DIR.glob(prefix + '_*.json'))
    for old in backups[:-20]:
        old.unlink()


def rebuild(panel='pasta'):
    cmd = ['python', 'rebuild2.py'] if panel == 'pasta' else ['python', 'rebuild2.py', panel]
    out = run(cmd, cwd=str(SRC))
    if 'ok' not in out.lower():
        raise RuntimeError('rebuild2.py não confirmou sucesso: {}'.format(out))
    log('rebuild2.py: ' + out.strip())


def verificar_quantitativos():
    """Roda automacao/verificar_quantitativos.js — a mesma conferência de qualidade/somatórios
    entre abas que a skill atualizar_servidor usa — contra dados/rows.json e o HTML recém-gerado.
    Devolve (ok, saida). Sem isso, uma rotina agendada (Task Scheduler/GitHub Actions) publicaria
    direto sem passar pelo mesmo crivo que uma execução manual via skill passa (é exatamente o que
    aconteceu antes de existir este script: a v4.16 quase foi ao ar com a tabela SIENA2 desatualizada
    e um bug de sintaxe, os dois só achados por revisão manual)."""
    script = AUTOMACAO_DIR / 'verificar_quantitativos.js'
    if not script.exists():
        log('aviso: automacao/verificar_quantitativos.js não encontrado — pulando conferência de qualidade.')
        return True, ''
    r = subprocess.run(['node', str(script), str(BASE)], capture_output=True, text=True, encoding='utf-8')
    return r.returncode == 0, ((r.stdout or '') + (r.stderr or '')).strip()


def inject_noindex(content):
    anchor = '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    metas = '<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">\n<meta name="googlebot" content="noindex,nofollow">\n'
    if anchor not in content:
        raise RuntimeError('template de src/rebuild2.py mudou — a âncora do <meta viewport> não foi encontrada; '
                            'atualizar inject_noindex() em atualizar.py.')
    return content.replace(anchor, anchor + metas, 1)


def publish_index():
    src_html = SRC / 'Painel_Funil_de_Pasta_Nexo.html'
    (BASE / 'funilpastas.html').write_text(inject_noindex(src_html.read_text(encoding='utf-8')), encoding='utf-8')


def publish_index_2():
    src_html = SRC / 'Painel_Imobmeet_Completo.html'
    (BASE / 'index_2.html').write_text(inject_noindex(src_html.read_text(encoding='utf-8')), encoding='utf-8')


def ensure_git_identity(target_dir):
    def cfg(key):
        r = subprocess.run(['git', '-C', str(target_dir), 'config', '--get', key],
                           capture_output=True, text=True, encoding='utf-8')
        return (r.stdout or '').strip()
    if not cfg('user.email') or not cfg('user.name'):
        run(['git', '-C', str(target_dir), 'config', 'user.email', 'alexandrecientista@gmail.com'])
        run(['git', '-C', str(target_dir), 'config', 'user.name', 'Alexandre'])
        log('git identity local definida (Alexandre / alexandrecientista@gmail.com).')


def git_publish(files=None):
    files = files or ['funilpastas.html']
    if DRY_RUN:
        log('DRY_RUN=1 — pulando publicação no GitHub.')
        return False
    if GIT_INPLACE:
        # BASE já É o checkout de alexsborne/huna (GitHub Actions) — nada pra clonar.
        target_dir = BASE
    else:
        if CLONE_DIR.exists():
            run(['git', '-C', str(CLONE_DIR), 'fetch', 'origin', 'main'])
            run(['git', '-C', str(CLONE_DIR), 'reset', '--hard', 'origin/main'])
        else:
            run(['git', 'clone', REPO_URL, str(CLONE_DIR)])
        for f in files:
            src = BASE / f
            if not src.exists():
                raise RuntimeError('arquivo para publicar não existe: ' + str(src))
            dest = CLONE_DIR / f
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dest)
        target_dir = CLONE_DIR
    ensure_git_identity(target_dir)
    status = run(['git', '-C', str(target_dir), 'status', '--porcelain', '--'] + files)
    if not status.strip():
        log('publicação: {} não mudou, nada para commitar/publicar.'.format(', '.join(files)))
        return False
    run(['git', '-C', str(target_dir), 'add', '--'] + files)
    msg = 'Atualização automática — {}'.format(datetime.datetime.now().strftime('%d/%m/%Y %H:%M'))
    run(['git', '-C', str(target_dir), 'commit', '-m', msg])
    run(['git', '-C', str(target_dir), 'push', 'origin', 'main'])
    log('publicado em alexsborne/huna ({}).'.format(', '.join(files)))
    return True


# ===== orquestração =====

def main():
    t0 = datetime.datetime.now()
    log('==== início ==== (DRY_RUN={}, LOGIN_MODE={}, HEADLESS={})'.format(DRY_RUN, LOGIN_MODE, HEADLESS))
    load_env(AUTOMACAO_DIR / '.env')
    if LOGIN_MODE == 'manual':
        user = pwd = None
        login_url = None
    else:
        user, pwd = os.environ.get('IMOBMEET_USER'), os.environ.get('IMOBMEET_PASS')
        if not user or not pwd:
            fail('IMOBMEET_USER / IMOBMEET_PASS não definidos (automacao/.env ou variável de ambiente). '
                 'Ou rode com LOGIN_MODE=manual para logar você mesmo numa janela visível.')
        # A tela de login é a própria raiz do site (`/login` dá "página não encontrada" —
        # confirmado navegando lá em 09/09/2026); só existe `IMOBMEET_LOGIN_URL` como
        # variável de ambiente pra sobrescrever se o Imobmeet mudar isso de novo.
        login_url = os.environ.get('IMOBMEET_LOGIN_URL', IMOBMEET_BASE)

    rows_path = DADOS / 'rows.json'
    prev_rows = json.loads(rows_path.read_text(encoding='utf-8')) if rows_path.exists() else []
    catmap = json.loads((DADOS / 'catmap.json').read_text(encoding='utf-8'))
    contatos_path = DADOS / 'contatos.tsv'
    contatos = load_contatos(contatos_path)

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=HEADLESS, channel='chrome')
        page = browser.new_page()
        try:
            if LOGIN_MODE == 'manual':
                manual_login(page)
            else:
                login(page, user, pwd, login_url)
            log('login ok')

            raw = extract_leads(page)
            log('extração de leads: {} linha(s) bruta(s)'.format(len(raw)))

            rows, erros = build_rows(raw, t0)
            if erros:
                fail('{} ficha(s) com problema: {}'.format(len(erros), erros[:10]))

            faltantes = sorted({r['responsavel'] for r in rows if norm(r['responsavel']) not in contatos})
            if faltantes:
                log('buscando contato de {} corretor(es) novo(s): {}'.format(len(faltantes), faltantes))
                novos = extract_contatos(page, faltantes)
                for nome, info in novos.items():
                    contatos[norm(nome)] = info
                save_contatos(contatos_path, contatos)
        finally:
            browser.close()

    for r in rows:
        c = contatos.get(norm(r['responsavel']))
        if c:
            r['resp_tel'], r['resp_email'] = c['tel'], c['email']
        # não achar o corretor na listagem do Imobmeet não trava mais a publicação
        # (pedido do usuário, 10/09/2026) — só vira um ponto de atenção no próprio
        # relatório (aba Pontos de Atenção, a6.js), e só aparece lá se o cadastro
        # ainda estiver em tramitação inicial (mesmo filtro dos outros alertas).
        r['corretor_sem_contato'] = not r['resp_tel'] and not r['resp_email']

    sem_contato = [r['lead_id'] for r in rows if r['corretor_sem_contato']]
    if sem_contato:
        log('aviso: {} cadastro(s) com corretor sem telefone/e-mail localizado no Imobmeet: {}'.format(
            len(sem_contato), sem_contato[:10]))

    ok, motivo = validar(rows, prev_rows, catmap)
    if not ok:
        fail(motivo)

    backup_prev(rows_path)
    write_rows(rows_path, rows)
    log('dados/rows.json gravado: {} cadastros'.format(len(rows)))

    rebuild()
    publish_index()
    log('index.html regenerado (com metas noindex).')

    ok_verif, saida_verif = verificar_quantitativos()
    log('conferência de qualidade/quantitativos:\n' + saida_verif)
    if not ok_verif:
        fail('conferência de qualidade/quantitativos entre abas falhou (ver log acima) — publicação '
             'abortada. Causa mais comum: equipe/imobiliária nova fora das tabelas METAS/SIENA2 em '
             'src/a1.js. Corrigir e rodar de novo (manualmente, ou via skill atualizar_servidor).')

    # Deliberado: mesmo em GIT_INPLACE (nuvem), só index.html é commitado — nunca
    # dados/rows.json nem contatos.tsv. São dados pessoais de clientes/corretores; já
    # aparecem embutidos no index.html publicado (risco aceito, ver CONTEXTO.md), mas um
    # 2º arquivo estruturado só com isso facilitaria raspagem em massa. Efeito colateral:
    # no runner do GitHub Actions o checkout é descartado a cada execução, então cada
    # rodada em nuvem faz extração cheia (sem "novos/sumiram" comparado à rodada anterior,
    # e rebusca contato de corretor mesmo já visto antes) — aceitável pelo volume atual.
    publicou = git_publish(['funilpastas.html'])
    log('resumo: ' + resumo_diff(prev_rows, rows))
    dur = (datetime.datetime.now() - t0).total_seconds()
    log('==== fim (sucesso, {}publicado) — {:.1f}s ===='.format('' if publicou else 'NÃO ', dur))


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        log('EXCEÇÃO NÃO TRATADA — abortando SEM publicar:\n' + traceback.format_exc())
        sys.exit(1)
