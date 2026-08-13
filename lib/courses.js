import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'public/courses');

export function listCourses() {
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
    const c = JSON.parse(raw);
    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      source: c.source,
      category: c.category || '其他',
      totalLessons: c.totalLessons,
      lessons: c.lessons.map((l) => ({ id: l.id, number: l.number, title: l.title })),
    };
  });
}

export function getCourse(slug) {
  const file = path.join(DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function getLesson(course, lessonId) {
  return course?.lessons.find((l) => l.id === lessonId) || null;
}
