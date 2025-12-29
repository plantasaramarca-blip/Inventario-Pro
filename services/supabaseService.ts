import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, InventoryStats, CategoryMaster, LocationMaster, UserAccount, Role, Contact } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  if (!useSupabase()) return { role: 'ADMIN' };
  try {
    const { data } = await supabase.from('profiles').select('role').eq('email', email.toLowerCase()).maybeSingle();
    return data ? { role: data.role as Role } : { role: 'VIEWER' };
  } catch (e) { return { role: 'VIEWER' }; }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return [];
  const { data } = await supabase.from('profiles').select('*').order('email');
  return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!useSupabase()) return;
  if (user.password) {
    // Si eres tú mismo o tienes sesión activa, intenta actualizar
    try { await supabase.auth.updateUser({ password: user.password }); } catch (e) {}
  }
  await supabase.from('profiles').upsert({ email: user.email?.toLowerCase(), role: user.role }, { onConflict: 'email' });
};

export const deleteUser = async (id: string) => { if (useSupabase()) await supabase.from('profiles').delete().eq('id', id); };

// Maestros
export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  const { data } = await supabase.from('locations_master').select('*').order('name');
  return data || [];
};
export const saveLocationMaster = async (loc: any) => { if (useSupabase()) await supabase.from('locations_master').upsert(loc); };
export const deleteLocationMaster = async (id: string) => { if (useSupabase()) await supabase.from('locations_master').delete().eq('id', id); };

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  const { data } = await supabase.from('categories_master').select('*').order('name');
  return data || [];
};
export const saveCategoryMaster = async (cat: any) => { if (useSupabase()) await supabase.from('categories_master').upsert(cat); };
export const deleteCategoryMaster = async (id: string) => { if (useSupabase()) await supabase.from('categories_master').delete().eq('id', id); };

// Productos
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  const { data } = await supabase.from('products').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
    category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
    purchasePrice: p.precio_compra || 0, currency: p.moneda || 'PEN', unit: p.unit || 'UND', imageUrl: p.image_url, updatedAt: p.updated_at
  }));
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) return;
  const payload: any = {
    code: product.code, name: product.name, category: product.category, location: product.location,
    stock: product.stock, min_stock: product.minStock, critical_stock: product.criticalStock,
    precio_compra: product.purchasePrice, moneda: product.currency, unit: product.unit,
    image_url: product.imageUrl, updated_at: new Date().toISOString()
  };
  
  // Guardado resiliente: si fallan columnas extendidas, reintenta sin ellas
  try {
    const finalPayload = { ...payload, brand: product.brand, size: product.size, model: product.model };
    const { error } = product.id ? await supabase.from('products').update(finalPayload).eq('id', product.id) : await supabase.from('products').insert([finalPayload]);
    if (error && error.message.includes('column')) throw error;
  } catch (e) {
    // Reintento sin brand/size/model por si no existen en la DB del usuario
    const { error } = product.id ? await supabase.from('products').update(payload).eq('id', product.id) : await supabase.from('products').insert([payload]);
    if (error) throw error;
  }
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  const { data } = await supabase.from('movements').select('*').order('date', { ascending: false });
  return (data || []).map(m => ({ id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: m.quantity, date: m.date, dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after, destinationName: m.destino_nombre }));
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;
  for (const item of items) {
     const { data: prod } = await supabase.from('products').select('name, stock').eq('id', item.productId).single();
     if (!prod) continue;
     const newStock = prod.stock + (item.type === 'INGRESO' ? item.quantity : -item.quantity);
     await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
     await supabase.from('movements').insert([{ product_id: item.productId, product_name: prod.name, type: item.type, quantity: item.quantity, dispatcher: item.dispatcher, reason: item.reason, balance_after: newStock, destino_nombre: item.destinationName, date: new Date().toISOString() }]);
  }
};

// CRM - Contactos
// Fix: Added missing getContacts implementation
export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return [];
  const { data } = await supabase.from('contacts').select('*').order('name');
  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    phone: c.phone,
    email: c.email,
    taxId: c.tax_id
  }));
};

// Fix: Added missing saveContact implementation
export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) return;
  const payload = {
    name: contact.name,
    type: contact.type,
    phone: contact.phone,
    email: contact.email,
    tax_id: contact.taxId
  };
  const { error } = contact.id 
    ? await supabase.from('contacts').update(payload).eq('id', contact.id)
    : await supabase.from('contacts').insert([payload]);
  if (error) throw error;
};

// Fix: Added missing deleteContact implementation
export const deleteContact = async (id: string) => {
  if (!useSupabase()) return;
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
};

// Fix: Updated getStats to include actual contact count
export const getStats = async (): Promise<InventoryStats> => {
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
};

export const getDestinos = async () => { if (!useSupabase()) return []; const { data } = await supabase.from('destinos').select('*').order('nombre'); return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo })); };
export const saveDestino = async (d: any) => { if (useSupabase()) await supabase.from('destinos').upsert({ id: d.id, nombre: d.name, tipo: d.type, activo: d.active }); };
export const getAuditLogs = async (p=0, l=50) => { if (!useSupabase()) return { data: [], count: 0 }; const { data, count } = await supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(p*l, (p+1)*l-1); return { data: data || [], count: count || 0 }; };