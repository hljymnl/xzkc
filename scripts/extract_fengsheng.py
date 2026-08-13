# -*- coding: utf-8 -*-
"""《丰盛的生命》PDF -> 结构化 JSON（34课正文 + 每课作业判断题/选择题）
课程边界信号：每课以「一．引言/前言」小节开头，全书恰好 34 个。"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

SRC = "/Users/macbook/Documents/Codex/2026-08-13/https-www-sdabible-org-egwbook-https/outputs/sdabible.org全站/05_杂志/查经课/0160_丰盛的生命.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/fengsheng-shengming.json"

def main():
    pages = read_pages(SRC)
    # 定位作业起始页（第X课 判断题）
    hw_pn = None
    for i in range(200, len(pages)):
        txt = ' '.join(t for _, t in pages[i])
        if '判断题' in txt and '第' in txt:
            hw_pn = i; break
    print("homework starts page idx:", hw_pn)

    # TOC 标题（第1-34课）
    toc = {}
    for i in [3, 4]:
        for x0, t in pages[i]:
            m = re.match(r'^第(\d+)课\s*(.+)$', t.strip())
            if m:
                n = int(m.group(1))
                toc[n] = m.group(2).strip().rstrip('… ')
    print("TOC lessons:", len(toc))

    # 正文行（记录页码）
    content_lines = []  # (pdf_page_idx, x0, text)
    for i in range(5, hw_pn):
        for x0, t in pages[i]:
            s = t.strip()
            if not s or s == '丰盛的生命': continue
            if re.match(r'^\d+\s*$', s): continue
            content_lines.append((i, x0, s))

    # 课程边界：一．引言/前言
    bounds = []
    for idx, (pgi, x0, s) in enumerate(content_lines):
        if re.match(r'^一．\S+$', s):
            bounds.append(idx)
    print("一． 边界数:", len(bounds))
    bounds.append(len(content_lines))

    lessons = []
    for k in range(len(bounds)-1):
        n = k + 1
        block = content_lines[bounds[k]:bounds[k+1]]
        # 记忆经文：一．之前、同一页的行（标题+经文），从后往前取
        yi_idx = bounds[k]
        yi_page = content_lines[yi_idx][0]
        memory_lines = []
        j = yi_idx - 1
        while j >= 0 and content_lines[j][0] == yi_page:
            memory_lines.insert(0, content_lines[j][2])
            j -= 1
        # 去掉开头非经文的短标题行
        while memory_lines and not memory_lines[0].startswith('「') and len(memory_lines[0]) < 12:
            memory_lines.pop(0)
        memory = ''.join(memory_lines).strip()
        if not memory.startswith('「'):
            memory = ''
        # 小节
        sections = []
        cur = None
        for pgi, x0, s in block:
            m = re.match(r'^([一二三四五六七八九十]+)．(.+)$', s)
            if m and len(s) < 40:
                if cur: sections.append({"heading": cur[0], "text": cur[1].strip()})
                cur = [s, '']
            else:
                if cur is None: cur = ['', '']
                cur[1] += s
        if cur: sections.append({"heading": cur[0], "text": cur[1].strip()})
        lessons.append({
            "number": n,
            "title": toc.get(n, f"第{n}课"),
            "memoryVerse": memory,
            "sections": [s for s in sections if s['text'] or s['heading']],
        })
    print("lessons:", len(lessons))

    # ---- 作业 ----
    hw_blocks = []
    cur_hw = None
    for i in range(hw_pn, len(pages)):
        for x0, t in pages[i]:
            s = t.strip()
            if not s or '填答试题' in s or s == '丰盛的生命': continue
            m = re.match(r'^第(\d+)课\s*(.*)$', s)
            if m and len(s) < 30:
                if cur_hw: hw_blocks.append(cur_hw)
                cur_hw = {"number": int(m.group(1)), "lines": []}
                continue
            if cur_hw is not None:
                cur_hw["lines"].append(s)
    if cur_hw: hw_blocks.append(cur_hw)
    merged = {}
    for h in hw_blocks:
        merged.setdefault(h['number'], []).extend(h['lines'])

    def parse_hw(lines):
        groups = []
        cur = None
        for s in lines:
            m = re.match(r'^(判断题|选择题|填空题|是非题)[:：]?\s*(.*)$', s)
            if m:
                if cur: groups.append(cur)
                cur = {"label": m.group(1), "type": 'choice', "items": []}
            elif cur is not None:
                cur["items"].append(s)
        if cur: groups.append(cur)
        out = []
        for g in groups:
            text = ''.join(g['items'])
            qs = re.split(r'(?=\d+[\.、．])', text)
            qs = [re.sub(r'^[_＿\s]+', '', q.strip()) for q in qs if q.strip() and len(q.strip()) > 2]
            out.append({"label": g['label'], "type": g['type'], "questions": qs})
        return out

    hw_map = {n: parse_hw(ls) for n, ls in merged.items()}
    course = {
        "id": "fengsheng-shengming", "title": "丰盛的生命",
        "subtitle": "高级圣经函授课程 · 34课", "source": "希望之声·圣经函授学校",
        "totalLessons": len(lessons), "lessons": []
    }
    for l in lessons:
        l['id'] = f"lesson-{l['number']}"
        l['quiz'] = hw_map.get(l['number'], [])
        course['lessons'].append(l)
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved", OUT)
    total = sum(len(s['text']) for l in lessons for s in l['sections'])
    print("总字数:", total)
    for l in lessons:
        nq = sum(len(g['questions']) for g in l['quiz'])
        print(f"课{l['number']:>2} {l['title'][:10]:<10} 节={len(l['sections']):>2} 题={nq} 存心节={'有' if l['memoryVerse'] else '无'}")

if __name__ == '__main__':
    main()
