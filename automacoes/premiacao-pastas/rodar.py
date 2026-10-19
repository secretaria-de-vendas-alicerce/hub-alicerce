#!/usr/bin/env python3
"""Premiação de Pastas — gera o retrato do dia, as semanas fechadas, o PNG e o corpo do e-mail.

Uso: python3 rodar.py FONTE.xlsx APP.xlsx SAIDA_DIR [--data AAAA-MM-DD] [--hora HH:MM] [--url URL_DO_ARTEFATO]
FONTE.xlsx = "PLANILHA DE ANALISES ALICERCE" (aba ANALISE NOVAS)
APP.xlsx   = "Gerenciador de Análises — dados do app" (Corretores, CorretorEquipes, Config_Premiacao, Premiacao_*)
Regra (conferida contra o app em 19/10/2026: semanas P-2-S1 = 56 e P-2-S2 = 66 batem):
pastas NOVAS com DATA DE ENVIO dentro da semana, menos CANCELADA; equipe = a do corretor na data de envio.
"""
import sys, os, json, argparse, datetime as dt, warnings
from collections import Counter, defaultdict
import openpyxl

warnings.filterwarnings('ignore')
AQUI = os.path.dirname(os.path.abspath(__file__))


def ler(p, aba):
    wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
    rows = list(wb[aba].iter_rows(values_only=True))
    h = [str(x).strip() if x is not None else '' for x in rows[0]]
    return [dict(zip(h, r)) for r in rows[1:]]


def dia(x):
    if isinstance(x, dt.datetime): return x.date()
    if isinstance(x, dt.date): return x
    return None


def apurar(novas, cors, vig, de, ate):
    def equipe(idc, d):
        for v in vig.get(idc, []):
            a, b = dia(v['VigenciaDe']), dia(v['VigenciaAte'])
            if a and a <= d and (b is None or d <= b): return v['Equipe']
        return '(sem equipe)'
    rank = defaultdict(lambda: {'pastas': 0, 'aprovadas': 0})
    total = 0; porEq = Counter()
    for r in novas:
        e = dia(r.get('DATA DE ENVIO'))
        if not e or not (de <= e <= ate) or not r.get('Id'): continue
        if 'CANCEL' in str(r.get('SituacaoAcompanhamento') or '').upper(): continue
        idc = r.get('IdCorretor')
        nome = (cors.get(idc, {}).get('Nome') or r.get('CORRETOR') or '?').strip()
        eq = equipe(idc, e)
        rank[(nome, eq)]['pastas'] += 1
        if str(r.get('STATUS DE APROVAÇÃO') or '').upper().startswith('APROV'): rank[(nome, eq)]['aprovadas'] += 1
        total += 1; porEq[eq] += 1
    lst = sorted([{'corretor': k[0], 'equipe': k[1], **v} for k, v in rank.items()], key=lambda x: (-x['pastas'], x['corretor']))
    return total, [{'equipe': k, 'pastas': v} for k, v in porEq.most_common()], lst


def dias_uteis_ate(de, hoje, n):
    k = 0; d = de
    while d <= hoje:
        if d.weekday() < 5: k += 1
        d += dt.timedelta(days=1)
    return min(k, n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('fonte'); ap.add_argument('app'); ap.add_argument('saida')
    ap.add_argument('--data'); ap.add_argument('--hora', default=(dt.datetime.utcnow() - dt.timedelta(hours=3)).strftime('%H:%M')); ap.add_argument('--url', default=''); ap.add_argument('--repo', default='', help='clone do hub-alicerce para publicar as artes')
    a = ap.parse_args()
    hoje = dt.date.fromisoformat(a.data) if a.data else (dt.datetime.utcnow() - dt.timedelta(hours=3)).date()
    os.makedirs(os.path.join(a.saida, 'semanas'), exist_ok=True)

    novas = ler(a.fonte, 'ANALISE NOVAS')
    cors = {c['IdCorretor']: c for c in ler(a.app, 'Corretores') if c.get('IdCorretor')}
    vig = defaultdict(list)
    for v in ler(a.app, 'CorretorEquipes'):
        if v.get('IdCorretor'): vig[v['IdCorretor']].append(v)
    periodos = {p['IdPeriodo']: p for p in ler(a.app, 'Premiacao_Periodos') if p.get('IdPeriodo')}
    config = [c for c in ler(a.app, 'Config_Premiacao') if c.get('IdVigencia')]

    def regra(d):
        ok = [c for c in config if dia(c['ValeDe']) and dia(c['ValeDe']) <= d and (c['ValeAte'] is None or d <= dia(c['ValeAte']))]
        c = ok[-1] if ok else config[-1]
        return int(c['MetaSemana'] or 63), str(c['Premio'] or '')

    def regra_nao_bater(d):
        ok = [c for c in config if dia(c['ValeDe']) and dia(c['ValeDe']) <= d and (c['ValeAte'] is None or d <= dia(c['ValeAte']))]
        c = ok[-1] if ok else config[-1]
        return str(c.get('SeNaoBater') or 'NAO_SAI').upper()

    def valor(premio):
        import re
        m = re.search(r'([0-9][0-9.]*)(,[0-9]+)?', premio or '')
        return float(m.group(1).replace('.', '') + (m.group(2) or '').replace(',', '.')) if m else 0.0

    acum = 0.0  # prêmio que veio acumulado de semanas sem meta (regra ACUMULA)

    # agenda de semanas (linha MANUAL) + última apuração do app por semana
    agenda, apur = {}, {}
    for s in ler(a.app, 'Premiacao_Semanas'):
        sid = s.get('IdSemana')
        if not sid: continue
        if s.get('Status') == 'MANUAL' or sid not in agenda:
            agenda[sid] = s if s.get('Status') == 'MANUAL' else agenda.get(sid, s)
        if s.get('Status') in ('FECHADA', 'EM_CURSO') and s.get('ApuradoEm'):
            if sid not in apur or s['ApuradoEm'] > apur[sid]['ApuradoEm']: apur[sid] = s
    semanas = sorted(agenda.values(), key=lambda s: dia(s['De']))

    def info(s):
        p = periodos.get(s['IdPeriodo'], {})
        return {'id': s['IdSemana'], 'periodo': p.get('Nome') or s['IdPeriodo'], 'numero': int(s['Numero']),
                'de': dia(s['De']).isoformat(), 'ate': dia(s['Ate']).isoformat(), 'diasUteis': int(s['DiasUteis'] or 5)}

    # semanas fechadas
    fechadas = []
    for s in semanas:
        de, ate = dia(s['De']), dia(s['Ate'])
        if ate >= hoje: continue
        meta, premio = regra(de)
        total, porEq, rk = apurar(novas, cors, vig, de, ate)
        doc = {**info(s), 'meta': meta, 'premio': premio, 'total': total, 'metaBatida': total >= meta,
               'porEquipe': porEq, 'top': rk[:5], 'fonte': 'previa', 'vencedor': None, 'pastasVencedor': rk[0]['pastas'] if rk else 0}
        if total >= meta and rk:
            emp = [r['corretor'] for r in rk if r['pastas'] == rk[0]['pastas']]
            doc['vencedor'] = emp[0] if len(emp) == 1 else None
            doc['empatados'] = emp if len(emp) > 1 else []
        ap_ = apur.get(s['IdSemana'])
        doc['seNaoBater'] = regra_nao_bater(de)
        doc['premioBase'] = valor(premio)
        if ap_:
            try:
                jr = json.loads(ap_.get('JsonRanking') or '{}')
                rkapp = [r for r in jr.get('ranking', []) if r.get('pastas')]
                venc = ap_.get('VencedorAjustado')
                if venc:
                    rkapp = [r for r in rkapp if r['corretor'] == venc] + [r for r in rkapp if r['corretor'] != venc]
                doc['top'] = [{'corretor': r['corretor'], 'equipe': r.get('equipe') or '', 'pastas': r['pastas']} for r in rkapp[:5]]
                if jr.get('porEquipe'): doc['porEquipe'] = [{'equipe': e['equipe'], 'pastas': e['pastas']} for e in jr['porEquipe']]
            except Exception as e:
                print('AVISO ranking do app', s['IdSemana'], e, file=sys.stderr)
            doc.update({'fonte': 'app', 'totalApp': int(ap_['TotalAjustado'] or ap_['TotalFonte'] or 0),
                        'metaBatida': bool(ap_['MetaBatida']), 'vencedor': ap_.get('VencedorAjustado'),
                        'pastasVencedor': int(ap_.get('PastasVencedor') or 0), 'apuradoEm': str(ap_['ApuradoEm'])[:16],
                        'statusApp': ap_['Status']})
        bateu = doc['metaBatida']
        doc['premioValor'] = (doc['premioBase'] + acum) if bateu else 0
        doc['premioAcumuladoAntes'] = acum
        if bateu: acum = 0.0
        elif doc['seNaoBater'] == 'ACUMULA': acum += doc['premioBase']
        else: acum = 0.0
        doc['acumuladoDepois'] = acum
        fechadas.append(doc)
        json.dump(doc, open(os.path.join(a.saida, 'semanas', s['IdSemana'] + '.json'), 'w'), ensure_ascii=False, indent=1)

    # semana corrente
    atual = next((s for s in semanas if dia(s['De']) <= hoje <= dia(s['Ate'])), None)
    if atual is None:
        print('AVISO: nenhuma semana da Premiação cobre', hoje, '- usando a mais recente', file=sys.stderr)
        atual = [s for s in semanas if dia(s['De']) <= hoje][-1]
    de, ate = dia(atual['De']), dia(atual['Ate'])
    meta, premio = regra(de)
    total, porEq, rk = apurar(novas, cors, vig, de, ate)
    sem = info(atual); sem['diaUtil'] = dias_uteis_ate(de, hoje, sem['diasUteis'])
    esperado = round(meta * sem['diaUtil'] / sem['diasUteis'], 1)
    estado = 'batida' if total >= meta else ('ritmo' if total >= esperado else 'atras')
    premioValor = valor(premio) + acum
    snap = {'premioValor': premioValor, 'premioAcumuladoAntes': acum, 'seNaoBater': regra_nao_bater(de), 'data': hoje.isoformat(), 'hora': a.hora, 'semana': sem, 'meta': meta, 'premio': premio,
            'total': total, 'falta': max(meta - total, 0), 'esperado': esperado, 'estado': estado,
            'ranking': rk[:5], 'empateNoTopo': len([r for r in rk if rk and r['pastas'] == rk[0]['pastas']]) > 1,
            'porEquipe': porEq, 'corretoresComPasta': len(rk),
            'ultimaFechada': fechadas[-1] if fechadas else None, 'geradoEm': dt.datetime.utcnow().isoformat() + 'Z'}
    json.dump(snap, open(os.path.join(a.saida, 'dia.json'), 'w'), ensure_ascii=False, indent=1)

    # PNG
    js = open(os.path.join(AQUI, 'card.js')).read()
    fonts = open(os.path.join(AQUI, 'fonts.css')).read()
    html = ('<html><head><meta charset="utf-8"><style>' + fonts + 'html,body{margin:0;background:#f4f4f5}</style></head><body>'
            '<div id="c"></div><script>' + js + '</script><script>document.getElementById("c").innerHTML=cardSVG(' +
            json.dumps(snap, ensure_ascii=False) + ')</script></body></html>')
    open(os.path.join(a.saida, 'card.html'), 'w').write(html)
    try:
      from playwright.sync_api import sync_playwright
      with sync_playwright() as p:
          kw = {}
          if os.path.exists('/opt/pw-browsers/chromium'): pass
          b = p.chromium.launch()
          pg = b.new_page(viewport={'width': 1200, 'height': 800}, device_scale_factor=2)
          pg.goto('file://' + os.path.abspath(os.path.join(a.saida, 'card.html')))
          pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(300)
          pg.screenshot(path=os.path.join(a.saida, 'premiacao.png'), clip={'x': 0, 'y': 0, 'width': 1200, 'height': 800})
          b.close()

    except Exception as e:
        print('AVISO: PNG não gerado:', e, file=sys.stderr)

    # e-mail: cartão em HTML (tabelas + estilos inline), no mesmo desenho do PNG; Gmail não exibe SVG
    T = {'batida': ('META BATIDA', 'Prêmio liberado', '#3bd07a', 'rgba(59,208,122,.14)', '#3bd07a'),
         'ritmo': ('NO RITMO', 'No ritmo para bater a meta', '#38d3f5', 'rgba(56,211,245,.14)', '#38d3f5'),
         'atras': ('ABAIXO DO RITMO', 'Abaixo do ritmo da meta', '#ff4d45', 'rgba(255,77,69,.14)', '#ff4d45')}[estado]
    d2 = lambda iso: iso[8:10] + '/' + iso[5:7]
    assunto = f"Premiação de Pastas · {d2(snap['data'])} · {total}/{meta} · {T[0].capitalize()}"
    resta = max(sem['diasUteis'] - sem['diaUtil'], 0)
    if estado == 'batida':
        l2 = f"{total - meta} acima da meta" if total > meta else 'Meta atingida em cheio'
    else:
        l2 = f"Faltam {snap['falta']} pasta{'s' if snap['falta'] != 1 else ''}" + (
            f" · {snap['falta'] / resta:.1f}".replace('.', ',') + f" por dia útil nos {resta} dias que restam" if resta else ' · último dia útil da semana')
    F = "font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
    S = "font-family:Oswald,'Arial Narrow',Impact,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
    pct = min(100, round(total / meta * 100))
    rk5 = rk[:5]; mx = max([r['pastas'] for r in rk5] or [1])
    linhas_rk = ''.join(
        f'<tr><td style="{F}padding:6px 0;font-size:15px;color:#f7f3ea;{"font-weight:700" if r["pastas"] == mx else ""}">{r["corretor"]}'
        f'<div style="font-size:11px;letter-spacing:1px;color:#b9b1a1;font-weight:500">{r["equipe"]}</div></td>'
        f'<td width="200" style="padding:6px 0 6px 12px"><table cellpadding="0" cellspacing="0" border="0" width="{max(8, round(170 * r["pastas"] / mx))}"><tr>'
        f'<td height="14" style="background:{T[4] if r["pastas"] == mx else "#4a3d27"};border-radius:7px;font-size:0;line-height:0">&nbsp;</td></tr></table></td>'
        f'<td width="32" align="right" style="{F}font-size:16px;font-weight:700;color:#f7f3ea">{r["pastas"]}</td></tr>' for r in rk5) or \
        f'<tr><td style="{F}font-size:14px;color:#b9b1a1">Nenhuma pasta enviada na semana ainda.</td></tr>'
    eqs = ' &nbsp;·&nbsp; '.join(f'<b style="color:#f7f3ea">{e["equipe"]}</b> {e["pastas"]}' for e in porEq if e['equipe'] != '(sem equipe)')
    extra = []
    if snap['empateNoTopo'] and rk: extra.append('Empate no 1º lugar: o app desempata pela qualidade e, depois, pelo carimbo.')
    uf = snap['ultimaFechada']
    if uf and (hoje - dt.date.fromisoformat(uf['ate'])).days <= 7:
        res = (f"meta batida, prêmio para <b>{uf['vencedor']}</b>" if uf['metaBatida'] and uf.get('vencedor')
               else 'meta batida, empate no 1º lugar a desempatar no app' if uf['metaBatida']
               else f"meta não batida ({uf.get('totalApp', uf['total'])} de {uf['meta']}), sem prêmio")
        extra.append(f"Semana {uf['numero']} fechada: {res}." + ('' if uf['fonte'] == 'app' else ' (prévia; ainda não apurada no app)'))
    corpo = f"""<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050403"><tr><td align="center" style="padding:20px 8px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#15100a;border:2px solid #c8902c;border-radius:24px;box-shadow:0 0 0 1px #3a2a10">
<tr><td style="padding:28px 32px 0">
 <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="{S}font-size:30px;font-weight:700;letter-spacing:1px;color:#ffc24a">PREMIAÇÃO DA SEMANA {sem['numero']}</td>
  <td align="right" style="{F}font-size:12px;color:#b9b1a1">{d2(snap['data'])} · {snap['hora']}</td></tr>
  <tr><td style="{S}font-size:18px;font-weight:700;color:#f7f3ea;padding-top:4px">{sem['periodo']} <span style="font-weight:500;color:#b9b1a1">{d2(sem['de'])} a {d2(sem['ate'])}</span></td>
  <td align="right" style="{F}font-size:12px;color:#b9b1a1">dia útil {sem['diaUtil']} de {sem['diasUteis']}</td></tr></table>
</td></tr>
<tr><td style="padding:24px 32px 0">
 <span style="{F}display:inline-block;background:{T[3]};color:{T[2]};font-size:12px;font-weight:700;letter-spacing:2px;padding:7px 14px;border-radius:999px">{T[0]}</span>
 <div style="{S}font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#f7f3ea;padding-top:12px">{T[1]}</div>
 <div style="{F}font-size:15px;color:#b9b1a1;padding-top:4px">{l2}</div>
</td></tr>
<tr><td style="padding:22px 32px 0">
 <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="{S}font-size:64px;font-weight:800;letter-spacing:-2px;color:#f7f3ea;line-height:1">{total}<span style="font-size:18px;font-weight:500;letter-spacing:0;color:#b9b1a1"> de {meta} pastas</span></td></tr>
  <tr><td style="padding-top:12px"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#5a4420;border-radius:8px"><tr>
   <td width="{max(pct, 2)}%" height="14" style="background:{T[4]};border-radius:8px;font-size:0;line-height:0">&nbsp;</td><td style="font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr>
  <tr><td style="{F}font-size:12px;color:#b9b1a1;padding-top:6px">{pct}% da meta · ritmo esperado até hoje: {str(esperado).replace('.', ',')}</td></tr></table>
</td></tr>
<tr><td style="padding:24px 32px 0">
 <div style="{F}font-size:11px;font-weight:700;letter-spacing:2px;color:#b9b1a1;padding-bottom:4px">QUEM LIDERA</div>
 <table width="100%" cellpadding="0" cellspacing="0" border="0">{linhas_rk}</table>
 {''.join(f'<div style="{F}font-size:13px;color:#b9b1a1;padding-top:10px">{x}</div>' for x in extra)}
</td></tr>
<tr><td style="padding:20px 32px 26px"><div style="border-top:1px solid #5a4420;padding-top:14px;{F}font-size:13px;color:#b9b1a1">{eqs}</div>
 <div style="{F}font-size:13px;color:#b9b1a1;padding-top:6px">Prêmio {snap['premio']} ao 1º se a Alicerce bater {meta} na semana.</div>
 {f'<div style="padding-top:14px"><a href="{a.url}" style="{F}font-size:15px;font-weight:600;color:#ffc24a;text-decoration:none">Abrir o histórico e baixar as artes →</a></div>' if a.url else ''}
</td></tr></table></td></tr></table>"""
    texto = f"{total} de {meta} pastas na semana {sem['numero']} ({d2(sem['de'])} a {d2(sem['ate'])}). {T[1]}. {l2}." + (' ' + ' '.join(extra).replace('<b>', '').replace('</b>', '') if extra else '') + (f' Histórico: {a.url}' if a.url else '')
    # ---- artes do dia (as mesmas da página) publicadas no hub-alicerce para entrar no corpo do e-mail ----
    artes = gerar_artes(snap, fechadas, hoje, a.saida)
    urls = publicar_artes(artes, a.repo, hoje) if a.repo and artes else []
    if urls:
        # O conector do Gmail remove <img> do corpo. A arte vai como botão que abre a imagem,
        # logo acima do cartão com os números.
        F2 = "font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
        botoes = ''.join(f'<tr><td align="center" style="padding:0 0 12px"><a href="{u}" style="{F2}display:inline-block;background:#ffc24a;color:#1a0f05;font-size:17px;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:12px">Ver a arte: {esc_html(t)} →</a></td></tr>' for u, t in urls)
        corpo = (f'<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#050403"><tr><td align="center" style="padding:20px 8px 4px">'
                 f'<table cellpadding="0" cellspacing="0" border="0">{botoes}</table></td></tr></table>' + corpo)
        texto = texto + ' Artes: ' + ' | '.join(t + ': ' + u for u, t in urls)
    json.dump({'assunto': assunto, 'html': corpo, 'texto': texto}, open(os.path.join(a.saida, 'email.json'), 'w'), ensure_ascii=False, indent=1)
    open(os.path.join(a.saida, 'email.html'), 'w').write('<meta charset="utf-8">' + corpo)
    print(json.dumps({'assunto': assunto, 'estado': estado, 'total': total, 'fechadas': [f['id'] for f in fechadas]}, ensure_ascii=False))


def esc_html(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def gerar_artes(snap, fechadas, hoje, saida):
    """Desenha as artes com o mesmo arte.js da página. Sempre a parcial da semana; e, até 3 dias
    depois de uma semana fechar, também a arte dessa semana (campeão, não liberado ou em apuração)."""
    js = ''
    for f in ('arte-recursos.js', 'arte-fundos.js', 'arte-cenas.js', 'arte.js'):
        p = os.path.join(AQUI, f)
        if not os.path.exists(p):
            print('AVISO: falta', f, '- e-mail sai sem a arte', file=sys.stderr); return []
        js += open(p).read() + '\n'
    pedidos = []
    uf = snap.get('ultimaFechada')
    if uf and (hoje - dt.date.fromisoformat(uf['ate'])).days <= 3:
        pedidos.append(('semana-' + uf['id'], uf, False, 'Resultado da semana ' + str(uf['numero'])))
    pedidos.append(('parcial', snap, True, 'Parcial da semana ' + str(snap['semana']['numero'])))
    saidas = []
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b = p.chromium.launch()
            for nome, doc, ehDia, titulo in pedidos:
                html = ('<html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head><body><div id="c"></div><script>' + js +
                        '</script><script>var doc=' + json.dumps(doc, ensure_ascii=False) + ',ehDia=' + ('true' if ehDia else 'false') + ';'
                        'var d=ArtePremiacao.dados(doc,ehDia),cena=d.equipeUnica&&window.ARTE_CENAS&&ARTE_CENAS[d.equipeUnica];'
                        'document.getElementById("c").innerHTML=cena?ArtePremiacao.arteEquipe(doc,ehDia,cena):ArtePremiacao.arteSemana(doc,ehDia,{fundos:window.ARTE_FUNDOS});'
                        'var sv=document.querySelector("svg");window.W=+sv.getAttribute("width");window.H=+sv.getAttribute("height");</script></body></html>')
                hp = os.path.join(saida, 'arte-' + nome + '.html'); open(hp, 'w').write(html)
                pg = b.new_page(viewport={'width': 1200, 'height': 1500})
                pg.goto('file://' + os.path.abspath(hp)); pg.wait_for_timeout(1200)
                w, h = pg.evaluate('[window.W, window.H]')
                pg.set_viewport_size({'width': w, 'height': h})
                png = os.path.join(saida, 'arte-' + nome + '.png')
                pg.screenshot(path=png, clip={'x': 0, 'y': 0, 'width': w, 'height': h}); pg.close()
                from PIL import Image
                jpg = png[:-4] + '.jpg'
                im = Image.open(png).convert('RGB')
                if im.width > 1080: im = im.resize((1080, round(im.height * 1080 / im.width)))
                im.save(jpg, 'JPEG', quality=86, optimize=True, progressive=True)
                saidas.append((jpg, titulo))
            b.close()
    except Exception as e:
        print('AVISO: arte não gerada:', e, file=sys.stderr)
    return saidas


def publicar_artes(artes, repo, hoje):
    """Copia as artes para hub-alicerce/premiacao/ com nome impossível de adivinhar, apaga as com
    mais de 21 dias e dá push. Devolve [(url, titulo)]. Falhou: devolve [] e o e-mail sai sem imagem."""
    import secrets, shutil, subprocess, re
    try:
        pasta = os.path.join(repo, 'premiacao'); os.makedirs(pasta, exist_ok=True)
        run = lambda *c: subprocess.run(c, cwd=repo, check=True, capture_output=True, text=True)
        run('git', 'config', 'user.name', 'Premiacao de Pastas'); run('git', 'config', 'user.email', 'consultoria.elves@gmail.com')
        try: run('git', 'pull', '--rebase', '--depth', '1', 'origin', 'main')
        except Exception: pass
        limite = hoje - dt.timedelta(days=21)
        for f in os.listdir(pasta):
            m = re.match(r'(\d{4}-\d{2}-\d{2})-', f)
            if m and dt.date.fromisoformat(m.group(1)) < limite: os.remove(os.path.join(pasta, f))
        urls = []
        for jpg, titulo in artes:
            nome = hoje.isoformat() + '-' + secrets.token_hex(10) + '.jpg'
            shutil.copy(jpg, os.path.join(pasta, nome))
            urls.append(('https://raw.githubusercontent.com/secretaria-de-vendas-alicerce/hub-alicerce/main/premiacao/' + nome, titulo))
        run('git', 'add', '-A', 'premiacao')
        run('git', 'commit', '-m', 'Premiação de Pastas: artes de ' + hoje.isoformat())
        run('git', 'push', 'origin', 'HEAD:main')
        return urls
    except Exception as e:
        print('AVISO: publicação das artes falhou:', getattr(e, 'stderr', '') or e, file=sys.stderr)
        return []


if __name__ == '__main__':
    main()
