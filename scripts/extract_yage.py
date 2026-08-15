# -*- coding: utf-8 -*-
"""《门训关怀小组教学材料·雅各书研究》(Gateway教会) -> 课程 JSON。
9 课，每课：开放/挖掘/回应 三段讨论题（读书分享式）。
"""
import re, json
import fitz

SRC = "/Users/macbook/Desktop/小組事工●門徒培訓/小组事工-门训关怀小组教学材料-Gateway教会/dir/小组事工-门训关怀小组教学材料-Gateway教会.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/menxun-yage.json"

LESSON_RE = re.compile(r'第\s*(\d+)\s*课[—\-–]+([^（(]+)（([^）]+)）')
SEC_RE = re.compile(r'^(开放|挖掘|回应|总结|见证|应用)[:：]')
ITEM_RE = re.compile(r'^(\d+)\s*[，,、．.]')

def clean(s):
    s = s.replace('\x7f', '').replace('\xa0', ' ').strip()
    s = re.sub(r'\s+', ' ', s)
    return s

def main():
    doc = fitz.open(SRC)
    full = '\n'.join(doc[i].get_text() for i in range(54, len(doc)))
    lines = [clean(l) for l in full.split('\n')]

    lessons = []
    cur = None
    def flush():
        nonlocal cur
        if cur is not None: lessons.append(cur); cur = None
    for l in lines:
        if not l: continue
        if re.match(r'^\d+\s*/\s*\d+$', l): continue
        m = LESSON_RE.search(l)
        if m and int(m.group(1)) <= 9:
            flush()
            cur = {"number": int(m.group(1)), "id": f"lesson-{int(m.group(1))}",
                   "title": m.group(2).strip(), "ref": m.group(3).strip(),
                   "lines": [], "sections": []}
            continue
        if cur is None: continue
        sm = SEC_RE.match(l)
        if sm:
            cur['sections'].append({"heading": sm.group(1), "items": []})
            continue
        if cur['sections']:
            cur['sections'][-1]['items'].append(l)
        else:
            cur['lines'].append(l)
    flush()
    lessons.sort(key=lambda x: x['number'])
    print("lessons:", [(l['number'], l['title'], len(l['sections'])) for l in lessons])

    out_lessons = []
    for l in lessons:
        sections, discussion = [], []
        for sec in l['sections']:
            # 合并编号问题：若行以“数字，”开头则为新问题
            items = []
            for it in sec['items']:
                if ITEM_RE.match(it):
                    items.append(ITEM_RE.sub('', it).strip())
                elif items:
                    items[-1] += it
                else:
                    items.append(it)
            text = '\n'.join(f'{i+1}. {t}' for i, t in enumerate(items))
            sections.append({"heading": sec['heading'], "text": text})
            discussion.extend(items)
        title = l['title'].strip('—–-')
        out_lessons.append({
            "number": l['number'], "id": l['id'], "title": title,
            "goal": None, "extra": None,
            "memoryVerse": ("雅各书" + l['ref'].lstrip('雅')) if l['ref'] else None,
            "sections": sections,
            "discussion": discussion,
            "quiz": [], "audio": {}
        })
        print(f"课{l['number']} {title} | 段={len(sections)} 分享题={len(discussion)}")

    course = {
        "id": "menxun-yage", "title": "门训关怀·雅各书小组查经",
        "subtitle": "Gateway门训中心教学材料 · 9课",
        "source": "复临信徒门训中心（Gateway教会）",
        "totalLessons": len(out_lessons), "category": "小组事工",
        "lessons": out_lessons
    }
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved:", OUT, "| lessons:", len(out_lessons))

if __name__ == '__main__':
    main()
