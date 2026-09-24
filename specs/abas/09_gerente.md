# Spec — Aba Gerente

**Última sincronização:** 04/09/2026 (seção "Perfil dos clientes que mais convertem" removida a pedido do usuário; card "Renda mediana do time" removido da Visão geral, também a pedido do usuário)
**`data-tab`:** `gerente`
**Rótulo:** Gerente
**Painel:** `section.panel[data-tab=gerente]`
**Spec de origem:** `specs/prompt_aba_gerente.md`

---

## 1. Identidade

Tela de autoatendimento: cada gerente escolhe o próprio nome (valor de `equipe`) e vê só os dados do seu time.

## 2. Objetivo

Mostrar, sem exigir filtro global, com quem falar primeiro (corretor com mais pendências/pior conversão) e quais cadastros do time estão travados.

## 3. Seções e widgets

| Seção | Widgets | Sempre visível? |
|---|---|---|
| Meu time | `#gerSel` (seletor de equipe/gerente) | sim |
| Visão geral do time | `#gerKpis` (5 KPIs) | só após selecionar |
| Corretores vinculados | `#cGerCorr`/`#nGerCorr` (volume), `#tGerCorr`/`#nGerCorrTbl` (desempenho) | só após selecionar |
| Pontos de melhoria | `#gerAlerts` (4 cards), `#tGerAtencao`, `#tGerAcao`/`#nGerAcao` | só após selecionar |

**Removido em 04/09/2026:** a seção "Perfil dos clientes que mais convertem" (gráficos `#cGerRenda`/`#cGerOrigem`/`#cGerFin` + tabela `#tGerPerfil`) foi retirada por pedido do usuário. O helper `fichaComercialCompleta`/`CAMPOS_COMERCIAIS` (a1.js) e os demais cálculos de conversão por corretor **não foram afetados** — só o cruzamento de perfil de cliente (renda/origem/finalidade) saiu.

**Removido em 04/09/2026 (2):** o card de KPI "Renda mediana do time" (6º card de `#gerKpis`) foi retirado por pedido do usuário — a Visão geral do time passa a ter 5 KPIs (Cadastros do time, Corretores no time, Pix confirmado, Falta Pix, Pasta Aprovada com Pix). A coluna "Renda mediana" da tabela `#tGerCorr` (por corretor) **não foi afetada** — continua mostrando a mediana individual de cada corretor.

## 4. Dados e fórmulas

- Gate: sem `GER` selecionado, `#gerGate` fica `display:none`. `GER` é a `equipe` completa, persistida em `localStorage.nexoGerenteSel` (não vai para o hash da URL nem vira chip global).
- Universo: `Rg = rowsFor('equipe').filter(r => r.equipe === GER)` — respeita os filtros globais do topo.
- KPIs, tabela de desempenho por corretor (`gerTable`) e pendências reaproveitam `METRICS` (`a7.js`) e a mesma lógica de `Pontos de Atenção` (Falta Pix, Documentos via categoria CONTRATO, ficha comercial incompleta, estagnação ≥14 dias).

## 5. Interações e filtros

- `#gerSel` é estado **local** da aba (não usa `ST`/`toggle`).
- Clique em barra/linha de corretor → `toggle('responsavel', nome, ctrl/cmd)` — filtro global padrão, igual a qualquer outro gráfico.

## 6. Exportações

`#tGerCorr`, `#tGerAtencao`, `#tGerAcao` — CSV/XLSX/PDF padrão, `data-title` sem o nome do gerente incluído dinamicamente para `tGerAtencao`/`tGerAcao` (ver `a6.js`, `setExport`). `#tGerPerfil` e seu botão de export deixaram de existir.

## 7. Dependências de código

- `body2.html` (`gerente`), `a6.js` (ramo `TAB==='gerente'`, `gerTable`), `a1.js` (`gerLabel`, `fichaComercialCompleta`), `a7.js` (`METRICS`)

## 8. Critérios de aceite

- [ ] Sem seleção em `#gerSel`, nenhum KPI/gráfico/tabela aparece.
- [ ] Escolher um gerente não cria chip no topo nem altera outras abas.
- [ ] Não existe mais nenhum elemento `cGerRenda`, `cGerOrigem`, `cGerFin` ou `tGerPerfil` no DOM.
- [ ] `#gerAlerts` mostra 4 cards com números distintos entre si.
