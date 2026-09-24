# Spec — Aba Previsão x Execução (previsao2)

**Última sincronização:** 11/09/2026 (criação; renomeada de "Previsão x Execução_2" para "Previsão x Execução" no mesmo dia, substituindo a aba antiga de mesmo nome na navegação; filtro "Imobiliária" passou a filtrar a aba)
**`data-tab`:** `previsao2` (nome interno mantido de propósito — mesmo padrão de "Times_3"→"Times")
**Rótulo:** Previsão x Execução
**Painel:** `section.panel[data-tab=previsao2]`

---

## 1. Identidade

Tela de acompanhamento de meta que ocupa hoje o rótulo "Previsão x Execução" na navegação. Compara a expectativa de cadastros da planilha **"Expectativa de vendas - SIENA.xlsx"** (fornecida pelo usuário em 11/09/2026) com os cadastros de fato no CRM — por **imobiliária** (Lançadoras + Mercado), não por equipe. Substituiu na navegação a aba original de mesmo nome, que comparava por equipe (`12_previsao.md`) — a original foi desativada (fora de `TABS`), não apagada; ver seção 3.

## 2. Objetivo

Mostrar visualmente e em tabela quais imobiliárias — tanto as 6 Lançadoras quanto cada imobiliária do Mercado individualmente — estão com cadastros se aproximando (ou já batendo) a expectativa de vendas da planilha SIENA.

## 3. Diferença para a aba "Previsão x Execução" original (`previsao`, desativada)

| | `previsao` (desativada 11/09/2026) | `previsao2` (ativa, rótulo "Previsão x Execução") |
|---|---|---|
| Planilha de origem | Meta por equipe, colada em 09/09/2026 | "Expectativa de vendas - SIENA.xlsx", 11/09/2026 |
| Granularidade | Equipe dentro das 6 Lançadoras; Mercado é 1 número só | Imobiliária: 6 Lançadoras **e** ~29 imobiliárias do Mercado, cada uma com meta própria |
| Números | Independentes — não foram atualizados quando a SIENA chegou | Baseline novo; diverge do antigo em alguns casos (ex.: Lopes 40→10, HUNA 40→45) |

`previsao` foi tirada de `TABS` (`a4.js`) em 11/09/2026, a pedido do usuário — código, markup (`body2.html`) e dados (`METAS` em `a1.js`) continuam intactos e reversíveis, mesmo padrão já usado para Tags/Rank/Times/Times_2. Se o usuário pedir a aba de volta, é só reincluir `['previsao','Previsão x Execução']` em `TABS` (e então as duas abas precisariam de rótulos distintos de novo).

## 4. Seções e widgets

| Seção | Widgets | Sempre visível? |
|---|---|---|
| Indicadores | `#prev2Kpis` (5 KPIs) | sim |
| Meta x execução por imobiliária | `#cPrev2Imob` (barras horizontais pareadas Meta/Execução, todas as 35 imobiliárias, scroll) | sim |
| Detalhamento por imobiliária | `#tPrev2` (35 linhas — 6 Lançadoras + 29 Mercado) | sim |
| Cadastros fora da previsão | `#tPrev2Fora` (equipes do Mercado sem imobiliária correspondente na SIENA) | sim |

## 5. Dados e fórmulas (`a1.js`)

- **`SIENA2`** — array fixo com as 35 linhas da planilha SIENA: `{imob, meta, keys}`.
  - `keys: null` → uma das 6 Lançadoras (AEVO, Adão, MyBroker, HUNA, URBS, Lopes) — casa direto por `marca` (mesmo agrupamento por regex já usado no resto do painel).
  - `keys: [...]` → imobiliária do Mercado — casada pelo prefixo bruto de `equipe` (texto antes do primeiro `-`, normalizado por `normMarca`) contra palavras-chave, porque os nomes divergem entre planilha e CRM (ex.: "DATA NEGOCIOS" no CRM = "Data Imóveis" na SIENA; "VILLA BAMBU IMOVEIS" no CRM = "Villa Bamboo" na SIENA). Conferido uma a uma contra os prefixos de Mercado reais em 11/09/2026 (21 prefixos distintos, dos quais 19 têm meta e 2 não: `NEXO GESTÃO`, `TYRONE NEGOCIOS`).
- **`siena2MatchMercado(r)`** — para uma linha de `Mercado`, devolve o `imob` da SIENA que bate (ou `null`).
- **`SIENA2EXEC`** = `SIENA2` + campo `exec`: para Lançadora, `METABASE.filter(r=>r.marca===s.imob).length`; para Mercado, `METABASE.filter(r=>r.marca==='Mercado'&&siena2MatchMercado(r)===s.imob).length`.
- **`SIENA2UNMAPPED`** — prefixos de equipe do Mercado com cadastro real mas sem entrada correspondente em `SIENA2` (hoje: `NEXO GESTÃO` — leads internos da Nexo, não é imobiliária de mercado — e `TYRONE NEGOCIOS`).
- **`SIENA2TOTAL`**/`SIENA2EXECTOTAL`/`SIENA2FORA` — somas agregadas usadas nos KPIs.

Todos `const`, computados uma vez no carregamento — não dependem de `ST`/filtros (mesmo motivo da aba `previsao`: meta acumulada do funil inteiro, sem período; comparar com um recorte do topo daria leitura errada).

## 6. Interações e filtros

- **Não participa do cross-filter global para a maioria dos filtros do topo** (etapa, mês, equipe, responsável, origem, plano, tag, categoria, data) — mesmo motivo da aba `previsao` original: a meta é acumulada do funil inteiro, sem período, então um recorte por período daria leitura errada.
- **Exceção deliberada (11/09/2026, a pedido do usuário): o filtro "Imobiliária" (`ST.tipo_imob`, Lançadora×Mercado) filtra esta aba de verdade.** Não é um recorte por período — só escolhe qual metade do catálogo `SIENA2` mostrar (`keys===null` = Lançadora, `keys!==null` = Mercado), então não viola a invariante "meta acumulada". Com "Lançadora" selecionado: `SV` vira as 6 linhas de Lançadora, KPIs/gráfico/tabela recalculados só sobre elas, e a tabela "Cadastros fora da previsão" fica vazia (essa categoria é sempre de Mercado, por construção — nenhuma Lançadora fica sem meta). Com "Mercado": `SV` vira as ~29 linhas de Mercado. Sem filtro (ou os dois marcados juntos): `SV=SIENA2EXEC` inteiro, comportamento idêntico a antes do filtro existir.
- Gráfico `#cPrev2Imob` e tabela `#tPrev2` ordenados por padrão do maior % atingido (execução/meta) para o menor — imobiliárias mais próximas/acima da meta aparecem primeiro, dentro do recorte ativo.
- Cabeçalho de `#tPrev2`/`#tPrev2Fora` ordenável (componente genérico `tbl()`).
- Sem clique nos gráficos/KPIs desta aba (não escrevem em `ST`) — só o `<select>`/combobox "Imobiliária" do cabeçalho, compartilhado com o resto do painel, afeta esta tela.

## 7. Exportações

`#tPrev2`, `#tPrev2Fora` — CSV/XLSX/PDF padrão via `.tbar`. `#cPrev2Imob` — Excel via `.chart-export` (`CHART_META.cPrev2Imob`, `a3.js`).

## 8. Dependências de código

- `body2.html` (`previsao2`), `a4.js` (`TABS`), `a6.js` (ramo `TAB==='previsao2'`), `a1.js` (`SIENA2`, `siena2MatchMercado`, `SIENA2EXEC`, `SIENA2UNMAPPED`), `a3.js` (`CHART_META.cPrev2Imob`)

## 9. Riscos conhecidos / avisado ao usuário

- O casamento imobiliária↔planilha no Mercado é por palavra-chave manual (`keys`), não parser genérico — validado contra os 60 cadastros de Mercado atuais (11/09/2026), mas uma imobiliária nova no CRM com nome parecido a uma existente pode exigir revisão de `SIENA2` no futuro.
- 11 imobiliárias da SIENA (Neri e Cabral, VW Imóveis, Alfa Center, Morar Mais, Rosa, Alpha Soluções, Amiz, Casa 41, Lago Premium, Melhor Imóveis, Portfólio) não têm nenhum cadastro no CRM ainda — aparecem na tabela com execução 0, não é bug.
- Se o usuário atualizar a planilha SIENA (valores, imobiliárias novas), `SIENA2` em `a1.js` precisa ser editado à mão — não há import automático de planilha.

## 10. Critérios de aceite

- [ ] `SIENA2EXECTOTAL` (Lançadoras + Mercado mapeado) + `SIENA2FORA` === total de cadastros com `marca!=='Mercado'` (Lançadoras) mais `marca==='Mercado'` (Mercado inteiro) — nenhum cadastro se perde nem conta duas vezes.
- [ ] Trocar qualquer filtro do topo **exceto "Imobiliária"** não muda nenhum número desta aba.
- [ ] Filtro "Imobiliária" = Lançadora → `#tPrev2` mostra só as 6 Lançadoras, `#tPrev2Fora` fica vazia. = Mercado → `#tPrev2` mostra só as imobiliárias de Mercado, `#tPrev2Fora` idêntica à visão sem filtro. Sem seleção (ou os dois marcados) → idêntico à visão original, sem filtro.
- [ ] Tabela `#tPrev2Fora` nunca lista um prefixo de equipe que já aparece com match em `#tPrev2`.
- [ ] Soma de `Cadastros` em `#tPrev2Fora` bate com o KPI "Cadastros fora da previsão" (dentro do recorte ativo do filtro "Imobiliária").
