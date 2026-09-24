# Spec — Aba Super Meta (superMeta)

**Última sincronização:** 18/09/2026 (criação)
**`data-tab`:** `superMeta`
**Rótulo:** Super Meta
**Painel:** `section.panel[data-tab=superMeta]`

---

## 1. Identidade

Tela de acompanhamento da campanha "Super Meta", a partir da planilha **"Super Meta Siena.xlsx"** (fornecida pelo usuário em 18/09/2026). Diferente da aba "Previsão x Execução" (`previsao2`, meta acumulada do funil inteiro, sem período), aqui a meta é **mensal**: Setembro, Outubro, Novembro e Dezembro/2026, cada mês com **2 patamares** — Meta (piso) e Super Meta (teto, patamar acima) — além do total da campanha inteira (soma dos 4 meses).

## 2. Objetivo

Mostrar, por imobiliária e por mês da campanha (ou pela campanha inteira), se a execução de cadastros no CRM está abaixo da Meta, batendo a Meta, ou já na Super Meta.

## 3. Diferença para a aba "Previsão x Execução" (`previsao2`)

| | `previsao2` | `superMeta` |
|---|---|---|
| Planilha de origem | "Expectativa de vendas - SIENA.xlsx", 11/09/2026 | "Super Meta Siena.xlsx", 18/09/2026 |
| Período | Acumulado do funil inteiro, sem período | Mensal (Set/Out/Nov/Dez 2026) + total da campanha |
| Patamares de meta | 1 (meta única) | 2 (Meta e Super Meta) |
| Cobertura do Mercado | ~29 imobiliárias | 34 imobiliárias — inclui as 5 que ficavam em "Cadastros fora da previsão" na `previsao2` (Valus, Tyrone, Home, Claudino, Castel) |
| Segue filtro "Mês" do topo? | Não segue nenhum filtro do topo (exceto "Imobiliária") | Não segue nenhum filtro do topo — tem **seletor de período próprio** (`#smPeriodo`), porque o recorte de tempo aqui é o mês da campanha, não o filtro genérico "Mês" (que serviria para outro propósito, cortar por mês qualquer campo do funil inteiro) |

## 4. Seções e widgets

| Seção | Widgets | Sempre visível? |
|---|---|---|
| Seletor de período | `#smPeriodo` (Setembro/Outubro/Novembro/Dezembro/Campanha inteira) | sim |
| Indicadores | `#smKpis` (6 KPIs) | sim |
| Super Meta x execução por imobiliária | `#cSmImob` (barras horizontais pareadas Super Meta/Execução, 40 imobiliárias, scroll) | sim |
| Detalhamento por imobiliária | `#tSm` (40 linhas — 6 Lançadoras + 34 Mercado) | sim |
| Cadastros fora da Super Meta | `#tSmFora` (equipes do Mercado, no período selecionado, sem imobiliária correspondente) | sim |

## 5. Dados e fórmulas (`a1.js`)

- **`SUPERMETA_MESES`** — os 4 meses da campanha, `{mes:'2026-09',nome:'Setembro'}` etc. (formato `mes` igual ao campo `r.mes` dos cadastros).
- **`SUPERMETA`** — array fixo com as 40 linhas da planilha: `{num, imob, keys, baseZero, meses:[{meta,superMeta}×4], campMeta, campSuperMeta}`.
  - `keys: null` → uma das 6 Lançadoras (mesmos rótulos de `SIENA2`/`GRUPOS_LANCADORA`: AEVO, Adão, MyBroker, HUNA, URBS, Lopes) — casa direto por `r.marca`.
  - `keys: [...]` → imobiliária do Mercado — casada pelo prefixo bruto de `equipe`, mesmo critério de `siena2MatchMercado`. **Reaproveita as mesmas `keys` já conferidas em `SIENA2`** para as 29 imobiliárias em comum; as 5 novas (Valus, Tyrone, Home, Claudino, Castel) ganharam key própria a partir dos prefixos reais que já apareciam em `SIENA2UNMAPPED`.
  - `baseZero` é só o histórico de referência da planilha (informativo — não entra em nenhum cálculo de meta/execução).
  - `campMeta`/`campSuperMeta` vêm prontos da coluna "Campanha 90 dias" da planilha (soma dos 4 meses, já calculada pelo usuário) — não são recalculados a partir de `meses[]` no código, para não divergir da planilha original.
- **`superMetaMatchMercado(r)`** / **`superMetaRowMatches(r,s)`** — mesma lógica de `siena2MatchMercado`, aplicada ao catálogo `SUPERMETA`.
- **`SM_PERIODO`** — estado da aba (não é dimensão de `ST`): `0`–`3` (índice em `SUPERMETA_MESES`) ou `'campanha'`. Default: mês corrente do relógio do cliente, se cair dentro de Set–Dez/2026; senão, `'campanha'`.
- Dentro do render (`a6.js`, ramo `TAB==='superMeta'`), para cada período, `exec` é recalculado na hora: `METABASE.filter(r=>mesesAlvo.includes(r.mes) && superMetaRowMatches(r,s)).length` — **filtra por `r.mes` explicitamente** (diferente de `SIENA2EXEC`, que não filtra por mês/período nenhum). `METABASE` já exclui Desistente (mesmo critério de "execução" usado em `previsao`/`previsao2`: todo cadastro em qualquer etapa conta).

## 6. Interações e filtros

- **Não participa do cross-filter global de nenhum filtro do topo** (nem "Imobiliária", diferente de `previsao2`) — o recorte relevante aqui é o período da campanha, controlado só pelo `#smPeriodo` desta aba.
- Trocar `#smPeriodo` chama `paint()` diretamente (sem tocar `ST`/hash) — reaproveita o mesmo padrão de `mountGerente()`/`GER` (estado de UI fora de `ST`, mas sem persistência em `localStorage`, diferente do time salvo na aba Gerente).
- Gráfico `#cSmImob` e tabela `#tSm` ordenados por padrão pelo maior nível atingido (Super Meta primeiro, depois Meta, depois abaixo da Meta, depois sem meta no período) — dentro de cada nível, sem critério secundário além da ordem de inserção.
- Cabeçalho de `#tSm`/`#tSmFora` ordenável (componente genérico `tbl()`).
- Sem clique nos gráficos/KPIs desta aba (não escrevem em `ST`).

## 7. Exportações

`#tSm`, `#tSmFora` — CSV/XLSX/PDF padrão via `.tbar`. `#cSmImob` — Excel via `.chart-export`.

## 8. Dependências de código

- `body2.html` (`superMeta`), `a4.js` (`TABS`), `a6.js` (`mountSuperMeta`, ramo `TAB==='superMeta'`, chamada em `readHash(); mountTabs(); ...`), `a1.js` (`SUPERMETA_MESES`, `SUPERMETA`, `superMetaMatchMercado`, `superMetaRowMatches`, `SM_PERIODO`)

## 9. Riscos conhecidos / avisado ao usuário

- Igual à `previsao2`: o casamento imobiliária↔planilha no Mercado é por palavra-chave manual (`keys`), não parser genérico. As `keys` das 29 imobiliárias em comum com `SIENA2` foram reaproveitadas (já conferidas em 11/09/2026); as 5 novas (Valus, Tyrone, Home, Claudino, Castel) usaram os prefixos exatos que já apareciam como "fora da previsão" no relatório de `verificar_quantitativos.js` — não foram reconferidas linha a linha contra a planilha, mas contra o dado real do CRM.
- Outubro, Novembro e Dezembro/2026 aparecem com execução 0 até existir cadastro nesses meses (a base de dados atual só tem cadastros até 2026-09) — não é bug, é a campanha ainda não ter começado nesses meses.
- Se o usuário atualizar a planilha "Super Meta Siena.xlsx" (valores, imobiliárias novas), `SUPERMETA` em `a1.js` precisa ser editado à mão — não há import automático de planilha.
- `campMeta`/`campSuperMeta` são os valores da coluna "Campanha 90 dias" da planilha, não a soma de `meses[]` recalculada no código — se o usuário corrigir só os meses individuais sem atualizar a coluna de campanha, os dois podem divergir.
- Verificação em Node (fora do navegador, ver sessão de 18/09/2026) confirmou a invariante "Lançadora + Mercado mapeado + fora da Super Meta = total de cadastros do período" para os 5 períodos (4 meses + campanha) — não foi possível abrir o painel num navegador real nesta sessão (extensão Claude in Chrome sem permissão para `file://`), então a checagem visual (cores, layout, seletor de período) ainda não foi feita — recomendado ao usuário conferir ao abrir o painel.

## 10. Critérios de aceite

- [ ] Para cada período (Set/Out/Nov/Dez/Campanha): execução das 6 Lançadoras + execução do Mercado mapeado + "Cadastros fora da Super Meta" === total de cadastros (não-Desistente) daquele período — nenhum cadastro se perde nem conta duas vezes.
- [ ] Trocar `#smPeriodo` recalcula KPIs, gráfico e as duas tabelas sem precisar recarregar a página nem afetar nenhuma outra aba.
- [ ] Trocar qualquer filtro do topo (incluindo "Imobiliária") não muda nenhum número desta aba.
- [ ] Tabela `#tSmFora` nunca lista um prefixo de equipe que já aparece com match em `#tSm`.
- [ ] Imobiliária com `meta===0 && superMeta===0` no período (ex.: Rosa, em vários meses) aparece na tabela com "Sem meta no período", não entra no denominador dos KPIs "na Super Meta"/"na Meta"/"abaixo da Meta".
