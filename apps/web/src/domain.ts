export const statuses = ['new', 'in_progress', 'done'] as const;
export type Status = typeof statuses[number];
export type Priority = 'low' | 'medium' | 'high';
export type Task = {
  id: string; title: string; description: string; priority: Priority; status: Status;
  createdAt: string; updatedAt: string;
};
export type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'status'>;
export const statusLabels: Record<Status, string> = { new: 'Новая', in_progress: 'В работе', done: 'Готово' };
export const priorityLabels: Record<Priority, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

export function filterTasks(tasks: Task[], query: string, priority: Priority | 'all') {
  const search = query.trim().toLocaleLowerCase('ru');
  return tasks.filter(task => (priority === 'all' || task.priority === priority) &&
    (!search || `${task.title} ${task.description}`.toLocaleLowerCase('ru').includes(search)));
}

export function completion(tasks: Task[]) {
  return tasks.length ? Math.round(tasks.filter(task => task.status === 'done').length / tasks.length * 100) : 0;
}
