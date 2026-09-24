import json, datetime, zoneinfo

rows = json.load(open('../dados/rows_vendas.json', encoding='utf-8'))
CAT = json.load(open('../dados/catmap.json', encoding='utf-8'))
keep = ['lead_id', 'numero', 'nome', 'telefone', 'email', 'sem_email', 'etapa', 'responsavel', 'equipe',
        'produto', 'origem', 'finalidade', 'valor_renda', 'valor_negocio', 'plano_pagamento', 'cadastro',
        'mes', 'data', 'dias_cadastro', 'dias_sem_movimento', 'ultima_atualizacao', 'tags_list',
        'resp_tel', 'resp_email', 'corretor_sem_contato']
slim = [{k: r.get(k) for k in keep} for r in rows]
logo = open('logo_b64.txt', encoding='utf-8').read().strip()
app = open('venda.js', encoding='utf-8').read()
app = app.replace('__DATA__', json.dumps(slim, ensure_ascii=False, separators=(',', ':')))
app = app.replace('__CATMAP__', json.dumps(CAT, ensure_ascii=False))
app = app.replace('__LOGO__', logo)
BUILD = datetime.datetime.now(zoneinfo.ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y %H:%M')
EXTRACAO = datetime.datetime.now(zoneinfo.ZoneInfo('America/Sao_Paulo')).strftime('%d/%m/%Y')
app = app.replace('__EXTRACAO__', EXTRACAO)

head = open('head2.html', encoding='utf-8').read().replace('__TITLE__', 'Painel Funil de Venda — Village Siena')
body = (open('body_vendas.html', encoding='utf-8').read()
        .replace('__LOGO__', logo).replace('__BUILD__', BUILD).replace('__EXTRACAO__', EXTRACAO))
libs = '<script>\n' + open('chart.min.js', encoding='utf-8').read() + '\n</script>'
script = libs + '\n<script>\n' + app + '\n</script>'
html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n' + head +
        '\n</head>\n<body>\n' + body + '\n' + script + '\n</body>\n</html>')
open('Painel_Funil_de_Venda_Siena.html', 'w', encoding='utf-8').write(html)

# mesma prática de privacidade já usada em index.html (Funil de Pasta): bloquear indexação,
# já que a página expõe nome/telefone/e-mail de clientes e corretores.
anchor = '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
metas = '<meta name="robots" content="noindex,nofollow,noarchive,noimageindex">\n<meta name="googlebot" content="noindex,nofollow">\n'
html_noindex = html.replace(anchor, anchor + metas, 1)
open('../funilvendas.html', 'w', encoding='utf-8').write(html_noindex)

print('ok', BUILD, len(rows), 'cadastros')
