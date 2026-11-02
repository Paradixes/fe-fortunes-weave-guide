"""Apply reviewed editorial ratings/strategies; never mutate gameplay facts.

Input: data/research/strategy-rating-review-2026-11-02.json.
The source contains a bounded characters mapping; optional strategy fields are
explicit decisions, not inferred from a tier letter. SQLite remains canonical.
"""
import copy
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog_db', ROOT / 'scripts/catalog-db.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
data = module.export_catalog(ROOT / 'data/catalog.sqlite3')
review = json.loads((ROOT / 'data/research/strategy-rating-review-2026-11-02.json').read_text())
chars = {c['id']: c for c in data['database']['characters']}
classes = {cl['cn']: cl for cl in data['database']['classes']}
DATE = review['checkedAt']
protected = copy.deepcopy({k: data[k] for k in ['learning', 'abilities', 'abilityAcquisitionFacts']})
character_facts = {cid: {k:c.get(k) for k in ['growth','baseStats','baseLevel','personalSkill','personalSkillEffect','routes','joinDetails','good','bad','gender','canRide','gearPlan']} for cid,c in chars.items()}

def classes_in(build):
    return list(dict.fromkeys(build['mid'] + build['upper'] + build['end'].split(' / ')))

def class_reason(c, cl, investment):
    allowed = '、'.join(cl.get('allowedSkills', []))
    limitations = []
    if cl['cn'] == '贤士': limitations.append('只能施放白魔，不能兼用黑魔')
    if cl['cn'] == '德鲁伊': limitations.append('不能施放白魔，传送/救出须换允许白魔的职业')
    if cl['cn'] == '瓦尔基里姆': limitations.append('保留黑白魔，失去剑、拳与步兵权限；需马术及神殿解锁')
    if cl['cn'] == '高阶墓志铭': limitations.append('剑黑魔路线，不保留白魔传送/治疗')
    if cl['cn'] in ['舞者','神乐神将']: limitations.append('需舞位资格与道具；让出攻击行动，不能同时计算黑白魔或拳技')
    if '飞行术' in cl.get('allowedSkills',[]): limitations.append('按飞行终职权限计算，不能同时计算已学的白魔或拳技')
    return {'why': f"{c['cn']}：{c['role']}。{cl['cn']}可用{allowed}。" + '；'.join(limitations),
            'stop': investment}

def action_rows(cid, names, kind, reasons):
    lookup = {a['name']:a for a in data['learning'][cid][kind]}
    rows=[]
    for n in names:
        if n not in lookup or lookup[n].get('requirementUnknown'): continue
        row=copy.deepcopy(lookup[n])
        row['why']=reasons[n]
        row['reviewedAt']=DATE
        rows.append(row)
    return rows

for cid, entry in review['characters'].items():
    c = chars[cid]
    p = data['planning'][cid]
    audit = data['ratingAudit']['characters'][cid]
    previous = entry['previousRating']
    c['rating'] = entry['rating']
    c['ratingReason'] = entry['reason']
    c['role'] = entry.get('role', c['role'])
    investment = entry['investment']
    strategy = entry.get('strategy', {})
    p['initial'].update(copy.deepcopy(strategy.get('initial',{})))
    for route_id, initial in strategy.get('routeInitials',{}).items():
        p['routes'][route_id]['initial'].update(copy.deepcopy(initial))
    c['plan'] = strategy.get('plan', investment)
    c['stop'] = strategy.get('stop', investment)
    if strategy.get('coreSkill'): c['coreSkill'] = strategy['coreSkill']
    audit.update({k:entry[k] for k in ['rating','reason','limits','investment']})
    audit.update({'previousRating':previous, 'reassessedAt':DATE,
                  'referenceRatingsNote':'历史榜单对照，非本次独立评级的直接结论。'})
    audit['sources'] = list(dict.fromkeys(audit.get('sources',[]) + entry.get('sources',[])))
    if c.get('videoReview') and c['videoReview']['status']=='reviewed':
        audit['sources'] = list(dict.fromkeys(audit['sources'] + [c['videoReview']['source']['url']]))
    if strategy.get('build'):
        for target in ['summary','final']:
            p[target].update(copy.deepcopy(strategy['build']))
    for target in ['summary','final']:
        p[target]['priority'] = c['plan']
    # Default end applies to routes, while existing optional growth branches stay distinct.
    for rid, route in p['routes'].items():
        route['build']['end'] = p['final']['end']
        if rid in strategy.get('routeBuilds', {}):
            route['build'].update(copy.deepcopy(strategy['routeBuilds'][rid]))
        elif strategy.get('build') and not route.get('rule',{}).get('optional',False):
            route['build'].update(copy.deepcopy(strategy['build']))
        rule = route.get('rule')
        if not rule: continue
        rule['stages'] = [route['build']['mid'][0],route['build']['upper'][0],route['build']['end']]
        rule['focus'] = [route['build']['focus']]
        rule['thirdPart'] = c['plan'] + ' 最终按所选职业权限与实际行动分工使用。'
        if not rule.get('optional',False):
            route['build']['priority'] = c['plan']
            rule['reason'] = entry['reason']
            rule['firstPartStop'] = c['stop']
            if strategy.get('label'):
                rule['label'] = rule['goal'] = strategy['label']
            rule['focus'] = [route['build']['focus']]
    if strategy.get('optionalRoutes'):
        for rid in strategy['optionalRoutes']:
            if rid not in p['routes']: continue
            r=p['routes'][rid];r['active']=True;r['mode']='条件补养'
            r['rule']['optional']=True
            r['rule']['label']=r['rule']['goal']='力量／物理伤害条件补修'
            r['rule']['firstPartStop']='只有现有成果的物理伤害确实不足才补；目标达标即停，不默认另练一份完整主养。'
            r['rule']['reason']='剑系分支的条件补修，不为双魔主职默认培养力量；先比较已有成果。'
        primary=p['primary']
        primary['primaryRoutes']=[r for r in primary['primaryRoutes'] if r not in strategy['optionalRoutes']]
        primary['optionalRouteIds']=list(dict.fromkeys(primary['optionalRouteIds']+strategy['optionalRoutes']))
        primary['classification']='单方向主养＋按需补修'
    p['primary']['analysis'] = c['plan']
    if strategy.get('label'):p['primary']['archetypes']=[strategy['label']]
    pa=p['audit'];pa.update({'reviewed':True,'date':DATE,'reassessedAt':DATE,'reason':entry['reason'],'investment':investment,'role':strategy.get('label',c['role'])})
    pa['defaultDirections']=strategy.get('defaultDirections',pa['defaultDirections'])
    for direction in pa['directions']:
        rid=direction['route']; r=p['routes'].get(rid)
        if not r:continue
        direction['classes']=[r.get('initial',p['initial'])['name'],r['build']['mid'][0],r['build']['upper'][0]]
        if rid in strategy.get('optionalRoutes',[]):
            direction['level']='条件补养'
            direction['condition']='仅在已有成果存在明确物理伤害缺口时启用，不默认双方向主养。'
        if not r['rule'].get('optional',False):
            direction.update({'label':strategy.get('label',direction['label']),'reason':entry['reason'],'stop':c['stop'],
                              'classes':[r.get('initial',p['initial'])['name'],r['build']['mid'][0],r['build']['upper'][0]]})
            if strategy.get('directionType'):direction['type']=strategy['directionType']
        else:
            direction['stop']=r['rule']['firstPartStop']
    relevant_classes = [p['initial']['name']] + [r['initial']['name'] for r in p['routes'].values()] + classes_in(p['final'])
    for r in p['routes'].values():relevant_classes+=classes_in(r['build'])
    for alt in data.get('careerAlternatives',{}).get(cid,[]):relevant_classes+=alt.get('classes',[])
    relevant_classes += list(pa.get('classReasons',{}))
    pa['classReasons']={n:class_reason(c,classes[n],c['stop']) for n in dict.fromkeys(relevant_classes) if n in classes}
    c['upper']=classes[p['final']['upper'][0]]['title']
    c['recommendedClasses']=[classes[n]['title'] for n in classes_in(p['final'])]
    names=strategy.get('actionNames')
    if names:
        picked={key:action_rows(cid,names.get(key,[]),kind,strategy['actionReasons']) for key,kind in [('arts','combatArts'),('skills','learnedSkills'),('magic','magic')]}
        # Level skills are separately sourced, never invented.
        picked['skills'] += action_rows(cid,names.get('levelSkills',[]),'levelSkills',strategy['actionReasons'])
        c['recommendedActions']={'arts':picked['arts'],'skills':picked['skills']}
        p['recommendations']={'combatArts':picked['arts'],'skills':picked['skills'],'magic':picked['magic']}
    else:
        # Align legacy action lists with the new audited per-character recommendations.
        rec=p.get('recommendations',{})
        c['recommendedActions']={'arts':copy.deepcopy(rec.get('combatArts',c['recommendedActions'].get('arts',[]))),
                                 'skills':copy.deepcopy(rec.get('skills',c['recommendedActions'].get('skills',[])))}
    # Generic editorial surfaces refer to the same conclusion; retain route facts and membership.
    for route_id, rs in data['routeStrategy'].items():
        for section in ['core','lateReplacements']:
            for item in rs.get(section,[]):
                if item.get('id')==cid:
                    route=p['routes'].get(route_id)
                    if route:
                        rb=route['build']; rule=route.get('rule',{})
                        item['reason']=f"本线中上级{rb['mid'][0]}→{rb['upper'][0]}；" + rule.get('firstPartStop',c['stop']) + ' 终局另看整合方案。'
                    else:
                        item['reason']=entry['reason'] + ' 招募后按当前路线权限培养，终局另看整合方案。'

for alt in data.get('careerAlternatives',{}).get('c31',[]):
    if alt['title']=='黑魔专精':
        alt['when']='原攻略提供黑魔专精思路；本站本次默认双魔输出与白魔群疗/按需传送。队伍已有足够白魔支援且愿意舍弃本人白魔时，才选纯黑德鲁伊。'
        alt['reviewedAt']=DATE
for item in data['routeStrategy']['ディートリヒ'].get('lateReplacements',[]):
    if item['id']=='c4':
        item['roles']=['治疗','黑魔']
        item['reason']='本线第一、二部萨满巫师→先知，以高魔力黑法输出兼白魔回复；替代杨界时先保留治疗职责，队伍治疗缺口未补足前不转纯黑德鲁伊。白S救出只按需后补，终局另看整合方案。'
    if item['id']=='c47':
        item['roles']=['弓剑','道具支援']
for candidate in data['dancerGuide']['candidates']:
    if candidate['id']=='c47':
        candidate['when']='缺舞位且愿意让出本人探影战斗收益时再选；共享道具袋并不要求默认转舞。'
    if candidate['id']=='c7':
        candidate['when']='保留普通舞者直到第三部第4区、缪斯项链与剑A弓C齐备，再转神乐；他人接舞后才考虑探影。'

# Keep reassessment scope explicit: no claim that the other 36 were rerated.
data['ratingAudit']['reassessment']={k:review[k] for k in ['checkedAt','scope','policy']}
data['ratingAudit']['reassessment']['characterIds']=list(review['characters'])
for key,value in protected.items():assert data[key]==value, 'Gameplay facts changed: '+key
for cid,fields in character_facts.items():
    assert fields=={k:chars[cid].get(k) for k in fields},'Gameplay character facts changed: '+cid
with tempfile.NamedTemporaryFile(mode='w',suffix='.json',encoding='utf8') as tmp:
    json.dump(data,tmp,ensure_ascii=False);tmp.flush()
    subprocess.run(['python3',str(ROOT/'scripts/derive-recommendations.py'),tmp.name],check=True)
    module.import_catalog(tmp.name, ROOT/'data/catalog.sqlite3')
print('Applied bounded editorial reassessment; gameplay facts preserved and reverse indexes regenerated.')
