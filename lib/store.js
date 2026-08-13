'use client';

// 简单的 localStorage 进度存储（无后端版本）
const PREFIX = 'xz-course:v1:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('xz-store', { detail: key }));
  } catch {}
}

export function getCourseState(slug) {
  if (typeof window === 'undefined') return null;
  return read(`course:${slug}`, { done: [], quiz: {}, played: {} });
}
export function saveCourseState(slug, state) {
  write(`course:${slug}`, state);
}
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
