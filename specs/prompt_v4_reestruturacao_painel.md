# Prompt aprimorado — v4: renomeação Lead→Cadastro, KPIs por etapa, Pagamentos, desativar Tags/Ranking, hierarquia Imobiliária→Gerente→Corretor, telefone do corretor na Base

## Como usar este documento

Este é o pedido original do usuário, reescrito com precisão técnica e checado contra o código (`src/a1.js`–`a7.js`, `src/body2.html`) e contra o CRM Imobmeet ao vivo (verificado em 03/09/2026). Onde o pedido original era ambíguo ou colidia com alguma regra já estabelecida do projeto, tomei uma decisão e expliquei o porquê — **revise a seção 0 antes de mandar implementar**, porque são pontos que mudam o resultado.

Depois de implementado: atualizar `specs/abas/01_visao.md`, `02_pagto.md`, `03_tags.md`, `04_times.md`, `05_rank.md`, `08_base.md`, `specs/abas/README.md` (inventário) e `CONTEXTO.md` (seção "As 8 abas" passa a ter 6 abas visíveis) — por regra do próprio projeto.

---

## 0. Decisões tomadas para resolver ambiguidade do pedido original

1. **"Lead" → "Cadastro" só no texto visível ao usuário, não nos identificadores internos do código.** O termo "lead" aparece dezenas de vezes como nome de função (`tLeads`), id de elemento (`#tLeads`, `#nLeads`), chave de objeto (`o.leads`, `k:'leads'` em `METRICS`) e atributo `data-table`. Renomear tudo isso é um refactor de alto risco e zero benefício visual. **Troco a palavra só em texto de tela, título, nota, cabeçalho de tabela e nos `data-name`/`data-title` de exportação** (que aparecem no nome do arquivo baixado, então contam como "visível"). Identificadores JS/HTML ficam como estão.
2. **"Lead" → "Cadastro" não pode ser um find-and-replace literal.** O código já usa a palavra "cadastro" com outro sentido (a data de entrada do lead: campo `cadastro`, etapa `Cadastro Cliente`). Um replace cego produz frases quebradas como "Declaração do cadastro no cadastro." Reescrevi cada ocorrência à mão (lista completa na seção 1) em vez de mandar substituir a palavra.
3. **Corrigi um typo de digitação do pedido original:** "PASSTA VALIDADA PENDENTE DE PIX" → **`Pasta Validada pendente de Pix`** (grafia exata que já existe em `ETAPAS`, sem o "SS"). Isso não é o mesmo tipo de "erro que tem que manter" do CRM (como `Pasta em Anállise`) — é um erro de digitação do pedido, não do sistema de origem.
4. **`Desistente` é uma etapa real e ativa do Funil de Pasta — confirmei ao vivo no CRM.** O quadro `/leads/gestao/128` tem **9 colunas possíveis**, não as 5 que `ETAPAS` conhece hoje: `Cadastro Cliente`, `Pasta em Anállise`, `Pasta com Pendência`, `Pasta Reprovada` (0 hoje), `Pasta Condicionada` (0 hoje), `Pasta Validada pendente de Pix`, `Pasta Aprovada com Pix`, `Desistente` (**3 leads agora**), `Pasta Aprovada` (0 hoje, diferente de "Pasta Aprovada com Pix"). Confirmei também que a extração via `/leads/list` com `tableFilters.funil.funil='128'` **já traz os leads em "Desistente"** normalmente (não é um filtro que os esconde) — então não é preciso mexer em `extracao/01_leads_e_detalhes.js` para os números aparecerem.
5. **Decisão: `Desistente` vira um card novo na Visão Geral, mas NÃO entra na constante global `ETAPAS`.** O pedido diz explicitamente para manter os outros elementos da Visão Geral intactos, e o gráfico "Leads por etapa do funil" (`#cEtapa`), o select `fEtapa` e as métricas `aprov`/`valid` de `a7.js` dependem de `ETAPAS`. Adicionar `Desistente` ali replicaria em cascata para o funil, os filtros e o Ranking — mudança maior do que o pedido cobre. O card de Desistente lê `DATA`/`rowsFor()` direto pelo texto exato da etapa, sem passar por `ETAPAS`. **Se no futuro o usuário quiser `Desistente` (e as 3 etapas hoje zeradas) selecionáveis no filtro e no gráfico do funil, isso é uma decisão de escopo maior — perguntar antes.**
6. **"Times" — a hierarquia Imobiliária→Gerente→Corretor já existe nos dados, só não está exposta assim.** `marca` (imobiliária) já é campo derivado. O que falta é um segundo corte: `equipe` sempre vem como `"MARCA - GERENTE"` (confirmei: nenhuma das 45 equipes tem mais de um hífen, então dividir por hífen é seguro). O "Gerente" do pedido é a parte depois do hífen. Uma equipe (`NEXO GESTÃO`) não tem hífen — tratar como "sem gerente distinto", usando a própria equipe como rótulo.
7. **"Desative a aba Ranking" e "desative a aba Tags" tratadas como o mesmo tipo de operação (reversível), não como exclusão de código.** Para o Ranking o pedido já diz "vamos reativá-lo" depois. Para Tags, "retire da tela" já fica satisfeito removendo o botão da navegação — não precisa apagar `a7.js` nem o markup de `body2.html`. Ambas as abas ficam com o código intacto e inacessível pela UI; reativar depois é uma linha.
8. **"A tabela Base de Leads receberá o telefone do corretor" — esse dado já existe na tela hoje**, dentro da coluna "Contato do responsável" (telefone + e-mail combinados na mesma célula, em duas linhas). Interpretei o pedido como "separar isso em duas colunas" em vez de "adicionar de novo" (senão ficaria duplicado). Se a intenção era outra, avisar.

---

## 1. Renomear "Lead(s)" → "Cadastro(s)" em todo texto visível

**Não** mexer em: nomes de função/variável, `id`/`class` de elemento, chaves de objeto (`tLeads`, `#tLeads`, `#nLeads`, `o.leads`, `b.leads`, `k:'leads'` em `a7.js`). Só o texto abaixo, com a redação já ajustada para não colidir com o outro sentido de "cadastro":

| Arquivo:linha | Texto atual | Texto novo |
|---|---|---|
| `body2.html:13` | `<b id="bTot">151</b> leads` | `<b id="bTot">151</b> cadastros` |
| `body2.html:41` | `Nenhum lead neste recorte` | `Nenhum cadastro neste recorte` |
| `body2.html:54` | `Leads por etapa do funil` | `Cadastros por etapa do funil` |
| `body2.html:57` | `...estão os leads de cada safra mensal.` | `...estão os cadastros de cada safra mensal.` |
| `body2.html:61` | `Data de cadastro do lead.` | `Data de entrada do cadastro no funil.` |
| `body2.html:68` | `Quantos leads carregam cada marcador financeiro.` | `Quantos cadastros carregam cada marcador financeiro.` (nota: este card muda de nome — ver seção 2) |
| `body2.html:114` | `Origem do lead` | `Origem do cadastro` |
| `body2.html:139` | `Mínimo de leads` | `Mínimo de cadastros` |
| `body2.html:174` | `Declaração do lead no cadastro.` | `Declaração informada no cadastro.` |
| `body2.html:185` | `<h2>Leads que exigem ação</h2>` | `<h2>Cadastros que exigem ação</h2>` |
| `body2.html:188` | `data-title="Leads que exigem ação"` | `data-title="Cadastros que exigem ação"` |
| `body2.html:188` | `data-name="leads_para_acao"` | `data-name="cadastros_para_acao"` |
| `body2.html:194` | `<h2>Base de leads</h2>` | `<h2>Base de Cadastros</h2>` |
| `body2.html:196` | `data-name="base_de_leads"` | `data-name="base_de_cadastros"` |
| `body2.html:196` | `data-title="Base de leads — Funil de Pasta"` | `data-title="Base de Cadastros — Funil de Pasta"` |
| `body2.html:207` (rodapé) | `...da ficha de cada lead...` / `Um lead pode ter várias tags... total de leads.` / `...zerado em 148 dos 151 leads.` | `...da ficha de cada cadastro...` / `Um cadastro pode ter várias tags... total de cadastros.` / `...zerado em 148 dos 151 cadastros.` |
| `a4.js:3` (`TABS`) | `['base','Base de Leads']` | `['base','Base de Cadastros']` |
| `a4.js:60` | `` `${nf(n)} de ${nf(DATA.length)} leads` `` | `` `${nf(n)} de ${nf(DATA.length)} cadastros` `` |
| `a2.js:84` (`bar()`, tooltip genérico) | `' leads ('+pct(...)+')'` | `' cadastros ('+pct(...)+')'` — **este é o de maior alcance: é o tooltip padrão de praticamente todo gráfico de barra do painel (Visão Geral, Pagamentos, Tags¹, Times, Perfil)** |
| `a3.js:28` | `'Somente leads sem tag'` | `'Somente cadastros sem tag'` |
| `a5.js:9` (KPI) | `'Leads no recorte'` | `'Cadastros no recorte'` (card também muda de posição — ver seção "Visão Geral") |
| `a5.js:15` (KPI) | `'Leads sem nenhuma tag'` | *(card removido — ver seção "Visão Geral")* |
| `a5.js:52` (cabeçalho `tLeads`) | `'Lead'` | `'Cadastro'` |
| `a6.js:15` | `` `${pct(...)} dos leads estão em...leads.`:'Sem leads.' `` | `` `${pct(...)} dos cadastros estão em...cadastros.`:'Sem cadastros.' `` |
| `a6.js:25` | `...etapa em que o lead está hoje.` | `...etapa em que o cadastro está hoje.` |
| `a6.js:39` | `'Sem leads.'` | `'Sem cadastros.'` |
| `a6.js:47` | `` `${nf(px)} leads com Pix confirmado...` `` | `` `${nf(px)} cadastros com Pix confirmado...` `` |
| `a6.js:66` | `Barras somam marcações, não leads — um lead pode ter...` | `Barras somam marcações, não cadastros — um cadastro pode ter...` |
| `a6.js:75` | `...com ${nf(...)} leads.` | `...com ${nf(...)} cadastros.` |
| `a6.js:90` | `Cada lead conta uma vez por categoria...` | `Cada cadastro conta uma vez por categoria...` *(nota: aba Tags será desativada — ver seção 3; ajustar só se o código ficar de pé, dormente)* |
| `a6.js:96` | `{t:'Leads (recorte)'}` / `{t:'Leads (base)'}` | `{t:'Cadastros (recorte)'}` / `{t:'Cadastros (base)'}` *(idem — dentro da aba Tags)* |
| `a6.js:131` | `Declaração feita no cadastro do lead.` | `Declaração feita no momento do cadastro.` |
| `a6.js:136` | `Sobre ${nf(n)} leads do recorte...` | `Sobre ${nf(n)} cadastros do recorte...` |
| `a6.js:142` | `['Leads sem nenhuma marcação', ...]` | `['Cadastros sem nenhuma marcação', ...]` |
| `a6.js:149` (cabeçalho `tAcao`) | `'Lead'` | `'Cadastro'` |
| `a6.js:154` | `...leads no recorte com pelo menos um ponto de atenção.` | `...cadastros no recorte com pelo menos um ponto de atenção.` |
| `a6.js:176` | `Relatório a partir de N leads e M marcações...` | `Relatório a partir de N cadastros e M marcações...` |
| `a7.js:10` | `l:'Total de leads na pasta'`, `un:'leads'` | `l:'Total de cadastros na pasta'`, `un:'cadastros'` |
| `a7.js:13` | `l:'Leads com Pix confirmado (tag PIX)'` | `l:'Cadastros com Pix confirmado (tag PIX)'` |
| `a7.js:15` | `(aprovadas ÷ leads)` (comentário do label) | `(aprovadas ÷ cadastros)` |
| `a7.js:18` | `l:'Renda mediana dos leads'` | `l:'Renda mediana dos cadastros'` |
| `a7.js:88` | `` `${nf(o.aprov)} de ${nf(o.leads)} leads` `` / `` `${nf(o.leads)} leads no total` `` | trocar só o `' leads'` final por `' cadastros'` nas duas variantes |
| `a7.js:122` | `...+nf(o.leads)+' leads'` (tooltip do top 10) | `...+nf(o.leads)+' cadastros'` |
| `a7.js:132` | `{t:M.un==='leads'?'Leads':'Leads', ...}` | Essa ternária sempre resulta na mesma string nos dois ramos (bug cosmético pré-existente, não introduzido agora) — simplificar para `{t:'Cadastros', ...}` |
| `a7.js:150` | `...${nf(total)} leads no recorte.` | `...${nf(total)} cadastros no recorte.` |

¹ A aba Tags será desativada (seção 3) — o texto lá só importa se o código continuar existindo (dormente).

**Não renomear:** o rótulo da coluna `#rkMet` "Total de leads na pasta" no SELECT do Ranking também muda pelo item acima (`a7.js:10`), mas a aba Ranking inteira está sendo desativada (seção 4) — ajustar o texto de qualquer forma, já que o código fica pronto para quando reativar.

---

## 2. Aba Visão Geral

### 2.1 Substituir os 9 KPIs atuais por 8 novos

Função `kpis(rows)` em `a5.js`. Recorte: `rows = rowsFor()`, igual hoje.

| # | Rótulo (JS, sem caixa-alta — o CSS `.kpi .lb{text-transform:uppercase}` já deixa maiúsculo na tela) | Fórmula | Classe |
|---|---|---|---|
| 1 | Cadastros no recorte | `nf(n)` · sub `pct(n,DATA.length)+' da base'` | — |
| 2 | Pix confirmado | `nf(c('PIX'))` · sub `pct(c('PIX'),n)` | `k-good` |
| 3 | Cadastro Cliente | `nf(cnt(rows,r=>r.etapa==='Cadastro Cliente'))` · sub `pct(...,n)` | — |
| 4 | Pasta em Anállise | `nf(cnt(rows,r=>r.etapa==='Pasta em Anállise'))` · sub `pct(...,n)` — **grafia exata do CRM, com "ll"** | — |
| 5 | Pasta com Pendência | `nf(cnt(rows,r=>r.etapa==='Pasta com Pendência'))` · sub `pct(...,n)` | `k-warn` |
| 6 | Pasta Validada pendente de Pix | `nf(cnt(rows,r=>r.etapa==='Pasta Validada pendente de Pix'))` · sub `pct(...,n)` | `k-warn` |
| 7 | Pasta Aprovada com Pix | `nf(cnt(rows,r=>r.etapa==='Pasta Aprovada com Pix'))` · sub `pct(...,n)` | `k-good` |
| 8 | Desistente | `nf(cnt(rows,r=>r.etapa==='Desistente'))` · sub `pct(...,n)` | `k-crit` |

`c(t)` e `cnt(...)` já existem (`a5.js`/`a6.js`). Removidos da Visão Geral: Aguardando PIX, Plano longo, Renda mediana, Cadastros sem nenhuma tag, Tags distintas em uso, Sem e-mail válido — essas métricas continuam existindo em outras abas (Perfil e Valores, Pontos de Atenção), só saem do topo da Visão Geral.

**Consequência a confirmar com o usuário:** com a aba Tags desativada (seção 3) e "Tags distintas em uso" fora da Visão Geral, **não sobra nenhum lugar no painel que mostre quantas tags diferentes estão em uso** — se isso importa, precisa de um novo lugar para esse número.

### 2.2 Resto da aba

Funil (`#cEtapa`, `#cMes`) e Evolução no tempo (`#cTempo`) **ficam exatamente como estão** — mesmos IDs, mesma lógica, só o texto "leads"→"cadastros" das notas (seção 1).

---

## 3. Aba Pagamentos

### 3.1 Gráfico "Tags de pagamento" → renomear para "Plano de pagamento" e restringir a 4 tags

Card em `body2.html` (`<canvas id="cPgto">`), alimentado por `bar('cPgto','tag',pg,...)` em `a6.js`, onde hoje `pg = PGTO.filter(t=>ALLTAGS.includes(t))` e `PGTO=["PIX","FALTA PIX","Venda à vista","Até 24x","Até 48x","Plano longo","BOLETO NEXO"]` (`a1.js`).

- Trocar `<p class="ch-t">Tags de pagamento</p>` por `<p class="ch-t">Plano de pagamento</p>`.
- Criar uma nova constante (ex.: `PLANOTAGS=["Venda à vista","Até 24x","Até 48x","Plano longo"]`) e usar `pg = PLANOTAGS.filter(t=>ALLTAGS.includes(t))` só neste gráfico — **não alterar `PGTO`**, que continua sendo usado por `#cStack` e `#cPix` na mesma aba (esses dois precisam continuar considerando PIX/FALTA PIX, o pedido não pede para tirá-los de lá).
- Isso faz sentido com o achado da seção 3 do `CONTEXTO.md`: o campo `plano_pagamento` da ficha foi descontinuado pelo CRM, e essas 4 tags são hoje a única fonte real de "forma/prazo de pagamento" — o gráfico está literalmente virando a nova representação de "Plano de pagamento".

### 3.2 Remover a nota `#nPgto`

`a6.js` linha ~47 monta o texto `"${nf(px)} cadastros com Pix confirmado contra ${nf(fp)} pendentes — razão de..."`. Como PIX/FALTA PIX saem deste gráfico específico, a frase perde sentido aqui (a comparação Pix confirmado × pendente já existe, e continua existindo, na seção "Situação do Pix" mais abaixo na mesma aba, gráfico `#cPix`). **Remover** a linha que popula `#nPgto` e o `<p class="note" id="nPgto"></p>` em `body2.html`.

### 3.3 Remover o gráfico "Campo 'Plano de pagamento'" (`#cPlano`)

Remover o card inteiro em `body2.html` (título, subtítulo, canvas `#cPlano`, nota `#nPlano`) e o bloco correspondente em `a6.js` (que monta `pl`, chama `bar('cPlano',...)` e popula `#nPlano`). Motivo: com o campo `plano_pagamento` sempre vazio (achado documentado no `CONTEXTO.md`), esse gráfico hoje mostra 100% "Não preenchido" — informação zero.

**Decisão de layout necessária:** a seção "Marcadores financeiros" era um `.grid.two` com os dois cards (`#cPgto` + `#cPlano`) lado a lado. Com `#cPlano` fora, sobra um card sozinho. Recomendo tirar o `.grid.two` dessa seção e deixar o card "Plano de pagamento" ocupar a largura toda (mais legível com 4 barras só). Se preferir manter os dois-por-linha, essa seção passaria a ficar desbalanceada visualmente — ajustar conforme o gosto de quem for implementar.

**Não pedido, mas para avaliar depois:** o filtro do topo `fPlano` (dimensão `plano_pagamento`) continua existindo e hoje só oferece "(não informado)" como opção real. Não faz parte deste pedido remover o filtro — só o gráfico.

---

## 4. Aba Tags — desativar (remover da navegação)

Aplicar o mesmo padrão dos dois casos (Tags e Ranking, seção 5): **remover a entrada da aba de `TABS` em `a4.js`**, deixando `body2.html` (seção `data-tab="tags"`) e o bloco `if(TAB==='tags'){...}` de `a6.js` **intactos e inacessíveis** — ninguém navega até lá porque o botão sumiu.

- Isso remove da tela: gráfico "Frequência de cada tag" (`#cTags`), "Tags por categoria" (`#cCat`), mapa de calor etapa×tag (`#tHeat`) e o catálogo de tags (`#tDim`).
- **Não** remove a capacidade de filtrar por tag/categoria no resto do painel: os selects do topo `fTag`, `fCat`, `fModo` e a dimensão `tag`/`categoria` em `DIMS` continuam funcionando normalmente em todas as outras abas (Pagamentos, Base de Leads, etc.) — só a aba dedicada de visualização de tags some.
- **Proteção de hash obrigatória:** hoje, se alguém tiver um link salvo com `#t=tags`, `readHash()` (`a1.js`) vai setar `TAB='tags'`, mas como não existirá mais `<button data-tab="tags">`, o painel ficaria com nenhuma aba marcada como ativa e o painel correspondente escondido (`section.panel.on` nunca bate). Adicionar em `readHash()` (ou logo depois, antes do primeiro `showTab()`): se `TAB` não estiver entre as chaves de `TABS`, voltar para `'visao'`.

---

## 5. Aba Ranking — desativar (reversível, mesmo mecanismo da seção 4)

Mesma técnica: remover `['rank','Rankings']` de `TABS` em `a4.js`. **Não tocar em `a7.js` nem no markup de `body2.html`** — ficam prontos, só o botão de navegação some. A proteção de hash da seção 4 (`TAB` inválido → `'visao'`) cobre `#t=rank` também.

Reativar depois = devolver a linha `['rank','Rankings']` no array `TABS`, na posição que fizer sentido na hora.

---

## 6. Aba Times — Imobiliárias → Gerentes → Corretores (drill-down em 3 níveis)

### 6.1 O que muda

Os dois gráficos atuais "Equipes" (`#cEquipe`, todas as 45 equipes soltas) e "Responsáveis" (`#cResp`, todos os 61 corretores soltos) saem. Entram **3 gráficos em cascata**, reaproveitando dimensões que já existem (`marca`, `equipe`, `responsavel` já estão em `DIMS`, já têm filtro, chip, hash e select no topo — nada de estado novo é necessário):

| Nível | Rótulo do card | Dimensão (`ST`) | Aparece quando |
|---|---|---|---|
| 1 | Imobiliárias | `marca` | sempre |
| 2 | Gerentes | `equipe` | `ST.marca.length === 1` |
| 3 | Corretores | `responsavel` | `ST.equipe.length === 1` |

- **Nível 1:** `bar('cImob','marca', marcas, valores, cor, {total:...})` sobre `rowsFor('marca')`, igual ao padrão de `#cEquipe` hoje (`topN(byKey(Re,'marca'),9999)` — todas, sem corte). Clique → `toggle('marca', nomeDaMarca, ctrlOuCmd)`, já é o comportamento padrão de `bar()`.
- **Nível 2:** só renderiza quando exatamente uma marca está selecionada (`ST.marca.length===1`). Nesse caso, `rowsFor('equipe')` **já vem filtrado pela marca** (porque `rowsFor(except)` aplica todas as dimensões ativas exceto as passadas em `except` — `marca` continua valendo o filtro). Agrupar essas linhas por `equipe`; como toda `equipe` daquele recorte já pertence à marca selecionada, isso dá exatamente "os gerentes daquela imobiliária". Rótulo de cada barra = a `equipe` **sem o prefixo da marca** (ex.: mostrar "ROSINALDO JARDIM" em vez de "HUNA IMOVEIS - ROSINALDO JARDIM" — a marca já está implícita no filtro ativo); usar `bar(...,{short: e => e.split(/\s*-\s*/).slice(1).join(' - ').trim() || e})` — o fallback `|| e` cobre o caso `NEXO GESTÃO`, que não tem hífen (confirmado: só essa equipe, entre as 45 atuais, não separa marca/gerente — usar a própria equipe como rótulo). **Importante:** o clique continua chamando `toggle('equipe', <valor original com o prefixo>, add)` — o rótulo é só cosmético, a chave de filtro/chip/hash tem que continuar sendo a `equipe` completa, senão quebra a sincronia com o resto do painel.
  - Quando `ST.marca.length !== 1` (nenhuma marca ou mais de uma via Ctrl/Cmd): esconder o gráfico e mostrar um texto tipo "Selecione uma imobiliária no gráfico acima para ver os gerentes." no lugar do canvas.
- **Nível 3:** só renderiza quando exatamente uma `equipe` está selecionada (`ST.equipe.length===1`). `rowsFor('responsavel')` já vem filtrado por essa equipe (mesma lógica). Agrupar por `responsavel`, mesmo padrão do `#cResp` de hoje (todos, sem corte de topN). Clique → `toggle('responsavel', nome, add)`.
  - Caso contrário: placeholder "Selecione um gerente no gráfico acima para ver os corretores."
- **Efeito colateral esperado e desejado:** como os 3 gráficos usam o mesmo `toggle`/`ST` global de sempre, clicar neles filtra o painel inteiro (todas as abas), exatamente como qualquer outro clique em barra hoje — não é um filtro "local" da aba Times.
- **Altura dos boxes:** reaproveitar `fitBox(id, n)` (já existe em `a6.js`) para os 3 — nos níveis 2 e 3 as listas tendem a ser curtas (poucos gerentes por marca, poucos corretores por equipe), então o box vai encolher sozinho pela própria fórmula (`max(320, n*23+72)`).
- **Layout:** os 3 cards ficam empilhados verticalmente (não lado a lado em `.grid.two` como hoje), porque 2 dos 3 só aparecem depois de um clique no anterior — layout de mestre→detalhe lê melhor de cima para baixo.
- **Notas de cada gráfico** (padrão do projeto: toda visualização tem uma frase curta):
  - Nível 1: `"${nf(marcas.length)} lançadoras no recorte; clique numa para ver os gerentes dela."`
  - Nível 2 (quando visível): `"${nf(gerentes.length)} equipe(s)/gerente(s) em ${marcaSelecionada}; clique numa para ver os corretores."`
  - Nível 3 (quando visível): `"${nf(corretores.length)} corretor(es) em ${rotuloDoGerente}."`

### 6.2 Remover a tabela Responsável × tag

Remover, dentro da mesma aba `times`: `<h2>Responsável × tag</h2>`, a tabela `#tRT` e sua barra de exportação, e o bloco correspondente em `a6.js` que monta `heat('tRT',...)`.

### 6.3 O que fica igual

"Origem dos cadastros" (`#cOrigem`, top 12) não foi mencionado no pedido — mantido como está (só o texto "lead"→"cadastro" das notas, se houver).

---

## 7. Aba Base de Leads (renomeada para "Base de Cadastros" — seção 1) — telefone do corretor

Hoje a coluna "Contato do responsável" (`a5.js`, função `tLeads`) já mostra telefone (link `wa.me`) + e-mail do corretor na mesma célula, em duas linhas. Separar em duas colunas:

| Coluna nova | Conteúdo |
|---|---|
| Telefone do corretor | só `resp_tel`, mesmo link clicável `https://wa.me/55{dígitos}` que já existe |
| E-mail do corretor | só `resp_email`, mesmo `mailto:` que já existe |

Ajustar `head` (array de cabeçalhos) e o `map` que monta `rr` em `tLeads()` (`a5.js`) para duas colunas em vez de uma célula combinada. Como as exportações (`a3.js`, função `grab()`) leem o DOM da tabela genericamente, a mudança já reflete sozinha em CSV/XLSX/PDF — não precisa mexer em `a3.js`.

---

## 8. Verificação (rodar depois de implementar)

- [ ] Buscar "lead" (case-insensitive) nos arquivos-fonte só deve sobrar em identificadores internos (`tLeads`, `#tLeads`, `#nLeads`, `o.leads`, `k:'leads'`) — nenhum texto visível na tela ou em nome de arquivo exportado.
- [ ] Visão Geral mostra exatamente 8 cards, na ordem da tabela da seção 2.1; funil e evolução no tempo continuam idênticos a antes.
- [ ] Aba Pagamentos: card "Plano de pagamento" mostra só 4 barras (Venda à vista, Até 24x, Até 48x, Plano longo); nenhuma nota abaixo dele; card "Campo Plano de pagamento" não existe mais; `#cStack`/`#cPix` continuam mostrando PIX/FALTA PIX normalmente.
- [ ] Aba Tags não aparece na navegação; `#t=tags` na URL cai em Visão Geral sem quebrar.
- [ ] Aba Rankings não aparece na navegação; `#t=rank` na URL cai em Visão Geral sem quebrar; `a7.js` continua no arquivo, sem alterações de lógica.
- [ ] Aba Times: só o gráfico "Imobiliárias" aparece de início; clicar numa marca revela "Gerentes" com só as equipes daquela marca, rótulo sem o prefixo; clicar num gerente revela "Corretores" só daquela equipe; clicar num corretor filtra o painel inteiro; tabela Responsável×tag não existe mais.
- [ ] Base de Cadastros tem colunas separadas "Telefone do corretor" e "E-mail do corretor", ambas clicáveis; export CSV/XLSX/PDF reflete as duas colunas.
- [ ] `specs/abas/03_tags.md` e `05_rank.md` atualizados com uma nota de "desativada, código intacto"; `specs/abas/02_pagto.md`, `04_times.md`, `08_base.md` e `01_visao.md` atualizados para o novo comportamento; `specs/abas/README.md` e `CONTEXTO.md` (seção "As 8 abas") refletem 6 abas visíveis.
