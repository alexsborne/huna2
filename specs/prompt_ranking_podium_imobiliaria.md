# Prompt aprimorado — Ranking: imobiliária e corretor no pódio e no top 10

## Objetivo

Na aba **Ranking** do painel, o **Pódio** e o gráfico **Os 10 primeiros** devem passar a exibir, para cada colocado, duas informações complementares além do nome principal: o nome de um **corretor** (responsável) e o nome da **imobiliária** (marca) a qual ele pertence. Qual dessas duas informações aparece como rótulo principal e qual como complemento depende do modo de ranqueamento atual, de modo que o usuário sempre veja, ao mesmo tempo, o colocado e a entidade "parenta" a ele.

## Contexto técnico (para quem for implementar)

A aba vive em `src/a7.js`. O estado de ranqueamento é `RK = { tipo: 'marca' | 'responsavel', met, min }`. Cada lead traz três campos relevantes: `responsavel` (corretor), `equipe` (ex.: "HUNA IMOVEIS - ARTHUR MANOEL") e `marca`, que é derivada em `a1.js` como a porção da equipe antes do primeiro hífen (ex.: "HUNA IMOVEIS"). Hoje, `rkTable()` agrupa por `r[RK.tipo]` e produz objetos `{nome, leads, ...}` em que `nome` é o colocado; o Pódio e o gráfico de barras utilizam apenas `o.nome` (com `shortT(o.nome, 30)` nos rótulos). Não alterar o significado de `o.nome`: ele continua sendo a chave usada pelos filtros de clique (`toggle(RK.tipo, o.nome, …)`), pelo hash da URL e pela exportação da tabela completa.

## Comportamento desejado no Pódio

No bloco `rkPod`, montado em `paintRank()`, para cada um dos três primeiros colocados, mantenha o nome principal (`o.nome`) e adicione uma **linha secundária**, em fonte menor e opacidade reduzida, mostrando a entidade complementar, assim definida.

Quando `RK.tipo === 'marca'` (ranqueia lançadoras/imobiliárias), o rótulo principal é a própria imobiliária, então a linha secundária deve exibir o **corretor** que mais lidera aquela marca — definido como o `responsavel` de maior contagem entre os leads da marca; em caso de empate, desempata o que possuir mais aprovações (etapa "Pasta Aprovada com Pix"). A ideia é dar visibilidade à "face" humana de cada lançadora.

Quando `RK.tipo === 'responsavel'` (ranqueia mercado/corretores), o rótulo principal é o corretor, então a linha secundária deve exibir a **imobiliária** a que ele pertence — definida como a marca mais frequente entre seus leads; se o corretor operar em equipes de marcas distintas, usar a marca da equipe que lhe deu mais leads. A ideia é que o pódio de corretores deixe claro qual "casa" ele representa.

A lógica de interação não muda: o `data-n` continua valendo `o.nome`, o clique simples / Ctrl+click / Cmd+click continua chamando `toggle(RK.tipo, …)` e o destaque de seleção (`sel`) permanece. Quando não houver corretor ou imobiliária para preencher (base atual não apresenta essa situação, mas trate defensivamente), a linha secundária simplesmente desaparece em vez de imprimir "—", para não poluir o design do pódio.

## Comportamento desejado no gráfico "Os 10 primeiros"

No `build('cRank', …)`, as barras continuam filtrando por `top[i].nome` exatamente como hoje, e a cor de fundo / a ordenação / o eixo X não mudam. A alteração é apenas na legenda de cada barra e no tooltip.

No rótulo do eixo Y, mantenha o prefixo `posº  NomePrincipal` e acrescente, em linha abaixo e em fonte menor, o complemento no formato apropriado ao tipo: para `marca`, exiba "Corretor: <top broker da marca>"; para `responsavel`, exiba "Imobiliária: <marca do corretor>". Essas linhas são puramente informativas e não recebem interação.

No tooltip (callbacks `title` e `label`), além das duas linhas já existentes (nome do colocado e "valor · unidade · N leads"), acrescente uma terceira linha curta com o mesmo complemento mostrado no rótulo ("Corretor: …" ou "Imobiliária: …"), respeitando o português do Brasil e mantendo os valores numéricos já formatados.

## Detalhes de implementação

Em `rkTable()`, ao construir cada objeto `o`, calcule os dois novos campos a partir dos grupos já existentes, sem recoar qualquer coisa fora de `rowsFor(RK.tipo)` (assim o recorte continua respeitando os filtros ativos, incluindo o modo `tagMode === 'none'`) e sem mexer no corte `RK.min`. O cálculo é: para `marca`, `o.imob = o.nome` e `o.corretor` = moda de `r.responsavel` entre os leads da marca (desempate por aprovações); para `responsavel`, `o.corretor = o.nome` e `o.imob` = moda de `r.marca` entre os leads do corretor. Um agrupamento simples por contagem (reduce/Map) basta.

Em `paintRank()`, prossiga com o markup do Pódio adicionando um `<div class="sub2">` após o `.sub` existente, populado com `o.corretor` ou `o.imob` conforme o caso, e mantenha o `<div class="nm">` intacto. Para o gráfico de barras, ajuste o `labels` para incluir a segunda linha (use `\n` dentro da string do label e deixe o Chart.js renderizar multilinha) e atualize os callbacks do tooltip. Nenhuma outra aba, nenhuma outra função de `a6.js`/`a4.js` precisa ser tocada.

## Verificação

Após rodar `python3 src/rebuild2.py` (ou `src/build.sh`), o `index.html` gerado — ou `artifact_body2.html` para o artefato da Claude — deve conter os novos rótulos de complemento tanto no Pódio quanto nas barras do top 10, sem remover o "Corretor: …"/"Imobiliária: …" do tooltip. Os filtros de clique e o compartilhamento por hash URL continuam funcionando (clicando num lançador filtra a marca; clicando num corretor filtra o corretor). A tabela completa da aba continua reordenável pelo cabeçalho e exportável para CSV/XLSX/PDF exatamente como classificada, e o `data-name`/`data-title` de exportação deve permanecer coerente com o tipo de ranking. Confira visualmente também que, num lançador com apenas um corretor ativo (comum na base), o nome exibido na linha secundária é realmente o corretor mais forte daquele lançador, e não um nome aleatório.
