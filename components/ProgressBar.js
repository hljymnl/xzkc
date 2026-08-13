'use client';
import { useEffect, useState } from 'react';
import { getCourseState } from '@/lib/store';

export default function ProgressBar({ slug, total }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const load = () => {
      const s = getCourseState(slug);
      setDone(s ? s.done.length : 0);
    };
    load();
    window.addEventListener('xz-store', load);
    return () => window.removeEventListener('xz-store', load);
  }, [slug]);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
          <span>学习进度</span><span>{done}/{total} 课 · {pct}%</span>
        </div>
        <div className="lesson-progress" style={{ margin: 0 }}><i style={{ width: `${pct}%` }} /></div>
      </div>
      {pct === 100 && <span style={{ fontSize: 22 }}>🎉</span>}
    </div>
  );
}
