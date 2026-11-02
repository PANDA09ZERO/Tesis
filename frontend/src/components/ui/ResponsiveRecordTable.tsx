import { Children, isValidElement, useSyncExternalStore, type ReactElement, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia('(max-width: 639px)');
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const snapshot = () => window.matchMedia('(max-width: 639px)').matches;
const serverSnapshot = () => false;
function elements(children: ReactNode): ReactElement[] {
  return Children.toArray(children).filter(isValidElement) as ReactElement[];
}
function text(children: ReactNode): string {
  return Children.toArray(children).map(child => {
    if (!isValidElement(child)) return String(child);
    if (child.props.className === 'record-label') return '';
    return text(child.props.children);
  }).join(' ');
}
/** Mounts a single set of editable controls for the current viewport. */
export default function ResponsiveRecordTable({ children }: { children: ReactElement }) {
  const mobile = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (!mobile) return children;
  const sections = elements(children.props.children);
  const header = sections.find(section => section.type === 'thead');
  const body = sections.find(section => section.type === 'tbody');
  const headings = elements(elements(header?.props.children)[0]?.props.children).map(cell => cell.props.children);
  return <div className="mobile-bento-grid" onInvalidCapture={event => {
    const card = (event.target as HTMLElement).closest('details');
    if (card) card.open = true;
  }}>{elements(body?.props.children).map((row, index) => {
    const cells = elements(row.props.children);
    return <details className="mobile-bento-card" key={row.key ?? index}>
      <summary className="mobile-bento-summary">
        <span className="mobile-bento-eyebrow">{headings[0] || 'Registro'}</span>
        <span className="mobile-bento-title">{text(cells[0]?.props.children) || `Registro ${index + 1}`}</span>
        <span className="mobile-bento-hint">Toca para ver detalles <ChevronRight aria-hidden="true" className="h-4 w-4" /></span>
      </summary>
      <div className="mobile-bento-content"><dl className="mobile-bento-fields">{cells.map((cell, cellIndex) => <div key={cell.key ?? cellIndex}>
        <dt>{headings[cellIndex] || 'Acciones'}</dt><dd>{cell.props.children}</dd>
      </div>)}</dl></div>
    </details>;
  })}</div>;
}
