# Опубликовать на GitHub

Проект — отдельный Git-репозиторий. Рабочая ветка: `feat/kanban-board`. Локальная база, `.env`, зависимости и результаты временных тестов в Git не попадают; исходники, миграции и изображения README входят в коммит.

## Через GitHub CLI

Выполните из папки проекта, если у вас установлен `gh` и выполнен `gh auth login`:

```bash
cd /Users/korotkov/Desktop/Trash/hm/potok
gh repo create potok --public --source=. --remote=origin --push
```

Команда создаст публичный репозиторий в вашем аккаунте и отправит текущую ветку. Для закрытого репозитория замените `--public` на `--private`. При создании первым push текущая ветка станет основной на GitHub.

## Обычным Git

Создайте на GitHub пустой репозиторий `potok` без автоматически добавленных README и `.gitignore`, затем выполните:

```bash
cd /Users/korotkov/Desktop/Trash/hm/potok
git remote add origin https://github.com/YOUR_USERNAME/potok.git
git push -u origin feat/kanban-board
```

Замените `YOUR_USERNAME` на логин. Настройка SSH тоже подходит: вместо HTTPS используйте `git@github.com:YOUR_USERNAME/potok.git`.

## После новых изменений

```bash
npm run check
git add .
git commit -m "Describe the change"
git push
```

README использует относительные пути к изображениям. После push они отобразятся в репозитории автоматически.
