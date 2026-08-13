# -*- coding: utf-8 -*-
"""《寻宝查经课》PDF -> 结构化 JSON（按“第课<标题>”切分，作业暂留空）
注：部分课缺少课标题页眉，会并入相邻课；cid 乱码已尽力清理。"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

SRC = "/Users/macbook/Documents/Codex/2026-08-13/https-www-sdabible-org-egwbook-https/outputs/sdabible.org全站/05_杂志/查经课/0358_寻宝查经课.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/xunbao-chajing.json"
TITLE_FIX = {
    '生命的第二次(cid:7530)会': '生命的第二次机会',
    '耶稣将会多(cid:5659)复临？': '耶稣将会何时复临？',
    '一位(cid:8808)活的救主': '一位复活的救主',
}

def fix_cid(s):
    s = re.sub(r'\(cid:\d+\)', '', s)
    return TITLE_FIX.get(s, s)

def main():
    pages = read_pages(SRC)
    # 收集正文行（排除作业页 DISCOVER / 請回答下列問題 / 作業 / 尋寶）
    content = []
    for i in range(1, len(pages)):
        for x0, t in pages[i]:
            s = t.strip()
            if not s: continue
            if 'DISCOVER' in s or '請回答下列問題' in s or '作業' in s or '尋寶' in s: continue
            if re.match(r'^\d+$', s): continue
            content.append((i, x0, s))
    # 课边界：第课<标题>
    bounds = []
    for idx, (pgi, x0, s) in enumerate(content):
        m = re.match(r'^第课(.{2,22})$', s)
        if m and '…' not in s:
            bounds.append((idx, s))
    # 第2课特殊："第2课我们可以相信《圣经》"
    for idx, (pgi, x0, s) in enumerate(content):
        m = re.match(r'^第2课(.{2,22})$', s)
        if m:
            bounds.append((idx, '第课' + m.group(1)))
    bounds.sort()
    print("课边界数:", len(bounds))
    # 去重（同页同标题）
    uniq = []
    seen = set()
    for idx, s in bounds:
        if idx in seen: continue
        seen.add(idx); uniq.append((idx, s))
    bounds = uniq
    for idx, s in bounds:
        print(f"  idx={idx} {s[:28]}")

    lessons = []
    for k, (idx, header) in enumerate(bounds):
        end = bounds[k+1][0] if k+1 < len(bounds) else len(content)
        block = content[idx:end]
        title = fix_cid(re.sub(r'^第课', '', header)).strip()
        # 小节：短行(≤14字、无标点)作为标题，其余为正文
        sections = []
        cur = None
        def flush():
            nonlocal cur
            if cur is not None:
                sections.append({"heading": cur[0], "text": cur[1].strip()})
                cur = None
        for pgi, x0, s in block:
            if k > 0 and pgi == content[idx][0] and s == header:
                continue  # 跳过课标题行
            if len(s) <= 14 and not re.search(r'[，。！？；：、“”（）()]', s) and not re.match(r'^[=#\d]', s) and '(cid:' not in s and 'http' not in s:
                flush(); cur = [s, '']
            else:
                if cur is None: cur = ['', '']
                cur[1] += s
        flush()
        lessons.append({
            "number": k+1, "id": f"lesson-{k+1}", "title": title,
            "memoryVerse": "", "sections": [s for s in sections if s['text'] or s['heading']], "quiz": [],
        })
    course = {
        "id": "xunbao-chajing", "title": "寻宝查经课", "subtitle": "圣经真理探索 · 27课",
        "source": "希望之声·圣经函授学校", "totalLessons": len(lessons), "lessons": lessons,
    }
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved", OUT)
    total = sum(len(s['text']) for l in lessons for s in l['sections'])
    print("总字数:", total)
    for l in lessons:
        print(f"  课{l['number']:>2} {l['title'][:16]} 节={len(l['sections'])}")

if __name__ == '__main__':
    main()
