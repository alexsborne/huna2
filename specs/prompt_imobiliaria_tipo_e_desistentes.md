# Prompt aprimorado — Imobiliária (tipo Lançadora/Mercado) + Desistentes fora do cálculo

**Status:** ✅ **implementado em 05/09/2026**, depois de confirmadas as 4 perguntas da seção 0 (usuário aceitou todas as recomendadas: 0.1=A, 0.2=Sim, 0.4=D1, Desistente mantido em `#fEtapa`). Detalhes finais em `CONTEXTO.md` (v4.10) e `specs/abas/01_visao.md`/`07_alertas.md`. Este documento fica como registro do pedido original — a seção 0 (perguntas) já não é mais "pendente", é o histórico de como cada conflito foi resolvido.  
**Pedido original (resumo):** trocar a palavra “Lançadora” por “Imobiliária” em todo o relatório; o filtro de Imobiliária passa a ter só **duas** opções (Lançadora | Mercado); na Visão Geral, Desistentes podem existir nos dados mas **não entram no cálculo de leads** e o **card Desistente some**.

**Base de referência:** `dados/rows.json` · código em `src/a1.js` (`grupoLancadora`, `DIMLABEL`, `ETAPAS`), `a4.js` (`#fMarca`), `a5.js` (`kpis`), `body2.html`.  
**Specs a sincronizar ao final (obrigatório):** `specs/abas/01_visao.md`, demais abas que citem “Lançadora”, `specs/abas/README.md`, `CONTEXTO.md`, e rodar o protocolo `specs/prompt_sync_specs_apos_alteracao.md`.

**Pré-existente relacionado (não apagar):** `specs/prompt_agrupamento_lancadoras_mercado.md` — já definiu as **6 lançadoras conhecidas** + catch-all **Mercado** via `grupoLancadora()` / `GRUPOS_LANCADORA`. Este novo pedido **reusa essa classificação**, mas muda o que o **filtro do topo** expõe (de até 7 nomes → **2 tipos**).

---

## 0. Conflitos — perguntar antes de implementar

### 0.1 Filtro com 2 opções vs. gráficos que ainda listam as 6+Mercado

**Regra existente:** `r.marca` vale um de até 7 rótulos (`HUNA`, `Lopes`, `URBS`, `AEVO`, `Adão`, `MyBroker`, `Mercado`). O select `#fMarca`, chips, hash e gráficos da aba Times (e Times_2) usam esses valores.

**Mudança pedida:** o filtro “Imobiliária” tem **só duas opções**: `Lançadora` (as 6 conhecidas, sem Mercado) e `Mercado` (todo o resto).

**Por que conflita:** se `marca` passar a ser só `"Lançadora"|"Mercado"`, o drill-down “Imobiliárias” deixa de distinguir HUNA vs URBS vs Adão etc.

**Opções:**

| # | Comportamento |
|---|---|
| **A (recomendada)** | Criar campo derivado novo, ex. `tipo_imob` ∈ `{Lançadora, Mercado}`. O filtro do topo `#fMarca` (renomeado na UI para Imobiliária) passa a filtrar por `tipo_imob`. Manter `marca` com os 7 grupos para gráficos/hierarquia que precisam do nome fino. |
| B | Substituir `marca` pelos 2 tipos em todo o painel. Gráficos de “Imobiliárias” passam a ter no máximo 2 barras (Lançadora / Mercado). Quem quiser HUNA vs Adão usa só Equipe/Gerente. |
| C | Filtro do topo com 2 opções, mas clique nos gráficos continua setando `marca` nos 7 valores (dois mecanismos paralelos — mais confuso para chips/hash). |

**Pergunta ao usuário:** qual opção (A, B ou C)?  
**Impacto nas specs:** A → nova dimensão em `DIMS`/`DIMLABEL` + specs de filtro global e Times; B → rewrite pesado de Times/Ranking/CONTEXTO; C → documentar dois eixos e risco de chip contraditório.

### 0.2 A palavra “Lançadora” some da UI ou vira só o nome de uma opção?

**Pedido:** “todo lugar com LANCADORA vira IMOBILIÁRIA” **e** a opção do filtro se chama “Lançadora”.

**Interpretação recomendada:**

- **Rótulo da dimensão / labels de filtro / chips / eixos que falavam “Lançadora” como sinônimo do campo** → passam a **“Imobiliária”**.
- **Valor da opção de tipo** → continua se chamando **“Lançadora”** (é o nome do tipo, não o nome da dimensão).
- Textos do tipo “N lançadoras no recorte” → “N imobiliárias no recorte” (ou “N grupos”, conforme o contexto).
- **Não** renomear identificadores internos (`marca`, `grupoLancadora`, `cImob`, arquivos) só por estética — só o que o usuário lê.

**Pergunta:** confirma essa interpretação? (Sim = seguir; Não = descrever exceções.)

### 0.3 Escopo de “todo o relatório” nos gráficos de hierarquia

Na aba **Times** / **Times_2**, o 1º nível já se chama “Imobiliárias” e lista os grupos de `marca`. Na **Times_3**, a divisão é outra (primeira palavra da equipe).

**Pergunta:** com o filtro em 2 tipos (Lançadora|Mercado):

1. O 1º nível dos gráficos de hierarquia continua mostrando os **nomes finos** (HUNA, URBS… + Mercado), **ou**
2. Também colapsa para **só 2 barras** (Lançadora | Mercado)?

Recomendação: se escolheu **0.1-A**, manter nomes finos nos gráficos; o filtro global é que opera em tipo. Se escolheu **0.1-B**, colapsar.

### 0.4 Desistentes — “não constam no cálculo de leads” até onde?

Hoje (dados atuais): etapa `Desistente` existe (~3 cadastros). Há KPI card “Desistente” na Visão Geral; `Desistente` **não** está em `ETAPAS` (funil `#cEtapa` / `#cMes` já ignoram). `estagnado()` já exclui Desistente.

**Pedido:** Desistentes podem aparecer, mas **não vão constar no cálculo de leads**; **ocultar o card Desistentes**.

**Opções de escopo do exclusão do cálculo:**

| # | O que exclui Desistente |
|---|---|
| **D1 (recomendada)** | Em **todo** o painel: denominadores e contagens de “cadastros/leads no recorte”, KPIs de total, badges, notas percentuais, rankings, alertas e gráficos — como se `rowsFor()` (ou um `rowsAtivos()`) ignorasse `etapa==='Desistente'` por padrão. Ainda assim o cadastro **pode aparecer** na Base de Cadastros / busca se o usuário filtrar explicitamente a etapa Desistente (ou com um toggle “incluir desistentes”). |
| D2 | Só na **Visão Geral**: total do card “Cadastros no recorte”, notas `#nEtapa`/`#nTempo` etc. excluem Desistente; outras abas continuam contando. |
| D3 | Excluir de todos os **totais/KPIs**, mas **manter** Desistente nas barras do funil se um dia entrar em `ETAPAS`, e sempre na Base. |

**Perguntas:**

1. Qual escopo (D1, D2 ou D3)?  
2. Desistente deve continuar no select **Etapa** do topo (`#fEtapa`)? (Recomendado: **sim**, para “poder aparecer” quando alguém filtrar.)  
3. Na Base de Cadastros, desistentes entram na lista do recorte padrão ou só quando a etapa Desistente está selecionada?

### 0.5 Card Desistente

**Pedido claro:** ocultar o card.  
**Implementação:** remover da lista `K` em `kpis()` / markup equivalente — não só `display:none` cosmético. Atualizar `01_visao.md` (de 8 KPIs → 7) e critérios de aceite.

Sem pergunta extra se 0.4 estiver respondido.

---

## 1. Objetivo (depois das respostas da §0)

1. **Nomenclatura:** em toda a UI do painel, a dimensão hoje chamada “Lançadora” passa a se chamar **“Imobiliária”** (label do filtro, `DIMLABEL`, placeholders “Todas as…”, chips, títulos/notas/exports visíveis que usem essa palavra como nome do campo).
2. **Tipos de Imobiliária (regra global de negócio):** existem **somente dois tipos**:
   - **Lançadora** = união das 6 conhecidas já codificadas em `GRUPOS_LANCADORA` (`HUNA`, `Lopes`, `URBS`, `AEVO`, `Adão`, `MyBroker`) — **sem** incluir Mercado.
   - **Mercado** = todo o restante (o que `grupoLancadora()` já classifica como `'Mercado'`).
3. **Filtro do topo:** o select de Imobiliária oferece só duas opções (`Lançadora`, `Mercado`) + estado “todas”; selecionar uma restringe o painel inteiro a esse tipo.
4. **Visão Geral:** ocultar o card Desistente; Desistentes **não entram** no cálculo de leads conforme a opção D* escolhida.

---

## 2. Nomenclatura — mapa do que mudar

Varredura obrigatória (texto visível ao usuário). Trocar “Lançadora(s)” → “Imobiliária(s)” **quando for o nome da dimensão**; preservar “Lançadora” **quando for o nome do tipo/opção**.

| Local típico | Arquivo | Hoje | Depois |
|---|---|---|---|
| Label do filtro | `body2.html` `#fMarca` | `Lançadora` | `Imobiliária` |
| `DIMLABEL.marca` | `a1.js` | `Lançadora` | `Imobiliária` |
| Placeholder do select | `a4.js` `fillSel('fMarca',…)` | `Todas as lançadoras` | `Todas as imobiliárias` (ou “Todos os tipos”, se 0.1-A e o select listar tipos) |
| Notas / subtítulos | `body2.html`, `a6.js`, `a7.js` | “lançadoras no recorte…” | “imobiliárias…” / texto alinhado ao novo modelo |
| Export chart meta | `a3.js` `cImob:{dim:'Lançadora'}` | Lançadora | Imobiliária |
| Ranking (código dormente) | `a7.js` / `body2.html` botão | `Lançadoras` | alinhar: botão do tipo fino ou “Imobiliárias”, conforme 0.1/0.3 — **não** deixar “Lançadoras” como sinônimo da dimensão |

**Não confundir** com a palavra “marcações” (tags) — não alterar.

Critério de busca no repo após a mudança:  
`rg -i "lan[cç]adora" src/ specs/abas/` — cada ocorrência restante deve ser (a) nome do **tipo/opção**, (b) nome de função interna (`grupoLancadora`), ou (c) histórico em spec — nunca label de dimensão na UI ativa.

---

## 3. Modelo de dados — tipos Lançadora | Mercado

### 3.1 Definição canônica (já existe na prática)

```text
É Lançadora  ⇔  grupoLancadora(prefixo_de_equipe) ∈ {HUNA, Lopes, URBS, AEVO, Adão, MyBroker}
É Mercado    ⇔  caso contrário (inclui NEXO GESTÃO e demais)
```

As 6 regex já estão em `GRUPOS_LANCADORA` (`a1.js`). **Não reinventar a lista** neste prompt; se a lista de 6 mudar no futuro, muda só `GRUPOS_LANCADORA`.

### 3.2 Implementação recomendada (se 0.1 = A)

```js
// após r.marca = grupoLancadora(raw);
r.tipo_imob = (r.marca === 'Mercado') ? 'Mercado' : 'Lançadora';
```

- Incluir `tipo_imob` em `DIMS` e `DIMLABEL` (`Imobiliária` ou `Tipo de imobiliária` — preferir **Imobiliária** no filtro único do topo).
- **Decisão de UX do filtro:** o `#fMarca` atual deve:
  - **passar a ser o select de `tipo_imob`** (só 2 opções), **ou**
  - permanecer ligado a `marca` e criar outro select — **evitar dois selects**; um só, com 2 opções.

Recomendação: **um select** `#fMarca` (id pode permanecer) com `data-dim="tipo_imob"`, opções `Lançadora` e `Mercado`, label **Imobiliária**.

- Chips / hash da URL: gravar `tipo_imob=Lançadora` (não as 6 marcas). Links antigos com `marca=HUNA` etc.: ao ler hash, ou mapear HUNA→selecionar tipo Lançadora, ou ignorar chave desconhecida — **perguntar se não estiver óbvio**; recomendado mapear qualquer uma das 6 → `tipo_imob=Lançadora`, `marca=Mercado` → `tipo_imob=Mercado`.

### 3.3 Se 0.1 = B

```js
r.marca = (grupoLancadora(raw) === 'Mercado') ? 'Mercado' : 'Lançadora';
```

`uniq('marca')` ≤ 2. Gráficos por `marca` colapsam. Mais simples, menos granularidade.

---

## 4. Regra global no relatório

Onde o usuário **filtra ou lê “tipo de imobiliária”**:

| Ação do usuário | Efeito |
|---|---|
| Seleciona **Lançadora** | Entram só cadastros das 6; **exclui** Mercado |
| Seleciona **Mercado** | Entram só cadastros de Mercado; **exclui** as 6 |
| Nenhuma / “Todas” | Sem filtro de tipo |

Essa regra vale para **todas as abas** via o mesmo estado de filtro (cross-filter), não só Visão Geral.

Gráficos que quebram por nome fino de marca (se 0.1-A) **continuam** podendo mostrar HUNA/URBS/… dentro do recorte já filtrado por tipo.

---

## 5. Aba Visão Geral — Desistentes

### 5.1 Ocultar card

- Remover o item **Desistente** da lista de KPIs em `kpis()` / `kpiCards`.
- Não deixar card vazio nem CSS `display:none` como solução permanente.
- Atualizar `01_visao.md`: tabela de KPIs sem Desistente; aceite “7 KPIs” (ou o N correto).

### 5.2 Fora do cálculo de leads (aplicar conforme 0.4)

Definir helper único, ex.:

```js
const isDesistente = r => r.etapa === 'Desistente';
const rowsLead = rows => rows.filter(r => !isDesistente(r));
```

Usar `rowsLead(...)` em:

- Card **“Cadastros no recorte”** (denominador e valor).
- Percentuais dos outros KPIs da Visão Geral (denominador = cadastros sem desistente), **exceto** se um KPI for explicitamente sobre Desistente (não haverá mais).
- Notas `#nEtapa`, `#nMes`, `#nTempo` na Visão Geral.
- Se D1: também totais globais (`bTot` se representar “leads do relatório”), rankings, alertas “% do recorte”, etc.

**Podem aparecer:**

- Na Base de Cadastros (conforme resposta 0.4.3).
- No filtro Etapa, opção `Desistente`, se mantida — aí o recorte pode ser *só* desistentes; nesse caso especial, o total da Visão Geral pode ser 0 leads “ativos” com nota clara, ou mostrar os desistentes só porque o filtro pediu — **recomendado:** se `ST.etapa` contém apenas Desistente (ou inclui Desistente de propósito), não forçar exclusão (senão o filtro vira inútil). Regra:

```text
Excluir desistentes do cálculo IFF o recorte não está explicitamente filtrado para a etapa Desistente.
```

### 5.3 Funil `#cEtapa` / `#cMes`

Já usam `ETAPAS` sem Desistente — manter. Não adicionar Desistente a `ETAPAS`.

---

## 6. Arquivos provavelmente tocados

| Arquivo | Mudança |
|---|---|
| `src/a1.js` | `DIMLABEL`; `tipo_imob` (se A); helper desistente; possivelmente `matchDim` |
| `src/a4.js` | `fillSel` do filtro Imobiliária com 2 opções; label |
| `src/body2.html` | label `Imobiliária`; textos “lançadora(s)” |
| `src/a5.js` | `kpis` sem card Desistente; totais com `rowsLead` |
| `src/a6.js` | notas Visão Geral; strings “lançadora”; Times se B |
| `src/a3.js` | `dim:` de export |
| `src/a7.js` | strings Ranking (mesmo desativado) |
| `specs/abas/01_visao.md` + outras + `CONTEXTO.md` | sync obrigatório |

Rebuild: `cd src && python rebuild2.py` (UTF-8).

---

## 7. Critérios de aceite

### Nomenclatura e filtro

- [ ] Nenhum label de dimensão na UI ativa diz “Lançadora”; diz **Imobiliária**.
- [ ] O select de Imobiliária lista exatamente **Lançadora** e **Mercado** (além de “todas”).
- [ ] Selecionar **Lançadora** exclui 100% dos `marca==='Mercado'` (ou `tipo_imob==='Mercado'`).
- [ ] Selecionar **Mercado** exclui 100% das 6 lançadoras.
- [ ] A regra vale em qualquer aba (KPIs, gráficos, tabelas, exports) via o mesmo filtro.
- [ ] Chip e hash refletem o tipo escolhido.

### Visão Geral / Desistentes

- [ ] Card Desistente **não** aparece.
- [ ] Totais/percentuais de leads na Visão Geral (e no escopo D* escolhido) **ignoram** `etapa==='Desistente'`, salvo filtro explícito por essa etapa.
- [ ] Funil continua sem barra Desistente.
- [ ] Spec `01_visao.md` descreve só o funcionamento atual (sem o card).

### Specs

- [ ] Protocolo `prompt_sync_specs_apos_alteracao.md` executado.
- [ ] `CONTEXTO.md` atualiza a definição de Imobiliária / tipos Lançadora vs Mercado (e o papel de `marca` vs `tipo_imob` se A).

---

## 8. Checklist de perguntas (copiar para o usuário)

Antes de codar, obter resposta a:

1. **§0.1** Modelo do filtro 2 opções: **A**, **B** ou **C**?  
2. **§0.2** Confirma: dimensão = “Imobiliária”, opção de tipo = “Lançadora”?  
3. **§0.3** Gráficos de hierarquia: nomes finos ou só 2 barras?  
4. **§0.4** Escopo desistentes: **D1**, **D2** ou **D3**? Desistente no `#fEtapa`? Base lista desistentes no recorte padrão?

---

## 9. Texto curto do pedido (origem, para rastreio)

> Todos os locais do relatório que tiver a palavra LANCADORA deve passar a se chamar IMOBILIÁRIA. No filtro: nomenclatura Imobiliária; só duas opções — Lançadora (as 6 conhecidas sem mercado) e Mercado (demais sem lançadoras). Regra vale para todo o relatório: só dois tipos de IMOBILIÁRIA. Aba visão geral: Desistentes podem aparecer mas não constam no cálculo de leads; ocultar o card Desistentes.
)
