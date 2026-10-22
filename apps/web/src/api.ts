import type { Task, TaskInput } from './domain';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: options.signal ?? AbortSignal.timeout(12_000),
    });
  } catch {
    throw new Error('Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.');
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error('Задача уже удалена. Обновите доску.');
    if (response.status === 400) throw new Error('Проверьте поля: название — до 120, описание — до 4 000 символов.');
    throw new Error('Сервер временно недоступен. Изменения не сохранены. Попробуйте ещё раз.');
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const api = {
  list: (signal?: AbortSignal) => request<Task[]>('/tasks', { signal }),
  create: (task: TaskInput) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id: string, task: Partial<TaskInput>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(task) }),
  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
