import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import './galeria.css';

/*
 * Página pública del colegio. Las fotos se copiaron de backend/uploads a /public/galeria:
 * la carpeta uploads guarda documentos privados y no debe exponerse completa.
 */
type Foto = { src: string; alt: string; titulo: string; detalle: string };

const FOTOS: Foto[] = [
  { src: '/galeria/juegos-escolares-estadio.jpg', titulo: 'Juegos Escolares Deportivos y Paradeportivos', detalle: 'Nuestra delegación de futsal y karate en el desfile inaugural.', alt: 'Estudiantes del colegio sostienen la banderola de los Juegos Escolares en un estadio bajo un cielo con nubes' },
  { src: '/galeria/formacion-patio.jpg', titulo: 'Formación en el patio', detalle: 'Estudiantes de secundaria con el uniforme institucional.', alt: 'Estudiantes uniformados formados en el patio techado, junto a columnas con los valores del colegio' },
  { src: '/galeria/actuacion-patio.jpg', titulo: 'Actuación con las familias', detalle: 'Padres, madres y estudiantes reunidos en el patio techado.', alt: 'Familias y estudiantes en el patio techado decorado con globos y cintas rojas' },
  { src: '/galeria/juegos-escolares-delegacion.jpg', titulo: 'Delegación deportiva', detalle: 'El escudo del colegio acompaña a cada disciplina.', alt: 'Delegación deportiva del colegio con el escudo y carteles de futsal y karate en el estadio' },
];

const VALORES = ['Respeto', 'Puntualidad', 'Civismo', 'Empatía', 'Honestidad', 'Ecológico'];
const NIVELES = ['Inicial', 'Primaria', 'Secundaria', 'CEBA'];

export default function GaleriaPage() {
  const [abierta, setAbierta] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const origenRef = useRef<HTMLButtonElement | null>(null);

  const abrir = (i: number, origen: HTMLButtonElement) => { origenRef.current = origen; setAbierta(i); };
  const cerrar = useCallback(() => setAbierta(null), []);
  const mover = useCallback((paso: number) => setAbierta(i => i === null ? i : (i + paso + FOTOS.length) % FOTOS.length), []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (abierta !== null && !d.open) d.showModal();
    if (abierta === null && d.open) { d.close(); origenRef.current?.focus(); }
  }, [abierta]);

  useEffect(() => { document.title = 'Galería del Colegio Ciencias e Ingeniería'; }, []);

  const foto = abierta === null ? null : FOTOS[abierta];

  return (
    <div className="galeria">
      <header className="galeria-barra">
        <a href="#inicio" className="galeria-marca">
          <img src="/galeria/escudo.png" alt="" width={40} height={40} />
          <span>Ciencias e Ingeniería</span>
        </a>
        <Link to="/login" className="galeria-ingresar">Ingresar al sistema</Link>
      </header>

      <main id="inicio">
        <section className="galeria-portada" aria-labelledby="lema">
          <div className="galeria-portada-texto">
            <p className="galeria-sede">I.E.P. Ciencias e Ingeniería, Manantay, Ucayali</p>
            <h1 id="lema">Disciplina y exigencia académica</h1>
            <p className="galeria-bajada">Así se vive el año escolar en nuestro colegio: en el aula, en el patio y en cada competencia.</p>
            <ul className="galeria-niveles" aria-label="Niveles educativos">
              {NIVELES.map(n => <li key={n}>{n}</li>)}
            </ul>
          </div>
          <img className="galeria-portada-foto" src="/galeria/formacion-patio.jpg" alt="" loading="eager" />
        </section>

        <section className="galeria-valores" aria-label="Valores del colegio">
          {VALORES.map(v => <span key={v}>{v}</span>)}
        </section>

        <section className="galeria-fotos" aria-labelledby="titulo-fotos">
          <div className="galeria-encabezado">
            <h2 id="titulo-fotos">Momentos del colegio</h2>
            <p>Toca una foto para verla en grande.</p>
          </div>
          <ul className="galeria-mosaico">
            {FOTOS.map((f, i) => (
              <li key={f.src} className={`galeria-item galeria-item-${i + 1}`}>
                <button type="button" onClick={e => abrir(i, e.currentTarget)} aria-label={`Ampliar foto: ${f.titulo}`}>
                  <img src={f.src} alt={f.alt} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                </button>
                <div className="galeria-pie">
                  <h3>{f.titulo}</h3>
                  <p>{f.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="galeria-letrero" aria-label="Letrero del colegio">
          <img src="/galeria/letrero-colegio.jpg" alt="Letrero del Colegio Ciencias e Ingeniería: Inicial, Primaria, Secundaria y CEBA. Somos Ciencias, el mejor colegio de Manantay" loading="lazy" />
        </section>
      </main>

      <footer className="galeria-pie-pagina">
        <div>
          <strong>Colegio Ciencias e Ingeniería</strong>
          <p>Manantay, Ucayali</p>
        </div>
        <Link to="/login" className="galeria-ingresar galeria-ingresar-claro">Ingresar al sistema</Link>
      </footer>

      <dialog ref={dialogRef} className="galeria-visor" onClose={cerrar} onCancel={e => { e.preventDefault(); cerrar(); }}
        onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
        onKeyDown={e => { if (e.key === 'ArrowRight') mover(1); if (e.key === 'ArrowLeft') mover(-1); }}
        aria-label={foto ? foto.titulo : 'Visor de fotos'}>
        {foto && (
          <figure>
            <img src={foto.src} alt={foto.alt} />
            <figcaption>
              <span>{foto.titulo}</span>
              <span className="galeria-contador">{(abierta ?? 0) + 1} de {FOTOS.length}</span>
            </figcaption>
            <div className="galeria-visor-controles">
              <button type="button" onClick={() => mover(-1)} aria-label="Foto anterior"><ChevronLeft /></button>
              <button type="button" onClick={() => mover(1)} aria-label="Foto siguiente"><ChevronRight /></button>
              <button type="button" onClick={cerrar} aria-label="Cerrar visor" autoFocus><X /></button>
            </div>
          </figure>
        )}
      </dialog>
    </div>
  );
}
