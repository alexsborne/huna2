# Painel do Funil de Venda — Village Siena
## Dossiê de handoff (documento separado do CONTEXTO.md do Funil de Pasta)

**Gerado em:** 23/09/2026.

> **Este documento cobre só o `funilvendas.html`.** O `CONTEXTO.md` na raiz continua sendo
> a fonte de verdade exclusiva do **Painel do Funil de Pasta** (`index.html`) — a pedido
> explícito do usuário (23/09/2026), o Funil de Pasta não deve ser alterado por causa deste
> trabalho, só se for pedido expressamente. São dois relatórios independentes, gerados por
> pipelines de dados separados, publicados como arquivos separados no mesmo repositório.

---

## 1. O que é isto

Painel analítico de página única (HTML autocontido, ~450 KB, funciona offline) sobre o
**Funil de Venda** do CRM Imobmeet (ID `126` — distinto do Funil de Pasta, ID `128`),
filtrado para o produto **"85 VILLAGIO SIENA"** (produto_id `428` no Imobmeet — "Village
Siena" no pedido original do usuário). Mesma conta Imobmeet (TAJ Empreendimentos e
Participações S/A), operada pela Nexo Gestão Imobiliária.

O Funil de Venda representa as etapas de negociação **antes** de um lead virar um cadastro
de pasta documental — quando a venda é fechada, o cliente aparentemente migra para o Funil
de Pasta (que já tem 237+ cadastros do produto "Pasta de Clientes - SIENA", um produto
*diferente* dentro do mesmo Imobmeet, dedicado só ao acompanhamento documental).

## 2. Passos do funil (ordem canônica)

Lida diretamente do quadro Kanban do Imobmeet (`/leads/gestao/126`) em 23/09/2026 — é a
ordem configurada pelo próprio CRM e cobre todos os produtos do funil (não só Siena):

`Visitante Stand → Pré Cadastro → Em atendimento → Lead Frio / Lead Quente → Visita Agendada
→ Negociação Corretor → Reserva → Proposta → Conferência BrDU → Pendente Nexo → Proposta
Enviada para Assinatura → Proposta assinada → Elaboração Contrato → Enviado para assinatura
→ Contrato c/pendência → Devolvido Ass. Cliente → Contrato Finalizado / Venda Perdida →
Descarte`

Na extração de 23/09/2026 (142 cadastros de Village Siena), só 11 desses passos têm
cadastro: Visitante Stand, Pré Cadastro, Em atendimento, Lead Frio, Negociação Corretor,
Reserva, Proposta, Conferência BrDU, Pendente Nexo, Proposta Enviada para Assinatura,
Descarte. O painel só lista no filtro/gráfico os passos que de fato têm cadastro — a
constante `ETAPAS_VENDA_TODAS` (`src/venda.js`) guarda a lista completa dos 20 passos, caso
apareçam novos.

## 3. Origem dos dados

Igual ao Funil de Pasta (mesmo CRM, mesma stack Laravel+Livewire+Filament — ver
`CONTEXTO.md` seção 2 para detalhes técnicos gerais do Imobmeet), com uma descoberta nova:

- **A listagem `/leads/list` tem filtro nativo por produto** (`tableFilters.produto_id.values`,
  Livewire), além do filtro por funil (`tableFilters.funil.funil`) já usado pelo Funil de
  Pasta. Isso permite restringir a extração a só os cadastros de Village Siena **antes** de
  paginar — o Funil de Venda tem ~3500 cadastros no total (todos os produtos), mas só ~142
  são de Village Siena.
- **O id do produto não é o número que aparece no nome.** "85 VILLAGIO SIENA" tem
  `produto_id=428` no banco do Imobmeet — lido direto das `<option>` do `<select id="produto">`
  da página de filtros (`document.querySelectorAll('select')`, procurando a option cujo
  texto bate com "siena"). Se precisar reconfirmar no futuro, ver o comentário no topo de
  `automacao/extrair_vendas_siena.py`.
- **Existem botões "Exportar para Excel"/"Exportar para CSV"** na listagem, mas não foi
  possível clicá-los de forma confiável via automação (parecem escondidos dentro de um menu
  de ações em lote — timeout ao tentar `click()`). Não investigado a fundo porque o volume
  de Village Siena (142) é pequeno o bastante para o método já comprovado do Funil de Pasta
  (listar via paginação + `fetch()` da ficha de cada lead) rodar em ~2 minutos. Se um dia
  quiser reduzir ainda mais o tempo de extração (ou extrair o Funil de Venda inteiro, todos
  os produtos), vale investigar esse botão de exportação nativo de novo.
- **Tags são o mesmo catálogo do Funil de Pasta** — as 12 tags encontradas em Village Siena
  (`AD`, `Até 24x`, `Até 48x`, `CONTRATO DIGITAL`, `CONTRATO FÍSICO`, `Cliente BrDU`,
  `FALTA PIX`, `Lead Quente`, `PIX`, `Plano longo`, `SECNEXO`, `Venda à vista`) já estavam
  todas em `dados/catmap.json` — nenhuma categorização nova foi necessária.
- **"Tempo no passo atual"** usa `dias_sem_movimento` (dias desde a última atualização da
  ficha) como proxy — o Imobmeet não expõe um histórico completo de todas as trocas de
  etapa via scraping simples. Esse é o mesmo indicador que aparece no própria cartão do
  quadro Kanban do Imobmeet (ex.: "5h", "3d", "13d") — confirmado visualmente em 23/09/2026
  ao inspecionar o Kanban. Não é o tempo em CADA passo pelo qual o lead já passou, só no
  atual; documentado como limitação no rodapé do painel e na aba "Tempo por Etapa".

## 4. Como reextrair os dados

```
cd automacao
python extrair_vendas_siena.py            # ~2 min, grava dados/rows_vendas.json
HEADLESS=0 python extrair_vendas_siena.py  # janela visível, para depurar
```

Não precisa de `DRY_RUN` — este script nunca publica nada sozinho, só grava
`dados/rows_vendas.json` (e estende `dados/contatos.tsv` se achar corretor novo). Usa
`LOGIN_MODE=auto` sempre (credenciais de `automacao/.env`, as mesmas do Funil de Pasta).

Depois de reextrair, gerar o HTML novo:

```
cd ../src
python rebuild_vendas.py
```

Isso gera `src/Painel_Funil_de_Venda_Siena.html` (build bruto) e `../funilvendas.html`
(cópia final, já com as metatags `noindex` injetadas — mesmo tratamento de privacidade do
`index.html`, ver `CONTEXTO.md` seção sobre a decisão de privacidade já aceita pelo usuário,
que se aplica a este relatório do mesmo jeito: nomes/telefones/e-mails de clientes e
corretores ficam expostos a quem tiver o link).

## 5. Arquivos deste relatório

| Arquivo | Papel |
|---|---|
| `funilvendas.html` (raiz) | Arquivo final para publicar/revisar — gerado, não editar à mão |
| `src/Painel_Funil_de_Venda_Siena.html` | Build bruto (sem noindex) — gerado, não editar à mão |
| `src/body_vendas.html` | Markup das abas/filtros — editar aqui para mudar estrutura |
| `src/venda.js` | Toda a lógica (dados, filtros, gráficos, tabelas, export) — editar aqui |
| `src/rebuild_vendas.py` | Monta o HTML final a partir das peças acima + `head2.html` (CSS, **compartilhado** com o Funil de Pasta) + `chart.min.js` (**compartilhado**) |
| `dados/rows_vendas.json` | Dados extraídos (142 cadastros em 23/09/2026) — gerado, não editar à mão |
| `automacao/extrair_vendas_siena.py` | Script de extração (Playwright) — reaproveita funções de `automacao/atualizar.py` |

**Compartilhado com o Funil de Pasta (não duplicado):** `src/head2.html` (CSS/tema),
`src/chart.min.js`, `src/logo_b64.txt`, `dados/catmap.json` (categorias de tag),
`dados/contatos.tsv` (telefone/e-mail de corretor). Mudanças nesses arquivos afetam os dois
relatórios —Conferir os dois após qualquer alteração neles.

**Não compartilhado / não usado por este relatório:** `dados/rows.json`, `index.html`,
`src/a1.js`…`a7.js`, `src/body2.html`, `automacao/atualizar.py` (só reaproveitado como
biblioteca, nunca executado por este fluxo), `SIENA2`/`METAS`/`SUPERMETA` (metas de venda
por imobiliária, específicas do Funil de Pasta).

## 6. Abas do painel

1. **Visão Geral** — KPIs por passo do funil, gráfico de cadastros por passo (ordem
   canônica), cadastros por mês × passo atual, entradas no funil por dia, e resumo de valor
   de negócio (soma/média/mediana entre os que têm valor informado).
2. **Tempo por Etapa** — mediana de dias parado por passo, tabela-resumo (mediana/média/
   mín/máx/estagnados por passo) e uma tabela por cliente (dias no passo atual e dias desde
   o cadastro), ordenável por qualquer coluna.
3. **Tags** — frequência de cada tag, tags por categoria, mapa de calor passo × tag,
   catálogo completo de tags com categoria e contagem.
4. **Perfil e Valores** — finalidade declarada, faixa de renda, faixa de valor de negócio,
   origem do cadastro.
5. **Equipes e Corretores** — volume por imobiliária (Lançadora × Mercado, mesmo critério
   `GRUPOS_LANCADORA` do Funil de Pasta), por equipe, e ranking de corretores.
6. **Pontos de Atenção** — 6 cards clicáveis (parado 14+ dias, sem tag, sem e-mail, corretor
   sem contato localizado no Imobmeet, possível cadastro duplicado por telefone repetido, tag
   FALTA PIX) + tabela de cadastros que batem com o(s) card(s) selecionado(s).
7. **Base de Cadastros** — tabela completa, com busca livre, todas as colunas, exportável.

**Filtros do topo (afetam todas as abas, mesmo padrão combobox+checkbox do Funil de
Pasta):** Passo do funil, Imobiliária, Equipe, Responsável, Origem, Finalidade, Faixa de
renda, Mês de cadastro, Tag, Categoria de tag, Combinação de tags (E/OU/sem tag), busca
livre (na aba Base de Cadastros).

**Fora do escopo desta versão (avaliar se o usuário pedir):** exportação em PDF (só CSV e
Excel foram implementados, pra não duplicar o `jspdf.js`/`autotable.js` — 400 KB — num
relatório que ainda não tinha pedido explícito de PDF); histórico completo de transições de
etapa (o CRM não expõe isso via scraping simples, só a última atualização); Super
Meta/Previsão x Execução (não fazem sentido aqui sem uma planilha de meta equivalente para o
Funil de Venda).

## 7. Extrações

| Data | Cadastros | Observação |
|---|---|---|
| 23/09/2026 13:32 | 142 | 1ª extração. Etapas: Negociação Corretor 54, Reserva 43, Conferência BrDU 9, Proposta 9, Descarte 5, Lead Frio 4, Pendente Nexo 3, Proposta Enviada para Assinatura 3, Em atendimento 6, Visitante Stand 5, Pré Cadastro 1. |
| 23/09/2026 18:09 | 147 | 2ª extração, via skill `atualizar_servidor` (`extrair_vendas_siena.py`). Etapas: Negociação Corretor 58, Reserva 38, Proposta Enviada para Assinatura 10, Pendente Nexo 7, Proposta 6, Em atendimento 6, Descarte 5, Visitante Stand 5, Conferência BrDU 4, Lead Frio 4, Elaboração Contrato 2, Pré Cadastro 1, Visita Agendada 1. Corrigido bug em `extrair_vendas_siena.py` (`page.evaluate` com 2 argumentos não é suportado pelo Playwright — passado como lista `[funilId, produtoId]`). Publicada junto com a 35ª extração do Funil de Pasta, commit `4e7cbb7`. |
| 24/09/2026 10:29 | 181 | 3ª extração, via skill `atualizar_servidor`. Etapas: Reserva 70, Negociação Corretor 45, Proposta 10, Conferência BrDU 10, Proposta Enviada para Assinatura 8, Pendente Nexo 8, Em atendimento 7, Visitante Stand 6, Descarte 5, Lead Frio 4, Proposta assinada 3, Enviado para assinatura 3, Pré Cadastro 1, Visita Agendada 1. 2 tags novas no catálogo (`BOLETO NEXO`, `Em lançamento de venda`). Publicada junto com a 36ª extração do Funil de Pasta, commit `319cf76`. |
| 24/09/2026 14:53 | 209 | 4ª extração, via skill `atualizar_servidor`. Etapas: Reserva 70, Negociação Corretor 44, Proposta 22, Proposta Enviada para Assinatura 17, Em atendimento 15, Pendente Nexo 11, Visitante Stand 6, Conferência BrDU 5, Descarte 5, Lead Frio 4, Proposta assinada 3, Enviado para assinatura 3, Venda Perdida 1, Lead Quente 1, Pré Cadastro 1, Visita Agendada 1. Publicada junto com a 37ª extração do Funil de Pasta, commit `d582155`. |

**23/09/2026 ~14:00:** filtros passam a persistir em `localStorage` (`nexoFiltros_venda`) — reabrir a página sem hash na URL restaura os últimos filtros/aba usados.

**Publicação:** publicado em 23/09/2026 18:10, commit `4e7cbb7` (palavra-chave do usuário
confirmada) — ver seção de fluxo de publicação do `CONTEXTO.md` (mesma regra vale aqui: só
publicar com a palavra-chave do usuário).
