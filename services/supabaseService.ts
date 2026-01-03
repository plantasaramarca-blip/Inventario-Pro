
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, InventoryStats, CategoryMaster, LocationMaster, UserAccount, Role, Contact, Destination, AuditLog } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

const fetchWithRetry = async (fetchFn: () => Promise<any>, maxRetries = 3, delay = 500) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        console.error(`Final attempt failed: ${attempt}/${maxRetries}`, error);
        throw error;
      }
      const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(`Attempt ${attempt}/${maxRetries} failed. Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw lastError;
};

const getChangedFields = (oldV: any, newV: any): string[] => {
  if (!oldV || !newV) return [];
  const allKeys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
  const changed: string[] = [];
  const ignoredKeys = ['id', 'updated_at', 'created_at', 'user_id', 'imageUrl'];
  
  allKeys.forEach(key => {
    if (ignoredKeys.includes(key)) return;
    const oldValue = String(oldV[key] ?? '').trim();
    const newValue = String(newV[key] ?? '').trim();
    if (oldValue !== newValue) changed.push(key);
  });
  return changed;
};

const generateChangesSummary = (action: 'CREATE' | 'UPDATE' | 'DELETE', tableName: string, recordName: string, oldValues: any, newValues: any): string => {
  const tableAlias = tableName.replace('_master', '').replace('s', '');
  switch (action) {
    case 'CREATE': return `Creó el ${tableAlias} "${recordName}"`;
    case 'DELETE': return `Eliminó el ${tableAlias} "${recordName}"`;
    case 'UPDATE':
      const fields = getChangedFields(oldValues, newValues);
      if (fields.length === 0) return `Realizó una actualización en el ${tableAlias} "${recordName}" sin cambios de datos.`;
      return `Actualizó los campos: \`${fields.join(', ')}\` del ${tableAlias} "${recordName}"`;
    default: return `Acción desconocida en "${recordName}"`;
  }
};

const saveAuditLog = async (logData: Omit<AuditLog, 'id' | 'created_at' | 'user_id' | 'user_email' | 'changes_summary'>, oldValues?: any, newValues?: any) => {
  if (!useSupabase()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const summary = generateChangesSummary(logData.action, logData.table_name, logData.record_name, oldValues, newValues);
    const logPayload = { ...logData, user_id: user.id, user_email: user.email, old_values: oldValues, new_values: newValues, changes_summary: summary };
    supabase.from('audit_logs').insert([logPayload]).then(({ error }) => { if (error) console.error('Fallo al guardar en auditoría:', error); });
  } catch (e) { console.error('Error al obtener usuario para auditoría:', e); }
};

const mapToProduct = (p: any): Product => ({
  id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
  category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
  purchasePrice: p.precio_compra || 0, salePrice: p.precio_venta || 0, currency: p.moneda || 'PEN', unit: p.unit || 'UND', imageUrl: p.image_url, updatedAt: p.updated_at
});

export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  if (!useSupabase()) return { role: 'ADMIN' };
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('profiles').select('role').eq('email', email.toLowerCase()).maybeSingle();
    if (error) throw error;
    return { role: (data?.role as Role) || 'VIEWER' };
  });
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (error) throw error;
    return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
  });
};

export const saveUser = async (user: Partial<UserAccount>) => { if (!useSupabase()) return; };
export const deleteUser = async (id: string) => { if (!useSupabase()) return; };

export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('locations_master').select('id, name').order('name');
    if (error) throw error;
    return data || [];
  });
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => { if (!useSupabase()) return;};
export const deleteLocationMaster = async (id: string) => { if (!useSupabase()) return;};

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('categories_master').select('id, name').order('name');
    if (error) throw error;
    return data || [];
  });
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => { if (!useSupabase()) return;};
export const deleteCategoryMaster = async (id: string) => { if (!useSupabase()) return;};

const FULL_PRODUCT_QUERY = 'id, code, name, brand, size, model, category, location, stock, min_stock, critical_stock, precio_compra, precio_venta, moneda, unit, image_url, updated_at';

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('products').select(FULL_PRODUCT_QUERY).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapToProduct);
  });
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) return null;
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data ? mapToProduct(data) : null;
  });
};

export const getAlertProducts = async (limit = 6): Promise<Product[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('products').select(FULL_PRODUCT_QUERY).order('stock', { ascending: true });
    if (error) throw error;
    const allProducts = (data || []).map(mapToProduct);
    return allProducts.filter(p => p.stock <= p.minStock).slice(0, limit);
  });
};

export const saveProduct = async (product: Partial<Product>): Promise<Product> => {
  if (!useSupabase()) return product as Product;
  return fetchWithRetry(async () => {
    const { id, minStock, criticalStock, purchasePrice, salePrice, imageUrl, updatedAt, ...rest } = product;
    const payload: any = { ...rest, min_stock: minStock, critical_stock: criticalStock, precio_compra: purchasePrice, precio_venta: salePrice, image_url: imageUrl, updated_at: new Date().toISOString() };
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    let savedData;
    if (id) {
        const { data: oldData } = await supabase.from('products').select('*').eq('id', id).single();
        const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
        if (error) throw error;
        savedData = data;
        saveAuditLog({ action: 'UPDATE', table_name: 'products', record_id: id, record_name: payload.name || 'N/A' }, oldData, payload);
    } else {
        const { data, error } = await supabase.from('products').insert([payload]).select().single();
        if (error) throw error;
        savedData = data;
        saveAuditLog({ action: 'CREATE', table_name: 'products', record_id: data.id, record_name: data.name }, null, payload);
    }
    return mapToProduct(savedData);
  });
};

export const saveProductAndInitialMovement = async (product: Product, initialStock: number, userEmail?: string): Promise<Product> => {
    if (!useSupabase()) return product;

    // 1. Save the product with the initial stock.
    const savedProduct = await saveProduct({ ...product, stock: initialStock });
    
    // 2. If initial stock is positive, register the initial movement.
    if (initialStock > 0) {
        await registerBatchMovements([{
            productId: savedProduct.id,
            name: savedProduct.name,
            type: 'INGRESO',
            quantity: initialStock,
            dispatcher: userEmail || 'sistema',
            reason: 'Stock Inicial'
        }]);
    }

    return savedProduct;
};


export const deleteProduct = async (id: string) => {
    if (!useSupabase()) return;
    return fetchWithRetry(async () => {
      const { data: oldData } = await supabase.from('products').select('name').eq('id', id).single();
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      if (oldData) saveAuditLog({ action: 'DELETE', table_name: 'products', record_id: id, record_name: oldData.name }, oldData, null);
    });
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const query = 'id, product_id, product_name, type, quantity, date, dispatcher, destino_nombre, balance_after';
    const { data, error } = await supabase.from('movements').select(query).order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: '', balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
  });
};

export const getMovementsByProductId = async (productId: string): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const query = 'id, product_id, product_name, type, quantity, date, dispatcher, destino_nombre, balance_after';
    const { data, error } = await supabase.from('movements').select(query).eq('product_id', productId).order('date', { ascending: false }).limit(10);
    if (error) throw error;
    return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: '', balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
  });
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;
  return fetchWithRetry(async () => {
    const movementsToInsert = items.map(item => {
      const common = { product_id: item.productId, product_name: item.name, type: item.type, quantity: item.quantity, dispatcher: item.dispatcher, reason: item.reason, };
      if (item.type === 'SALIDA') return { ...common, destino_nombre: item.destinationName, contact_id: item.contactId, supplier_name: null };
      else return { ...common, destino_nombre: item.locationName, contact_id: item.contactId, supplier_name: item.supplierName };
    });
    const { data: insertedMovements, error } = await supabase.from('movements').insert(movementsToInsert).select();
    if (error) throw error;
    for (const mov of insertedMovements) {
      saveAuditLog({ action: 'CREATE', table_name: 'movements', record_id: mov.id, record_name: mov.product_name }, null, mov);
    }
  });
};

export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const query = 'id, name, type, phone, email';
    const { data, error } = await supabase.from('contacts').select(query).order('name');
    if (error) throw error;
    return (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, phone: c.phone, email: c.email, taxId: c.tax_id, address: c.address, notes: c.notes }));
  });
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) return;
  return fetchWithRetry(async () => {
    const { id, taxId, address, notes, ...rest } = contact;
    const payload = { ...rest, tax_id: taxId, address, notes };
    if (id) {
      const { data: oldData } = await supabase.from('contacts').select('*').eq('id', id).single();
      const { error } = await supabase.from('contacts').update(payload).eq('id', id);
      if (error) throw error;
      saveAuditLog({ action: 'UPDATE', table_name: 'contacts', record_id: id, record_name: payload.name || 'N/A' }, oldData, payload);
    } else {
      const { data, error } = await supabase.from('contacts').insert([payload]).select().single();
      if (error) throw error;
      saveAuditLog({ action: 'CREATE', table_name: 'contacts', record_id: data.id, record_name: data.name }, null, payload);
    }
  });
};
export const deleteContact = async (id: string) => { if (!useSupabase()) return; };

export const getStats = async (): Promise<InventoryStats> => {
  if (!useSupabase()) return { totalProducts: 0, lowStockCount: 0, criticalStockCount: 0, outOfStockCount: 0, totalMovements: 0, totalContacts: 0, totalValue: 0 };
  return fetchWithRetry(async () => {
    const productCountPromise = supabase.from('products').select('id', { count: 'exact', head: true });
    const movementsCountPromise = supabase.from('movements').select('id', { count: 'exact', head: true });
    const contactsCountPromise = supabase.from('contacts').select('id', { count: 'exact', head: true });
    const productCalcsPromise = supabase.from('products').select('stock, min_stock, critical_stock, precio_compra');
    const [{ count: totalProducts, error: pCountError }, { count: totalMovements, error: mError }, { count: totalContacts, error: cError }, { data: productsForCalcs, error: pCalcsError }] = await Promise.all([productCountPromise, movementsCountPromise, contactsCountPromise, productCalcsPromise]);
    if (pCountError || mError || cError || pCalcsError) throw new Error('Fallo al obtener los componentes del dashboard');
    const p = productsForCalcs || [];
    
    // Fallback logic for possibly null min_stock/critical_stock values
    const getCrit = (prod: any) => prod.critical_stock ?? 10;
    const getMin = (prod: any) => prod.min_stock ?? 30;

    return {
      totalProducts: totalProducts || 0,
      lowStockCount: p.filter(x => x.stock <= getMin(x) && x.stock > getCrit(x)).length,
      criticalStockCount: p.filter(x => x.stock <= getCrit(x) && x.stock > 0).length,
      outOfStockCount: p.filter(x => x.stock <= 0).length,
      totalMovements: totalMovements || 0,
      totalContacts: totalContacts || 0,
      totalValue: p.reduce((s, x) => s + (x.stock * (x.precio_compra || 0)), 0)
    };
  });
};

export const getDestinos = async (): Promise<Destination[]> => {
  if (!useSupabase()) return [];
  return fetchWithRetry(async () => {
    const { data, error } = await supabase.from('destinos').select('id, name, type, description, active, created_at').order('name');
    if (error) throw error;
    return (data || []).map(d => ({ id: d.id, name: d.name, type: d.type, description: d.description, active: d.active, createdAt: d.created_at, }));
  });
};

export const saveDestino = async (d: Partial<Destination>) => { if (!useSupabase()) return; };
export const deleteDestino = async (id: string) => { if (!useSupabase()) return; };

export const getAuditLogs = async (p = 0, l = 50): Promise<{ data: AuditLog[], count: number | null }> => {
  if (!useSupabase()) return { data: [], count: 0 };
  return fetchWithRetry(async () => {
    const { data, error, count } = await supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(p * l, (p + 1) * l - 1);
    if (error) throw error;
    return { data: data as AuditLog[] || [], count };
  });
};
