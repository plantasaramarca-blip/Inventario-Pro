import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as api from '../services/supabaseService.ts';
// FIX: Import Loader2 to fix reference error.
import { 
  Search, Package, User, MapPin, ArrowRight, CornerDownLeft, X, Loader2
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
}

const staticActions = [
  { type: 'Action', name: 'Nuevo Producto', page: 'inventory', state: { openNewProductModal: true }, icon: Package },
  { type: 'Action', name: 'Nuevo Despacho', page: 'kardex', state: { prefill: { type: 'SALIDA' } }, icon: ArrowRight },
  { type: 'Action', name: 'Nuevo Ingreso', page: 'kardex', state: { prefill: { type: 'INGRESO' } }, icon: ArrowRight },
  { type: 'Action', name: 'Nuevo Contacto', page: 'contacts', state: { openNewContactModal: true }, icon: User },
  { type: 'Navigation', name: 'Ir a Dashboard', page: 'dashboard', icon: ArrowRight },
  { type: 'Navigation', name: 'Ir a Kardex', page: 'kardex', icon: ArrowRight },
  { type: 'Navigation', name: 'Ir a Reportes', page: 'reports', icon: ArrowRight },
];

export const CommandPalette = ({ isOpen, onClose, onNavigate }: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setLoading(true);
      Promise.all([api.getProducts(), api.getContacts(), api.getDestinos()])
        .then(([products, contacts, destinations]) => {
          const productResults = products.map(p => ({ type: 'Product', ...p }));
          const contactResults = contacts.map(c => ({ type: 'Contact', ...c }));
          const destinationResults = destinations.map(d => ({ type: 'Destination', ...d }));
          setResults([...productResults, ...contactResults, ...destinationResults]);
        }).finally(() => setLoading(false));
    } else {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    if (!search) return staticActions;
    const lowerSearch = search.toLowerCase();
    
    const filteredContent = results.filter(item => 
      item.name.toLowerCase().includes(lowerSearch) || 
      (item.code && item.code.toLowerCase().includes(lowerSearch))
    );
    
    const filteredActions = staticActions.filter(action => 
      action.name.toLowerCase().includes(lowerSearch)
    );

    return [...filteredActions, ...filteredContent];
  }, [search, results]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(filteredResults.length - 1, prev + 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredResults[selectedIndex];
        if (item) handleSelect(item);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredResults]);

  useEffect(() => {
    resultsRef.current?.children[selectedIndex]?.scrollIntoView({
        block: 'nearest',
    });
  }, [selectedIndex]);

  const handleSelect = (item: any) => {
    onClose();
    switch (item.type) {
      case 'Product':
        onNavigate('productDetail', { push: true, state: { productId: item.id } });
        break;
      case 'Action':
      case 'Navigation':
        onNavigate(item.page, { push: true, state: item.state });
        break;
      case 'Contact':
      case 'Destination':
        onNavigate(item.type.toLowerCase() + 's', { push: true }); // contacts, destinations
        break;
    }
  };

  const getItemIcon = (item: any) => {
    if (item.icon) {
      const Icon = item.icon;
      return <Icon className="w-5 h-5 text-slate-500" />;
    }
    switch (item.type) {
        case 'Product': return <Package className="w-5 h-5 text-indigo-500" />;
        case 'Contact': return <User className="w-5 h-5 text-slate-500" />;
        case 'Destination': return <MapPin className="w-5 h-5 text-emerald-500" />;
        default: return <ArrowRight className="w-5 h-5 text-slate-400" />;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border">
        <div className="flex items-center gap-4 p-4 border-b">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos, acciones, o navegar..."
            className="w-full bg-transparent outline-none text-sm font-semibold placeholder:text-slate-400"
          />
          <button onClick={onClose} className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded-md">Esc</button>
        </div>
        <div ref={resultsRef} className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
          {loading ? <div className="text-center p-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div> : 
          filteredResults.length === 0 ? <div className="text-center p-10 text-[10px] font-black uppercase text-slate-400">Sin resultados</div> :
          filteredResults.map((item, index) => (
            <div
              key={`${item.type}-${item.id || item.name}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`p-4 flex justify-between items-center rounded-2xl cursor-pointer ${selectedIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4">
                {getItemIcon(item)}
                <div>
                  <p className="font-bold text-sm text-slate-800">{item.name}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.type}</p>
                </div>
              </div>
              {selectedIndex === index && <CornerDownLeft className="w-4 h-4 text-indigo-500" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};