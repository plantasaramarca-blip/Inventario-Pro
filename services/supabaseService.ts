
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog, Destination, LocationMaster, CategoryMaster, UserAccount, Role } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

// --- Sistema de Auditoría ---
export const saveAuditLog = async (log: Partial<AuditLog>) => {
  if (!useSupabase()) return;
  const session = (await supabase.auth.getSession()).data.session;
  const user = session?.user;
  
  try {
    await supabase.from('audit_logs').insert([{
      user_id: user?.id || 'system',
      user_email: user?.email || 'Sistema',
      action: log.action,
      table_name: log.table_name,
      record_id: log.record_id,
      record_name: log.record_name,
      changes_summary: log.changes_summary,
      created_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.warn("No se pudo registrar auditoría en la nube");
  }
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
  if (!useSupabase()) return [];
  try {
    const { data, error } = await supabase.from('profiles').select('*').order('email');
    if (error) throw error;
    return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
  } catch (e) {
    return [];
  }
};

export const saveUser = async (user: Partial<UserAccount>) => {
  if (!useSupabase()) return;
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
  if (!useSupabase()) return;
  const { data } = await supabase.from('profiles').select('email').eq('id', id).single();
  const email = data?.email || id;
  await supabase.from('profiles').delete().eq('id', id);
  
  await saveAuditLog({
    action: 'DELETE',
    table_name: 'profiles',
    record_name: email,
    changes_summary: `Eliminado acceso de usuario ${email}`
  });
};

// --- Maestros (Categorías y Almacenes) ---
export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  try {
    const { data, error } = await supabase.from('locations_master').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error al obtener almacenes de Supabase:", e);
    return [];
  }
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => {
  if (!useSupabase()) return;
  const { error } = await supabase.from('locations_master').upsert({
    id: loc.id,
    name: loc.name
  });
  if (error) throw error;
};

export const deleteLocationMaster = async (id: string) => {
  if (!useSupabase()) return;
  const { error } = await supabase.from('locations_master').delete().eq('id', id);
  if (error) throw error;
};

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  try {
    const { data, error } = await supabase.from('categories_master').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Error al obtener categorías de Supabase:", e);
    return [];
  }
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => {
  if (!useSupabase()) return;
  const { error } = await supabase.from('categories_master').upsert({
    id: cat.id,
    name: cat.name
  });
  if (error) throw error;
};

export const deleteCategoryMaster = async (id: string) => {
  if (!useSupabase()) return;
  const { error } = await supabase.from('categories_master').delete().eq('id', id);
  if (error) throw error;
};

// --- Productos ---
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
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
    return [];
  }
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) return;
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
  if (!useSupabase()) return;
  const { data } = await supabase.from('products').select('name').eq('id', id).single();
  const name = data?.name || '';
  await supabase.from('products').delete().eq('id', id);
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
  if (!useSupabase()) return [];
  try {
    const { data, error } = await supabase.from('movements').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, quantity: m.quantity, date: m.date,
      dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after, destinationName: m.destino_nombre
    }));
  } catch (e) {
    return [];
  }
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;
  
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
  if (!useSupabase()) return [];
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('name');
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
};

export const getDestinos = async () => {
  if (!useSupabase()) return [];
  try {
    const { data, error } = await supabase.from('destinos').select('*').order('nombre');
    if (error) throw error;
    return (data || []).map(d => ({ id: d.id, name: d.nombre, type: d.tipo, active: d.activo }));
  } catch (e) {
    return [];
  }
};

export const saveDestino = async (d: any) => {
  if (!useSupabase()) return;
  await supabase.from('destinos').upsert({ id: d.id, nombre: d.name, tipo: d.type, activo: d.active });
};

export const deleteContact = async (id: string) => {
  if (useSupabase()) await supabase.from('contacts').delete().eq('id', id);
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) return;
  await supabase.from('contacts').upsert(contact);
};

export const getAuditLogs = async (page = 0, limit = 50) => {
  if (!useSupabase()) return { data: [], count: 0 };
  try {
    const { data, count, error } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (error) return { data: [], count: 0 };
    return { data: data || [], count: count || 0 };
  } catch (e) {
    return { data: [], count: 0 };
  }
};
