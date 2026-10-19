/* Artes da Premiação de Pastas — padrão de anúncio (dourado/troféu).
   arteSemana(doc, ehDia, op) -> SVG 1080x1350 (story/feed 4:5)
   arteResumo(periodo, semanas, dia, op) -> SVG 1920x1080 (16:9)
   op.fundos: { 'campeao','nao','parcial','aguardando','podio','podio-piratas', ... 'resumo' } -> data URL da biblioteca.
   Sem imagem na biblioteca, o fundo vetorial abaixo é usado. Texto e números SEMPRE saem daqui, nunca da imagem. */
(function (g) {
  var R = g.ARTE_RECURSOS || { fontes: '', img: {} };
  var ORDEM = ['PIRATAS', 'HINENI', 'CHAVE MESTRA', 'SIAO'];
  var COR_EQ = { 'PIRATAS': '#ff3b30', 'HINENI': '#5b8cff', 'CHAVE MESTRA': '#ffe600', 'SIAO': '#e6e6e6' };
  var IMG_EQ = { 'PIRATAS': 'piratas', 'HINENI': 'hineni', 'CHAVE MESTRA': 'chave-mestra', 'SIAO': 'siao' };
  var NOME_EQ = { 'PIRATAS': 'PIRATAS', 'HINENI': 'HINENI', 'CHAVE MESTRA': 'CHAVE MESTRA', 'SIAO': 'SIÃO' };
  var VERDE = '#3bd07a', VERM = '#ff4d45', AZUL = '#38d3f5', OURO = '#ffc24a', BRANCO = '#f7f3ea', CINZA = '#b9b1a1';
  var D = "font-family=\"'OswaldA', Oswald, 'Arial Narrow', Arial, sans-serif\"";
  var T = "font-family=\"'InterA', Inter, Arial, sans-serif\"";

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function chave(eq) { return String(eq || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
  function dd(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : iso; }
  function brl(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }); }
  function rng(seed) { var x = seed % 2147483647; if (x <= 0) x += 2147483646; return function () { x = x * 16807 % 2147483647; return (x - 1) / 2147483646; }; }

  /* ---------- dados: um formato só para dia (semana em curso) e semana fechada ---------- */
  function dados(doc, ehDia) {
    var sem = ehDia ? doc.semana : doc;
    var meta = doc.meta, total = ehDia ? doc.total : (doc.totalApp != null ? doc.totalApp : doc.total);
    var top = (ehDia ? doc.ranking : doc.top) || [];
    var tipo;
    if (ehDia) tipo = 'parcial';
    else if (!doc.metaBatida) tipo = 'nao';
    else if (doc.fonte === 'app' && doc.vencedor) tipo = 'campeao';
    else tipo = 'aguardando';
    // posições: empate repete a posição; na semana apurada o vencedor do app vem primeiro e é o único 1º
    var pos = [], ult = null, p = 0;
    top.slice(0, 3).forEach(function (r, i) {
      if (tipo === 'campeao') p = i === 0 ? 1 : (r.pastas === ult && i > 1 ? p : i + 1);
      else p = (r.pastas === ult) ? p : i + 1;
      ult = r.pastas; pos.push({ pos: p, nome: r.corretor, equipe: chave(r.equipe), pastas: r.pastas });
    });
    var porEq = {}; (doc.porEquipe || []).forEach(function (e) { porEq[chave(e.equipe)] = e.pastas; });
    var eqs = pos.map(function (r) { return r.equipe; });
    var unica = pos.length === 3 && eqs[0] === eqs[1] && eqs[1] === eqs[2] && COR_EQ[eqs[0]] ? eqs[0] : null;
    return {
      tipo: tipo, numero: sem.numero, periodo: sem.periodo, de: sem.de, ate: sem.ate,
      total: total, meta: meta, falta: Math.max(meta - total, 0), premio: doc.premio,
      top3: pos, porEquipe: porEq, equipeUnica: unica,
      vencedor: tipo === 'campeao' ? doc.vencedor : null,
      vencedorEquipe: tipo === 'campeao' && pos[0] ? pos[0].equipe : null,
      estado: ehDia ? doc.estado : null, diaUtil: ehDia ? sem.diaUtil : null, diasUteis: sem.diasUteis,
      atualizado: ehDia ? dd(doc.data) + ' às ' + doc.hora : null
    };
  }

  /* ---------- peças comuns ---------- */
  function defs() {
    return '<defs><style>' + R.fontes + '</style>' +
      '<linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d2"/><stop offset=".42" stop-color="#ffd36a"/><stop offset=".7" stop-color="#c8902c"/><stop offset="1" stop-color="#f3c862"/></linearGradient>' +
      '<linearGradient id="ouroH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd36a" stop-opacity="0"/><stop offset=".5" stop-color="#ffd36a"/><stop offset="1" stop-color="#ffd36a" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="prata" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9ccd3"/><stop offset="1" stop-color="#8d929c"/></linearGradient>' +
      '<linearGradient id="bronze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd2a6"/><stop offset=".5" stop-color="#c9884e"/><stop offset="1" stop-color="#8a5326"/></linearGradient>' +
      '<linearGradient id="painel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d160b" stop-opacity=".92"/><stop offset="1" stop-color="#090705" stop-opacity=".94"/></linearGradient>' +
      '<radialGradient id="fundoR" cx=".5" cy=".28" r=".85"><stop offset="0" stop-color="#4a3410"/><stop offset=".45" stop-color="#170f06"/><stop offset="1" stop-color="#050403"/></radialGradient>' +
      '<filter id="brilho" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="sombra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".75"/></filter>' +
      '<filter id="desfoca"><feGaussianBlur stdDeviation="3"/></filter>' +
      '</defs>';
  }
  function fundoVetor(W, H, seed, tom) {
    var o = ['<rect width="' + W + '" height="' + H + '" fill="url(#fundoR)"/>'];
    // feixes de luz das quinas
    o.push('<g opacity=".22"><polygon points="0,0 ' + (W * .28) + ',0 ' + (W * .62) + ',' + H + ' ' + (W * .48) + ',' + H + '" fill="url(#ouro)"/>' +
      '<polygon points="' + W + ',0 ' + (W * .72) + ',0 ' + (W * .38) + ',' + H + ' ' + (W * .52) + ',' + H + '" fill="url(#ouro)"/></g>');
    var r = rng(seed || 7), k;
    o.push('<g filter="url(#desfoca)">');
    for (k = 0; k < 70; k++) {
      var x = r() * W, y = H * (.35 + r() * .65), rad = 2 + r() * 14;
      o.push('<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="' + rad.toFixed(1) + '" fill="' + (tom || '#ffc85a') + '" opacity="' + (.06 + r() * .32).toFixed(2) + '"/>');
    }
    o.push('</g><rect width="' + W + '" height="' + H + '" fill="#000" opacity=".18"/>');
    return o.join('');
  }
  function fundo(W, H, chaveFundo, op, seed, tom) {
    var u = op && op.fundos && op.fundos[chaveFundo];
    if (u) return '<image href="' + u + '" x="0" y="0" width="' + W + '" height="' + H + '" preserveAspectRatio="xMidYMid slice"/><rect width="' + W + '" height="' + H + '" fill="#000" opacity=".12"/>';
    return fundoVetor(W, H, seed, tom);
  }
  function painel(x, y, w, h, cor) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="26" fill="url(#painel)" stroke="' + (cor || 'url(#ouro)') + '" stroke-width="3" filter="url(#sombra)"/>' +
      '<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (w - 16) + '" height="' + (h - 16) + '" rx="20" fill="none" stroke="#ffd36a" stroke-opacity=".18" stroke-width="1.5"/>';
  }
  function filete(cx, y, w, rotulo, cor) {
    var tw = rotulo.length * 17 + 40;
    return '<line x1="' + (cx - w / 2) + '" y1="' + y + '" x2="' + (cx - tw / 2) + '" y2="' + y + '" stroke="url(#ouroH)" stroke-width="2"/>' +
      '<line x1="' + (cx + tw / 2) + '" y1="' + y + '" x2="' + (cx + w / 2) + '" y2="' + y + '" stroke="url(#ouroH)" stroke-width="2"/>' +
      '<text x="' + cx + '" y="' + (y + 11) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="32" letter-spacing="2" fill="' + (cor || OURO) + '">' + esc(rotulo) + '</text>';
  }
  function medalha(cx, cy, pos) {
    var g = pos === 1 ? 'ouro' : pos === 2 ? 'prata' : 'bronze';
    return '<circle cx="' + cx + '" cy="' + cy + '" r="31" fill="#0b0805" stroke="url(#' + g + ')" stroke-width="6"/>' +
      '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="34" fill="url(#' + g + ')">' + pos + 'º</text>';
  }
  function escudo(eq, x, y, s) {
    var k = IMG_EQ[eq]; if (!k || !R.img[k]) return '';
    return '<image href="' + R.img[k] + '" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '"/>';
  }
  function cabe(nome, max) { nome = String(nome || ''); return nome.length > max ? nome.slice(0, max - 1) + '…' : nome; }
  function selo(x, y, txt, cor) {
    var w = txt.length * 19 + 44;
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="52" rx="12" fill="' + cor + '" fill-opacity=".16" stroke="' + cor + '" stroke-width="2.5"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 38) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="32" letter-spacing="1.5" fill="' + cor + '">' + esc(txt) + '</text>';
  }

  /* ---------- arte da semana 1080x1350 ---------- */
  function arteSemana(doc, ehDia, op) {
    var d = dados(doc, ehDia), W = 1080, H = 1350, o = [];
    var chaveFundo = d.equipeUnica ? 'podio-' + IMG_EQ[d.equipeUnica] : d.tipo;
    o.push('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + defs());
    o.push(fundo(W, H, chaveFundo, op, d.numero * 31 + 5, d.tipo === 'nao' ? '#ff8a5a' : null));
    // topo
    if (R.img.marca) o.push('<image href="' + R.img.marca + '" x="502" y="34" width="76" height="76" opacity=".95"/>');
    o.push('<line x1="60" y1="72" x2="460" y2="72" stroke="url(#ouroH)" stroke-width="2"/><line x1="620" y1="72" x2="1020" y2="72" stroke="url(#ouroH)" stroke-width="2"/>');
    o.push('<text x="540" y="200" text-anchor="middle" ' + D + ' font-weight="700" font-size="84" letter-spacing="1" fill="url(#ouro)" filter="url(#sombra)">PREMIAÇÃO DA SEMANA ' + d.numero + '</text>');
    var est = d.tipo === 'parcial' ? ['PARCIAL', AZUL] : d.tipo === 'nao' ? ['ENCERRADA', VERM] : d.tipo === 'aguardando' ? ['EM APURAÇÃO', OURO] : ['ENCERRADA', VERDE];
    var sub = esc(d.periodo) + ' · ' + dd(d.de) + ' a ' + dd(d.ate) + ' · ';
    o.push('<text x="540" y="262" text-anchor="middle" ' + D + ' font-weight="500" font-size="38" fill="' + BRANCO + '">' + sub + '<tspan font-weight="700" fill="' + est[1] + '">' + est[0] + '</tspan></text>');

    // destaque
    var px = 80, py = 300, pw = 920, ph = 390;
    o.push(painel(px, py, pw, ph));
    if (d.tipo === 'campeao') {
      var eqV = d.vencedorEquipe;
      var temEsc = !!escudo(eqV, 0, 0, 1);
      if (temEsc) o.push(escudo(eqV, px + 30, py + 60, 280));
      var tx = temEsc ? px + 340 : px + 60;
      o.push('<text x="' + tx + '" y="' + (py + 78) + '" ' + D + ' font-weight="600" font-size="30" letter-spacing="3" fill="' + OURO + '">1º LUGAR DA SEMANA</text>');
      var nm = String(d.vencedor).toUpperCase(), fs = nm.length > 16 ? 58 : 72;
      o.push('<text x="' + tx + '" y="' + (py + 160) + '" ' + D + ' font-weight="700" font-size="' + fs + '" fill="' + BRANCO + '" filter="url(#sombra)">' + esc(cabe(nm, 22)) + '</text>');
      o.push('<text x="' + tx + '" y="' + (py + 206) + '" ' + D + ' font-weight="600" font-size="30" letter-spacing="2" fill="' + (COR_EQ[eqV] || CINZA) + '">' + esc(NOME_EQ[eqV] || eqV || '') + ' · ' + (d.top3[0] ? d.top3[0].pastas : '') + ' PASTAS</text>');
      o.push('<text x="' + tx + '" y="' + (py + 280) + '" ' + D + ' font-weight="500" font-size="40" fill="' + BRANCO + '">Alicerce: <tspan font-weight="700" fill="' + VERDE + '">' + d.total + '</tspan> de ' + d.meta + ' <tspan fill="' + VERDE + '">✔</tspan></text>');
      o.push('<text x="' + tx + '" y="' + (py + 356) + '" ' + D + ' font-weight="500" font-size="40" fill="' + BRANCO + '">Prêmio: <tspan font-weight="700" font-size="64" fill="url(#ouro)">' + esc(d.premio) + '</tspan></text>');
    } else {
      var rot = d.tipo === 'parcial' ? 'A ALICERCE ATÉ AGORA' : 'A ALICERCE FEZ';
      var corN = d.tipo === 'nao' ? VERM : d.tipo === 'parcial' ? (d.estado === 'atras' ? VERM : VERDE) : VERDE;
      o.push('<text x="540" y="' + (py + 74) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="38" letter-spacing="3" fill="' + OURO + '">' + rot + '</text>');
      o.push('<text x="540" y="' + (py + 230) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="170" filter="url(#sombra)"><tspan fill="' + corN + '">' + d.total + '</tspan><tspan fill="' + BRANCO + '">/' + d.meta + '</tspan></text>');
      var l1, l2, l2c = CINZA;
      if (d.tipo === 'nao') { l1 = 'Faltaram ' + d.falta + ' pastas para o prêmio liberar'; }
      else if (d.tipo === 'aguardando') { l1 = 'Meta batida! O 1º lugar sai na apuração do app'; }
      else if (d.total >= d.meta) { l1 = 'Meta já batida — o prêmio confirma quando a semana fechar'; }
      else {
        var resta = Math.max((d.diasUteis || 5) - (d.diaUtil || 0), 0);
        l1 = 'Faltam ' + d.falta + ' pastas' + (resta ? ' · ' + resta + (resta === 1 ? ' dia útil' : ' dias úteis') + ' pela frente' : ' · último dia útil');
      }
      o.push('<text x="540" y="' + (py + 292) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="38" fill="' + (d.tipo === 'nao' ? VERM : d.tipo === 'aguardando' ? VERDE : BRANCO) + '">' + esc(l1) + '</text>');
      if (d.tipo === 'nao') o.push(selo(540 - (('PRÊMIO NÃO LIBERADO'.length * 19 + 44) / 2), py + 318, 'PRÊMIO NÃO LIBERADO', VERM));
      else if (d.tipo === 'parcial') {
        var lid = d.top3.filter(function (r) { return r.pos === 1; });
        var tl = lid.length ? 'Líder até agora: ' + lid.map(function (r) { return r.nome; }).join(' e ') + ' (' + lid[0].pastas + ')' : 'Ninguém pontuou ainda';
        o.push('<text x="540" y="' + (py + 356) + '" text-anchor="middle" ' + D + ' font-weight="500" font-size="34" fill="' + AZUL + '">' + esc(cabe(tl, 52)) + '</text>');
      } else {
        o.push('<text x="540" y="' + (py + 356) + '" text-anchor="middle" ' + D + ' font-weight="500" font-size="34" fill="' + CINZA + '">Prêmio da semana: <tspan fill="url(#ouro)" font-weight="700">' + esc(d.premio) + '</tspan></text>');
      }
    }

    // top 3
    var ty = 742;
    var unica = d.equipeUnica;
    o.push(filete(540, ty, 860, unica ? 'TOP 3 · PÓDIO 100% ' + NOME_EQ[unica] : 'TOP 3', unica ? COR_EQ[unica] : OURO));
    var rw = unica ? 700 : 920, rx0 = 80;
    if (!d.top3.length) o.push('<text x="540" y="' + (ty + 110) + '" text-anchor="middle" ' + D + ' font-size="38" fill="' + CINZA + '">Nenhuma pasta enviada ainda.</text>');
    d.top3.forEach(function (r, i) {
      var y = ty + 34 + i * 92, g = r.pos === 1 ? 'ouro' : r.pos === 2 ? 'prata' : 'bronze';
      o.push('<rect x="' + rx0 + '" y="' + y + '" width="' + rw + '" height="78" rx="18" fill="url(#painel)" stroke="url(#' + g + ')" stroke-width="2.5"/>');
      if (unica) o.push('<rect x="' + rx0 + '" y="' + (y + 14) + '" width="5" height="50" rx="2" fill="' + COR_EQ[unica] + '"/>');
      o.push(medalha(rx0 + 56, y + 39, r.pos));
      o.push('<text x="' + (rx0 + 112) + '" y="' + (y + 52) + '" ' + D + ' font-weight="600" font-size="40" fill="' + BRANCO + '">' + esc(cabe(String(r.nome).toUpperCase(), unica ? 20 : 26)) + '</text>');
      if (!unica && COR_EQ[r.equipe]) o.push('<text x="' + (rx0 + rw - 120) + '" y="' + (y + 50) + '" text-anchor="end" ' + D + ' font-weight="600" font-size="24" letter-spacing="1.5" fill="' + COR_EQ[r.equipe] + '">' + esc(NOME_EQ[r.equipe]) + '</text>');
      o.push('<text x="' + (rx0 + rw - 34) + '" y="' + (y + 56) + '" text-anchor="end" ' + D + ' font-weight="700" font-size="50" fill="url(#ouro)">' + r.pastas + '</text>');
    });
    if (unica) {
      var seloImg = R.img['selo-' + IMG_EQ[unica]];
      o.push(seloImg ? '<image href="' + seloImg + '" x="784" y="' + (ty + 26) + '" width="242" height="242" preserveAspectRatio="xMidYMid meet"/>' : escudo(unica, 790, ty + 30, 230));
    }

    // por equipe
    var ey = 1074;
    o.push(filete(540, ey, 860, 'POR EQUIPE'));
    ORDEM.forEach(function (eq, i) {
      var cx = 80 + 115 + i * 230;
      o.push(escudo(eq, cx - 112, ey + 24, 92));
      o.push('<text x="' + (cx - 14) + '" y="' + (ey + 70) + '" ' + D + ' font-weight="700" font-size="48" fill="' + BRANCO + '">' + (d.porEquipe[eq] || 0) + '</text>');
      o.push('<text x="' + (cx - 14) + '" y="' + (ey + 100) + '" ' + D + ' font-weight="600" font-size="19" fill="' + COR_EQ[eq] + '">' + NOME_EQ[eq] + '</text>');
    });

    // rodapé
    var fy = 1236, msg, msg2 = 'O prêmio só libera se a Alicerce inteira bater ' + d.meta + ' pastas na semana.';
    if (d.tipo === 'campeao') msg = 'A ALICERCE FEZ ' + d.total + ' DE ' + d.meta + '. META BATIDA, PRÊMIO LIBERADO!';
    else if (d.tipo === 'nao') msg = 'Semana encerrada. O prêmio não foi liberado nesta semana.';
    else if (d.tipo === 'aguardando') msg = 'Semana encerrada com a meta batida. Vencedor após a apuração.';
    else msg = 'Parcial de ' + d.atualizado + '. A semana fecha em ' + dd(d.ate) + '.';
    o.push('<rect x="40" y="' + fy + '" width="1000" height="88" rx="18" fill="url(#painel)" stroke="url(#ouro)" stroke-width="2.5"/>');
    o.push('<text x="540" y="' + (fy + 40) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="31" fill="' + (d.tipo === 'campeao' ? OURO : d.tipo === 'nao' ? VERM : d.tipo === 'parcial' ? AZUL : VERDE) + '">' + esc(msg) + '</text>');
    o.push('<text x="540" y="' + (fy + 72) + '" text-anchor="middle" ' + T + ' font-weight="500" font-size="20" fill="' + CINZA + '">' + esc(msg2) + '</text>');
    o.push('</svg>');
    return o.join('');
  }

  /* ---------- resumo do período 1920x1080 ---------- */
  function arteResumo(nomePeriodo, semanas, dia, op) {
    var W = 1920, H = 1080, o = [];
    var lista = semanas.slice().sort(function (a, b) { return a.de < b.de ? -1 : 1; }).map(function (s) { return dados(s, false); });
    if (dia && dia.semana && dia.semana.periodo === nomePeriodo) lista.push(dados(dia, true));
    var fechadas = lista.filter(function (x) { return x.tipo !== 'parcial'; });
    var batidas = fechadas.filter(function (x) { return x.tipo === 'campeao' || x.tipo === 'aguardando'; }).length;
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + defs());
    o.push(fundo(W, H, 'resumo', op, 99));
    if (R.img.marca) o.push('<image href="' + R.img.marca + '" x="920" y="28" width="80" height="80"/>');
    o.push('<text x="960" y="186" text-anchor="middle" ' + D + ' font-weight="700" font-size="88" letter-spacing="2" fill="url(#ouro)" filter="url(#sombra)">RESUMO DAS PREMIAÇÕES</text>');
    o.push('<text x="960" y="240" text-anchor="middle" ' + D + ' font-weight="500" font-size="38" letter-spacing="6" fill="' + BRANCO + '">' + esc(String(nomePeriodo).toUpperCase()) + ' · ' + lista.length + (lista.length === 1 ? ' SEMANA' : ' SEMANAS') + '</text>');
    // números do período
    var chips = [[fechadas.length + '', fechadas.length === 1 ? 'semana encerrada' : 'semanas encerradas'], [batidas + '', batidas === 1 ? 'meta batida' : 'metas batidas'],
      [(fechadas.length - batidas) + '', 'sem prêmio'], [lista.some(function (x) { return x.tipo === 'parcial'; }) ? 'S' + lista[lista.length - 1].numero : '—', 'em curso']];
    chips.forEach(function (c, i) {
      var x = 120 + i * 430;
      o.push('<rect x="' + x + '" y="282" width="400" height="84" rx="16" fill="url(#painel)" stroke="url(#ouro)" stroke-width="2"/>');
      o.push('<text x="' + (x + 30) + '" y="338" ' + D + ' font-weight="700" font-size="48" fill="url(#ouro)">' + esc(c[0]) + '<tspan font-weight="500" font-size="30" fill="' + BRANCO + '" dx="14">' + esc(c[1]) + '</tspan></text>');
    });
    // cartões
    var n = lista.length, cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    var gx = 120, gy = 400, gw = 1680, gh = 600, gap = 28;
    var cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
    lista.forEach(function (s, i) {
      var x = gx + (i % cols) * (cw + gap), y = gy + Math.floor(i / cols) * (ch + gap);
      var cor = s.tipo === 'nao' ? VERM : s.tipo === 'parcial' ? AZUL : 'url(#ouro)';
      o.push(painel(x, y, cw, ch, cor));
      o.push('<text x="' + (x + 30) + '" y="' + (y + 54) + '" ' + D + ' font-weight="700" font-size="34" letter-spacing="3" fill="' + (s.tipo === 'nao' ? VERM : s.tipo === 'parcial' ? AZUL : OURO) + '">SEMANA ' + s.numero + '<tspan font-weight="500" font-size="26" fill="' + CINZA + '">  ·  ' + dd(s.de) + ' a ' + dd(s.ate) + '</tspan></text>');
      var cc = s.tipo === 'nao' ? VERM : s.tipo === 'parcial' ? BRANCO : VERDE;
      o.push('<text x="' + (x + 30) + '" y="' + (y + 120) + '" ' + D + ' font-weight="500" font-size="34" fill="' + BRANCO + '">Alicerce: <tspan font-weight="700" font-size="54" fill="' + cc + '">' + s.total + '</tspan> de ' + s.meta + '</text>');
      var res = s.tipo === 'campeao' ? ['Prêmio ' + s.premio + ' · ' + cabe(String(s.vencedor).toUpperCase(), 20), OURO]
        : s.tipo === 'aguardando' ? ['Meta batida · em apuração', VERDE]
        : s.tipo === 'nao' ? ['Faltaram ' + s.falta + ' · sem prêmio', VERM] : ['Parcial · faltam ' + s.falta, AZUL];
      o.push('<text x="' + (x + 30) + '" y="' + (y + 168) + '" ' + D + ' font-weight="600" font-size="28" fill="' + res[1] + '">' + esc(res[0]) + '</text>');
      // top 3 à direita
      var tx = x + cw * .52;
      o.push('<text x="' + tx + '" y="' + (y + 100) + '" ' + D + ' font-weight="600" font-size="20" letter-spacing="3" fill="' + CINZA + '">TOP 3</text>');
      s.top3.forEach(function (r, k) {
        var yy = y + 140 + k * Math.min(46, (ch - 170) / 3);
        var gname = r.pos === 1 ? 'ouro' : r.pos === 2 ? 'prata' : 'bronze';
        o.push('<text x="' + tx + '" y="' + yy + '" ' + D + ' font-weight="700" font-size="26" fill="url(#' + gname + ')">' + r.pos + 'º</text>');
        o.push('<text x="' + (tx + 44) + '" y="' + yy + '" ' + D + ' font-weight="500" font-size="26" fill="' + BRANCO + '">' + esc(cabe(String(r.nome).toUpperCase(), cols === 3 ? 16 : 22)) + ' — ' + r.pastas + '</text>');
      });
      // equipes no pé do cartão
      var ex = x + 30, ey2 = y + ch - 28;
      ORDEM.forEach(function (eq) {
        o.push('<text x="' + ex + '" y="' + ey2 + '" ' + D + ' font-weight="600" font-size="22" fill="' + COR_EQ[eq] + '">' + NOME_EQ[eq] + ' <tspan fill="' + BRANCO + '">' + (s.porEquipe[eq] || 0) + '</tspan></text>');
        ex += (NOME_EQ[eq].length + 3) * 12 + 18;
      });
    });
    o.push('<text x="960" y="1052" text-anchor="middle" ' + T + ' font-weight="500" font-size="22" fill="' + CINZA + '">Regra da campanha: o prêmio semanal só libera se a Alicerce bater a meta de pastas na semana.</text>');
    o.push('</svg>');
    return o.join('');
  }


  /* ---------- pódio da equipe (cena gerada por IA com molduras em verde puro) ----------
     cena = { url, w, h, caixas: [[x0,y0,x1,y1] da esquerda p/ direita] } — caixas achadas pelo verde #00FF00.
     Ordem visual da cena: 2º à esquerda, 1º no centro, 3º à direita. */
  function arteEquipe(doc, ehDia, cena) {
    var d = dados(doc, ehDia), W = cena.w, H = cena.h, o = [];
    var cx = cena.caixas.slice().sort(function (a, b) { return a[0] - b[0]; });
    var porLugar = { 2: cx[0], 1: cx[1], 3: cx[2] };
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + defs());
    o.push('<linearGradient id="moldura" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1209"/><stop offset="1" stop-color="#050302"/></linearGradient>');
    o.push('<image href="' + cena.url + '" x="0" y="0" width="' + W + '" height="' + H + '"/>');
    var lugares = [1, 2, 3];
    lugares.forEach(function (lug, i) {
      var r = d.top3[i], c = porLugar[lug]; if (!c) return;
      var x = c[0] - 6, y = c[1] - 6, w = c[2] - c[0] + 12, h = c[3] - c[1] + 12, mx = x + w / 2;
      var g = lug === 1 ? 'ouro' : lug === 2 ? 'prata' : 'bronze';
      o.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="22" fill="url(#moldura)"/>');
      o.push('<rect x="' + (x + 8) + '" y="' + (y + 8) + '" width="' + (w - 16) + '" height="' + (h - 16) + '" rx="16" fill="none" stroke="url(#' + g + ')" stroke-opacity=".55" stroke-width="2"/>');
      if (!r) { o.push('<text x="' + mx + '" y="' + (y + h / 2 + 10) + '" text-anchor="middle" ' + D + ' font-size="' + (w * .12).toFixed(0) + '" fill="' + CINZA + '">—</text>'); return; }
      var k = w / 240;
      var partes = String(r.nome).toUpperCase().split(' '), l1 = partes[0], l2 = partes.slice(1).join(' ');
      if (l2.length > 13) l2 = l2.slice(0, 12) + '…';
      o.push('<text x="' + mx + '" y="' + (y + h * .30) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="' + (30 * k).toFixed(0) + '" fill="' + BRANCO + '">' + esc(l1) + '</text>');
      if (l2) o.push('<text x="' + mx + '" y="' + (y + h * .30 + 32 * k) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="' + (24 * k).toFixed(0) + '" fill="' + BRANCO + '">' + esc(l2) + '</text>');
      o.push('<text x="' + mx + '" y="' + (y + h * .80) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="' + (82 * k).toFixed(0) + '" fill="url(#' + g + ')" filter="url(#sombra)">' + r.pastas + '</text>');
      o.push('<text x="' + mx + '" y="' + (y + h * .80 + 30 * k) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="' + (20 * k).toFixed(0) + '" letter-spacing="3" fill="' + OURO + '">' + (r.pastas === 1 ? 'PASTA' : 'PASTAS') + '</text>');
    });
    // ---- bloco de informações: o MESMO conteúdo da arte normal (placar, prêmio, equipes, regra) ----
    var y0 = H - 500, bx = 40, bw = W - 80;
    var corN = d.tipo === 'nao' ? VERM : d.tipo === 'parcial' ? (d.estado === 'atras' ? VERM : VERDE) : VERDE;
    o.push('<rect x="' + bx + '" y="' + y0 + '" width="' + bw + '" height="160" rx="22" fill="#0b0805" fill-opacity=".9" stroke="url(#ouro)" stroke-width="2.5" filter="url(#sombra)"/>');
    o.push('<text x="' + (bx + 36) + '" y="' + (y0 + 44) + '" ' + D + ' font-weight="600" font-size="26" letter-spacing="3" fill="' + OURO + '">' + (d.tipo === 'parcial' ? 'A ALICERCE ATÉ AGORA' : 'A ALICERCE FEZ') + '</text>');
    o.push('<text x="' + (bx + 32) + '" y="' + (y0 + 136) + '" ' + D + ' font-weight="700" font-size="96"><tspan fill="' + corN + '">' + d.total + '</tspan><tspan fill="' + BRANCO + '">/' + d.meta + '</tspan></text>');
    var st1, st2, c1 = corN;
    if (d.tipo === 'campeao') { st1 = 'META BATIDA · PRÊMIO LIBERADO'; st2 = 'Prêmio ' + d.premio + ' para ' + String(d.vencedor).toUpperCase(); }
    else if (d.tipo === 'aguardando') { st1 = 'META BATIDA'; st2 = 'O 1º lugar sai na apuração do app'; }
    else if (d.tipo === 'nao') { st1 = 'PRÊMIO NÃO LIBERADO'; st2 = 'Faltaram ' + d.falta + ' pastas para o prêmio liberar'; }
    else if (d.total >= d.meta) { st1 = 'META JÁ BATIDA'; st2 = 'O prêmio confirma quando a semana fechar'; }
    else { var rs = Math.max((d.diasUteis || 5) - (d.diaUtil || 0), 0); st1 = 'FALTAM ' + d.falta + ' PASTAS'; st2 = rs ? rs + (rs === 1 ? ' dia útil' : ' dias úteis') + ' pela frente · prêmio ' + d.premio : 'Último dia útil · prêmio ' + d.premio; c1 = d.estado === 'atras' ? VERM : VERDE; }
    var sx = bx + 330;
    o.push('<text x="' + sx + '" y="' + (y0 + 84) + '" ' + D + ' font-weight="700" font-size="34" letter-spacing="1" fill="' + c1 + '">' + esc(st1) + '</text>');
    o.push('<text x="' + sx + '" y="' + (y0 + 128) + '" ' + D + ' font-weight="600" font-size="' + (st2.length > 34 ? 26 : 30) + '" fill="' + (d.tipo === 'campeao' ? OURO : BRANCO) + '">' + esc(cabe(st2, 44)) + '</text>');
    // por equipe
    var ey = y0 + 196;
    o.push('<rect x="' + (W / 2 - 110) + '" y="' + (ey - 22) + '" width="220" height="42" rx="21" fill="#0b0805" fill-opacity=".9"/>');
    o.push(filete(W / 2, ey, bw - 40, 'POR EQUIPE'));
    var col = (bw - 40) / 4;
    ORDEM.forEach(function (eq, i) {
      var cxq = bx + 20 + col * i + col / 2;
      o.push('<rect x="' + (cxq - col / 2 + 6) + '" y="' + (ey + 18) + '" width="' + (col - 12) + '" height="104" rx="16" fill="#0b0805" fill-opacity=".85" stroke="' + COR_EQ[eq] + '" stroke-opacity=".55" stroke-width="2"/>');
      o.push(escudo(eq, cxq - col / 2 + 14, ey + 24, 92));
      o.push('<text x="' + (cxq + 38) + '" y="' + (ey + 76) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="48" fill="' + BRANCO + '">' + (d.porEquipe[eq] || 0) + '</text>');
      o.push('<text x="' + (cxq + 38) + '" y="' + (ey + 106) + '" text-anchor="middle" ' + D + ' font-weight="600" font-size="19" fill="' + COR_EQ[eq] + '">' + NOME_EQ[eq] + '</text>');
    });
    // rodapé: semana, estado e regra
    var est = d.tipo === 'parcial' ? ['PARCIAL', AZUL] : d.tipo === 'nao' ? ['ENCERRADA', VERM] : d.tipo === 'aguardando' ? ['EM APURAÇÃO', OURO] : ['ENCERRADA', VERDE];
    var fy = H - 112;
    o.push('<rect x="' + bx + '" y="' + fy + '" width="' + bw + '" height="92" rx="16" fill="#0b0805" fill-opacity=".92" stroke="url(#ouro)" stroke-width="2"/>');
    o.push('<text x="' + (W / 2) + '" y="' + (fy + 40) + '" text-anchor="middle" ' + D + ' font-weight="700" font-size="30" letter-spacing="1" fill="' + OURO + '">' + esc(String(d.periodo).toUpperCase() + ' · SEMANA ' + d.numero + ' · ' + dd(d.de) + ' A ' + dd(d.ate) + ' · ') + '<tspan fill="' + est[1] + '">' + est[0] + '</tspan></text>');
    var rodape = d.tipo === 'parcial' ? 'Parcial de ' + d.atualizado + '. O prêmio só libera se a Alicerce inteira bater ' + d.meta + ' pastas.' : 'O prêmio só libera se a Alicerce inteira bater ' + d.meta + ' pastas na semana.';
    o.push('<text x="' + (W / 2) + '" y="' + (fy + 74) + '" text-anchor="middle" ' + T + ' font-weight="500" font-size="20" fill="' + CINZA + '">' + esc(rodape) + '</text>');
    o.push('</svg>');
    return o.join('');
  }
  g.ArtePremiacao = { arteSemana: arteSemana, arteResumo: arteResumo, arteEquipe: arteEquipe, dados: dados };
})(typeof window !== 'undefined' ? window : globalThis);
