import { createContext } from 'react';

export const ServerStyleContext = createContext<{ key: string; ids: Array<string>; css: string; }[] | null>(null);
export const ClientStyleContext = createContext<{ reset:() => void; } | null>(null);
