import { describe, expect, it } from 'vitest';
import { completion, filterTasks } from './domain';
import type { Task } from './domain';

const tasks: Task[] = [
  { id: 'a', title: 'Мобильный прототип', description: 'Проверить ширину 360 px', priority: 'high', status: 'new', createdAt: '', updatedAt: '' },
  { id: 'b', title: 'Проверить API', description: 'Сохранение прототипа', priority: 'medium', status: 'done', createdAt: '', updatedAt: '' },
  { id: 'c', title: 'Собрать референсы', description: '', priority: 'low', status: 'done', createdAt: '', updatedAt: '' },
];
describe('board filtering and progress', () => {
  it('finds Russian text in title and description without case sensitivity', () => {
    expect(filterTasks(tasks, '  ПРОТОТИП ', 'all').map(task => task.id)).toEqual(['a', 'b']);
  });
  it('combines priority and search; does not mutate the source', () => {
    expect(filterTasks(tasks, 'прототип', 'medium').map(task => task.id)).toEqual(['b']);
    expect(filterTasks(tasks, 'несуществующая', 'all')).toEqual([]);
    expect(tasks).toHaveLength(3);
  });
  it('shows the complete board when the query is blank', () => {
    expect(filterTasks(tasks, '  ', 'all')).toEqual(tasks);
  });
  it('handles empty, partial, and complete progress', () => {
    expect(completion([])).toBe(0);
    expect(completion(tasks)).toBe(67);
    expect(completion(tasks.filter(task => task.status === 'done'))).toBe(100);
  });
});
