
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog, Destination, LocationMaster, CategoryMaster, UserAccount, Role } from '../types.ts';
import * as localStorageApi from './storageService.ts';

const useSupabase = () => isSupabaseConfigured;

// --- Sistema de Auditoría Interno ---
export const saveAuditLog = async (log: Partial<AuditLog>) => {
  const user = (await supabase.auth.getSession()).data.session?.user;
  const payload = {
    user_id: user?.id || 'system',
    user_email: user?.email || 'Sistema Local',
    action: log.action,
    table_name: log.table_name,
    record_id: log.record_id,
    record_name: log.record_name,
    changes_summary: log.changes_summary,
    created_at: new Date().toISOString()
  };

  if (!useSupabase()) {
    const logs = JSON.parse(localStorage.getItem('kardex_audit') || '[]');
    logs.unshift({ ...payload, id: crypto.randomUUID() });
    localStorage.setItem('kardex_audit', JSON.stringify(logs.slice(0, 500)));
    return;
  }
  try {
    await supabase.from('audit_logs').insert([payload]);
  } catch (e) {}
};

// --- Usuarios y Perfiles ---
export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!useSupabase()) return { role: 'ADMIN' };
  
  try {
    const { data, error } = await supabase.from('profiles').select('role').eq('email', cleanEmail).maybeSingle();
    if (error) return { role: 'VIEWER' };
    return data ? { role: data.role as Role } : { role: 'VIEWER' };
  } catch (e) {
    return { role: 'VIEWER' };
  }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_users') || '[]');
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (error) throw error;
    return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
  } catch (e) {
    return JSON.parse(localStorage.getItem('kardex_users') || '[]');
  }
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!useSupabase()) {
    const users = JSON.parse(localStorage.getItem('kardex_users') || '[]');
    const idx = users.findIndex((u: any) => u.email === user.email);
    if (idx >= 0) users[idx] = { ...users[idx], ...user };
    else users.push({ ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    localStorage.setItem('kardex_users', JSON.stringify(users));
    return;
  }
  const cleanEmail = user.email?.trim().toLowerCase();
  await supabase.from('profiles').upsert({ email: cleanEmail, role: user.role }, { onConflict: 'email' });
  
  await saveAuditLog({
    action: user.id ? 'UPDATE' : 'CREATE',
    table_name: 'profiles',
    record_name: cleanEmail,
    changes_summary: `Usuario ${cleanEmail} configurado con rol ${user.role}`
  });
};

export const deleteUser = async (id: string) => {
  let email = id;
  if (useSupabase()) {
    const { data } = await supabase.from('profiles').select('email').eq('id', id).single();
    email = data?.email || id;
    await supabase.from('profiles').delete().eq('id', id);
  } else {
    const users = JSON.parse(localStorage.getItem('kardex_users') || '[]');
    const user = users.find((u: any) => u.id === id);
    email = user?.email || id;
    const filtered = users.filter((u: any) => u.id !== id);
    localStorage.setItem('kardex_users', JSON.stringify(filtered));
  }
  
  await saveAuditLog({
    action: 'DELETE',
    table_name: 'profiles',
    record_name: email,
    changes_summary: `Eliminado acceso de usuario ${email}`
  });
};

// --- Maestros ---
export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_locations_master') || '[]');
  try {
    const { data, error, status } = await supabase.from('locations_master').select('*').order('name');
    if (error || status === 404) return JSON.parse(localStorage.getItem('kardex_locations_master') || '[]');
    return data || [];
  } catch (e) {
    return JSON.parse(localStorage.getItem('kardex_locations_master') || '[]');
  }
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => {
  if (!useSupabase()) {
    const locs = await getLocationsMaster();
    if (loc.id) {
      const idx = locs.findIndex(l => l.id === loc.id);
      locs[idx] = { ...locs[idx], ...loc };
    } else {
      locs.push({ id: crypto.randomUUID(), name: loc.name! });
    }
    localStorage.setItem('kardex_locations_master', JSON.stringify(locs));
    return;
  }
  await supabase.from('locations_master').upsert(loc);
};

export const deleteLocationMaster = async (id: string) => {
  if (useSupabase()) await supabase.from('locations_master').delete().eq('id', id);
  else {
    const locs = (await getLocationsMaster()).filter(l => l.id !== id);
    localStorage.setItem('kardex_locations_master', JSON.stringify(locs));
  }
};

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_categories_master') || '[]');
  try {
    const { data, error, status } = await supabase.from('categories_master').select('*').order('name');
    if (error || status === 404) return JSON.parse(localStorage.getItem('kardex_categories_master') || '[]');
    return data || [];
  } catch (e) {
    return JSON.parse(localStorage.getItem('kardex_categories_master') || '[]');
  }
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => {
  if (!useSupabase()) {
    const cats = await getCategoriesMaster();
    if (cat.id) {
      const idx = cats.findIndex(c => c.id === cat.id);
      cats[idx] = { ...cats[idx], ...cat };
    } else {
      cats.push({ id: crypto.randomUUID(), name: cat.name! });
    }
    localStorage.setItem('kardex_categories_master', JSON.stringify(cats));
    return;
  }
  await supabase.from('categories_master').upsert(cat);
};

export const deleteCategoryMaster = async (id: string) => {
  if (useSupabase()) await supabase.from('categories_master').delete().eq('id', id);
  else {
    const cats = (await getCategoriesMaster()).filter(c => c.id !== id);
    localStorage.setItem('kardex_categories_master', JSON.stringify(cats));
  }
};

// --- Productos ---
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  try {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
      category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
      purchasePrice: Number(p.precio_compra || p.price) || 0, currency: p.moneda || 'PEN', unit: p.unit || 'und', imageUrl: p.image_url, updatedAt: p.updated_at,
      price: Number(p.precio_compra || p.price) || 0
    }));
  } catch (e) {
    return localStorageApi.getProducts();
  }
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) {
    localStorageApi.saveProduct({ ...product, id: product.id || crypto.randomUUID() } as any);
    return;
  }
  const payload = {
    code: product.code, name: product.name, brand: product.brand, size: product.size, model: product.model,
    category: product.category, location: product.location, stock: Number(product.stock) || 0,
    min_stock: Number(product.minStock) || 30, critical_stock: Number(product.criticalStock) || 10,
    precio_compra: Number(product.purchasePrice) || 0, moneda: product.currency || 'PEN',
    unit: product.unit || 'und', image_url: product.imageUrl, updated_at: new Date().toISOString()
  };
  const { error } = product.id 
    ? await supabase.from('products').update(payload).eq('id', product.id)
    : await supabase.from('products').insert([payload]);
  
  if (!error) {
    await saveAuditLog({
      action: product.id ? 'UPDATE' : 'CREATE',
      table_name: 'products',
      record_name: product.name,
      changes_summary: `${product.id ? 'Editado' : 'Creado'} producto ${product.name} (${product.code})`
    });
  }
  if (error) throw error;
};

export const deleteProduct = async (id: string) => {
  let name = '';
  if (useSupabase()) {
    const { data } = await supabase.from('products').select('name').eq('id', id).single();
    name = data?.name || '';
    await supabase.from('products').delete().eq('id', id);
  } else {
    const p = localStorageApi.getProducts().find(p => p.id === id);
    name = p?.name || '';
    localStorageApi.deleteProduct(id);
  }
  await saveAuditLog({ action: 'DELETE', table_name: 'products', record_name: name, changes_summary: `Producto eliminado: ${name}` });
};

export const getStats = async (): Promise<InventoryStats> => {
  const [products, movements, contacts, destinos] = await Promise.all([getProducts(), getMovements(), getContacts(), getDestinos()]);
  return {
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock > p.criticalStock && p.stock <= p.minStock).length,
    criticalStockCount: products.filter(p => p.stock > 0 && p.stock <= p.criticalStock).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length,
    totalContacts: contacts.length,
    totalValue: products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0)
  };
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return localStorageApi.getMovements();
  try {
    const { data, error } = await supabase.from('movements').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: m.quantity, date: m.date,
      dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after, destinationName: m.destino_nombre
    }));
  } catch (e) {
    return localStorageApi.getMovements();
  }
};

export const registerMovement = async (movement: any) => {
  if (!useSupabase()) return localStorageApi.registerMovement(movement);
  const { data: product } = await supabase.from('products').select('name, stock').eq('id', movement.productId).single();
  if (!product) throw new Error("Producto no encontrado");
  const newStock = product.stock + (movement.type === 'INGRESO' ? movement.quantity : -movement.quantity);
  await supabase.from('products').update({ stock: newStock }).eq('id', movement.productId);
  await supabase.from('movements').insert([{
    product_id: movement.productId, product_name: product.name, type: movement.type,
    quantity: movement.quantity, dispatcher: movement.dispatcher, reason: movement.reason,
    balance_after: newStock, destino_nombre: movement.destinationName, date: new Date().toISOString()
  }]);
};

// --- Registro en Lote ---
export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) {
    for (const item of items) {
      localStorageApi.registerMovement(item);
    }
    return;
  }
  
  // En Supabase lo hacemos secuencial para asegurar consistencia de stock
  for (const item of items) {
     const { data: product } = await supabase.from('products').select('name, stock').eq('id', item.productId).single();
     if (!product) continue;
     const newStock = product.stock + (item.type === 'INGRESO' ? item.quantity : -item.quantity);
     await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
     await supabase.from('movements').insert([{
        product_id: item.productId, product_name: product.name, type: item.type,
        quantity: item.quantity, dispatcher: item.dispatcher, reason: item.reason,
        balance_after: newStock, destino_nombre: item.destinationName, date: new Date().toISOString()
     }]);
  }
};

export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return localStorageApi.getContacts();
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (e) {
    return localStorageApi.getContacts();
  }
};

export const getDestinos = async () => {
  if (!useSupabase()) return localStorageApi.getDestinos();
  try {
    const { data, error } = await supabase.from('destinos').select('*');
    if (error) throw error;
    return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo }));
  } catch (e) {
    return localStorageApi.getDestinos();
  }
};

export const saveDestino = async (d: any) => {
  if (useSupabase()) await supabase.from('destinos').upsert({ id: d.id, nombre: d.name, tipo: d.type, activo: d.active });
  else localStorageApi.saveDestino(d);
};

export const deleteContact = async (id: string) => {
  if (useSupabase()) await supabase.from('contacts').delete().eq('id', id);
  else localStorageApi.deleteContact(id);
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) {
    localStorageApi.saveContact({ ...contact, id: contact.id || crypto.randomUUID() } as Contact);
    return;
  }
  await supabase.from('contacts').upsert(contact);
};

export const getAuditLogs = async (page = 0, limit = 50) => {
  if (!useSupabase()) {
    const logs = JSON.parse(localStorage.getItem('kardex_audit') || '[]');
    return { data: logs.slice(page * limit, (page + 1) * limit), count: logs.length };
  }
  try {
    const { data, count, error } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) return { data: [], count: 0 };
    return { data: data || [], count: count || 0 };
  } catch (e) {
    const logs = JSON.parse(localStorage.getItem('kardex_audit') || '[]');
    return { data: logs.slice(page * limit, (page + 1) * limit), count: logs.length };
  }
};
