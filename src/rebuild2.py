import json, datetime, zoneinfo, sys
PANEL = sys.argv[1] if len(sys.argv) > 1 else 'pasta'
if PANEL not in ('pasta', 'completo'):
    raise SystemExit('uso: python rebuild2.py [pasta|completo]')

rows_path = '../dados/rows.json' if PANEL == 'pasta' else '../dados/rows_all.json'
rows = json.load(open(rows_path, encoding='utf-8'))
CAT = json.load(open('../dados/catmap.json', encoding='utf-8'))
keep = ['lead_id', 'numero', 'nome', 'telefone', 'email', 'sem_email', 'etapa', 'responsavel', 'equipe', 'produto', 'origem',
        'finalidade', 'valor_renda', 'valor_negocio', 'plano_pagamento', 'cadastro', 'mes', 'data', 'dias_cadastro', 'tags_list', 'resp_tel', 'resp_email']
if PANEL == 'completo':
    keep.append('funil')
slim = [{k: r.get(k) for k in keep} for r in rows]
logo = open('logo_b64.txt', encoding='utf-8').read().strip()
app = ''.join(open(f, encoding='utf-8').read() for f in ['a1.js', 'a2.js', 'a3.js', 'a4.js', 'a5.js', 'a7.js', 'a6.js'])
app = app.replace('__DATA__', json.dumps(slim, ensure_ascii=False, separators=(',', ':')))
app = app.replace('__CATMAP__', json.dumps(CAT, ensure_ascii=False))
app = app.replace('__LOGO__', logo)
app = app.replace('__PANEL__', PANEL)
BUILD = datetime.datetime.now(zoneinfo.ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M')
EXTRACAO = datetime.datetime.now(zoneinfo.ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y')
app = app.replace('__EXTRACAO__', EXTRACAO)

if PANEL == 'completo':
    meta = {
        'TITLE': 'Painel Completo Imobmeet',
        'H1': 'Painel Completo Imobmeet',
        'SUB': 'Todos os funis do CRM (Pasta + Venda) &middot; Imobmeet &middot; TAJ Empreendimentos',
        'FONTE': 'CRM Imobmeet — TAJ Empreendimentos e Participações S/A, todos os funis (Funil de Pasta ID 128 e Funil de Venda ID 126).',
        'BASE_TITLE': 'Base de Cadastros — Imobmeet completo',
    }
    out_name = 'Painel_Imobmeet_Completo.html'
else:
    meta = {
        'TITLE': 'Painel Funil de Pasta',
        'H1': 'Painel do Funil de Pasta',
        'SUB': 'Estratificação de tags, formas de pagamento e evolução da carteira &middot; CRM Imobmeet &middot; TAJ Empreendimentos',
        'FONTE': 'CRM Imobmeet — TAJ Empreendimentos e Participações S/A, Funil de Pasta (ID 128).',
        'BASE_TITLE': 'Base de Cadastros — Funil de Pasta',
    }
    out_name = 'Painel_Funil_de_Pasta_Nexo.html'

head = open('head2.html', encoding='utf-8').read()
body = open('body2.html', encoding='utf-8').read().replace('__LOGO__', logo).replace('__BUILD__', BUILD).replace('__EXTRACAO__', EXTRACAO)
for k, v in meta.items():
    head = head.replace('__' + k + '__', v)
    body = body.replace('__' + k + '__', v)
libs = '<script>\n' + open('chart.min.js', encoding='utf-8').read() + '\n</script>\n<script>\n' + open('jspdf.js', encoding='utf-8').read() + '\n</script>\n<script>\n' + open('autotable.js', encoding='utf-8').read() + '\n</script>'
script = libs + '\n<script>\n' + app + '\n</script>'
html = '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' + head + '\n</head>\n<body>\n' + body + '\n' + script + '\n</body>\n</html>'
if PANEL == 'pasta':
    open('artifact_body2.html', 'w', encoding='utf-8').write(head + '\n' + body + '\n' + script)
open(out_name, 'w', encoding='utf-8').write(html)
print('ok', PANEL, BUILD)
