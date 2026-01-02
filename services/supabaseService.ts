
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, InventoryStats, CategoryMaster, LocationMaster, UserAccount, Role, Contact, Destination, AuditLog } from '../types.ts';

const useSupabase = () => isSupabaseConfigured;

// Función auxiliar para añadir tiempo límite a las peticiones
const withTimeout = async (promise: any, timeoutMs: number = 30000): Promise<any> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_ERROR')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
};

// MOTOR DE AUDITORÍA
const saveAuditLog = async (logData: Omit<AuditLog, 'id' | 'created_at' | 'user_id' | 'user_email' | 'old_values' | 'new_values'>) => {
  if (!useSupabase()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // No se puede auditar si no hay usuario
    
    const logPayload = { ...logData, user_id: user.id, user_email: user.email };

    // "Dispara y olvida": no bloquea la operación principal si falla la auditoría.
    supabase.from('audit_logs').insert([logPayload]).then(({ error }) => {
      if (error) console.error('Fallo al guardar en auditoría:', error);
    });
  } catch (e) {
    console.error('Error al obtener usuario para auditoría:', e);
  }
};

export const getCurrentUserProfile = async (email: string): Promise<{role: Role} | null> => {
  if (!useSupabase()) {
    localStorage.setItem('kardex_user_role', 'ADMIN');
    return { role: 'ADMIN' };
  }
  try {
    const { data } = await withTimeout(supabase.from('profiles').select('role').eq('email', email.toLowerCase()).maybeSingle());
    if (data) {
      localStorage.setItem('kardex_user_role', data.role);
      return { role: data.role as Role };
    } else {
      localStorage.removeItem('kardex_user_role');
      return { role: 'VIEWER' };
    }
  } catch (e) { 
    throw e;
  }
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
  const isUpdate = !!user.id;
  await withTimeout(supabase.from('profiles').upsert({ email: user.email?.toLowerCase(), role: user.role }, { onConflict: 'email' }));
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'profiles', record_id: user.email!, record_name: user.email!, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el usuario ${user.email} con rol ${user.role}` });
};

export const deleteUser = async (id: string) => { 
  if (!useSupabase()) return;
  const { data: userToDelete } = await withTimeout(supabase.from('profiles').select('id, email').eq('id', id).single());
  if (userToDelete) {
    await withTimeout(supabase.from('profiles').delete().eq('id', id));
    saveAuditLog({ action: 'DELETE', table_name: 'profiles', record_id: userToDelete.id, record_name: userToDelete.email, changes_summary: `Eliminó el usuario "${userToDelete.email}"` });
  }
};

export const getLocationsMaster = async (): Promise<LocationMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'Almacén Principal' }];
  try {
    const { data } = await withTimeout(supabase.from('locations_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveLocationMaster = async (loc: Partial<LocationMaster>) => { 
  if (!useSupabase()) return;
  const isUpdate = !!loc.id;
  const { data } = await withTimeout(supabase.from('locations_master').upsert({ id: loc.id, name: loc.name }).select().single());
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'locations_master', record_id: data.id, record_name: data.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el almacén "${data.name}"` });
};
export const deleteLocationMaster = async (id: string) => { 
  if (!useSupabase()) return;
  const { data: locToDelete } = await withTimeout(supabase.from('locations_master').select('id, name').eq('id', id).single());
  if (locToDelete) {
    await withTimeout(supabase.from('locations_master').delete().eq('id', id));
    saveAuditLog({ action: 'DELETE', table_name: 'locations_master', record_id: locToDelete.id, record_name: locToDelete.name, changes_summary: `Eliminó el almacén "${locToDelete.name}"` });
  }
};

export const getCategoriesMaster = async (): Promise<CategoryMaster[]> => {
  if (!useSupabase()) return [{ id: '1', name: 'General' }];
  try {
    const { data } = await withTimeout(supabase.from('categories_master').select('*').order('name'));
    return data || [];
  } catch (e) { return []; }
};

export const saveCategoryMaster = async (cat: Partial<CategoryMaster>) => { 
  if (!useSupabase()) return;
  const isUpdate = !!cat.id;
  const { data } = await withTimeout(supabase.from('categories_master').upsert({ id: cat.id, name: cat.name }).select().single());
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'categories_master', record_id: data.id, record_name: data.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} la categoría "${data.name}"` });
};
export const deleteCategoryMaster = async (id: string) => { 
  if (!useSupabase()) return;
  const { data: catToDelete } = await withTimeout(supabase.from('categories_master').select('id, name').eq('id', id).single());
  if (catToDelete) {
    await withTimeout(supabase.from('categories_master').delete().eq('id', id));
    saveAuditLog({ action: 'DELETE', table_name: 'categories_master', record_id: catToDelete.id, record_name: catToDelete.name, changes_summary: `Eliminó la categoría "${catToDelete.name}"` });
  }
};

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('products').select('*').order('updated_at', { ascending: false }));
    return (data || []).map(p => ({
      id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
      category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
      purchasePrice: p.precio_compra || 0, salePrice: p.precio_venta || 0, currency: p.moneda || 'PEN', unit: p.unit || 'UND', imageUrl: p.image_url, updatedAt: p.updated_at
    }));
  } catch (e) { throw e; }
};

export const getAlertProducts = async (limit = 6): Promise<Product[]> => {
  if (!useSupabase()) return [];
  try {
    // No podemos hacer un filtro `stock <= min_stock` en el cliente, así que traemos todos.
    // Esto es una limitación sin RPC, pero el impacto se aisla al dashboard.
    const { data } = await withTimeout(supabase.from('products').select('*').order('stock', { ascending: true }));
    const allProducts = (data || []).map(p => ({
      id: p.id, code: p.code, name: p.name, brand: p.brand || '', size: p.size || '', model: p.model || '',
      category: p.category, location: p.location, stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
      purchasePrice: p.precio_compra || 0, salePrice: p.precio_venta || 0, currency: p.moneda || 'PEN', unit: p.unit || 'UND', imageUrl: p.image_url, updatedAt: p.updated_at
    }));

    return allProducts.filter(p => p.stock <= p.minStock).slice(0, limit);

  } catch (e) {
    throw e;
  }
};


export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) return;
  
  // Para un registro de auditoría preciso, determinamos si el producto ya existe.
  const { data: existingProduct } = await supabase.from('products').select('id').eq('id', product.id!).maybeSingle();
  const isUpdate = !!existingProduct;

  const payload: any = {
    id: product.id, // El ID es crucial para que `upsert` funcione.
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
    precio_venta: Number(product.salePrice) || 0, 
    moneda: product.currency || 'PEN', 
    unit: product.unit || 'UND',
    image_url: product.imageUrl, 
    updated_at: new Date().toISOString()
  };
  
  // `upsert` crea o actualiza el registro en una sola operación atómica.
  const { data, error } = await withTimeout(
    supabase.from('products').upsert(payload).select().single()
  );
  
  if (error) {
    console.error("Error en Supabase al guardar producto:", error);
    throw error;
  }
  
  saveAuditLog({ 
    action: isUpdate ? 'UPDATE' : 'CREATE', 
    table_name: 'products', 
    record_id: data.id, 
    record_name: data.name, 
    changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el producto "${data.name}"` 
  });
};

export const deleteProduct = async (id: string) => {
  if (!useSupabase()) return;
  const { data: prodToDelete } = await withTimeout(supabase.from('products').select('id, name').eq('id', id).single());
  if (prodToDelete) {
    const { error } = await withTimeout(supabase.from('products').delete().eq('id', id));
    if (error) throw error;
    saveAuditLog({ action: 'DELETE', table_name: 'products', record_id: prodToDelete.id, record_name: prodToDelete.name, changes_summary: `Eliminó el producto "${prodToDelete.name}"` });
  }
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return [];
  try {
    const { data } = await withTimeout(supabase.from('movements').select('*').order('date', { ascending: false }));
    return (data || []).map(m => ({ 
      id: m.id, productId: m.product_id, productName: m.product_name, type: m.type, 
      quantity: Number(m.quantity) || 0, date: m.date, dispatcher: m.dispatcher, reason: m.reason, 
      balanceAfter: Number(m.balance_after) || 0, destinationName: m.destino_nombre
    }));
  } catch (e) { return []; }
};

export const registerBatchMovements = async (items: any[]) => {
  if (!useSupabase()) return;

  for (const item of items) {
    if (item.type === 'SALIDA') {
      const { data: prod } = await withTimeout(supabase.from('products').select('name, stock').eq('id', item.productId).single());
      if (!prod) throw new Error(`Producto con ID ${item.productId} no encontrado.`);
      if (prod.stock < item.quantity) throw new Error(`Stock insuficiente para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${item.quantity}.`);
    }
  }

  for (const item of items) {
     const { data: prod } = await withTimeout(supabase.from('products').select('name, stock').eq('id', item.productId).single());
     if (!prod) continue;
     const newStock = prod.stock + (item.type === 'INGRESO' ? item.quantity : -item.quantity);
     await withTimeout(supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', item.productId));
     
     const movementPayload = { 
       product_id: item.productId, product_name: prod.name, type: item.type, 
       quantity: item.quantity, dispatcher: item.dispatcher, reason: item.reason, 
       balance_after: newStock, destino_nombre: item.destinationName, date: new Date().toISOString() 
     };
     const { data: newMovement } = await withTimeout(supabase.from('movements').insert([movementPayload]).select().single());
     
     if (newMovement) {
       saveAuditLog({ action: 'CREATE', table_name: 'movements', record_id: newMovement.id, record_name: newMovement.product_name, changes_summary: `Registró ${newMovement.type} de ${newMovement.quantity} unds. para "${newMovement.product_name}"` });
     }
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
  const isUpdate = !!contact.id;
  const payload = { name: contact.name, type: contact.type, phone: contact.phone, email: contact.email, tax_id: contact.taxId };
  const query = contact.id ? supabase.from('contacts').update(payload).eq('id', contact.id) : supabase.from('contacts').insert([payload]);
  const { data, error } = await withTimeout(query.select().single());
  if (error) throw error;
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'contacts', record_id: data.id, record_name: data.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el contacto "${data.name}"` });
};

export const deleteContact = async (id: string) => { 
  if (!useSupabase()) return;
  const { data: contactToDelete } = await withTimeout(supabase.from('contacts').select('id, name').eq('id', id).single());
  if (contactToDelete) {
    await withTimeout(supabase.from('contacts').delete().eq('id', id));
    saveAuditLog({ action: 'DELETE', table_name: 'contacts', record_id: contactToDelete.id, record_name: contactToDelete.name, changes_summary: `Eliminó el contacto "${contactToDelete.name}"` });
  }
};

export const getStats = async (): Promise<InventoryStats> => {
  if (!useSupabase()) {
     // Lógica local sin Supabase
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

    if (pError || mError || cError) {
        console.error("Error fetching stats components", { pError, mError, cError });
        throw new Error('Failed to fetch stats components');
    }
    
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
    console.error("Error in getStats:", e);
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

export const saveDestino = async (d: Partial<Destination>) => { 
  if (!useSupabase()) return;
  const isUpdate = !!d.id;
  const { data } = await withTimeout(supabase.from('destinos').upsert({ id: d.id, nombre: d.name, tipo: d.type, activo: d.active }).select().single());
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'destinos', record_id: data.id, record_name: data.nombre, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el centro de costo "${data.nombre}"` });
};

export const getAuditLogs = async (p=0, l=50) => { 
  if (!useSupabase()) return { data: [], count: 0 }; 
  try {
    const { data, count } = await withTimeout(supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(p*l, (p+1)*l-1)); 
    return { data: data || [], count: count || 0 }; 
  } catch (e) { return { data: [], count: 0 }; }
};
