#!/usr/bin/env python3
"""Create server-only database secrets; never print them."""
import os
from pathlib import Path
import re
import secrets
import sys


def main():
    destination = Path(__file__).resolve().parent / '.env'
    if destination.exists():
        raise RuntimeError('Production environment already exists; refusing to replace secrets')
    domain = sys.argv[1] if len(sys.argv) == 2 else ''
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]*\.[a-z]{2,}', domain):
        raise ValueError('Pass the production domain as the only argument')
    settings = '\n'.join([
        f'DOMAIN={domain}', 'POSTGRES_USER=potok', 'POSTGRES_DB=potok',
        f'POSTGRES_PASSWORD={secrets.token_hex(32)}', '',
    ])
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(settings)
    print(f'Production environment created for {domain}; secrets were not printed')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
