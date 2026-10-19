/* Cartão da Premiação de Pastas — mesmo desenho no e-mail (PNG) e no artefato.
   cardSVG(s) recebe o retrato do dia e devolve um SVG 1200x800. */
function cardSVG(s) {
  var esc = function (t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var fmt = function (n, d) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var temas = {
    batida: { cor: '#15803d', suave: '#f0fdf4', barra: '#22c55e', selo: 'META BATIDA', frase: 'Prêmio liberado' },
    ritmo:  { cor: '#1d4ed8', suave: '#eff6ff', barra: '#2563eb', selo: 'NO RITMO',    frase: 'No ritmo para bater a meta' },
    atras:  { cor: '#b45309', suave: '#fffbeb', barra: '#f59e0b', selo: 'ABAIXO DO RITMO', frase: 'Abaixo do ritmo da meta' }
  };
  var t = temas[s.estado] || temas.atras;
  var ink = '#09090b', mute = '#6c6c75', line = '#e4e4e7', bg = '#f4f4f5', card = '#fafafa';
  var SORA = 'font-family="Sora, Inter, -apple-system, sans-serif"';
  var pct = Math.max(0, Math.min(1, s.total / s.meta));
  var R = 150, C = 2 * Math.PI * R;
  var sem = s.semana;
  var dd = function (iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; };

  var linha2;
  if (s.estado === 'batida') {
    linha2 = s.total - s.meta > 0 ? (s.total - s.meta) + ' acima da meta' : 'Meta atingida em cheio';
  } else {
    var resta = Math.max(sem.diasUteis - sem.diaUtil, 0);
    linha2 = 'Faltam ' + s.falta + ' pasta' + (s.falta === 1 ? '' : 's');
    if (resta > 0) linha2 += ' · ' + fmt(s.falta / resta, 1) + ' por dia útil nos ' + resta + ' dias que restam';
    else linha2 += ' · último dia útil da semana';
  }

  var o = [];
  o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" font-family="Inter, -apple-system, Segoe UI, Roboto, sans-serif">');
  o.push('<defs><filter id="rz" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="8" dy="8" stdDeviation="11" flood-color="#09090b" flood-opacity=".09"/><feDropShadow dx="-6" dy="-6" stdDeviation="8" flood-color="#ffffff" flood-opacity=".95"/></filter></defs>');
  o.push('<rect width="1200" height="800" fill="' + bg + '"/>');
  o.push('<rect x="32" y="32" width="1136" height="736" rx="24" fill="' + card + '" filter="url(#rz)"/>');
  // cabeçalho
  o.push('<text x="64" y="84" font-size="22" font-weight="700" fill="' + mute + '" letter-spacing="2.5">PREMIAÇÃO DE PASTAS · ALICERCE</text>');
  o.push('<text x="64" y="124" ' + SORA + ' font-size="28" font-weight="700" fill="' + ink + '">' + esc(sem.periodo) + ' · Semana ' + sem.numero + '  <tspan font-weight="500" fill="' + mute + '">' + dd(sem.de) + ' a ' + dd(sem.ate) + '</tspan></text>');
  o.push('<text x="1136" y="84" text-anchor="end" font-size="22" font-weight="500" fill="' + mute + '">' + dd(s.data) + ' · ' + esc(s.hora) + '</text>');
  o.push('<text x="1136" y="124" text-anchor="end" font-size="22" font-weight="500" fill="' + mute + '">dia útil ' + Math.min(sem.diaUtil, sem.diasUteis) + ' de ' + sem.diasUteis + '</text>');

  // anel de progresso
  var cx = 250, cy = 380;
  o.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + line + '" stroke-width="30"/>');
  if (sem.diaUtil < sem.diasUteis && s.estado !== 'batida') {
    var a = 2 * Math.PI * Math.min(1, s.esperado / s.meta) - Math.PI / 2;
    var x1 = cx + (R - 24) * Math.cos(a), y1 = cy + (R - 24) * Math.sin(a), x2 = cx + (R + 24) * Math.cos(a), y2 = cy + (R + 24) * Math.sin(a);
    o.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + ink + '" stroke-width="4" stroke-linecap="round" opacity=".55"/>');
  }
  o.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + t.barra + '" stroke-width="30" stroke-linecap="round" stroke-dasharray="' + (C * pct).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>');
  o.push('<text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle" ' + SORA + ' font-size="104" font-weight="800" fill="' + ink + '" letter-spacing="-3">' + s.total + '</text>');
  o.push('<text x="' + cx + '" y="' + (cy + 66) + '" text-anchor="middle" font-size="26" font-weight="500" fill="' + mute + '">de ' + s.meta + ' pastas</text>');

  // estado
  var sx = 470;
  var seloW = t.selo.length * 14.5 + 44;
  o.push('<rect x="' + sx + '" y="196" rx="22" width="' + seloW.toFixed(0) + '" height="44" fill="' + t.suave + '"/>');
  o.push('<text x="' + (sx + 22) + '" y="226" font-size="19" font-weight="700" fill="' + t.cor + '" letter-spacing="2">' + t.selo + '</text>');
  o.push('<text x="' + sx + '" y="300" ' + SORA + ' font-size="42" font-weight="700" fill="' + ink + '" letter-spacing="-1">' + esc(t.frase) + '</text>');
  o.push('<text x="' + sx + '" y="344" font-size="24" font-weight="500" fill="' + mute + '">' + esc(linha2) + '</text>');

  // ranking
  o.push('<text x="' + sx + '" y="410" font-size="18" font-weight="700" fill="' + mute + '" letter-spacing="2">QUEM LIDERA</text>');
  var top = (s.ranking || []).slice(0, 5);
  var maxP = Math.max(1, top.length ? top[0].pastas : 1);
  if (!top.length) o.push('<text x="' + sx + '" y="452" font-size="24" font-weight="500" fill="' + mute + '">Nenhuma pasta enviada na semana ainda.</text>');
  top.forEach(function (r, i) {
    var y = 424 + i * 47, w = 300 * r.pastas / maxP;
    var lider = r.pastas === maxP;
    o.push('<text x="' + sx + '" y="' + (y + 26) + '" font-size="22" font-weight="' + (lider ? 700 : 500) + '" fill="' + ink + '">' + esc(r.corretor.length > 22 ? r.corretor.slice(0, 21) + '…' : r.corretor) + '</text>');
    o.push('<text x="' + sx + '" y="' + (y + 44) + '" font-size="14" font-weight="500" fill="' + mute + '" letter-spacing="1">' + esc(r.equipe) + '</text>');
    o.push('<rect x="790" y="' + (y + 8) + '" rx="8" width="' + Math.max(w, 16).toFixed(0) + '" height="24" fill="' + (lider ? t.barra : '#d4d4d8') + '"/>');
    o.push('<text x="' + (790 + Math.max(w, 16) + 12).toFixed(0) + '" y="' + (y + 28) + '" ' + SORA + ' font-size="22" font-weight="700" fill="' + ink + '">' + r.pastas + '</text>');
  });
  if (s.empateNoTopo && top.length) o.push('<text x="' + sx + '" y="694" font-size="16" font-weight="500" fill="' + mute + '">Empate no 1º lugar: o app desempata pela qualidade e, depois, pelo carimbo.</text>');

  // rodapé: equipes
  var fx = 64, fy = 748;
  o.push('<line x1="64" y1="' + (fy - 34) + '" x2="1136" y2="' + (fy - 34) + '" stroke="' + line + '" stroke-width="2"/>');
  (s.porEquipe || []).filter(function (e) { return e.equipe !== '(sem equipe)'; }).forEach(function (e) {
    var label = e.equipe + '  ' + e.pastas;
    o.push('<text x="' + fx + '" y="' + fy + '" font-size="20" font-weight="700" fill="' + ink + '">' + esc(e.equipe) + ' <tspan font-weight="500" fill="' + mute + '">' + e.pastas + '</tspan></text>');
    fx += label.length * 12.5 + 40;
  });
  o.push('<text x="1136" y="' + fy + '" text-anchor="end" font-size="20" font-weight="500" fill="' + mute + '">Prêmio ' + esc(s.premio) + ' ao 1º se a Alicerce bater ' + s.meta + '</text>');
  o.push('</svg>');
  return o.join('');
}
if (typeof module !== 'undefined') module.exports = { cardSVG: cardSVG };
