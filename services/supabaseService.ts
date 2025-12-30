
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, InventoryStats, CategoryMaster, LocationMaster, UserAccount, Role, Contact, Destination } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

// Función auxiliar para añadir tiempo límite a las peticiones
// Se cambia el tipo a any para evitar problemas de inferencia con los objetos Thenable complejos de Supabase
const withTimeout = async (promise: any, timeoutMs: number = 8000): Promise<any> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_ERROR')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
};

export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  if (!useSupabase()) return { role: 'ADMIN' };
  try {
    const { data } = await withTimeout(supabase.from('profiles').select('role').eq('email', email.toLowerCase()).maybeSingle());
    return data ? { role: data.role as Role } : { role: 'VIEWER' };
  } catch (e) { return { role: 'VIEWER' }; }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('profiles').select('*').order('email'));
    return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
  } catch (e) { return []; }
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!useSupabase()) return;
  if (user.password && user.password.length >= 6) {
    try { await supabase.auth.updateUser({ password: user.password }); } catch (e) {}
  }
  await withTimeout(supabase.from('profiles').upsert({ email: user.email?.toLowerCase(), role: user.role }, { onConflict: 'email' }));
};

export const deleteUser = async (id: string) => { if (useSupabase()) await withTimeout(supabase.from('profiles').delete().eq('id', id)); };

export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  try {
    const { data } = await withTimeout(supabase.from('locations_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveLocationMaster = async (loc: any) => { if (useSupabase()) await withTimeout(supabase.from('locations_master').upsert(loc)); };
export const deleteLocationMaster = async (id: string) => { if (useSupabase()) await withTimeout(supabase.from('locations_master').delete().eq('id', id)); };

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  try {
    const { data } = await withTimeout(supabase.from('categories_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveCategoryMaster = async (cat: any) => { if (useSupabase()) await withTimeout(supabase.from('categories_master').upsert(cat)); };
export const deleteCategoryMaster = async (id: string) => { if (useSupabase()) await withTimeout(supabase.from('categories_master').delete().eq('id', id)); };

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('products').select('*').order('name'));
    return (data || []).map(p => ({
      id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
      category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
      purchasePrice: p.precio_compra || 0, currency: p.moneda || 'PEN', unit: p.unit || 'UND', imageUrl: p.image_url, updatedAt: p.updated_at
    }));
  } catch (e) { throw e; }
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) return;
  const payload: any = {
    code: product.code, 
    name: product.name, 
    brand: product.brand,
    model: product.model,
    size: product.size,
    category: product.category, 
    location: product.location,
    stock: Number(product.stock) || 0, 
    min_stock: Number(product.minStock) || 30, 
    critical_stock: Number(product.criticalStock) || 10,
    precio_compra: Number(product.purchasePrice) || 0, 
    moneda: product.currency || 'PEN', 
    unit: product.unit || 'UND',
    image_url: product.imageUrl, 
    updated_at: new Date().toISOString()
  };
  
  const { error } = product.id 
    ? await withTimeout(supabase.from('products').update(payload).eq('id', product.id))
    : await withTimeout(supabase.from('products').insert([payload]));
    
  if (error) throw error;
};

export const deleteProduct = async (id: string) => {
  if (!useSupabase()) return;
  const { error } = await withTimeout(supabase.from('products').delete().eq('id', id));
  if (error) throw error;
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('movements').select('*').order('date', { ascending: false }));
    return (data || []).map(m => ({ 
      id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, 
      quantity: m.quantity, date: m.date, dispatcher: m.dispatcher, reason: m.reason, 
      balanceAfter: m.balance_after, destino_nombre: m.destino_nombre 
    }));
  } catch (e) { return []; }
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;

  // Pre-flight check for SALIDA transactions to prevent stock negatives
  for (const item of items) {
    if (item.type === 'SALIDA') {
      const { data: prod } = await withTimeout(supabase.from('products').select('name, stock').eq('id', item.productId).single());
      if (!prod) {
        throw new Error(`Producto con ID ${item.productId} no encontrado.`);
      }
      if (prod.stock < item.quantity) {
        throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${item.quantity}.`);
      }
    }
  }

  // If all checks pass, execute transactions
  for (const item of items) {
     const { data: prod } = await withTimeout(supabase.from('products').select('name, stock').eq('id', item.productId).single());
     if (!prod) continue;
     const newStock = prod.stock + (item.type === 'INGRESO' ? item.quantity : -item.quantity);
     await withTimeout(supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.productId));
     await withTimeout(supabase.from('movements').insert([{ 
       product_id: item.productId, product_name: prod.name, type: item.type, 
       quantity: item.quantity, dispatcher: item.dispatcher, reason: item.reason, 
       balance_after: newStock, destino_nombre: item.destinationName, date: new Date().toISOString() 
     }]));
  }
};

export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('contacts').select('*').order('name'));
    return (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, phone: c.phone, email: c.email, taxId: c.tax_id }));
  } catch (e) { return []; }
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) return;
  const payload = { name: contact.name, type: contact.type, phone: contact.phone, email: contact.email, tax_id: contact.taxId };
  const { error } = contact.id ? await withTimeout(supabase.from('contacts').update(payload).eq('id', contact.id)) : await withTimeout(supabase.from('contacts').insert([payload]));
  if (error) throw error;
};

export const deleteContact = async (id: string) => { if (useSupabase()) await withTimeout(supabase.from('contacts').delete().eq('id', id)); };

export const getStats = async (): Promise<InventoryStats> => {
  try {
    const [p, m, c] = await Promise.all([getProducts(), getMovements(), getContacts()]);
    return { 
      totalProducts: p.length, 
      lowStockCount: p.filter(x=>x.stock<=x.minStock && x.stock>x.criticalStock).length, 
      criticalStockCount: p.filter(x=>x.stock<=x.criticalStock && x.stock>0).length, 
      outOfStockCount: p.filter(x=>x.stock<=0).length, 
      totalMovements: m.length, 
      totalContacts: c.length, 
      totalValue: p.reduce((s,x)=>s+(x.stock*x.purchasePrice),0) 
    };
  } catch (e) {
    return { totalProducts: 0, lowStockCount: 0, criticalStockCount: 0, outOfStockCount: 0, totalMovements: 0, totalContacts: 0, totalValue: 0 };
  }
};

export const getDestinos = async () => { 
  if (!useSupabase()) return []; 
  try {
    const { data } = await withTimeout(supabase.from('destinos').select('*').order('nombre')); 
    return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo })); 
  } catch (e) { return []; }
};

export const saveDestino = async (d: any) => { 
  if (useSupabase()) await withTimeout(supabase.from('destinos').upsert({ id: d.id, nombre: d.name, tipo: d.type, activo: d.active })); 
};

export const getAuditLogs = async (p=0, l=50) => { 
  if (!useSupabase()) return { data: [], count: 0 }; 
  try {
    const { data, count } = await withTimeout(supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(p*l, (p+1)*l-1)); 
    return { data: data || [], count: count || 0 }; 
  } catch (e) { return { data: [], count: 0 }; }
};
