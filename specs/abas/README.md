# Specs das abas do painel

**Pasta:** `specs/abas/`  
**Fonte de verdade da UI:** `src/body2.html` + `src/a4.js`–`a7.js` (rebuild → `index.html`)

## Regra obrigatória

**Toda vez que o projeto for alterado de forma que mude comportamento, conteúdo, filtros, gráficos, tabelas, rótulos ou exportações de uma aba, o arquivo de spec correspondente nesta pasta deve ser atualizado na mesma mudança.**

Não adianta só o código: o spec é o contrato legível da aba. Se o código e o spec divergirem, o spec está errado até ser corrigido.

**Procedimento padrão completo (colar/invocar após alterações):**  
[`../prompt_sync_specs_apos_alteracao.md`](../prompt_sync_specs_apos_alteracao.md)  
— inclui: anotar só o funcionamento atual, remover da spec o que saiu da UI, cobrir todas as abas afetadas, e **perguntar ao usuário** quando a mudança conflitar com regra já documentada.

### O que conta como alteração que exige sync do spec

- Incluir/remover/renomear gráfico, tabela, KPI, seção ou controle
- Mudar dimensão de filtro, fórmula, critério de ranking ou regra de alerta
- Mudar colunas de tabela, export `data-name` / `data-title`, ou texto de título/subtítulo/hint
- Mudar interação (clique, Ctrl/Cmd, busca, hash da URL ligado à aba)
- Adicionar ou remover uma aba inteira (criar/apagar o `.md` e atualizar este README)

### O que não exige sync (desde que a aba continue igual)

- Reextração de dados com o mesmo schema (só números mudam)
- Rebuild sem mudança de `src/`
- Ajuste puramente cosmético de CSS sem mudar estrutura semântica

## Inventário das abas

| Arquivo | `data-tab` | Rótulo na UI | Código principal | Status |
|---|---|---|---|---|
| `01_visao.md` | `visao` | Visão Geral | `a5.js` (kpis), `a6.js` | ativa |
| `02_pagto.md` | `pagto` | Pagamentos | `a6.js` | ativa |
| `03_tags.md` | `tags` | Tags | `a5.js` (heat/tbl), `a6.js` | **desativada** (03/09/2026 — fora de `TABS`, código intacto) |
| `04_times.md` | `times` | Times (nome liberado — ver `11_times3.md`) | `a6.js` | **desativada** (05/09/2026 — fora de `TABS`, código intacto, reversível — drill-down Imobiliárias→Gerentes→Corretores original, 3 gráficos) |
| `10_times2.md` | `times2` | Times_2 | `a6.js` (`TAB==='times2'`, `paintMindMap`) | **desativada** (05/09/2026 — fora de `TABS`, código intacto, reversível — mapa da hierarquia em árvore/SVG) |
| `11_times3.md` | `times3` | **Times** (renomeada de "Times_3" em 05/09/2026 — `data-tab` continua `times3`) | `a6.js` (`TAB==='times3'`, `paintTimes3`) | ativa (v4.9, 05/09/2026 — única aba de hierarquia visível agora; 5 gráficos de barra em cascata, divisão imobiliária/equipe/gerente própria e diferente de `marca`) |
| `09_gerente.md` | `gerente` | Gerente | `a6.js` (`TAB==='gerente'`) | ativa (v4.4, 04/09/2026 — autoatendimento por gestor de equipe) |
| `12_previsao.md` | `previsao` | Previsão x Execução | `a6.js` (`TAB==='previsao'`) | ativa (v4.14, 09/09/2026 — meta de venda x cadastros reais, não usa `rowsFor()`/filtros do topo) |
| `05_rank.md` | `rank` | Rankings | `a7.js` | **desativada** (03/09/2026 — fora de `TABS`, código intacto, reativação planejada) |
| `06_perfil.md` | `perfil` | Perfil e Valores | `a6.js` | ativa |
| `07_alertas.md` | `alertas` | Pontos de Atenção | `a6.js` | ativa |
| `08_base.md` | `base` | Base de Cadastros | `a5.js` (tLeads) | ativa (renomeada de "Base de Leads" em 03/09/2026) |

Ordem das abas no código: `TABS` em `src/a4.js` — hoje 7 entradas (`tags`, `rank`, `times` e `times2` fora de `TABS`, specs mantidas para quando/se forem reativadas). `readHash()` em `a1.js` cai em `visao` se o hash apontar para uma aba fora de `TABS`. Ver `specs/prompt_v4_reestruturacao_painel.md` para o histórico dessa mudança.

## Formato de cada spec

Cada arquivo deve manter as seções:

1. Identidade  
2. Objetivo  
3. Seções e widgets  
4. Dados e fórmulas  
5. Interações e filtros  
6. Exportações (se houver)  
7. Dependências de código  
8. Critérios de aceite  

Ao alterar, atualize também a linha **Última sincronização** no topo do arquivo.
