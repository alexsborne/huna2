# Prompt aprimorado — Agrupar imobiliárias lançadoras em 6 marcas + grupo "Mercado"

## Como usar este documento

Este é o pedido original do usuário ("Imobiliárias lançadoras: HUNA, Lopes, URBS, AEVO, Adão, MyBroker. O resto é chamado mercado...") reescrito com precisão técnica e checado contra os dados reais (`dados/rows.json`, 168 cadastros, extração de 03/09/2026) e contra o código (`a1.js`, `a4.js`, `a7.js`, `body2.html`). O pedido é simples no espírito mas tinha uma armadilha séria escondida no termo "Mercado" — resolvida na seção 0.

**Todas as decisões da seção 0 foram confirmadas pelo usuário** (item 1: "mercado são as imobiliárias que não estão no rol das 6 especificadas"; itens 2 e 3: "correto"; item 4: "ok") — este documento está pronto para implementação, não é mais um rascunho sujeito a revisão.

Depois de implementado: atualizar `CONTEXTO.md` linhas 122–123 (a definição de "Lançadora"/`marca` e de "Mercado" muda — ver seção 6) e `specs/abas/04_times.md`/`05_rank.md` (ver seção 6) — regra já registrada do próprio projeto (nenhuma mudança de comportamento de aba ou de dado derivado fica sem spec sincronizada).

---

## 0. Decisões tomadas para resolver ambiguidade do pedido original

1. **Colisão de termo confirmada e resolvida.** "Mercado" já é usado no painel com outro sentido: o toggle `#rkTipo` da aba Ranking (hoje desativada, código intacto em `a7.js`/`body2.html`) tem os botões `Lançadoras` / `Mercado (corretores)` — ou seja, "Mercado" já significa "ranking por corretor" (`CONTEXTO.md` linha 123: `"Mercado" = os 61 corretores do campo responsavel`). Perguntei ao usuário como resolver; a resposta foi manter "Mercado" para o novo grupo de imobiliárias, exatamente como pedido originalmente. **Decisão adotada:** renomear o rótulo do botão antigo, de **"Mercado (corretores)"** para **"Corretores"** (`body2.html`, dentro de `#rkTipo`) — mudança de uma linha, sem tocar em `RK.tipo` (que continua sendo internamente `'responsavel'`, só o texto do botão muda) e sem risco visível hoje porque a aba está fora de `TABS` (`a4.js`). Isso libera a palavra "Mercado" para significar só uma coisa no painel inteiro. Se essa não for a preferência do usuário, a alternativa é manter o botão antigo como está e usar outro nome só para o grupo novo — mas o pedido explícito foi manter "Mercado" para o grupo, então essa é a rota adotada.
2. **A correspondência marca→grupo não pode ser por igualdade de string inteira — precisa ser por prefixo (primeira palavra, ou duas no caso de "MyBroker").** Cada uma das 6 marcas aparece hoje com várias unidades/filiais coladas no mesmo token antes do hífen do campo `equipe`. Confirmado pelo usuário com o exemplo `ADAO UNIQUE`: **"ADÃO é a imobiliária, UNIQUE é a equipe"** — ou seja, só a primeira palavra do texto antes do hífen é a marca; o resto do token é nome de unidade/filial e continua fazendo parte do campo `equipe` como já acontece hoje (não muda). Confirmado nos dados reais (`dados/rows.json`, 45 valores distintos de `equipe`) que o mesmo padrão se repete nas 6 marcas:

   | Marca (grupo) | Unidades encontradas hoje na base | Cadastros |
   |---|---|---|
   | HUNA | HUNA IMOVEIS | 57 |
   | Lopes | *(nenhuma unidade na base atual)* | 0 |
   | URBS | URBS ONE · URBS MEU APÊ · URBS SEVEN · URBS CONNECT · URBS INFINITY | 22 |
   | AEVO | AEVO 3 · AEVO JARDIM GOIAS · AEVO MARISTA | 13 |
   | Adão | ADAO UNIQUE · ADAO VIDA NOVA · ADAO SOLO · ADAO MATRIZ | 29 |
   | MyBroker | MY BROKER FLAMBOYANT · MY BROKER MARISTA · MY BROKER ELDORADO · MY BROKER AREIAO | 6 |
   | Mercado | as outras 16 imobiliárias (NEXO GESTÃO, MIKASA IMOVEIS, DATA NEGOCIOS, KADOSH IMOVEIS, ARGON CONEXOES, HOPP IMOVEIS, PROVENDA, RCF ASSESSORIA IMOBILIARIA, VELD IMOBILIÁRIA, W N NEGOCIOS IMOBILIARIOS, NEX IMOVEIS, 41 BUSINESS, SHARKS MARISTA, ONE PERCENT, PARAISO IMOVEIS, AJ IMOBILIARIA) | 41 |

   **Total: 168/168 — bate exatamente com a base atual.** (Números recalculados rodando a regra de correspondência da seção 3 direto sobre `dados/rows.json`, não estimados.)
3. **Correspondência por limite de palavra, não substring solta**, comparando o texto normalizado (maiúsculo, sem acento — os dados gravam "ADAO" sem til e "APÊ" com/sem acento de forma inconsistente, então normalizar remove essa fragilidade). "MyBroker" é tratado como duas palavras (`MY BROKER`), exatamente como aparece nos dados — não existe "MYBROKER" grudado na base atual, mas aceitar as duas formas deixa a regra mais robusta a variações futuras de digitação no CRM.
4. **"Lopes" não tem nenhuma unidade na extração atual — 0 cadastros no grupo hoje, e isso é esperado, não um bug.** Assim que uma equipe começar por "Lopes" numa extração futura, ela entra automaticamente no grupo pela regra de prefixo, sem precisar tocar no código de novo. **Verificado que não há colisão com o sobrenome "Lopes"**, que aparece várias vezes do lado do *gerente* (`WESLEY JUNIO LOPES DE OLIVEIRA`, `VICTOR HUGO LOPES`, `JOÃO PEDRO LOPES`, `FERNANDA LOPES VILARINHO VIEIRA`) — sempre depois do hífen, nunca no texto antes do hífen usado para o agrupamento, então não entra na conta por engano.
5. **`NEXO GESTÃO`** (a única das 45 equipes sem hífen — já documentado em `specs/abas/04_times.md` como "equipe sem gerente distinto") **não bate em nenhum dos 6 prefixos e cai em "Mercado"** — **confirmado pelo usuário**: "mercado são as imobiliárias que não estão no rol das 6 especificadas", sem exceção para cadastros captados diretamente pela Nexo. Os 6 cadastros de `NEXO GESTÃO` contam dentro do total de "Mercado", definitivo.
6. **Nenhuma informação se perde.** O campo `equipe` (usado nos filtros do topo, na coluna "Equipe" da Base de Cadastros, e nos níveis 2/3 do drill-down da aba Times) continua com o texto completo e original (ex.: `ADAO UNIQUE - SANDRO MONTAGNA`), sem nenhuma mudança. **Só** o campo derivado `marca` (rótulo "Lançadora" no painel) passa a valer um dos 7 grupos em vez do texto bruto antes do hífen. Quem precisar ver a unidade/filial original de cada corretor continua vendo, via Equipe.
7. **Nenhuma ordem fixa nova é imposta.** Os gráficos e o seletor do topo continuam ordenando por volume (`topN(byKey(...))`, já existente) ou alfabeticamente pt-BR (`uniq()`, já existente) — "Mercado" aparece onde o volume ou a ordem alfabética mandar, não necessariamente por último. Não introduzir uma ordenação customizada só para este dado.

---

## 1. Objetivo

Reduzir os hoje ~31–33 valores distintos do campo `marca` (rótulo "Lançadora") para só **7**: HUNA, Lopes, URBS, AEVO, Adão, MyBroker e Mercado — aplicado automaticamente em **todo** lugar do painel que já lê `r.marca`, sem precisar alterar cada aba individualmente (ver seção 2).

---

## 2. Onde a mudança se propaga sozinha (e por quê)

`marca` é hoje um único ponto de derivação (`a1.js`, dentro do `DATA.forEach(...)` logo no topo do arquivo) lido por várias abas via o mesmo campo `r.marca` — mudar só a fórmula de derivação basta para propagar em:

- Filtro do topo `#fMarca` (`a4.js`, `fillSel('fMarca', uniq('marca'), ...)`) — passa a listar só os 7 grupos (ou menos, se algum grupo não tiver nenhum cadastro no momento — caso do "Lopes" hoje).
- Chips e hash da URL (`DIMS`/`ST.marca`, `a1.js`) — inalterados no mecanismo, só o valor que circula muda.
- Aba Times, nível 1 "Imobiliárias" (`#cImob`) e o *gate* do nível 2 (`ST.marca.length===1`) — o gráfico passa a ter 7 barras (ou menos) em vez de ~31.
- Aba Ranking (`a7.js`, hoje desativada, código intacto), tipo `marca` — passa a ranquear os 7 grupos; e o complemento `"Imobiliária: X"` no pódio/top 10 quando o tipo é `responsavel` (usa `modeWithTieBreak` sobre `r.marca`) passa a mostrar o grupo, não a unidade.
- Qualquer nota de texto que cite a marca selecionada (ex.: nota do nível 2 de Times, `` `...em ${marcaSel}...` ``).

**Nenhuma dessas abas precisa de código novo** além da mudança única descrita na seção 3.

---

## 3. Implementação da correspondência (única mudança de fato)

Em `a1.js`, onde hoje existe (linha ~43):

```js
DATA.forEach(r=>{ r.marca = (r.equipe||'').split(/\s*-\s*/)[0].trim() || '(sem equipe)'; });
```

Substituir por uma etapa de agrupamento sobre o mesmo valor bruto, sem mudar como ele é extraído do `equipe`:

```js
const GRUPOS_LANCADORA=[
  {label:'HUNA',     re:/^HUNA(\s|$)/},
  {label:'Lopes',    re:/^LOPES(\s|$)/},
  {label:'URBS',     re:/^URBS(\s|$)/},
  {label:'AEVO',     re:/^AEVO(\s|$)/},
  {label:'Adão',     re:/^ADAO(\s|$)/},
  {label:'MyBroker', re:/^MY\s+BROKER(\s|$)/}
];
const normMarca=s=>String(s||'').toUpperCase().normalize('NFD').replace(/[^\x00-\x7F]/g,'');
function grupoLancadora(raw){
  const n=normMarca(raw);
  const g=GRUPOS_LANCADORA.find(g=>g.re.test(n));
  return g? g.label : 'Mercado';
}
DATA.forEach(r=>{
  const raw=(r.equipe||'').split(/\s*-\s*/)[0].trim() || '(sem equipe)';
  r.marca = grupoLancadora(raw);
});
```

Não é necessário guardar o valor bruto (`raw`) em nenhum outro campo — ele já está integralmente disponível em `r.equipe`, que não muda (decisão 0.6).

---

## 4. Renomear o toggle da aba Ranking (resolve a colisão de termo — decisão 0.1)

Em `body2.html`, dentro de `#rkTipo`:

```html
<button data-v="responsavel" aria-pressed="false">Mercado (corretores)</button>
```

trocar o texto visível para:

```html
<button data-v="responsavel" aria-pressed="false">Corretores</button>
```

Nenhuma outra mudança: `data-v="responsavel"` continua igual, `RK.tipo` continua assumindo os mesmos dois valores (`'marca'`/`'responsavel'`) em `a7.js`, e `dimLabel` em `paintRank()` já usa a palavra `'corretores'` internamente (linha ~70) — só o rótulo do botão estava desalinhado com o resto do código.

---

## 5. Verificação

- [ ] `uniq('marca')` (ou o filtro `#fMarca`) lista no máximo 7 valores: HUNA, Lopes (só se houver cadastro), URBS, AEVO, Adão, MyBroker, Mercado.
- [ ] Contagens batem com a tabela da decisão 0.2: HUNA 57 · URBS 22 · AEVO 13 · Adão 29 · MyBroker 6 · Mercado 41 · Lopes 0 — soma 168.
- [ ] Aba Times, nível 1: exatamente essas barras (sem "Lopes" se 0 cadastros); clicar em "Adão" revela no nível 2 os gerentes de **todas** as 4 unidades (Unique, Vida Nova, Solo, Matriz) juntas, cada um com o rótulo do próprio nome (não muda o comportamento de `gerLabel`, que já dropa o prefixo antes do hífen).
- [ ] Clicar em "Mercado" no nível 1 revela no nível 2 os gerentes das 16 imobiliárias menores misturados (comportamento esperado — "Mercado" é um grupo artificial de conveniência, não uma imobiliária real).
- [ ] Coluna "Equipe" da Base de Cadastros continua mostrando o texto original completo (ex. `ADAO UNIQUE - SANDRO MONTAGNA`), não o grupo.
- [ ] Botão da aba Ranking (`#rkTipo`) mostra "Corretores" em vez de "Mercado (corretores)"; nenhuma outra ocorrência de "Mercado" sobra no painel fora do novo grupo de Lançadora.
- [ ] `CONTEXTO.md` linhas 122–123 atualizadas (ver seção 6).

---

## 6. Depois de implementar

- Atualizar `CONTEXTO.md`: a linha 122 (`"Lançadora" = a marca antes do hífen no campo Equipe... Gera 33 marcas`) passa a descrever o agrupamento em 7 grupos fixos (não mais "gera N marcas a partir das equipes"); a linha 123 (`"Mercado" = os 61 corretores do campo responsavel`) deixa de ser verdade — esse sentido do termo não existe mais no painel (o botão da aba Ranking agora diz "Corretores").
- Atualizar `specs/abas/04_times.md` (seção "Dados e fórmulas", nível 1): o texto que descreve "todas as marcas presentes no recorte, sem corte" continua válido, só a contagem esperada muda de ~31 para até 7.
- Atualizar `specs/abas/05_rank.md`: nota sobre o botão renomeado ("Mercado (corretores)" → "Corretores"), já que essa spec descreve o `#rkTipo` atual.
- Rodar `PYTHONUTF8=1 python src/rebuild2.py` (ressalva de encoding do Windows já documentada) e conferir visualmente o filtro de Lançadora e a aba Times com os 7 grupos.
