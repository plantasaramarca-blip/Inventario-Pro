
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog, Destination, LocationMaster, CategoryMaster, UserAccount, Role } from '../types.ts';
import * as localStorageApi from './storageService.ts';

const useSupabase = () => isSupabaseConfigured;

// Cache para evitar re-peticiones a tablas inexistentes (404s)
const missingTables = new Set<string>();

async function safeFetch(tableName: string, query: any) {
  if (missingTables.has(tableName)) return { data: [], error: null };
  
  try {
    const { data, error } = await query;
    if (error) {
      if (error.code === 'PGRST116' || error.status === 404) {
        missingTables.add(tableName);
        return { data: [], error: null };
      }
      throw error;
    }
    return { data, error: null };
  } catch (e) {
    missingTables.add(tableName);
    return { data: [], error: null };
  }
}

// --- Usuarios y Perfiles ---
export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!useSupabase()) return { role: 'ADMIN' };
  
  try {
    const { data, error } = await supabase.from('profiles').select('role').eq('email', cleanEmail).maybeSingle();
    if (error) return { role: 'VIEWER' };
    if (!data) return { role: 'VIEWER' };
    return { role: data.role as Role };
  } catch (e) {
    return { role: 'VIEWER' };
  }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_users') || '[]');
  const { data } = await supabase.from('profiles').select('*').order('email');
  return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!useSupabase()) return;
  const cleanEmail = user.email?.trim().toLowerCase();
  await supabase.from('profiles').upsert({ email: cleanEmail, role: user.role }, { onConflict: 'email' });
  
  if (!user.id && user.password) {
    await supabase.auth.signUp({ email: cleanEmail!, password: user.password });
  }
};

export const deleteUser = async (id: string) => {
  if (useSupabase()) await supabase.from('profiles').delete().eq('id', id);
};

// --- Maestros con Supresión de 404 ---
export const getLocationsMaster = async () => {
  if (!useSupabase()) return [];
  const { data } = await safeFetch('locations_master', supabase.from('locations_master').select('*').order('name'));
  return data || [];
};

export const saveLocationMaster = async (name: string) => {
  if (useSupabase()) await supabase.from('locations_master').insert([{ name }]);
};

export const deleteLocationMaster = async (id: string) => {
  if (useSupabase()) await supabase.from('locations_master').delete().eq('id', id);
};

export const getCategoriesMaster = async () => {
  if (!useSupabase()) return [];
  const { data } = await safeFetch('categories_master', supabase.from('categories_master').select('*').order('name'));
  return data || [];
};

export const saveCategoryMaster = async (name: string) => {
  if (useSupabase()) await supabase.from('categories_master').insert([{ name }]);
};

export const deleteCategoryMaster = async (id: string) => {
  if (useSupabase()) await supabase.from('categories_master').delete().eq('id', id);
};

// --- Productos ---
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  const { data } = await supabase.from('products').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
    category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
    purchasePrice: Number(p.precio_compra || p.price) || 0, currency: p.moneda || 'PEN', unit: p.unit || 'und', imageUrl: p.image_url, updatedAt: p.updated_at,
    price: Number(p.precio_compra || p.price) || 0
  }));
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

  try {
    const { error } = product.id 
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert([payload]);
    
    if (error) throw error;
  } catch (e: any) {
    console.error("Error al guardar producto:", e);
    throw new Error(e.message || "Error de conexión con la base de datos");
  }
};

export const deleteProduct = async (id: string) => {
  if (useSupabase()) await supabase.from('products').delete().eq('id', id);
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

export const getStats = async (): Promise<InventoryStats> => {
  const [products, movements, contacts] = await Promise.all([getProducts(), getMovements(), getContacts()]);
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
  const { data } = await supabase.from('movements').select('*').order('date', { ascending: false });
  return (data || []).map(m => ({
    id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: m.quantity, date: m.date,
    dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after, destinationName: m.destino_nombre
  }));
};

export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return localStorageApi.getContacts();
  const { data } = await supabase.from('contacts').select('*').order('name');
  return data || [];
};

export const saveContact = async (c: any) => {
  if (useSupabase()) await supabase.from('contacts').upsert(c);
};

export const deleteContact = async (id: string) => {
  if (useSupabase()) await supabase.from('contacts').delete().eq('id', id);
};

export const getDestinos = async () => {
  if (!useSupabase()) return localStorageApi.getDestinos();
  const { data } = await supabase.from('destinos').select('*');
  return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo }));
};

export const saveDestino = async (d: any) => {
  if (useSupabase()) await supabase.from('destinos').upsert({ nombre: d.name, tipo: d.type, activo: d.active });
};

export const deleteDestino = async (id: string) => {
  if (useSupabase()) await supabase.from('destinos').delete().eq('id', id);
};

export const getAuditLogs = async (page = 0, limit = 50) => {
  if (!useSupabase()) return { data: [], count: 0 };
  const { data, count } = await supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
  return { data: data || [], count: count || 0 };
};

export const saveAuditLog = async (log: any) => {
  if (useSupabase()) await supabase.from('audit_logs').insert([log]);
};
