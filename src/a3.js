/* ===== exportação ===== */
let DLNS=null;
(async()=>{ try{ if(window.claude&&typeof claude.use==='function') DLNS=await claude.use('downloads'); }catch(e){}
  if(DLNS) document.querySelectorAll('.xlsBtn,.chart-export').forEach(b=>b.remove()); })();
function dl(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
async function saveFile(name,data,mime){
  if(DLNS){
    try{ await DLNS.save({filename:name,data}); }
    catch(e){ const c=e&&e.code;
      if(c==='declined'||c==='rate_limited') return;
      alert('Não foi possível salvar o arquivo neste ambiente'+(e&&e.message?': '+e.message:'.')); }
    return;
  }
  dl(new Blob([data],{type:mime||'application/octet-stream'}),name);
}
function stamp(){const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');}
function grab(id){
  const t=document.getElementById(id); if(!t) return {head:[],rows:[]};
  const head=[...t.querySelectorAll('thead th')].map(th=>th.textContent.replace(/[↕↑↓]/g,'').trim());
  const rows=[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>
    (td.innerText||td.textContent||'').trim().replace(/\s*\n+\s*/g,' · ').replace(/[ \t]+/g,' ')));
  return {head,rows};
}
function filtersText(){
  const out=[];
  DIMS.forEach(d=>{ if(ST[d].length) out.push(DIMLABEL[d]+': '+ST[d].join(', ')); });
  if(ST.tagMode==='none') out.push('Somente cadastros sem tag');
  else if(ST.tag.length&&ST.tagMode==='and') out.push('Tags combinadas com E');
  const q=document.getElementById('q'); if(q&&q.value.trim()) out.push('Busca: "'+q.value.trim()+'"');
  return out.length?out.join('  |  '):'Sem filtros — base completa';
}
function expCSV(id,name){
  const {head,rows}=grab(id);
  const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const csv=[head.map(q).join(';')].concat(rows.map(r=>r.map(q).join(';'))).join('\r\n');
  saveFile('nexo_funil_pasta_'+name+'_'+stamp()+'.csv','\ufeff'+csv,'text/csv;charset=utf-8');
}
/* --- xlsx mínimo (zip store + OOXML) --- */
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRCT[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipStore(files){
  const enc=new TextEncoder(),parts=[],cen=[];let off=0;
  files.forEach(f=>{
    const nm=enc.encode(f.name),d=f.data,crc=crc32(d);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint32(14,crc,true);
    lh.setUint32(18,d.length,true);lh.setUint32(22,d.length,true);lh.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(lh.buffer),nm,d);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);
    ch.setUint32(16,crc,true);ch.setUint32(20,d.length,true);ch.setUint32(24,d.length,true);
    ch.setUint16(28,nm.length,true);ch.setUint32(42,off,true);
    cen.push(new Uint8Array(ch.buffer),nm);
    off+=30+nm.length+d.length;
  });
  const cs=cen.reduce((a,b)=>a+b.length,0);
  const eo=new DataView(new ArrayBuffer(22));
  eo.setUint32(0,0x06054b50,true);eo.setUint16(8,files.length,true);eo.setUint16(10,files.length,true);
  eo.setUint32(12,cs,true);eo.setUint32(16,off,true);
  const all=parts.concat(cen,[new Uint8Array(eo.buffer)]);
  const total=all.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let p=0;
  all.forEach(b=>{out.set(b,p);p+=b.length;});
  return out;
}
function expXLSX(id,name,title){
  const {head,rows}=grab(id);
  const enc=new TextEncoder(),E=s=>enc.encode(s);
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
  const cell=(c,r,v,st)=>{
    const num = v!=='' && !isNaN(String(v).replace(/\./g,'').replace(',','.')) && /^-?[\d.,]+$/.test(String(v));
    if(num) return `<c r="${col(c)}${r}"${st?' s="1"':''}><v>${String(v).replace(/\./g,'').replace(',','.')}</v></c>`;
    return `<c r="${col(c)}${r}" t="inlineStr"${st?' s="1"':''}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };
  let sd='<row r="1" ht="20" customHeight="1">'+head.map((h,i)=>cell(i,1,h,1)).join('')+'</row>';
  rows.forEach((r,ri)=>{ sd+=`<row r="${ri+2}">`+r.map((v,i)=>cell(i,ri+2,v,0)).join('')+'</row>'; });
  const widths=head.map((h,i)=>{const m=Math.max(h.length,...rows.map(r=>String(r[i]||'').length));
    return `<col min="${i+1}" max="${i+1}" width="${Math.min(48,Math.max(9,m+3))}" customWidth="1"/>`;}).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths}</cols><sheetData>${sd}</sheetData><autoFilter ref="A1:${col(head.length-1)}${rows.length+1}"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A66"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`;
  const files=[
   {name:'[Content_Types].xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')},
   {name:'_rels/.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
   {name:'xl/workbook.xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+esc((title||'Dados').slice(0,28))+'" sheetId="1" r:id="rId1"/></sheets></workbook>')},
   {name:'xl/_rels/workbook.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')},
   {name:'xl/styles.xml',data:E(styles)},
   {name:'xl/worksheets/sheet1.xml',data:E(sheet)}
  ];
  saveFile('nexo_funil_pasta_'+name+'_'+stamp()+'.xlsx',zipStore(files),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function expPDF(id,name,title){
  const {head,rows}=grab(id);
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'pt',format:'a4'});
  const W=doc.internal.pageSize.getWidth();
  try{ doc.addImage('data:image/png;base64,'+LOGO,'PNG',36,20,104,52); }catch(e){}
  doc.setTextColor(31,42,102); doc.setFont('helvetica','bold'); doc.setFontSize(14);
  doc.text(title,152,40);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(90,90,100);
  doc.text(doc.splitTextToSize('Filtros: '+filtersText(),W-190),152,54);
  doc.text('Fonte: CRM Imobmeet — Funil de Pasta · extração '+HOJE,152,70);
  doc.autoTable({head:[head],body:rows,startY:86,margin:{left:36,right:36},
    styles:{fontSize:7,cellPadding:3,overflow:'linebreak',textColor:[20,20,20]},
    headStyles:{fillColor:[31,42,102],textColor:255,fontSize:7,fontStyle:'bold'},
    alternateRowStyles:{fillColor:[250,251,253]},
    didDrawPage:d=>{ const p=doc.internal.getNumberOfPages(), h=doc.internal.pageSize.getHeight();
      doc.setFontSize(7); doc.setTextColor(120,120,130);
      doc.text('Nexo Gestão Imobiliária · gerado em '+new Date().toLocaleString('pt-BR'),36,h-16);
      doc.text('Página '+p,W-70,h-16); }});
  if(DLNS) saveFile('nexo_funil_pasta_'+name+'_'+stamp()+'.pdf',doc.output('arraybuffer'),'application/pdf');
  else doc.save('nexo_funil_pasta_'+name+'_'+stamp()+'.pdf');
}
/* --- exportação de gráfico para Excel (com logo e rodapé de origem) --- */
const CHART_META={
  cEtapa:{dim:'Etapa'}, cMes:{dim:'Mês'}, cTempo:{dim:'Data'},
  cPgto:{dim:'Tag'}, cStack:{dim:'Etapa'}, cPix:{dim:'Etapa'},
  cImob:{dim:'Imobiliária'}, cGer:{dim:'Gerente'}, cCorr:{dim:'Corretor'}, cOrigem:{dim:'Origem'},
  cRenda:{dim:'Faixa de renda'}, cFin:{dim:'Finalidade'}, cQual:{dim:'Indicador'}, cGerCorr:{dim:'Corretor'},
  t3Imob:{dim:'Imobiliária'}, t3Eq:{dim:'Equipe'}, t3Ger:{dim:'Gerente'}, t3Corr:{dim:'Corretor'}, t3Cli:{dim:'Cliente'},
  cPrevImob:{dim:'Imobiliária'}, cPrev2Imob:{dim:'Imobiliária'}
};
function chartRows(id){
  const ch=CH[id]; if(!ch) return {head:[],rows:[]};
  const meta=CHART_META[id]||{dim:'Categoria'};
  const labels=ch.data.labels.map(l=>Array.isArray(l)?l.join(' '):String(l));
  const dss=ch.data.datasets||[];
  if(dss.length<=1){
    const d=dss[0]?dss[0].data:[];
    return {head:[meta.dim,'Valor'], rows:labels.map((l,i)=>[l, d[i]==null?0:d[i]])};
  }
  return {head:[meta.dim, ...dss.map(d=>d.label)], rows:labels.map((l,i)=>[l, ...dss.map(d=>d.data[i]==null?0:d.data[i])])};
}
function b64ToBytes(b64){ return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }
const ACCENT_MAP={'a':'áàãâä','e':'éèêë','i':'íìîï','o':'óòõôö','u':'úùûü','c':'ç','n':'ñ'};
const UNACCENT={}; Object.keys(ACCENT_MAP).forEach(plain=>{ ACCENT_MAP[plain].split('').forEach(acc=>{ UNACCENT[acc]=plain; UNACCENT[acc.toUpperCase()]=plain; }); });
function slug(s){ return String(s).split('').map(c=>UNACCENT[c]||c).join('').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,''); }
function expChartXLSX(canvasId, chartTitle){
  const {head,rows}=chartRows(canvasId);
  if(!head.length || !rows.length){
    const b=document.querySelector(`.chart-export[data-chart="${canvasId}"]`);
    if(b && !b.dataset.busy){ b.dataset.busy='1'; const old=b.textContent; b.textContent='Sem dados para exportar';
      setTimeout(()=>{ b.textContent=old; delete b.dataset.busy; },2200); }
    return;
  }
  const enc=new TextEncoder(), E=s=>enc.encode(s);
  const col=n=>{let s='';n++;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-m-1)/26;}return s;};
  const cell=(c,r,v,st)=>{
    const num = v!=='' && v!=null && !isNaN(String(v).replace(/\./g,'').replace(',','.')) && /^-?[\d.,]+$/.test(String(v));
    if(num) return `<c r="${col(c)}${r}"${st?` s="${st}"`:''}><v>${String(v).replace(/\./g,'').replace(',','.')}</v></c>`;
    return `<c r="${col(c)}${r}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${esc(v==null?'':v)}</t></is></c>`;
  };
  const tabEntry=TABS.find(([k])=>k===TAB); const tabLabel=tabEntry?tabEntry[1]:TAB;
  const now=new Date().toLocaleString('pt-BR');
  let r=1, sd='';
  sd+=`<row r="${r}">`+cell(2,r,'Nexo Gestão Imobiliária',2)+'</row>'; r++;
  sd+=`<row r="${r}">`+cell(2,r,'Painel do Funil de Pasta',3)+'</row>'; r++;
  r+=2;
  sd+=`<row r="${r}">`+cell(0,r,chartTitle,2)+'</row>'; r++;
  const headerRow=r;
  sd+=`<row r="${r}" ht="20" customHeight="1">`+head.map((h,i)=>cell(i,r,h,1)).join('')+'</row>'; r++;
  rows.forEach(row=>{ sd+=`<row r="${r}">`+row.map((v,i)=>cell(i,r,v,0)).join('')+'</row>'; r++; });
  r++;
  const origem=`Fonte: Painel do Funil de Pasta — Nexo Gestão Imobiliária  ·  Aba: ${tabLabel}  ·  Gráfico: ${chartTitle}  ·  Gerado em: ${now}`;
  sd+=`<row r="${r}">`+cell(0,r,origem,3)+'</row>';
  const widths=head.map((h,i)=>{const m=Math.max(String(h).length,...rows.map(rr=>String(rr[i]==null?'':rr[i]).length));
    return `<col min="${i+1}" max="${i+1}" width="${Math.min(48,Math.max(10,m+3))}" customWidth="1"/>`;}).join('');
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><cols>${widths}</cols><sheetData>${sd}</sheetData><autoFilter ref="A${headerRow}:${col(head.length-1)}${headerRow}"/><drawing r:id="rId1"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF1F2A66"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF7B7B86"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F2A66"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf xfId="0" fontId="2" applyFont="1"/><xf xfId="0" fontId="3" applyFont="1"/></cellXfs></styleSheet>`;
  const drawing=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>19050</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from><xdr:ext cx="1257300" cy="628650"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo Nexo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1257300" cy="628650"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
  let logoBytes; try{ logoBytes=b64ToBytes(LOGO); }catch(e){ logoBytes=new Uint8Array(0); }
  const files=[
   {name:'[Content_Types].xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>')},
   {name:'_rels/.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')},
   {name:'xl/workbook.xml',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+esc((chartTitle||'Grafico').slice(0,28))+'" sheetId="1" r:id="rId1"/></sheets></workbook>')},
   {name:'xl/_rels/workbook.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')},
   {name:'xl/styles.xml',data:E(styles)},
   {name:'xl/worksheets/sheet1.xml',data:E(sheet)},
   {name:'xl/worksheets/_rels/sheet1.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>')},
   {name:'xl/drawings/drawing1.xml',data:E(drawing)},
   {name:'xl/drawings/_rels/drawing1.xml.rels',data:E('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>')},
   {name:'xl/media/image1.png',data:logoBytes}
  ];
  saveFile('nexo_grafico_'+slug(chartTitle)+'_'+stamp()+'.xlsx',zipStore(files),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function mountChartExports(){
  document.querySelectorAll('.chart-export').forEach(b=>{
    if(b.dataset.ready) return; b.dataset.ready='1';
    b.title='Exportar os dados deste gráfico em Excel, com logo e rodapé de origem';
    b.onclick=()=>expChartXLSX(b.dataset.chart, b.dataset.title);
  });
}
function mountBars(){
  document.querySelectorAll('.tbar').forEach(b=>{
    if(b.dataset.ready) return; b.dataset.ready='1';
    const sp=document.createElement('span'); sp.className='sp'; b.appendChild(sp);
    const D=()=>[b.dataset.table,b.dataset.name,b.dataset.title];
    [['CSV',()=>{const[i,n]=D();expCSV(i,n);}],['Excel',()=>{const[i,n,t]=D();expXLSX(i,n,t);}],
     ['PDF',()=>{const[i,n,t]=D();expPDF(i,n,t);}]].forEach(([l,fn])=>{
      if(l==='Excel'&&DLNS) return;
      const btn=document.createElement('button'); btn.className='btn sec xs'+(l==='Excel'?' xlsBtn':''); btn.textContent=l;
      btn.title='Exportar a tabela como '+l+' respeitando os filtros atuais';
      btn.onclick=fn; b.appendChild(btn);
    });
  });
}
