
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog, Destination, LocationMaster, CategoryMaster, UserAccount, Role } from '../types.ts';
import * as localStorageApi from './storageService.ts';

const useSupabase = () => isSupabaseConfigured;

// --- Usuarios y Perfiles ---
export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  const cleanEmail = email.trim().toLowerCase();
  
  if (!useSupabase()) {
    const users = await getUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    return user ? { role: user.role } : { role: 'ADMIN' };
  }
  
  try {
    const { data, error } = await supabase.from('profiles').select('role').eq('email', cleanEmail).maybeSingle();
    if (error) throw error;

    if (!data) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const initialRole: Role = (count === 0) ? 'ADMIN' : 'VIEWER';
      await supabase.from('profiles').upsert({ email: cleanEmail, role: initialRole }, { onConflict: 'email' });
      return { role: initialRole };
    }
    
    return { role: data.role as Role };
  } catch (e) {
    console.error("Error en getCurrentUserProfile:", e);
    return { role: 'VIEWER' };
  }
};

export const getUsers = async (): Promise<UserAccount[]> => {
  if (!useSupabase()) {
    const data = localStorage.getItem('kardex_users');
    return data ? JSON.parse(data) : [];
  }
  
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (error) throw error;
    return (data || []).map(u => ({ 
      id: u.id, 
      email: u.email.toLowerCase(), 
      role: u.role as Role, 
      createdAt: u.created_at 
    }));
  } catch (e) {
    return [];
  }
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!user.email) throw new Error("Email requerido");
  const cleanEmail = user.email.trim().toLowerCase();

  if (!useSupabase()) {
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...user, email: cleanEmail };
    } else {
      users.push({ 
        id: crypto.randomUUID(), email: cleanEmail, role: user.role || 'VIEWER', createdAt: new Date().toISOString() 
      });
    }
    localStorage.setItem('kardex_users', JSON.stringify(users));
    return;
  }

  try {
    // 1. Guardar en Base de Datos (Profiles) - Prioridad absoluta
    const { error: upsertError } = await supabase.from('profiles').upsert(
      { email: cleanEmail, role: user.role }, 
      { onConflict: 'email' }
    );
    
    if (upsertError) throw new Error(`Error en base de datos: ${upsertError.message}`);

    // 2. Intentar Auth solo para usuarios nuevos
    if (!user.id && user.password) {
      // Intentamos registro, pero no dejamos que un fallo de "ya existe" detenga el proceso
      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: user.password,
        options: {
          data: { role: user.role },
          emailRedirectTo: window.location.origin
        }
      });
      
      if (authError) {
        // Si el error es 422 (ya registrado), lo ignoramos porque el perfil ya se guardó arriba
        console.warn("Información de Auth:", authError.message);
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error crítico en saveUser:", error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  if (!useSupabase()) {
    const users = (await getUsers()).filter(u => u.id !== id);
    localStorage.setItem('kardex_users', JSON.stringify(users));
    return;
  }
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw new Error(`Error al eliminar: ${error.message}`);
};

// ... Resto de funciones se mantienen iguales
export const getLocationsMaster = async () => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_locations_master') || '[]');
  const { data } = await supabase.from('locations_master').select('*').order('name');
  return data || [];
};
export const saveLocationMaster = async (name: string) => {
  if (!useSupabase()) {
    const locs = await getLocationsMaster();
    locs.push({ id: crypto.randomUUID(), name });
    localStorage.setItem('kardex_locations_master', JSON.stringify(locs));
    return;
  }
  await supabase.from('locations_master').insert([{ name }]);
};
export const deleteLocationMaster = async (id: string) => {
  if (!useSupabase()) {
    const locs = (await getLocationsMaster()).filter(l => l.id !== id);
    localStorage.setItem('kardex_locations_master', JSON.stringify(locs));
    return;
  }
  await supabase.from('locations_master').delete().eq('id', id);
};
export const getCategoriesMaster = async () => {
  if (!useSupabase()) return JSON.parse(localStorage.getItem('kardex_categories_master') || '[]');
  const { data } = await supabase.from('categories_master').select('*').order('name');
  return data || [];
};
export const saveCategoryMaster = async (name: string) => {
  if (!useSupabase()) {
    const cats = await getCategoriesMaster();
    cats.push({ id: crypto.randomUUID(), name });
    localStorage.setItem('kardex_categories_master', JSON.stringify(cats));
    return;
  }
  await supabase.from('categories_master').insert([{ name }]);
};
export const deleteCategoryMaster = async (id: string) => {
  if (!useSupabase()) {
    const cats = (await getCategoriesMaster()).filter(c => c.id !== id);
    localStorage.setItem('kardex_categories_master', JSON.stringify(cats));
    return;
  }
  await supabase.from('categories_master').delete().eq('id', id);
};
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  const { data } = await supabase.from('products').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, 
    brand: p.brand || '', size: p.size || '', model: p.model || '',
    category: p.category, location: p.location, 
    stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
    price: Number(p.precio_compra || p.price) || 0,
    purchasePrice: Number(p.precio_compra || p.price) || 0,
    salePrice: p.precio_venta ? Number(p.precio_venta) : undefined,
    currency: p.moneda || 'PEN',
    unit: p.unit || 'und', imageUrl: p.image_url, updatedAt: p.updated_at,
    qr_code: p.qr_code || p.code
  }));
};
export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) {
    const id = product.id || crypto.randomUUID();
    const p = { ...product, id, updatedAt: new Date().toISOString() } as Product;
    localStorageApi.saveProduct(p);
    return;
  }
  const payload: any = {
    code: product.code, name: product.name, 
    brand: product.brand, size: product.size, model: product.model,
    category: product.category, location: product.location, stock: product.stock, 
    min_stock: product.minStock, critical_stock: product.criticalStock, 
    precio_compra: product.purchasePrice, precio_venta: product.salePrice, 
    moneda: product.currency, unit: product.unit, image_url: product.imageUrl, 
    updated_at: new Date().toISOString()
  };
  if (product.id) await supabase.from('products').update(payload).eq('id', product.id);
  else await supabase.from('products').insert([payload]);
};
export const getAuditLogs = async (page = 0, limit = 50) => {
  if (!useSupabase()) return localStorageApi.getAuditLogs(page, limit);
  const { data, count } = await supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * limit, (page + 1) * limit - 1);
  return { data: data || [], count: count || 0 };
};
export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) return localStorageApi.getProducts().find(x => x.id === id) || null;
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, code: data.code, name: data.name, 
    brand: data.brand, size: data.size, model: data.model,
    category: data.category, location: data.location, 
    stock: data.stock || 0, minStock: data.min_stock ?? 30, criticalStock: data.critical_stock ?? 10,
    price: Number(data.precio_compra || data.price) || 0,
    purchasePrice: Number(data.precio_compra || data.price) || 0,
    salePrice: data.precio_venta ? Number(data.precio_venta) : undefined,
    currency: data.moneda || 'PEN',
    unit: data.unit || 'und', imageUrl: data.image_url, updatedAt: data.updated_at,
    qr_code: data.qr_code || data.code
  };
};
export const deleteProduct = async (id: string) => {
  if (!useSupabase()) return localStorageApi.deleteProduct(id);
  await supabase.from('products').delete().eq('id', id);
};
export const registerMovement = async (movement: any) => {
  if (!useSupabase()) return localStorageApi.registerMovement(movement);
  const { data: product } = await supabase.from('products').select('name, stock').eq('id', movement.productId).single();
  if (!product) throw new Error("Producto no encontrado");
  let newStock = product.stock + (movement.type === 'INGRESO' ? movement.quantity : -movement.quantity);
  await supabase.from('products').update({ stock: newStock }).eq('id', movement.productId);
  await supabase.from('movements').insert([{
    product_id: movement.productId, product_name: product.name, type: movement.type,
    quantity: movement.quantity, dispatcher: movement.dispatcher, reason: movement.reason,
    balance_after: newStock, destino_id: movement.destinationId,
    destino_nombre: movement.destinationName, date: new Date().toISOString()
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
    id: m.id, productId: m.product_id, productName: m.product_name,
    type: m.type, quantity: m.quantity, date: m.date,
    dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after,
    destinationName: m.destino_nombre, destinationType: m.destination_type
  }));
};
export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return localStorageApi.getContacts();
  const { data } = await supabase.from('contacts').select('*').order('name');
  return (data || []).map(c => ({ id: c.id, name: c.name, type: c.type, email: c.email }));
};
export const saveContact = async (c: any) => {
  if (!useSupabase()) return localStorageApi.saveContact(c);
  if (c.id) await supabase.from('contacts').update(c).eq('id', c.id);
  else await supabase.from('contacts').insert([c]);
};
export const deleteContact = async (id: string) => {
  if (!useSupabase()) return localStorageApi.deleteContact(id);
  await supabase.from('contacts').delete().eq('id', id);
};
export const getCategories = async () => {
  if (!useSupabase()) return localStorageApi.getCategories();
  const { data } = await supabase.from('categories').select('name');
  return (data || []).map(c => c.name);
};
export const saveCategory = async (n: string) => {
  if (!useSupabase()) return localStorageApi.saveCategory(n);
  await supabase.from('categories').insert([{ name: n }]);
};
export const getDestinos = async () => {
  if (!useSupabase()) return localStorageApi.getDestinos();
  const { data } = await supabase.from('destinos').select('*');
  return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo }));
};
export const saveDestino = async (d: any) => {
  if (!useSupabase()) return localStorageApi.saveDestino(d);
  const p = { nombre: d.name, tipo: d.type, activo: d.active };
  if (d.id) await supabase.from('destinos').update(p).eq('id', d.id);
  else await supabase.from('destinos').insert([p]);
};
export const deleteDestino = async (id: string) => {
  if (!useSupabase()) return localStorageApi.deleteDestino(id);
  await supabase.from('destinos').delete().eq('id', id);
};
