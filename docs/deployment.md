# Запуск на VPS

Production-пакет находится в `deploy/`. Caddy отдаёт собранный React, завершает HTTPS и защищает весь сайт HTTP Basic Auth. NestJS и PostgreSQL доступны только внутри Docker-сети. Пароли не входят в репозиторий.

Новая production-база начинает с пустой доски. Команда seed исключена из развёртывания и дополнительно запрещена при `NODE_ENV=production`. Локальная демонстрационная база и production используют разные Compose-проекты и тома.

## Сервер и DNS

Ubuntu 22.04, Docker Engine и Compose plugin из [официального репозитория Docker](https://docs.docker.com/engine/install/ubuntu/). Пакет рассчитан на 1 CPU и 2 GB RAM; для экономии ресурсов образы можно собрать заранее и перенести на сервер с той же архитектурой.

Публичные порты: SSH, TCP 80/443, UDP 443. Порты 3001 и 5432 наружу не публикуются. Перед установкой проверить существующие сайты, занятые порты и свободное место. Чужие сервисы не останавливать.

A-запись `korotkov.click` должна указывать на VPS. Сначала `DNS only`, чтобы Caddy получил сертификат. После проверки origin можно включить проксирование Cloudflare с режимом **Full (strict)**. Не использовать Flexible.

## Доступ и секреты

Выбран режим личной доски. Caddy запрашивает логин и пароль до выдачи интерфейса, файлов и API. Это gateway-защита на уровне reverse proxy: внутри приложения нет регистрации, сессий, отдельных пользователей или разделения задач по владельцам.

На сервере подготовить `/opt/potok`. Production-секреты создаёт `init-env.py`: он принимает логин и пароль одной JSON-строкой через stdin, генерирует отдельный случайный пароль PostgreSQL, хеширует пароль входа через Caddy и атомарно создаёт `deploy/.env` с правами `0600`. Секреты не передаются в аргументах процесса и не печатаются.

Интерактивный запуск без сохранения пароля в shell history:

```bash
cd /opt/potok
python3 -c '
import getpass, json, sys
print("Логин владельца [owner]: ", end="", file=sys.stderr, flush=True)
username = input() or "owner"
password = getpass.getpass("Пароль владельца (минимум 16 символов): ")
print(json.dumps({"username": username, "password": password}))
' | python3 deploy/init-env.py korotkov.click
```

Пароль должен состоять минимум из 16 символов; логин — из букв, цифр, `_` или `-`. Скрипт не перезаписывает существующий `deploy/.env`: это защищает рабочие секреты от случайной замены. Для ручной аварийной настройки есть `deploy/.env.example`, но в штатном запуске копировать его не требуется.

`deploy/.env` не коммитить и не выводить в логи. Не запускать `docker compose config` без `--quiet`: полный вывод содержит секреты подключения. Без заданного хеша входа Compose остановится, а не опубликует открытую доску.

TLS-сертификаты Caddy получает и продлевает автоматически. TLS-данные хранятся в отдельном persistent volume.

## Проверка и запуск

Перед переносом исходников:

```bash
npm ci
npm run check
npm run test:integration
npm run test:e2e
```

На сервере:

```bash
cd /opt/potok
docker compose --env-file deploy/.env -f deploy/compose.production.yaml config --quiet
docker compose --env-file deploy/.env -f deploy/compose.production.yaml build
docker compose --env-file deploy/.env -f deploy/compose.production.yaml up -d
docker compose --env-file deploy/.env -f deploy/compose.production.yaml ps
```

`migrate` ждёт готовую PostgreSQL, применяет SQL-миграции и завершается. API запускается только после успешной миграции. Caddy ждёт здоровый API. При перезапуске VPS долгоживущие контейнеры поднимаются автоматически.

Production-путь выполняет только миграции. `seed` в Compose отсутствует и дополнительно запрещён приложением при `NODE_ENV=production`, поэтому новая база остаётся пустой.

Проверить вход и отсутствие анонимного доступа:

```bash
curl -I https://korotkov.click/
curl --user owner -fsS https://korotkov.click/api/health
```

Первый запрос должен вернуть `401`, второй — после ввода пароля `{"status":"ok","database":"connected"}`. Затем проверить создание, перенос, перезагрузку и удаление одной проверочной задачи. После проверки на доске не должно остаться тестовых записей.

Для первой публикации есть полный автоматический verifier. Запускать его можно **только один раз на свежей пустой production-базе**: перед CRUD-проверкой скрипт требует точное значение `[]` от `/api/tasks`. На рабочей доске с задачами он намеренно завершится ошибкой.

```bash
cd /opt/potok
python3 -c '
import getpass, json, sys
print("Логин владельца [owner]: ", end="", file=sys.stderr, flush=True)
username = input() or "owner"
password = getpass.getpass("Пароль владельца: ")
print(json.dumps({"username": username, "password": password}))
' | sudo python3 deploy/verify-release.py korotkov.click
```

Verifier проверяет настоящий HTTPS, запрет анонимного доступа, security headers, ассеты, CRUD, сохранность задачи после перезапуска API, `pg_dump` и транзакционное восстановление в отдельную тестовую базу. В `finally` он удаляет проверочную задачу и тестовую базу; после успешного прогона доска снова пуста, а в `/var/backups/potok` остаётся свежая резервная копия. Повторять verifier на используемой базе не нужно.

## Резервные копии

```bash
sudo /opt/potok/deploy/backup.sh
sudo install -m 0644 /opt/potok/deploy/potok-backup.service /etc/systemd/system/
sudo install -m 0644 /opt/potok/deploy/potok-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now potok-backup.timer
sudo systemctl list-timers potok-backup.timer
```

Backup запускается ежедневно около 02:17 UTC, то есть 05:17 по Москве. Архивы в `/var/backups/potok` доступны только root. Скрипт сохраняет gzip-дамп с правами `0600`; ротация удаляет только файлы собственного шаблона `potok-*.sql.gz`, которые старше семи дней. Копии стоит переносить и за пределы VPS: диск этого же сервера не защищает от его потери.

Проверить восстановление на отдельной тестовой базе до того, как полагаться на резервное копирование. Для восстановления выбранного архива сначала сделать свежую копию и остановить запись:

```bash
cd /opt/potok
sudo deploy/backup.sh
docker compose --env-file deploy/.env -f deploy/compose.production.yaml stop api
gzip -dc /var/backups/potok/potok-YYYYmmddTHHMMSSZ.sql.gz \
  | docker compose --env-file deploy/.env -f deploy/compose.production.yaml exec -T db \
      sh -c 'exec psql --single-transaction --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"'
docker compose --env-file deploy/.env -f deploy/compose.production.yaml up -d api web
```

Дамп содержит команды очистки схемы: восстанавливать его только в выбранную базу после сохранения текущего состояния. Транзакция не даст оставить половину восстановленных данных при ошибке.

## Обновления и откат

Перед обновлением выполнить `deploy/backup.sh`, сохранить предыдущий коммит или архив релиза, затем перенести новую версию и повторить `build` / `up -d`. Пароли, SQL-данные и сертификаты при этом сохраняются. Схему не откатывать вслепую: изменения исправляются новой миграцией либо проверенным восстановлением backup.

Для остановки:

```bash
docker compose --env-file deploy/.env -f deploy/compose.production.yaml down
```

Не добавлять `-v`: этот флаг удалит тома вместе с задачами и TLS-данными.

## Диагностика

```bash
docker compose --env-file deploy/.env -f deploy/compose.production.yaml ps
docker compose --env-file deploy/.env -f deploy/compose.production.yaml logs --tail=100 api web migrate
docker stats --no-stream
df -h
```

Ограничения памяти: PostgreSQL 512 MB, API 384 MB, Caddy 192 MB, одноразовые миграции 256 MB. Логи ротируются: три файла по 10 MB на контейнер.
