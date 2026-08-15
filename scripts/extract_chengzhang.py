# -*- coding: utf-8 -*-
"""《120成长小组对话》PDF(120份) -> 结构化课程 JSON。
每课 = 一次小组聚会流程：目标 / 附加资讯 / 欢迎(团契) / 敬拜 / 上帝的话语(门徒培训) / 操练(事工与传道) / 餐点时间
讨论题(discussion) = 以“？”结尾的分享问题（读书分享核心）。
"""
import re, json, glob, os
import fitz

SRC_DIR = "/Users/macbook/Desktop/小組事工●門徒培訓/小组事工-120成长小组对话/dir"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/chengzhang-120.json"

TITLE_RE = re.compile(r'对话#(\d+)[-—–](.+)$')
AUTHOR_RE = re.compile(r'(牧师|sanddennis|丹尼斯|@)')
GOAL_RE = re.compile(r'^今日对话目标[:：]?\s*(.*)$')
EXTRA_RE = re.compile(r'^附加资讯[:：]?\s*(.*)$')
HEAD_RE = re.compile(r'^(欢迎|敬拜|上帝的话语|操练|操练-见证|餐点时间|见证|分享|祷告|结束)')
MEM_RE = re.compile(r'存心节[《]?([^》。]+)[》]?|《([^》]+)》\s*(\d+:\d+)')

def parse_pdf(path):
    doc = fitz.open(path)
    text = "\n".join(page.get_text() for page in doc)
    lines = [l.strip() for l in text.split('\n')]
    lines = [l for l in lines if l and not l.startswith('http')]

    m = TITLE_RE.search(lines[0]) if lines else None
    number = int(m.group(1)) if m else None
    title = m.group(2).strip() if m else os.path.basename(path)

    goal, extra = None, None
    author = None
    # 找到正文起点（作者行之后）
    start = 0
    for i, l in enumerate(lines):
        if AUTHOR_RE.search(l) and i < 4:
            author = l; start = i + 1
            break
    # 目标 / 附加资讯
    for l in lines[start:start + 4]:
        gm = GOAL_RE.match(l)
        if gm and goal is None: goal = gm.group(1).strip()
        em = EXTRA_RE.match(l)
        if em and extra is None: extra = em.group(1).strip()

    # 分节
    sections = []
    cur_head, cur_text = None, None
    def flush():
        nonlocal cur_head, cur_text
        if cur_head is not None and (cur_text or True):
            sections.append({"heading": cur_head, "text": (cur_text or '').strip()})
        cur_head, cur_text = None, None

    for l in lines[start:]:
        if not l: continue
        # 节标题：形如 “欢迎（15 分钟）——团契” / “操练-见证（15 分钟）——事工与传道” / “餐点时间——团契”
        if re.match(r'^(欢迎|敬拜|上帝的话语|操练|操练-见证|餐点时间)\s*[（(]\s*\d+\s*分钟\s*[)）]', l) or l.startswith('餐点时间——'):
            flush()
            # 规范化标题空格
            h = re.sub(r'\s+', '', l)
            h = h.replace('——', '——')
            cur_head = h
            cur_text = ''
        elif HEAD_RE.match(l) and cur_head is None and len(l) < 30 and ('——' in l or '分钟' in l):
            flush()
            cur_head = re.sub(r'\s+', '', l)
            cur_text = ''
        else:
            if cur_head is None:
                # 标题行前的杂项（如作者行、空白）忽略
                continue
            # 合并跨行：以 · 开头为新项目，否则续接上一项目
            if cur_text:
                cur_text += '\n' + l if l.startswith('·') else l
            else:
                cur_text = l
    flush()
    if not sections and len(lines) > start:
        sections.append({"heading": title, "text": "\n".join(lines[start:])})

    # 存心节：优先取“要这样做/存心节”指定的一节经文（如《以弗所书》5:15）
    memory = None
    all_text = '\n'.join(lines)
    mem_line = None
    for l in lines:
        if '存心节' in l:
            mem_line = l; break
    if mem_line:
        mref = re.search(r'《([^》]+)》\s*(\d+\s*[:：]\s*\d+)', mem_line)
        if mref:
            ref = re.sub(r'\s+', '', mref.group(2))
            memory = "《%s》%s" % (mref.group(1), ref)
    if not memory:
        mref2 = re.search(r'《([^》]+)》\s*(\d+\s*[:：]\s*\d+)', all_text)
        if mref2:
            ref = re.sub(r'\s+', '', mref2.group(2))
            memory = "《%s》%s" % (mref2.group(1), ref)

    # 讨论题 = 以？结尾的项目
    discussion = []
    for sec in sections:
        for bullet in sec['text'].split('\n'):
            b = bullet.strip().lstrip('·').strip()
            if b and b.endswith('？') and len(b) > 4:
                discussion.append(b)
    # 去重保序
    seen, dd = set(), []
    for q in discussion:
        if q not in seen:
            seen.add(q); dd.append(q)
    discussion = dd

    return {
        "number": number, "id": f"lesson-{number}", "title": title,
        "goal": goal, "extra": extra, "author": author,
        "memoryVerse": memory, "sections": sections, "discussion": discussion,
        "quiz": [], "audio": {}
    }

def main():
    files = sorted(glob.glob(os.path.join(SRC_DIR, "*.pdf")),
                   key=lambda f: int(re.search(r'(\d+)', os.path.basename(f)).group(1)))
    lessons = []
    bad = []
    for f in files:
        try:
            l = parse_pdf(f)
            lessons.append(l)
            print(f"课{l['number']} {l['title']} | 节数={len(l['sections'])} 讨论题={len(l['discussion'])} 存心节={'有' if l['memoryVerse'] else '无'}")
        except Exception as e:
            bad.append((os.path.basename(f), str(e)))
            print("ERR", os.path.basename(f), e)
    lessons.sort(key=lambda x: x['number'])
    course = {
        "id": "chengzhang-120", "title": "120成长小组对话",
        "subtitle": "小组读书分享 · 每周一课 · 共120课",
        "source": "丹尼斯·桑德牧师（迈阿密成长小组）",
        "totalLessons": len(lessons), "category": "小组事工",
        "lessons": lessons
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved:", OUT, "| lessons:", len(lessons), "| errors:", len(bad))
    for b in bad: print("  BAD:", b)

if __name__ == '__main__':
    main()
