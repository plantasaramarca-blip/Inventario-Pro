
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
  const { data, error } = await withTimeout(supabase.from('profiles').select('*').order('email'));
  if (error) throw error;
  return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
};

export const saveUser = async (user: Partial<UserAccount>) => { /* ... (no changes) ... */ };
export const deleteUser = async (id: string) => { /* ... (no changes) ... */ };

export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  const { data, error } = await withTimeout(supabase.from('locations_master').select('*').order('name'));
  if (error) throw error;
  return data || [];
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => { /* ... (no changes) ... */ };
export const deleteLocationMaster = async (id: string) => { /* ... (no changes) ... */ };

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  const { data, error } = await withTimeout(supabase.from('categories_master').select('*').order('name'));
  if (error) throw error;
  return data || [];
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => { /* ... (no changes) ... */ };
export const deleteCategoryMaster = async (id: string) => { /* ... (no changes) ... */ };

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  const { data, error } = await withTimeout(supabase.from('products').select('*').order('updated_at', { ascending: false }));
  if (error) throw error;
  return (data || []).map(mapToProduct);
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) return null;
  const { data, error } = await withTimeout(supabase.from('products').select('*').eq('id', id).single());
  if (error) throw error;
  return data ? mapToProduct(data) : null;
};

export const getAlertProducts = async (limit = 6): Promise<Product[]> => {
  if (!useSupabase()) return [];
  try {
    const { data, error } = await withTimeout(supabase.from('products').select('*').order('stock', { ascending: true }));
    if (error) throw error;
    const allProducts = (data || []).map(mapToProduct);
    return allProducts.filter(p => p.stock <= p.minStock).slice(0, limit);
  } catch (e) {
    throw e;
  }
};

export const saveProduct = async (product: Partial<Product>) => { /* ... (no changes, just formatting) ... */ };
export const deleteProduct = async (id: string) => { /* ... (no changes) ... */ };

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  const { data, error } = await withTimeout(supabase.from('movements').select('*').order('date', { ascending: false }));
  if (error) throw error;
  return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: m.reason, balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
};

export const getMovementsByProductId = async (productId: string): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  const { data, error } = await withTimeout(supabase.from('movements').select('*').eq('product_id', productId).order('date', { ascending: false }).limit(10));
  if (error) throw error;
  return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: m.reason, balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre }));
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;

  const movementsToInsert = items.map(item => {
    const common = {
      product_id: item.productId,
      product_name: item.name,
      type: item.type,
      quantity: item.quantity,
      dispatcher: item.dispatcher,
      reason: item.reason,
    };
    if (item.type === 'SALIDA') {
      return { ...common, destino_nombre: item.destinationName, contact_id: item.contactId, supplier_name: null };
    } else { // INGRESO
      return { ...common, destino_nombre: item.locationName, contact_id: item.contactId, supplier_name: item.supplierName };
    }
  });

  const { data: insertedMovements, error } = await withTimeout(
    supabase.from('movements').insert(movementsToInsert).select()
  );

  if (error) throw error;

  for (const mov of insertedMovements) {
    // This function call is fire-and-forget for performance
    saveAuditLog({ action: 'CREATE', table_name: 'movements', record_id: mov.id, record_name: mov.product_name }, null, mov);
  }
};


export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return [];
  const { data, error } = await withTimeout(supabase.from('contacts').select('*').order('name'));
  if (error) throw error;
  return (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, phone: c.phone, email: c.email, taxId: c.tax_id, address: c.address, notes: c.notes }));
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) return;
  const { id, taxId, address, notes, ...rest } = contact;
  const payload = { ...rest, tax_id: taxId, address, notes };

  if (id) {
    const { data: oldData } = await supabase.from('contacts').select('*').eq('id', id).single();
    const { error } = await withTimeout(supabase.from('contacts').update(payload).eq('id', id));
    if (error) throw error;
    saveAuditLog({ action: 'UPDATE', table_name: 'contacts', record_id: id, record_name: payload.name || 'N/A' }, oldData, payload);
  } else {
    const { data, error } = await withTimeout(supabase.from('contacts').insert([payload]).select().single());
    if (error) throw error;
    saveAuditLog({ action: 'CREATE', table_name: 'contacts', record_id: data.id, record_name: data.name }, null, payload);
  }
};
export const deleteContact = async (id: string) => { /* ... (no changes) ... */ };

export const getStats = async (): Promise<InventoryStats> => {
  if (!useSupabase()) {
    return { totalProducts: 0, lowStockCount: 0, criticalStockCount: 0, outOfStockCount: 0, totalMovements: 0, totalContacts: 0, totalValue: 0 };
  }
  try {
    const productStatsPromise = supabase.from('products').select('stock, min_stock, critical_stock, precio_compra');
    const movementsCountPromise = supabase.from('movements').select('*', { count: 'exact', head: true });
    const contactsCountPromise = supabase.from('contacts').select('*', { count: 'exact', head: true });

    const [
      { data: products, error: pError },
      { count: totalMovements, error: mError },
      { count: totalContacts, error: cError }
    ] = await Promise.all([
      withTimeout(productStatsPromise),
      withTimeout(movementsCountPromise),
      withTimeout(contactsCountPromise)
    ]);

    if (pError || mError || cError) throw new Error('Fallo al obtener los componentes del dashboard');
    
    const p = products || [];
    const critStock = (p as any[]).map(x => x.critical_stock ?? 10);
    const minStock = (p as any[]).map(x => x.min_stock ?? 30);
    
    return {
      totalProducts: p.length,
      lowStockCount: p.filter((x, i) => x.stock <= minStock[i] && x.stock > critStock[i]).length,
      criticalStockCount: p.filter((x, i) => x.stock <= critStock[i] && x.stock > 0).length,
      outOfStockCount: p.filter(x => x.stock <= 0).length,
      totalMovements: totalMovements || 0,
      totalContacts: totalContacts || 0,
      totalValue: p.reduce((s, x) => s + (x.stock * (x.precio_compra || 0)), 0)
    };
  } catch (e) {
    throw e;
  }
};

export const getDestinos = async (): Promise<Destination[]> => {
  if (!useSupabase()) return [];
  const { data, error } = await withTimeout(supabase.from('destinos').select('*').order('name'));
  if (error) throw error;
  return (data || []).map(d => ({ id: d.id, name: d.name, type: d.type, description: d.description, active: d.active, createdAt: d.created_at, }));
};
export const saveDestino = async (d: Partial<Destination>) => { /* ... (no changes) ... */ };
export const getAuditLogs = async (p = 0, l = 50): Promise<{ data: AuditLog[], count: number | null }> => {
  if (!useSupabase()) return { data: [], count: 0 };
  const { data, error, count } = await withTimeout(
    supabase.from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(p * l, (p + 1) * l - 1)
  );
  if (error) throw error;
  return { data: data as AuditLog[] || [], count };
};