import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Select, Skeleton, Snackbar, Tooltip, useMediaQuery,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import GridViewRounded from '@mui/icons-material/GridViewRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import SortRounded from '@mui/icons-material/SortRounded';
import SpaceDashboardOutlined from '@mui/icons-material/SpaceDashboardOutlined';
import StarsRounded from '@mui/icons-material/StarsRounded';
import ViewAgendaOutlined from '@mui/icons-material/ViewAgendaOutlined';
import { api, errorMessage } from './api';
import { completion, filterTasks, priorityLabels, statuses, statusLabels } from './domain';
import type { Priority, Status, Task, TaskInput } from './domain';

import Logo from './components/Logo';
import TaskCard from './components/TaskCard';
import TaskDialog from './components/TaskDialog';
import type { DialogState } from './components/TaskDialog';

const longDate = new Intl.DateTimeFormat('ru', { weekday: 'long', day: 'numeric', month: 'long' });

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notification, setNotification] = useState<{ text: string; error?: boolean; } | null>(null);
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [activeStatus, setActiveStatus] = useState<Status>('new');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState<'newest' | 'priority'>('newest');
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const mobile = useMediaQuery('(max-width:700px)');
  const load = useCallback((signal?: AbortSignal) => api.list(signal)
    .then(result => { if (!signal?.aborted) setTasks(result); })
    .catch(cause => { if (!signal?.aborted) setLoadError(errorMessage(cause)); })
    .finally(() => { if (!signal?.aborted) setLoading(false); }), []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (dialog || deleteTask || infoOpen || event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable)) return;
      if (event.key.toLowerCase() === 'n' || event.key.toLowerCase() === 'т') { event.preventDefault(); setDialog({ task: null, status: 'new', mode: 'edit' }); }
      if (event.key === '/') { event.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, [dialog, deleteTask, infoOpen]);

  async function save(input: TaskInput, id?: string) {
    const result = id ? await api.update(id, input) : await api.create(input);
    setTasks(previous => id ? previous.map(task => task.id === id ? result : task) : [result, ...previous]);
    setNotification({ text: id ? 'Задача обновлена' : 'Задача создана. Отличное начало!' });
    setActiveStatus(result.status);
  }
  async function remove(task: Task) {
    await api.remove(task.id); setTasks(previous => previous.filter(item => item.id !== task.id)); setNotification({ text: 'Задача удалена' });
  }
  async function move(task: Task, status: Status) {
    if (task.status === status || pending.has(task.id)) return;
    setPending(previous => new Set(previous).add(task.id));
    try { const result = await api.update(task.id, { status }); setTasks(previous => previous.map(item => item.id === task.id ? result : item)); setNotification({ text: `Задача перемещена: ${statusLabels[status].toLowerCase()}` }); }
    catch (cause) { setNotification({ text: errorMessage(cause), error: true }); }
    finally { setPending(previous => { const next = new Set(previous); next.delete(task.id); return next; }); }
  }
  let visibleTasks = filterTasks(tasks, query, priority);
  if (sort === 'priority') { const rank = { high: 0, medium: 1, low: 2 }; visibleTasks = [...visibleTasks].sort((a, b) => rank[a.priority] - rank[b.priority]); }
  const done = tasks.filter(task => task.status === 'done').length;
  const progress = completion(tasks);
  const filtered = Boolean(query.trim() || priority !== 'all');
  const create = (status: Status = 'new') => setDialog({ task: null, status, mode: 'edit' });

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#board" aria-label="Поток — на доску">
        <Logo />
        <span>поток<span className="brand-dot">.</span>
        </span>
      </a>
      <div className="workspace-label">ВАШЕ ПРОСТРАНСТВО</div>
      <nav className="main-nav" aria-label="Основная навигация">
        <button className={priority !== 'high' ? 'nav-item active' : 'nav-item'} onClick={() => { setPriority('all'); setQuery(''); }}>
          <SpaceDashboardOutlined />
          <span>Доска задач</span>
          <span className="nav-count">{tasks.length}</span>
        </button>
        <button className={priority === 'high' ? 'nav-item active' : 'nav-item'} onClick={() => setPriority(priority === 'high' ? 'all' : 'high')}>
          <StarsRounded />
          <span>Важное</span>
          <span className="important-dot" />
        </button>
      </nav>
      <div className="sidebar-divider" />
      <div className="board-label">
        <span>МОИ ДОСКИ</span>
        <span className="small-dot" />
      </div>
      <a className="board-link" href="#board">
        <span className="board-square" />Рабочие будни<span className="board-link-dot" />
      </a>
      <div className="sidebar-note">
        <div className="note-illustration" aria-hidden="true">
          <svg viewBox="0 0 100 82">
            <path d="M49 68C30 58 27 34 39 21c12 9 15 26 10 47Z" fill="#d9f48f" />
            <path d="M49 68c-3-28 15-48 36-42-2 25-14 39-36 42Z" fill="#8fae7a" />
            <path d="M49 68C24 73 9 61 12 43c22-5 38 7 37 25Z" fill="#698d65" />
            <path d="M49 77V44" stroke="#d9f48f" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="note-spark">✳</span>
        </div>
        <h3>Всё начинается<br />с одного шага.</h3>
        <p>Освободите голову.<br />Остальное — на доске.</p>
      </div>
      <button className="help-link" onClick={() => setInfoOpen(true)}>
        <HelpOutlineRounded />Как здесь всё устроено<ArrowOutwardRounded />
      </button>
      <div className="sidebar-footer">
        <span className="profile-avatar">Я</span>
        <div>
          <strong>Моё пространство</strong>
          <span>Место для ваших идей</span>
        </div>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <div className="breadcrumb">
          <span className="mobile-brand">
            <Logo />
          </span>
          <GridViewRounded />
          <span>Пространство</span>
          <span className="breadcrumb-slash">/</span>
          <strong>Рабочие будни</strong>
        </div>
        <div className="topbar-right">
          <span className="today-date">{longDate.format(new Date())}</span>
          <span className="personal-badge">
            <span />Личная доска</span>
        </div>
      </header>
      <main id="board" className="main-content">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> МЕНЬШЕ ШУМА, БОЛЬШЕ ДЕЛА</div>
            <h1>Рабочие будни<span className="heading-dot">.</span>
            </h1>
            <p>Важные дела — перед глазами. Следующий шаг — понятен.</p>
          </div>
          <Button className="create-button" variant="contained" startIcon={<AddRounded />} onClick={() => create()}>Новая задача<span className="key-hint">N</span>
          </Button>
        </section>
        <section className="overview" aria-label="Прогресс доски">
          <div className="overview-icon">
            <CheckRounded />
          </div>
          <div className="overview-copy">
            <strong>{tasks.length && progress === 100 ? 'Всё готово. Можно выдохнуть.' : 'Каждая готовая задача — шаг вперёд'}</strong>
            <span>{tasks.length ? `${done} из ${tasks.length} завершено. Вы движетесь в своём темпе.` : 'Добавьте первое дело — и движение начнётся.'}</span>
          </div>
          <div className="progress-area">
            <div>
              <span>Ваш прогресс</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Завершённые задачи" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="overview-spark" aria-hidden="true">✳</span>
        </section>
        <section className="board-section" aria-label="Канбан-доска" aria-busy={loading}>
          <div className="board-toolbar">
            <div className="board-view-label">
              <SpaceDashboardOutlined />
              <strong>Доска</strong>
              <span>{tasks.length} задач</span>
            </div>
            <div className="board-tools">
              <div className="search-box">
                <SearchRounded />
                <input ref={searchRef} aria-label="Поиск задач" placeholder="Найти задачу…" value={query} onChange={event => setQuery(event.target.value)} />
                <kbd>/</kbd>{query && <IconButton size="small" aria-label="Очистить поиск" onClick={() => setQuery('')}>
                  <CloseRounded fontSize="small" />
                </IconButton>}</div>
              <div className="priority-select">
                <FilterListRounded />
                <Select variant="standard" disableUnderline value={priority} inputProps={{ 'aria-label': 'Фильтр по приоритету' }} IconComponent={KeyboardArrowDownRounded} onChange={event => setPriority(event.target.value as Priority | 'all')}>
                  <MenuItem value="all">Все приоритеты</MenuItem>{(['high', 'medium', 'low'] as const).map(value => <MenuItem key={value} value={value}>{priorityLabels[value]}</MenuItem>)}</Select>
              </div>
              <Tooltip title={sort === 'newest' ? 'Сначала важные' : 'Сначала новые'}>
                <IconButton className={sort === 'priority' ? 'tool-active' : ''} aria-label={sort === 'newest' ? 'Сначала важные' : 'Сначала новые'} onClick={() => setSort(sort === 'newest' ? 'priority' : 'newest')}>
                  <SortRounded />
                </IconButton>
              </Tooltip>
              <span className="tools-divider" />
              <Tooltip title={compact ? 'Развёрнутые карточки' : 'Компактные карточки'}>
                <IconButton aria-label="Компактный вид" aria-pressed={compact} className={compact ? 'tool-active' : ''} onClick={() => setCompact(!compact)}>
                  <ViewAgendaOutlined />
                </IconButton>
              </Tooltip>
            </div>
          </div>
          {filtered && <div className="filter-summary">
            <span>Найдено: {visibleTasks.length}</span>
            <button onClick={() => { setQuery(''); setPriority('all'); }}>Сбросить фильтры <CloseRounded />
            </button>
          </div>}
          {mobile && <div className="mobile-status-tabs" role="tablist" aria-label="Статус задач">{statuses.map(status => <button key={status} role="tab" aria-selected={activeStatus === status} onClick={() => setActiveStatus(status)} className={activeStatus === status ? 'selected' : ''}>
            <span className={`status-dot dot-${status}`} />{statusLabels[status]}<span>{visibleTasks.filter(task => task.status === status).length}</span>
          </button>)}</div>}
          {loadError ? <div className="state-panel error-panel" role="alert">
            <span className="state-icon">
              <HelpOutlineRounded />
            </span>
            <h2>Доска пока недоступна</h2>
            <p>{loadError}</p>
            <Button variant="contained" onClick={() => { setLoading(true); setLoadError(''); void load(); }}>Попробовать снова</Button>
          </div> : !loading && tasks.length === 0 ? <div className="state-panel empty-board">
            <div className="empty-illustration" aria-hidden="true">
              <span />
              <span />
              <span />
              <CheckRounded />
            </div>
            <div className="eyebrow">ЧИСТЫЙ ЛИСТ — ХОРОШЕЕ НАЧАЛО</div>
            <h2>Здесь начнётся ваш поток</h2>
            <p>Большие планы складываются из маленьких задач.<br />Добавьте первую — остальное постепенно сложится.</p>
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => create()}>Создать первую задачу</Button>
          </div> : <div className={`kanban-grid ${compact ? 'compact' : ''}`}>
            {statuses.filter(status => !mobile || status === activeStatus).map(status => <section key={status} data-testid={`column-${status}`} className={`kanban-column column-${status} ${dropTarget === status ? 'drop-active' : ''}`} aria-label={statusLabels[status]}
              onDragOver={event => { if (dragged) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(status); } }}
              onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null); }}
              onDrop={event => { event.preventDefault(); const task = tasks.find(item => item.id === dragged); setDragged(null); setDropTarget(null); if (task) void move(task, status); }}>
              <div className="column-heading">
                <div>
                  <span className={`status-dot dot-${status}`} />
                  <h2>{statusLabels[status]}</h2>
                  <span className="column-count">{visibleTasks.filter(task => task.status === status).length}</span>
                </div>
                <Tooltip title={`Добавить: ${statusLabels[status].toLowerCase()}`}>
                  <IconButton size="small" aria-label={`Добавить задачу: ${statusLabels[status]}`} onClick={() => create(status)}>
                    <AddRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              </div>
              <div className="column-subtitle">{status === 'new' ? 'Идеи, которым пора дать старт' : status === 'in_progress' ? 'Шаг за шагом к результату' : 'Можно гордиться собой'}</div>
              <div className="column-cards">{loading ? [0, 1].map(index => <div className="skeleton-card" key={index}>
                <Skeleton width="35%" height={24} />
                <Skeleton width="90%" height={28} />
                <Skeleton width="70%" />
                <Skeleton width="100%" height={40} />
              </div>) : visibleTasks.filter(task => task.status === status).map(task => <TaskCard key={task.id} task={task} busy={pending.has(task.id)} onOpen={() => setDialog({ task, status, mode: 'view' })} onMove={value => void move(task, value)} onDelete={() => setDeleteTask(task)} onDrag={id => { setDragged(id); if (!id) setDropTarget(null); }} />)}
                {!loading && !visibleTasks.some(task => task.status === status) && <div className="empty-column">
                  <span>{status === 'done' ? <CheckRounded /> : <SpaceDashboardOutlined />}</span>
                  <strong>{filtered ? 'Совпадений нет' : status === 'done' ? 'Победы ещё впереди' : status === 'in_progress' ? 'Можно начать с малого' : 'Место для новых идей'}</strong>
                  <p>{filtered ? 'Попробуйте изменить фильтры' : status === 'done' ? 'Здесь будут завершённые задачи' : 'Добавьте или переместите сюда задачу'}</p>
                </div>}
              </div>
              <button className="column-add" onClick={() => create(status)}>
                <AddRounded />Добавить задачу</button>
            </section>)}
          </div>}
          <footer className="board-footer">
            <span>
              <span className="footer-dot" />{loading ? 'Загружаем задачи…' : loadError ? 'Нет подключения' : 'Все изменения сохранены'}</span>
            <span className="desktop-tip">
              <DragIndicatorRounded />Перетаскивайте карточки между колонками</span>
            <span className="mobile-tip">Меняйте статус в меню карточки <MoreHorizRounded />
            </span>
            <button onClick={() => setInfoOpen(true)} aria-label="Помощь и горячие клавиши">
              <HelpOutlineRounded />
            </button>
          </footer>
        </section>
        <div className="page-footer">
          <span>У всего есть свой поток. Найдите ваш.</span>
          <span>Сделано для спокойной работы <span className="footer-star">✳</span>
          </span>
        </div>
      </main>
    </div>
    {dialog && <TaskDialog initial={dialog} onClose={() => setDialog(null)} onSave={save} onDelete={remove} />}
    <Dialog open={Boolean(deleteTask)} onClose={() => { if (!deleteBusy) setDeleteTask(null); }} aria-labelledby="delete-title">
      <DialogTitle id="delete-title">Удалить задачу?</DialogTitle>
      <DialogContent>
        <p className="delete-description">«{deleteTask?.title}» будет удалена с доски. Восстановить её не получится.</p>
      </DialogContent>
      <DialogActions>
        <Button disabled={deleteBusy} onClick={() => setDeleteTask(null)}>Отмена</Button>
        <Button color="error" variant="contained" disabled={deleteBusy} onClick={async () => { if (!deleteTask) return; setDeleteBusy(true); try { await remove(deleteTask); setDeleteTask(null); } catch (cause) { setNotification({ text: errorMessage(cause), error: true }); } finally { setDeleteBusy(false); } }}>{deleteBusy ? 'Удаляем…' : 'Удалить'}</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} maxWidth="sm" fullWidth aria-labelledby="help-title">
      <DialogTitle id="help-title" className="dialog-heading">Ваш спокойный рабочий ритм<IconButton aria-label="Закрыть помощь" onClick={() => setInfoOpen(false)}>
        <CloseRounded />
      </IconButton>
      </DialogTitle>
      <DialogContent>
        <div className="help-content">
          <p>Добавляйте дела, расставляйте приоритеты и переносите карточки по мере работы. Всё сохраняется автоматически после успешного действия.</p>
          <div>
            <span className="help-key">N</span>
            <span>Новая задача (или «Т» в русской раскладке)</span>
          </div>
          <div>
            <span className="help-key">/</span>
            <span>Быстрый переход к поиску</span>
          </div>
          <div>
            <MoreHorizRounded />
            <span>Смена статуса и удаление — в меню карточки</span>
          </div>
          <div>
            <ArrowBackRounded />
            <ArrowForwardRounded />
            <span>На компьютере карточки можно перетаскивать</span>
          </div>
          <p>«Важное» показывает задачи с высоким приоритетом. Поиск работает и по названию, и по описанию.</p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={() => setInfoOpen(false)}>Всё понятно</Button>
      </DialogActions>
    </Dialog>
    <Snackbar open={Boolean(notification)} autoHideDuration={5000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert severity={notification?.error ? 'error' : 'success'} variant="filled" onClose={() => setNotification(null)}>{notification?.text}</Alert>
    </Snackbar>
  </div>;
}
