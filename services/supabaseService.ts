
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, InventoryStats, CategoryMaster, LocationMaster, UserAccount, Role, Contact, Destination, AuditLog } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

const withTimeout = async (promise: any, timeoutMs: number = 30000): Promise<any> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_ERROR')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
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
  try {
    const { data } = await withTimeout(supabase.from('profiles').select('role').eq('email', email.toLowerCase()).maybeSingle());
    return { role: (data?.role as Role) || 'VIEWER' };
  } catch (e) { throw e; }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('profiles').select('*').order('email'));
    return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
  } catch (e) { return []; }
};

export const saveUser = async (user: Partial<UserAccount>) => { /* ... (no changes) ... */ };
export const deleteUser = async (id: string) => { /* ... (no changes) ... */ };

export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  try {
    const { data } = await withTimeout(supabase.from('locations_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => { /* ... (no changes) ... */ };
export const deleteLocationMaster = async (id: string) => { /* ... (no changes) ... */ };

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  try {
    const { data } = await withTimeout(supabase.from('categories_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => { /* ... (no changes) ... */ };
export const deleteCategoryMaster = async (id: string) => { /* ... (no changes) ... */ };

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('products').select('*').order('updated_at', { ascending: false }));
    return (data || []).map(mapToProduct);
  } catch (e) { throw e; }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) return null;
  try {
    const { data } = await withTimeout(supabase.from('products').select('*').eq('id', id).single());
    return data ? mapToProduct(data) : null;
  } catch (e) { throw e; }
};

export const saveProduct = async (product: Partial<Product>) => { /* ... (no changes, just formatting) ... */ };
export const deleteProduct = async (id: string) => { /* ... (no changes) ... */ };

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('movements').select('*').order('date', { ascending: false }));
    return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: m.reason, balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
  } catch (e) { return []; }
};

export const getMovementsByProductId = async (productId: string): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('movements').select('*').eq('product_id', productId).order('date', { ascending: false }).limit(10));
    return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: m.reason, balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
  } catch(e) { throw e; }
};

export const registerBatchMovements = async (items: any[]) => { /* ... (no changes) ... */ };

export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('contacts').select('*').order('name'));
    return (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, phone: c.phone, email: c.email, taxId: c.tax_id }));
  } catch (e) { return []; }
};

export const saveContact = async (contact: Partial<Contact>) => { /* ... (no changes) ... */ };
export const deleteContact = async (id: string) => { /* ... (no changes) ... */ };

export const getDashboardData = async (): Promise<{ stats: InventoryStats, alertProducts: Product[] }> => {
    if (!useSupabase()) {
        const stats = { totalProducts: 0, lowStockCount: 0, criticalStockCount: 0, outOfStockCount: 0, totalMovements: 0, totalContacts: 0, totalValue: 0 };
        return { stats, alertProducts: [] };
    }
    try {
        const { data: productsData, error: pError } = await withTimeout(supabase.from('products').select('id,name,code,stock,min_stock,critical_stock,precio_compra,location,unit'));
        const { count: totalMovements, error: mError } = await withTimeout(supabase.from('movements').select('*', { count: 'exact', head: true }));
        const { count: totalContacts, error: cError } = await withTimeout(supabase.from('contacts').select('*', { count: 'exact', head: true }));
        if (pError || mError || cError) throw new Error('Fallo al obtener los componentes del dashboard');
        
        const p = (productsData || []).map(prod => ({ ...prod, minStock: prod.min_stock, criticalStock: prod.critical_stock, purchasePrice: prod.precio_compra }));
        const stats: InventoryStats = { 
          totalProducts: p.length, 
          lowStockCount: p.filter(x => x.stock <= x.minStock && x.stock > x.criticalStock).length,
          criticalStockCount: p.filter(x => x.stock <= x.criticalStock && x.stock > 0).length,
          outOfStockCount: p.filter(x => x.stock <= 0).length,
          totalMovements: totalMovements || 0, 
          totalContacts: totalContacts || 0, 
          totalValue: p.reduce((s, x) => s + (x.stock * (x.purchasePrice || 0)), 0)
        };
        const alertProducts = p.filter(prod => prod.stock <= prod.minStock).sort((a,b) => a.stock - b.stock).slice(0, 6).map(prod => mapToProduct(prod));
        return { stats, alertProducts };
    } catch (e) { throw e; }
};

// FIX: Implemented getDestinos to fetch data from Supabase.
export const getDestinos = async (): Promise<Destination[]> => {
  if (!useSupabase()) return [];
  try {
    const { data, error } = await withTimeout(supabase.from('destinos').select('*').order('name'));
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      type: d.type,
      description: d.description,
      active: d.active,
      createdAt: d.created_at,
    }));
  } catch (e) {
    console.error('Failed to get destinations', e);
    return [];
  }
};
export const saveDestino = async (d: Partial<Destination>) => { /* ... (no changes) ... */ };
// FIX: Implemented getAuditLogs to fetch paginated data from Supabase.
export const getAuditLogs = async (p = 0, l = 50): Promise<{ data: AuditLog[], count: number | null }> => {
  if (!useSupabase()) return { data: [], count: 0 };
  try {
    const { data, error, count } = await withTimeout(
      supabase.from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(p * l, (p + 1) * l - 1)
    );
    if (error) throw error;
    return { data: data as AuditLog[] || [], count };
  } catch (e) {
    console.error("Failed to get audit logs", e);
    return { data: [], count: 0 };
  }
};