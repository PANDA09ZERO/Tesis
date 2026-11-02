# Navegación en teléfono

Por debajo de 1024 px solo se muestra la barra inferior. Se retiran el botón ☰, el panel vertical móvil y su fondo superpuesto. Desde 1024 px se muestra el menú lateral de escritorio y se oculta la barra inferior.

- Módulos abre el catálogo con los accesos permitidos para la cuenta.
- Inicio, Horarios, Notas/Reportes y Perfil conservan sus rutas según el rol.
- El apoderado conserva únicamente Inicio, Módulos y Perfil.
- Cerrar sesión en teléfono se realiza desde Perfil → Seguridad; en escritorio también permanece en el lateral.
- Los botones de tema y cuenta de la cabecera se conservan.
- Cambiar de tamaño no deja paneles abiertos ni fondos superpuestos.

## Archivos

- `frontend/src/components/layout/AppLayout.tsx`: retira el disparador y estado del panel móvil.
- `frontend/src/components/layout/Sidebar.tsx`: menú exclusivamente de escritorio.
- `frontend/src/components/layout/BottomNavigation.tsx`: elimina el estado de ocultación asociado al panel móvil.
- `frontend/tests/e2e/dashboard-mobile.spec.ts`: navegación por rol y cierre de sesión mediante Perfil.
- `frontend/tests/e2e/modulos-ui.spec.ts`: barra inferior, catálogo con teclado y límites de pantalla.

## Validación

- `cd frontend && npm run build`: correcto; se conserva el aviso de tamaño del paquete principal.
- `cd frontend && npm run test:e2e -- dashboard-mobile.spec.ts modulos-ui.spec.ts perfil-ui.spec.ts avisos-ui.spec.ts`: 35 pruebas aprobadas y 1 omitida (caso exclusivo de móvil en el proyecto de escritorio).
- Se verificaron 320, 768, 915, 1023, 1024 y 1280 px, cambio de tamaño, navegación con teclado y rutas por rol.
- `git diff --check` de los archivos rastreados de esta etapa: sin errores.

Las pruebas usan cuentas sintéticas y una base temporal. No se modificaron datos institucionales.

[Captura de navegación móvil](capturas/navegacion-solo-inferior-mobile.png).
