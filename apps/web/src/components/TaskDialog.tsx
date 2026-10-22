import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, useMediaQuery } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { errorMessage } from '../api';
import { statuses, statusLabels, priorityLabels } from '../domain';
import type { Task, TaskInput, Priority, Status } from '../domain';
import { dateFormat, PriorityBadge } from './TaskMeta';

export type DialogState = { task: Task | null; status: Status; mode: 'view' | 'edit' };

export default function TaskDialog({ initial, onClose, onSave, onDelete }: {
  initial: DialogState; onClose: () => void; onSave: (input: TaskInput, id?: string) => Promise<void>;
  onDelete: (task: Task) => Promise<void>;
}) {
  const [editing, setEditing] = useState(initial.mode === 'edit');
  const [title, setTitle] = useState(initial.task?.title ?? '');
  const [description, setDescription] = useState(initial.task?.description ?? '');
  const [priority, setPriority] = useState<Priority>(initial.task?.priority ?? 'medium');
  const [status, setStatus] = useState<Status>(initial.task?.status ?? initial.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mobile = useMediaQuery('(max-width:599px)');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !title.trim() || busy) return;
    setBusy(true); setError('');
    try { await onSave({ title: title.trim(), description: description.trim(), priority, status }, initial.task?.id); onClose(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!initial.task || busy) return;
    setBusy(true); setError('');
    try { await onDelete(initial.task); onClose(); } catch (cause) { setError(errorMessage(cause)); setConfirmDelete(false); } finally { setBusy(false); }
  }
  return <Dialog open fullWidth maxWidth="sm" fullScreen={mobile} onClose={() => { if (!busy) onClose(); }} disableEscapeKeyDown={busy} aria-labelledby="task-dialog-title">
    <form onSubmit={submit} className="task-form">
      <DialogTitle id="task-dialog-title" className="dialog-heading">
        <span>{initial.task ? editing ? 'Редактирование задачи' : 'Детали задачи' : 'Новая задача'}</span>
        <IconButton onClick={onClose} disabled={busy} aria-label="Закрыть">
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <div className="dialog-eyebrow">{initial.task ? `PTK-${initial.task.id.slice(0, 4).toUpperCase()}` : 'Маленький шаг к большому результату'}</div>
        {error && <Alert severity="error" className="form-error">{error}</Alert>}
        {editing ? <div className="form-fields">
          <TextField label="Название задачи" autoFocus required value={title} onChange={event => setTitle(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 120 } }} helperText={`${title.length}/120`} />
          <TextField label="Описание" placeholder="Что нужно сделать? Как выглядит готовый результат?" multiline minRows={4} maxRows={10} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 4000 } }} helperText={`${description.length}/4000 · необязательно`} />
          <div className="form-row">
            <TextField select label="Приоритет" value={priority} onChange={event => setPriority(event.target.value as Priority)} disabled={busy}>{(['low', 'medium', 'high'] as const).map(value => <MenuItem key={value} value={value}>{priorityLabels[value]}</MenuItem>)}</TextField>
            <TextField select label="Статус" value={status} onChange={event => setStatus(event.target.value as Status)} disabled={busy}>{statuses.map(value => <MenuItem key={value} value={value}>{statusLabels[value]}</MenuItem>)}</TextField>
          </div>
        </div> : <div className="task-details">
          <h2>{title}</h2>
          <div className="detail-tags">
            <PriorityBadge priority={priority} />
            <span className={`detail-status status-${status}`}>{statusLabels[status]}</span>
          </div>
          <p>{description || 'У этой задачи пока нет описания.'}</p>
          <span className="detail-date">Создана {dateFormat.format(new Date(initial.task!.createdAt))} · Изменена {dateFormat.format(new Date(initial.task!.updatedAt))}</span>
        </div>}
      </DialogContent>
      <DialogActions className="dialog-actions">{initial.task && <IconButton color="error" aria-label="Удалить задачу" onClick={() => setConfirmDelete(true)} disabled={busy}>
        <DeleteOutlineRounded />
      </IconButton>}<span className="flex-spacer" />
        <Button color="inherit" onClick={onClose} disabled={busy}>Закрыть</Button>{editing ? <Button key="save" variant="contained" type="submit" disabled={busy || !title.trim()}>{busy ? 'Сохраняем…' : initial.task ? 'Сохранить' : 'Создать задачу'}</Button> : <Button key="edit" type="button" variant="contained" startIcon={<EditOutlined />} onClick={event => { event.preventDefault(); setEditing(true); }}>Редактировать</Button>}</DialogActions>
    </form>
    <Dialog open={confirmDelete} onClose={() => { if (!busy) setConfirmDelete(false); }} aria-labelledby="confirm-title">
      <DialogTitle id="confirm-title">Удалить задачу?</DialogTitle>
      <DialogContent>
        <p className="delete-description">«{title}» будет удалена с доски. Восстановить её не получится.</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDelete(false)} disabled={busy}>Отмена</Button>
        <Button color="error" variant="contained" onClick={remove} disabled={busy}>{busy ? 'Удаляем…' : 'Удалить'}</Button>
      </DialogActions>
    </Dialog>
  </Dialog>;
}
