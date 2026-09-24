# Spec — Aba Times_2 (DESATIVADA em 05/09/2026)

> ⚠️ **Fora de `TABS` desde 05/09/2026**, a pedido do usuário — código e markup (`mm-*`, `paintMindMap`, `MM`) intactos e reversíveis, mesmo tratamento de `tags`/`rank`/`times`.

**Última sincronização:** 04/09/2026 (criação)
**`data-tab`:** `times2`
**Rótulo (quando ativa):** Times_2
**Painel:** `section.panel[data-tab=times2]`
**Origem:** cópia conceitual da aba Times (`04_times.md`) a pedido do usuário, com todos os gráficos removidos e substituídos por um mapa da hierarquia.

---

## 1. Identidade

Explorador visual da hierarquia comercial em formato de árvore/mapa mental clicável: Imobiliária → Equipe → Gerente → Corretor → Clientes.

## 2. Objetivo

Deixar visível, num único diagrama, o caminho completo de uma imobiliária até os clientes de um corretor específico, com os dados de compra e do cliente à mão no fim da cadeia — sem precisar cruzar informação entre gráficos separados (como a aba Times original exige).

## 3. Por que não é um gráfico Chart.js

O pedido foi por um "gráfico do tipo mapa mental". Chart.js (a única lib de gráficos do projeto) **não tem** um tipo de árvore/mapa mental — só séries cartesianas (barra, linha, etc.). Implementar isso puxaria uma biblioteca nova (ex. D3, GoJS), contra a decisão de projeto de manter o painel autocontido e leve (~830 KB, offline). A solução foi um **diagrama de árvore feito à mão**: colunas de nós HTML clicáveis + conectores desenhados em SVG (`<path>` calculado via `getBoundingClientRect()`), no mesmo espírito de outras peças já hand-rolled do projeto (mapa de calor, pódio de ranking, XLSX sem lib).

## 4. Seções e widgets

| Widget | ID | Descrição |
|---|---|---|
| Wrapper com rolagem horizontal | `#mmWrap` | contém o SVG de linhas e as colunas; rola horizontalmente se as 5 colunas não couberem (mobile ou telas estreitas) |
| Linhas conectoras | `#mmLines` (`<svg>`) | um `<path>` curvo por par (nó selecionado da coluna N) → (cada nó da coluna N+1); redesenhado a cada `paintMindMap()` e no `resize` |
| Colunas | `#mmCols` | geradas dinamicamente: **Imobiliárias** (sempre) · **Equipes** (se imobiliária selecionada) · **Gerente responsável** (se equipe selecionada — nó único, não clicável) · **Corretores** (se equipe selecionada) · **Clientes (N)** (se corretor selecionado) |
| Nota | `#nMM` | frase contextual conforme o nível de seleção atual |

### Card de cliente (coluna "Clientes")

Mostra, por cadastro: Telefone, E-mail (ou "sem e-mail"), Origem, Etapa, Finalidade, Valor de renda, Tags, Cadastro em — cobrindo "dados da compra" (etapa, finalidade, valor, tags) e "dados do cliente" (nome, telefone, e-mail, origem), como pedido.

## 5. Dados e fórmulas

- Universo: `R = rowsFor()` — respeita os filtros globais do topo (etapa, mês, tag etc.), igual a qualquer outra aba.
- Nível 1 (Imobiliárias) = dimensão **`marca`** (as 7 lançadoras agrupadas, mesma definição usada como "Imobiliárias" na aba Times original — **não** é o prefixo bruto da equipe).
- Nível 2 (Equipes) = valores distintos de **`equipe`** dentro da marca selecionada; rótulo exibido via `gerLabel(equipe)` (esconde o prefixo da marca).
- Nível 3 (Gerente responsável) = **não é uma dimensão própria** — é só a mesma string `equipe` reexibida via `gerLabel()`. Como cada `equipe` tem exatamente um gerente (`"MARCA - GERENTE"`, nunca mais de um hífen — mesma regra da aba Gerente), este nível sempre mostra **um único card**, não clicável (`clickable:false`), com os mesmos números da equipe selecionada. É redundante em termos de dado, mas foi pedido explicitamente como uma etapa própria do clique — mantido por clareza do fluxo, não por necessidade de filtragem.
- Nível 4 (Corretores) = valores distintos de **`responsavel`** dentro da equipe selecionada.
- Nível 5 (Clientes) = cadastros individuais onde `responsavel` e `equipe` batem com a seleção.
- Métrica em cada nó (`mmMetrics`): `N cadastro(s) · X% aprov.` — contagem e % de `Pasta Aprovada com Pix` dentro daquele nó, calculado sobre o subconjunto do próprio nó (não sobre a base toda).

## 6. Interações e filtros

- Estado **local** da aba: `let MM={imob,equipe,corretor}` — **não** usa `ST`/`toggle` global, não vira chip no topo, não entra no hash da URL. Mesmo padrão de isolamento já usado em `GER` (Gerente) e `ALERTSEL` (Pontos de Atenção).
- Clique simples num nó: seleciona (e recalcula as colunas à direita); clicar de novo no mesmo nó **desmarca e recolhe** todas as colunas depois dele (`mmSelect`). Não existe Ctrl/Cmd+clique aqui — é sempre seleção única por nível (a hierarquia não faz sentido com múltiplos ramos abertos ao mesmo tempo).
- Selecionar um novo nó num nível já populado reseta os níveis mais profundos (ex.: trocar de imobiliária limpa equipe e corretor selecionados).
- Filtros globais do topo continuam valendo (recalcula a cada `apply()`/`paintMindMap()`); se um filtro global elimina o nó que estava selecionado, os níveis dependentes dele simplesmente mostram "sem cadastros" (não há tratamento de erro especial — comportamento aceito, mesmo espírito de outras abas).

## 7. Exportações

**Nenhuma.** Não é gráfico Chart.js (sem `chartRows`/`expChartXLSX`) nem tabela HTML (sem `tbl()`), então os mecanismos de export existentes não se aplicam, e não foi pedido. Decisão consciente de não construir um exportador dedicado para uma estrutura hierárquica de profundidade variável.

## 8. Dependências de código

- `body2.html` (`times2`), `head2.html` (`.mm-*`), `a4.js` (`TABS`), `a6.js` (`MM`, `mmSelect`, `mmMetrics`, `mmClientCard`, `mmNodeHtml`, `paintMindMap`, `mmDrawLines`, ramo `TAB==='times2'` em `paint()`), `a1.js` (`rowsFor`, `gerLabel`, `byKey`, `topN`, `esc`, `money`, `nf`), `a6.js` (`pctFmt`, `cnt`, já existentes)

## 9. Critérios de aceite

- [ ] Sem seleção, só a coluna Imobiliárias aparece.
- [ ] Clicar numa imobiliária abre Equipes com linha conectora da imobiliária selecionada até cada equipe.
- [ ] Clicar numa equipe abre Gerente (nó único, não clicável) e Corretores.
- [ ] Clicar num corretor abre Clientes, cada card com telefone, e-mail, origem, etapa, finalidade, valor de renda, tags e data de cadastro.
- [ ] Clicar de novo num nó selecionado recolhe as colunas à direita dele, sem apagar as anteriores.
- [ ] Em telas estreitas, o mapa rola horizontalmente dentro do próprio card — a página **não** ganha rolagem horizontal própria.
- [ ] Filtros globais do topo (etapa, mês, tag etc.) mudam os números dos nós; a seleção local de Times_2 não aparece como chip nem no hash da URL.
