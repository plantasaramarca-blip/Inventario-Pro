import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils.ts';
import { exportToExcel } from '../services/excelService.ts';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { MultiQRCode } from '../components/MultiQRCode.tsx';
import { QRScanner } from '../components/QRScanner.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { supabase } from '../supabaseClient.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, QrCode, Info, Trash2, FileSpreadsheet, CheckSquare, Square, Printer, ChevronLeft, ChevronRight, ScanLine, AlertTriangle, Upload
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 15;

interface InventoryProps {
  role: Role;
  userEmail?: string;
  onNavigate: (page: string, options: { push?: boolean, state?: any }) => void;
  initialState?: any;
  onInitialStateConsumed: () => void;
  categories: CategoryMaster[];
  setCategories: (cats: CategoryMaster[]) => void;
  locations: LocationMaster[];
  setLocations: (locs: LocationMaster[]) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ role, userEmail, onNavigate, initialState, onInitialStateConsumed, categories, setCategories, locations, setLocations }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Para autocomplete
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({ category: 'ALL', location: 'ALL' });
  
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiQRModalOpen, setIsMultiQRModalOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { addNotification } = useNotification();
  
  // Estados para autocomplete
  const [codeSearch, setCodeSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { products: prods, count } = await api.getProducts({ 
          page: currentPage, 
          pageSize: ITEMS_PER_PAGE,
          searchTerm: debouncedSearch,
          filters
        });
        setProducts(prods || []);
        setTotalCount(count || 0);
        
        // Cargar TODOS los productos para autocomplete
        if (allProducts.length === 0) {
          const { products: allProds } = await api.getProducts({ fetchAll: true });
          setAllProducts(allProds || []);
        }
      } catch (e) {
        addNotification('Error al cargar productos.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    if (initialState?.openNewProductModal) {
      handleOpenModal();
      onInitialStateConsumed();
    }
  }, [initialState, currentPage, debouncedSearch, filters]);

  const handleLoadCategories = async () => { 
    if (!categories || categories.length === 0) { 
      try { 
        const catsData = await api.getCategoriesMaster(); 
        setCategories(catsData || []); 
      } catch (e) { 
        addNotification('Error al cargar categorías.', 'error'); 
      } 
    } 
  };
  
  const handleLoadLocations = async () => { 
    if (!locations || locations.length === 0) { 
      try { 
        const locsData = await api.getLocationsMaster(); 
        setLocations(locsData || []); 
      } catch (e) { 
        addNotification('Error al cargar almacenes.', 'error'); 
      } 
    } 
  };

  const handleScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    const foundProduct = products.find(p => p.code === decodedText || p.qrData === decodedText);
    if (foundProduct) {
      onNavigate('productDetail', { push: true, state: { productId: foundProduct.id } });
    } else {
      addNotification('Producto no encontrado', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Generar siguiente código SKU automáticamente
  const generateNextSKU = async () => {
    try {
      const { products: allProds } = await api.getProducts({ fetchAll: true });
      const skuNumbers = allProds
        .map(p => p.code)
        .filter(code => code.startsWith('SKU-'))
        .map(code => parseInt(code.replace('SKU-', '')))
        .filter(num => !isNaN(num));
      
      const maxNum = skuNumbers.length > 0 ? Math.max(...skuNumbers) : 0;
      const nextNum = maxNum + 1;
      return `SKU-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      return 'SKU-0001';
    }
  };

  const handleOpenModal = async (product?: Product) => {
    if (product) { 
      setEditingProduct(product); 
      setFormData({ 
        ...product,
        brand: product.brand || '',
        model: product.model || '',
        category: product.category || '',
        location: product.location || '',
        size: product.size || ''
      });
      setCodeSearch(product.code || '');
      setNameSearch(product.name || '');
    } else { 
      const nextSKU = await generateNextSKU();
      setEditingProduct(null); 
      setFormData({ 
        code: nextSKU,
        name: '', brand: '', size: '', model: '', category: '', location: '', 
        stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: 0, 
        currency: 'PEN', unit: 'UND', imageUrl: '' 
      });
      setCodeSearch(nextSKU);
      setNameSearch('');
    }
    setIsModalOpen(true);
  };
  
  const checkExistingCode = async () => {
    const codeToCheck = formData.code?.trim().toLowerCase();
    if (!codeToCheck || editingProduct) return;
    
    try {
      const existing = await api.getProductByCode(codeToCheck);
      if (existing) {
        addNotification(`SKU "${formData.code}" ya existe: ${existing.name}`, 'warning');
      }
    } catch (err) {
      // Ignore error
    }
  };

  const handleStockInputChange = (field: 'minStock' | 'criticalStock', value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  // Autocomplete para Código SKU
  const handleCodeChange = (value: string) => {
    setCodeSearch(value);
    setFormData(prev => ({ ...prev, code: value.toUpperCase() }));
    setShowCodeSuggestions(value.length > 0);
  };

  const handleCodeSelect = (product: Product) => {
    setFormData({
      ...formData,
      code: product.code,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category,
      location: product.location,
      size: product.size,
      unit: product.unit
    });
    setCodeSearch(product.code);
    setNameSearch(product.name);
    setShowCodeSuggestions(false);
    addNotification('Producto encontrado - datos autocompletados', 'info');
  };

  // Autocomplete para Nombre
  const handleNameChange = (value: string) => {
    const upperValue = value.toUpperCase(); // Convertir a mayúsculas
    setNameSearch(upperValue);
    setFormData(prev => ({ ...prev, name: upperValue }));
    setShowNameSuggestions(value.length > 0);
  };

  const handleNameSelect = (product: Product) => {
    setFormData({
      ...formData,
      code: product.code,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category,
      location: product.location,
      size: product.size,
      unit: product.unit
    });
    setCodeSearch(product.code);
    setNameSearch(product.name);
    setShowNameSuggestions(false);
    addNotification('Producto encontrado - datos autocompletados', 'info');
  };

  // Filtrar sugerencias
  const codeSuggestions = useMemo(() => {
    if (!codeSearch || codeSearch.length < 2) return [];
    return allProducts
      .filter(p => p.code.toLowerCase().includes(codeSearch.toLowerCase()))
      .slice(0, 5);
  }, [codeSearch, allProducts]);

  const nameSuggestions = useMemo(() => {
    if (!nameSearch || nameSearch.length < 2) return [];
    return allProducts
      .filter(p => p.name.toLowerCase().includes(nameSearch.toLowerCase()))
      .slice(0, 5);
  }, [nameSearch, allProducts]);

  // Upload imagen a Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      addNotification('Solo se permiten imágenes', 'error');
      return;
    }

    // Validar tamaño (máx 5MB)
    const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > 5 * 1024 * 1024) {
      addNotification(`Imagen muy grande (${originalSizeMB}MB). Máximo 5MB`, 'error');
      return;
    }

    setUploadingImage(true);
    addNotification(`Comprimiendo imagen (${originalSizeMB}MB)...`, 'info');
    
    try {
      // Comprimir imagen
      const compressed = await compressImage(file);
      const compressedSizeMB = (compressed.size / (1024 * 1024)).toFixed(2);
      
      addNotification(`Subiendo (${compressedSizeMB}MB)...`, 'info');
      
      // Generar nombre único
      const fileName = `${Date.now()}_${formData.code || 'temp'}.jpg`;
      const filePath = `products/${fileName}`;

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('inventory-images')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
      addNotification(`✓ Imagen cargada (${originalSizeMB}MB → ${compressedSizeMB}MB)`, 'success');
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      addNotification(err.message || 'Error al subir imagen', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event: any) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = height * (MAX_WIDTH / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = width * (MAX_HEIGHT / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Error al comprimir'));
            }
          }, 'image/jpeg', 0.8);
        };
      };
      
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      addNotification('Código y nombre son requeridos', 'error');
      return;
    }
    
    setSaving(true);
    try {
      // CONVERTIR NOMBRE A MAYÚSCULAS ANTES DE GUARDAR
      const productToSave = {
        ...formData,
        name: formData.name.toUpperCase(),
        brand: formData.brand?.toUpperCase(),
        model: formData.model?.toUpperCase()
      } as Product;
      
      await api.saveProduct(productToSave, userEmail);
      setIsModalOpen(false);
      
      // Recargar productos
      const { products: prods, count } = await api.getProducts({ 
        page: currentPage, 
        pageSize: ITEMS_PER_PAGE,
        searchTerm: debouncedSearch,
        filters
      });
      setProducts(prods || []);
      setTotalCount(count || 0);
      
      // Recargar todos los productos para autocomplete
      const { products: allProds } = await api.getProducts({ fetchAll: true });
      setAllProducts(allProds || []);
      
      addNotification(`Producto ${editingProduct ? 'actualizado' : 'creado'} exitosamente`, 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error al guardar producto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await api.deleteProduct(productToDelete.id, userEmail);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      setTotalCount(prev => prev - 1);
      addNotification('Producto eliminado exitosamente', 'success');
    } catch (err: any) {
      addNotification(err.message || 'Error al eliminar producto', 'error');
    } finally {
      setProductToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}
      
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Inventario de Productos</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Gestión Completa de Stock</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <button 
              onClick={() => {
                const timestamp = new Date().toISOString().split('T')[0];
                exportToExcel(products, `Inventario_${timestamp}`, "Stock");
              }} 
              className="px-4 py-3 text-emerald-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
            </button>
          </div>
          {role !== 'VIEWER' && (
            <button 
              onClick={() => handleOpenModal()} 
              className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" /> NUEVO PRODUCTO
            </button>
          )}
        </div>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, código o marca..." 
            className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg"
          >
            <ScanLine className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={filters.category} 
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            onFocus={handleLoadCategories}
            className="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none font-bold shadow-sm appearance-none"
          >
            <option value="ALL">Todas las Categorías</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          
          <select 
            value={filters.location} 
            onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            onFocus={handleLoadLocations}
            className="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none font-bold shadow-sm appearance-none"
          >
            <option value="ALL">Todos los Almacenes</option>
            {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
          </select>
        </div>
      </div>

      {/* Modal de producto - CON ALTURA FIJA Y SCROLL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              {/* Header fijo */}
              <div className="p-6 border-b flex-shrink-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                  </h3>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Body con scroll */}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Columna izquierda: Imagen y alertas */}
                  <div className="md:col-span-1 flex flex-col items-center">
                    <div className="w-full aspect-square bg-slate-50 rounded-3xl border-2 border-dashed flex items-center justify-center mb-4 relative group cursor-pointer overflow-hidden">
                      {uploadingImage ? (
                        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
                      ) : formData.imageUrl ? (
                        <>
                          <img src={formData.imageUrl} alt="Producto" className="w-full h-full object-cover rounded-3xl" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="text-slate-300 w-16 h-16" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="w-8 h-8 text-indigo-600" />
                          </div>
                        </>
                      )}
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleImageUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    
                    <div className="w-full p-4 bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl text-center">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2"/>
                      <p className="text-[9px] font-black text-amber-800 uppercase tracking-widest">Alertas de Stock</p>
                      <div className="flex gap-2 mt-2">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Mínimo</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={formData.minStock ?? ''} 
                            onChange={e => handleStockInputChange('minStock', e.target.value)} 
                            className="w-full px-2 py-2 bg-white rounded-lg outline-none font-semibold text-sm text-center" 
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Crítico</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={formData.criticalStock ?? ''} 
                            onChange={e => handleStockInputChange('criticalStock', e.target.value)} 
                            className="w-full px-2 py-2 bg-white rounded-lg outline-none font-semibold text-sm text-center" 
                          />
                        </div>
                      </div>
                      
                      {!editingProduct && (
                        <div className="mt-3">
                          <label className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Stock Inicial</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={formData.stock || ''} 
                            onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} 
                            className="w-full px-2 py-2 bg-white rounded-lg outline-none font-semibold text-sm text-center" 
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Columna derecha: Campos del formulario */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-x-4 gap-y-5">
                    {/* Código SKU con autocomplete */}
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Código SKU / QR *</label>
                      <input 
                        type="text" 
                        required 
                        value={codeSearch} 
                        onChange={e => handleCodeChange(e.target.value)}
                        onFocus={() => setShowCodeSuggestions(codeSearch.length > 0)}
                        onBlur={() => setTimeout(() => setShowCodeSuggestions(false), 200)}
                        readOnly={!!editingProduct}
                        className={`w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700 ${!!editingProduct ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="SKU-0001"
                      />
                      {showCodeSuggestions && codeSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                          {codeSuggestions.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleCodeSelect(p)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                            >
                              <div className="font-bold text-sm">{p.code}</div>
                              <div className="text-xs text-slate-500">{p.name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Nombre con autocomplete */}
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nombre del Producto *</label>
                      <input 
                        type="text" 
                        required 
                        value={nameSearch} 
                        onChange={e => handleNameChange(e.target.value)}
                        onFocus={() => setShowNameSuggestions(nameSearch.length > 0)}
                        onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                        readOnly={!!editingProduct}
                        className={`w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700 ${!!editingProduct ? 'opacity-70 cursor-not-allowed' : ''}`}
                        placeholder="EJ: ZAPATILLAS DEPORTIVAS"
                      />
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                          {nameSuggestions.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleNameSelect(p)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                            >
                              <div className="font-bold text-sm">{p.name}</div>
                              <div className="text-xs text-slate-500">{p.code}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Marca</label>
                      <input 
                        type="text" 
                        value={formData.brand || ''} 
                        onChange={e => setFormData({...formData, brand: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700" 
                        placeholder="MARCA..." 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Modelo</label>
                      <input 
                        type="text" 
                        value={formData.model || ''} 
                        onChange={e => setFormData({...formData, model: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700" 
                        placeholder="MODELO..." 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Unidad</label>
                      <select 
                        value={formData.unit || 'UND'} 
                        onChange={e => setFormData({...formData, unit: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700 appearance-none"
                      >
                        <option>UND</option>
                        <option>PAR</option>
                        <option>CAJA</option>
                        <option>SET</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Talla / Medida</label>
                      <input 
                        type="text" 
                        value={formData.size || ''} 
                        onChange={e => setFormData({...formData, size: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700" 
                        placeholder="S, M, L, XL..."
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                      <select 
                        onFocus={handleLoadCategories} 
                        value={formData.category || ''} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700 appearance-none"
                      >
                        <option value="">SELECCIONE...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Almacén</label>
                      <select 
                        onFocus={handleLoadLocations} 
                        value={formData.location || ''} 
                        onChange={e => setFormData({...formData, location: e.target.value})} 
                        className="w-full px-4 py-3 bg-slate-100 rounded-xl outline-none font-semibold text-sm text-slate-700 appearance-none"
                      >
                        <option value="">SELECCIONE...</option>
                        {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer fijo */}
              <div className="p-6 bg-slate-50 border-t flex justify-end items-center gap-4 flex-shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-8 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-slate-800"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="px-8 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                  CONFIRMAR CAMBIOS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de productos CON COLUMNA MODELO */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[1000px]">
            <thead className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 w-10 text-center">
                  <button onClick={toggleSelectAll}>
                    {selectedIds.length === products.length && products.length > 0 ? (
                      <CheckSquare className="w-5 h-5 mx-auto text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 mx-auto text-slate-300" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-left">Modelo</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-left">Almacén</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Valor Compra</th>
                <th className="px-6 py-4 w-32 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleSelect(p.id)}>
                      {selectedIds.includes(p.id) ? (
                        <CheckSquare className="w-5 h-5 mx-auto text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 mx-auto text-slate-200 group-hover:text-slate-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm font-bold text-slate-800 uppercase">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-[10px] text-slate-600 font-bold uppercase">{p.model || '-'}</p>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <p className="text-sm font-black text-slate-800">
                      {p.stock} <span className="text-[9px] text-slate-400 font-bold uppercase">{p.unit}</span>
                    </p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{p.location}</p>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <p className="text-sm font-bold text-slate-500">{formatCurrency(p.purchasePrice * p.stock, p.currency)}</p>
                    <p className="text-[9px] font-bold text-slate-400">({formatCurrency(p.purchasePrice, p.currency)} c/u)</p>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onNavigate('productDetail', { push: true, state: { productId: p.id } })} 
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedQRProduct(p)} 
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      {role !== 'VIEWER' && (
                        <>
                          <button 
                            onClick={() => handleOpenModal(p)} 
                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setProductToDelete(p)} 
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer con paginación */}
        <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black uppercase text-slate-500 border-t">
          <div className="flex items-center gap-2">
            <p className="hidden sm:block">({selectedIds.length} de {totalCount} seleccionados)</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
              disabled={currentPage === 0 || loading} 
              className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Ant
            </button>
            <span>Página {currentPage + 1} de {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} 
              disabled={currentPage >= totalPages - 1 || loading} 
              className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5"
            >
              Sig <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* BOTÓN QR FLOTANTE - CENTRADO ABAJO - SOLO VISIBLE CON SELECCIÓN */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
          <button 
            onClick={() => setIsMultiQRModalOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase shadow-2xl flex items-center gap-3 hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Printer className="w-5 h-5" />
            IMPRIMIR {selectedIds.length} QR
          </button>
        </div>
      )}
      
      {selectedQRProduct && <ProductQRCode product={selectedQRProduct} onClose={() => setSelectedQRProduct(null)} />}
      {isMultiQRModalOpen && <MultiQRCode products={products.filter(p => selectedIds.includes(p.id))} onClose={() => setIsMultiQRModalOpen(false)} />}

      <CustomDialog
        isOpen={!!productToDelete}
        title="Confirmar Eliminación"
        message={`¿Eliminar "${productToDelete?.name}"? Esta acción es irreversible.`}
        type="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};
