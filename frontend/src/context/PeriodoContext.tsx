import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { periodosApi } from '../api/endpoints';
import { useAuth } from './AuthContext';
import type { PeriodoAcademico } from '../types';

const STORAGE_KEY = 'periodo_global_id';

interface PeriodoContextType {
  periodos: PeriodoAcademico[];
  /** '' = todos los periodos; si no, id del periodo seleccionado */
  periodoId: string;
  setPeriodoId: (id: string) => void;
  /** Objeto del periodo seleccionado (undefined si es "todos") */
  periodo: PeriodoAcademico | undefined;
  /** true si el periodo seleccionado es el vigente (activo) */
  esVigente: boolean;
  /** true si se seleccionó un periodo que no es el vigente (vista histórica) */
  esHistorico: boolean;
  /** true si no se filtró por periodo ("todos") */
  todos: boolean;
  /** true cuando los periodos ya cargaron (o el rol no los necesita) */
  listo: boolean;
  /** true para roles con contexto académico global (administrador/profesor) */
  aplica: boolean;
}

const PeriodoContext = createContext<PeriodoContextType | undefined>(undefined);

export function PeriodoProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const aplica = user?.rol === 'administrador' || user?.rol === 'profesor';

  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [periodoId, setPeriodoIdState] = useState<string>(() => {
    const guardado = localStorage.getItem(STORAGE_KEY);
    return guardado !== null ? guardado : '';
  });
  const [listo, setListo] = useState(!aplica);

  useEffect(() => {
    if (!aplica) { setListo(true); return; }
    let vivo = true;
    periodosApi.getAll().then(res => {
      if (!vivo) return;
      const lista = res.data.data || [];
      setPeriodos(lista);
      const activo = lista.find(p => p.activo);
      setPeriodoIdState(prev => {
        // Restaurar guardado solo si es válido; si no, vigente por defecto
        if (prev !== '' && lista.some(p => String(p.id) === prev)) return prev;
        if (prev === '' && localStorage.getItem(STORAGE_KEY) === '') return '';
        return activo ? String(activo.id) : '';
      });
      setListo(true);
    }).catch(() => { if (vivo) setListo(true); });
    return () => { vivo = false; };
  }, [aplica]);

  const setPeriodoId = useCallback((id: string) => {
    setPeriodoIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const periodo = periodos.find(p => String(p.id) === periodoId);
  const esVigente = !!periodo?.activo;
  const esHistorico = !!periodo && !periodo.activo;
  const todos = periodoId === '';

  return (
    <PeriodoContext.Provider value={{ periodos, periodoId, setPeriodoId, periodo, esVigente, esHistorico, todos, listo, aplica }}>
      {children}
    </PeriodoContext.Provider>
  );
}

export function usePeriodo() {
  const ctx = useContext(PeriodoContext);
  if (!ctx) throw new Error('usePeriodo debe usarse dentro de PeriodoProvider');
  return ctx;
}
