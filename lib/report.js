'use client';
import { getUserId } from '@/lib/store';
import { listRecordingKeys, getRecording } from '@/lib/voice';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

// 汇总本机学习记录，生成可上报给组长的 JSON（含进度/测验/读书分享/语音留言）
export async function buildLearnerReport() {
  const uid = getUserId();
  if (!uid) return null;
  const report = {
    v: 1, type: 'xz-learner-report',
    profile: { uid, exportedAt: new Date().toISOString() },
    progress: {}, quiz: {}, shares: {}, voice: {}
  };

  // 课程进度 / 测验
  const prefix = 'xz-course:v1:';
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      const sub = k.slice(prefix.length);
      if (sub.startsWith('course:')) {
        const slug = sub.slice('course:'.length);
        const s = JSON.parse(localStorage.getItem(k) || '{}');
        report.progress[slug] = { done: s.done || [], quiz: s.quiz || {}, played: s.played || {} };
      } else if (sub.startsWith('lesson:')) {
        const rest = sub.slice('lesson:'.length); // slug:lessonId
        const idx = rest.lastIndexOf(':');
        if (idx > 0) {
          const slug = rest.slice(0, idx);
          const lid = rest.slice(idx + 1);
          const s = JSON.parse(localStorage.getItem(k) || '{}');
          report.quiz[`${slug}:${lid}`] = s.quiz || {};
        }
      }
    }
  } catch {}

  // 读书分享（文字）
  const sp = 'share:' + uid + ':';
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(sp)) continue;
      const key = k.slice(sp.length);
      report.shares[key] = JSON.parse(localStorage.getItem(k) || '{}');
    }
  } catch {}

  // 语音留言（base64，限量避免文件过大）
  try {
    const keys = await listRecordingKeys('voice:' + uid + ':');
    let total = 0;
    for (const key of keys) {
      const blob = await getRecording(key);
      if (!blob) continue;
      const b64 = await blobToBase64(blob);
      total += b64.length;
      if (total > 8e6) break; // 最多约 8MB
      report.voice[key.replace('voice:' + uid + ':', '')] = { mime: blob.type, data: b64 };
    }
  } catch {}

  return report;
}

export function downloadJson(data, filename) {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  } catch {}
}
