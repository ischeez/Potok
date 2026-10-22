import type { Priority } from '../domain';
import { priorityLabels } from '../domain';

export const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });

export function PriorityBadge({ priority }: { priority: Priority; }) {
  return <span className={`priority priority-${priority}`}>
    <span className="priority-bars" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>{priorityLabels[priority]}</span>;
}
