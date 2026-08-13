import Link from 'next/link';
import { getCourse, getLesson } from '@/lib/courses';
import LessonPlayer from '@/components/LessonPlayer';

export function generateStaticParams() {
  const params = [];
  const course = getCourse('yaodao-rumen');
  for (const l of course.lessons) params.push({ slug: 'yaodao-rumen', lessonId: l.id });
  return params;
}

export default async function LessonPage({ params }) {
  const { slug, lessonId } = await params;
  const course = getCourse(slug);
  const lesson = getLesson(course, lessonId);
  if (!course || !lesson) {
    return (
      <div className="container">
        <div className="topbar"><div className="topbar-inner"><Link className="back" href="/">‹</Link></div></div>
        <p>未找到课程</p>
      </div>
    );
  }
  const idx = course.lessons.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? course.lessons[idx - 1] : null;
  const next = idx < course.lessons.length - 1 ? course.lessons[idx + 1] : null;
  return (
    <LessonPlayer course={course} lesson={lesson} prev={prev} next={next} />
  );
}
