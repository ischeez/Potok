import { useState } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import { statuses, statusLabels } from '../domain';
import type { Task, Status } from '../domain';
import { PriorityBadge, dateFormat } from './TaskMeta';

export default function TaskCard({ task, busy, onOpen, onMove, onDelete, onDrag }: {
  task: Task; busy: boolean; onOpen: () => void; onMove: (status: Status) => void;
  onDelete: () => void; onDrag: (id: string | null) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return <article className={`task-card ${busy ? 'task-busy' : ''} ${task.status === 'done' ? 'task-done' : ''}`}
    data-testid="task-card" draggable={!busy} aria-busy={busy}
    onDragStart={event => { event.dataTransfer.setData('text/plain', task.id); event.dataTransfer.effectAllowed = 'move'; onDrag(task.id); }}
    onDragEnd={() => onDrag(null)}>
    <div className="card-top">
      <PriorityBadge priority={task.priority} />
      <Tooltip title="Действия с задачей">
        <IconButton size="small" aria-label={`Действия: ${task.title}`} disabled={busy} onClick={event => setAnchor(event.currentTarget)}>
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
    <button className="card-content" onClick={onOpen} disabled={busy}>
      <h3>{task.title}</h3>
      <p>{task.description || 'Добавьте детали — к задаче будет проще вернуться.'}</p>
    </button>
    <div className="card-bottom">
      <span className="task-reference">PTK-{task.id.slice(0, 4).toUpperCase()}</span>
      <span className="card-date">{task.status === 'done' && <CheckRounded />} {dateFormat.format(new Date(task.createdAt))}</span>
      <DragIndicatorRounded className="drag-handle" />
    </div>
    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
      <MenuItem onClick={() => { setAnchor(null); onOpen(); }}>
        <EditOutlined fontSize="small" /> Открыть задачу</MenuItem>
      {statuses.filter(status => status !== task.status).map(status => <MenuItem key={status} onClick={() => { setAnchor(null); onMove(status); }}>
        <ArrowForwardRounded fontSize="small" /> {statusLabels[status]}</MenuItem>)}
      <MenuItem sx={{ color: 'error.main' }} onClick={() => { setAnchor(null); onDelete(); }}>
        <DeleteOutlineRounded fontSize="small" /> Удалить</MenuItem>
    </Menu>
  </article>;
}
