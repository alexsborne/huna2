# Spec — Aba Pagamentos

**Última sincronização:** 03/09/2026 (v4.1 — exportação de gráfico em Excel)  
**`data-tab`:** `pagto`  
**Rótulo:** Pagamentos  
**Painel:** `section.panel[data-tab=pagto]`

---

## 1. Identidade

Aba de marcadores financeiros: plano de pagamento (via tags), cruzamento tag×etapa e situação Pix.

## 2. Objetivo

Mostrar a forma/prazo de pagamento declarada via tags (`Venda à vista`, `Até 24x`, `Até 48x`, `Plano longo`) e onde PIX / FALTA PIX se concentram no funil. O campo estruturado `plano_pagamento` da ficha do CRM foi descontinuado (seção 4) — as tags são hoje a única fonte dessa informação.

## 3. Seções e widgets

### Marcadores financeiros

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Plano de pagamento | `#cPgto` | bar | Plano de pagamento |

**O card "Campo Plano de pagamento" (`#cPlano`/`#nPlano`) foi removido em 03/09/2026** — o campo `plano_pagamento` da ficha foi descontinuado pelo CRM (sempre vazio, ver `CONTEXTO.md` seção 3), então o gráfico não tinha mais informação para mostrar. A seção "Marcadores financeiros" agora tem só este card, em largura cheia (sem `.grid.two`).

Tags consideradas neste gráfico — constante própria `PLANOTAGS` em `a1.js`, **diferente de `PGTO`**:  
`Venda à vista`, `Até 24x`, `Até 48x`, `Plano longo` (só as que existem em `ALLTAGS`; PIX/FALTA PIX foram tirados daqui de propósito — continuam em `#cStack` e `#cPix` abaixo, que usam `PGTO` sem alteração). Não há mais nota (`#nPgto` foi removida junto com a comparação Pix confirmado×pendente, que já aparece na seção "Situação do Pix").

### Pagamento por etapa

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Stack horizontal etapa × tag financeira | `#cStack` / `#nStack` | bar stacked (`indexAxis:'y'`) | Tags financeiras dentro de cada etapa |

Colunas do stack = tags `PGTO` presentes + categoria sintética **“Sem tag de pagamento”**.

### Situação do Pix

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| PIX vs FALTA PIX por etapa | `#cPix` / `#nPix` | bar agrupado | Pix confirmado x pendente por etapa |

## 4. Dados e fórmulas

- `#cPgto`: `rowsFor('tag')`; contagem `has(r, t)` por tag de `PLANOTAGS` filtrada por `ALLTAGS`.
- `#cStack` / `#cPix`: `rowsFor(['etapa','tag'])`, usando `PGTO` (não `PLANOTAGS`) — continuam considerando PIX/FALTA PIX normalmente. Stack conta **marcações**, não cadastros únicos (um cadastro com 2 tags financeiras entra em 2 séries).
- **Estado atual da base (03/09/2026):** o campo `plano_pagamento` da ficha está vazio em 100% dos cadastros (removido do CRM) — por isso não há mais gráfico dedicado a ele; a informação de forma/prazo de pagamento vive só nas 4 tags de `PLANOTAGS`.

## 5. Interações e filtros

- Clique em `#cPgto` → dimensão `tag`.
- Clique em segmento `#cStack` → `etapa` + `tag` (se o segmento for tag real; “Sem tag de pagamento” só aplica etapa).
- Clique em `#cPix` → `etapa` + tag `PIX` ou `FALTA PIX`.

## 6. Exportações

Nenhuma tabela nesta aba. **Desde a v4.1**, os 3 gráficos (`#cPgto`, `#cStack`, `#cPix`) têm cada um seu próprio botão "Exportar Excel" — ver `CONTEXTO.md`, seção "Exportação de gráfico em Excel". Para `#cStack`/`#cPix` (multi-série), a planilha traz uma coluna por série (ex.: `#cPix` exporta Etapa · PIX confirmado · FALTA PIX).

## 7. Dependências de código

- `body2.html` (`pagto`), `a6.js` (ramo `pagto`), `a1.js` (`PGTO`, `PLANOTAGS`, `ETAPAS`), `a2.js`, `a3.js` (`expChartXLSX`, `chartRows`, `mountChartExports`)

## 8. Critérios de aceite

- [ ] `#cPgto` mostra só as 4 tags de `PLANOTAGS` que existem na base, sob o título "Plano de pagamento".
- [ ] Não existe mais gráfico/nota do campo CRM `plano_pagamento` nesta aba.
- [ ] `#cStack` e `#cPix` continuam considerando PIX/FALTA PIX normalmente (não afetados pela restrição de `#cPgto`).
- [ ] Nota de `#cStack` deixa claro que barras somam marcações.
- [ ] Clique sincroniza filtros globais.
- [ ] Cada um dos 3 gráficos tem um botão "Exportar Excel" funcional; para `#cStack`/`#cPix` a planilha traz uma coluna por série.
