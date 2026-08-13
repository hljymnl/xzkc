# -*- coding: utf-8 -*-
"""《要道入门》PDF -> 结构化 JSON（正文小节 + 每课作业考题）"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

SRC = "/Users/macbook/Documents/Codex/2026-08-13/https-www-sdabible-org-egwbook-https/outputs/sdabible.org全站/05_杂志/查经课/0359_要道入门.pdf"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/yaodao-rumen.json"

CN_NUM = {"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,
          "十一":11,"十二":12,"十三":13,"十四":14,"十五":15,"十六":16,"十七":17,"十八":18,
          "十九":19,"二十":20,"二十一":21,"二十二":22,"二十三":23,"二十四":24,"二十五":25}
HEAD_RE = re.compile(r'^第\s*([一二三四五六七八九十]+)课\s*(.*)$')

# 人工校对的正文小标题（含缺字修正）
HEADINGS = {
    "真神只有一位","真神的明证","真神是人类的天父",
    "圣经的作者","圣经的功能","研读圣经的益处",
    "创造的过程","创造主的杰作","创造的纪念日","未堕落前的快乐生活",
    "魔鬼的来源","堕落的经过","得救的不二法门","救主的诞生",
    "救主奉献为圣","博士前来朝拜救主","救主受洗","救主受的试探","救主的使命",
    "基督再来的应许","基督再来的情形","基督再来的预兆",
    "生与死","人死后的情形","复活的希望",
    "审判的标准","审判的根据",
    "十条诫命","律法的真义","律法的功用","律法的永恒性",
    "安息日的设立","守安息日诫命的颁布","守安息日的范例","守安息日的重要性","守安息日的正法",
    "与上帝相交的正法祈祷","祈祷的意义","祈祷的功能","祈祷得蒙应允的条件",
    "洗礼","谦卑礼","圣餐礼",
    "什一制的订立","十分之一的用途","万物的主权属于上帝","忠心奉献之福",
    "节制与饮食之道","洁与不洁之物","烟酒对健康的危害","保持健康的重要",
    "上帝造新天新地的原因","新天新地的情形","人类的希望",
}

def is_footer(s):
    if re.match(r'^·\d+·', s): return True
    if re.match(r'^第[一二三四五六七八九十]+课.*·\d+·$', s): return True
    return False

def main():
    pages = read_pages(SRC)
    hw_pn = None
    promo_pn = None
    for i, pl in enumerate(pages):
        joined = ' '.join(t for _, t in pl)
        if hw_pn is None and ('要道入门作业' in joined or 'YAODAO' in joined):
            hw_pn = i
        if promo_pn is None and '亲爱的朋友' in joined and i > 2:
            promo_pn = i
    content_end = min(hw_pn, promo_pn) if (hw_pn and promo_pn) else (hw_pn or promo_pn)
    print("homework starts page idx:", hw_pn, "| promo page idx:", promo_pn, "| content_end:", content_end)

    # ---------- 正文 ----------
    lessons = []
    cur = None
    def flush():
        nonlocal cur
        if cur is not None: lessons.append(cur); cur = None
    for pn in range(2, content_end):
        for x0, t in pages[pn]:
            s = t.strip()
            if not s or is_footer(s): continue
            if s.startswith('亲爱的朋友') or s.startswith('□') or '欢迎您' in s: continue
            if '(cid:' in s or '\ufffd' in s: continue
            m = HEAD_RE.match(s)
            if m and s[0] == '第' and len(s) < 40 and m.group(2).strip():
                num = CN_NUM.get(m.group(1))
                if num:
                    flush()
                    cur = {"number": num, "title": m.group(2).strip(), "memory": None, "lines": []}
                    continue
            if cur is not None:
                cur["lines"].append((x0, s))
    flush()
    lessons.sort(key=lambda x: x["number"])
    print("lessons:", [l['number'] for l in lessons])

    for l in lessons:
        lines = l['lines']
        # 存心节（可跨行）
        mem_lines, rest = [], []
        i = 0
        while i < len(lines):
            x0, s = lines[i]
            if s.startswith('存心节') and not mem_lines:
                mem_lines.append(re.sub(r'^存心节[:：]?\s*', '', s))
                j = i + 1
                while j < len(lines) and not re.search(r'[）)]\s*$|[。！？]\s*$', mem_lines[-1]):
                    mem_lines.append(lines[j][1]); j += 1
                i = j; continue
            rest.append((x0, s)); i += 1
        l['memory'] = ''.join(mem_lines).strip()
        # 组装小节
        sections = []
        cur_text, cur_head = None, ''
        def flush_sec():
            nonlocal cur_text
            if cur_text is not None:
                sections.append({"heading": cur_head, "text": cur_text.strip()})
                cur_text = None
        for x0, s in rest:
            if s in HEADINGS:
                flush_sec(); cur_head = s; cur_text = ''
            else:
                if cur_text is None: cur_text = ''
                cur_text += s
        flush_sec()
        l['sections'] = [s for s in sections if s['text'] or s['heading']]
        l.pop('lines', None)

    # ---------- 作业 ----------
    hw_blocks = []
    cur_hw = None
    for pn in range(hw_pn, len(pages)):
        for x0, t in pages[pn]:
            s = t.strip()
            if not s or is_footer(s): continue
            if '要道入门作业' in s or 'YAO' in s or '耶稣说' in s or '若不借着我' in s: continue
            m = HEAD_RE.match(s)
            if m and s[0] == '第' and len(s) < 40 and m.group(2).strip():
                num = CN_NUM.get(m.group(1))
                if num:
                    if cur_hw: hw_blocks.append(cur_hw)
                    cur_hw = {"number": num, "lines": []}
                    continue
            if cur_hw is not None:
                cur_hw["lines"].append(s)
    if cur_hw: hw_blocks.append(cur_hw)
    # 合并同课块
    merged = {}
    for h in hw_blocks:
        merged.setdefault(h['number'], []).extend(h['lines'])
    print("homework lessons:", sorted(merged.keys()))

    def parse_questions(lines):
        groups = []
        cur = None
        for s in lines:
            m = re.match(r'^[（(]([甲乙丙丁戊])[)）]\s*(.*)$', s)
            m2 = re.match(r'^(是非题|选择题|填充题|填充|思考题|判断题)[:：]?\s*(.*)$', s)
            if m:
                if cur: groups.append(cur)
                cur = {"label": m.group(2).strip(), "items": []}
            elif m2 and (m2.group(1) != '思考题' or not cur):
                if cur: groups.append(cur)
                cur = {"label": s, "items": []}
            elif cur is not None:
                cur["items"].append(s)
        if cur: groups.append(cur)
        out = []
        for g in groups:
            lab = g['label']
            if '填充' in lab or '空白' in lab:
                qtype = 'fill'
            elif '是非' in lab or '划去' in lab or '对的句子' in lab or '选择' in lab or '答案' in lab or '判断' in lab:
                qtype = 'choice'
            elif '思考' in lab:
                qtype = 'open'
            else:
                qtype = 'other'
            text = ''.join(g['items'])
            parts = re.split(r'(?=[（(][一二三四五六七八九十]+[)）]|\d+[\.、．])', text)
            qs = []
            for q in parts:
                q = q.strip()
                if len(q) < 2: continue
                if re.fullmatch(r'[）)]*[号]?[）)]*', q): continue
                q = re.sub(r'（\s*）', '（　　）', q)
                q = re.sub(r'_+\s*$', '', q)
                if len(q) >= 2:
                    qs.append(q)
            out.append({"label": lab, "type": qtype, "questions": qs})
        return out

    hw_map = {n: parse_questions(ls) for n, ls in merged.items()}

    course = {
        "id": "yaodao-rumen",
        "title": "要道入门",
        "subtitle": "耶稣说：我就是道路、真理和生命。若不借着我，没有人能到父那里去。",
        "source": "希望之声·圣经函授学校",
        "totalLessons": len(lessons),
        "lessons": []
    }
    for l in lessons:
        l['id'] = f"lesson-{l['number']}"
        l['quiz'] = hw_map.get(l['number'], [])
        course['lessons'].append(l)
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved", OUT)
    for l in course['lessons']:
        secs = len(l['sections'])
        nq = sum(len(g['questions']) for g in l['quiz'])
        print(f"课{l['number']:>2} {l['title']:<12} 节={secs:>2} 题={nq:>3} 存心节={'有' if l['memory'] else '无'}")

if __name__ == '__main__':
    main()
