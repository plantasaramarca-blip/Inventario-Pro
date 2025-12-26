
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog, Destination } from '../types.ts';
import * as localStorageApi from './storageService.ts';

const useSupabase = () => isSupabaseConfigured;

export const getAuditLogs = async (page = 0, limit = 50, filters?: any) => {
  if (!useSupabase()) return localStorageApi.getAuditLogs(page, limit);
  
  let query = supabase.from('audit_logs').select('*', { count: 'exact' });
  
  if (filters) {
    if (filters.action && filters.action !== 'ALL') query = query.eq('action', filters.action);
    if (filters.tableName && filters.tableName !== 'ALL') query = query.eq('table_name', filters.tableName);
    if (filters.userEmail) query = query.ilike('user_email', `%${filters.userEmail}%`);
  }
  
  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
    
  return {
    data: (data || []).map(l => ({
      id: l.id,
      created_at: l.created_at,
      user_id: l.user_id,
      user_email: l.user_email,
      action: l.action,
      table_name: l.table_name,
      record_id: l.record_id,
      record_name: l.record_name,
      old_values: l.old_values,
      new_values: l.new_values,
      changes_summary: l.changes_summary
    })),
    count: count || 0
  };
};

export const logAuditAction = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: string,
  recordId: string,
  recordName: string,
  oldValues?: any,
  newValues?: any
): Promise<void> => {
  let userEmail = 'Usuario Local';
  let userId = 'local-user';

  if (useSupabase()) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      userEmail = user.email || '';
      userId = user.id;
    }
  }

  const logPayload = {
    user_id: userId,
    user_email: userEmail,
    action,
    table_name: tableName,
    record_id: recordId,
    record_name: recordName || 'Sin Nombre',
    old_values: oldValues,
    new_values: newValues,
    changes_summary: `${action} en ${tableName}: ${recordName}`
  };

  if (useSupabase()) {
    try { await supabase.from('audit_logs').insert([logPayload]); } catch (e) {}
  } else {
    localStorageApi.saveAuditLog(logPayload);
  }
};

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) return [];
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, category: p.category, location: p.location, 
    stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
    price: Number(p.precio_compra || p.price) || 0,
    purchasePrice: Number(p.precio_compra || p.price) || 0,
    salePrice: p.precio_venta ? Number(p.precio_venta) : undefined,
    currency: p.moneda || 'PEN',
    unit: p.unit || 'und', imageUrl: p.image_url, updatedAt: p.updated_at,
    qr_code: p.qr_code || p.code
  }));
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) return localStorageApi.getProducts().find(x => x.id === id) || null;
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    id: data.id, code: data.code, name: data.name, category: data.category, location: data.location, 
    stock: data.stock || 0, minStock: data.min_stock ?? 30, criticalStock: data.critical_stock ?? 10,
    price: Number(data.precio_compra || data.price) || 0,
    purchasePrice: Number(data.precio_compra || data.price) || 0,
    salePrice: data.precio_venta ? Number(data.precio_venta) : undefined,
    currency: data.moneda || 'PEN',
    unit: data.unit || 'und', imageUrl: data.image_url, updatedAt: data.updated_at,
    qr_code: data.qr_code || data.code
  };
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) {
    const id = product.id || crypto.randomUUID();
    const p = { ...product, id, updatedAt: new Date().toISOString() } as Product;
    localStorageApi.saveProduct(p);
    return;
  }

  let qrCode = product.qr_code;
  if (!product.id && !qrCode) {
    try {
      const { data: lastProd } = await supabase
        .from('products')
        .select('qr_code')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      let nextNum = 1;
      if (lastProd?.qr_code) {
        const match = lastProd.qr_code.match(/PROD-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      qrCode = `PROD-${String(nextNum).padStart(6, '0')}`;
    } catch (e) {
      qrCode = product.code || `P-${Date.now()}`;
    }
  }

  const payload: any = {
    code: product.code, name: product.name, category: product.category,
    location: product.location, stock: product.stock, min_stock: product.minStock,
    critical_stock: product.criticalStock, precio_compra: product.purchasePrice,
    precio_venta: product.salePrice, moneda: product.currency,
    unit: product.unit, image_url: product.imageUrl, updated_at: new Date().toISOString()
  };

  if (qrCode) payload.qr_code = qrCode;

  if (product.id) {
    await supabase.from('products').update(payload).eq('id', product.id);
  } else {
    await supabase.from('products').insert([payload]);
  }
};

export const deleteProduct = async (id: string) => {
  if (!useSupabase()) return localStorageApi.deleteProduct(id);
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
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
    destinationName: m.destino_nombre
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
