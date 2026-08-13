# -*- coding: utf-8 -*-
"""新教材解析：管理我的健康(12)/翠柏(10)/入门查经题(8)/同来研习圣经(条目式)"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

BASE = "/Users/macbook/Documents/Codex/2026-08-13/new-chat-3/outputs/共享资源库/查经课程/查经课"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses"
CN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12}

def norm(s):
    s = re.sub(r'\s+', '', s)
    s = re.sub(r'[—─\-–·、，。！？]', '', s)
    return s

def save(slug, title, subtitle, lessons):
    course = {"id": slug, "title": title, "subtitle": subtitle, "source": '希望之声·圣经函授学校',
              "totalLessons": len(lessons), "lessons": lessons}
    json.dump(course, open(f"{OUT}/{slug}.json", 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"saved {slug}: {len(lessons)} 课")

def collect(pages, start=0, end=None, skip=()):
    out = []
    for i in range(start, min(end or len(pages), len(pages))):
        for x0, t in pages[i]:
            s = t.strip()
            if not s: continue
            if any(k in s for k in skip): continue
            out.append((i, x0, s))
    return out

def lessons_from_titles(content, titles, skip_titles=()):
    """按目录标题在正文中定位课起点（标题独立成行）"""
    lessons = []
    used = set()
    for n, title in titles:
        key = norm(title)
        found = None
        for idx, (pgi, x0, s) in enumerate(content):
            if idx in used: continue
            sk = norm(s)
            if sk == key or (key in sk and len(s) < len(title) + 8) or (sk in key and len(s) >= 4):
                found = idx; break
        if found is not None:
            used.add(found)
            lessons.append({"idx": found, "title": title})
        else:
            print(f"  未找到标题: {title}")
    lessons.sort(key=lambda x: x['idx'])
    return lessons

def finalize(lessons, content, memory_on_page=False):
    out = []
    for k, l in enumerate(lessons):
        end = lessons[k+1]['idx'] if k+1 < len(lessons) else len(content)
        block = content[l['idx']:end]
        # 记忆经文：起点页里标题之后的「...」/ 存心节行
        memory = ''
        body = []
        for pgi, x0, s in block:
            m = re.match(r'^存心节[:：]?\s*(.+)$', s)
            if m and not memory:
                memory = m.group(1); continue
            if s.startswith('「') and not memory and len(s) < 60:
                memory = s; continue
            body.append(s)
        # 小节
        sections = []
        cur = None
        for s in body:
            if len(s) <= 14 and not re.search(r'[，。！？；：、“”（）()]', s) and not re.match(r'^\d', s):
                if cur: sections.append({"heading": cur[0], "text": cur[1].strip()})
                cur = [s, '']
            else:
                if cur is None: cur = ['', '']
                cur[1] += s
        if cur: sections.append({"heading": cur[0], "text": cur[1].strip()})
        out.append({"number": k+1, "id": f"lesson-{k+1}", "title": l['title'],
                    "memoryVerse": memory, "sections": [s for s in sections if s['text'] or s['heading']], "quiz": []})
    return out

def main():
    # ===== 管理我的健康：目录标题 12 课 =====
    pages = read_pages(f"{BASE}/管理我的健康.pdf")
    toc = []
    for x0, t in pages[2]:
        m = re.match(r'^第(\d+)课(.+)$', t.strip())
        if m and '…' not in t:
            toc.append((int(m.group(1)), m.group(2).strip().rstrip('—-')))
    toc.sort()
    content = collect(pages, start=4)
    lessons = lessons_from_titles(content, toc)
    out = finalize(lessons, content)
    save('guanli-wode-jiankang', '管理我的健康', f'健康生活圣经课程 · {len(out)}课', out)
    for l in out: print(f"  课{l['number']}: {l['title'][:18]} ({len(l['sections'])}节 {l['memoryVerse'][:10]})")

    # ===== 翠柏：第一课X 标题 + 存心节 =====
    pages = read_pages(f"{BASE}/翠柏.pdf")
    content = collect(pages, start=5)
    lessons = []
    for idx, (pgi, x0, s) in enumerate(content):
        m = re.match(r'^第([一二三四五六七八九十]+)课(.+)$', s)
        if m and len(s) < 30:
            lessons.append({"idx": idx, "title": m.group(2).strip()})
    lessons.sort(key=lambda x: x['idx'])
    out = finalize(lessons, content)
    save('cuibai', '翠柏', f'老年人健康要诀 · {len(out)}课', out)
    for l in out: print(f"  课{l['number']}: {l['title'][:18]} ({len(l['sections'])}节 存心节={'有' if l['memoryVerse'] else '无'})")

    # ===== 入门查经题：按人工确认的题名定位 =====
    pages = read_pages(f"{BASE}/入门查经题.pdf")
    content = collect(pages, start=1)
    q_titles = ["如何明白何为人生正道？", "如何知道谁是真正的神？", "上帝如何与我们沟通？",
                "我们如何与上帝沟通？", "为什么世界上会存在罪恶与败坏的事情呢？",
                "相信上帝以后，我们如何经历一种崭新的、最幸福的生活？",
                "我们如何明白死后会发生什么？这个世界会不会终结？"]
    lessons = []
    for t in q_titles:
        key = norm(t)
        for idx, (pgi, x0, s) in enumerate(content):
            if key in norm(s) and len(s) < 40:
                lessons.append({"idx": idx, "title": t})
                break
    lessons.sort(key=lambda x: x['idx'])
    out = finalize(lessons, content)
    save('rumen-chajing', '入门查经题', f'查经问答入门 · {len(out)}课', out)
    for l in out: print(f"  课{l['number']}: {l['title'][:22]} ({len(l['sections'])}节)")

    # ===== 同来研习圣经：目录标题匹配（过滤纯数字页码） =====
    pages = read_pages(f"{BASE}/同来研习圣经.pdf")
    toc_titles = []
    for i in [5, 6, 7, 8]:
        for x0, t in pages[i]:
            s = t.strip()
            m = re.match(r'^(\d+)[.．]?\s*(.{2,26})$', s)
            if m and '…' not in s and not s.startswith(('CONTENTS','目录')) and '部分' not in s:
                title = m.group(2).strip()
                if not re.fullmatch(r'\d+', title) and '圣经人物与你' not in title:
                    toc_titles.append(title)
    seen = set(); toc2 = []
    for t in toc_titles:
        if t not in seen: seen.add(t); toc2.append(t)
    content = collect(pages, start=9)
    lessons = lessons_from_titles(content, [(i+1, t) for i, t in enumerate(toc2)])
    # 同来研习圣经：整篇为一个节（避免把经文引用当标题拆烂）
    out = []
    for k, l in enumerate(lessons):
        end = lessons[k+1]['idx'] if k+1 < len(lessons) else len(content)
        text = ''.join(s for _, _, s in content[l['idx']:end])
        out.append({"number": k+1, "id": f"lesson-{k+1}", "title": l['title'],
                    "memoryVerse": "", "sections": [{"heading": "", "text": text.strip()}], "quiz": []})
    save('tonglai-yanxi', '同来研习圣经', f'实用注释资料手册 · {len(out)}课', out)
    for l in out: print(f"  课{l['number']}: {l['title'][:22]} ({len(l['sections'])}节)")

if __name__ == '__main__':
    main()
