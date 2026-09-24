# Spec — Aba Visão Geral

**Última sincronização:** 05/09/2026, revisão (2) — **card Desistente volta a aparecer**, a pedido do usuário, mas **sem contar como lead** (contagem própria, fora de `n`/`LEADS_TOTAL`) — ver seção 4. Revisão (1), mesmo dia: card tinha sido removido e Desistentes tinham saído do cálculo de leads em todo o painel (essa parte — exclusão de `rowsFor()` — continua valendo; só o card voltou).  
**`data-tab`:** `visao`  
**Rótulo:** Visão Geral  
**Painel:** `section.panel[data-tab=visao]` em `src/body2.html`

---

## 1. Identidade

Primeira aba do painel (`TAB` padrão = `visao`). É a entrada analítica: KPIs do recorte + funil + evolução temporal de cadastros.

## 2. Objetivo

Responder, no recorte filtrado: quantos leads há, como estão distribuídos nas etapas, como as safras mensais se posicionam no funil hoje, e em quais dias entraram cadastros.

## 3. Seções e widgets

### Indicadores (`#kpis`)

Oito cards gerados por `kpis(rows)` em `a5.js`, um por etapa do funil (mais total, Pix e Desistente) — **substituíram totalmente** o conjunto anterior de 9 KPIs temáticos (Aguardando PIX, Plano longo, Renda mediana, Tags distintas em uso e Sem e-mail válido saíram desta aba; as métricas continuam existindo em Perfil e Valores / Pontos de Atenção, só não têm mais card aqui).

| # | KPI | Valor | Classe | Clique filtra |
|---|---|---|---|---|
| 1 | Cadastros no recorte | `n` (subtexto `% da base`, base = `LEADS_TOTAL`) | — | não é clicável (representa o recorte já filtrado, não uma dimensão) |
| 2 | Pix confirmado | contagem tag `PIX` | `k-good` | `tag = PIX` |
| 3 | Cadastro Cliente | contagem etapa `Cadastro Cliente` | — | `etapa = Cadastro Cliente` |
| 4 | Pasta em Anállise | contagem etapa `Pasta em Anállise` (grafia exata do CRM) | — | `etapa = Pasta em Anállise` |
| 5 | Pasta com Pendência | contagem etapa `Pasta com Pendência` | `k-warn` | `etapa = Pasta com Pendência` |
| 6 | Pasta Validada pendente de Pix | contagem etapa `Pasta Validada pendente de Pix` | `k-warn` | `etapa = Pasta Validada pendente de Pix` |
| 7 | Pasta Aprovada com Pix | contagem etapa `Pasta Aprovada com Pix` | `k-good` | `etapa = Pasta Aprovada com Pix` |
| 8 | Desistente | contagem própria (ver nota abaixo — **não** soma em `n`) | `k-crit` | `etapa = Desistente` |

Cards 1–7 com subtexto `% do recorte` (`pct(valor,n)`), `n = rows.length` onde `rows = rowsFor()` (já sem desistentes, por padrão). **Card 8 é especial:** como `rowsFor()` já exclui `etapa==='Desistente'` (regra global, v4.10), contar `rows.filter(r=>r.etapa==='Desistente')` sempre daria zero — por isso a contagem usa `rowsFor('etapa').filter(r=>r.etapa==='Desistente').length`, o mesmo truque que `#cEtapa` já usa pra listar todas as etapas ignorando o próprio filtro de etapa **e**, aqui, ignorando também a exclusão automática (`rowsFor()` só pula a exclusão quando `'etapa'` está no `except` OU quando `ST.etapa` já é exatamente `Desistente` — `except:'etapa'` cobre os dois). O subtexto do card 8 é `pct(desistentes, n) + ' — não contam como lead'`: a % é relativa aos leads do recorte (`n`), não a um total que os inclua — de propósito, pra não "contar como lead" nem na conta nem na proporção.

**Cards clicáveis (04/09/2026):** os 7 KPIs com dimensão (todos menos "Cadastros no recorte") chamam o mesmo `toggle(dim,val,ctrl)` global já usado pelos gráficos — clique simples substitui o valor da dimensão, Ctrl/Cmd+clique acumula, clicar de novo no mesmo remove. Isso ecoa em **todas** as abas (é o cross-filter global, `ST`/`rowsFor`), não só nesta. Clicar no card Desistente filtra `etapa=Desistente` — e aí sim `rowsFor()` para de excluí-los, mostrando só os desistentes no recorte inteiro (comportamento já existente desde a v4.10, sem mudança). O card com filtro ativo ganha contorno (`.kpi.on`, `head2.html`). Implementado em `kpiCards(id,K)` (`a5.js`), reaproveitável por qualquer grid de KPI que precise do mesmo padrão clicável.

### Funil

| Widget | ID canvas / note | Tipo | Título UI |
|---|---|---|---|
| Barras por etapa | `#cEtapa` / `#nEtapa` | bar horizontal (`bar`) | Cadastros por etapa do funil |
| Barras empilhadas mês × etapa | `#cMes` / `#nMes` | bar stacked | Cadastros por mês e etapa atual |

### Evolução no tempo

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Linha diária de cadastros | `#cTempo` / `#nTempo` | line + fill | Entradas no funil por dia |

## 4. Dados e fórmulas

- Recorte base da aba: `rowsFor()` (exceto onde o gráfico usa `except`). **Desde 05/09/2026, `rowsFor()` já exclui `etapa==='Desistente'` por padrão** (regra global do painel, não só desta aba — ver `CONTEXTO.md` v4.10) — a menos que o próprio filtro `#fEtapa` esteja setado exatamente para `Desistente`, caso em que o recorte mostra só os desistentes. `Desistente` continua fora da constante `ETAPAS` (não aparece no funil `#cEtapa`/`#cMes`), mas continua **selecionável no `#fEtapa`** (opção extra adicionada em `mountFilters()`, fora de `ETAPAS`) pra quem quiser consultá-los.
- `LEADS_TOTAL` (`a1.js`) = `DATA` menos os desistentes — é o denominador de "% da base" do KPI "Cadastros no recorte" (item 1 da tabela acima), no lugar de `DATA.length`. O selo do cabeçalho (`#bTot`) e o rodapé de metodologia (`#fMeta`) **continuam usando `DATA.length`** de propósito — são contagem bruta da extração (quantos registros o Imobmeet devolveu), não "cálculo de leads".
- Etapas: constante `ETAPAS` (ordem canônica; grafia `Pasta em Anállise` obrigatória).
- `#cEtapa`: `rowsFor('etapa')` — não se auto-filtra.
- `#cMes`: `rowsFor(['mes','etapa'])`; datasets = uma série por etapa; eixo X = `uniq('mes')`.
- `#cTempo`: eixo contínuo do primeiro ao último `data` da **base completa** (`DATA`); valores de `rowsFor('data')` agregados por dia; pontos só onde há contagem.

## 5. Interações e filtros

- Clique num KPI (exceto "Cadastros no recorte") → `toggle` na dimensão indicada na tabela acima (mesma convenção de clique simples/Ctrl+clique/clique-de-novo dos gráficos).
- Clique em barra de etapa → `toggle`/`bar` na dimensão `etapa`.
- Clique em segmento de `#cMes` → aplica `mes` e `etapa` juntos (substituição simples).
- Clique em ponto de `#cTempo` (só se houver cadastros naquele dia) → `toggle('data', …)`.
- Ctrl/Cmd+clique acumula onde `toggle`/`bar` suportam.
- Trocar de aba **não** limpa filtros. Hash da URL inclui `t=visao`.

## 6. Exportações

Nenhuma tabela nesta aba (sem barra CSV/XLSX/PDF de tabela). **Desde a v4.1**, os 3 gráficos (`#cEtapa`, `#cMes`, `#cTempo`) têm cada um seu próprio botão "Exportar Excel" logo abaixo, gerando um `.xlsx` com logo da Nexo e rodapé de origem — ver `CONTEXTO.md`, seção "Exportação de gráfico em Excel".

## 7. Dependências de código

- Markup: `body2.html` (seção `visao`)
- Lógica: `a5.js` (`kpis`), `a6.js` (`paint` ramo `visao`), `a2.js` (`bar`/`build`), `a1.js` (`ETAPAS`, `rowsFor`, `ST`, `isDesistente`, `LEADS_TOTAL`), `a3.js` (`expChartXLSX`, `chartRows`, `mountChartExports`)

## 8. Critérios de aceite

- [ ] Os 8 KPIs refletem o recorte atual após qualquer filtro.
- [ ] Sem filtro nenhum, "Cadastros no recorte" mostra `LEADS_TOTAL` (base menos desistentes), não `DATA.length`.
- [ ] O card Desistente mostra a contagem real de desistentes do recorte, mesmo `rowsFor()` excluindo-os por padrão — e essa contagem **não** aparece somada em "Cadastros no recorte" nem nos outros KPIs.
- [ ] Filtrar `#fEtapa` por "Desistente" (ou clicar no card Desistente) mostra só os cadastros desistentes (recorte deixa de excluí-los).
- [ ] Clique em qualquer KPI (menos "Cadastros no recorte") filtra o painel inteiro pela dimensão/valor daquele card e marca o card com contorno; Ctrl/Cmd+clique acumula.
- [ ] Ordem das barras de etapa = `ETAPAS`.
- [ ] Nota `#nEtapa` cita a etapa majoritária e o total aprovado com Pix.
- [ ] Clique no funil/mês/dia atualiza chips, demais abas e hash.
- [ ] Com zero leads no recorte, painéis somem e `#empty` aparece (comportamento global).
- [ ] Cada um dos 3 gráficos tem um botão "Exportar Excel" funcional, com dados do recorte atual.
