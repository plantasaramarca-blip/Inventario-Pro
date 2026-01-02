
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils.ts';
import { exportToPDF, exportToExcel } from '../services/excelService.ts';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { MultiQRCode } from '../components/MultiQRCode.tsx';
import { QRScanner } from '../components/QRScanner.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, FileText, QrCode, Info, Trash2, FileSpreadsheet, CheckSquare, Square, Printer, ChevronLeft, ChevronRight, ScanLine
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 15;

interface InventoryProps {
  role: Role;
  onNavigate: (page: string, options: { push?: boolean, state?: any }) => void;
  initialState?: any;
  onInitialStateConsumed: () => void;
  products: Product[] | null;
  setProducts: (data: Product[]) => void;
  categories: CategoryMaster[] | null;
  setCategories: (data: CategoryMaster[]) => void;
  locations: LocationMaster[] | null;
  setLocations: (data: LocationMaster[]) => void;
  onCacheClear: (keys: Array<'products' | 'categories' | 'locations'>) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ role, onNavigate, initialState, onInitialStateConsumed, products, setProducts, categories, setCategories, locations, setLocations, onCacheClear }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: 'ALL', location: 'ALL' });
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiQRModalOpen, setIsMultiQRModalOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageInfo, setImageInfo] = useState<{ size: string; status: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { addNotification } = useNotification();

  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      try {
        const promises = [];
        if (products === null) promises.push(api.getProducts());
        if (categories === null) promises.push(api.getCategoriesMaster());
        if (locations === null) promises.push(api.getLocationsMaster());
        
        const [pData, cData, lData] = await Promise.all(promises);

        if (products === null) setProducts(pData || []);
        if (categories === null) setCategories(cData || []);
        if (locations === null) setLocations(lData || []);
      } catch (e) {
        addNotification('Error al cargar datos de inventario.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadPageData();
  }, []);

  useEffect(() => {
    if (initialState?.openNewProductModal) { handleOpenModal(); onInitialStateConsumed(); }
  }, [initialState]);

  const filteredProducts = useMemo(() => {
    setCurrentPage(0);
    if (!products) return [];
    return products.filter(p => /* ... (filter logic unchanged) ... */);
  }, [products, search, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);
  
  const handleScanSuccess = (decodedText: string) => { /* ... (no changes) ... */ };
  const handleExportPDF = () => { /* ... (no changes) ... */ };
  const toggleSelectAll = () => { /* ... (no changes) ... */ };
  const toggleSelect = (id: string) => { /* ... (no changes) ... */ };

  const handleOpenModal = (product?: Product) => {
    setImageInfo(null);
    if (product) { setEditingProduct(product); setFormData({ ...product }); }
    else {
      setEditingProduct(null);
      setFormData({ id: crypto.randomUUID(), code: `SKU-${String((products || []).length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '', category: '', location: '', stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: 0, currency: 'PEN', unit: 'PAR', imageUrl: '' });
    }
    setIsModalOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... (no changes) ... */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!editingProduct && products) {
      if (products.some(p => p.code.trim().toLowerCase() === formData.code?.trim().toLowerCase())) {
        addNotification(`El código SKU "${formData.code}" ya existe.`, 'error'); return;
      }
    }
    setSaving(true);
    try { 
      await api.saveProduct(formData); 
      setIsModalOpen(false); 
      onCacheClear(['products']);
      addNotification(`"${formData.name}" guardado.`, 'success');
    } catch (err) { addNotification("Error al guardar.", 'error');
    } finally { setSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id); 
      onCacheClear(['products']);
      addNotification(`"${productToDelete.name}" eliminado.`, 'success');
    } catch (err) { addNotification('Error al eliminar.', 'error');
    } finally { setProductToDelete(null); }
  };

  if (loading || !products || !categories || !locations) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in pb-24">
      {/* ... (rest of the JSX is identical, just uses the loaded data) ... */}
    </div>
  );
};
