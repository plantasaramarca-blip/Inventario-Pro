
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

  let summary = '';
  if (action === 'CREATE') summary = `Creó nuevo registro en ${tableName}: ${recordName}`;
  else if (action === 'DELETE') summary = `Eliminó registro de ${tableName}: ${recordName}`;
  else if (action === 'UPDATE' && oldValues && newValues) {
    const changes: string[] = [];
    const keys = Object.keys(newValues);
    keys.forEach(key => {
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

export const getProducts = async (): Promise<Product[]> => {
  if (!useSupabase()) return localStorageApi.getProducts();
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) {
    console.error('Error obteniendo productos:', error);
    return [];
  }
  return (data || []).map(p => ({
    id: p.id, code: p.code, name: p.name, category: p.category, location: p.location, 
    stock: p.stock || 0, minStock: p.min_stock ?? 30, criticalStock: p.critical_stock ?? 10,
    price: Number(p.precio_compra || p.price) || 0,
    purchasePrice: Number(p.precio_compra || p.price) || 0,
    salePrice: p.precio_venta ? Number(p.precio_venta) : undefined,
    currency: p.moneda || 'PEN',
    unit: p.unit || 'und', imageUrl: p.image_url, updatedAt: p.updated_at,
    qr_code: p.qr_code
  }));
};

export const getProductById = async (id: string): Promise<Product | null> => {
  if (!useSupabase()) {
    const p = localStorageApi.getProducts().find(x => x.id === id);
    return p || null;
  }
  const { data } = await supabase.from('products').select('*').eq('id', id).single();
  if (!data) return null;
  return {
    id: data.id, code: data.code, name: data.name, category: data.category, location: data.location, 
    stock: data.stock || 0, minStock: data.min_stock ?? 30, criticalStock: data.critical_stock ?? 10,
    price: Number(data.precio_compra || data.price) || 0,
    purchasePrice: Number(data.precio_compra || data.price) || 0,
    salePrice: data.precio_venta ? Number(data.precio_venta) : undefined,
    currency: data.moneda || 'PEN',
    unit: data.unit || 'und', imageUrl: data.image_url, updatedAt: data.updated_at,
    qr_code: data.qr_code
  };
};

export const getDestinos = async (): Promise<Destination[]> => {
  if (!useSupabase()) return localStorageApi.getDestinos();
  const { data } = await supabase.from('destinos').select('*').order('nombre');
  return (data || []).map(d => ({
    id: d.id, name: d.nombre, type: d.tipo, description: d.descripcion, active: d.activo, createdAt: d.created_at
  }));
};

export const saveDestino = async (destino: Partial<Destination>) => {
  if (!useSupabase()) {
    const id = destino.id || crypto.randomUUID();
    const d = { ...destino, id, createdAt: destino.createdAt || new Date().toISOString(), active: destino.active ?? true } as Destination;
    localStorageApi.saveDestino(d);
    return;
  }
  const payload = { nombre: destino.name, tipo: destino.type, descripcion: destino.description, activo: destino.active };
  if (destino.id) await supabase.from('destinos').update(payload).eq('id', destino.id);
  else await supabase.from('destinos').insert([payload]);
};

export const deleteDestino = async (id: string) => {
  if (!useSupabase()) {
    localStorageApi.deleteDestino(id);
    return;
  }
  
  const { data: movements, error: checkError } = await supabase
    .from('movements')
    .select('id')
    .eq('destino_id', id)
    .limit(1);
    
  if (checkError) throw checkError;
  
  if (movements && movements.length > 0) {
    throw new Error('No se puede eliminar este destino porque tiene movimientos registrados. Puede desactivarlo en su lugar.');
  }

  const { error } = await supabase.from('destinos').delete().eq('id', id);
  if (error) {
    console.error('Error eliminando destino:', error);
    throw error;
  }
};

export const saveProduct = async (product: Partial<Product>) => {
  if (!useSupabase()) {
    const id = product.id || crypto.randomUUID();
    let qr = product.qr_code;
    if (!qr) {
       const existing = localStorageApi.getProducts();
       const nextNum = existing.length + 1;
       qr = `PROD-${String(nextNum).padStart(6, '0')}`;
    }
    const p = { 
      ...product, id, qr_code: qr,
      purchasePrice: product.purchasePrice ?? product.price ?? 0,
      price: product.purchasePrice ?? product.price ?? 0,
      minStock: product.minStock ?? 30, criticalStock: product.criticalStock ?? 10,
      updatedAt: new Date().toISOString() 
    } as Product;
    const old = product.id ? localStorageApi.getProducts().find(x => x.id === product.id) : null;
    localStorageApi.saveProduct(p);
    await logAuditAction(product.id ? 'UPDATE' : 'CREATE', 'products', id, p.name, old, p);
    return;
  }

  let qrCode = product.qr_code;
  if (!product.id && !qrCode) {
    try {
      // Intentamos obtener el último QR. Si falla (400), asumimos que es el primero.
      const { data: lastProd, error: fetchError } = await supabase
        .from('products')
        .select('qr_code')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.warn('No se pudo leer el último QR (Error 400). ¿Ejecutó el SQL en Supabase?', fetchError.message);
      }

      let nextNum = 1;
      if (lastProd?.qr_code) {
        const match = lastProd.qr_code.match(/PROD-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      qrCode = `PROD-${String(nextNum).padStart(6, '0')}`;
      console.log('Generado nuevo QR:', qrCode);
    } catch (err) {
      console.error('Error fatal al generar QR:', err);
      qrCode = `PROD-000001`; // Fallback de emergencia
    }
  }

  const payload: any = {
    code: product.code, name: product.name, category: product.category,
    location: product.location, stock: product.stock, min_stock: product.minStock ?? 30,
    critical_stock: product.criticalStock ?? 10, precio_compra: product.purchasePrice,
    precio_venta: product.salePrice, moneda: product.currency || 'PEN',
    unit: product.unit, image_url: product.imageUrl, updated_at: new Date().toISOString(),
    qr_code: qrCode
  };

  if (product.id) {
    const { data: old } = await supabase.from('products').select('*').eq('id', product.id).single();
    const { error } = await supabase.from('products').update(payload).eq('id', product.id);
    if (error) throw error;
    await logAuditAction('UPDATE', 'products', product.id, product.name || 'n/a', old, payload);
  } else {
    const { data: inserted, error } = await supabase.from('products').insert([payload]).select().single();
    if (error) {
      console.error('Error al insertar producto (Error 400). Verifique si las columnas existen en Supabase.', error);
      throw error;
    }
    if (inserted) await logAuditAction('CREATE', 'products', inserted.id, inserted.name, null, payload);
  }
};

export const registerMovement = async (movement: any) => {
  if (!useSupabase()) {
    const m = localStorageApi.registerMovement(movement);
    if (movement.updatedPrice) {
      const prods = localStorageApi.getProducts();
      const idx = prods.findIndex(p => p.id === movement.productId);
      if (idx !== -1) {
        prods[idx].purchasePrice = movement.updatedPrice;
        prods[idx].price = movement.updatedPrice;
        localStorageApi.saveProduct(prods[idx]);
      }
    }
    await logAuditAction('CREATE', 'movements', m.id, `${m.type} - ${m.productName}`, null, m);
    return;
  }
  const { data: product, error: pError } = await supabase.from('products').select('name, stock, precio_compra').eq('id', movement.productId).single();
  if (pError || !product) throw new Error("Producto no encontrado");

  let newStock = product.stock + (movement.type === 'INGRESO' ? movement.quantity : -movement.quantity);
  if (movement.type === 'SALIDA' && product.stock < movement.quantity) throw new Error("Stock insuficiente");

  const productUpdate: any = { stock: newStock };
  if (movement.updatedPrice && movement.type === 'INGRESO') productUpdate.precio_compra = movement.updatedPrice;
  await supabase.from('products').update(productUpdate).eq('id', movement.productId);
  
  const payload = {
    product_id: movement.productId, product_name: product.name, type: movement.type,
    quantity: movement.quantity, dispatcher: movement.dispatcher, reason: movement.reason,
    balance_after: newStock, contact_id: movement.contactId, contact_name: movement.contactName,
    destino_id: movement.destinationId,
    destino_nombre: movement.destinationName, 
    tipo_destino: movement.destinationType,
    date: new Date().toISOString()
  };
  const { data: inserted } = await supabase.from('movements').insert([payload]).select().single();
  if (inserted) await logAuditAction('CREATE', 'movements', inserted.id, `${movement.type} - ${product.name}`, null, payload);
};

export const getStats = async (): Promise<InventoryStats> => {
  if (!useSupabase()) return localStorageApi.getStats();
  const [products, movements, contacts] = await Promise.all([getProducts(), getMovements(), getContacts()]);
  const critical = products.filter(p => p.stock > 0 && p.stock <= p.criticalStock).length;
  const low = products.filter(p => p.stock > p.criticalStock && p.stock <= p.minStock).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.purchasePrice || 0)), 0);
  return {
    totalProducts: products.length, lowStockCount: low, criticalStockCount: critical,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length, totalContacts: contacts.length, totalValue: totalValue
  };
};

export const getMovements = async (): Promise<Movement[]> => {
  if (!useSupabase()) return localStorageApi.getMovements();
  const { data } = await supabase.from('movements').select('*').order('date', { ascending: false });
  return (data || []).map(m => ({
    id: m.id, productId: m.product_id, productName: m.product_name,
    type: m.type, quantity: m.quantity, date: m.date,
    dispatcher: m.dispatcher, reason: m.reason, balanceAfter: m.balance_after,
    contactId: m.contact_id, contactName: m.contact_name,
    destinationId: m.destino_id,
    destinationName: m.destino_nombre || m.destino, 
    destinationType: m.tipo_destino
  }));
};

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
    localStorageApi.saveContact(c);
    return;
  }
  const payload = { name: contact.name, type: contact.type, phone: contact.phone, email: contact.email, tax_id: contact.taxId };
  if (contact.id) await supabase.from('contacts').update(payload).eq('id', contact.id);
  else await supabase.from('contacts').insert([payload]);
};

export const deleteContact = async (id: string) => {
  if (!useSupabase()) {
    localStorageApi.deleteContact(id);
    return;
  }
  await supabase.from('contacts').delete().eq('id', id);
};

export const getCategories = async (): Promise<string[]> => {
  if (!useSupabase()) return localStorageApi.getCategories();
  const { data } = await supabase.from('categories').select('name').order('name');
  return (data || []).map(c => c.name);
};

export const saveCategory = async (category: string) => {
  if (!useSupabase()) { localStorageApi.saveCategory(category); return; }
  await supabase.from('categories').insert([{ name: category }]);
};
