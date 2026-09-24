# Spec — Aba Times_3 (agora rotulada "Times" na UI)

**Última sincronização:** 05/09/2026 — **renomeada de "Times_3" para "Times"** na navegação, a pedido do usuário, ao mesmo tempo em que as abas originais `times` e `times2` foram desativadas (ver `04_times.md`/`10_times2.md`). `data-tab`, IDs de elemento (`t3*`), estado (`T3`) e nomes de função (`t3Select`, `paintTimes3` etc.) **continuam `times3`/`t3` de propósito** — só o texto do rótulo em `TABS` (`a4.js`) mudou. Revisão anterior (04/09/2026, (2)): (a) gráfico de Cliente troca "valor de renda" por "dias desde o cadastro" (linha do tempo, mais antigo primeiro); (b) os 5 gráficos passam a vir **sempre abertos e populados com o recorte inteiro** desde o carregamento da aba (sem exigir clique prévio), afunilando só depois de um clique — mesmo padrão que a aba Times original já usa desde a v4.3.
**`data-tab`:** `times3`
**Rótulo na UI:** **Times** (era "Times_3" até 05/09/2026)
**Painel:** `section.panel[data-tab=times3]`
**Origem:** cópia conceitual da aba Times original (agora desativada) a pedido do usuário — mesmos gráficos de barra do padrão do painel (não SVG customizado como `Times_2`, também desativada), mas com uma divisão de imobiliária/equipe **diferente** da usada no resto do app. Com a desativação das outras duas, esta é a única aba de hierarquia de equipes visível hoje.

---

## 1. Identidade

Drill-down em 5 gráficos de barra em cascata: Imobiliária → Equipe → Gerente → Corretor → Cliente, todos usando o mesmo componente de gráfico (`build()`/Chart.js) do restante do painel — ao contrário de `Times_2` (árvore/SVG), aqui é "gráfico de barra" literal, como pedido.

## 2. Regra de divisão — DIFERENTE de `marca`/Times/Times_2 (importante)

O usuário definiu explicitamente, com exemplo: na string de `equipe` ("ADÃO SOLO - ALESSANDRO"), a **1ª palavra** é a Imobiliária ("ADÃO"), a(s) palavra(s) entre a 1ª e o hífen são a Equipe ("SOLO"), e o texto depois do hífen é o Gerente ("ALESSANDRO").

Isso é **mecânico e deliberadamente diferente** de `grupoLancadora()`/`marca` (usado em `Times`/`Times_2`), que agrupa por 6 prefixos conhecidos + "Mercado" como catch-all. Aqui **não há agrupamento**: cada primeira-palavra distinta vira sua própria "imobiliária", inclusive as que em `marca` cairiam em "Mercado" (ex.: `41`, `AJ`, `ARGON`, `DATA`, `HOPP`, `KADOSH`, `MIKASA`, `NEX`, `NEXO`, `ONE`, `PARAISO`, `PROVENDA`, `RCF`, `SHARKS`, `VELD`, `W`), e marcas de 2 palavras como `MY BROKER` viram imobiliária=`MY` + equipe começando com `BROKER ...` (não tratadas como uma coisa só, ao contrário de `grupoLancadora()`). **Confirmado com o usuário nesta sessão** que essa divergência é intencional, não um erro a corrigir.

Implementação: `t3Parts(equipe)` em `a6.js`, usando a mesma regex robusta de hífen `\s*-\s*` já usada por `gerLabel()` (a1.js) — necessário porque a base real tem pelo menos um caso de hífen sem espaço (`"W N NEGOCIOS IMOBILIARIOS -WANDERLEI ARAUJO COSTA NETO"`, achado ao construir esta aba). `equipe` sem hífen (`NEXO GESTÃO`) vira gerente `"(sem gerente)"`; prefixo de uma palavra só (`PROVENDA - TÔNIA BARCELOS`) vira equipe `"(sem equipe)"`.

### Achado de dado relevante

Sob essa divisão, **Gerente deixa de ser 1-para-1 com Equipe** (ao contrário de `Times_2`, onde "equipe" já é a string completa): mais de um gerente pode compartilhar a mesma (imobiliária, equipe) — ex.: "ADÃO"+"UNIQUE" tem 2 gerentes (Alessandro Renner de Sousa, Sandro Montagna); "AEVO"+"JARDIM GOIAS" tem 3. Por isso o gráfico de Gerente é um **nível de escolha real**, não um passthrough como em `Times_2`. E o gráfico de Corretor também é necessário como nível próprio: o nome do gerente (extraído de `equipe`) frequentemente **não é** o mesmo nome de `responsavel` nos leads — ex.: equipe "ADAO UNIQUE - SANDRO MONTAGNA" tem 4 corretores distintos em `responsavel` (Pietra, Rafael Romero, o próprio Sandro Montagna, Hiramar). **Essa foi a razão pela qual o usuário confirmou, quando perguntado, que Corretor precisa ser um 5º gráfico** (a proposta inicial de só 4 gráficos dobraria Gerente e Corretor juntos, o que perderia essa distinção real).

## 3. Seções e widgets

| Widget | IDs (canvas/box/inner/note) | Título UI | Sempre visível? |
|---|---|---|---|
| Imobiliária | `t3Imob`/`boxT3Imob`/`innerT3Imob`/`nT3Imob` | Imobiliária | sim, sempre com todas as imobiliárias do recorte |
| Equipe | `t3Eq`/`boxT3Eq`/`innerT3Eq`/`nT3Eq` | Equipe | sim — todas as equipes do recorte (rótulo qualificado com a imobiliária) se nada selecionado; só as da imobiliária escolhida caso contrário |
| Gerente | `t3Ger`/`boxT3Ger`/`innerT3Ger`/`nT3Ger` | Gerente | sim — todos os gerentes do recorte (rótulo qualificado) se imobiliária+equipe não estiverem ambas escolhidas; só os da equipe escolhida caso contrário |
| Corretor | `t3Corr`/`boxT3Corr`/`innerT3Corr`/`nT3Corr` | Corretor | sim — todos os corretores do escopo atual (recorte completo, ou já restrito por imobiliária/equipe/gerente) |
| Cliente | `t3Cli`/`boxT3Cli`/`innerT3Cli`/`nT3Cli` | Cliente | sim — todos os clientes do escopo atual, ordenados do cadastro mais antigo pro mais recente |
| Detalhe do cliente | `t3DetalheBox`/`t3Detalhe` | Dados do cliente selecionado | só após clicar numa barra de cliente (esse continua condicional — não faz sentido abrir o dossiê completo dos 182 de uma vez) |

Layout: Imobiliária/Equipe/Gerente em `.grid.three` (3 colunas); Corretor/Cliente em `.grid.two` (2 colunas) logo abaixo; card de detalhe do cliente por último. **Nenhum dos 5 gráficos fica oculto** — todos vêm com o recorte inteiro assim que a aba abre, mesmo padrão "sempre visível e populado" que a aba Times original adotou na v4.3 (ver `04_times.md`); um clique só **restringe** os níveis à direita dele, nunca esconde os outros.

### Desambiguação de rótulo quando o nível ainda não foi restringido

Como "Equipe" (palavra do meio) e "Gerente" (nome depois do hífen) podem se repetir em imobiliárias diferentes (ex.: a palavra "IMOVEIS" aparece em 6 imobiliárias distintas — HUNA, HOPP, KADOSH, MIKASA, NEX, PARAISO), mostrar tudo aberto exige cuidado pra não misturar times de negócios diferentes numa barra só:

- **Equipe**, sem imobiliária escolhida: agrupa pelo par (imobiliária,equipe) — chave interna `"IMOB||EQ"`, rótulo exibido `"IMOB EQ"` (ex. "HUNA IMOVEIS", "HOPP IMOVEIS" como barras distintas). Clicar nessa barra dispara `t3Select('eqpair', 'IMOB||EQ')`, que define `T3.imob` e `T3.eq` **ao mesmo tempo** — um clique já escolhe os dois níveis.
- **Gerente**, sem imobiliária+equipe totalmente escolhidas: agrupa sempre pela string completa de `equipe` (nunca por nome de gerente isolado), rótulo qualificado `"IMOB EQ · GERENTE"`. Clicar nessa barra dispara `t3Select('gerente', equipeCompleta)`, que recalcula `T3.imob`/`T3.eq` a partir da própria string clicada (via `t3Parts`) — assim um clique direto no Gerente, mesmo com nada mais selecionado, já preenche a cadeia toda até ali.
- **Corretor** e **Cliente** não precisam de rótulo qualificado — nome de pessoa já é suficientemente único nesta base.

## 4. Dados e fórmulas

- Universo: `R = rowsFor()` — respeita filtros globais do topo, igual a qualquer aba.
- Altura das barras em Imobiliária/Equipe/Gerente/Corretor = contagem de cadastros do nó.
- Altura das barras em Cliente = **`dias_cadastro`** (dias desde o cadastro — linha do tempo, não valor de renda). Cada barra é 1 cliente, ordenados por `dias_cadastro` decrescente (mais antigo primeiro, mais recente por último). Tooltip mostra a data completa (`cadastro`) e "N dia(s) atrás".
- Card de cliente (`mmClientCard`, reaproveitado de `Times_2`): Telefone, E-mail, Origem, Etapa, Finalidade, Valor de renda, Tags, Cadastro em — **a renda continua aparecendo aqui**, no dossiê individual; só saiu da altura da barra do gráfico.

## 5. Interações e filtros

- Estado local: `let T3={imob,eq,equipeFull,corretor,cliIdx}` — **não** usa `ST`/hash/chips, mesmo isolamento de `MM` (Times_2), `GER` (Gerente) e `ALERTSEL` (Alertas).
- Clique numa barra seleciona (destaca com `fade()`, mesmo efeito visual dos outros gráficos do painel) e **restringe** o próximo nível; clicar de novo na mesma barra desmarca e devolve os níveis depois dela ao estado "tudo aberto" (não ao estado vazio — ver seção 3, "sempre visível").
- Desmarcar um nível intermediário (ex.: clicar de novo num Gerente já selecionado) limpa só aquele nível e os mais profundos — os níveis **anteriores** (Imobiliária/Equipe, se já escolhidos por um clique próprio ou por backfill) **não** são limpos automaticamente; isso é intencional (navegação incremental tipo breadcrumb) — pra abrir tudo de novo, desmarcar também Equipe e Imobiliária.
- `t3Bar()` (helper próprio, não é o `bar()` genérico de `a2.js`) usa `build()` diretamente com um `onSel(key,index)` customizado — não pode reaproveitar `bar()` puro porque este sempre chama `toggle(ST[dim],...)`, e `imob`/`eq`/`gerente`/`corretor` aqui **não são dimensões de `ST`** nem existem em `DIMS`. Aceita `opts.keys` (chave real, usada na seleção/clique) separado de `opts.labels`/rótulo exibido (necessário pros rótulos qualificados da seção 3), e `opts.tooltip(index)` pra tooltip customizado (usado no gráfico de Cliente).
- Filtros globais do topo continuam valendo, recalculado a cada `apply()`.

## 6. Exportações

Todos os 5 gráficos têm botão "Exportar Excel" (`chart-export`, mesmo mecanismo de `a3.js`). Entradas próprias em `CHART_META`: `t3Imob`, `t3Eq`, `t3Ger`, `t3Corr`, `t3Cli` (rótulo da 1ª coluna). O card de detalhe do cliente **não** tem exportação própria (não é gráfico nem tabela).

## 7. Dependências de código

- `body2.html` (`times3`), `a4.js` (`TABS`), `a3.js` (`CHART_META`), `a6.js` (`T3`, `t3Parts`, `t3Select`, `t3Bar`, `t3Show`, `paintTimes3`, `t3ShowDetalhe`, ramo `TAB==='times3'` em `paint()`, reaproveita `mmClientCard` de Times_2), `a1.js`/`a2.js` (`rowsFor`, `fade`, `build`, `gx`, `gn`, `shortT`, `nf`, `money`)

## 8. Critérios de aceite

- [ ] Ao abrir a aba, sem nenhum clique, os 5 gráficos já aparecem populados com o recorte inteiro (Equipe e Gerente com rótulo qualificado pela imobiliária/equipe).
- [ ] Clicar numa imobiliária restringe Equipe (e em cascata Gerente/Corretor/Cliente) sem esconder os gráficos.
- [ ] Clicar direto numa barra de Equipe (sem imobiliária escolhida) já define imobiliária **e** equipe ao mesmo tempo.
- [ ] Clicar direto numa barra de Gerente (sem nada escolhido) já define imobiliária, equipe **e** gerente ao mesmo tempo.
- [ ] Uma equipe com mais de um gerente (ex. imobiliária ADAO, equipe UNIQUE) mostra 2+ barras no gráfico de Gerente.
- [ ] Clicar num gerente restringe Corretor aos `responsavel` reais daquela equipe (podem ter nomes diferentes do gerente).
- [ ] Clicar num corretor restringe Cliente; barras = dias desde o cadastro, ordenadas do mais antigo pro mais recente.
- [ ] Clicar numa barra de cliente abre o card de detalhe com telefone, e-mail, origem, etapa, finalidade, valor de renda, tags e data de cadastro.
- [ ] Clicar de novo numa barra selecionada recolhe os níveis à frente dela.
- [ ] Nenhuma seleção local desta aba aparece como chip no topo nem no hash da URL.
- [ ] Em ~390px de largura (iPhone), com os 5 níveis populados, a página não ganha rolagem horizontal própria.
