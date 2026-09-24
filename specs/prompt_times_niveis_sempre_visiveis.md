# Prompt aprimorado — Aba Times: os 3 níveis sempre visíveis, sem exigir clique prévio

## Como usar este documento

Este é o pedido original do usuário ("na aba times estratifique todas os dados dos três gráficos Imobiliárias, Gerentes e Corretores mesmo antes de algum clique...") reescrito com precisão técnica e checado contra o código atual (`a6.js`, bloco `TAB==='times'`) e contra `specs/abas/04_times.md`. **Este pedido reverte, de propósito, uma decisão de design já documentada** — a seção 0 explica exatamente o quê e por quê, para que a reversão seja consciente e não um acidente de spec desatualizada.

Depois de implementado: reescrever `specs/abas/04_times.md` (seções 3, 5 e 8 mudam de fato — ver seção 5 deste documento) e `CONTEXTO.md` se citar o comportamento antigo de "aparece só depois de clique".

---

## 0. Decisões tomadas para resolver ambiguidade do pedido original

1. **Isso reverte parcialmente a v4.** Hoje, `specs/abas/04_times.md` (seção 1, "Identidade") documenta que o drill-down em cascata **substituiu de propósito** os antigos gráficos planos "Equipes" (45 barras soltas) e "Responsáveis" (61 barras soltas), exatamente para não jogar tudo na tela ao mesmo tempo — ver `prompt_v4_reestruturacao_painel.md`, seção 6. O pedido atual pede o oposto: mostrar os três níveis completos desde a abertura da aba, sem exigir clique. **Entendo que essa é a intenção real agora** (o pedido é explícito — "mesmo antes de algum clique") e sigo com a reversão, mas registro aqui para não passar em branco: o resultado visual volta a ter até 45 barras em "Gerentes" e até 61 em "Corretores" simultaneamente, como antes da v4 — mitigado pelo `.cbox.tall.scroll` (rolagem interna) que já existe nos três cards.
2. **Os cliques continuam funcionando exatamente como hoje — nada muda na filtragem.** A única mudança é a *condição de exibição*. `rowsFor('equipe')` e `rowsFor('responsavel')` já respeitam qualquer `ST.marca`/`ST.equipe` ativo (mecanismo de `rowsFor(except)`, inalterado) — então, se o usuário clicar numa imobiliária, "Gerentes" continua estreitando sozinho para só aquela marca, sem precisar de nenhuma lógica nova. A mudança é: **parar de esconder o gráfico enquanto nada foi clicado**, não mudar o que ele mostra quando algo é clicado.
3. **Problema a corrigir ao remover o gate: perda de contexto no rótulo de "Gerentes".** Hoje, o rótulo de cada barra de "Gerentes" usa `gerLabel(equipe)`, que **remove o prefixo da marca** (ex.: mostra "SANDRO MONTAGNA" em vez de "ADAO UNIQUE - SANDRO MONTAGNA") — decisão correta quando só uma imobiliária está selecionada (o prefixo fica implícito no filtro ativo), mas **errada sem seleção nenhuma**: misturaria gerentes de todas as imobiliárias na mesma lista, todos com o prefixo removido, sem nenhuma pista visual de qual imobiliária cada um pertence. **Decisão:** o rótulo só remove o prefixo (`gerLabel`) quando `ST.marca.length===1`; caso contrário, mostra a `equipe` completa (truncada como as demais barras, `shortT(l,32)`), preservando a marca no rótulo enquanto a lista estiver misturada.
4. **"Corretores" não precisa da mesma correção.** O campo `responsavel` (nome do corretor) nunca carregou o prefixo da marca/equipe — o gráfico "Responsáveis" pré-v4 já mostrava nomes soltos sem esse contexto, e ninguém pediu para mudar isso agora. Mantém `short:l=>shortT(l,26)` como já está.
5. **Textos estáticos de `body2.html` ficam desatualizados e precisam mudar** (seção 3.2) — hoje dizem "Equipes da imobiliária selecionada acima." e "Corretores do gerente selecionado acima.", o que deixa de ser verdade (mostram tudo por padrão, só restringem se algo estiver selecionado).

---

## 1. Objetivo

Ao abrir a aba Times, os três gráficos — Imobiliárias, Gerentes, Corretores — aparecem **todos preenchidos imediatamente**, com o recorte de dados atual (respeitando os filtros globais do topo, como sempre), sem exigir nenhum clique prévio em nenhum dos três. Clicar numa barra continua filtrando o painel inteiro e, por consequência, estreitando os níveis abaixo dela — exatamente como hoje.

---

## 2. Comportamento desejado por nível

### Nível 1 — Imobiliárias

Sem mudança nenhuma — já é sempre visível hoje.

### Nível 2 — Gerentes

- **Sempre visível e sempre populado**, com `Rg = rowsFor('equipe')` e `gk = topN(byKey(Rg,'equipe'), 9999)` — a mesma fórmula de hoje, só que fora do `if(ST.marca.length===1)`.
- Rótulo de cada barra (`short`): `ST.marca.length===1 ? gerLabel : (l=>shortT(l,32))` — mostra só o gerente quando uma marca está selecionada; mostra a equipe completa (com a marca) quando não está, ou quando mais de uma marca está ativa via Ctrl/Cmd.
- Nota (`#nGer`):
  - Com exatamente uma marca selecionada: mantém o texto de hoje — `` `${nf(gk.length)} equipe(s)/gerente(s) em ${ST.marca[0]}; clique numa para ver os corretores.` ``
  - Sem seleção (ou mais de uma marca via Ctrl/Cmd): `` `${nf(gk.length)} equipe(s)/gerente(s) no total; clique numa imobiliária acima para restringir, ou clique direto numa equipe para ver os corretores dela.` ``
- `boxGer.style.display=''` sempre — remover o ramo `else{ boxGer.style.display='none'; ... }`.

### Nível 3 — Corretores

- **Sempre visível e sempre populado**, com `Rc = rowsFor('responsavel')` e `ck = topN(byKey(Rc,'responsavel'), 9999)` — mesma fórmula de hoje, fora do `if(ST.equipe.length===1)`.
- Rótulo continua `short:l=>shortT(l,26)`, sem mudança (decisão 0.4).
- Nota (`#nCorr`):
  - Com exatamente uma equipe selecionada: mantém o texto de hoje — `` `${nf(ck.length)} corretor(es) em ${gerLabel(ST.equipe[0])}.` ``
  - Sem seleção (ou mais de uma equipe): `` `${nf(ck.length)} corretor(es) no total; clique num gerente acima para restringir, ou clique direto num corretor para filtrar o painel.` ``
- `boxCorr.style.display=''` sempre — remover o ramo `else{ boxCorr.style.display='none'; ... }`.

### Origem dos cadastros

Sem mudança — já é sempre visível.

---

## 3. Detalhes de implementação

### 3.1 `a6.js` — bloco `TAB==='times'`

Trocar:

```js
const boxGer=document.getElementById('boxGer');
if(ST.marca.length===1){
  const marcaSel=ST.marca[0];
  const Rg=rowsFor('equipe'), gk=topN(byKey(Rg,'equipe'),9999);
  boxGer.style.display='';
  fitBox('innerGer',gk.length);
  bar('cGer','equipe',gk.map(x=>x[0]),gk.map(x=>x[1]),'#1baf7a',{total:Rg.length,short:gerLabel});
  document.getElementById('nGer').textContent=gk.length?`${nf(gk.length)} equipe(s)/gerente(s) em ${marcaSel}; clique numa para ver os corretores.`:`Nenhum gerente em ${marcaSel} no recorte atual.`;
} else {
  boxGer.style.display='none';
  document.getElementById('nGer').textContent='Selecione uma imobiliária no gráfico acima para ver os gerentes.';
}
```

por:

```js
const Rg=rowsFor('equipe'), gk=topN(byKey(Rg,'equipe'),9999);
const umaMarca=ST.marca.length===1;
document.getElementById('boxGer').style.display='';
fitBox('innerGer',gk.length);
bar('cGer','equipe',gk.map(x=>x[0]),gk.map(x=>x[1]),'#1baf7a',{total:Rg.length,short:umaMarca?gerLabel:(l=>shortT(l,32))});
document.getElementById('nGer').textContent = gk.length
  ? (umaMarca ? `${nf(gk.length)} equipe(s)/gerente(s) em ${ST.marca[0]}; clique numa para ver os corretores.`
              : `${nf(gk.length)} equipe(s)/gerente(s) no total; clique numa imobiliária acima para restringir, ou clique direto numa equipe para ver os corretores dela.`)
  : 'Nenhum gerente no recorte atual.';
```

Mesma troca, mesmo padrão, para o bloco de `boxCorr`/`ST.equipe`:

```js
const Rc=rowsFor('responsavel'), ck=topN(byKey(Rc,'responsavel'),9999);
const umaEquipe=ST.equipe.length===1;
document.getElementById('boxCorr').style.display='';
fitBox('innerCorr',ck.length);
bar('cCorr','responsavel',ck.map(x=>x[0]),ck.map(x=>x[1]),'#eda100',{total:Rc.length,short:l=>shortT(l,26)});
document.getElementById('nCorr').textContent = ck.length
  ? (umaEquipe ? `${nf(ck.length)} corretor(es) em ${gerLabel(ST.equipe[0])}.`
               : `${nf(ck.length)} corretor(es) no total; clique num gerente acima para restringir, ou clique direto num corretor para filtrar o painel.`)
  : 'Nenhum corretor no recorte atual.';
```

Nenhuma outra parte do bloco `times` muda (Nível 1 e Origem ficam como estão).

### 3.2 `body2.html` — textos estáticos dos cards

| Card | Texto atual (`.ch-s`) | Texto novo |
|---|---|---|
| Gerentes | `Equipes da imobiliária selecionada acima.` | `Todas as equipes/gerentes do recorte; restringe se uma imobiliária estiver selecionada acima.` |
| Corretores | `Corretores do gerente selecionado acima.` | `Todos os corretores do recorte; restringe se um gerente estiver selecionado acima.` |

Os `.hint` ("Clique numa barra para ver os gerentes/corretores...") continuam válidos como estão — o clique ainda existe e ainda estreita, só não é mais pré-requisito para o gráfico aparecer.

---

## 4. Critérios de aceite

- [ ] Abrir a aba Times sem nenhum filtro ativo mostra as três barras (Imobiliárias, Gerentes, Corretores) já populadas, nenhuma com mensagem de "selecione algo acima".
- [ ] Sem seleção, "Gerentes" mostra o rótulo com a marca incluída (ex. `ADAO UNIQUE - SANDRO MONTAGNA`, truncado), não só o nome do gerente.
- [ ] Clicar numa imobiliária estreita "Gerentes" para só as equipes daquela marca **e** o rótulo passa a mostrar só o nome do gerente (sem o prefixo) — mesmo comportamento de hoje.
- [ ] Clicar num gerente estreita "Corretores" para só os responsáveis daquela equipe — mesmo comportamento de hoje.
- [ ] Clicar direto numa barra de "Corretores" sem nunca ter clicado em Imobiliárias/Gerentes funciona normalmente (filtra `responsavel` globalmente, como qualquer clique de gráfico).
- [ ] Trocar de imobiliária com um gerente de outra marca ainda ativo continua caindo no estado global "Nenhum cadastro neste recorte" (comportamento padrão já documentado em `04_times.md`, inalterado).
- [ ] Nenhuma das notas (`#nGer`/`#nCorr`) cita mais "Selecione..." — todas descrevem o total quando não há seleção.

---

## 5. Depois de implementar

Reescrever em `specs/abas/04_times.md`:
- Seção 1 (Identidade): já não é "substitui... por um drill-down que só aparece depois de clique" — passa a ser "drill-down sempre visível, que estreita ao clicar".
- Seção 3 (tabela "Aparece quando"): as três linhas passam a ser "sempre" (não mais condicionadas a `ST.marca.length===1`/`ST.equipe.length===1`).
- Seção 4: acrescentar a regra do rótulo condicional de "Gerentes" (decisão 0.3 deste prompt).
- Seção 8 (critérios de aceite): substituir os itens que descrevem os placeholders "selecione..." pelos novos (seção 4 deste prompt).

Rodar `PYTHONUTF8=1 python src/rebuild2.py` e conferir visualmente: aba Times abrindo já com as três colunas cheias, e o comportamento de clique em cascata continuando idêntico ao de antes.
