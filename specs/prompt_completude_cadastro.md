# Prompt aprimorado — Corrigir a checagem de completude do cadastro (finalidade, valor de venda, plano de pagamento, Pix)

## Como usar este documento

Este é o pedido original do usuário ("Corrigir em todas as abas: Procurar quais clientes não possuem estes dados: finalidade de compra, valor da venda, tag do plano de pagamento, tag do pix") reescrito com precisão técnica e checado contra `a1.js`/`a6.js`/`rebuild2.py` e `CONTEXTO.md`. Achei um bug real (uma checagem existente está lendo um campo morto) e uma armadilha de volume (um dos 4 campos pedidos está vazio na maioria da base) — ambos na seção 0.

Este documento é complementar a `specs/prompt_aba_gerente.md` (seção 6), que já usa a mesma função `fichaComercialCompleta(r)` definida aqui — implementar os dois juntos evita duplicar a regra em dois lugares.

---

## 0. Decisões tomadas para resolver ambiguidade do pedido original

1. **"Em todas as abas" não pode ser literal.** As 6 abas ativas hoje (Visão Geral, Pagamentos, Times, Perfil e Valores, Pontos de Atenção, Base de Cadastros) têm objetivos diferentes; não faz sentido enfiar uma tabela de "clientes com dado faltando" em Visão Geral ou Times, que não são sobre completude de ficha. **Interpretação adotada:** aplicar a correção nos lugares que já existem para isso — a aba **Perfil e Valores** (que já tem um gráfico "Qualidade do cadastro") e a aba **Pontos de Atenção** (que já lista cadastros com pendência) — mais a aba **Gerente** (`specs/prompt_aba_gerente.md`, seção 6, pedida numa mensagem anterior). Se a intenção era replicar em todas as 7 abas mesmo, avisar — mas nada no resto do pedido sugere isso.
2. **Achado: uma checagem existente já quebrada.** O gráfico "Qualidade do cadastro" (`#cQual`, aba Perfil e Valores, `a6.js`) tem uma barra "Com plano de pagamento" que lê `r.plano_pagamento` **diretamente** (`cnt(R,r=>!!r.plano_pagamento)`). Esse campo está **vazio em 100% da base desde a reextração de 03/09/2026** — o CRM removeu o campo da ficha (`CONTEXTO.md`, seção "Mudança relevante descoberta em 03/09/2026"). Essa barra mostra 0% silenciosamente há uma versão inteira. **Correção:** trocar a fórmula para usar as tags de plano (`PLANOTAGS = ["Venda à vista","Até 24x","Até 48x","Plano longo"]`, já existente em `a1.js`), que é o substituto real do campo desde que ele sumiu — mesma decisão já tomada para o gráfico de Pagamentos em `specs/prompt_v4_reestruturacao_painel.md`, seção 3.1, só que esse ajuste não tinha sido replicado aqui.
3. **`valor_negocio` (o campo por trás de "valor da venda") existe em `dados/rows.json` mas está fora do `keep` de `src/rebuild2.py`** — hoje não chega ao painel (`DATA[0].valor_negocio` é `undefined`). Pré-requisito técnico: adicionar `'valor_negocio'` ao `keep`. **Consequência a avisar antes de implementar:** `CONTEXTO.md` já documenta que esse campo está "zerado na quase totalidade dos leads" — então qualquer checagem de presença vai marcar a maioria dos cadastros como "sem valor de venda". Isso é o dado real, não um bug da checagem nova; é também exatamente a informação acionável que o pedido quer expor (quantos cadastros estão comercialmente incompletos).
4. **Risco de a tabela de ação virar "quase tudo".** A aba Pontos de Atenção já tem uma tabela `#tAcao` que une 3 motivos (sem tag, Falta Pix 7+ dias, sem e-mail) num conjunto pequeno e acionável. Se o 4º campo (`valor_negocio`) estiver vazio na maioria da base (decisão 0.3), **incluir "ficha comercial incompleta" nessa mesma união faria `#tAcao` conter quase 100% dos cadastros**, destruindo a utilidade da tabela como lista curta de prioridades. **Decisão:** o alerta de completude comercial entra como **card informativo** (contagem + nota) em Pontos de Atenção, mas **não entra na união de `#tAcao`**. (Na aba Gerente, o mesmo alerta *entra* na união equivalente — ver `specs/prompt_aba_gerente.md`, seção 6.4 — porque ali a lista já é naturalmente pequena, só o time de um gerente.)
5. **"Tag do Pix" = a tag `PIX` já existente** (categoria PAGAMENTO), sem ambiguidade — já usada em Pagamentos e Pontos de Atenção.
6. **Uma função só, reaproveitada em todo lugar** (Perfil, Alertas, Gerente): `fichaComercialCompleta(r)`, definida em `a1.js`.

---

## 1. Onde a correção se aplica

### 1.1 Perfil e Valores — corrigir e expandir `#cQual` ("Qualidade do cadastro")

Estado atual (`a6.js`, bloco `TAB==='perfil'`):

```js
const Q=[['Com e-mail válido',cnt(R,r=>r.sem_email==='Não')],['Com telefone',cnt(R,r=>!!r.telefone)],
  ['Com renda informada',cnt(R,r=>!!r.valor_renda)],['Com ao menos 1 tag',cnt(R,r=>r.tags_list.length>0)],
  ['Com plano de pagamento',cnt(R,r=>!!r.plano_pagamento)],['Com finalidade declarada',cnt(R,r=>r.finalidade&&r.finalidade!=='-')]];
```

Substituir por (mantém as 4 primeiras barras intactas, corrige a 5ª, adiciona 2 novas):

```js
const Q=[['Com e-mail válido',cnt(R,r=>r.sem_email==='Não')],['Com telefone',cnt(R,r=>!!r.telefone)],
  ['Com renda informada',cnt(R,r=>!!r.valor_renda)],['Com ao menos 1 tag',cnt(R,r=>r.tags_list.length>0)],
  ['Com finalidade declarada',cnt(R,r=>r.finalidade&&r.finalidade!=='-')],
  ['Com valor de venda informado',cnt(R,r=>!!r.valor_negocio)],
  ['Com tag de plano de pagamento',cnt(R,r=>PLANOTAGS.some(t=>has(r,t)))],
  ['Com tag de Pix',cnt(R,r=>has(r,'PIX'))]];
```

Nota (`#nQual`) continua igual (`` `Sobre ${nf(n)} cadastros do recorte...` ``) — só o array de barras muda.

### 1.2 Pontos de Atenção — novo card informativo (sem entrar na tabela de ação — decisão 0.4)

No array `A` de cards (`a6.js`, bloco `TAB==='alertas'`), acrescentar um 4º item:

```js
const semComercial=R.filter(r=>!fichaComercialCompleta(r));
A.push(['Ficha comercial incompleta', semComercial.length,
  `${pct(semComercial.length,n)} do recorte não tem finalidade, valor de venda, tag de plano ou tag de Pix — não entra na tabela de ação abaixo por ser volume alto demais; ver detalhe em Perfil e Valores.`]);
```

`#tAcao` **não muda** — continua só com os 3 motivos originais (sem tag, Falta Pix 7+ dias, sem e-mail).

### 1.3 Aba Gerente — já coberta

`fichaComercialCompleta(r)` é a mesma função usada em `specs/prompt_aba_gerente.md`, seção 6.1/6.3 — nenhuma duplicação de regra.

---

## 2. Implementação (arquivos a tocar)

- **`a1.js`**: adicionar, junto dos outros helpers:

  ```js
  const CAMPOS_COMERCIAIS=[
    {k:'finalidade',    l:'finalidade declarada',     ok:r=>!!r.finalidade && r.finalidade!=='-'},
    {k:'valor_negocio', l:'valor de venda informado',  ok:r=>!!r.valor_negocio},
    {k:'plano_tag',     l:'tag de plano de pagamento', ok:r=>PLANOTAGS.some(t=>has(r,t))},
    {k:'pix_tag',       l:'tag de Pix',                 ok:r=>has(r,'PIX')}
  ];
  const fichaComercialCompleta=r=>CAMPOS_COMERCIAIS.every(c=>c.ok(r));
  ```

  (`PLANOTAGS` já existe em `a1.js`; `has` também.)
- **`src/rebuild2.py`**: no array `keep` (linha ~5), acrescentar `'valor_negocio'`.
- **`a6.js`**: editar o array `Q` do bloco `TAB==='perfil'` (seção 1.1) e o array `A` do bloco `TAB==='alertas'` (seção 1.2).
- **`body2.html`**: nenhuma mudança de markup — `#cQual` e `#alerts` já são preenchidos dinamicamente a partir dos arrays `Q`/`A` em JS.

---

## 3. Critérios de aceite

- [ ] `#cQual` mostra 8 barras; nenhuma lê `r.plano_pagamento` diretamente.
- [ ] A barra "Com tag de plano de pagamento" não mostra mais 0% (o campo morto foi trocado pela tag).
- [ ] Aba Pontos de Atenção mostra 4 cards, o 4º sendo "Ficha comercial incompleta"; a nota deixa claro que a maioria da base provavelmente cai aqui (dado real, não erro).
- [ ] `#tAcao` continua com só os 3 motivos originais — nenhum cadastro aparece lá só por causa de "ficha comercial incompleta".
- [ ] `DATA[0].valor_negocio` não é `undefined` depois do rebuild.
- [ ] `fichaComercialCompleta` existe uma única vez, em `a1.js`, e é chamada (não reimplementada) em Perfil, Alertas e Gerente.

---

## 4. Depois de implementar

Atualizar `specs/abas/06_perfil.md` (a linha "Valor do Negócio não aparece nesta aba (descartado do produto)" precisa de nuance: a **distribuição** continua descartada — dado majoritariamente zerado não rende gráfico útil —, mas a **presença/ausência** do campo agora é checada em `#cQual`), `specs/abas/07_alertas.md` (4º card) e `CONTEXTO.md` (a linha "Valor do Negócio foi descartado dos gráficos" ganha a mesma nuance). Rodar `PYTHONUTF8=1 python src/rebuild2.py` e conferir que `#cQual` tem 8 barras e que o novo card de Pontos de Atenção aparece com um número plausível (provavelmente alto, por causa de `valor_negocio`).
