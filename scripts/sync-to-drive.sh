#!/usr/bin/env bash
# Uso manual, pos-evento: sincroniza tudo que esta no bucket Hetzner para o
# Google Drive do casal. Nao e chamado automaticamente por nenhum cron/PM2 —
# rode quando quiser. Pre-requisito: `rclone config` ja configurado com os
# remotes "hetzner" e "gdrive" (ver docs/sync-para-drive.md).
set -euo pipefail

BUCKET_NAME="${1:?Uso: scripts/sync-to-drive.sh <nome-do-bucket> [pasta-no-drive]}"
DRIVE_FOLDER="${2:-AlbumCasamento}"

echo "Sincronizando hetzner:${BUCKET_NAME}/uploads -> gdrive:${DRIVE_FOLDER} ..."
rclone sync "hetzner:${BUCKET_NAME}/uploads" "gdrive:${DRIVE_FOLDER}" \
  --progress \
  --checksum \
  --transfers 4 \
  --log-file "logs/rclone-sync.log" \
  --log-level INFO

echo "Sincronização concluída. Log em logs/rclone-sync.log"
