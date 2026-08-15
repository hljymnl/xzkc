# -*- coding: utf-8 -*-
"""《四十天合意复兴祷告》PDF -> 结构化课程 JSON（40 天 = 40 课）。
每天：经文 + 灵修正文 + 思考问题（分享题）。
"""
import re, json
import fitz

SRC = "/Users/macbook/Desktop/小組事工●門徒培訓/小组事工-四十天合意复兴祷告/dir/小组事工-四十天合意复兴祷告.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/sishi-tian.json"

CN = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,
      "十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,
      "十九":19,"二十":20,"二十一":21,"二十二":22,"二十三":23,"二十四":24,"二十五":25,
      "二十六":26,"二十七":27,"二十八":28,"二十九":29,"三十":30,"三十一":31,"三十二":32,
      "三十三":33,"三十四":34,"三十五":35,"三十六":36,"三十七":37,"三十八":38,"三十九":39,
      "四十":40}
DAY_RE = re.compile(r'^第([一二三四五六七八九十]+)天\s*([一二三四五]?)[，,]?\s*(.*)$')
VERSE_RE = re.compile(r'[0-9]+\s*[:：]\s*[0-9]+')
SC_RE = re.compile(r'\{\s*SC\s*[^}]*\}')

def clean(s):
    s = s.replace('\x7f', '').replace('\xa0', ' ').strip()
    s = re.sub(r'\s+', ' ', s)
    return s

def main():
    doc = fitz.open(SRC)
    # 内容从“第一天”页开始（第 6 页，idx=5）到末尾
    days = []
    cur = None
    def flush():
        nonlocal cur
        if cur is not None: days.append(cur); cur = None
    for pn in range(5, len(doc)):
        t = doc[pn].get_text()
        lines = [clean(l) for l in t.split('\n')]
        for l in lines:
            if not l: continue
            m = DAY_RE.match(l)
            if m and len(l) < 40 and CN.get(m.group(1)):
                flush()
                day = CN[m.group(1)]
                part = m.group(2) or ''
                theme = m.group(3).strip() or ''
                cur = {"number": day, "id": f"lesson-{day}", "title": theme,
                       "part": part, "verses": [], "lines": [], "discussion": []}
                continue
            if cur is None:
                # 跳过“第一部份/第二部分”等章节页与页眉页脚
                if re.match(r'^第[一二三四五六七八九十]+部份', l) or re.match(r'^第[一二三四五六七八九十]+部分', l) or re.match(r'^\d+$', l) or '基督徒的道路' in l:
                    continue
                continue
            # 经文行（多节用 / 或空格分隔）
            if VERSE_RE.search(l) and not cur['lines'] and not cur['verses']:
                for v in re.split(r'[/\s]+', l):
                    v = v.strip()
                    if VERSE_RE.search(v):
                        cur['verses'].append(v)
                continue
            # 思考问题
            if l.startswith('•') or l.startswith('·'):
                q = l.lstrip('•· ').strip()
                if q and len(q) > 2:
                    cur['discussion'].append(q)
                continue
            if l.startswith('思考问题'):
                continue
            # 页码/横线
            if re.match(r'^\d+$', l) or set(l) <= {'_', '-'} or l.startswith('{'):
                continue
            cur['lines'].append(l)
    flush()
    days.sort(key=lambda x: x['number'])
    print("days:", [d['number'] for d in days])

    lessons = []
    for d in days:
        text = ' '.join(d['lines'])
        text = SC_RE.sub('', text)
        text = re.sub(r'\s+', ' ', text).strip()
        theme = d['title'] or '灵修'
        part_cn = {'一':'一','二':'二','三':'三','四':'四','五':'五'}.get(d['part'], '')
        title = f"{theme}（{part_cn}）" if part_cn and theme else (theme or f"第{d['number']}天")
        memory = '；'.join(d['verses']) if d['verses'] else None
        lesson = {
            "number": d['number'], "id": d['id'], "title": title,
            "goal": f"第{d['number']}天 · 合意复兴祷告", "extra": None,
            "memoryVerse": memory,
            "sections": [{"heading": theme, "text": text}] if text else [],
            "discussion": d['discussion'],
            "quiz": [], "audio": {}
        }
        lessons.append(lesson)
        print(f"第{lesson['number']}天 {title} | 正文{len(text)}字 分享题={len(lesson['discussion'])} 经文={memory}")

    course = {
        "id": "sishi-tian", "title": "四十天合意复兴祷告",
        "subtitle": "每天遇见主耶稣 · 40天灵修操练",
        "source": "安息日基督复临教会 2017",
        "totalLessons": len(lessons), "category": "小组事工",
        "lessons": lessons
    }
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved:", OUT, "| lessons:", len(lessons))

if __name__ == '__main__':
    main()
