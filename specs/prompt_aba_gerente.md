# Prompt aprimorado — Nova aba "Gerente": autoatendimento por gestor de equipe

## Como usar este documento

Este é o pedido original do usuário ("Crie uma aba intitulada gerente... faça todas as análises possíveis...") reescrito com precisão técnica e checado contra o código atual (`src/a1.js`–`a7.js`, `src/body2.html`, `src/a4.js`). O pedido original era certo no espírito mas ambíguo em pontos que mudam o resultado — a seção 0 resolve cada um deles e explica o porquê. **Revisar a seção 0 antes de implementar**; se alguma decisão não for a intenção do usuário, avisar antes de generalizar o resto.

Depois de implementado: criar `specs/abas/09_gerente.md` (mesmo formato das outras specs — ver `specs/abas/README.md`), atualizar a tabela de inventário em `specs/abas/README.md` e a seção "As N abas" do `CONTEXTO.md` (passa a ter 7 abas visíveis) — regra já registrada do próprio projeto (nenhuma mudança de comportamento de aba fica sem spec sincronizada).

---

## 0. Decisões tomadas para resolver ambiguidade do pedido original

1. **Não existe campo "gerente" isolado nos dados — é o campo `equipe`.** Confirmado em `a1.js`/`a4.js`: `equipe` sempre vem como `"MARCA - GERENTE"` (nenhuma das ~45 equipes tem mais de um hífen; a única exceção, `NEXO GESTÃO`, não tem hífen e é tratada como equipe sem gerente distinto — mesma regra já usada na aba Times, função `gerLabel`). "Escolher seu nome" = escolher um valor de `equipe` no seletor, exibido só pelo rótulo do gerente (`gerLabel(equipe)`), com a imobiliária ao lado para desambiguar.
2. **A escolha do gerente é um estado local da aba, não um filtro global.** Não usar `toggle('equipe', ...)`/`ST.equipe` para isso: isso viraria um chip removível no topo e mudaria as outras 6 abas, o que não é o objetivo de uma tela de autoatendimento pessoal. Criar uma variável nova `GER` (string do valor de `equipe`, ou `null`), usada só dentro do bloco `TAB==='gerente'`. Persistir em `localStorage` (chave `nexoGerenteSel`) para lembrar a escolha na próxima visita — mesmo padrão já usado para tema (`nexoTema` em `a1.js`). **Não** persistir no hash da URL (evitaria crescer o hash e evita expor "sou fulano" num link copiado/compartilhado).
   - Os filtros globais do topo (etapa, marca, mês, tag etc.) continuam valendo dentro da aba: o universo de dados do gerente é `rowsFor('equipe').filter(r => r.equipe === GER)` — assim, se o gerente também aplicar um filtro de mês no topo, ele vê só os próprios dados daquele mês. Isso é consistente com todas as outras abas (nenhuma ignora os filtros globais).
   - Interações **dentro** do conteúdo (clicar numa barra de corretor, por exemplo) seguem a convenção padrão do painel inteiro: `toggle('responsavel', nome, ctrl/cmd)`, que filtra globalmente como em qualquer outro gráfico. Só o seletor "Meu time" no topo da aba é local.
3. **"Corretores vinculados ao gerente" = todo `responsavel` que aparece em ao menos 1 cadastro com `equipe === GER`** no recorte atual. Não existe cadastro separado de vínculo gerente↔corretor fora dos próprios leads — é a mesma inferência que a aba Times já faz no nível 3 do drill-down.
4. **"Melhores clientes" = perfil de cliente que mais converte para aquele gerente**, não uma lista de nomes de clientes. Interpretação: cruzar faixa de renda, origem e finalidade com a taxa de conversão (etapa "Pasta Aprovada com Pix") dentro do time do gerente, com um corte mínimo de amostra (evita destacar "100% de conversão" de uma origem com 1 único lead). Se a intenção do usuário era outra (ex.: listar os clientes de maior renda por nome), avisar antes de deixar como está.
5. **"Pontos de melhoria" reaproveita os 3 sinais já definidos na aba Pontos de Atenção** (sem nenhuma tag, "Falta Pix" há 7+ dias, sem e-mail válido — `a6.js`, bloco `TAB==='alertas'`), recalculados só sobre o time do gerente, mais **um 4º sinal novo** específico de gestão: corretor com conversão abaixo da média do próprio time. Não inventar limiares novos para os 3 primeiros sinais — usar exatamente os mesmos já validados (7 dias, etc.).
6. **Nome/posição da aba:** `data-tab="gerente"`, rótulo **"Gerente"** (conforme pedido, sem alterar). Em `TABS` (`a4.js`), inserir logo depois de `['times', 'Times']` e antes de `['perfil', 'Perfil e Valores']` — mesma família conceitual (hierarquia imobiliária→gerente→corretor) da aba Times, então fica ao lado dela na navegação.
7. **Sem autenticação.** O seletor lista todos os gerentes; qualquer visitante pode escolher qualquer nome — mesma política de acesso do resto do painel (já é público, decisão de privacidade já tomada e aceita pelo usuário, não reabrir aqui). Se o usuário quiser restringir por login, é mudança de escopo maior — perguntar antes de implementar.
8. **IDs de elementos não podem colidir com os da aba Times**, que já usa `cGer`/`nGer`/`boxGer`/`innerGer` para outro gráfico (equipes de uma marca). Todos os IDs novos desta aba usam o prefixo `ger` combinado com um sufixo próprio (lista completa na seção 8).
9. **"Pendências de pastas" (pedido detalhado numa mensagem seguinte) expandiu a seção 6 original de 3 sinais para 4, e trouxe duas armadilhas de dado que já tinham sido investigadas e resolvidas antes — reaproveitar as respostas em vez de reabrir a investigação:**
   - **"Documentos" não tem campo nem tag dedicados.** A extração (`dados/rows.json`) não traz nenhum indicador direto de "documento pendente". O catálogo de tags (`dados/catmap.json`) tem uma categoria `CONTRATO` (`PROPOSTA`, `MODELO DIGITAL`, `MODELO MISTO`, `CONTRATO DIGITAL`, `CONTRATO FÍSICO`, `Contrato - Emitido`, `Contrato - Enviado`, `CONTRATO REENVIADO`, `CONTRATO EM CORREÇÃO`) que é o melhor proxy disponível: um cadastro numa etapa avançada (fora de `Cadastro Cliente`) sem nenhuma tag dessa categoria provavelmente está com documentação pendente. **Usar esse proxy, documentando que é um proxy** — se o usuário quiser o dado real de "documento entregue/pendente" do CRM, isso exige extrair um campo novo (mudança em `extracao/01_leads_e_detalhes.js`, fora do escopo de um prompt de UI).
   - **"Evoluir status com o passar dos dias" (estagnação) não pode usar `dias_sem_movimento`/`ultima_atualizacao`.** Esses dois campos existem em `dados/rows.json` mas **já foram testados e descartados** como medida de estagnação — `CONTEXTO.md`: *"'Última atualização' é inútil como medida de estagnação — a maioria dos registros é tocada por alguma rotina do CRM poucos dias após o cadastro. O alerta de pendência usa dias desde o cadastro."* A régua correta, já validada no restante do painel, é **`dias_cadastro`** combinado com a `etapa` atual ainda não ser terminal (`Pasta Aprovada com Pix` nem `Desistente`) — exatamente a mesma lógica que `Pontos de Atenção` já usa para "Falta Pix há 7+ dias", só generalizada para qualquer etapa parada, não só Pix.
   - **`valor_negocio` (o campo de "valor da venda") existe em `dados/rows.json` mas está fora do `keep` de `src/rebuild2.py`** — ou seja, **não chega ao painel hoje**. Precisa ser adicionado ao `keep` para a checagem de "cadastro deve ter valor da venda" funcionar (seção 8). `CONTEXTO.md` já documenta por que foi descartado antes: *"Valor do Negócio foi descartado dos gráficos: zerado na quase totalidade dos leads."* Reintroduzir só para checagem de presença (não para um gráfico de distribuição, que continua sem sentido com o dado majoritariamente zerado) é diferente da decisão antiga e não a contradiz — mas **esperar que a grande maioria dos cadastros apareça como "sem valor de venda"**, porque é o dado real, não um bug da checagem nova.
   - **"Conclusão de cadastros" e "cadastro deve ter finalidade/valor da venda/tag de plano/tag de Pix" são o mesmo conceito**, não dois pedidos separados — ver seção 6.3, que define uma função única `fichaComercialCompleta(r)` reaproveitada também pela correção cross-aba de `specs/prompt_completude_cadastro.md`.

---

## 1. Objetivo e fluxo da aba

Dar a cada gerente uma visão de autoatendimento do próprio time: ao abrir a aba, sem nenhum nome escolhido, **nenhum dado aparece** — só o seletor "Meu time". Assim que ele escolhe seu nome, a tela mostra, na ordem: (a) visão geral do time, (b) desempenho de cada corretor vinculado, (c) perfil dos clientes que mais convertem no time dele, (d) pontos de melhoria por corretor, com 4 tipos de pendência de pasta (Falta de Pix, Documentos, Conclusão de cadastro, Estagnação de status — seção 6). O objetivo final é que o gerente saiba, ao entrar, **com quem falar primeiro** (corretor com mais pendências / conversão mais baixa), **que tipo de cliente priorizar** (perfil de maior conversão) e **quais pastas específicas travaram e por quê**.

---

## 2. Seletor "Meu time" (gate da aba)

Markup em `body2.html`, dentro de `<section class="panel" data-tab="gerente">`, antes de qualquer outro conteúdo:

```html
<div class="card">
  <p class="ch-t">Meu time</p>
  <p class="ch-s">Escolha seu nome para ver os dados do seu time.</p>
  <select id="gerSel"><option value="">Selecione seu nome…</option></select>
  <p class="note" id="nGerSel"></p>
</div>
<div id="gerGate" style="display:none">
  <!-- todo o resto do conteúdo da aba (seções 3–6) vive aqui dentro -->
</div>
```

- Popular `#gerSel` com **todos** os valores de `uniq('equipe')` (não só os do recorte filtrado no topo — a escolha de identidade não deve depender de quais filtros globais estão ativos no momento), ordenados por `gerLabel(equipe)` (ordem alfabética pt-BR do nome do gerente, não da equipe completa). Rótulo de cada `<option>`: `` `${gerLabel(equipe)} — ${marca}` `` (ex.: "ROSINALDO JARDIM — HUNA IMOVEIS"), `value` = a `equipe` completa (chave real usada nos dados). Para `NEXO GESTÃO` (sem hífen), `gerLabel` retorna a própria string — o rótulo fica `"NEXO GESTÃO — NEXO GESTÃO"`; aceitável, não é um caso que precisa de tratamento especial além do que `gerLabel` já faz.
- Ao carregar a aba (ou o painel inteiro), ler `localStorage.getItem('nexoGerenteSel')`. Se o valor existir e ainda for uma `equipe` válida em `uniq('equipe')`, pré-selecionar e já renderizar o conteúdo. Se o valor salvo não existir mais nos dados atuais (ex.: depois de uma reextração que mudou nomes de equipe), ignorar silenciosamente e voltar ao estado "nada selecionado" — não lançar erro.
- `onchange` do `#gerSel`: `GER = valor || null`; `try{ localStorage.setItem('nexoGerenteSel', GER||''); }catch(e){}`; repintar a aba.
- Estado sem seleção: `#gerGate` com `display:none`; `#nGerSel` mostra `"Selecione seu nome acima para ver os dados do seu time."`.
- Estado com seleção mas **zero cadastros no recorte atual** (pode acontecer se um filtro global do topo, ex. um mês específico, não bater com nenhum cadastro daquele time): manter `#gerGate` visível, mas cada seção interna (3–6) mostra sua própria nota de "nenhum cadastro deste time no recorte atual — os filtros ativos no topo podem estar excluindo todos" e esconde seus gráficos/tabelas, no mesmo padrão já usado pelos boxes condicionais da aba Times (`display:none` no card, nunca no layout). **Não** confundir com o estado global `#empty` do painel (que já existe para "nenhum cadastro em lugar nenhum") — aqui outras abas continuam com dados normalmente.

---

## 3. Visão geral do time (KPIs)

Universo: `const Rg = rowsFor('equipe').filter(r => r.equipe === GER)` (chamar de `Rg` para não colidir com o `R` global de `paint()`).

Cards de KPI (reaproveitar o mesmo componente visual de `.kpi` já usado em `kpis()`, `a5.js`, num container novo `#gerKpis`):

| # | Rótulo | Fórmula | Classe |
|---|---|---|---|
| 1 | Cadastros do time | `nf(Rg.length)` · sub `pct(Rg.length, DATA.length)+' da base toda'` | — |
| 2 | Corretores no time | `nf(uniq('responsavel').filter(nome => Rg.some(r=>r.responsavel===nome)).length)` — ver nota abaixo | — |
| 3 | Pix confirmado | `nf(cnt(Rg,r=>has(r,'PIX')))` · sub `pct(...,Rg.length)` | `k-good` |
| 4 | Falta Pix | `nf(cnt(Rg,r=>has(r,'FALTA PIX')))` · sub `pct(...,Rg.length)` | `k-warn` |
| 5 | Pasta Aprovada com Pix | `nf(cnt(Rg,r=>r.etapa==='Pasta Aprovada com Pix'))` · sub taxa de conversão do time (reaproveitar `METRICS.find(m=>m.k==='conv').fn(Rg)`, de `a7.js`) | `k-good` |
| 6 | Renda mediana do time | `money(METRICS.find(m=>m.k==='renda').fn(Rg))` | — |

Nota para o card 2: contar corretores distintos direto sobre `Rg` é mais simples e igualmente correto — `new Set(Rg.map(r=>r.responsavel)).size` — preferir essa forma a filtrar `uniq('responsavel')` (evita duas passadas).

**Reaproveitar `METRICS` de `a7.js` para as fórmulas de conversão e renda mediana** em vez de reescrever a lógica — `METRICS` já é um array de `{k, fn, fmt, ...}` que aceita qualquer array de linhas, não só recortes globais; chamar `m.fn(Rg)` funciona sem nenhuma mudança em `a7.js`.

---

## 4. Corretores vinculados — desempenho individual

### 4.1 Gráfico de volume

`#cGerCorr` / `#nGerCorr`, dentro de um `.card` com `.cbox.tall.scroll` (mesmo padrão de altura elástica `fitBox` já usado em Times) — barra horizontal, `bar('cGerCorr','responsavel', nomes, valores, '#2a78d6', {total:Rg.length, short:l=>shortT(l,26)})`, onde `nomes`/`valores` vêm de `topN(byKey(Rg,'responsavel'), 9999)` (todos os corretores do time, sem corte — mesmo padrão do nível 3 de Times). Clique numa barra → `toggle('responsavel', nome, ctrl/cmd)` (filtro global padrão, ver decisão 0.2).

### 4.2 Tabela de desempenho por corretor

`#tGerCorr`, colunas idênticas às da aba Ranking (reaproveitar **exatamente** o array `METRICS` de `a7.js`, sem duplicar fórmulas): `#` · Corretor · Cadastros · Aprovadas c/ Pix · Validadas · Pix confirmado · Falta Pix · Conversão · Renda mediana.

Construção: agrupar `Rg` por `responsavel`; para cada corretor, `const o={nome:k}; METRICS.forEach(m=>o[m.k]=m.fn(rs));` (mesmo padrão de `rkTable()` em `a7.js`, só que a *lista de grupos* é o time do gerente, não `rowsFor(RK.tipo)` global — não chamar `rkTable()` diretamente, ela depende do estado global `RK`; escrever uma função local pequena, ex. `gerTable(rows)`, que reaproveita `METRICS` mas agrupa por `responsavel` sobre o array passado). Ordenar por `leads` desc por padrão (`{k:2,d:-1}` em `tbl(...)` — ajustar índice conforme a ordem final das colunas), permitindo reordenar por qualquer coluna (comportamento padrão de `tbl()`). Nome do corretor clicável (`data-ger-corr="nome"`) chamando `toggle('responsavel', nome, ctrl/cmd)`, igual ao padrão `data-rk` de `tRank`.

Nota abaixo da tabela (`#nGerCorrTbl`): identificar o corretor com **menor conversão** (entre os que têm pelo menos 3 cadastros, para não citar um corretor com 1 lead e 0% como "pior") e o corretor com **maior conversão**, com uma frase do tipo: `"<Corretor A> lidera o time com X% de conversão; <Corretor B> está com Y%, abaixo da média do time (Z%) — pode ser o próximo a receber apoio."` Se nenhum corretor tiver 3+ cadastros, omitir a comparação e mostrar só a média do time.

---

## 5. Perfil dos clientes que mais convertem no time

Três recortes, todos com um **corte mínimo de 3 cadastros por grupo** (mesmo espírito do `RK.min` da aba Ranking, só que fixo — não expor um seletor de mínimo nesta aba, para não sobrecarregar uma tela de leitura rápida) para não exibir "100% de conversão" de um grupo com 1 ou 2 leads:

1. **Por faixa de renda** (`#cGerRenda`): agrupar `Rg` por `faixa(r.valor_renda)`, na ordem fixa de `FAIXAS` (não alfabética — mesmo padrão da aba Perfil e Valores). Para cada faixa com 3+ cadastros, calcular a taxa de conversão com `METRICS.find(m=>m.k==='conv').fn(grupo)`. Gráfico de barra vertical (mesmo estilo de `#cRenda` em Perfil), eixo Y = conversão %, não contagem.
2. **Por origem** (`#cGerOrigem`): mesma lógica, agrupando por `origem`, top 8 por volume (evita poluir com origens de 1–2 leads que já ficam de fora pelo corte mínimo mesmo assim).
3. **Por finalidade** (`#cGerFin`): mesma lógica, agrupando por `finalidade`.

Tabela consolidada (`#tGerPerfil`): uma linha por combinação grupo, colunas `Dimensão` · `Valor` · `Cadastros` · `Aprovadas c/ Pix` · `Conversão`, juntando os três recortes acima numa única tabela ordenável por conversão desc — dá ao gerente uma lista só, "onde meu time converte melhor", em vez de 3 gráficos soltos sem hierarquia.

Nota geral da seção (`#nGerPerfil`): encontrar o grupo (entre os três recortes, respeitando o corte mínimo) com a **maior conversão** e escrever algo como: `"Clientes de <dimensão> = '<valor>' convertem <X%> no seu time, o melhor perfil identificado (mínimo de 3 cadastros)."` Se nenhum grupo atingir o mínimo, mostrar `"Amostra insuficiente para identificar um perfil de melhor conversão (nenhum grupo com 3+ cadastros)."`.

---

## 6. Pontos de melhoria — por corretor

Quatro tipos de pendência, cada um com uma definição verificável a partir dos dados reais (nada de campo inexistente — ver decisão 0.9):

| # | Pendência | Definição |
|---|---|---|
| 1 | Falta de Pix | tag `FALTA PIX` |
| 2 | Documentos | etapa ≠ `Cadastro Cliente` **e** nenhuma tag da categoria `CONTRATO` (`cat(t)==='CONTRATO'`) — proxy documentado na decisão 0.9, não um campo direto |
| 3 | Conclusão de cadastro (dados comerciais) | falha em pelo menos um de: finalidade declarada, valor de venda informado, tag de plano de pagamento (`PLANOTAGS`), tag `PIX` — função `fichaComercialCompleta(r)` (seção 6.3) |
| 4 | Estagnação de status | `dias_cadastro >= 14` **e** etapa ainda não é `Pasta Aprovada com Pix` nem `Desistente` — limiar de 14 dias (o dobro do já usado para Falta Pix, porque aqui é uma régua mais genérica, sobre qualquer etapa, não só Pix; ver decisão 0.9 sobre por que não usar `dias_sem_movimento`) |

### 6.1 `fichaComercialCompleta(r)` — função única, reaproveitada em `specs/prompt_completude_cadastro.md`

Definir em `a1.js`, junto dos outros helpers, para não duplicar a regra:

```js
const CAMPOS_COMERCIAIS=[
  {k:'finalidade',    l:'finalidade declarada',        ok:r=>!!r.finalidade && r.finalidade!=='-'},
  {k:'valor_negocio', l:'valor de venda informado',     ok:r=>!!r.valor_negocio},
  {k:'plano_tag',     l:'tag de plano de pagamento',    ok:r=>PLANOTAGS.some(t=>has(r,t))},
  {k:'pix_tag',       l:'tag de Pix',                   ok:r=>has(r,'PIX')}
];
const fichaComercialCompleta=r=>CAMPOS_COMERCIAIS.every(c=>c.ok(r));
```

Requer `valor_negocio` no `keep` de `rebuild2.py` (decisão 0.9 e seção 8).

### 6.2 Cards de alerta do time (4 sinais, não mais 3)

Mesmo componente visual `.card.alert` de `TAB==='alertas'`, mas com os 4 sinais da tabela acima, todos recalculados sobre `Rg` (não `R`). Container novo `#gerAlerts`. Cada card mostra a contagem e, quando aplicável, qual dos `CAMPOS_COMERCIAIS` mais falta (ex.: card de "Conclusão de cadastro" cita o campo com maior taxa de ausência dentro do time).

### 6.3 Tabela "onde agir" por corretor (síntese nova)

`#tGerAtencao` — uma linha por corretor do time, colunas: Corretor · Falta Pix · Documentos · Cadastro incompleto · Estagnados · Conversão do corretor · Conversão do time · Sinal (`"Abaixo da média do time"` quando a conversão do corretor for menor que a média **e** o corretor tiver 3+ cadastros; vazio caso contrário). Ordenar por padrão pela soma das 4 primeiras contagens desc — "com qual corretor eu falo primeiro" fica no topo.

### 6.4 Tabela de cadastros com pendência (reaproveitar o padrão de Pontos de Atenção, união de 4 motivos agora)

`#tGerAcao` — união (`Falta Pix` ∪ `Documentos` ∪ `Cadastro incompleto` ∪ `Estagnados`) sobre `Rg`, mesmas colunas de `#tAcao` (`a6.js`) mais uma coluna **Dias parado** (`dias_cadastro` quando o motivo incluir Estagnação). Motivo concatenado por `·`, um cadastro com vários motivos aparece uma vez só (mesmo padrão de `#tAcao`). Export `data-name="cadastros_para_acao_<slug do gerente>"`, `data-title="Cadastros que exigem ação — <rótulo do gerente>"`.

**Diferença deliberada em relação a `specs/prompt_completude_cadastro.md`:** na aba Gerente, "Cadastro incompleto" **entra** na união de `#tGerAcao`, porque aqui a lista já é naturalmente pequena (só o time de um gerente). Na versão cross-aba (Pontos de Atenção, painel inteiro), a mesma inclusão faria a tabela de ação explodir para quase 100% da base (`valor_negocio` está vazio na maioria dos cadastros) — por isso lá a decisão foi manter o alerta só como card informativo, sem entrar na união de `tAcao`. Ver `specs/prompt_completude_cadastro.md`, seção 1.2.

---

## 7. Exportações

Tabelas com barra de exportação (`.tbar`, mesmo componente de CSV/XLSX/PDF já usado em todo o painel): `#tGerCorr` (desempenho por corretor), `#tGerPerfil` (perfil de clientes), `#tGerAtencao` (síntese de pontos de melhoria) e `#tGerAcao` (cadastros que exigem ação). Os `data-name`/`data-title` de todas devem incluir o rótulo do gerente selecionado (ex. `data-title="Desempenho por corretor — ROSINALDO JARDIM"`), atualizados dinamicamente a cada troca de `#gerSel` (mesmo padrão já usado em `paintRank()` para `tRank`).

---

## 8. Detalhes de implementação (arquivos a tocar)

- **`a4.js`** (`TABS`): inserir `['gerente','Gerente']` logo após `['times','Times']`.
- **`a1.js`**: mover `gerLabel` (hoje definida como `const` local dentro do bloco `TAB==='times'` em `a6.js`) para o topo do arquivo, junto dos outros helpers (`faixa`, `has`, `median` etc.), já que agora é usada em duas abas — evita duplicar a mesma função. Acrescentar também `CAMPOS_COMERCIAIS`/`fichaComercialCompleta` (seção 6.1) — usados por esta aba **e** por `specs/prompt_completude_cadastro.md`.
- **`src/rebuild2.py`**: acrescentar `'valor_negocio'` ao array `keep` (linha ~5) — sem isso, `r.valor_negocio` chega como `undefined` no painel e `fichaComercialCompleta` erra todo mundo como incompleto por esse campo. Pré-requisito técnico obrigatório, não opcional.
- **`body2.html`**: novo `<section class="panel" data-tab="gerente">` com o seletor (seção 2), `#gerKpis`, os cards/gráficos das seções 3–6, e os `.tbar` de exportação. Seguir o mesmo padrão de classes (`.card`, `.ch-t`, `.ch-s`, `.hint`, `.cbox.tall.scroll`, `.note`) já usado nas demais abas.
- **`a6.js`**: novo ramo `if(TAB==='gerente'){...}` dentro de `paint()`, com a variável de estado `GER` (declarada fora de `paint()`, ao lado de outras variáveis de estado tipo `RK`), a leitura/escrita de `localStorage.nexoGerenteSel`, o cálculo de `Rg`, e a função local `gerTable(rows, keyDim)` que reaproveita `METRICS` (seção 4.2) para não duplicar fórmulas de `a7.js`.
- **IDs novos** (nenhum colide com os já existentes de Times): `gerSel`, `nGerSel`, `gerGate`, `gerKpis`, `cGerCorr`, `nGerCorr`, `tGerCorr`, `nGerCorrTbl`, `cGerRenda`, `cGerOrigem`, `cGerFin`, `tGerPerfil`, `nGerPerfil`, `gerAlerts`, `tGerAtencao`, `tGerAcao`.
- Nenhuma mudança em `DIMS`/`ST` — a aba não introduz nenhuma dimensão de filtro global nova (decisão 0.2).

---

## 9. Critérios de aceite

- [ ] Ao abrir a aba Gerente sem nenhuma seleção prévia (localStorage vazio), nenhum KPI/gráfico/tabela aparece — só o seletor "Meu time".
- [ ] Escolher um nome no seletor revela todo o conteúdo (seções 3–6) filtrado só para aquele time, respeitando também os filtros globais ativos no topo.
- [ ] Recarregar a página mantém o gerente escolhido (via `localStorage`), sem exigir escolher de novo.
- [ ] A escolha do gerente **não** aparece como chip no topo e **não** altera o que as outras abas mostram.
- [ ] Clicar numa barra de corretor ou num nome na tabela de desempenho filtra o painel inteiro por aquele `responsavel` (comportamento padrão de clique, igual a qualquer outro gráfico/tabela).
- [ ] A tabela de desempenho por corretor (`#tGerCorr`) usa as mesmas fórmulas de `METRICS` (`a7.js`) — conferir que os números batem com os de um filtro manual equivalente na aba Ranking (tipo `responsavel`, mesmo recorte de equipe).
- [ ] O perfil de melhores clientes ignora grupos com menos de 3 cadastros ao apontar o "melhor perfil" na nota.
- [ ] A tabela "onde agir" (`#tGerAtencao`) ordena por total de pendências desc por padrão e marca corretamente "Abaixo da média do time" só para corretores com 3+ cadastros.
- [ ] Trocar de gerente no seletor atualiza `data-name`/`data-title` de todas as exportações desta aba.
- [ ] Nenhum ID novo colide com `cGer`/`nGer`/`boxGer`/`innerGer` (aba Times) ou qualquer outro ID existente.
- [ ] `console.log(DATA[0].valor_negocio)` não retorna `undefined` depois do rebuild — confirma que `rebuild2.py` foi ajustado.
- [ ] Os 4 cards de pendência (`#gerAlerts`) e a tabela `#tGerAtencao` mostram números diferentes entre si (Falta Pix, Documentos, Cadastro incompleto, Estagnados não são a mesma contagem) — confirma que cada sinal usa sua própria definição, não uma cópia acidental de outra.
- [ ] Um cadastro com `dias_cadastro>=14` e etapa `Pasta com Pendência` aparece no motivo "Estagnado" de `#tGerAcao`, com a coluna "Dias parado" preenchida.

---

## 10. Depois de implementar

Criar `specs/abas/09_gerente.md` (mesmo formato das 8 specs existentes: Identidade, Objetivo, Seções e widgets, Dados e fórmulas, Interações e filtros, Exportações, Dependências de código, Critérios de aceite), atualizar a tabela de inventário e o texto de `specs/abas/README.md`, e atualizar `CONTEXTO.md` (contagem de abas visíveis passa de 6 para 7). Rodar o rebuild com `PYTHONUTF8=1 python src/rebuild2.py` (ressalva de encoding do Windows já documentada) e conferir visualmente as 4 seções com pelo menos um gerente que tenha 2+ corretores no time, para validar o drill-down de verdade.
