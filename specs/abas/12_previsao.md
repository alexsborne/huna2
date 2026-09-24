# Spec — Aba Previsão x Execução

**Última sincronização:** 09/09/2026 (criação)
**`data-tab`:** `previsao`
**Rótulo:** Previsão x Execução
**Painel:** `section.panel[data-tab=previsao]`

---

## 1. Identidade

Tela de acompanhamento de meta: compara a previsão de venda por imobiliária/equipe (planilha colada pelo usuário em 09/09/2026) com os cadastros de fato existentes no CRM.

## 2. Objetivo

Mostrar quais equipes estão batendo a meta, quais estão abaixo, e quais cadastros do CRM não têm nenhuma meta correspondente (para não serem esquecidos numa leitura só pela planilha de metas).

## 3. Decisões confirmadas com o usuário (09/09/2026)

Perguntado antes de implementar (ver conversa de origem):

1. **"Execução" = total de cadastros em qualquer etapa** (não só "Pasta Aprovada com Pix", nem soma de Aprovada+Validada). Inclui Desistentes — a aba usa `DATA` bruto, não `LEADS_TOTAL`.
2. **A meta é acumulada do funil inteiro, sem recorte de período** (não é meta mensal) — por isso a aba **não usa `rowsFor()`/`ST`**: comparar com um recorte filtrado do topo (ex.: só um mês) daria uma leitura errada contra uma meta que é sempre do total. É a mesma família de isolamento que a aba Gerente já usa para o seletor "Meu time", só que aqui a aba inteira ignora os filtros, não só um seletor local.

## 4. Seções e widgets

| Seção | Widgets | Sempre visível? |
|---|---|---|
| Indicadores | `#prevKpis` (5 KPIs) | sim |
| Meta x execução por imobiliária | `#cPrevImob` (barras pareadas Meta/Execução) | sim |
| Detalhamento por equipe | `#tPrev` (24 linhas, uma por linha da planilha de meta) | sim |
| Cadastros fora da previsão | `#tPrevFora` (equipes do CRM sem meta + Mercado) | sim |

## 5. Dados e fórmulas (`a1.js`)

- **`METAS`** — array fixo com as 24 linhas da planilha colada pelo usuário: `{imob, equipe, gerente, meta, keys}`.
  - `keys` localiza a equipe real dentro do campo `equipe` do CRM (texto antes do primeiro `-`, igual `marca`/`t3Parts`): lista de palavras-chave comparadas por "contém" (acento/caixa normalizados via `normMarca`).
  - `keys: []` (array vazio) = time "geral"/catch-all da imobiliária (equipe do CRM = só o nome da imobiliária, sem sufixo — ex. `ADAO X`, usado por "Adão/X", "Lopes/Geral", "AEVO/Geral").
  - `keys: null` = meta é da **imobiliária inteira** (MyBroker, HUNA) — a planilha original não quebrou essas duas por equipe.
- **`METAEXEC`** = `METAS` + campo `exec` (contagem de `DATA` cujo `marca` bate com `m.imob` e `equipe` bate com `m.keys`, via `metaMatches()`).
- **`METAIMOBS`** — rollup por imobiliária: soma de `meta` das linhas daquela imobiliária vs. total real de `DATA.filter(r=>r.marca===imob)` (contagem robusta, não depende do match por `keys`).
- **`METAUNMAPPED`** — equipes do CRM com cadastros reais mas sem nenhuma linha de `METAS` com `keys` específico que bata (ex.: `ADAO UNIQUE`, `AEVO 3`, `AEVO 4` — existem no CRM, não estavam na planilha de metas).
- **`META_MERCADO_N`** — total de `DATA` com `marca==='Mercado'` (fora das 6 imobiliárias parceiras da planilha).
- **`METATOTAL`**/`METAEXECTOTAL`/`METAFORA` — somas agregadas usadas nos KPIs. `METAFORA = META_MERCADO_N + soma(METAUNMAPPED)`.

Todos esses são `const` computados uma vez no carregamento (não dependem de `ST`/filtros).

## 6. Interações e filtros

- **Não participa do cross-filter global**: nenhum clique nesta aba altera `ST`, chips ou hash. É a única aba com esse comportamento total (Gerente ainda usa `rowsFor()` por baixo do seletor local).
- Cabeçalho de `#tPrev`/`#tPrevFora` ordenável (componente genérico `tbl()`), como qualquer outra tabela do painel.
- Sem clique nos gráficos/KPIs (não são dimensões de `DIMS`).

## 7. Exportações

`#tPrev`, `#tPrevFora` — CSV/XLSX/PDF padrão via `.tbar`. `#cPrevImob` — Excel via `.chart-export` (`CHART_META.cPrevImob`, `a3.js`).

## 8. Dependências de código

- `body2.html` (`previsao`), `a4.js` (`TABS`), `a6.js` (ramo `TAB==='previsao'`), `a1.js` (`METAS`, `METAEXEC`, `METAIMOBS`, `METAUNMAPPED`, `metaMatches`), `a3.js` (`CHART_META.cPrevImob`)

## 9. Riscos conhecidos / avisado ao usuário

- O nome do "Gerente (previsão)" na tabela **não é validado contra o CRM** — é só o texto da planilha original. Vários casos já divergem do nome que aparece de fato no cadastro (ex.: "Adão Matriz" na planilha diz "Matheus Ferrari", o CRM tem "EDUARDO ANTONIO PINTO" na única linha daquela equipe) — não foi "corrigido", é mostrado como veio.
- O casamento equipe↔planilha é por palavra-chave manual (`keys`), não um parser genérico — funciona para os 227 cadastros atuais (conferido manualmente linha a linha antes de implementar), mas uma equipe nova no CRM com nome parecido a uma existente pode exigir revisão de `METAS` no futuro.
- Se o usuário corrigir a planilha de metas (valores, equipes novas, período mensal em vez de acumulado), `METAS` em `a1.js` precisa ser editado à mão — não há import automático de planilha.

## 10. Critérios de aceite

- [ ] `METAEXECTOTAL + METAFORA === DATA.length` sempre (nenhum cadastro se perde nem é contado duas vezes).
- [ ] Trocar qualquer filtro do topo não muda nenhum número desta aba.
- [ ] Tabela `#tPrevFora` nunca lista uma equipe que já aparece com match em `#tPrev`.
- [ ] Soma de `Cadastros` em `#tPrevFora` bate com o KPI "Cadastros fora da previsão".
