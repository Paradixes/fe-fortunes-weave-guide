#!/usr/bin/env python3
"""Derive reverse "recommended characters" indexes into the catalogue.

classes[].recommendedBy  <- planning stages (初级/中级/上级/终局) and careerAlternatives (备选)
equipment[].recommendedBy <- characters[].gearPlan.picks (专属/攻略推荐/主武器/第三部替换)

Run on data/catalog.json before `catalog-db.py import`; the site only reads these fields.
"""
import json, sys

STAGE_ORDER = {'终局': 0, '上级': 1, '中级': 2, '初级': 3, '备选': 4}
KIND_ORDER = {'exclusive': 0, 'guide': 1, 'rule': 2, 'late': 3}
RATING_ORDER = ['S', 'S-', 'A+', 'A', 'A-', 'B', 'C']


def main(path):
    cat = json.load(open(path))
    chars = cat['database']['characters']
    rating = {c['id']: RATING_ORDER.index(c['rating']) if c.get('rating') in RATING_ORDER else 9 for c in chars}
    order = {c['id']: i for i, c in enumerate(chars)}

    stages = {}
    def mark(name, cid, stage):
        name = (name or '').strip()
        if not name:
            return
        cur = stages.setdefault(name, {})
        if cid not in cur or STAGE_ORDER[stage] < STAGE_ORDER[cur[cid]]:
            cur[cid] = stage
    for c in chars:
        p = cat['planning'][c['id']]
        f = p['final']
        mark((p.get('initial') or {}).get('name'), c['id'], '初级')
        for n in f.get('mid', []): mark(n, c['id'], '中级')
        for n in f.get('upper', []): mark(n, c['id'], '上级')
        for n in f.get('end', '').split('/'): mark(n, c['id'], '终局')
        for alt in (cat.get('careerAlternatives') or {}).get(c['id'], []):
            for n in alt.get('classes', []): mark(n, c['id'], '备选')
    for cl in cat['database']['classes']:
        got = stages.get(cl['cn'], {})
        cl['recommendedBy'] = [{'id': cid, 'stage': st} for cid, st in
                               sorted(got.items(), key=lambda kv: (STAGE_ORDER[kv[1]], rating[kv[0]], order[kv[0]]))]

    users = {}
    for c in chars:
        for p in (c.get('gearPlan') or {}).get('picks', []):
            users.setdefault(p['id'], []).append({'id': c['id'], 'kind': p['kind']})
    for e in cat['equipment']:
        e['recommendedBy'] = sorted(users.get(e['id'], []), key=lambda u: (KIND_ORDER[u['kind']], rating[u['id']], order[u['id']]))

    open(path, 'w').write(json.dumps(cat, ensure_ascii=False, indent=2) + '\n')
    print('classes with recommendations:', sum(1 for cl in cat['database']['classes'] if cl['recommendedBy']),
          '/ equipment with recommendations:', sum(1 for e in cat['equipment'] if e['recommendedBy']))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'data/catalog.json')
