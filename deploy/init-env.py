#!/usr/bin/env python3
"""Create server-only secrets from one JSON line on stdin; never print them."""
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys


def main():
    destination = Path(__file__).resolve().parent / '.env'
    if destination.exists():
        raise RuntimeError('Production environment already exists; refusing to replace secrets')
    domain = sys.argv[1] if len(sys.argv) == 2 else ''
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]*\.[a-z]{2,}', domain):
        raise ValueError('Pass the production domain as the only argument')
    supplied = json.loads(sys.stdin.readline())
    username = supplied.get('username', 'owner')
    password = supplied.get('password', '')
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,32}', username) or len(password) < 16:
        raise ValueError('A simple username and a separate password of at least 16 characters are required')
    hashed = subprocess.run(
        ['docker', 'run', '--rm', '-i', 'caddy:2-alpine', 'caddy', 'hash-password'],
        input=password + '\n', text=True, capture_output=True, check=True,
    ).stdout.strip()
    if not re.fullmatch(r'\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}', hashed):
        raise RuntimeError('Caddy did not return a valid password hash')
    settings = '\n'.join([
        f'DOMAIN={domain}', 'POSTGRES_USER=potok', 'POSTGRES_DB=potok',
        f'POSTGRES_PASSWORD={secrets.token_hex(32)}', f'POTOK_AUTH_USER={username}',
        f"POTOK_AUTH_HASH='{hashed}'", '',
    ])
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(settings)
    print(f'Production environment created for {domain}; secrets were not printed')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except subprocess.CalledProcessError:
        print('Caddy password hashing failed; environment was not created', file=sys.stderr)
        sys.exit(1)
