"""Apply the bounded November video review to SQLite, preserving gameplay facts.

Evidence is curated in data/research/video-character-review-2026-11-02.json.
This script does not change learning tables, character ratings, or saved plans.
Run node scripts/build-catalog.cjs afterwards to rebuild public bundles.
"""
import importlib.util
import json
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('catalog_db', ROOT / 'scripts/catalog-db.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
data = module.export_catalog(ROOT / 'data/catalog.sqlite3')
review = json.loads((ROOT / 'data/research/video-character-review-2026-11-02.json').read_text())
for character in data['database']['characters']:
    entry = review['characters'].get(character['cn'])
    if entry:
        character['videoReview'] = {k: v for k, v in entry.items() if k != 'evidenceNotes'}

sources = {
    'biliSkillsUpper': {'title': 'B站 · 全人物战技、魔法、技能速览+简评（上）', 'url': 'https://www.bilibili.com/video/BV17XnU69EZp/', 'scope': '00:34–00:54作者声明多种构筑未亲测；作为角色用途与条件分析，不覆盖确认技能数据。'},
    'biliSkillsLower': {'title': 'B站 · 全人物战技、魔法、技能速览+简评（下）', 'url': 'https://www.bilibili.com/video/BV1s2x66WE58/', 'scope': '包含后期角色评价；亚丝望未覆盖，DLC上限与部分学习等级属推测。'},
}
for key, source in sources.items():
    data['sources'][key] = [source['title'], source['url']]
guidance = data['skillRecommendations']
guidance['sources'].update(sources)
guidance['checkedAt'] = '2026-11-02'
guidance['policy'] = '按实际职责、终职权限、触发条件、行动与培养成本评估。核心仅表示适配该职责时优先考虑，不是全员必练；条件技不能按常驻收益计算。高等级不自动更强，拿到技能不等于换职后仍能使用。'
guidance['reviewScope'] = '重审原94条推荐的效果与成本，结合26名角色视频用途；未覆盖角色不凭视频重排评分，不将未确认技能加入习得表。'
# Explicit downgrades: these are useful, but too conditional to be universal priorities.
downgrades = {
    '状态不错': ('长地图连续击杀后可补命中', '依赖击杀预热；短图、首次交战和舞者职责不适合为它绕修。'),
    '迅雷风烈': ('高速先攻角色可在反击前完成追击', '需要先攻且攻速领先至少10；圣天翼兵精通较晚，先比较是否真正跨过门槛。'),
    '步行移动术': ('复杂地形的步兵可减少移动消耗', '不是平地移动力加一；只在对应地形与步兵状态下有收益。'),
    '步行移动术+': ('复杂地形步兵的后期移动补强', 'S＋投入高，平地无额外收益；基础版已够用时不继续追求。'),
    '安定射击+': ('步兵弓/魔法输出按命中缺口补强', '只限步兵与弓/魔法；舞者以再动为主时，不应只为少量命中强练。'),
    '翔闪枪': ('能追击的枪手可把追击提前到反击前', '不是无条件两次攻击；需实际追击资格、枪权限和耐久。'),
    '战斗强打': ('能追击的拳手可争取反击前完成输出', '不是无条件连击；天马/舞者不能因学过就使用拳战技。'),
    '娴熟一击': ('针对半血敌人的低成本收割手段', '敌人HP不高于一半才有额外收益；不能当满血目标爆发核心。'),
    '鼓舞重击': ('长地图通过准备战斗累计速度', '需要拳权限、准备回合和耐久；并非即插即用或跨地图永久收益。'),
    '替换': ('步兵支援按站位需要交换友军', '只限步兵，需相邻且非大型目标；消耗行动，要与跳舞/治疗收益比较。'),
    '拉近': ('步兵支援按站位需要拉回友军', '只限步兵、相邻及非大型目标；消耗行动，不是全员必修。'),
}
for entry in guidance['entries']:
    if entry['name'] in downgrades:
        entry['tier'] = 'situational'
        entry['reason'], entry['caution'] = downgrades[entry['name']]
    entry['reviewedAt'] = '2026-11-02'
    entry['confidence'] = 'supported' if entry['tier'] == 'priority' else 'conditional'
    entry['reviewBasis'] = '已收录效果与职业权限、触发条件、学习/行动成本复核；视频只补充角色用途。'
# A dancer's unique action is a core role; its matching mastery is conditional on that role.
for entry in guidance['entries']:
    if entry['name'] == '特别舞蹈':
        entry['reason'] = '已确定舞位时，在跳舞的同一次行动中强化目标'
        entry['caution'] = '需要跳舞权限；只持续当前阶段，不能据此把强输出全转舞者。'
    if entry['name'] == '阻绝':
        entry['caution'] = '优先给实际受击前排；取得较晚，不能替代对敌方伤害的具体测算。'
    if entry['name'] in ['二连投掷', '双刃', '双重攻击'] and '比较实际命中' not in entry['caution']:
        entry['caution'] += '；比较实际命中、目标防御和本回合其他行动，不只看攻击段数。'

# Add only canonical abilities whose effects are already present in SQLite.
new_entries = [
 ('跳舞', '战技', 'priority', '再行动是独立支援职责，可把行动交给当前最有价值的队友', '需舞者/对应职业权限及解锁道具；自身消耗行动，不能与本回合攻击或施法同时计收益。', ['biliSkillsUpper'], '16:02–16:28'),
 ('穿行', '特技', 'situational', '步兵可穿过敌人改善站位和救援路线', '不是移动力加成；不能停在敌人格，飞行终职不照搬步兵收益。', ['biliSkillsLower'], '12:40–13:49'),
 ('乱射', '战技', 'situational', '弓手可用多段攻击集中输出，适合比较实际击杀线', '弓权限、命中、耐久与每段折扣都要计入；不因四段就适合所有角色。', ['biliSkillsUpper'], '08:42–09:00'),
 ('魔刃', '战技', 'situational', '高魔力剑手用魔法伤害补盲，亦可服务舞者剑资格', '按自身魔力与敌方魔防比较；舞者的攻击仍要与跳舞行动取舍。', ['biliSkillsUpper'], '06:36–07:05'),
 ('前线计略术', '特技', 'situational', '计略输出角色可利用发动后攻击增益', '先使用攻击类计略，存在行动顺序和持续时间限制；不是无条件攻击力。', ['biliSkillsUpper'], '11:36–12:06'),
 ('雷暴', '法术', 'situational', '远程法术为法系提供安全补刀与战术覆盖', '不能追击，施法次数与职业权限有限；不替代普通主攻。', ['biliSkillsLower'], '10:07–10:49'),
 ('狂乱', '法术', 'situational', '控制敌人可为队伍创造安全行动窗口', '核对目标、命中、次数和持续时间；不是对所有目标可靠的必胜手段。', ['biliSkillsUpper'], '18:00–19:00'),
 ('彷徨之壁', '法术', 'situational', '生成墙壁可改变路径与敌我接触顺序', '需要施法权限、次数与适合地形；红花的等级学习条件不能改成普通熟练度门槛。', ['biliSkillsUpper'], '04:49–05:22'),
 ('治愈铠甲', '特技', 'situational', '重装魔力构筑可把攻击转为概率续航', '限重装、需要命中造成伤害且概率发动；不能作为确定存活保障或必练技能。', ['biliSkillsLower'], '14:30–15:24'),
]
by_key = {(a['type'], a['name']): a for a in data['abilities']}
existing = {(e['type'], e['name']) for e in guidance['entries']}
for name, kind, tier, reason, caution, source_keys, segment in new_entries:
    a = by_key[(kind, name)]
    e = {'abilityId': a['id'], 'name': name, 'type': kind, 'tier': tier, 'reason': reason,
         'caution': caution, 'sources': source_keys, 'basis': 'editorial-synthesis',
         'reviewedAt': '2026-11-02', 'confidence': 'supported' if tier == 'priority' else 'conditional',
         'videoSegment': segment}
    if (kind, name) not in existing:
        guidance['entries'].append(e)
    else:
        guidance['entries'][next(i for i, old in enumerate(guidance['entries']) if (old['type'], old['name']) == (kind, name))] = e

# Reuse the existing dancer panel; no automatic reassignment of any character.
dancer = data['dancerGuide']
dancer['summary'] = '先保留再行动职责，再选输出或飞行分支。蕾达是前两部既有舞位；第三部可考虑媞雅拉、罗蕾塔、卡塔妮雅或乌修拉，按项链与队伍分工选择，不要求全部转舞者。'
dancer['rules'] = [
 '舞者：蕾达篇第9章支线解锁；第一、二部仅蕾达可转。第三部其他角色可转，剑B或弓B，并分配舞姬项链。',
 '神乐神将：第三部第4区分，天冠神殿取得缪斯项链；剑A＋弓C。名额按实际拥有的转职道具分配。',
 '舞者/神乐神将使用剑、弓与步兵技能；不会因为原角色会传送、救出或拳技就保留对应使用权限。',
 '跳舞消耗本人行动；攻击、治疗、计策与再动不能在同一行动中重复计算收益。特别舞蹈则随跳舞触发。',
 '蕾达的专属范围再行动有次数限制，与普通跳舞分别计算。候选仅作参考，不改你保存的终职。',
]
dancer['checkedAt'] = '2026-11-02'
dancer['source'] = 'https://www.bilibili.com/video/BV17XnU69EZp/?t=396'
dancer['sources'] = [dancer['source'], 'https://game8.jp/fe-banshisenko/816861', 'https://gamewith.jp/fefw/578950']
old = {c['id']: c for c in dancer['candidates']}
new = [
 {'id':'c7','classes':['舞者','神乐神将'],'when':'保留已有再行动职责，优先补站位和存活。','cost':'沿已投入的剑或弓资格走；专属歌技次数与普通舞蹈分别计算。'},
 {'id':'c16','classes':['舞者','神乐神将'],'when':'视频明确提出的第三部舞位备选；已有剑线投入时顺路。','cost':'剑B或弓B及舞姬项链；神乐另需剑A、弓C与缪斯项链。转舞者让出白魔远疗权限。'},
]
for key in ['c24','c8','c47']:
    candidate = old[key]
    candidate['cost'] += ' 转舞位不同时计算原法术/拳技；与本人的主攻收益比较。' if '转舞位不同时' not in candidate['cost'] else ''
    new.append(candidate)
dancer['candidates'] = new
# Expose the video-supported dancer option without overwriting the existing primary plan.
alternatives = data['careerAlternatives'].setdefault('c16', [])
if not any(a.get('reviewKey') == 'video-20261102-dancer' for a in alternatives):
    alternatives.append({'title':'第三部舞位备选','classes':['舞者','神乐神将'],
        'when':'队伍需要再行动且本人已有剑/弓资格投入；视频明确提及。',
        'stop':'资格与关键生存能力达标即停，不为舞者绕修不能使用的白魔法；项链按队伍分配。',
        'source':dancer['source'],'sourceLabel':'视频观点 · 职业权限按资料页核对','reviewKey':'video-20261102-dancer'})
with tempfile.NamedTemporaryFile(mode='w', suffix='.json', encoding='utf-8') as tmp:
    json.dump(data, tmp, ensure_ascii=False)
    tmp.flush()
    module.import_catalog(tmp.name, ROOT / 'data/catalog.sqlite3')
print('Applied 27 character reviews, reviewed 94 prior recommendations, added 9 canonical role-specific entries, updated dancer alternatives.')
