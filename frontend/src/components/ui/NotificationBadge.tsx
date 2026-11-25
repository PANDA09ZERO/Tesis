/** Contador de notificaciones pendientes junto a un enlace o botón. */
export default function NotificationBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null;
  const label = count === 1 ? '1 notificación pendiente' : `${count} notificaciones pendientes`;
  return (
    <span aria-label={label} title={label} className={`inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[0.75rem] font-bold leading-5 text-white tabular-nums ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
