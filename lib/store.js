'use client';

// 本地存储：用户 ID + 阅读挑战记录 + 课程进度（设备级）
const P = 'xz-course:v1:';
const CH = 'xz-challenge:v1:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function write(key, val) {
  try {
    localStorage.setItem(P + key, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('xz-store', { detail: key }));
  } catch {}
}

// ---------- 用户 ID ----------
export function getUserId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('xz-user-id') || '';
}
export function setUserId(id) {
  try {
    id = (id || '').trim();
    localStorage.setItem('xz-user-id', id);
    if (id) {
      const list = JSON.parse(localStorage.getItem('xz-user-ids') || '[]');
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('xz-user-ids', JSON.stringify(list));
      }
    }
    window.dispatchEvent(new CustomEvent('xz-store', { detail: 'user' }));
  } catch {}
}
export function getKnownIds() {
  try { return JSON.parse(localStorage.getItem('xz-user-ids') || '[]'); }
  catch { return []; }
}

// ---------- 阅读挑战记录（按 ID） ----------
function chRead(uid) {
  if (!uid) return null;
  return read('challenge:' + uid, { done: {}, segments: {}, quiz: {}, days: [] });
}
function chWrite(uid, s) { write('challenge:' + uid, s); }

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function recordLessonDone(uid, slug, lessonId) {
  if (!uid) return;
  const s = chRead(uid) || { done: {}, segments: {}, quiz: {}, days: [] };
  (s.done[slug] = s.done[slug] || {})[lessonId] = true;
  if (!s.days.includes(today())) s.days.push(today());
  chWrite(uid, s);
}
export function recordSegmentPlayed(uid, slug, lessonId, segIndex) {
  if (!uid) return;
  const s = chRead(uid) || { done: {}, segments: {}, quiz: {}, days: [] };
  const key = `${slug}:${lessonId}`;
  const played = s.segments[key] || {};
  played[segIndex] = true;
  s.segments[key] = played;
  if (!s.days.includes(today())) s.days.push(today());
  chWrite(uid, s);
}
export function recordQuizAnswered(uid, slug, lessonId, count) {
  if (!uid) return;
  const s = chRead(uid) || { done: {}, segments: {}, quiz: {}, days: [] };
  s.quiz[`${slug}:${lessonId}`] = (s.quiz[`${slug}:${lessonId}`] || 0) + count;
  if (!s.days.includes(today())) s.days.push(today());
  chWrite(uid, s);
}

export function getChallenge(uid) {
  if (typeof window === 'undefined' || !uid) return null;
  const s = chRead(uid);
  if (!s) return null;
  let lessons = 0, segments = 0, quiz = 0;
  for (const k in s.done) lessons += Object.keys(s.done[k]).length;
  for (const k in s.segments) segments += Object.keys(s.segments[k]).length;
  for (const k in s.quiz) quiz += s.quiz[k];
  const days = s.days.sort();
  let streak = 0;
  if (days.length) {
    const ms = 86400000;
    const last = new Date(days[days.length - 1]);
    const todayD = new Date(today());
    const gap = Math.round((todayD - last) / ms);
    if (gap <= 1) {
      streak = 1;
      for (let i = days.length - 2; i >= 0; i--) {
        const d1 = new Date(days[i]);
        const d0 = new Date(days[i + 1]);
        if (Math.round((d0 - d1) / ms) === 1) streak++;
        else break;
      }
    }
  }
  return { lessons, segments, quiz, days: days.length, streak };
}

// ---------- 课程进度（设备级，原有） ----------
export function getCourseState(slug) {
  if (typeof window === 'undefined') return null;
  return read(`course:${slug}`, { done: [], quiz: {}, played: {} });
}
export function saveCourseState(slug, state) { write(`course:${slug}`, state); }
export function getLessonPlayed(slug, lessonId) {
  if (typeof window === 'undefined') return [];
  const s = read(`lesson:${slug}:${lessonId}`, { played: [] });
  return s.played || [];
}
export function saveLessonPlayed(slug, lessonId, played) {
  const s = read(`lesson:${slug}:${lessonId}`, { played: [] });
  s.played = played;
  write(`lesson:${slug}:${lessonId}`, s);
}
export function getLessonQuiz(slug, lessonId) {
  if (typeof window === 'undefined') return {};
  const s = read(`lesson:${slug}:${lessonId}`, { quiz: {} });
  return s.quiz || {};
}
export function saveLessonQuiz(slug, lessonId, quiz) {
  const s = read(`lesson:${slug}:${lessonId}`, { quiz: {} });
  s.quiz = quiz;
  write(`lesson:${slug}:${lessonId}`, s);
}
