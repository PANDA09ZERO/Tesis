# Levanta el sistema publicado desde esta PC (plan B: backend local + Tailscale Funnel + Vercel).
# Uso (PowerShell):  powershell -ExecutionPolicy Bypass -File C:\xampp\htdocs\Tesis\deploy\local\iniciar-sistema.ps1
# Variables privadas: C:\gestion-produccion\backend.env (fuera del repositorio).

$ErrorActionPreference = 'Stop'
$repo      = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile   = 'C:\gestion-produccion\backend.env'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'
$publica   = 'https://cienciaseingeniaria.tail4a4bea.ts.net'

function Paso($numero, $texto, [scriptblock]$accion) {
  Write-Host "[$numero] $texto..." -NoNewline
  try { & $accion; Write-Host ' OK' -ForegroundColor Green }
  catch {
    Write-Host ' FALLO' -ForegroundColor Red
    Write-Host "    $($_.Exception.Message)" -ForegroundColor Red
    Read-Host 'Copia el mensaje en rojo y presiona Enter para cerrar'
    exit 1
  }
}

Paso 1 'Archivo de variables de produccion' {
  if (-not (Test-Path $envFile)) { throw "Falta $envFile" }
}

Paso 2 'MySQL' {
  # Acepta cualquier servicio de MySQL/MariaDB (MySQL80, MySQL84, MySQL, etc.)
  $svc = Get-Service | Where-Object { $_.Name -match '^(mysql|mariadb)' } | Select-Object -First 1
  if (-not $svc) {
    $puerto = (Select-String -Path $envFile -Pattern '^DB_PORT=(\d+)').Matches.Groups[1].Value
    if (-not $puerto) { $puerto = 3306 }
    if (-not (Test-NetConnection 127.0.0.1 -Port $puerto -InformationLevel Quiet -WarningAction SilentlyContinue)) {
      throw "No hay servicio de MySQL ni nada escuchando en el puerto $puerto. Inicia MySQL (Workbench o XAMPP)."
    }
    return
  }
  if ($svc.Status -ne 'Running') { Start-Service $svc.Name }
}

Paso 3 'PM2 instalado' {
  if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) { throw 'pm2 no esta instalado. Ejecuta: npm install -g pm2' }
}

Paso 4 'Compilar backend (npm run build)' {
  Push-Location (Join-Path $repo 'backend')
  try { npm run build 2>&1 | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'npm run build fallo; ejecutalo en backend para ver el error' } }
  finally { Pop-Location }
}

Paso 5 'Iniciar backend con PM2' {
  $env:GESTION_ENV_FILE = $envFile
  Set-Location $repo
  $ErrorActionPreference = 'Continue'
  pm2 delete gestion-backend 2>&1 | Out-Null
  Start-Sleep -Seconds 1
  # Si otro programa ocupa el puerto 3000 (p. ej. un backend de desarrollo), se detiene.
  $ocupado = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($procId in $ocupado) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if (-not $proc) { continue }
    if ($proc.ProcessName -ne 'node') { throw "El puerto 3000 lo usa '$($proc.ProcessName)' (PID $procId). Cierralo y vuelve a intentar." }
    Write-Host " (deteniendo node PID $procId que ocupaba el puerto 3000)" -NoNewline
    Stop-Process -Id $procId -Force
  }
  Start-Sleep -Seconds 1
  pm2 start deploy\oracle\ecosystem.config.cjs 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'pm2 start fallo; revisa "pm2 logs gestion-backend"' }
  # Comprueba que quien escucha en el puerto 3000 sea el proceso de PM2 (y que no se este reiniciando).
  $pm2Pid = $null; $escucha = $null
  foreach ($i in 1..10) {
    Start-Sleep -Seconds 1
    $pm2Pid  = (pm2 pid gestion-backend 2>$null | Select-Object -Last 1) -as [int]
    $escucha = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
    if ($pm2Pid -and $escucha -eq $pm2Pid) { break }
  }
  if (-not $pm2Pid -or $escucha -ne $pm2Pid) { throw 'El backend de PM2 no quedo escuchando en el puerto 3000; revisa "pm2 logs gestion-backend --lines 40"' }
  Start-Sleep -Seconds 3
  if (((pm2 pid gestion-backend 2>$null | Select-Object -Last 1) -as [int]) -ne $pm2Pid) { throw 'El backend de PM2 se esta reiniciando; revisa "pm2 logs gestion-backend --lines 40"' }
  pm2 save 2>&1 | Out-Null
}

Paso 6 'Tailscale Funnel (puerto 3000)' {
  if (-not (Test-Path $tailscale)) { throw "No se encontro $tailscale" }
  $ErrorActionPreference = 'Continue'
  $salida = & $tailscale funnel --bg 3000 2>&1
  if ($LASTEXITCODE -ne 0) { throw "tailscale funnel fallo: $salida. Revisa que Tailscale este abierto y con sesion iniciada." }
}

# Comprobacion final
Start-Sleep -Seconds 6
try { $local = (Invoke-RestMethod http://127.0.0.1:3000/api/ready -TimeoutSec 10).status } catch { $local = 'ERROR' }
try { $web = (Invoke-RestMethod "$publica/api/ready" -TimeoutSec 30).status } catch { $web = 'ERROR' }
Write-Host ''
Write-Host "Backend local:   $local"
Write-Host "Backend por Tailscale: $web  ($publica)"
Write-Host '  (desde esta laptop se prueba por la red interna; para confirmar el acceso publico abre la URL en el celular con datos moviles)' -ForegroundColor DarkGray
Write-Host 'Frontend:        https://cienciaseingeniaria.vercel.app'
if ($local -ne 'ready') { Write-Host 'El backend no responde. Ultimas lineas del registro:' -ForegroundColor Red; pm2 logs gestion-backend --lines 20 --nostream }
elseif ($web -ne 'ready') { Write-Host 'El backend funciona pero Tailscale no lo expone: revisa "tailscale status" y "tailscale funnel status".' -ForegroundColor Red }
else {
  Write-Host 'Todo listo.' -ForegroundColor Green
  Write-Host 'Si en ESTA laptop Vercel no carga: desactiva "DNS seguro" en el navegador (brave://settings/security o chrome://settings/security).' -ForegroundColor DarkGray
}
Read-Host 'Presiona Enter para cerrar'
