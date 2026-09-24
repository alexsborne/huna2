# Spec — Aba Pontos de Atenção

**Última sincronização:** 10/09/2026 (7º card: corretor sem contato localizado no Imobmeet)
**`data-tab`:** `alertas`
**Rótulo:** Pontos de Atenção
**Painel:** `section.panel[data-tab=alertas]`

---

## 1. Identidade

Aba operacional de **alertas** e lista de cadastros que exigem ação no recorte atual.

## 2. Objetivo

Destacar sete fragilidades da carteira e listar, em tabela exportável, os cadastros que caem em pelo menos uma delas. Clicar num card restringe a tabela a esse motivo.

**Nota (10/09/2026):** `atualizar.py` deixou de **abortar a publicação** quando um corretor responsável não é encontrado na listagem de usuários do Imobmeet (`resp_tel`/`resp_email` ficam vazios) — a pedido do usuário, isso agora só vira o 7º card (`semcorretor`) abaixo, e só conta enquanto o cadastro ainda estiver em `Ra` (tramitação inicial), já que é aí que a falta de contato do corretor de fato atrapalha o follow-up.

**Nota (05/09/2026):** desde a mudança global de Desistentes (`CONTEXTO.md` v4.10), `R = rowsFor()` já exclui `etapa==='Desistente'` por padrão.

**Nota (08/09/2026, v4.13) — a pedido do usuário:** a aba passou a olhar só cadastros ainda em tramitação inicial. `Ra = R.filter(r => ETAPAS_ALERTA.includes(r.etapa))`, onde `ETAPAS_ALERTA = ["Cadastro Cliente","Pasta em Anállise","Pasta com Pendência"]` (`a1.js`) — ficam de fora `Pasta Validada pendente de Pix`, `Pasta Aprovada com Pix` (já concluídas, não são mais "ponto de atenção") e `Desistente` (já excluído por `rowsFor()`). Todos os 6 cards e a tabela `#tAcao` usam `Ra` no lugar de `R` (exceto o julgamento de "corretor sem aprovação" do card `semconv`, que continua sobre `DATA` inteira — ver linha da tabela abaixo). **Interpretação do pedido, avisada ao usuário para correção se necessário:** a frase "se falta pix mas a pasta dele não tem pendência no cadastro... isso não é pendência" foi lida como — a tag `FALTA PIX` só representa uma pendência real quando a etapa **já é** `Pasta com Pendência`; num cadastro ainda em `Cadastro Cliente`/`Pasta em Anállise` a pasta não foi revisada pra pendência ainda, então a tag ali é cedo demais pra virar alerta.

## 3. Seções e widgets

### Cards de alerta (`#alerts`)

Sete cards gerados em runtime, cada um com `data-key` e clicável:

| Key | Título | Contagem | Universo | Texto de apoio |
|---|---|---|---|---|
| `semtag` | Cadastros sem nenhuma marcação | `tags_list` vazio, em `Ra` | recorte restrito (`Ra`, 3 etapas — ver nota acima) | % do recorte (`Ra`) sem tag |
| `pixatraso` | "FALTA PIX" há 7 dias ou mais | tag `FALTA PIX` **e** `etapa === 'Pasta com Pendência'` **e** `dias_cadastro >= 7`, em `Ra` | recorte restrito | contextualiza vs total de FALTA PIX em Pasta com Pendência no recorte |
| `sememail` | Cadastros sem e-mail válido | `sem_email === 'Sim'`, em `Ra` | recorte restrito | padrão `telefone@sememail.com` |
| `estagnado` | Estagnados 14+ dias sem concluir | `estagnado(r)` (`a1.js`) — `dias_cadastro>=14` e etapa não é Aprovada com Pix nem Desistente (redundante com `Ra`, mas a função é global e não foi alterada), em `Ra` | recorte restrito | mesmo critério já usado na aba Gerente |
| `duplicado` | Possível cadastro duplicado | mesmo `telefone` **ou** mesmo `email` (exceto placeholder `sememail.com`) aparece em 2+ cadastros de `Ra` | recorte restrito | cita quantos casos têm `responsavel` diferente (conflito entre corretores) |
| `semconv` | Corretor sem nenhuma aprovação | cadastros de `Ra` cujo `responsavel` tem **5+ cadastros em toda a `DATA`** e **nenhum** `Pasta Aprovada com Pix` em toda a `DATA` | **base toda** (`DATA`) decide quem é "sem aprovação" — só a exibição das linhas é limitada a `Ra` (era `R`) | corretor(es), não é sobre o cadastro em si |
| `semcorretor` | Corretor sem contato localizado | `corretor_sem_contato === true` (campo gravado por `atualizar.py`), em `Ra` | recorte restrito | corretor não encontrado na listagem de usuários do Imobmeet — sem telefone/e-mail |

**Importante sobre `semconv`:** o critério "corretor sem aprovação" é calculado sobre `DATA` (histórico completo do corretor), não sobre `R` — senão um filtro de etapa (ex. `etapa=Cadastro Cliente`) faria qualquer corretor parecer "sem aprovação" trivialmente, já que os aprovados estariam fora do recorte por definição. Só **quais linhas aparecem** listadas respeita o recorte atual.

**Cards são clicáveis:** clique simples seleciona só aquele motivo (repete o clique para limpar); Ctrl/Cmd+clique acumula mais de um (união/OR). Seleção é **local desta aba** (`let ALERTSEL=[]` em `a6.js`, não é dimensão de `ST`) — não vira chip no topo, não entra no hash da URL, não afeta outras abas. Card(s) selecionado(s) recebem contorno (`.card.alert.on`).

### Cadastros que exigem ação (`#tAcao`)

| Coluna | Origem |
|---|---|
| Nº | `numero` |
| Cadastro | `nome` |
| Telefone | `telefone` |
| Etapa | `etapa` |
| Motivo | união dos motivos aplicáveis: `Pix pendente há 7+ dias` · `Sem tag` · `Sem e-mail` · `Estagnado 14+ dias` · `Possível duplicidade` · `Corretor sem aprovação` · `Corretor sem contato no Imobmeet` |
| Dias desde o cadastro | `dias_cadastro` |
| Responsável | `responsavel` |
| Equipe | `equipe` |

Export: `data-name="cadastros_para_acao"` · `data-title="Cadastros que exigem ação"`.

## 4. Dados e fórmulas

- Universo dos cards 1–5: `Ra = R.filter(etapa ∈ ETAPAS_ALERTA)`. Card 6 (`semconv`) usa `DATA` para decidir **quem** é "corretor sem aprovação", mas filtra as linhas exibidas por `Ra` (ver acima).
- Conjuntos: `st` (sem tag), `fp` (FALTA PIX ∩ etapa='Pasta com Pendência'), `fpp` (`fp` ∩ dias≥7), `se` (sem e-mail), `estag` (`estagnado(r)`), `dup` (união de grupos com `telefone` ou `email` repetido, via `dupGroups()`), `semConv` (linhas de `Ra` cujo responsável está no conjunto global de corretores com 5+ cadastros e 0 aprovações). Todos calculados sobre `Ra`, não `R`.
- Tabela sem seleção ativa: união única `acaoFull = [...new Set([...fpp,...st,...se,...estag,...dup,...semConv])]` (Set por referência de objeto — um cadastro com vários motivos aparece **uma** vez).
- Tabela com `ALERTSEL` não vazio: `acao = acaoFull.filter(r => ALERTSEL.some(k => SETS[k].includes(r)))` — só os motivos selecionados (OR entre eles).
- Ordenação padrão da tabela: coluna dias (`k:5`, `d:-1`) — mais antigos primeiro.
- Duplicidade: `dupGroups(rows, keyFn)` (`a6.js`) agrupa por `telefone` e, separadamente, por `email` (excluindo `sem_email==='Sim'`), devolvendo só os grupos com 2+ cadastros. `conflito` marca quais dessas linhas têm mais de um `responsavel` distinto no grupo — usado só no texto do card, não filtra a tabela separadamente.

## 5. Interações e filtros

- Cards são clicáveis (ver seção 3) — filtro **local** da tabela `#tAcao`, não afeta outras abas nem o hash.
- Tabela ordenável por cabeçalho normalmente.
- Filtros globais do topo (`ST`) afetam os cards 1–5 e as linhas exibidas do card 6 normalmente (recalculam a cada `apply()`).

## 6. Exportações

`#tAcao` → CSV/XLSX/PDF conforme DOM (respeita filtros globais, seleção de cards ativa e ordenação).

## 7. Dependências de código

- `body2.html`, `a6.js` (ramo `alertas`, `ALERTSEL`, `toggleAlert`, `dupGroups`), `a1.js` (`estagnado`, `rowsFor`, `DATA`), `a5.js` (`tbl`), `a3.js`

## 8. Critérios de aceite

- [ ] Universo dos 6 cards e da tabela é `Ra` (só Cadastro Cliente/Pasta em Anállise/Pasta com Pendência) — cadastros em Validada/Aprovada/Desistente nunca aparecem aqui.
- [ ] "FALTA PIX" só conta como pendência quando `etapa === 'Pasta com Pendência'`; a mesma tag num cadastro em Cadastro Cliente/Anállise não entra no card `pixatraso`.
- [ ] Limiar de Pix pendente é **7 dias desde o cadastro**, não "última atualização".
- [ ] Limiar de estagnação é **14 dias**, igual ao usado na aba Gerente (`estagnado()` reaproveitado, não duplicado).
- [ ] `semconv` considera o histórico do corretor na base toda, não só no recorte filtrado.
- [ ] Cadastro com dois ou mais motivos aparece uma vez na tabela, com todos os motivos concatenados.
- [ ] Clique num card filtra a tabela só àquele motivo e marca o card; clicar de novo limpa; Ctrl/Cmd+clique acumula.
- [ ] Seleção de card não aparece como chip no topo nem no hash da URL.
- [ ] Nota `#nAcao` reflete corretamente se há seleção ativa e quantos cadastros ela cobre.
