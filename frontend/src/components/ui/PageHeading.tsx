// Encabezado de página: título y descripción, sin icono decorativo genérico.
export default function PageHeading({ title, description }: { title: string; description: string }) {
  return <header className="app-page-heading"><div className="min-w-0"><h1>{title}</h1><p>{description}</p></div></header>;
}
