# 小组互动课程平台

成人小组互动查经课程：**音频播放（Edge 神经语音）+ 问答测验 + 进度打卡**，手机 / 电脑响应式（PWA，可添加到主屏幕离线使用）。

## 当前进度

- ✅ 试点课程：《要道入门》（希望之声·圣经函授学校）17 课全部上线
  - 17 课正文解析为结构化内容（小节 + 存心节）
  - 每课作业解析为考题：是非题 / 选择题 / 填充题 / 思考题
  - **390 段 Edge 神经语音音频**（约 50MB）：正文=晓晓(女声)，存心节=云希(男声)
  - 第 1 课附人工整理的答案（演示自动判分），其余课答案可逐步补充
- ✅ 核心功能
  - 音频播放器：后台播放、锁屏控制(Media Session)、倍速(0.75/1/1.25/1.5×)、断点续播、进度条拖动
  - 文字同步：正文按段高亮，当前播放段落自动滚动
  - 测验：自动判分（有答案时）+ 参考答案展示（提交后）
  - 学习进度：本地存储，课程完成度、本课收听进度
  - PWA：离线缓存课程数据与音频，可"添加到主屏幕"

## 目录结构

```
app/                    Next.js 页面（首页 / 课程 / 单课播放器）
components/             播放器 / 测验 / 进度条组件
data/courses/           解析出的课程 JSON（含音频清单）
data/answers/           人工整理的标准答案（逐步补充）
public/audio/           edge-tts 生成的音频
public/courses/         前端加载的课程 JSON 副本
scripts/
  pdf_reader.py         按坐标重建 PDF 阅读顺序（两栏）
  extract_yaodao.py     要道入门 PDF → JSON
  tts_generate.py       edge-tts 音频生成（--lessons 1-17）
  add_answers.py        合并答案进课程 JSON
```

## 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 生产构建
```

## 数据处理管线（按顺序执行）

```bash
python3 scripts/extract_yaodao.py            # 1. PDF → 结构化 JSON
python3 scripts/add_answers.py               # 2. 合并人工答案（data/answers/yaodao-rumen.json）
python3 scripts/convert_fill_to_choice.py    # 3. 填空题 → 选择题（选词填空，每空一题）
cp data/courses/yaodao-rumen.json public/courses/   # 4. 同步到前端
```

> 已完成：39 道填空题已转换为 75 道选词填空选择题（答案+干扰选项见 `data/answers/yaodao-fill-choice.json`）。

## 扩展其他教材

其他 5 份 PDF（丰盛的生命 / 圣经人物与你·旧约·新约 / 寻宝查经课 / 寻找确据）流程相同：

1. `scripts/pdf_reader.py` 读取 PDF（自动分栏）
2. 仿照 `extract_yaodao.py` 写抽取脚本（每份教材小标题清单需人工校对）
3. `scripts/tts_generate.py` 生成音频
4. 加入 `app/page.js` 的课程列表（`public/courses/<slug>.json`）

## 截图

见 `docs/screenshots/`（手机/电脑两种视口）。

## 已上线课程（2026-08-13）

| 课程 | 课数 | 音频段 | 说明 |
|------|------|--------|------|
| 要道入门 | 17 | 366 | 初级圣经课（含选择题/是非题/思考题） |
| 丰盛的生命 | 34 | 2064 | 高级圣经课（判断题+选择题） |
| 圣经人物与你·旧约 | 13 | 470 | 人物研经（无考题） |
| 圣经人物与你·新约 | 8 | 358 | 人物研经（无考题） |
| 寻宝查经课 | 21 | 2403 | 圣经真理探索（正文为主） |

- 线上地址：https://lqjymnl2026.github.io/xiaozu-kecheng/
- 音频由 edge-tts 生成（晓晓/云希），源码仓库不含音频（public/audio 已 gitignore，可用 `scripts/tts_generate.py` 再生成；部署分支 gh-pages 含全部音频）
- 《寻找确据》（中英双语工作本）版式复杂，待后续专门处理
