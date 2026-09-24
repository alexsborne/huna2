# Spec — Aba Times (DESATIVADA em 05/09/2026)

> ⚠️ **Fora de `TABS` desde 05/09/2026**, a pedido do usuário — código e markup intactos e reversíveis (mesmo tratamento já dado a `tags`/`rank`). O rótulo "Times" foi liberado e passou para a aba `times3` (ver `11_times3.md`), que ficou sozinha representando a hierarquia de equipes na navegação. Esta spec descreve o comportamento de quando a aba estava ativa — reativar exige também resolver a colisão de rótulo com `times3`.

**Última sincronização:** 03/09/2026 (v4.3 — os 3 níveis do drill-down ficam sempre visíveis, sem exigir clique prévio)  
**`data-tab`:** `times`  
**Rótulo (quando ativa):** Times  
**Painel:** `section.panel[data-tab=times]`

---

## 1. Identidade

Aba operacional de volume por imobiliária, gerente e corretor, mais origem dos cadastros. Mostra os 3 níveis da hierarquia — lançadora (imobiliária) → equipe (gerente) → corretor — **sempre populados desde a abertura da aba**; clicar numa barra de um nível estreita o(s) nível(is) abaixo dele, mas nenhum nível depende de clique prévio para aparecer.

## 2. Objetivo

Deixar claro a hierarquia real da carteira de uma vez só — os três níveis completos, respeitando os filtros globais do topo — e permitir refinar clicando, sem exigir uma sequência de cliques para simplesmente ver os dados.

> **Histórico:** entre 03/09/2026 18:19 (v4) e 03/09/2026 20:37 (v4.2), esta aba exigia clicar numa imobiliária para ver "Gerentes" e num gerente para ver "Corretores" (drill-down em cascata, cada nível escondido até o anterior ser escolhido). Isso foi revertido de propósito em 03/09/2026 (v4.3) a pedido do usuário — ver `specs/prompt_times_niveis_sempre_visiveis.md`, decisão 0.1. A filtragem por clique em si não mudou nunca; só a condição que decidia mostrar ou esconder cada gráfico.

## 3. Seções e widgets

### Volume por time

| Widget | ID | Box | Aparece quando |
|---|---|---|---|
| Imobiliárias | `#cImob` / `#nImob` | `#boxImob` | sempre |
| Gerentes | `#cGer` / `#nGer` | `#boxGer` | sempre |
| Corretores | `#cCorr` / `#nCorr` | `#boxCorr` | sempre |

**Layout: os 3 cards ficam lado a lado**, num `<div class="grid three">` (3 colunas em telas largas; menos colunas conforme o espaço encolhe — `grid-template-columns:repeat(auto-fit,minmax(300px,1fr))`).

**Altura fixa com rolagem própria:** cada `#box*` tem classe `cbox tall scroll` — altura **fixa** em 390px (herdada de `.tall`) com `overflow-y:auto`, em vez de crescer sem limite com a quantidade de itens. Dentro de cada box há um `<div class="cbox-inner" id="inner*">` que recebe a altura calculada por `fitBox('inner*', n) = max(320, n*23+72)` px — é esse miolo que cresce (ex.: até 831px quando "Gerentes"/"Corretores" mostram as 45/61 unidades inteiras sem nenhum filtro ativo), e o box externo rola para revelar o excesso, sem esticar a página.

### Origem dos cadastros

| Widget | ID | Tipo | Título UI |
|---|---|---|---|
| Origem | `#cOrigem` / `#nOrigem` | bar | Origem do cadastro |

Top **12** origens (`topN(..., 12)`) — sempre visível, inalterado.

### Removido em 03/09/2026

A tabela/heatmap "Responsável × tag" (`#tRT`) foi **removida** (markup e lógica de `a6.js`), a pedido do usuário. Não há mais cruzamento responsável×tag em nenhuma aba (a aba Tags, que também tinha um heatmap etapa×tag, está desativada — ver `03_tags.md`).

## 4. Dados e fórmulas

Reaproveita 100% as dimensões já existentes em `DIMS` (`marca`, `equipe`, `responsavel`) — nenhum estado novo foi criado; a única coisa que mudou nesta revisão foi **parar de esconder** o gráfico enquanto nada foi clicado.

- **Nível 1 (Imobiliárias):** `rowsFor('marca')`, `topN(byKey(...,'marca'), 9999)` — todas, sem corte. `marca` é um grupo fixo (7 no máximo: HUNA, Lopes, URBS, AEVO, Adão, MyBroker, Mercado) desde a v4.2 — ver `CONTEXTO.md`, seção "Decisões de modelagem" e `specs/prompt_agrupamento_lancadoras_mercado.md`.
- **Nível 2 (Gerentes):** **sempre calculado e desenhado**, com `Rg = rowsFor('equipe')` e `gk = topN(byKey(Rg,'equipe'), 9999)` — se `ST.marca` tiver uma ou mais marcas ativas, `rowsFor` já filtra sozinho (mecanismo `rowsFor(except)`, inalterado); sem filtro, mostra as 45 equipes inteiras.
  - **Rótulo condicional** (`short` passado a `bar()`): quando `ST.marca.length===1`, usa `gerLabel(e)` (remove o prefixo da marca — ex. mostra "SANDRO MONTAGNA"); em qualquer outro caso (nenhuma marca selecionada, ou mais de uma via Ctrl/Cmd), mostra a `equipe` completa truncada (`shortT(l,32)`, ex. "ADAO UNIQUE - SANDRO MONTAGNA…") — sem isso, gerentes de imobiliárias diferentes ficariam misturados na lista sem nenhuma pista de qual marca cada um pertence.
  - `gerLabel(e)`: `e.split(/\s*-\s*/).slice(1).join(' - ').trim() || e` — o fallback `|| e` cobre `NEXO GESTÃO`, a única das 45 equipes sem hífen.
  - **O clique sempre usa a `equipe` completa** (com prefixo), nunca o rótulo exibido — senão quebra a sincronia com `ST.equipe`/chips/hash.
  - Nota (`#nGer`): com exatamente uma marca selecionada, `` `${n} equipe(s)/gerente(s) em ${marca}; clique numa para ver os corretores.` ``; sem seleção (ou mais de uma), `` `${n} equipe(s)/gerente(s) no total; clique numa imobiliária acima para restringir, ou clique direto numa equipe para ver os corretores dela.` ``.
- **Nível 3 (Corretores):** **sempre calculado e desenhado**, com `Rc = rowsFor('responsavel')` e `ck = topN(byKey(Rc,'responsavel'), 9999)` — mesmo mecanismo. Rótulo sempre `shortT(l,26)` (sem variante condicional — `responsavel` nunca carregou prefixo de marca/equipe, então não há contexto a perder).
  - Nota (`#nCorr`): com exatamente uma equipe selecionada, `` `${n} corretor(es) em ${gerLabel(equipe)}.` ``; sem seleção (ou mais de uma), `` `${n} corretor(es) no total; clique num gerente acima para restringir, ou clique direto num corretor para filtrar o painel.` ``.
- Origem: `rowsFor('origem')`, top 12 — inalterado.

## 5. Interações e filtros

- Clique numa barra do Nível 1 → `toggle('marca', nome, ctrl/cmd)` — igual a qualquer outro gráfico do painel (filtra o painel inteiro, não só esta aba). Estreita o Nível 2 e troca o rótulo dele para "sem prefixo".
- Clique numa barra do Nível 2 → `toggle('equipe', <equipe completa>, ctrl/cmd)`. Estreita o Nível 3.
- Clique numa barra do Nível 3 → `toggle('responsavel', nome, ctrl/cmd)` — funciona normalmente mesmo sem nunca ter clicado em Imobiliárias/Gerentes antes (filtra `responsavel` globalmente, como qualquer clique de gráfico).
- Clique em barra de Origem → dimensão `origem`, inalterado.
- **Comportamento verificado ao trocar de imobiliária com um gerente de outra marca ainda selecionado** (clique simples em Nível 1 troca `ST.marca`, mas não limpa `ST.equipe`): como `equipe` deriva `marca`, a combinação `marca=B` + `equipe=<equipe de A>` não bate em nenhum cadastro — o painel cai no estado **global** "Nenhum cadastro neste recorte" (`#empty`, o mesmo card genérico que aparece pra qualquer combinação de filtros contraditória em qualquer aba, com os botões "Desfazer último filtro"/"Limpar tudo"). Não é um estado dedicado desta aba, é o comportamento padrão do painel — documentado aqui para não ser confundido com defeito.

## 6. Exportações

Nenhuma tabela nesta aba (a tabela Responsável×tag exportável foi removida junto com o heatmap). Os 4 gráficos (`#cImob`, `#cGer`, `#cCorr`, `#cOrigem`) têm cada um seu próprio botão "Exportar Excel", **sempre visível** (desde que os 3 níveis passaram a ser sempre populados, não há mais motivo para esconder o botão de Gerentes/Corretores). Se por algum motivo o gráfico estiver sem dado nenhum no recorte atual, o botão mostra "Sem dados para exportar" por 2s em vez de usar `alert()` (que travaria a aba).

## 7. Dependências de código

- `body2.html` (`times`), `a6.js` (ramo `times`, função `gerLabel`), `a2.js` (`bar`), `a1.js` (`DIMS`, `rowsFor`), `a3.js` (`expChartXLSX`, `chartRows`, `mountChartExports`)

## 8. Critérios de aceite

- [ ] Abrir a aba Times sem nenhum filtro ativo mostra as três barras (Imobiliárias, Gerentes, Corretores) já populadas — nenhuma com mensagem de "selecione algo acima".
- [ ] Sem seleção, "Gerentes" mostra 45 barras com rótulo incluindo a marca (ex. "ADAO UNIQUE - SANDRO MONTAGNA", truncado); "Corretores" mostra 61 barras.
- [ ] Clicar numa imobiliária estreita "Gerentes" para só as equipes daquela marca **e** o rótulo passa a mostrar só o nome do gerente (sem o prefixo).
- [ ] Clicar num gerente estreita "Corretores" para só os responsáveis daquela equipe.
- [ ] Clicar direto numa barra de "Corretores" sem nunca ter clicado em Imobiliárias/Gerentes funciona normalmente.
- [ ] Trocar de imobiliária (clique simples) com um gerente de outra marca ainda ativo em `ST.equipe` faz o painel cair no estado global "Nenhum cadastro neste recorte" (comportamento padrão esperado, não um bug desta aba).
- [ ] Equipe `NEXO GESTÃO` (sem hífen) aparece com esse nome completo como rótulo do gerente, sem quebrar, tanto na lista completa quanto filtrada.
- [ ] Tabela/heatmap Responsável×tag não existe mais em lugar nenhum da aba.
- [ ] Os 3 cards do drill-down aparecem lado a lado (não empilhados); cada um rola dentro de si mesmo sem esticar a página.
- [ ] Nenhuma das notas (`#nGer`/`#nCorr`) cita "Selecione..." — todas descrevem o total quando não há seleção.
- [ ] Botão "Exportar Excel" de Gerentes/Corretores está sempre visível; nunca abre um `alert()`.
- [ ] Nível 1 mostra no máximo 7 barras (HUNA, Lopes, URBS, AEVO, Adão, MyBroker, Mercado); "Lopes" só aparece se houver cadastro. Clicar em "Adão" no Nível 1 mostra no Nível 2 os gerentes das 4 unidades (Unique/Vida Nova/Solo/Matriz) juntos.
