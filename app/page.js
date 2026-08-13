import Link from 'next/link';
import { listCourses } from '@/lib/courses';

const CAT_ICONS = {
  '查经课程': '📖',
  '人物研经': '👤',
  '健康生活': '🌿',
  '其他': '📚',
};

export default function Home() {
  const courses = listCourses();
  const grouped = {};
  for (const c of courses) {
    (grouped[c.category] = grouped[c.category] || []).push(c);
  }
  const order = ['查经课程', '人物研经', '健康生活', '其他'];
  return (
    <div className="container">
      <div className="page-head">
        <h1>📖 互动课程</h1>
        <p>听音频学课程 · 做测验 · 一起成长</p>
      </div>
      {order.filter((cat) => grouped[cat]).map((cat) => (
        <div key={cat}>
          <div className="section-head" style={{ marginTop: 18 }}>
            <span className="bar" />
            <h2>{CAT_ICONS[cat] || '📚'} {cat}</h2>
          </div>
          {grouped[cat].map((c) => (
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
        </div>
      ))}
      <p className="hint">💡 点击「添加到主屏幕」可像 App 一样使用（支持离线）</p>
    </div>
  );
}
