# Levanta el sistema publicado desde esta PC (plan B: backend local + Tailscale Funnel + Vercel).
# Uso (PowerShell):  powershell -ExecutionPolicy Bypass -File C:\xampp\htdocs\Tesis\deploy\local\iniciar-sistema.ps1
# Variables privadas: C:\gestion-produccion\backend.env (fuera del repositorio).

$ErrorActionPreference = 'Stop'
$repo      = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$envFile   = 'C:\gestion-produccion\backend.env'
$tailscale = 'C:\Program Files\Tailscale\tailscale.exe'
$publica   = 'https://cienciaseingeniaria.tail4a4bea.ts.net'

if (-not (Test-Path $envFile)) { throw "Falta $envFile (variables de producción)." }

# 1. MySQL (servicio de Windows, arranca solo con el equipo)
$mysql = Get-Service -Name 'MySQL80'
if ($mysql.Status -ne 'Running') { Write-Host 'Iniciando MySQL...'; Start-Service 'MySQL80' }
Write-Host "MySQL: $((Get-Service 'MySQL80').Status)"

# 2. Backend en modo producción con PM2
$env:GESTION_ENV_FILE = $envFile
Set-Location $repo
pm2 delete gestion-backend 2>$null | Out-Null
pm2 start deploy\oracle\ecosystem.config.cjs | Out-Null
pm2 save | Out-Null

# 3. Tailscale Funnel (URL pública HTTPS hacia el puerto 3000)
& $tailscale funnel --bg 3000 | Out-Null

# 4. Comprobación
Start-Sleep -Seconds 5
try { $local = (Invoke-RestMethod http://127.0.0.1:3000/api/ready -TimeoutSec 10).status } catch { $local = 'ERROR' }
try { $web = (Invoke-RestMethod "$publica/api/ready" -TimeoutSec 30).status } catch { $web = 'ERROR' }
Write-Host "Backend local:   $local"
Write-Host "Backend público: $web  ($publica)"
Write-Host 'Frontend:        https://cienciaseingeniaria.vercel.app'
if ($local -ne 'ready' -or $web -ne 'ready') { Write-Host 'Algo falló: revisa "pm2 logs gestion-backend" y "tailscale status".' -ForegroundColor Red }
