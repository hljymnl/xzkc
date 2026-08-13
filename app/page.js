import Link from 'next/link';
import { listCourses } from '@/lib/courses';

export default function Home() {
  const courses = listCourses();
  return (
    <div className="container">
      <div className="page-head">
        <h1>📖 小组互动课程</h1>
        <p>听音频学课程 · 做测验 · 一起成长</p>
      </div>
      {courses.map((c) => (
        <Link key={c.id} href={`/course/${c.id}`}>
          <div className="card series-card">
            <div className="series-badge">经</div>
            <div>
              <h3>{c.title}</h3>
              <p>{c.subtitle}</p>
            </div>
            <div className="series-meta">{c.totalLessons} 课 ›</div>
          </div>
        </Link>
      ))}
      <p className="hint">💡 点击「添加到主屏幕」可像 App 一样使用（支持离线）</p>
    </div>
  );
}
