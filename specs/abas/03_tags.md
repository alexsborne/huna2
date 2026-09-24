# Spec — Aba Tags

> ⚠️ **DESATIVADA em 03/09/2026.** A entrada `['tags','Tags']` foi removida de `TABS` em `a4.js`, então o botão não aparece na navegação e a aba fica inacessível pela UI. **O código desta aba (`body2.html` seção `data-tab=tags` e o bloco `if(TAB==='tags')` em `a6.js`) permanece intacto e dormente** — não foi apagado. `readHash()` (`a1.js`) tem uma proteção: se o hash da URL apontar para uma aba que não existe mais em `TABS` (como `#t=tags`), cai em `visao` automaticamente. Reativar = devolver a linha em `TABS`. Ver `specs/prompt_v4_reestruturacao_painel.md`, seção 4. O resto deste documento descreve o comportamento **como ficou gravado no código**, não como está visível hoje.

**Última sincronização:** 03/09/2026 (antes da desativação)  
**`data-tab`:** `tags`  
**Rótulo:** Tags  
**Painel:** `section.panel[data-tab=tags]`

---

## 1. Identidade

Aba de descoberta e cruzamento de **todas** as tags em uso no recorte — não só as financeiras.

## 2. Objetivo

Mostrar frequência por tag e por categoria (`catmap`), onde cada tag se concentra por etapa (heatmap), e um catálogo tabular exportável. Tags novas na extração entram sozinhas (sem lista fixa no código).

## 3. Seções e widgets

### Todas as tags em uso

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Frequência por tag | `#cTags` + legenda `#lgCat` | bar | Frequência de cada tag |
| Por categoria | `#cCat` / `#nCat` | bar | Tags por categoria |

Cores por categoria: `CATCOLOR` em `a1.js` (`PAGAMENTO`, `CONTRATO`, `TEMPERATURA`, `CANAL/PARCEIRO`, `CAMPANHA`, `RELACIONAMENTO`, `OUTROS`).

### Mapa de calor

| Widget | ID | Tipo | Export `data-name` |
|---|---|---|---|
| Etapa × tag | tabela `#tHeat` | heatmap clicável (`heat`) | `mapa_calor_etapa_x_tag` |

### Catálogo

| Widget | ID | Export `data-name` |
|---|---|---|
| Tabela catálogo | `#tDim` | `catalogo_de_tags` |

Colunas: Tag · Categoria · Leads (recorte) · % do recorte · Leads (base).

## 4. Dados e fórmulas

- Ordem de `#cTags`: tags de `ALLTAGS` ordenadas por contagem decrescente no recorte `rowsFor('tag')`.
- `#cCat`: cada lead conta **uma vez por categoria** distinta presente em suas tags (`Set` de `cat(t)`).
- Heatmap: linhas = `ETAPAS`; colunas = tags na mesma ordem de `#cTags`; célula = leads com etapa E tag; total da linha = leads da etapa no recorte `rowsFor(['etapa','tag'])`.
- Catálogo `%` = leads com a tag / tamanho de `rowsFor('tag')`; coluna base usa `DATA` completo.

## 5. Interações e filtros

- Clique em barra de tag → dimensão `tag` (Ctrl/Cmd acumula).
- Clique em categoria → dimensão `categoria`.
- Célula do heatmap → `etapa` + `tag` juntos; rótulo da linha → só `etapa`.
- Modo de tag global (`fModo`: OU / E / somente sem tag) afeta o recorte de toda a aba.

## 6. Exportações

Barras de exportação (`mountBars`) em `#tHeat` e `#tDim`: CSV, XLSX, PDF (XLSX some no artefato Claude). Export lê o DOM no momento do clique.

## 7. Dependências de código

- `body2.html`, `a6.js` (ramo `tags`), `a5.js` (`heat`, `tbl`), `a1.js` (`CATMAP`, `ALLTAGS`, `cat`), `a3.js` (export)

## 8. Critérios de aceite

- [ ] Tag nova em `rows.json` aparece no gráfico, heatmap, catálogo e filtro sem mudar código.
- [ ] Tag fora de `catmap.json` cai em `OUTROS` e permanece visível.
- [ ] Exportações respeitam filtros e ordenação da tabela.
