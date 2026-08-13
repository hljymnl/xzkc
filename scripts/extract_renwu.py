# -*- coding: utf-8 -*-
"""《圣经人物与你》(旧约13篇/新约8篇) -> 结构化 JSON（无考题，按人物成章）"""
import sys, re, json, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

COURSES = [
    ("0166_圣经人物与你(旧约).pdf", "shengjing-renwu-jiuyue", "圣经人物与你·旧约", "13篇旧约圣经人物"),
    ("0167_圣经人物与你(新约).pdf", "shengjing-renwu-xinyue", "圣经人物与你·新约", "8篇新约圣经人物"),
]
OLD_TOC = ["亚当","夏娃","该隐与亚伯","亚伯","拉麦","以诺","挪亚","宁录","亚伯拉罕的前半生","信心之父亚伯拉罕","死里逃生的罗得","柔美安静的以撒","贪恋世俗的以扫"]
NEW_TOC = ["义人约瑟","女性之光—马利亚","开路先锋—约翰","人子耶稣","耶稣基督","彼得","爱的使徒约翰","犹大的悲剧"]
BASE = "/Users/macbook/Documents/Codex/2026-08-13/https-www-sdabible-org-egwbook-https/outputs/sdabible.org全站/05_杂志/查经课"

def norm(s):
    s = re.sub(r'\s+', '', s)
    s = re.sub(r'[—\-·、，。]', '', s)
    return s

def main():
    for fname, slug, title, subtitle in COURSES:
        toc = OLD_TOC if '旧约' in fname else NEW_TOC
        pages = read_pages(f"{BASE}/{fname}")
        content = []
        for i in range(6, len(pages)):
            for x0, t in pages[i]:
                s = t.strip()
                if not s: continue
                if re.match(r'^\d+圣经人物与你', s): continue  # 页眉/页脚
                content.append((i, x0, s))
        page_first = {}
        for idx, (pgi, x0, s) in enumerate(content):
            page_first.setdefault(pgi, idx)
        # 章节起点：页首有居中短标题行（x0>90, len<=9）
        starts = []
        for pgi, idx in page_first.items():
            frags = []
            j = idx
            while j < len(content) and content[j][0] == pgi and len(frags) < 3:
                x0j, sj = content[j][1], content[j][2]
                if len(sj) <= 9 and x0j > 90:
                    frags.append(sj)
                else:
                    break
                j += 1
            if frags and j < len(content) and content[j][2]:
                starts.append((idx, pgi))
        starts.sort(key=lambda x: x[0])
        # 按顺序分配 TOC 标题
        lessons = []
        for n, (idx, pgi) in enumerate(starts):
            if n >= len(toc): break
            lessons.append({"idx": idx, "page": pgi, "title": toc[n]})
        # 若不足，兜底：按标题行精确搜索缺失章节
        if len(lessons) < len(toc):
            existing = set(l['page'] for l in lessons)
            for tname in toc:
                if any(l['title'] == tname for l in lessons): continue
                key = norm(tname)
                for pgi, idx in sorted(page_first.items()):
                    if pgi in existing: continue
                    j = idx; frags = []
                    while j < len(content) and content[j][0] == pgi and len(frags) < 4:
                        x0j, sj = content[j][1], content[j][2]
                        if len(sj) <= 12 and x0j > 90:
                            frags.append(sj)
                        else:
                            break
                        j += 1
                    if key in norm(''.join(frags)):
                        lessons.append({"idx": idx, "page": pgi, "title": tname})
                        existing.add(pgi)
                        break
            lessons.sort(key=lambda x: x["idx"])
        print(f"{title}: 章节起点 {len(starts)} -> 识别 {len(lessons)}")
        out_lessons = []
        for k, l in enumerate(lessons):
            end = lessons[k+1]["idx"] if k+1 < len(lessons) else len(content)
            block = content[l["idx"]:end]
            text = ''.join(s for pgi, x0, s in block if len(s) > 9 or x0 <= 90)
            out_lessons.append({
                "number": k+1, "id": f"lesson-{k+1}", "title": l["title"],
                "memoryVerse": "", "sections": [{"heading": "", "text": text.strip()}], "quiz": [],
            })
        course = {"id": slug, "title": title, "subtitle": subtitle,
                  "source": "希望之声·圣经函授学校", "totalLessons": len(out_lessons), "lessons": out_lessons}
        out = f"/Users/macbook/Documents/ChatGPT/小组平台/data/courses/{slug}.json"
        json.dump(course, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        for l in out_lessons:
            print(f"    {l['number']}. {l['title']} ({len(l['sections'][0]['text'])}字)")

if __name__ == '__main__':
    main()
