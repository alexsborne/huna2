# Spec — Aba Base de Cadastros

**Última sincronização:** 03/09/2026 (v4 — renomeada de "Base de Leads"; contato do corretor em colunas separadas)  
**`data-tab`:** `base`  
**Rótulo:** Base de Cadastros  
**Painel:** `section.panel[data-tab=base]`

---

## 1. Identidade

Aba tabular da carteira filtrada — visão linha a linha com busca local e exportação. É a única aba cujo contador no tab (`data-cnt="base"`) mostra o `n` do recorte.

## 2. Objetivo

Permitir localizar um cadastro, ver contatos (cliente e corretor), tags, renda e data de cadastro, e exportar exatamente o que está na tela.

## 3. Seções e widgets

### Base de Cadastros

| Widget | ID | Tipo |
|---|---|---|
| Busca | `#q` | `input[type=search]` |
| Tabela | `#tLeads` | tabela ordenável |
| Nota | `#nLeads` | contagem + se busca ativa |

Export: `data-name="base_de_cadastros"` · `data-title="Base de Cadastros — Funil de Pasta"` (renomeados em 03/09/2026; eram `base_de_leads`/"Base de leads — Funil de Pasta").

### Colunas

| Coluna | Campo / regra |
|---|---|
| Nº | `numero` (numérico) |
| Cadastro | `nome` |
| Telefone | `telefone` |
| E-mail | se `sem_email==='Sim'` → rótulo âmbar “sem e-mail”; senão `email` |
| Etapa | `etapa` |
| Tags | chips `.tg` ou — |
| Plano | `plano_pagamento` |
| Responsável | `responsavel` |
| **Telefone do corretor** | `resp_tel`, link `wa.me/55{dígitos}` |
| **E-mail do corretor** | `resp_email`, link `mailto:` |
| Equipe | `equipe` |
| Origem | `origem` |
| Renda | `valor_renda` formatado ou — |
| Cadastro em | `cadastro` (data/hora do registro — renomeada de "Cadastro" para não colidir com a coluna de nome, que agora também se chama "Cadastro") |

Ordenação padrão: Nº descendente.

**Mudança de 03/09/2026:** a antiga coluna única "Contato do responsável" (telefone + e-mail do corretor na mesma célula, em duas linhas) foi **separada em duas colunas**: "Telefone do corretor" e "E-mail do corretor". Cada uma exporta como sua própria coluna em CSV/XLSX/PDF (antes vinham unidas por ` · ` numa célula só).

## 4. Dados e fórmulas

- Função: `tLeads(rows)` em `a5.js` com `rows = rowsFor()`.
- Busca: substring case-insensitive em  
  `nome`, `telefone`, `email`, `equipe`, `responsavel`, `resp_tel`, `resp_email`, `origem`, `etapa`, `tags_list`.
- Contador da aba: em `apply()`, só a tab `base` recebe `nf(n)` no badge.

## 5. Interações e filtros

- Digitar em `#q` → `oninput` em `a4.js` chama `tLeads(rowsFor())` + `mountBars()` (não passa por `apply` completo).
- Clique no cabeçalho ordena.
- Links WhatsApp/e-mail abrem em nova aba; não disparam filtro.
- Filtros globais reduzem as linhas antes da busca.

## 6. Exportações

CSV / XLSX / PDF a partir do DOM. Exportações respeitam busca, filtros e ordenação ativos. `a3.js` não precisou de nenhuma alteração — como lê o DOM da tabela genericamente (`grab()`), a separação em duas colunas já reflete sozinha nos três formatos.

## 7. Dependências de código

- `body2.html`, `a5.js` (`tLeads`, `tbl`), `a6.js` (chama `tLeads` e atualiza badge), `a3.js`, `a4.js` (tabs)

## 8. Critérios de aceite

- [ ] Badge da aba Base de Cadastros mostra a quantidade do recorte; outras abas não mostram número no badge.
- [ ] Placeholder de e-mail CRM aparece como “sem e-mail”, não como endereço real.
- [ ] "Telefone do corretor" é link `wa.me`; "E-mail do corretor" é link `mailto:`; são colunas distintas, não uma célula combinada.
- [ ] Export (CSV/XLSX/PDF) mostra telefone e e-mail do corretor em colunas separadas.
- [ ] Export reflete busca + ordenação da tela.
