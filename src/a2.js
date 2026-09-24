/* ===== plugin de rótulos ===== */
function lum(hex){const c=hex.replace('#','');const r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  return (0.2126*r+0.7152*g+0.0722*b)/255;}
function fade(hex,on){ if(on) return hex;
  const c=hex.replace('#','');return 'rgba('+parseInt(c.substr(0,2),16)+','+parseInt(c.substr(2,2),16)+','+parseInt(c.substr(4,2),16)+',0.22)'; }
const DL={
  id:'dl',
  afterDatasetsDraw(ch){
    const o=ch.options.plugins&&ch.options.plugins.dl; if(o&&o.off) return;
    const cx=ch.ctx, horiz=ch.options.indexAxis==='y';
    const stacked=!!(ch.options.scales&&((ch.options.scales.x&&ch.options.scales.x.stacked)||(ch.options.scales.y&&ch.options.scales.y.stacked)));
    const tot=(o&&o.total)||0;
    cx.save(); cx.font='600 11px Inter, Segoe UI, Arial, sans-serif';
    ch.data.datasets.forEach((ds,di)=>{
      if(!ch.isDatasetVisible(di)) return;
      const meta=ch.getDatasetMeta(di);
      meta.data.forEach((el,i)=>{
        const v=ds.data[i]; if(v==null||v===0) return;
        let txt=nf(v); if(tot&&!stacked) txt=nf(v)+' ('+pct(v,tot).replace(',0%','%')+')';
        const bg=Array.isArray(ds.backgroundColor)?ds.backgroundColor[i]:ds.backgroundColor;
        const solid=typeof bg==='string'&&bg.charAt(0)==='#';
        if(meta.type==='line'||ch.config.type==='line'){
          cx.fillStyle=INK2; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(txt,el.x,el.y-7); return;
        }
        const p=el.getProps(['x','y','base','width','height'],true);
        if(horiz){
          const w=Math.abs(p.x-p.base);
          if(stacked){
            if(w<30) return;
            cx.fillStyle = solid&&lum(bg)<0.62 ? '#fff' : INK;
            cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(txt,(p.x+p.base)/2,p.y);
          } else {
            cx.fillStyle=INK2; cx.textAlign='left'; cx.textBaseline='middle'; cx.fillText(txt,p.x+6,p.y);
          }
        } else {
          const h=Math.abs(p.base-p.y);
          if(stacked){
            if(h<17) return;
            cx.fillStyle = solid&&lum(bg)<0.62 ? '#fff' : INK;
            cx.textAlign='center'; cx.textBaseline='middle'; cx.fillText(txt,p.x,(p.y+p.base)/2);
          } else {
            cx.fillStyle=INK2; cx.textAlign='center'; cx.textBaseline='bottom'; cx.fillText(txt,p.x,p.y-6);
          }
        }
      });
    });
    cx.restore();
  }
};
Chart.register(DL);
Chart.defaults.font.family="Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
Chart.defaults.font.size=12; Chart.defaults.color=INK2; Chart.defaults.maintainAspectRatio=false;
Chart.defaults.plugins.legend.labels.boxWidth=11; Chart.defaults.plugins.legend.labels.boxHeight=11;
Chart.defaults.plugins.tooltip.backgroundColor="#141C47"; Chart.defaults.plugins.tooltip.padding=10;
Chart.defaults.plugins.tooltip.cornerRadius=8;
Chart.defaults.layout = {padding:{right:74,top:18,left:2}};

const CH={};
const gx={grid:{color:LINE,drawTicks:false},border:{display:false},ticks:{precision:0}};
const gn={grid:{display:false},border:{display:false}};
function build(id,cfg,click){
  if(CH[id]) CH[id].destroy();
  const el=document.getElementById(id); if(!el) return;
  if(click){
    cfg.options=cfg.options||{};
    cfg.options.onClick=(e,els,ch)=>{ if(!els.length) return;
      const i=els[0].index,d=els[0].datasetIndex,add=!!(e.native&&(e.native.ctrlKey||e.native.metaKey));
      setTimeout(()=>click(i,d,add),0); };
    cfg.options.onHover=(e,els)=>{ e.native.target.style.cursor=els.length?'pointer':'default'; };
  }
  CH[id]=new Chart(el,cfg);
}
/* barra simples com destaque de seleção */
function bar(id,dim,labels,values,colors,opts){
  opts=opts||{};
  const sel=ST[dim]||[];
  const bgs=labels.map((l,i)=>fade(typeof colors==='string'?colors:colors[i], !sel.length||sel.includes(opts.key?opts.key(l,i):l)));
  const horiz=opts.vertical!==true;
  build(id,{type:'bar',data:{labels:labels.map(l=>opts.short?opts.short(l):l),
      datasets:[{data:values,backgroundColor:bgs,borderRadius:4,borderSkipped:false,borderColor:'#fff',borderWidth:2}]},
    options:{indexAxis:horiz?'y':'x',
      plugins:{legend:{display:false},dl:{total:opts.total||0},
        tooltip:{callbacks:{title:c=>labels[c[0].dataIndex],
          label:c=>nf(c.raw)+(opts.total?' cadastros ('+pct(c.raw,opts.total)+')':'')}}},
      scales: horiz?{x:{...gx,grace:'16%'},y:gn}:{y:{...gx,grace:'14%'},x:{...gn,ticks:{maxRotation:38,minRotation:0}}}}},
    (i,d,add)=>toggle(dim, opts.key?opts.key(labels[i],i):labels[i], add));
}
