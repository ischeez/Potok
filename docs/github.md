# Обновление GitHub

Репозиторий: [github.com/ischeez/Potok](https://github.com/ischeez/Potok)

Рабочий сайт: [korotkov.click](https://korotkov.click)

Основная рабочая ветка проекта — `feat/kanban-board`. Перед публикацией изменений:

```bash
cd /Users/korotkov/Desktop/Trash/hm/potok
npm run check
git status
git add .
git commit -m "Describe the change"
git push origin feat/kanban-board
```

README использует относительные пути к изображениям, поэтому они отображаются на GitHub после push. Файлы `.env`, зависимости, локальные данные и результаты тестов исключены через `.gitignore`.
