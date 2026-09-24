# Spec — Aba Perfil e Valores

**Última sincronização:** 04/09/2026 (subtítulo do gráfico "Preenchimento da ficha" explicita que os 6 indicadores são independentes)  
**`data-tab`:** `perfil`  
**Rótulo:** Perfil e Valores  
**Painel:** `section.panel[data-tab=perfil]`

---

## 1. Identidade

Aba de perfil financeiro/declarativo do cadastro e qualidade de preenchimento da ficha.

## 2. Objetivo

Mostrar distribuição de **renda** (métrica financeira do painel), finalidade da compra e quanto da ficha está preenchida — para apontar lacunas que travam contato/crédito.

## 3. Seções e widgets

### Valores

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Faixas de renda | `#cRenda` / `#nRenda` | bar vertical | Distribuição do valor de renda |
| Finalidade | `#cFin` / `#nFin` | bar | Finalidade da compra |

Faixas (`FAIXAS` em `a1.js`):

1. `0 / não informado`  
2. `até R$ 3 mil`  
3. `R$ 3–5 mil`  
4. `R$ 5–8 mil`  
5. `R$ 8–12 mil`  
6. `R$ 12–20 mil`  
7. `acima de R$ 20 mil`  

### Qualidade do cadastro

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Preenchimento | `#cQual` / `#nQual` | bar | Preenchimento da ficha |

Barras fixas (não são dimensões de filtro):

- Com e-mail válido (`sem_email === 'Não'`)
- Com telefone
- Com renda informada
- Com ao menos 1 tag
- Com plano de pagamento
- Com finalidade declarada (não vazia e ≠ `-`)

**São 6 checagens independentes de sim/não sobre o mesmo recorte, não categorias mutuamente exclusivas** — um cadastro pode contar em várias barras ao mesmo tempo (ex.: ter telefone *e* e-mail *e* renda), então a soma das 6 porcentagens **não** precisa (e normalmente não vai) fechar em 100%. Isso já foi conferido contra `dados/rows.json` em 04/09/2026 (178 cadastros): e-mail 92,1% · telefone 100% · renda 65,2% · tag 56,2% · plano de pagamento 0% (campo removido do CRM, ver seção 2/3 do `CONTEXTO.md`) · finalidade 63,5% — soma 377,0%, todos os valores individuais batendo com o painel. **Não confundir com bug** — diferente de `#cRenda`/`#cFin`, que são categorias exclusivas e por isso fecham em 100%.

## 4. Dados e fórmulas

- `#cRenda`: `rowsFor('faixa')`; `faixa(valor_renda)` — `null`/`0` → faixa 0.
- Nota: mediana vs média dos valores > 0; % sem renda no recorte.
- `#cFin`: `byKey(R,'finalidade')` no recorte `rowsFor()`; dimensão de clique `__none` (não filtra).
- `#cQual`: também `__none` — só informativo.

## 5. Interações e filtros

- Clique em faixa de renda → dimensão `faixa` (select do topo não lista faixa; filtro só via gráfico/chips).
- Finalidade e qualidade: **sem** filtro por clique (`dim: '__none'`).

## 6. Exportações

Nenhuma tabela nesta aba. **Desde a v4.1**, os 3 gráficos (`#cRenda`, `#cFin`, `#cQual`) têm cada um seu próprio botão "Exportar Excel" — para `#cQual`, a primeira coluna da planilha é rotulada "Indicador" (não é uma dimensão de filtro, só os 6 rótulos fixos da seção 3).

## 7. Dependências de código

- `body2.html`, `a6.js` (ramo `perfil`), `a1.js` (`FAIXAS`, `faixa`, `median`), `a2.js`, `a3.js` (`expChartXLSX`, `chartRows`, `mountChartExports`)

## 8. Critérios de aceite

- [ ] Ordem das faixas de renda é a de `FAIXAS` (não alfabética).
- [ ] Faixa cinza para “0 / não informado”; demais azul.
- [ ] Nota recomenda mediana (base com muitos zeros).
- [ ] Valor do Negócio **não** aparece nesta aba (descartado do produto).
- [ ] Cada um dos 3 gráficos tem um botão "Exportar Excel" funcional.
