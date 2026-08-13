# -*- coding: utf-8 -*-
"""《寻找确据》中英双语 -> 结构化 JSON：按人工单元名在页眉中定位起始页。"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

SRC = "/Users/macbook/Documents/Codex/2026-08-13/https-www-sdabible-org-egwbook-https/outputs/sdabible.org全站/05_杂志/查经课/0363_寻找确据.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/xunzhao-queju.json"

# (英文关键词, 中文课名)
UNITS = [
    ("WhoIsJesus", "谁是耶稣？(Who Is Jesus?)"),
    ("WhatIsFaith", "什么是信心？(What Is Faith?)"),
    ("HowToPray", "如何祷告？(How to Pray)"),
    ("WhyAreWeHere", "我们为何在这里？(Why Are We Here?)"),
    ("BibleIsthereanything", "圣经：还有什么可信？(The Bible)"),
    ("HowToUnderstandTheBible", "如何明白圣经？(How to Understand the Bible)"),
    ("AWorldinTurmoil", "一个混乱的世界 (A World in Turmoil)"),
    ("TheMannerofChristsComing", "基督复临的样式 (The Manner of Christ's Coming)"),
    ("HowToFindPersonalPeace", "如何找到平安？(How to Find Personal Peace)"),
    ("TheSecretofaNewLife", "新生命的奥秘 (The Secret of a New Life)"),
    ("GoodGodBadWorld", "好上帝！坏世界！为何？(Good God! Bad World! Why?)"),
    ("RevelationsMostThrilling", "启示录最震撼的信息 (Revelation's Most Thrilling Message)"),
    ("TheBiblesLongest", "圣经最长最奇妙的预言 (The Bible's Longest & Amazing Prophecy)"),
    ("WhatsBehindTheRising", "罪恶的背后 (What's Behind the Rising Immorality?)"),
    ("ChristsSpecialSign", "基督特别的记号 (Christ's Special Sign)"),
    ("OurGreatestNeed", "我们最大的需要：新生活 (Our Greatest Need – New Lifestyle)"),
    ("TheRealTruthAboutDeath", "死亡的真相 (The Real Truth About Death)"),
    ("GodsLoveintheFires", "地狱的火能彰显上帝的爱吗？(God's Love in the Fires of Hell)"),
    ("HowtoSuccessfullyBury", "如何胜过过去 (How to Successfully Bury the Past)"),
    ("AFinancialSecret", "钱财的奥秘 (A Financial Secret)"),
    ("GrowingasaChristian", "基督徒的成长 (Growing as a Christian)"),
    ("GodsChurchIdentified", "认明上帝的教会 (God's Church Identified)"),
    ("ProphetsandProphecy", "先知与预言 (Prophets and Prophecy)"),
    ("HolySpiritandUnpardonable", "圣灵与不得赦免的罪 (Holy Spirit and Unpardonable Sin)"),
    ("FromDisappointment", "从失望到胜利 (From Disappointment to Triumph)"),
    ("TheUnitedStatesinProphecy", "预言中的美国 (The United States in Prophecy)"),
    ("RevelationsGloriousClimax", "启示录的辉煌结局 (Revelation's Glorious Climax)"),
]

def norm(s):
    s = re.sub(r'\(cid:\d+\)', '', s)
    s = re.sub(r'[\s\-–—:：;；\'’‘“”?？!！.。]', '', s)
    return s

def main():
    pages = read_pages(SRC)
    # 收集所有页眉行 (page_idx, raw_title_after_number)
    headers = []
    for i in range(1, len(pages)):
        for x0, t in pages[i]:
            s = t.strip()
            m = re.match(r'^(\d+)([A-Za-z].{4,})$', s)
            if m and len(s) < 50 and not re.search(r'[;:,/=]', m.group(2)):
                headers.append((i, norm(m.group(2))))
    # 为每个单元找起始页
    unit_starts = []
    used_pages = set()
    for eng, cn in UNITS:
        found = None
        for i, key in headers:
            if i in used_pages: continue
            if eng in key or key.startswith(eng[:12]):
                found = i; break
        if found is not None:
            used_pages.add(found)
            unit_starts.append((found, cn))
    unit_starts.sort()
    print("识别单元:", len(unit_starts))

    content = []
    for i in range(1, len(pages)):
        for x0, t in pages[i]:
            s = t.strip()
            if not s: continue
            if 'NOTES' in s or s in ('Name', 'Address', 'EmailTel') or 'Gateway Centre' in s or 'Pelham Street' in s or 'For more information' in s:
                continue
            content.append((i, x0, s))

    lessons = []
    for k, (start_pg, title) in enumerate(unit_starts):
        end_pg = unit_starts[k+1][0] if k+1 < len(unit_starts) else len(pages)
        block = [s for pgi, x0, s in content if start_pg <= pgi < end_pg]
        block = [s for s in block if not re.match(r'^\d+[A-Za-z].{4,}$', s)]
        lessons.append({
            "number": k+1, "id": f"lesson-{k+1}", "title": title,
            "memoryVerse": "", "sections": [{"heading": "", "text": ' '.join(block).strip()}], "quiz": [],
        })
    course = {"id": "xunzhao-queju", "title": "寻找确据", "subtitle": "中英双语圣经课程",
              "source": "Gateway Centre", "totalLessons": len(lessons), "lessons": lessons}
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved", OUT)
    for l in lessons:
        print(f"  {l['number']:>2}. {l['title'][:30]:<30} {len(l['sections'][0]['text'])}字")

if __name__ == '__main__':
    main()
