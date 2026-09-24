# Spec — Aba Rankings

> ⚠️ **DESATIVADA em 03/09/2026 — reversível, reativação já planejada.** A entrada `['rank','Rankings']` foi removida de `TABS` em `a4.js` (some da navegação); **`a7.js` inteiro e o markup de `body2.html` (`data-tab=rank`) não foram tocados**. `readHash()` cai em `visao` se o hash apontar `#t=rank`. Único ajuste de conteúdo feito enquanto desativada: os textos "leads"→"cadastros" da seção 1 de `specs/prompt_v4_reestruturacao_painel.md` foram aplicados em `a7.js` mesmo assim, para já ficar pronto na reativação. Reativar = devolver a linha em `TABS`.

**Última sincronização:** 03/09/2026 (v4.2 — botão renomeado "Mercado (corretores)"→"Corretores"; tipo `marca` passa a ranquear os 7 grupos de lançadora, não mais ~33 unidades; ainda desativada)  
**`data-tab`:** `rank`  
**Rótulo:** Rankings  
**Painel:** `section.panel[data-tab=rank]`  
**Spec relacionada:** `specs/prompt_ranking_podium_imobiliaria.md` (complemento corretor↔imobiliária)

---

## 1. Identidade

Aba de classificação competitiva de **lançadoras** (`marca`) ou **corretores** (`responsavel`), com pódio, top 10 e tabela completa.

## 2. Objetivo

Ordenar entidades por um dos 7 critérios, com corte de volume mínimo, empates dividindo posição, e complemento humano/casa no pódio e no top 10.

## 3. Seções e widgets

### Controles (`#rkbar`)

| Controle | ID | Valores |
|---|---|---|
| Tipo | `#rkTipo` buttons | `marca` (Lançadoras — 7 grupos fixos desde v4.2, ver `CONTEXTO.md`) · `responsavel` (rótulo do botão: "Corretores", desde v4.2 — era "Mercado (corretores)") |
| Critério | `#rkMet` | ver métricas abaixo |
| Mínimo de leads | `#rkMin` | 0 / 3 / 5 / 10 |

Estado: `RK = { tipo, met, min }` em `a7.js` (não vai para o hash da URL).

### Pódio (`#rkPod`)

HTML/CSS: ordem visual 2º · 1º · 3º; classes `p1`/`p2`/`p3`.  
Cada card: medalha, nome (`o.nome`), valor formatado, unidade, sub (contexto da métrica), **sub2** (complemento), “Nº lugar”.

Complemento (`sub2`):

- `tipo === 'marca'` → `Corretor: <moda de responsavel>` (desempate: mais aprovações Pix)
- `tipo === 'responsavel'` → `Imobiliária: <moda de marca>` (mesmo desempate)
- Se vazio: não renderiza `sub2`

### Os 10 primeiros (`#cRank`)

Barra horizontal; cores ouro/prata/bronze para posições 1–3, azul demais.  
Label multilinha: `posº Nome` + linha “Corretor: …” / “Imobiliária: …”.  
Tooltip: nome · valor · unidade · N leads · complemento.

### Classificação completa (`#tRank`)

Colunas: # · Lançadora|Corretor · Cadastros · Aprovadas c/ Pix · Validadas · Pix confirmado · Falta Pix · Conversão · Renda mediana.

## 4. Dados e fórmulas

Métricas (`METRICS`):

| `k` | Label | Fórmula |
|---|---|---|
| `leads` | Total de cadastros na pasta | `rs.length` |
| `aprov` | Pastas aprovadas com Pix | etapa `Pasta Aprovada com Pix` |
| `valid` | Pastas validadas pendentes de Pix | etapa `Pasta Validada pendente de Pix` |
| `pix` | Cadastros com Pix confirmado | tag `PIX` |
| `falta` | Pendências de Pix | tag `FALTA PIX` |
| `conv` | Taxa de conversão | `100 * aprov / leads` |
| `renda` | Renda mediana | mediana de `valor_renda` > 0 |

- Universo: `rowsFor(RK.tipo)` (gráfico não se auto-filtra pela dimensão ranqueada).
- Agrupamento por `r[RK.tipo]`; filtro `o.leads >= RK.min`.
- Sort: `val` desc · `leads` desc · nome `pt-BR`.
- Empate: mesma `pos`; próximo pula (5º, 5º, 5º, 8º).
- Complemento: `modeWithTieBreak`.

## 5. Interações e filtros

- Clique no pódio / barra / nome na tabela → `toggle(RK.tipo, nome, ctrl/meta)`.
- Mudança de `#rkMet` / `#rkMin` / tipo → só `paint()` (não altera `ST`).
- Export `data-name` / `data-title` da tabela atualizam dinamicamente com tipo + métrica.

## 6. Exportações

`#tRank` → CSV/XLSX/PDF com a classificação exibida (inclui ordenação por clique no cabeçalho).

## 7. Dependências de código

- `body2.html` (`rank`), **`a7.js`** (todo o módulo), `a6.js` chama `paintRank()`, `a5.js` (`tbl`), `a2.js`, `a3.js`

## 8. Critérios de aceite

- [ ] Sem mínimo, conversão 100% de quem tem 1 cadastro/1 aprovação aparece; com mínimo, some.
- [ ] Tipo `marca` ranqueia no máximo 7 grupos (HUNA, Lopes, URBS, AEVO, Adão, MyBroker, Mercado); botão do tipo `responsavel` mostra "Corretores".
- [ ] Complemento corretor/imobiliária no pódio e top 10 conforme tipo.
- [ ] `o.nome` continua sendo a chave de filtro (não o complemento).
- [ ] Empates dividem posição corretamente.
