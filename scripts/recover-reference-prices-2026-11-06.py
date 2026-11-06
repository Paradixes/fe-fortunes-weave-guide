"""Recover only evidence-supported price classifications from preserved data.
Run with --apply to modify SQLite; default verifies recovered values and export.
"""
import argparse, json, sqlite3
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'data/research/recovered-price-review-2026-11-06.json'
p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
with sqlite3.connect(ROOT/'data/catalog.sqlite3') as db:
    equipment={i:json.loads(v) for i,v in db.execute("SELECT id,payload FROM entities WHERE collection='equipment'")}
    if args.apply and not REPORT.exists():
        changes=[]
        for id,e in equipment.items():
            for index,s in enumerate(e.get('sourcesList',[])):
                if '攻略参考买价' not in s.get('text',''):continue
                assert isinstance(s.get('price'),(int,float)) and 'referencePrice' not in s
                before=dict(s);after=dict(s);after['referencePrice']=after.pop('price')
                changes.append({'equipmentId':id,'sourceIndex':index,'before':before,'after':after,'basis':'The preserved text explicitly labels this amount as a guide reference purchase price, not a verified local shop price.'})
        assert len(changes)==166,len(changes)
        report={'checkedAt':'2026-11-06','recoveryStatus':'partial-evidence-supported-reconstruction-not-original-patch','changes':changes,'unrecovered':['Four character combat-art changes: exact character IDs, field paths and supporting evidence are missing.','Three magic classifications: exact IDs and source evidence are missing.','Eight gift-preference corrections: exact gift/character pairs and ratings are missing.','Prototype XI four fields: exact field paths and replacements are missing; retained Nov 5 research records known durability/range source differences.','Iron Axe original six-shop patch: exact intended rows are missing; current GameWith page offers seven early-game and six Salvation-era shops, so count alone does not identify original patch.'],'currentIronAxeSourceCheck':{'url':'https://gamewith.jp/fefw/577852','retrieval':'Public web tool page lines 424–442, read 2026-11-06. Facts transcribed, no game screenshot inspected.','salvationPricesG':{'帝都鞑古席翁':1500,'王都格兰·亚拉功':750,'王都美盖拉':750,'托巴林村':750,'莱伊·欧港':750,'马恩城郭':750},'applied':False},'prototypeSourceCheck':{'urls':['https://gamewith.jp/fefw/582765','https://appmedia.jp/fe_banshisenkou/80486089'],'result':'Current text supports existing base stats and existing III range 2–3. GameWith lists max durability 5; prior preserved Anna report lists 10. No speculative correction applied.'},'sourceLimitations':['https://fire-emblem-fw.site/items.html returned HTTP403; no retry or bypass.','The reference-price reclassification is supported by preserved per-row wording. This does not independently reverify all 166 price values or shop availability.']}
        REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    report=json.loads(REPORT.read_text())
    assert len(report['changes'])==166
    if args.apply:
        changed_ids=set()
        for change in report['changes']:
            entity=equipment[change['equipmentId']]
            index=change['sourceIndex']
            current=entity['sourcesList'][index]
            assert current in (change['before'],change['after']), (
                'Conflicting reference-price row',change['equipmentId'],index,current)
            if current==change['before']:
                entity['sourcesList'][index]=dict(change['after'])
                changed_ids.add(change['equipmentId'])
        for id in changed_ids:
            db.execute("UPDATE entities SET payload=? WHERE collection='equipment' AND id=?",(json.dumps(equipment[id],ensure_ascii=False,separators=(',',':')),id))
    shops=[('帝都鞑古席翁',1500),('王都格兰·亚拉功',750),('王都美盖拉',750),('托巴林村',750),('莱伊·欧港',750),('马恩城郭',750)]
    expected=[{'kind':'购买','place':place,'phase':'第三部','text':f'第三部（救世篇）{place}武器店：{price}金币。','price':price,'source':'https://gamewith.jp/fefw/577852'} for place,price in shops]
    axe=equipment['library_80411599']
    if args.apply:
        for row in expected:
            matching=[s for s in axe['sourcesList'] if s.get('phase')=='第三部' and s.get('place')==row['place'] and s.get('source')==row['source']]
            assert not matching or matching==[row], 'Conflicting existing shop row'
            if not matching:axe['sourcesList'].append(row)
        db.execute("UPDATE entities SET payload=? WHERE collection='equipment' AND id=?",(json.dumps(axe,ensure_ascii=False,separators=(',',':')),axe['id']))
        report['verifiedIronAxeShopAdditions']={'equipmentId':axe['id'],'rows':expected,'basis':'Current GameWith page explicitly labels these six shops 救世編 (Salvation/third part), lines 436–441. Independently reconstructed facts, not proof these are the original lost rows.'}
        report['currentIronAxeSourceCheck']['applied']=True
        report['unrecovered']=[r for r in report['unrecovered'] if not r.startswith('Iron Axe')]
        REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    assert report['verifiedIronAxeShopAdditions']['rows']==expected
    for row in expected:assert axe['sourcesList'].count(row)==1, row
    assert len(report['changes'])==166
    for c in report['changes']:
        s=equipment[c['equipmentId']]['sourcesList'][c['sourceIndex']]
        assert s==c['after'],c
        assert 'price' not in s and s['referencePrice']==c['before']['price']
if not args.apply:
    exported={e['id']:e for e in json.loads((ROOT/'data/catalog.json').read_text())['equipment']}
    assert exported==equipment, 'Export differs from SQLite equipment'
print('PASS: 166 guide reference prices are separate from verified shop price; six independently verified third-part Iron Axe shops present; remaining lost corrections unclaimed.')
