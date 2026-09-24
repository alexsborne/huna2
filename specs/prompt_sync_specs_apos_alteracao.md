# Prompt — Sync obrigatório das specs após qualquer alteração no painel

**Uso:** copiar e colar (ou invocar) **sempre que** houver alteração neste projeto que toque UI, abas, filtros, dados embutidos no HTML, build ou publicação do painel.  
**Escopo do código:** `Nexo_Painel_Contexto_Completo/handoff/`  
**Specs:** `specs/abas/*.md` + `specs/abas/README.md`  
**Contexto geral:** `CONTEXTO.md` (handoff e raiz, se a mudança afetar o dossiê)

---

## Prompt (colar a partir daqui)

```
Você é o agente responsável por manter as specs do Painel Funil de Pasta Nexo
sincronizadas com o funcionamento REAL do código.

## Quando este protocolo vale

Execute este protocolo ao FINAL de toda alteração neste projeto que mude:
- markup (`src/body2.html`, `src/head2.html`)
- lógica de abas/filtros/gráficos/tabelas/export (`src/a1.js`…`a7.js`, `a3.js`)
- build (`src/rebuild2.py`) ou placeholders embutidos no HTML
- inventário/ordem/rótulos de abas (`TABS` em `a4.js`)
- comportamento de publicação que altere o que o usuário vê no `index.html`

NÃO pule o sync das specs “para depois”. Código e specs saem juntos na mesma entrega.

Exceções (não exigem rewrite das specs de aba, mas anote no CONTEXTO se relevante):
- só reextração de dados com o mesmo schema (números mudam, regras não)
- só rebuild sem diff em `src/`
- CSS puramente cosmético sem mudar estrutura semântica (IDs, seções, widgets, labels)

## Objetivo

1. Toda alteração feita na página deve ser anotada nas specs.
2. Todas as regras de montagem de TODAS as abas devem refletir o funcionamento ATUAL.
3. Elementos visuais e funcionamentos RETIRADOS das telas/abas devem sair da descrição
   “como funciona agora” — o spec descreve SOMENTE o atual.
4. O funcionamento atual completo de cada aba ativa deve ficar anotado no seu spec
   (não deixar buracos: widgets, fórmulas, interações, export, dependências, aceite).
5. Se a alteração CONFLITAR com uma regra já escrita (spec, CONTEXTO, README de abas
   ou outro prompt em `specs/`), PARE a implementação ambígua e FAÇA PERGUNTAS
   objetivas ao usuário antes de decidir o detalhe — depois atualize spec + código
   conforme a resposta.

## Fontes da verdade (ordem)

1. Código em `src/` (e o `index.html` gerado, se já rebuildado) — o que o usuário vê.
2. `specs/abas/*.md` — contrato legível; deve ser reescrito para bater com (1).
3. `specs/abas/README.md` — inventário, status ativa/desativada, ordem das abas.
4. `CONTEXTO.md` — dossiê; atualizar se a mudança afetar arquitetura, dados, publicação
   ou regras globais.

Se código e spec divergirem, o spec está errado até ser corrigido.

## Passo a passo obrigatório

### A) Inventariar o diff

Liste o que mudou, por arquivo, em linguagem de produto+técnica:
- abas afetadas (`data-tab`)
- widgets adicionados / removidos / renomeados (IDs de canvas, tabelas, KPIs, controles)
- filtros / dimensões / fórmulas / métricas
- textos de UI (títulos, subtítulos, hints, notas)
- exportações (`data-name`, `data-title`)
- abas ativadas ou desativadas em `TABS`

### B) Detectar conflitos de regra (perguntar antes de inventar)

Compare a mudança pretendida ou já feita com:
- o spec da aba
- `specs/abas/README.md`
- `CONTEXTO.md`
- outros prompts em `specs/` (ex.: ranking, v4)

Se houver conflito, ambiguidade ou duas interpretações válidas, NÃO escolha em silêncio.
Crie perguntas claras no formato abaixo e espere resposta (ou use a ferramenta de
pergunta estruturada se disponível):

#### Modelo de pergunta de conflito

Para cada conflito:
1. **Regra existente:** cite arquivo + trecho (o que estava escrito).
2. **Mudança proposta/detectada:** o que o código ou o pedido quer agora.
3. **Por que conflita:** uma frase.
4. **Opções de implementação:** 2–4 alternativas concretas (comportamento observável).
5. **Recomendação:** qual opção você recomenda e por quê (uma frase).
6. **Impacto nas specs:** quais arquivos `.md` mudam em cada opção.

Exemplos de conflitos que EXIGEM pergunta:
- Remover aba da UI mas manter código: spec fica “desativada” ou é apagada?
- Renomear aba/rótulo: atualiza só UI ou também `data-tab`, hash URL, exports?
- Mudar fórmula (ex.: conversão, mediana, limiar de alerta): altera critério de aceite?
- Dois widgets passam a filtrar a mesma dimensão de formas diferentes.
- Feature nova contradiz regra documentada (ex.: “tags descobertas dos dados” vs lista fixa).
- Restaurar aba desativada com comportamento diferente do spec antigo.

Só depois das respostas: implemente/ajuste código se ainda necessário e atualize as specs.

### C) Atualizar specs — regras de escrita

Para CADA aba tocada (e para abas vizinhas se a mudança global as afetar):

1. Abra `specs/abas/0X_....md`.
2. Atualize **Última sincronização** (data do dia).
3. Reescreva as seções para descrever SOMENTE o funcionamento atual:
   1. Identidade
   2. Objetivo
   3. Seções e widgets
   4. Dados e fórmulas
   5. Interações e filtros
   6. Exportações (se houver; se não houver, diga explicitamente)
   7. Dependências de código
   8. Critérios de aceite
4. REMOVA do corpo “como funciona agora” qualquer widget, fluxo, coluna, KPI,
   gráfico, hint ou regra que não exista mais na UI ativa.
5. Se precisar preservar histórico de algo removido, use no MÁXIMO um bloco curto
   `### Histórico / removido em YYYY-MM-DD` no final do arquivo — nunca misture
   passado com presente nas seções 1–8.
6. Abas desativadas (fora de `TABS`, código ainda no repo):
   - mantenha o arquivo de spec
   - no topo: status **desativada**, data, e o que ainda existe no código
   - nas seções 1–8 descreva o comportamento que o código TERIA se reativada
     *ou* deixe explícito “não montada na UI; painel/markup pode permanecer no HTML
     mas não há entrada em TABS” — o importante é não fingir que está ativa
   - atualize a coluna Status em `specs/abas/README.md`
7. Aba nova: crie `0N_nome.md`, acrescente no README, siga o formato das seções.
8. Aba apagada de verdade (código e markup removidos): remova ou marque como
   arquivada conforme a resposta da pergunta de conflito; atualize o README.

### D) Sync do inventário e do contexto

- Atualize a tabela de inventário em `specs/abas/README.md` (ordem = `TABS` atual;
  status ativa/desativada; rótulos iguais à UI).
- Se a mudança afetar arquitetura, dados, publicação, LGPD ou fluxo de rebuild,
  atualize `CONTEXTO.md` do handoff (e o da raiz do workspace se estiver em uso).

### E) Verificação final (checklist — só declare feito se cumprir)

- [ ] Diff de código revisado aba a aba
- [ ] Specs das abas afetadas reescritas para o estado ATUAL (sem lixo de UI removida nas seções 1–8)
- [ ] Funcionamento atual completo anotado (widgets, fórmulas, interações, export, aceite)
- [ ] README de abas coerente com `TABS` em `a4.js`
- [ ] Conflitos de regra viraram perguntas; respostas aplicadas
- [ ] `Última sincronização` atualizada
- [ ] CONTEXTO atualizado se a mudança for estrutural
- [ ] Nada na spec afirma comportamento que o código não faz

## Saída esperada ao concluir

1. Resumo curto do que mudou no produto.
2. Lista de specs/arquivos tocados.
3. Perguntas de conflito (se ainda houver pendência — não invente resposta).
4. Confirmação explícita: “Specs refletem somente o funcionamento atual.”
```

---

## Como usar no dia a dia

1. Faça (ou peça) a alteração de código/UI.  
2. Cole este prompt (bloco acima) na conversa com o agente, anexando o diff ou a descrição da mudança.  
3. Se o agente listar **perguntas de conflito**, responda antes de ele fechar as specs.  
4. Confira o checklist da seção E.

## Relação com outros artefatos

| Artefato | Papel |
|---|---|
| Este prompt | Procedimento padrão pós-alteração |
| `specs/abas/README.md` | Inventário + regra resumida + formato das seções |
| `specs/abas/0N_*.md` | Contrato por aba |
| `CONTEXTO.md` | Dossiê do projeto |
| Prompts pontuais (`prompt_v4_…`, `prompt_ranking_…`) | Mudanças grandes pontuais; ao aplicar, rode também este sync |

## Lembrete para virar skill depois (opcional)

Se no futuro quiser uma skill `/sync-specs-painel`, o corpo dela deve ser este protocolo (sem duplicar o inventário das abas — apontar para `specs/abas/README.md`). Triggers sugeridos: “atualizei a aba”, “mudei o painel”, “sync specs”, “alteração no index/handoff”.
