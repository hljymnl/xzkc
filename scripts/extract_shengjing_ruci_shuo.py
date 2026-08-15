# -*- coding: utf-8 -*-
"""《圣经如此说查经课》25 份 PDF -> 结构化课程 JSON。
每课结构：导言 + 多组「问题→经文→带空经文→讲解」+ 三点要道 + 结尾应用 + 复习问答。
经文中的填空线（___/______）转换为（　　），保留研经填空原貌。
"""
import re, json, glob, os
import fitz

SRC_DIR = "/Users/macbook/Desktop/圣经如此说查经课"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/shengjing-ruci-shuo.json"

REF_RE = re.compile(r'[（(]?[^（(\n]{0,12}章\s*\d+\s*节')
NUM_RE = re.compile(r'^\d{1,3}$')
BLANK_RE = re.compile(r'_+')

def clean(s):
    s = s.replace('\x7f', '').replace('\xa0', ' ').strip()
    s = re.sub(r'\s+', ' ', s)
    return s

def parse_pdf(path):
    doc = fitz.open(path)
    lines = []
    for i in range(1, len(doc)):  # 跳过封面
        for l in doc[i].get_text().split('\n'):
            s = clean(l)
            if s:
                lines.append(s)
    # 标题 = 文件名去序号
    base = os.path.basename(path)[:-4]
    m = re.match(r'^\d+\s*(.*)$', base)
    title = m.group(1).strip() if m else base
    title = title.replace('？', '？').replace('嗎', '嗎')

    sections = []
    cur_head, cur_text = None, ''
    discussion = []

    def flush():
        nonlocal cur_head, cur_text
        if cur_head is not None:
            sections.append({"heading": cur_head, "text": cur_text.strip()})
        cur_head, cur_text = None, ''

    i = 0
    while i < len(lines):
        l = lines[i]
        if NUM_RE.match(l) or l.startswith('©') or 'THINKSTOCK' in l.upper():
            i += 1; continue
        # 三点要道
        if '三点要道' in l or re.match(r'^三点', l):
            flush()
            cur_head = '三点要道'
            cur_text = ''
            i += 1; continue
        # 复习问答（»）
        if l.startswith('»') or '圣经如何将' in l:
            flush()
            cur_head = '复习与思考'
            cur_text = l.lstrip('» ').strip()
            i += 1; continue
        # 问题 + 紧跟经文引用 -> 新 Q&A 节
        is_q = l.endswith('？') or l.endswith('?')
        next_ref = (i + 1 < len(lines) and REF_RE.search(lines[i + 1])) or \
                   (i + 2 < len(lines) and REF_RE.search(lines[i + 2]))
        if is_q and next_ref:
            flush()
            cur_head = l
            cur_text = ''
            i += 1; continue
        if is_q and not next_ref:
            # 独立问句（如结尾应用问题）收进讨论
            if cur_head == '三点要道' or len(l) > 8:
                discussion.append(l)
        # 归入当前节
        if cur_head is None:
            cur_head = title  # 导言
        cur_text += ('' if not cur_text else '') + ('' if cur_text and cur_text[-1] in '。！？）”"』「' else '') + l
        i += 1
    flush()

    # 整理：正文填空转（　　）；讨论题去重
    for sec in sections:
        sec['text'] = BLANK_RE.sub('（　　）', sec['text'])
    # 每节 heading 去重（同问题出现多次时只留一次内容完整拼合）
    merged = []
    for sec in sections:
        if merged and merged[-1]['heading'] == sec['heading']:
            merged[-1]['text'] += ('\n' if merged[-1]['text'] else '') + sec['text']
        else:
            merged.append(sec)
    sections = merged

    seen, dd = set(), []
    for q in discussion:
        q = q.strip()
        if q and q not in seen:
            seen.add(q); dd.append(q)
    discussion = dd

    return {"number": int(os.path.basename(path)[:2]), "id": f"lesson-{int(os.path.basename(path)[:2])}",
            "title": title, "goal": None, "extra": None, "memoryVerse": None,
            "sections": sections, "discussion": discussion, "quiz": [], "audio": {}}

def main():
    files = sorted(glob.glob(os.path.join(SRC_DIR, '*.pdf')),
                   key=lambda f: int(os.path.basename(f)[:2]))
    lessons, bad = [], []
    for f in files:
        try:
            l = parse_pdf(f)
            lessons.append(l)
            print(f"课{l['number']} {l['title']} | 节数={len(l['sections'])} 讨论题={len(l['discussion'])} 字数={sum(len(s['text']) for s in l['sections'])}")
        except Exception as e:
            bad.append((os.path.basename(f), str(e)))
    lessons.sort(key=lambda x: x['number'])
    course = {"id": "shengjing-ruci-shuo", "title": "圣经如此说查经课",
              "subtitle": "圣经学习指南 · 25课", "source": "圣经说·圣经学习指南",
              "totalLessons": len(lessons), "category": "查经课程", "lessons": lessons}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved:", OUT, "| lessons:", len(lessons), "| errors:", len(bad))
    for b in bad: print("  BAD:", b)

if __name__ == '__main__':
    main()
