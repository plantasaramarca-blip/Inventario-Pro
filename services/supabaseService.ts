
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { Product, Movement, Contact, InventoryStats, AuditLog } from '../types.ts';
import * as localStorageApi from './storageService.ts';

const useSupabase = () => isSupabaseConfigured;

/**
 * Sistema de Auditoría Unificado
 */
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

  // Generar un resumen legible automáticamente si no se provee
  let summary = '';
  if (action === 'CREATE') summary = `Creó nuevo registro en ${tableName}: ${recordName}`;
  else if (action === 'DELETE') summary = `Eliminó registro de ${tableName}: ${recordName}`;
  else if (action === 'UPDATE' && oldValues && newValues) {
    const changes: string[] = [];
    const keys = Object.keys(newValues);
    keys.forEach(key => {
      // Evitar comparar campos técnicos o iguales
      if (key !== 'updated_at' && key !== 'updatedAt' && JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push(`${key} (${oldValues[key] || 'vacío'} → ${newValues[key]})`);
      }
    });
    summary = changes.length > 0 
      ? `Modificó ${recordName}: ${changes.join(', ')}` 
      : `Actualizó ${recordName} (sin cambios en datos clave)`;
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
    changes_summary: summary
  };

  if (useSupabase()) {
    try {
      await supabase.from('audit_logs').insert([logPayload]);
    } catch (e) { console.error("Cloud Audit Error:", e); }
  } else {
    localStorageApi.saveAuditLog(logPayload);
  }
};

export const getAuditLogs = async (page = 0, limit = 50, filters: any = {}): Promise<{ data: AuditLog[], count: number }> => {
  if (!useSupabase()) return localStorageApi.getAuditLogs(page, limit);
  
  let query = supabase.from('audit_logs').select('*', { count: 'exact' });
  
  if (filters.action && filters.action !== 'ALL') query = query.eq('action', filters.action);
  if (filters.tableName && filters.tableName !== 'ALL') query = query.eq('table_name', filters.tableName);
  if (filters.userEmail && filters.userEmail.trim() !== '') {
    query = query.ilike('user_email', `%${filters.userEmail.trim()}%`);
  }
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return { data: data || [], count: count || 0 };
};

// --- CRUD PRODUCTS ---
export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  const { data } = await supabase.from('products').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, category: p.category, 
    location: p.location, stock: p.stock, minStock: p.min_stock, 
    unit: p.unit, imageUrl: p.image_url, updatedAt: p.updated_at
  }));
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) {
    const id = product.id || crypto.randomUUID();
    const p = { ...product, id, updatedAt: new Date().toISOString() } as Product;
    const old = product.id ? localStorageApi.getProducts().find(x => x.id === product.id) : null;
    localStorageApi.saveProduct(p);
    await logAuditAction(product.id ? 'UPDATE' : 'CREATE', 'products', id, p.name, old, p);
    return;
  }
  
  // FIX: product.min_stock was used instead of product.minStock (1-based line 114)
  const payload = {
    code: product.code, name: product.name, category: product.category,
    location: product.location, stock: product.stock, min_stock: product.minStock,
    unit: product.unit, image_url: product.imageUrl, updated_at: new Date().toISOString()
  };

  if (product.id) {
    const { data: old } = await supabase.from('products').select('*').eq('id', product.id).single();
    await supabase.from('products').update(payload).eq('id', product.id);
    await logAuditAction('UPDATE', 'products', product.id, product.name || 'n/a', old, payload);
  } else {
    const { data: inserted } = await supabase.from('products').insert([payload]).select().single();
    if (inserted) await logAuditAction('CREATE', 'products', inserted.id, inserted.name, null, payload);
  }
};

export const deleteProduct = async (id: string) => {
  if (!useSupabase()) {
    const old = localStorageApi.getProducts().find(x => x.id === id);
    localStorageApi.deleteProduct(id);
    if (old) await logAuditAction('DELETE', 'products', id, old.name, old, null);
    return;
  }
  const { data: old } = await supabase.from('products').select('*').eq('id', id).single();
  await supabase.from('products').delete().eq('id', id);
  if (old) await logAuditAction('DELETE', 'products', id, (old as any).name, old, null);
};

// --- CRUD CONTACTS ---
export const getContacts = async (): Promise<Contact[]> => {
  if (!useSupabase()) return localStorageApi.getContacts();
  const { data } = await supabase.from('contacts').select('*').order('name');
  return (data || []).map(c => ({
    id: c.id, name: c.name, type: c.type, phone: c.phone, email: c.email, taxId: c.tax_id
  }));
};

export const saveContact = async (contact: Partial<Contact>) => {
  if (!useSupabase()) {
    const id = contact.id || crypto.randomUUID();
    const c = { ...contact, id } as Contact;
    const old = contact.id ? localStorageApi.getContacts().find(x => x.id === contact.id) : null;
    localStorageApi.saveContact(c);
    await logAuditAction(contact.id ? 'UPDATE' : 'CREATE', 'contacts', id, c.name, old, c);
    return;
  }
  const payload = { name: contact.name, type: contact.type, phone: contact.phone, email: contact.email, tax_id: contact.taxId };
  if (contact.id) {
    const { data: old } = await supabase.from('contacts').select('*').eq('id', contact.id).single();
    await supabase.from('contacts').update(payload).eq('id', contact.id);
    await logAuditAction('UPDATE', 'contacts', contact.id, contact.name || 'n/a', old, payload);
  } else {
    const { data: inserted } = await supabase.from('contacts').insert([payload]).select().single();
    if (inserted) await logAuditAction('CREATE', 'contacts', inserted.id, inserted.name, null, payload);
  }
};

export const deleteContact = async (id: string) => {
  if (!useSupabase()) {
    const old = localStorageApi.getContacts().find(x => x.id === id);
    localStorageApi.deleteContact(id);
    if (old) await logAuditAction('DELETE', 'contacts', id, old.name, old, null);
    return;
  }
  const { data: old } = await supabase.from('contacts').select('*').eq('id', id).single();
  await supabase.from('contacts').delete().eq('id', id);
  if (old) await logAuditAction('DELETE', 'contacts', id, (old as any).name, old, null);
};

// --- MOVEMENTS ---
export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return localStorageApi.getMovements();
  const { data } = await supabase.from('movements').select('*').order('date', { ascending: false });
  return (data || []).map(m => ({
    id: m.id, productId: m.product_id, productName: m.product_name,
    type: m.type, quantity: m.quantity, date: m.date,
    dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after,
    contactId: m.contact_id, contactName: m.contact_name
  }));
};

export const registerMovement = async (movement: any) => {
  if (!useSupabase()) {
    const m = localStorageApi.registerMovement(movement);
    await logAuditAction('CREATE', 'movements', m.id, `${m.type} - ${m.productName}`, null, m);
    return;
  }
  
  const { data: product, error: pError } = await supabase.from('products').select('name, stock').eq('id', movement.productId).single();
  if (pError || !product) throw new Error("Producto no encontrado");

  let newStock = product.stock + (movement.type === 'INGRESO' ? movement.quantity : -movement.quantity);
  if (movement.type === 'SALIDA' && product.stock < movement.quantity) throw new Error("Stock insuficiente");

  await supabase.from('products').update({ stock: newStock }).eq('id', movement.productId);
  const payload = {
    product_id: movement.productId, product_name: product.name, type: movement.type,
    quantity: movement.quantity, dispatcher: movement.dispatcher, reason: movement.reason,
    balance_after: newStock, contact_id: movement.contactId, contact_name: movement.contactName,
    date: new Date().toISOString()
  };

  const { data: inserted } = await supabase.from('movements').insert([payload]).select().single();
  if (inserted) await logAuditAction('CREATE', 'movements', inserted.id, `${movement.type} - ${product.name}`, null, payload);
};

export const getStats = async (): Promise<InventoryStats> => {
  if (!useSupabase()) return localStorageApi.getStats();
  const [products, movements, contacts] = await Promise.all([getProducts(), getMovements(), getContacts()]);
  return {
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length,
    totalContacts: contacts.length
  };
};

export const uploadProductImage = async (file: File | Blob): Promise<string | null> => {
  if (!useSupabase()) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
  const fileName = `${Math.random().toString(36).substring(2)}.webp`;
  const filePath = `products/${fileName}`;
  const { error: uploadError } = await supabase.storage.from('inventory-images').upload(filePath, file);
  if (uploadError) return null;
  const { data } = supabase.storage.from('inventory-images').getPublicUrl(filePath);
  return data.publicUrl;
};

// --- CATEGORIES ---
// Fix for missing getCategories in Inventory.tsx
export const getCategories = async (): Promise<string[]> => {
  if (!useSupabase()) return localStorageApi.getCategories();
  const { data, error } = await supabase.from('categories').select('name').order('name');
  if (error) {
     console.error("Error fetching categories from Supabase, falling back to local:", error);
     return localStorageApi.getCategories();
  }
  return (data || []).map(c => c.name);
};

// Fix for missing saveCategory in Inventory.tsx
export const saveCategory = async (category: string) => {
  if (!useSupabase()) {
    localStorageApi.saveCategory(category);
    await logAuditAction('CREATE', 'categories', category, category, null, { name: category });
    return;
  }
  
  const { data: existing } = await supabase.from('categories').select('*').eq('name', category).maybeSingle();
  if (!existing) {
    const { data: inserted, error } = await supabase.from('categories').insert([{ name: category }]).select().single();
    if (error) throw error;
    if (inserted) await logAuditAction('CREATE', 'categories', inserted.id, inserted.name, null, { name: category });
  }
};
