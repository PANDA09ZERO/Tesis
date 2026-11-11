import yauzl from 'yauzl';
import { SaxesParser } from 'saxes';

// Lectura de hojas de cálculo (.xlsx y .csv) en memoria, sin dependencias nuevas.
// Solo se lee la primera hoja; nunca se escribe al disco.

export class HojaInvalida extends Error {}

const MAX_FILAS = 5000;
const MAX_XML_BYTES = 20 * 1024 * 1024;

function leerZip(buffer: Buffer, buscados: (nombre: string) => boolean): Promise<Map<string, string>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new HojaInvalida('El archivo no es un Excel (.xlsx) válido'));
      const partes = new Map<string, string>();
      let total = 0, entradas = 0, terminado = false;
      const fin = (err?: Error) => { if (terminado) return; terminado = true; zip.close(); err ? reject(err) : resolve(partes); };
      zip.on('error', () => fin(new HojaInvalida('El archivo Excel está dañado')));
      zip.on('end', () => fin());
      zip.on('entry', entry => {
        const nombre = entry.fileName;
        total += entry.uncompressedSize;
        if (++entradas > 2000 || total > 100 * 1024 * 1024 || entry.generalPurposeBitFlag & 1
          || entry.uncompressedSize > Math.max(1024 * 1024, entry.compressedSize * 200)) return fin(new HojaInvalida('El archivo Excel no es válido o es demasiado grande'));
        if (nombre.endsWith('/') || !buscados(nombre)) return zip.readEntry();
        if (entry.uncompressedSize > MAX_XML_BYTES) return fin(new HojaInvalida('La hoja es demasiado grande'));
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fin(new HojaInvalida('No se pudo leer el Excel'));
          const chunks: Buffer[] = []; let bytes = 0;
          stream.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > MAX_XML_BYTES) { stream.destroy(); fin(new HojaInvalida('La hoja es demasiado grande')); } else chunks.push(chunk); });
          stream.on('error', () => fin(new HojaInvalida('No se pudo leer el Excel')));
          stream.on('end', () => { partes.set(nombre, Buffer.concat(chunks).toString('utf8')); zip.readEntry(); });
        });
      });
      zip.readEntry();
    });
  });
}

function parsearXml(xml: string, onOpen: (tag: any) => void, onText?: (text: string) => void, onClose?: (name: string) => void) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new HojaInvalida('El archivo Excel contiene estructuras no permitidas');
  const parser = new SaxesParser();
  parser.on('opentag', onOpen);
  if (onText) parser.on('text', onText);
  if (onClose) parser.on('closetag', tag => onClose(tag.name));
  try { parser.write(xml).close(); } catch (error) {
    if (error instanceof HojaInvalida) throw error;
    throw new HojaInvalida('El archivo Excel está dañado');
  }
}

const local = (name: string) => name.includes(':') ? name.split(':')[1] : name;

function columnaIndice(ref: string) {
  const letras = (ref.match(/^[A-Z]+/) || [''])[0];
  let n = 0; for (const c of letras) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

async function leerXlsx(buffer: Buffer): Promise<string[][]> {
  const partes = await leerZip(buffer, n => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/[^/]+\.xml$/.test(n));
  const workbook = partes.get('xl/workbook.xml');
  if (!workbook) throw new HojaInvalida('El archivo no es un Excel (.xlsx) válido');

  let primeraHoja = '';
  parsearXml(workbook, tag => { if (!primeraHoja && local(tag.name) === 'sheet') primeraHoja = tag.attributes['r:id'] || ''; });
  let destino = '';
  const rels = partes.get('xl/_rels/workbook.xml.rels');
  if (rels && primeraHoja) parsearXml(rels, tag => { if (local(tag.name) === 'Relationship' && tag.attributes.Id === primeraHoja) destino = tag.attributes.Target; });
  const ruta = destino ? (destino.startsWith('/') ? destino.slice(1) : 'xl/' + destino.replace(/^\.\//, '')) : 'xl/worksheets/sheet1.xml';
  const hoja = partes.get(ruta);
  if (!hoja) throw new HojaInvalida('No se encontró la primera hoja del Excel');

  const compartidos: string[] = [];
  const sst = partes.get('xl/sharedStrings.xml');
  if (sst) {
    let actual: string | null = null, enTexto = false, enFonetico = false;
    parsearXml(sst, tag => {
      const n = local(tag.name);
      if (n === 'si') actual = ''; else if (n === 'rPh') enFonetico = true; else if (n === 't' && !enFonetico) enTexto = true;
    }, text => { if (enTexto && actual !== null) actual += text; }, name => {
      const n = local(name);
      if (n === 't') enTexto = false; else if (n === 'rPh') enFonetico = false; else if (n === 'si') { compartidos.push(actual || ''); actual = null; }
    });
  }

  const filas: string[][] = [];
  let fila: string[] | null = null, tipo = '', col = 0, valor = '', enValor = false;
  parsearXml(hoja, tag => {
    const n = local(tag.name);
    if (n === 'row') { fila = []; if (filas.length >= MAX_FILAS) throw new HojaInvalida(`El archivo supera el máximo de ${MAX_FILAS} filas`); }
    else if (n === 'c') { tipo = tag.attributes.t || ''; col = tag.attributes.r ? columnaIndice(tag.attributes.r) : (fila?.length || 0); valor = ''; }
    else if (n === 'v' || n === 't') enValor = true;
  }, text => { if (enValor) valor += text; }, name => {
    const n = local(name);
    if (n === 'v' || n === 't') enValor = false;
    else if (n === 'c' && fila) {
      if (col > 200) return;
      let texto = valor;
      if (tipo === 's') texto = compartidos[Number(valor)] ?? '';
      else if (tipo === 'b') texto = valor === '1' ? 'VERDADERO' : 'FALSO';
      while (fila.length < col) fila.push('');
      fila[col] = texto.trim();
    } else if (n === 'row' && fila) { filas.push(fila); fila = null; }
  });
  return filas;
}

function decodificarTexto(buffer: Buffer) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { return new TextDecoder('windows-1252').decode(buffer); } // CSV guardado por Excel en Windows
}

export function leerCsv(texto: string): string[][] {
  texto = texto.replace(/^﻿/, '');
  const primera = texto.split(/\r?\n/, 1)[0] || '';
  const delimitador = [';', ',', '\t'].map(d => [d, primera.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const filas: string[][] = [];
  let fila: string[] = [], campo = '', comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"' && campo === '') comillas = true;
    else if (c === delimitador) { fila.push(campo.trim()); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo.trim()); filas.push(fila); fila = []; campo = '';
      if (filas.length > MAX_FILAS) throw new HojaInvalida(`El archivo supera el máximo de ${MAX_FILAS} filas`);
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo.trim()); filas.push(fila); }
  return filas;
}

export async function leerHojaCalculo(buffer: Buffer, nombreArchivo: string): Promise<string[][]> {
  const extension = nombreArchivo.toLowerCase().split('.').pop();
  let filas: string[][];
  if (extension === 'xlsx') {
    if (buffer.subarray(0, 4).toString('binary') !== 'PK\u0003\u0004') throw new HojaInvalida('El archivo no es un Excel (.xlsx) válido');
    filas = await leerXlsx(buffer);
  } else if (extension === 'csv' || extension === 'txt') filas = leerCsv(decodificarTexto(buffer));
  else throw new HojaInvalida('Formato no admitido. Usa Excel (.xlsx) o CSV');
  return filas.filter(f => f.some(c => c !== ''));
}
