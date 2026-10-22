#!/usr/bin/env python3
"""把 data/legacy/(scrape-legacy.py 的产物)合并进 data/catalog.json 并重建 SQLite。

- characters:补 birthday / giftRecs(礼物页);joinDetails 按路线补 答题/交涉/时限/推荐礼物(挖角页)
- 新增根键 mapExtras:商店商品、采集记录、名声解锁表、坐骑(老站 MPD)
之后运行 build-catalog.cjs 重新生成 dist。角色名匹配不上即报错,未匹配超过 5% 非零退出。
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
LEGACY = DATA / 'legacy'

ROUTE_JP = {'cai': 'カイ編', 'dietrich': 'ディートリヒ編', 'theodora': 'セオドラ編', 'leda': 'レダ編'}
DEADLINE_RE = re.compile(r'[^。]*(?:第\d+章[^。]*?前|不能补|限时|截止日期)[^。]*')
GIFT_SHOP_RE = re.compile(r'可在(.+?)买[，,](\d+)G一件')
NOISE = re.compile('[​‌‍⁠﻿­᠎]')


def load(name):
    return json.loads((LEGACY / name).read_text())


def main():
    catalog = json.loads((DATA / 'catalog.json').read_text())
    characters = catalog['database']['characters']
    by_cn = {}
    for c in characters:
        for key in {c.get('cn'), c.get('name'), c.get('alias') or None} - {None, ''}:
            by_cn.setdefault(key, c)

    # ---- 挖角详情 → joinDetails ----
    recruit = load('recruit.json')
    unmatched, matched, enriched = set(), 0, 0
    for r in recruit:
        c = by_cn.get(r['name'])
        if c is None:
            unmatched.add(r['name'])
            continue
        matched += 1
        if r['route'] not in ROUTE_JP:
            continue  # later(第二·三部)无对应 joinDetails 路线
        jp = ROUTE_JP[r['route']]
        entry = next((j for j in c.get('joinDetails', [])
                      if j.get('route') == jp and j.get('method') == 'スカウト'), None)
        if entry is None:
            continue
        changed = False
        talk = NOISE.sub('', r.get('talk', '')).removeprefix('交涉：').strip()
        facts = r.get('facts', [])
        nego = next((f['text'] for f in facts if f['label'] == '交涉' and '答' not in f['text']), '')
        if talk and '答' in talk:
            entry['answers'] = talk
            changed = True
        elif talk:
            nego = nego or talk
        if nego and not entry.get('negotiate'):
            entry['negotiate'] = nego
            changed = True
        deadline = DEADLINE_RE.search(r.get('summary', ''))
        if deadline and not entry.get('deadline'):
            entry['deadline'] = deadline.group(0).strip() + '。'
            changed = True
        gift_fact = next((f for f in facts if f.get('gift')), None)
        if gift_fact:
            shop = GIFT_SHOP_RE.search(gift_fact['text'])
            entry['gift'] = {
                'name': gift_fact['gift']['name'],
                'slug': gift_fact['gift']['slug'],
                'place': shop.group(1).strip() if shop else '',
                'price': int(shop.group(2)) if shop else 0,
            }
            changed = True
        if r.get('ease') and not entry.get('ease'):
            entry['ease'] = r['ease']
            changed = True
        enriched += changed
    total = len({r['name'] for r in recruit})
    print(f'挖角:{matched}/{len(recruit)} 条记录匹配角色,就地补全 {enriched} 条 joinDetails')
    if unmatched:
        print('  未匹配角色:', '、'.join(sorted(unmatched)))
    if len(unmatched) / max(total, 1) > 0.05:
        print('!! 未匹配超过 5%,中止', file=sys.stderr)
        sys.exit(1)

    # ---- 礼物页 → birthday / giftRecs ----
    gifts = load('gifts.json')
    gift_hit = 0
    for g in gifts:
        c = by_cn.get(g['name'])
        if c is None:
            print('  !! 礼物页未匹配:', g['name'])
            continue
        gift_hit += 1
        if g['birthday'] and g['birthday'] != '—':
            c['birthday'] = g['birthday']
        c['giftRecs'] = [{'name': x['name'], 'price': int(x['price'])} for x in g['gifts']]
    print(f'礼物:{gift_hit}/{len(gifts)} 名角色写入生日与推荐礼物')

    # ---- MPD → mapExtras ----
    mpd = load('mpd.json')
    pin_by_name = {p['name']: p['id'] for p in catalog['map']}
    pin_ids = {p['id'] for p in catalog['map']}

    def pin_id(old_id):
        if old_id == 'capital' or old_id.startswith('capital-'):
            return pin_by_name.get('帝都鞑古席翁', '1001')
        if old_id.startswith('world-') and old_id[6:] in pin_ids:
            return old_id[6:]
        return None

    items = {k: v[0] for k, v in mpd['I'].items()}  # 物品 id → 中文名
    old_name = {a['i']: a['n'] for a in mpd['A']}   # 老地点 id → 中文名

    shops = []
    shop_join_fail = []
    for s in mpd['S']:
        pid = pin_id(s['a'])
        if pid is None:
            shop_join_fail.append(s['a'])
            continue
        seen, goods = set(), []
        for g in s['g']:
            name = items.get(g[0], g[0])
            row = (name, g[1], g[3])
            if row not in seen:
                seen.add(row)
                goods.append(list(row))
        shops.append({'place': pid, 'name': s['n'], 'kind': s['k'],
                      'where': old_name.get(s['a'], ''), 'goods': goods})

    gather = []
    gather_join_fail = []
    for item_id, place_old, how, *_ in mpd['G']:
        pid = pin_id(place_old)
        if pid is None:
            gather_join_fail.append(place_old)
            continue
        gather.append({'place': pid, 'item': items.get(item_id, item_id), 'how': how})

    renown = [{
        'lv': r['lv'], 'text': r['u'],
        'areas': [old_name.get(a, a) for a in r['a']],
        'routes': [{'route': ROUTE_JP.get(t[0], t[0]), 'text': t[1]} for t in r['rt']],
        'quests': [{'id': q[0], 'name': q[1]} for q in r['q']],
    } for r in mpd['R']]

    mounts = [{
        'id': m['i'], 'name': m['n'], 'where': m['w'], 'obtain': m['o'],
        'areas': [old_name.get(a, a) for a in m['a']], 'rare': m['rare'], 'food': m['f'],
    } for m in mpd['MT']]

    catalog['mapExtras'] = {'shops': shops, 'gather': gather, 'renown': renown, 'mounts': mounts}
    print(f'地图:商店 {len(shops)} 家(未join {len(shop_join_fail)}),'
          f'采集 {len(gather)} 条(未join {len(gather_join_fail)}),'
          f'名声 {len(renown)} 级,坐骑 {len(mounts)} 种')
    if shop_join_fail or gather_join_fail:
        print('  未join样例:', shop_join_fail[:3], gather_join_fail[:3])

    (DATA / 'catalog.json').write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('catalog.json 已更新,重建 SQLite…')
    subprocess.run(['python3', str(ROOT / 'scripts' / 'catalog-db.py'), 'import'],
                   check=True, cwd=ROOT)
    print('完成。')


if __name__ == '__main__':
    main()
