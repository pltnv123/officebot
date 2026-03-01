#!/usr/bin/env bash
set -euo pipefail
rsync -avz office/Build/ ${DEPLOY_TARGET:-user@host:/var/www/html/office/Build/}
