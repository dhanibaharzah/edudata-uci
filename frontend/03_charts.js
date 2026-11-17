/* ============================================================
   HELPERS (chart rendering)
   ============================================================ */
function fmt(n, dec = 1) { return Number(n).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
function statusClass(value, target, higherBetter) {
  if (higherBetter) { if (value >= target) return 'status-good'; if (value >= target * 0.9) return 'status-warn'; return 'status-bad'; }
  else { if (value <= target) return 'status-good'; if (value <= target * 1.1) return 'status-warn'; return 'status-bad'; }
}
function barChart(items, { max, unit = '', formatter = fmt } = {}) {
  const maxVal = max || Math.max(...items.map(i => i.value));
  return `<div class="bar-chart">${items.map(item => `
    <div class="bar-row"><div class="bar-label">${item.label}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${(item.value/maxVal)*100}%;background:${item.color||'#3b82f6'}"></div></div>
    <div class="bar-value">${formatter(item.value)}${unit}</div></div>`).join('')}</div>`;
}
function lineChart(values, labels, { width=400, height=160, color='#1e40af', yMin, yMax } = {}) {
  if (!values.length) return '<div class="empty-state">Tidak ada data</div>';
  if (values.length === 1) return `<div style="padding:20px;text-align:center"><div style="font-size:32px;font-weight:700;color:${color}">${fmt(values[0],1)}</div><div class="text-sm text-muted">${labels[0]}</div></div>`;
  const pad={l:36,r:12,t:12,b:24}, w=width-pad.l-pad.r, h=height-pad.t-pad.b;
  const minV=yMin!==undefined?yMin:Math.min(...values), maxV=yMax!==undefined?yMax:Math.max(...values);
  const range=maxV-minV||1, stepX=w/(values.length-1);
  const pts=values.map((v,i)=>({x:pad.l+i*stepX,y:pad.t+h-((v-minV)/range)*h}));
  const path=pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const yTicks=[0,0.5,1].map(t=>{const v=minV+t*range,y=pad.t+h-t*h;
    return `<line class="grid-line" x1="${pad.l}" y1="${y}" x2="${width-pad.r}" y2="${y}"/><text class="axis-label" x="${pad.l-6}" y="${y+3}" text-anchor="end">${fmt(v,0)}</text>`;}).join('');
  const xLabels=pts.map((p,i)=>`<text class="axis-label" x="${p.x}" y="${height-6}" text-anchor="middle">${labels[i]||''}</text>`).join('');
  const area=`${path} L${pts[pts.length-1].x},${pad.t+h} L${pts[0].x},${pad.t+h} Z`;
  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" class="line-chart">${yTicks}<path d="${area}" fill="${color}" opacity="0.08"/><path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#fff" stroke="${color}" stroke-width="2"/>`).join('')}${xLabels}</svg>`;
}
function donutChart(segments) {
  const total=segments.reduce((s,x)=>s+x.value,0), r=45,cx=60,cy=60,circ=2*Math.PI*r;
  let offset=0;
  const arcs=segments.map(seg=>{const len=(seg.value/total)*circ;
    const arc=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="16" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset+=len; return arc;}).join('');
  return `<svg class="donut-svg" viewBox="0 0 120 120"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="16"/>${arcs}</svg>`;
}
function heatmap(metric, { invert=false, unit='', dec=1, dataSet, highlight=null } = {}) {
  const rows = dataSet || DATA.provinces;
  const values = rows.map(p=>p[metric]);
  const min=Math.min(...values), max=Math.max(...values);
  return `<div class="heatmap-grid">${rows.map(p=>{
    const v=p[metric], t=(v-min)/(max-min||1), score=invert?1-t:t;
    const r=Math.round(220-score*200), g=Math.round(50+score*130), b=Math.round(80-score*30);
    const isHi = highlight && p.name === highlight;
    return `<div class="heat-cell${isHi?' highlighted':''}" style="background:rgb(${r},${g},${b})" title="${p.name}: ${fmt(v,dec)}${unit}"><div class="heat-cell-name">${p.name}</div><div class="heat-cell-value">${fmt(v,dec)}${unit}</div></div>`;
  }).join('')}</div>`;
}
function heatmapProv(metric, opts = {}) { return heatmap(metric, { ...opts, highlight: STATE.provinsi === 'all' ? null : STATE.provinsi }); }
