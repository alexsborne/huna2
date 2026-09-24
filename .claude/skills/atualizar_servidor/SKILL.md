---
name: atualizar_servidor
description: Atualiza o Painel do Funil de Pasta (Nexo Gestão Imobiliária) com os dados mais recentes do Imobmeet, confere se os somatórios entre as abas do relatório batem, corrige se não baterem, e publica no GitHub Pages (alexsborne/huna) — já com a palavra-chave de publicação embutida, não precisa perguntar de novo nem confirmar por mensagem separada. Use sempre que o usuário pedir para atualizar o relatório/painel com dados do Imobmeet, "rodar a atualização diária", "atualizar e publicar o painel da Nexo", ou invocar /atualizar_servidor — mesmo que a frase não mencione "skill" explicitamente.
---

# atualizar_servidor

Procedimento fixo e já validado (rodado com sucesso várias vezes) — não é um caso que precise
de exploração: siga os passos na ordem. **Objetivo de custo: use a menor quantidade de tokens
possível** — rode os comandos abaixo diretamente, não releia o `CONTEXTO.md` inteiro nem re-derive
a lógica de negócio a cada execução, ela já está documentada aqui e no código.

`abacaxi` é a palavra-chave de publicação deste projeto (ver `CONTEXTO.md`) — **ao rodar esta
skill, ela já está pré-autorizada**: não pare no passo 4 pra pedir confirmação de novo.

## 0. Onde rodar

Raiz do projeto = a pasta que contém `automacao/`, `src/`, `dados/`, `CONTEXTO.md` (chame de
`BASE`). Todos os comandos abaixo assumem `cwd = BASE` a menos que indicado.

## 1. Extrair os dados do Imobmeet (sem publicar ainda)

```
cd automacao
DRY_RUN=1 LOGIN_MODE=auto PYTHONUTF8=1 python atualizar.py
```

Rode com `dangerouslyDisableSandbox: true` (o Chrome headless é morto pelo sandbox padrão da
ferramenta) e timeout de uns 5 minutos — leva ~2-3 min normalmente (login + extração de leads +
fichas + contatos de corretores novos). Credenciais já estão em `automacao/.env`
(`IMOBMEET_USER`/`IMOBMEET_PASS`), não peça ao usuário.

Isso já faz sozinho: login → extrai `dados/rows.json` → roda as validações internas do script
(sem `lead_id` duplicado, tag desconhecida fora de `dados/catmap.json`, queda suspeita >50% de
cadastros) → `rebuild2.py` → grava `BASE/index.html` local com metas `noindex` → **roda a
conferência de qualidade/quantitativos do passo 2 abaixo automaticamente** (desde que
`automacao/atualizar.py` foi integrado com `automacao/verificar_quantitativos.js`, 14/09/2026 —
a mesma rotina que roda pela skill roda também no Agendador de Tarefas do Windows e em qualquer
outra chamada do script) → **não publica** (por causa do `DRY_RUN=1`).

**Se abortar aqui** (`fail(...)` no log), duas causas possíveis:
1. **Tag nova fora do catmap.json** — o script trava de propósito (regra do projeto: nunca deixar
   passar tag sem olhar a categoria). Não invente uma categoria sozinho sem contexto: se for óbvio
   pelo nome (ex. claramente sobre forma de pagamento), categorize e adicione a
   `dados/catmap.json`; se não for óbvio, pare e pergunte ao usuário.
2. **Conferência de qualidade/quantitativos falhou** (mensagem "conferência de qualidade/
   quantitativos entre abas falhou") — ver passo 2 abaixo pra diagnosticar e corrigir, depois rode
   o passo 1 de novo (ou só `verificar_quantitativos.js` sozinho pra confirmar a correção antes de
   rodar tudo de novo).

## 2. Conferir qualidade e quantitativos entre abas

No caminho feliz **isso já rodou sozinho dentro do passo 1** — não precisa rodar de novo se o
passo 1 não abortou. Use este passo separadamente só para (a) diagnosticar uma falha do passo 1,
ou (b) confirmar uma correção antes de rodar o passo 1 de novo:

```
node automacao/verificar_quantitativos.js .
```

Esse script (rode-o em vez de reescrever os cálculos à mão a cada vez) confere, contra
`dados/rows.json` e o HTML recém-gerado em `src/Painel_Funil_de_Pasta_Nexo.html`:

1. soma por etapa / responsável / equipe == total de cadastros;
2. soma de `n_tags` bate com `tags_list.length` em toda linha;
3. nenhum `lead_id` duplicado;
4. **Previsão x Execução:** execução mapeada + "fora da previsão" == total sem Desistentes — essa
   conta já quebrou uma vez no histórico do projeto (v4.16, 13/09/2026) quando uma tabela de
   mapeamento (`SIENA2` em `src/a1.js`) ficou desatualizada; o script extrai `SIENA2`/
   `grupoLancadora` **ao vivo** de `src/a1.js` (não usa cópia fixa), então continua válido mesmo
   se alguém editar essa tabela depois;
5. sintaxe dos blocos `<script>` do HTML final (pega bug de colchete/chave sobrando antes de ir
   ao ar — já aconteceu uma vez, v4.16).

Sai com código 0 e "tudo bateu" se estiver tudo certo — a lista de "imobiliárias fora da
planilha SIENA2" que aparece no final é **informativa, não é erro**: imobiliárias novas do
Mercado sem meta cadastrada aparecem ali por design (card "Cadastros fora da previsão" no
próprio painel).

**Se sair com código 1** (achou `[FALHA]`): a causa quase sempre é uma equipe/imobiliária nova
que apareceu nos dados mas não está coberta pelas tabelas de mapeamento por palavra-chave
(`METAS`/`SIENA2` em `src/a1.js`) — leia a mensagem de falha, ache a tabela certa em `src/a1.js`,
adicione a entrada faltante (siga o padrão das entradas vizinhas), rode
`PYTHONUTF8=1 python automacao/../src/rebuild2.py` (cwd = `src/`) de novo pra reconstruir o HTML,
e repita este passo 2 até bater. Não publique com uma falha ainda aberta.

## 3. Atualizar CONTEXTO.md

Regra permanente do projeto (não pule): toda atualização de dados precisa refletir na seção 3 do
`CONTEXTO.md`. Siga o padrão já estabelecido — adicione um parágrafo novo tipo "**Nª extração
pela automação (X cadastros...)**" no topo da seção 3 (antes do parágrafo da extração anterior,
que vira histórico), com: total de cadastros, diferença vs. anterior (novos/sumiram), somatório
de tags, contagem por etapa, qualquer corretor sem contato, e uma linha confirmando que a
conferência do passo 2 bateu. Atualize também a frase "**Estado atual**" no topo do arquivo (linha
~5) pra apontar pra essa extração em vez da anterior. **Não reescreva** as tabelas grandes
antigas (tags em uso, números de referência) a cada rodada — isso já é tratado como histórico
"congelado"; só o parágrafo novo carrega os números atuais (mesmo padrão usado desde a 11ª
extração, veja o próprio arquivo).

## 4. Publicar no GitHub

Reaproveite o clone já configurado com credencial de push (`automacao/_publish_clone`) — não
clone de novo do zero nem peça senha:

```
git -C automacao/_publish_clone fetch origin main
git -C automacao/_publish_clone reset --hard origin/main
cp index.html automacao/_publish_clone/index.html
git -C automacao/_publish_clone add index.html
git -C automacao/_publish_clone commit -m "Atualização automática — $(date '+%d/%m/%Y %H:%M')"
git -C automacao/_publish_clone push origin main
```

Se `git status --porcelain` (antes do commit) não mostrar diferença nenhuma em `index.html`,
não há nada novo pra publicar — não force um commit vazio, só avise que os dados do Imobmeet não
mudaram desde a última publicação.

Depois do push, acrescente uma linha em `automacao/log.txt` no mesmo formato das outras
(`[YYYY-MM-DD HH:MM:SS] publicado em alexsborne/huna (index.html) — via skill atualizar_servidor.`)
pra manter o log consistente com o que a automação normal escreve.

## 5. Reportar ao usuário

Uma mensagem curta: quantos cadastros (e a diferença vs. antes), se a conferência do passo 2
bateu de primeira ou precisou de correção (e qual), e o hash do commit publicado — ou que não
havia nada novo pra publicar, se for o caso. Não repita o passo a passo inteiro, o usuário já
sabe o que a skill faz.
