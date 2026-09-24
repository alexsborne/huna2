#!/usr/bin/env node
// Confere a integridade quantitativa de dados/rows.json e do HTML gerado por rebuild2.py
// ANTES de publicar. Não duplica a lógica de agrupamento (GRUPOS_LANCADORA/SIENA2) num
// segundo lugar — ela é extraída ao vivo de src/a1.js (via vm.Script) pra nunca ficar
// dessincronizada se alguém editar as tabelas de meta/mapeamento lá.
//
// Uso: node verificar_quantitativos.js <pasta_do_projeto>
// Saída: relatório no stdout; exit code 0 se tudo bateu, 1 se achou alguma inconsistência real.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = path.resolve(process.argv[2] || '.');
const rowsPath = path.join(BASE, 'dados', 'rows.json');
const a1Path = path.join(BASE, 'src', 'a1.js');
const builtHtmlPath = path.join(BASE, 'src', 'Painel_Funil_de_Pasta_Nexo.html');

let ok = true;
const fail = msg => { ok = false; console.log('[FALHA] ' + msg); };
const pass = msg => console.log('[ok]    ' + msg);

if (!fs.existsSync(rowsPath)) { console.log('[FALHA] não achei ' + rowsPath); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(rowsPath, 'utf8'));
const total = rows.length;
console.log('Total de cadastros (dados/rows.json): ' + total);

// ---- 1. somas simples por dimensão devem bater com o total de linhas ----
function somaPorCampo(campo) {
  const m = {};
  for (const r of rows) m[r[campo]] = (m[r[campo]] || 0) + 1;
  return Object.values(m).reduce((a, b) => a + b, 0);
}
['etapa', 'responsavel', 'equipe'].forEach(campo => {
  const soma = somaPorCampo(campo);
  if (soma === total) pass(`soma por "${campo}" = ${soma} (bate com o total)`);
  else fail(`soma por "${campo}" = ${soma}, mas o total de linhas é ${total}`);
});

// ---- 2. n_tags precisa bater com tags_list.length em toda linha, e a soma total ----
let nTagsDivergente = 0;
let somaNTags = 0;
for (const r of rows) {
  somaNTags += r.n_tags || 0;
  if ((r.n_tags || 0) !== (r.tags_list || []).length) nTagsDivergente++;
}
if (nTagsDivergente === 0) pass(`n_tags bate com tags_list em todas as ${total} linhas (soma = ${somaNTags})`);
else fail(`${nTagsDivergente} linha(s) com n_tags != tags_list.length`);

// ---- 3. lead_id duplicado ----
const ids = rows.map(r => r.lead_id);
const idsUnicos = new Set(ids);
if (idsUnicos.size === ids.length) pass('nenhum lead_id duplicado');
else fail(`${ids.length - idsUnicos.size} lead_id(s) duplicado(s)`);

// ---- 4. Previsão x Execução (SIENA2): execução mapeada + fora da previsão == total sem Desistentes.
//         Extrai GRUPOS_LANCADORA/normMarca/SIENA2/siena2MatchMercado direto de src/a1.js (vm),
//         em vez de manter uma cópia hardcoded que pode ficar desatualizada. ----
if (fs.existsSync(a1Path)) {
  let a1src = fs.readFileSync(a1Path, 'utf8');
  // a1.js é um template (rebuild2.py substitui __DATA__/__CATMAP__/__LOGO__/__PANEL__ por texto
  // literal antes de rodar no navegador) — reproduz exatamente a mesma substituição aqui, em vez
  // de tentar declarar essas variáveis "por fora"; assim o trecho roda igual ao HTML publicado.
  // __DATA__/__CATMAP__ aparecem sem aspas no source (`const DATA = __DATA__;`) — precisam de
  // valor bruto. __LOGO__/__PANEL__ já vêm ENTRE aspas no source (`const LOGO = "__LOGO__";`) —
  // sem aspas na substituição, senão dobra as aspas e quebra a sintaxe.
  a1src = a1src.replace('__DATA__', '[]').replace('__CATMAP__', '{}')
               .replace('__LOGO__', '').replace(/__PANEL__/g, 'pasta');
  // a1.js espera rodar num browser (document/localStorage/getComputedStyle já no topo, fora de
  // função) — isola só até onde as construções que a gente precisa (GRUPOS_LANCADORA..SIENA2*)
  // já foram declaradas, cortando no marcador "===== estado =====" que sempre vem depois.
  const marcador = '/* ===== estado =====';
  const corte = a1src.indexOf(marcador);
  // `const`/`let` de topo NÃO viram propriedade do objeto global em JS (só `function`/`var`
  // viram) — mesmo comportamento em navegador de verdade, não é peculiaridade do vm. Sem essa
  // ponte explícita, dava pra rodar o trecho mas não pra ler SIENA2/GRUPOS_LANCADORA depois.
  const ponte = '\nthis.SIENA2=SIENA2; this.normMarca=normMarca; this.grupoLancadora=grupoLancadora;';
  const trecho = (corte > 0 ? a1src.slice(0, corte) : a1src) + ponte;
  const sandbox = {
    console,
    document: { documentElement: { dataset: {} } },
    window: {},
    localStorage: { getItem: () => null, setItem: () => {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
  };
  vm.createContext(sandbox);
  try {
    new vm.Script(trecho, { filename: 'a1-trecho.js' }).runInContext(sandbox, { timeout: 5000 });
  } catch (e) {
    fail('não consegui extrair as tabelas de a1.js pra conferir Previsão x Execução: ' + e.message);
  }
  if (typeof sandbox.SIENA2 === 'undefined' || typeof sandbox.grupoLancadora !== 'function') {
    fail('extraí src/a1.js sem erro, mas SIENA2/grupoLancadora não apareceram — a estrutura do arquivo deve ter mudado (marcador de corte, nome das variáveis). Ajustar este script.');
  } else {
    const isDesist = r => r.etapa === 'Desistente';
    rows.forEach(r => {
      const raw = (r.equipe || '').split(/\s*-\s*/)[0].trim() || '(sem equipe)';
      r._marca = sandbox.grupoLancadora(raw);
    });
    const metabase = rows.filter(r => !isDesist(r));
    const siena2Match = r => {
      const raw = sandbox.normMarca((r.equipe || '').split(/\s*-\s*/)[0]);
      const hit = sandbox.SIENA2.find(s => s.keys && s.keys.some(k => raw.includes(sandbox.normMarca(k))));
      return hit ? hit.imob : null;
    };
    let exec = 0;
    sandbox.SIENA2.forEach(s => {
      exec += s.keys === null
        ? metabase.filter(r => r._marca === s.imob).length
        : metabase.filter(r => r._marca === 'Mercado' && siena2Match(r) === s.imob).length;
    });
    const fora = {};
    metabase.filter(r => r._marca === 'Mercado' && !siena2Match(r)).forEach(r => {
      const k = (r.equipe || '').split(/\s*-\s*/)[0].trim() || '(sem equipe)';
      fora[k] = (fora[k] || 0) + 1;
    });
    const foraTotal = Object.values(fora).reduce((a, b) => a + b, 0);
    if (exec + foraTotal === metabase.length) {
      pass(`Previsão x Execução: execução mapeada (${exec}) + fora da previsão (${foraTotal}) = ${exec + foraTotal} = total sem Desistentes (${metabase.length})`);
    } else {
      fail(`Previsão x Execução: execução (${exec}) + fora (${foraTotal}) = ${exec + foraTotal}, mas total sem Desistentes é ${metabase.length}`);
    }
    if (foraTotal > 0) {
      console.log('        imobiliárias/equipes de Mercado fora da planilha SIENA2 (informativo, não é erro por si só):');
      Object.entries(fora).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`          - ${k}: ${n}`));
    }
  }
} else {
  console.log('[aviso] src/a1.js não encontrado — pulei a conferência de Previsão x Execução.');
}

// ---- 5. sintaxe dos blocos <script> do HTML final (pega bug tipo colchete/chave sobrando) ----
if (fs.existsSync(builtHtmlPath)) {
  const html = fs.readFileSync(builtHtmlPath, 'utf8');
  const blocos = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  let blocosOk = 0;
  blocos.forEach((b, i) => {
    try { new vm.Script(b[1], { filename: 'bloco' + i + '.js' }); blocosOk++; }
    catch (e) { fail(`bloco <script> #${i} do HTML gerado tem erro de sintaxe: ${e.message}`); }
  });
  if (blocosOk === blocos.length) pass(`sintaxe ok nos ${blocos.length} blocos <script> do HTML gerado`);
} else {
  console.log('[aviso] ' + builtHtmlPath + ' não existe ainda (rode rebuild2.py antes) — pulei a checagem de sintaxe.');
}

console.log(ok ? '\nRESULTADO: tudo bateu, nenhuma correção necessária.' : '\nRESULTADO: achei inconsistência(s) — ver [FALHA] acima antes de publicar.');
process.exit(ok ? 0 : 1);
