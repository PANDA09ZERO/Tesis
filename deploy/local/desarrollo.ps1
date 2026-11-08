# Levanta el sistema en MODO DESARROLLO para probar los cambios locales.
# Uso (PowerShell):  powershell -ExecutionPolicy Bypass -File C:\xampp\htdocs\Tesis\deploy\local\desarrollo.ps1
# Usa backend\.env (base gestion_educativa del puerto configurado ahí) y abre http://localhost:5173
# Para cerrar: cierra las dos ventanas que se abren (Backend y Frontend).

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

# 1. Libera el puerto 3000 si el backend de producción (PM2) estaba corriendo
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
  pm2 stop gestion-backend 2>$null | Out-Null
  Write-Host 'Backend de produccion (PM2) detenido para usar el puerto 3000.'
}

# 2. MySQL (si es servicio de Windows)
$mysql = Get-Service -Name 'MySQL80' -ErrorAction SilentlyContinue
if ($mysql -and $mysql.Status -ne 'Running') { Write-Host 'Iniciando MySQL...'; Start-Service 'MySQL80' }

# 3. Instala dependencias si faltan
foreach ($app in 'backend','frontend') {
  if (-not (Test-Path (Join-Path $repo "$app\node_modules"))) {
    Write-Host "Instalando dependencias de $app..."
    Push-Location (Join-Path $repo $app); npm install; Pop-Location
  }
}

# 4. Backend y frontend, cada uno en su ventana (asi ves los errores)
Start-Process powershell -ArgumentList '-NoExit','-Command',"`$host.UI.RawUI.WindowTitle='Backend'; Set-Location '$repo\backend'; npm run dev"
Start-Sleep -Seconds 6
Start-Process powershell -ArgumentList '-NoExit','-Command',"`$host.UI.RawUI.WindowTitle='Frontend'; Set-Location '$repo\frontend'; npm run dev"

# 5. Comprobacion y navegador
Start-Sleep -Seconds 8
try { $estado = (Invoke-RestMethod http://127.0.0.1:3000/api/ready -TimeoutSec 10).status } catch { $estado = 'ERROR' }
Write-Host "Backend: $estado"
if ($estado -ne 'ready') { Write-Host 'El backend no responde: revisa la ventana "Backend".' -ForegroundColor Red }
Start-Process 'http://localhost:5173'
Write-Host 'Abriendo http://localhost:5173 ...'
