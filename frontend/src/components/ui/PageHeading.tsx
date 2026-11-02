import { LayoutGrid } from 'lucide-react';
export default function PageHeading({ title, description }: { title: string; description: string }) {
  return <header className="app-page-heading flex items-start gap-3"><span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-gray-800"><LayoutGrid className="h-5 w-5"/></span><div className="min-w-0"><h1>{title}</h1><p>{description}</p></div></header>;
}
