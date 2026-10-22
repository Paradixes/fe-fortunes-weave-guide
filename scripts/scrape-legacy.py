#!/usr/bin/env python3
"""一次性抓取老站 annasnotebook.net 的数据与安娜素材(站长自有站点)。

产物:
  data/legacy/mpd.json        地图数据(地点/商店/采集/名声/委托/坐骑)
  data/legacy/mpq.json        委托步骤
  data/legacy/mpst.json       驿站路线
  data/legacy/recruit.json    挖角详情(名声/支援/答题/交涉/礼物/时限/评价)
  data/legacy/gifts.json      生日与推荐礼物
  dist/assets/anna-live/      首页动态立绘(视频+清单+背景)
  dist/assets/anna/           静态立绘与头像
  dist/assets/anna-pet/       桌宠动作 webm/poster + lines.json(中文)

已存在的文件默认跳过,--force 重新下载。零宽字符(老站反爬噪音)统一剥离。
"""
import json
import re
import subprocess
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEGACY = ROOT / 'data' / 'legacy'
BASE = 'https://www.annasnotebook.net/'
UA = {'User-Agent': 'Mozilla/5.0 (legacy-import; site owner)'}
# 老站正文里插入的零宽噪音字符
NOISE = re.compile('[​‌‍⁠﻿­᠎]')
FORCE = '--force' in sys.argv


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def save(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not FORCE:
        print(f'  skip {path.relative_to(ROOT)}')
        return False
    if isinstance(content, str):
        path.write_text(content, encoding='utf-8')
    else:
        path.write_bytes(content)
    print(f'  wrote {path.relative_to(ROOT)} ({path.stat().st_size}B)')
    return True


def clean(text):
    return NOISE.sub('', text).strip()


def resolve_assets(page_html, pattern):
    """pattern 是完整文件名正则,返回 assets/v/ 下的匹配文件名。"""
    return sorted(set(re.findall(r'assets/v/(' + pattern + ')', page_html)))


def extract_window_js(js_text, var):
    """用 node 子进程执行 window.XXX={...} 赋值并取出 JSON。"""
    script = (
        'const window={};'
        + js_text
        + f';process.stdout.write(JSON.stringify(window.{var}));'
    )
    out = subprocess.run(['node', '-e', script], capture_output=True, check=True)
    return json.loads(out.stdout)


# ---------- 表格/卡片 HTML 解析 ----------

class TextWalker(HTMLParser):
    """收集标签文本与属性的轻量 walker。"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.reset_state()

    def reset_state(self):
        self.stack = []
        self.rows = []  # details.rcx-row / tr 记录


def parse_attrs(attrs):
    return {k: v or '' for k, v in attrs}


def strip_tags(html):
    return re.sub(r'<[^>]+>', '', html)


def parse_recruit(html):
    """解析 /recruit/:每个 details.rcx-row 一名角色某路线。"""
    html = clean(html)
    rows = []
    for m in re.finditer(
        r'<details class="rcx-row" id="rc-([a-z]+)-([a-z0-9-]+)"([^>]*)>([\s\S]*?)</details>', html
    ):
        route, cid, attrs_raw, body = m.groups()
        attrs = parse_attrs(re.findall(r'([\w-]+)="([^"]*)"', attrs_raw))
        name = attrs.get('data-sz', '')
        summary = re.search(r'<summary>([\s\S]*?)</summary>', body)
        chip = {}
        if summary:
            for cm in re.finditer(
                r'<span class="cv (cv-\w+)" title="([^"]*)">([\s\S]*?)</span>', summary.group(1)
            ):
                chip[cm.group(1)] = {'title': cm.group(2), 'text': strip_tags(cm.group(3))}
        tier = re.search(r'class="tier tier-([a-z])"', body)
        rec = re.search(r'class="rcx-rec [^"]*" title="([^"]*)">([^<]*)<', body)
        ol = re.search(r'<small class="rcx-ol" title="([^"]*)">', body)
        sum_p = re.search(r'<p class="rcx-sum">([\s\S]*?)</p>', body)
        facts = []
        for fm in re.finditer(r'<li>([\s\S]*?)</li>', body):
            item = fm.group(1)
            label = re.search(r'<b>([^<]+)</b>', item)
            span = re.search(r'<span>([\s\S]*?)</span>', item)
            gift = re.search(r'href="[^"]*gifts/([\w-]+)/"[^>]*>(?:<img[^>]*>)?([^<]+)</a>', item)
            facts.append({
                'label': label.group(1) if label else '',
                'text': strip_tags(span.group(1)).strip() if span else '',
                'gift': {'slug': gift.group(1), 'name': gift.group(2)} if gift else None,
            })
        rows.append({
            'route': route, 'cid': cid, 'name': name,
            'nameJa': attrs.get('data-sj', ''), 'nameEn': attrs.get('data-se', ''),
            'tier': tier.group(1).upper() if tier else '',
            'ease': rec.group(2) if rec else '',
            'oneLiner': ol.group(1) if ol else '',
            'renown': chip.get('cv-ren', {}).get('text', ''),
            'support': chip.get('cv-sup', {}).get('text', ''),
            'chapter': chip.get('cv-ch', {}).get('text', ''),
            'talk': chip.get('cv-talk', {}).get('title', ''),
            'summary': strip_tags(sum_p.group(1)).strip() if sum_p else '',
            'facts': facts,
        })
    return rows


def parse_gifts(html):
    """解析 /bonds/gifts/:表格行 = 角色/生日/礼物(价格)。"""
    html = clean(html)
    out = []
    for m in re.finditer(
        r'<tr><td><a class="cch" href="[^"]*characters/([\w-]+)/"[^>]*>(?:<img[^>]*>)?([^<]+)</a></td><td>([^<]*)</td><td>([\s\S]*?)</td></tr>',
        html,
    ):
        slug, name, birthday, cell = m.groups()
        gifts = [
            {'slug': g.group(1), 'name': g.group(2), 'price': g.group(3)}
            for g in re.finditer(
                r'href="[^"]*gifts/([\w-]+)/"[^>]*>(?:<img[^>]*>)?([^<]+)</a>（(\d+)G）', cell
            )
        ]
        out.append({'slug': slug, 'name': name, 'birthday': birthday.strip(), 'gifts': gifts})
    return out


def main():
    print('== 解析资源文件名')
    home = fetch(BASE)
    map_page = fetch(BASE + 'map/')
    assets = {}
    for pat, key in [
        (r'mpd\.[0-9a-f]+\.js', 'mpd'), (r'mpq\.[0-9a-f]+\.js', 'mpq'),
        (r'mpst\.[0-9a-f]+\.js', 'mpst'),
    ]:
        found = resolve_assets(map_page, pat) or resolve_assets(home, pat)
        if found:
            assets[key] = found[0]
    print(' ', assets)

    print('== 地图/委托/驿站数据')
    for key in ('mpd', 'mpq', 'mpst'):
        if key not in assets:
            print(f'  !! 未找到 {key} 资源名')
            continue
        target = LEGACY / f'{key}.json'
        if target.exists() and not FORCE:
            print(f'  skip {target.relative_to(ROOT)}')
            continue
        js = fetch(BASE + 'assets/v/' + assets[key])
        data = extract_window_js(js, key.upper())
        save(target, json.dumps(data, ensure_ascii=False))

    print('== 挖角页')
    recruit_html = fetch(BASE + 'recruit/')
    recruit = parse_recruit(recruit_html)
    save(LEGACY / 'recruit.json', json.dumps(recruit, ensure_ascii=False, indent=1))
    print(f'  解析到 {len(recruit)} 条挖角记录')

    print('== 礼物页')
    gifts_html = fetch(BASE + 'bonds/gifts/')
    gifts = parse_gifts(gifts_html)
    save(LEGACY / 'gifts.json', json.dumps(gifts, ensure_ascii=False, indent=1))
    print(f'  解析到 {len(gifts)} 名角色的生日礼物')

    print('== 安娜立绘(首页)')
    live = [
        'anna.json', 'idle-a.webm', 'talk.webm', 'happy.webm', 'smug.webm',
        'surprised.webm', 'bg.webm', 'bg-poster.webp',
    ]
    for f in live:
        save(ROOT / 'dist' / 'assets' / 'anna-live' / f,
             fetch(BASE + 'assets/anna-live/c/' + f, binary=True))
    static_imgs = {
        'anna-open-art.webp': 'assets/v/anna-open-art.468e1cdef1.webp',
        'anna-128.webp': 'assets/v/anna-128.1666355f19.webp',
        'face-anna.webp': 'assets/img/home/face-anna.webp',
    }
    for name, path in static_imgs.items():
        save(ROOT / 'dist' / 'assets' / 'anna' / name, fetch(BASE + path, binary=True))

    print('== 安娜桌宠')
    manifest_name = resolve_assets(map_page, r'anna-pet-manifest\.[0-9a-f]+\.json') or \
        resolve_assets(home, r'anna-pet-manifest\.[0-9a-f]+\.json')
    manifest = None
    if manifest_name:
        manifest = json.loads(fetch(BASE + 'assets/v/' + manifest_name[0]))
        save(LEGACY / 'anna-pet-manifest.json', json.dumps(manifest, ensure_ascii=False))
    keep = {'idle', 'idle2', 'wave', 'happy', 'think', 'surprised', 'sleep',
            'drag', 'pout', 'read', 'twirl', 'stretch'}
    if manifest:
        for item in manifest['items']:
            if item['id'] not in keep:
                continue
            for f in (item['file'], item.get('poster')):
                if not f:
                    continue
                save(ROOT / 'dist' / 'assets' / 'anna-pet' / f,
                     fetch(BASE + 'assets/anna-pet/' + f, binary=True))
        # 精简清单:只保留搬运的动作
        slim = {'items': [i for i in manifest['items'] if i['id'] in keep]}
        save(ROOT / 'dist' / 'assets' / 'anna-pet' / 'manifest.json',
             json.dumps(slim, ensure_ascii=False))
    lines_raw = json.loads(fetch(BASE + 'assets/anna-pet/lines.json'))
    drop_keys = {'fb_open', 'fb_thanks', 'fb_fail', 'fb_short', '_meta'}
    lines = {}
    for k, v in lines_raw.items():
        if k in drop_keys:
            continue
        if isinstance(v, list):
            lines[k] = [x['zh'] if isinstance(x, dict) and 'zh' in x else x for x in v]
    save(ROOT / 'dist' / 'assets' / 'anna-pet' / 'lines.json',
         json.dumps(lines, ensure_ascii=False))

    print('完成。')


if __name__ == '__main__':
    main()
