# Genera la guía en video para CELULAR (vertical 1080x1920, sin subtítulos, voz +18 %).
# Uso (PowerShell):
#   powershell -ExecutionPolicy Bypass -File C:\xampp\htdocs\Tesis\video-guia\generar-video.ps1
# Opciones:
#   -SinCapturas   reutiliza las capturas ya tomadas
#   -SinVoz        reutiliza la voz ya generada
#   -SoloRender    solo vuelve a renderizar (no captura ni genera voz)
#   -SoloCapturas  solo toma las capturas (para revisarlas antes de generar el video)
# Las capturas usan una base de demostración (gestion_video_demo) con datos ficticios; tu base real no se toca.
# Mientras toma las capturas, el sistema publicado (PM2) se detiene unos minutos y luego se vuelve a encender.

param([switch]$SinCapturas, [switch]$SinVoz, [switch]$SoloRender, [switch]$SoloCapturas)
if ($SoloRender) { $SinCapturas = $true; $SinVoz = $true }

# 'Continue': en Windows PowerShell 5.1, 'Stop' convierte en error cualquier texto que npm/pm2 escriban en stderr.
$ErrorActionPreference = 'Continue'
$vg   = $PSScriptRoot
$repo = Split-Path -Parent $vg
$log  = Join-Path $vg 'renders\generar-video.log'
New-Item -ItemType Directory -Force (Join-Path $vg 'renders') | Out-Null
Start-Transcript -Path $log -Force | Out-Null

function Titulo($t) { Write-Host ''; Write-Host "== $t ==" -ForegroundColor Cyan }
function Falla($t) { Write-Host "ERROR: $t" -ForegroundColor Red; Stop-Transcript | Out-Null; Read-Host 'Presiona Enter para cerrar'; exit 1 }
function Esperar($url, $seg) {
  for ($i = 0; $i -lt $seg; $i++) { try { Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null; return $true } catch { Start-Sleep 1 } }
  return $false
}

# ---------- 0. Herramientas ----------
Titulo 'Revisando herramientas'
foreach ($c in 'node', 'npx', 'ffmpeg') { if (-not (Get-Command $c -ErrorAction SilentlyContinue)) { Falla "No se encontró '$c'. Instálalo y vuelve a intentar." } }
$py = $null
foreach ($c in 'python', 'py') { if (Get-Command $c -ErrorAction SilentlyContinue) { $py = $c; break } }
if (-not $SinVoz -and -not $SoloCapturas) {
  if (-not $py) { Falla 'No se encontró Python (python o py).' }
  & $py -c "import edge_tts" 2>$null
  if ($LASTEXITCODE -ne 0) { Write-Host 'Instalando edge-tts...'; & $py -m pip install --user edge-tts; if ($LASTEXITCODE -ne 0) { Falla 'No se pudo instalar edge-tts' } }
}
Write-Host 'OK' -ForegroundColor Green

# ---------- 1. Capturas ----------
if (-not $SinCapturas) {
  Titulo 'Creando la base de demostración (datos ficticios)'
  # Base aparte (gestion_video_demo) con un colegio ficticio y cuentas de prueba; tu base real no se toca.
  node (Join-Path $vg 'tools\demo\crear-base-demo.cjs')
  if ($LASTEXITCODE -ne 0) { Falla 'No se pudo crear la base de demostración (revisa que MySQL esté encendido).' }
  $env:DB_NAME = 'gestion_video_demo'
  $env:ANON_MAP = Join-Path $vg 'tools\demo\sin-anonimizar.json'  # los datos ya son ficticios
  Remove-Item Env:CAPTURE_CREDS -ErrorAction SilentlyContinue

  Titulo 'Preparando el sistema local para las capturas'
  $pm2 = [bool](Get-Command pm2 -ErrorAction SilentlyContinue)
  if ($pm2) { pm2 stop gestion-backend 2>&1 | Out-Null; Write-Host 'Sistema publicado (PM2) detenido temporalmente.' }
  # libera el puerto 3000 si lo ocupa otro node
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { $p = Get-Process -Id $_ -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $_ -Force } }
  $back  = Start-Process cmd -ArgumentList '/c', 'npm run dev > ..\video-guia\renders\backend-dev.log 2>&1' -WorkingDirectory (Join-Path $repo 'backend') -WindowStyle Hidden -PassThru
  $front = Start-Process cmd -ArgumentList '/c', 'npm run dev > ..\video-guia\renders\frontend-dev.log 2>&1' -WorkingDirectory (Join-Path $repo 'frontend') -WindowStyle Hidden -PassThru
  try {
    if (-not (Esperar 'http://127.0.0.1:3000/api/ready' 90)) { throw 'El backend local no respondió (revisa renders\backend-dev.log).' }
    if (-not (Esperar 'http://localhost:5173/login' 90)) { throw 'El frontend local no respondió (revisa renders\frontend-dev.log).' }
    Titulo 'Tomando capturas (62 pantallas, unos minutos)'
    Push-Location $vg
    node tools\capturas\capture.cjs tools\capturas\shots-v3.json
    $codigo = $LASTEXITCODE
    Pop-Location
    if ($codigo -eq 1) { throw 'Las capturas no se pudieron tomar (mira los mensajes CUENTA o FALLO de arriba).' }
    if ($codigo -eq 2) { Write-Host 'Algunas capturas fallaron; se continúa con las demás (mira los mensajes FALLO).' -ForegroundColor Yellow }
  } catch { $errorCapturas = $_.Exception.Message }
  finally {
    foreach ($p in $back, $front) { if ($p -and -not $p.HasExited) { taskkill /PID $p.Id /T /F 2>&1 | Out-Null } }
    Get-NetTCPConnection -LocalPort 3000, 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique |
      ForEach-Object { $p = Get-Process -Id $_ -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $_ -Force } }
    Remove-Item Env:DB_NAME, Env:ANON_MAP -ErrorAction SilentlyContinue  # el sistema publicado vuelve a su propia base
    if ($pm2) { pm2 start gestion-backend 2>&1 | Out-Null; Write-Host 'Sistema publicado (PM2) encendido de nuevo.' -ForegroundColor Green }
  }
  Remove-Item Env:DB_NAME -ErrorAction SilentlyContinue
  if ($errorCapturas) { Falla $errorCapturas }
}

if ($SoloCapturas) {
  Write-Host ''
  Write-Host 'Capturas listas en assets\screenshots\v2 (no se generó el video).' -ForegroundColor Green
  Stop-Transcript | Out-Null; Read-Host 'Presiona Enter para cerrar'; exit 0
}

# ---------- 2. Voz ----------
if (-not $SinVoz) {
  Titulo 'Generando la voz (necesita internet)'
  Push-Location $vg
  & $py tools\voz_edge.py
  $codigo = $LASTEXITCODE
  Pop-Location
  if ($codigo -ne 0) { Falla 'No se pudo generar la voz (revisa tu conexión a internet).' }
}

# ---------- 3. Composición ----------
Titulo 'Armando el video vertical'
Push-Location $vg
node tools\build-movil.mjs
if ($LASTEXITCODE -ne 0) { Pop-Location; Falla 'No se pudo armar la composición.' }

# ---------- 4. Render ----------
Titulo 'Renderizando el MP4 (puede tardar varios minutos)'
$inicio = Get-Date
npx --yes hyperframes@0.9.9 render
$codigo = $LASTEXITCODE
Pop-Location
if ($codigo -ne 0) { Falla 'El render falló (mira los mensajes de arriba).' }
$mp4 = Get-ChildItem (Join-Path $vg 'renders') -Filter *.mp4 | Where-Object { $_.LastWriteTime -ge $inicio } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $mp4) { Falla 'No se encontró el MP4 generado en la carpeta renders.' }
$final = Join-Path $vg 'renders\guia-celular-ciencias-e-ingenieria.mp4'
if ($mp4.FullName -ne $final) { Copy-Item $mp4.FullName $final -Force }
Write-Host ''
Write-Host "Listo: $final" -ForegroundColor Green
Stop-Transcript | Out-Null
Read-Host 'Presiona Enter para cerrar'
