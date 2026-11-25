/**
 * Contador de pendientes junto a un enlace o botón.
 * Con `describes`, el número no altera el nombre accesible del control: se marca aria-hidden y el
 * texto queda en un span con ese id, para enlazarlo con aria-describedby.
 */
export default function NotificationBadge({ count, className = '', describes }: { count: number; className?: string; describes?: string }) {
  if (count <= 0) return null;
  const label = count === 1 ? '1 pendiente' : `${count} pendientes`;
  const badge = 'inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[0.75rem] font-bold leading-5 text-white tabular-nums';
  if (describes) {
    return <>
      <span aria-hidden="true" title={label} className={`${badge} ${className}`}>{count > 99 ? '99+' : count}</span>
      <span id={describes} className="sr-only">{label}</span>
    </>;
  }
  return <span aria-label={label} title={label} className={`${badge} ${className}`}>{count > 99 ? '99+' : count}</span>;
}
