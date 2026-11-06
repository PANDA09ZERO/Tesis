#!/usr/bin/env bash
# Respaldo diario de la base y de los documentos subidos (cron, ver docs/despliegue-oracle.md).
# Credenciales: /etc/gestion-educativa/respaldo.cnf (usuario gestion_respaldo, solo lectura).
#
# Nota: la base y los archivos no se copian en el mismo instante exacto. Para un respaldo
# completo y verificable (con manifiesto SHA-256) en mantenimiento, usar
# `npm run backup:create` del backend (docs/operacion-produccion.md, sección 5).
set -euo pipefail
umask 077

DESTINO="${DESTINO:-/srv/gestion/backups}"
UPLOADS="${UPLOADS:-/srv/gestion/uploads}"
CNF="${CNF:-/etc/gestion-educativa/respaldo.cnf}"
BASE="${BASE:-gestion_educativa}"
RETENCION_DIAS="${RETENCION_DIAS:-14}"
FECHA="$(date +%Y%m%d_%H%M)"

mkdir -p "$DESTINO"

mysqldump --defaults-extra-file="$CNF" --single-transaction --routines --triggers --events \
  --no-tablespaces --set-gtid-purged=OFF --default-character-set=utf8mb4 "$BASE" \
  | gzip -9 > "$DESTINO/bd_$FECHA.sql.gz.tmp"
mv "$DESTINO/bd_$FECHA.sql.gz.tmp" "$DESTINO/bd_$FECHA.sql.gz"

tar -czf "$DESTINO/uploads_$FECHA.tar.gz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"

( cd "$DESTINO" && sha256sum "bd_$FECHA.sql.gz" "uploads_$FECHA.tar.gz" > "SHA256SUMS_$FECHA" )

# Comprobación mínima: el gzip debe estar íntegro y terminar con la marca de mysqldump.
gzip -t "$DESTINO/bd_$FECHA.sql.gz"
zcat "$DESTINO/bd_$FECHA.sql.gz" | tail -1 | grep -q "Dump completed"

find "$DESTINO" -maxdepth 1 -type f \( -name 'bd_*' -o -name 'uploads_*' -o -name 'SHA256SUMS_*' \) \
  -mtime +"$RETENCION_DIAS" -delete

echo "$(date -Is) respaldo OK: bd_$FECHA.sql.gz uploads_$FECHA.tar.gz"
