import { createContext, useContext } from 'react';
export const NavigationContext = createContext<{openModules: () => void; openProfile: () => void} | null>(null);
export function useAppNavigation() { const context = useContext(NavigationContext); if (!context) throw new Error('La navegación requiere AppLayout'); return context; }
