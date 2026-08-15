'use client';
import { buildLearnerReport } from '@/lib/report';

// 自动同步引擎（Firebase Realtime Database via REST，无需 SDK）
// 两种启用方式：
//  1. 构建期内置：把下方 SYNC_URL 填成你的 Firebase 数据库地址（如 https://xxx-default-rtdb.firebaseio.com/），学员无需任何操作
//  2. 运行时设置：学员在「☁️ 同步设置」粘贴地址；组长在后台「设置」里粘贴同一地址
export const SYNC_URL = '';

const KEY = 'xz-sync:v1:url';
const ADMIN_KEY = 'xz-admin:v1:syncUrl';

export function getSyncUrl() {
  if (SYNC_URL) return SYNC_URL;
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function setSyncUrl(u) {
  try { localStorage.setItem(KEY, (u || '').trim()); } catch {}
}
export function isSyncOn() { return !!getSyncUrl(); }
export function getAdminSyncUrl() {
  try { return localStorage.getItem(ADMIN_KEY) || ''; } catch { return ''; }
}
export function setAdminSyncUrl(u) {
  try { localStorage.setItem(ADMIN_KEY, (u || '').trim()); } catch {}
}

async function api(url, method, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) return null;
    if (method === 'GET') {
      const t = await res.text();
      return t ? JSON.parse(t) : {};
    }
    return true;
  } catch { return null; }
}

function base(url) { return url.replace(/\/+$/, ''); }

// ---------- 学员端 ----------
// 上传学员完整学习快照（进度/测验/分享文字/语音 base64）
export async function pushLearner(uid) {
  const url = getSyncUrl();
  if (!url || !uid) return false;
  try {
    const report = await buildLearnerReport();
    const slim = {
      profile: report.profile,
      progress: report.progress,
      quiz: report.quiz,
      shares: report.shares,
      voice: report.voice,
      updatedAt: new Date().toISOString(),
    };
    return !!(await api(base(url) + '/learners/' + encodeURIComponent(uid) + '.json', 'PUT', slim));
  } catch { return false; }
}

// 拉取组长对本人的回应
export async function pullLeaderComments(uid) {
  const url = getSyncUrl();
  if (!url || !uid) return {};
  const d = await api(base(url) + '/comments/' + encodeURIComponent(uid) + '.json', 'GET');
  return d || {};
}

// ---------- 组长端 ----------
export async function pullAllLearners(url) {
  if (!url) return {};
  const d = await api(base(url) + '/learners.json', 'GET');
  return d || {};
}
export async function pushComment(url, uid, lessonKey, comment) {
  if (!url || !uid) return false;
  const path = '/comments/' + encodeURIComponent(uid) + '/' + encodeURIComponent(lessonKey) + '.json';
  // 先读现有，再追加（避免并发覆盖）
  const existing = await api(base(url) + path, 'GET');
  const arr = Array.isArray(existing) ? existing : [];
  arr.push(comment);
  return !!(await api(base(url) + path, 'PUT', arr));
}
