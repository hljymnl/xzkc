'use client';

// 后台管理数据（保存在组长本机）：密码 / 学员上报汇总 / 组长回应
const A = 'xz-admin:v1:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(A + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(A + key, JSON.stringify(val)); } catch {}
}

// ---------- 密码 ----------
export const DEFAULT_PASS = 'xzkc2026'; // 可在后台设置里修改
export function getPass() {
  try { return localStorage.getItem(A + 'pass') || DEFAULT_PASS; } catch { return DEFAULT_PASS; }
}
export function setPass(p) { write('pass', p); }

// ---------- 学员汇总 ----------
export function getLearners() { return read('learners', []); }
export function saveLearners(list) { write('learners', list); }

// 合并一份学员上报（按 uid 合并；同 uid 后到覆盖旧值）
export function mergeLearnerReport(rep) {
  if (!rep || !rep.profile || !rep.profile.uid) return { ok: false, msg: '数据格式不正确' };
  const list = getLearners();
  const uid = rep.profile.uid;
  const now = new Date().toISOString();
  const existing = list.find((l) => l.uid === uid);
  const base = existing || {
    uid, firstSeen: now,
    progress: {}, quiz: {}, shares: {}, voice: {}, name: uid,
  };
  // 合并进度/测验/分享/语音
  for (const k in (rep.progress || {})) base.progress[k] = rep.progress[k];
  for (const k in (rep.quiz || {})) base.quiz[k] = rep.quiz[k];
  for (const k in (rep.shares || {})) base.shares[k] = rep.shares[k];
  for (const k in (rep.voice || {})) base.voice[k] = rep.voice[k];
  base.name = rep.profile.name || uid;
  base.lastReport = rep.profile.exportedAt || now;
  if (existing) {
    const i = list.findIndex((l) => l.uid === uid);
    list[i] = base;
  } else {
    list.push(base);
  }
  saveLearners(list);
  return { ok: true, uid };
}

export function removeLearner(uid) {
  saveLearners(getLearners().filter((l) => l.uid !== uid));
}

// ---------- 组长回应 ----------
export function getComments() { return read('comments', {}); }
export function saveComments(c) { write('comments', c); }
export function addComment(uid, lessonKey, text) {
  const c = getComments();
  (c[uid] = c[uid] || {})[lessonKey] = (c[uid][lessonKey] || []).concat({
    text, at: new Date().toISOString(),
  });
  saveComments(c);
  return c;
}

// ---------- 统计 ----------
export function summarizeLearner(l) {
  let done = 0, quizAnswered = 0, shares = 0, voice = 0;
  for (const slug in (l.progress || {})) done += (l.progress[slug].done || []).length;
  for (const k in (l.quiz || {})) {
    const q = l.quiz[k] || {};
    for (const v of Object.values(q)) if (v !== undefined && String(v).trim() !== '') quizAnswered++;
  }
  for (const k in (l.shares || {})) {
    const s = l.shares[k] || {};
    for (const v of Object.values(s)) {
      if (v && typeof v === 'object' && v.text && v.text.trim()) shares++;
      if (v === true || (v && v.text)) shares++;
    }
    shares = Math.max(shares, Object.keys(s).length); // 每题至少算 1
  }
  voice = Object.keys(l.voice || {}).length;
  return { done, quizAnswered, shares, voice };
}

// ---------- 备份 / 反馈 ----------
export function exportBackup() {
  return JSON.stringify({ type: 'xz-admin-backup', learners: getLearners(), comments: getComments(), at: new Date().toISOString() }, null, 1);
}
export function importBackup(json) {
  try {
    const d = JSON.parse(json);
    if (d.type !== 'xz-admin-backup') return { ok: false, msg: '不是有效的后台备份' };
    saveLearners(d.learners || []);
    saveComments(d.comments || {});
    return { ok: true };
  } catch { return { ok: false, msg: 'JSON 解析失败' }; }
}

// 导出给学员的「组长反馈」
export function exportFeedback(uid) {
  const c = getComments();
  return JSON.stringify({ type: 'xz-leader-feedback', uid, comments: c[uid] || {} }, null, 1);
}
