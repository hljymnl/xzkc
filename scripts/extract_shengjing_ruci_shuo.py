# -*- coding: utf-8 -*-
"""《圣经如此说查经课》25课：每份 PDF 为一课（圣经学习指南：编号问答+填空经文+讲解）"""
import sys, re, json, os, warnings
sys.path.insert(0, '/Users/macbook/Documents/ChatGPT/小组平台/scripts')
from pdf_reader import read_pages
warnings.filterwarnings('ignore')

DIR = "/Users/macbook/Desktop/圣经如此说查经课"
OUT = "/Users/macbook/Documents/ChatGPT/小组平台/data/courses/shengjing-ruci-shuo.json"

def title_from_name(f):
    # "01上帝可信嗎？.pdf" -> "上帝可信嗎？"
    m = re.match(r'^\d+_(.+)\.pdf$', f) or re.match(r'^(\d+)(.+)\.pdf$', f)
    return m.group(2).strip() if m else f.replace('.pdf', '')

def clean(text):
    # 填空题线 ____ 转为占位（避免 TTS 读出奇怪内容）
    text = re.sub(r'_+', '____', text)
    return text.strip()

def main():
    files = sorted(os.listdir(DIR), key=lambda f: int(re.match(r'^(\d+)', f).group(1)) if re.match(r'^(\d+)', f) else 999)
    files = [f for f in files if f.endswith('.pdf')]
    print("PDF 数:", len(files))
    lessons = []
    for n, f in enumerate(files, 1):
        pages = read_pages(f"{DIR}/{f}")
        # 跳过封面（p1），正文从 p2 开始
        lines = []
        for i in range(1, len(pages)):
            for x0, t in pages[i]:
                s = t.strip()
                if not s: continue
                if s in ('NOITARTSINIMDA', '圣经说圣经学习指南'): continue
                lines.append(s)
        text = clean(''.join(lines))
        lessons.append({
            "number": n, "id": f"lesson-{n}", "title": title_from_name(f),
            "memoryVerse": "", "sections": [{"heading": "", "text": text}], "quiz": [],
        })
        print(f"  {n:>2}. {lessons[-1]['title']} ({len(text)}字)")
    course = {
        "id": "shengjing-ruci-shuo", "title": "圣经如此说查经课",
        "subtitle": f"圣经学习指南 · {len(lessons)}课", "category": "查经课程",
        "source": "圣经说圣经学习指南", "totalLessons": len(lessons), "lessons": lessons,
    }
    json.dump(course, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print("saved", OUT)

if __name__ == '__main__':
    main()
