/** Indicador mientras se descarga el código de una página (carga diferida con React.lazy). */
export default function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando página"
      className={`flex items-center justify-center ${fullScreen ? 'min-h-screen min-h-dvh' : 'min-h-[40vh]'}`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600 dark:border-gray-300" />
    </div>
  );
}
