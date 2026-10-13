#!/usr/bin/env bash

set -o errexit

cd "$(dirname "$0")"

pip install -r requirements.txt

python manage.py collectstatic --no-input

python manage.py migrate