import Link from 'next/link';
import { getCourse } from '@/lib/courses';
import ProgressBar from '@/components/ProgressBar';

export function generateStaticParams() {
  return [{ slug: 'yaodao-rumen' }];
}

export default async function CoursePage({ params }) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return <div className="container"><p>未找到课程</p></div>;
  return (
    <div className="container">
      <div className="topbar">
        <div className="topbar-inner">
          <Link className="back" href="/">‹</Link>
          <span className="title">{course.title}</span>
        </div>
      </div>
      <div className="page-head">
        <h1>{course.title}</h1>
        <p>{course.subtitle}</p>
      </div>
      <ProgressBar slug={slug} total={course.totalLessons} />
      <div className="lesson-grid">
        {course.lessons.map((l) => (
          <Link key={l.id} href={`/lesson/${slug}/${l.id}`}>
            <div className="card lesson-item">
              <div className="lesson-num">{l.number}</div>
              <div>
                <h4>第{l.number}课 · {l.title}</h4>
                <div className="sub">{l.memoryVerse || ''}</div>
              </div>
              <span className="chev">›</span>
            </div>
          </Link>
        ))}
      </div>
      <p className="hint">课程内容源自「希望之声」圣经函授学校，仅供小组学习使用。</p>
    </div>
  );
}
