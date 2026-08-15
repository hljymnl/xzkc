# 小组互动课程平台

教会小组「读书分享式」线上课程：**听/读课程 + 小组讨论分享 + 问答测验 + 学习记录 + 语音**，手机 / 电脑响应式（PWA，可添加到主屏幕离线使用）。

## 课程体系

### 👥 小组事工（读书分享式 · 新增）
| 课程 | 课数 | 说明 |
|------|------|------|
| 120成长小组对话 | 120 | 每周一课的小组聚会流程（欢迎/敬拜/上帝的话语/操练/餐点），含讨论分享题与存心节；第 1–12 课配 Edge 神经语音音频 |
| 四十天合意复兴祷告 | 40 | 每天遇见主耶稣的 40 天灵修操练，每天经文 + 灵修正文 + 思考问题 |
| 门训关怀·雅各书小组查经 | 9 | Gateway 门训中心教学材料，开放/挖掘/回应三段式小组查经 |

> 全部 169 课都支持「🔊 朗读」（网页语音合成，无需下载音频）+ 每课 10 道自动测验 + 读书分享（文字/语音留言）。

### 📖 查经课程 / 人物研经 / 健康生活（原有）
圣经如此说(25，独立栏目) · 要道入门(17) · 丰盛的生命(34) · 寻宝查经课(21) · 入门查经题(7) · 同来研习圣经(7) · 圣经人物与你·旧约(13) / 新约(8) · 翠柏(10) · 管理我的健康(12)

## 核心功能

- **音频播放器**：Edge 神经语音（晓晓女声/云希男声）、后台播放、锁屏控制(Media Session)、倍速(0.75–1.5×)、断点续播、进度条拖动
- **朗读模式**：无音频课程点任意一行即读、可连续朗读全课（speechSynthesis，全站课程都有语音）
- **读书分享**：每课讨论题卡片 + 文字回应 + 🎤 语音留言（录音保存本机，可回听/删除）
- **测验**：每课 10 道选择题（自动判分 + 参考答案），错题可重做
- **学习记录**：本机保存课程完成度、收听/阅读进度、测验记录、分享记录；阅读挑战（连续天数/积分）
- **PWA**：离线缓存课程数据与音频，可"添加到主屏幕"

## 目录结构

```
app/                    Next.js 页面（首页 / 课程 / 单课播放器）
components/             播放器 / 测验 / 读书分享 / 进度组件
lib/                    课程读取 / 本地存储 / 语音录音(IndexedDB)
data/courses/           解析出的课程 JSON（含测验与音频清单）
public/audio/           edge-tts 生成的音频（gitignore，部署分支含全部）
public/courses/         前端加载的课程 JSON 副本
scripts/
  extract_chengzhang.py 《120成长小组对话》120 份 PDF → JSON（含讨论题/存心节）
  extract_sishi_tian.py 《四十天合意复兴祷告》→ JSON（40 天）
  extract_yage.py       《门训关怀·雅各书研究》→ JSON（9 课）
  generate_quiz.py      每课自动生成 10 道选择题（jieba 分词选词填空）
  tts_generate.py       edge-tts 音频生成（COURSE_SLUG=xx --lessons 1-12）
  rebuild_manifest.py / deploy_ghpages.sh  构建与部署
```

## 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 生产构建（静态导出到 out/）
```

## 新增课程处理管线

```bash
# 1. PDF → 结构化 JSON（含 discussion 讨论题、memoryVerse 存心节）
python3 scripts/extract_chengzhang.py
python3 scripts/extract_sishi_tian.py
python3 scripts/extract_yage.py

# 2. 自动生成测验（每课 10 道选择题）
python3 scripts/generate_quiz.py

# 3. 生成语音（试点 1-12 课；其余课可用网页朗读）
COURSE_SLUG=chengzhang-120 python3 scripts/tts_generate.py --lessons 1-12

# 4. 同步到前端 + 构建
cp data/courses/*.json public/courses/
pnpm build
```

## 后台管理（组长端）

- 地址：`https://hljymnl.github.io/xzkc/admin`（默认密码 `xzkc2026`，登录后可修改）
- **查看学习情况**：可看到每位学员的完成课数、答题数、分享数、语音留言数
- **读书分享**：逐课查看学员的文字分享与语音留言（可在线播放）
- **组长回应**：对每课分享写回应，可导出「组长反馈」文件，或通过自动同步直接推送给学员
- **学员上报**：学员在首页点「📤 上报我的记录」导出 JSON 发给组长导入；或开启自动同步后自动汇总

### ☁️ 自动同步（可选，推荐）
让学员的分享内容与录音**自动**汇总到后台，无需手动导出/导入：

1. 免费建一个 Firebase 实时数据库（2 分钟）：
   - 打开 https://console.firebase.google.com/ → 新建项目（可关掉 Google Analytics）→ 「Realtime Database」→「创建数据库」→ 选任意区域 → 测试模式
   - 复制数据库地址，形如 `https://你的项目名-default-rtdb.firebaseio.com/`
2. 组长：后台 →「设置」→「☁️ 自动记录学员数据」→ 粘贴地址 →「开启自动同步」（每 5 秒自动汇总学员数据）
3. 学员：首页 →「☁️ 同步设置」→ 粘贴同一地址 →「保存」（之后分享/录音/测验/完成会自动上传）
4. 组长回应会自动推送给学员；学员在「💌 组长反馈」页自动看到

> 也可把地址直接写入 `lib/sync.js` 的 `SYNC_URL`（构建期内置），学员无需手动设置。
> 上线前建议把 Firebase 规则改为「仅认证用户可读写」并开启匿名登录，避免数据公开可写。

## 部署

- 线上地址：https://hljymnl.github.io/xzkc/
- 脚本：`scripts/deploy_ghpages.sh`（构建 out/ 推送到 gh-pages 分支）
- 源码仓库不含音频（public/audio 已 gitignore），部署分支含全部音频

## 后续可做（创意清单）

1. 为《120成长小组对话》剩余 108 课批量生成 Edge 语音音频（脚本已就绪）
2. 组长端：查看组员学习/分享进度、布置每周课程
3. 分享卡片：生成金句/学习报告卡片分享到微信群
4. 每日一句：推送存心节语音卡片
5. 聚会模式：投影大屏，现场一起答题讨论
