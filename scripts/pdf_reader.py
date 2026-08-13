# -*- coding: utf-8 -*-
"""按坐标重建 PDF 阅读顺序（两栏：左栏→右栏，栏内各自按 top 排序）。
返回每页的行列表 [(x0, text)]"""
import pdfplumber
from collections import defaultdict

def read_pages(path, page_range=None):
    out = []
    with pdfplumber.open(path) as pdf:
        rng = range(len(pdf.pages)) if page_range is None else page_range
        for pn in rng:
            page = pdf.pages[pn]
            words = page.extract_words(use_text_flow=False, keep_blank_chars=False, x_tolerance=2)
            W = page.width
            sides = {'left': [], 'right': []}
            for w in words:
                side = 'left' if w['x0'] < W / 2 else 'right'
                sides[side].append(w)
            page_lines = []
            for side in ('left', 'right'):
                ws = sides[side]
                lines = defaultdict(list)
                for w in ws:
                    key = round(w['top'] / 3.5)
                    lines[key].append(w)
                for key in sorted(lines):
                    lws = sorted(lines[key], key=lambda w: w['x0'])
                    text = ''.join(w['text'] for w in lws)
                    page_lines.append((lws[0]['x0'], text))
            out.append(page_lines)
    return out
