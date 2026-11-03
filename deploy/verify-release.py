#!/usr/bin/env python3
"""Verify a fresh public release without login credentials."""
import gzip
import json
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
COMPOSE = ['docker', 'compose', '--env-file', 'deploy/.env', '-f', 'deploy/compose.production.yaml']


def command(arguments, data=None):
    return subprocess.run(arguments, input=data, cwd=ROOT, check=True, capture_output=True).stdout


def main():
    domain = sys.argv[1]
    base = 'https://' + domain

    def request(path, method='GET', body=None):
        headers = {'User-Agent': 'Potok-Release-Check/1.0'}
        if body is not None:
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    def ready():
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            try:
                if request('/api/health')[0] == 200:
                    return
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(1)
        raise RuntimeError('Production API did not become healthy')

    ready()
    assert request('/')[0] == 200
    assert request('/api/tasks')[0] == 200
    assert not request('/')[1].get('WWW-Authenticate')
    status, headers, html = request('/')
    assert headers.get('X-Content-Type-Options') == 'nosniff'
    assert 'frame-ancestors' in headers.get('Content-Security-Policy', '')
    assert 'max-age=' in headers.get('Strict-Transport-Security', '')
    for asset in set(re.findall(r'"(/assets/[^\"]+)"', html.decode())):
        status, headers, _ = request(asset)
        assert status == 200 and 'immutable' in headers.get('Cache-Control', '')
    assert request('/api/missing')[0] == 404
    assert json.loads(request('/api/tasks')[2]) == [], 'Run this verifier only on a fresh empty release'
    print('PASS: HTTPS, public access, health, security headers, assets and empty board', flush=True)

    task_id = None
    restore_database = 'potok_restore_' + uuid.uuid4().hex[:10]
    verification_backup = None
    restore_created = False
    try:
        status, _, body = request('/api/tasks', 'POST', {'title': 'Проверка релиза', 'description': 'Удаляется после проверки', 'priority': 'high'})
        assert status == 201
        task_id = json.loads(body)['id']
        assert request('/api/tasks/' + task_id, 'PATCH', {'title': 'Релиз проверен', 'status': 'done'})[0] == 200
        command(COMPOSE + ['restart', 'api'])
        ready()
        task = next(item for item in json.loads(request('/api/tasks')[2]) if item['id'] == task_id)
        assert task['status'] == 'done' and task['title'] == 'Релиз проверен'
        print('PASS: create, edit, complete and persistence after API restart', flush=True)

        report = command(['bash', 'deploy/backup.sh']).decode().strip()
        verification_backup = Path(report.split('Backup created: ', 1)[1])
        assert verification_backup.parent == Path('/var/backups/potok') and verification_backup.name.startswith('potok-')
        with gzip.open(verification_backup, 'rb') as archive:
            sql = archive.read()
        assert sql and verification_backup.stat().st_mode & 0o777 == 0o600
        command(COMPOSE + ['exec', '-T', 'db', 'createdb', '-U', 'potok', restore_database])
        restore_created = True
        command(COMPOSE + ['exec', '-T', 'db', 'psql', '--single-transaction', '--set', 'ON_ERROR_STOP=1', '-U', 'potok', '-d', restore_database], sql)
        restored = command(COMPOSE + ['exec', '-T', 'db', 'psql', '-U', 'potok', '-d', restore_database, '-Atc', f"SELECT status FROM tasks WHERE id='{task_id}'"]).decode().strip()
        assert restored == 'done'
        print('PASS: private gzip backup and transactional restore into a separate test database', flush=True)
    finally:
        if task_id:
            assert request('/api/tasks/' + task_id, 'DELETE')[0] == 204
        if restore_created:
            command(COMPOSE + ['exec', '-T', 'db', 'dropdb', '-U', 'potok', restore_database])
        if verification_backup and verification_backup.parent == Path('/var/backups/potok'):
            verification_backup.unlink(missing_ok=True)
    assert json.loads(request('/api/tasks')[2]) == []
    command(['bash', 'deploy/backup.sh'])
    print('PASS: release checks cleaned up; board is empty; fresh backup saved', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Release verification failed: ' + type(error).__name__ + ': ' + str(error), file=sys.stderr)
        sys.exit(1)
