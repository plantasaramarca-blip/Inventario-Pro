
import { supabase } from '../supabaseClient';
import { Product, Movement, Contact, InventoryStats } from '../types';

export const getCategories = async (): Promise<string[]> => {
  const { data } = await supabase.from('categories').select('name').order('name');
  return data?.map(c => c.name) || [];
};

export const saveCategory = async (name: string) => {
  await supabase.from('categories').upsert({ name });
};

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await supabase.from('products').select('*').order('name');
  return (data || []).map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    category: p.category,
    location: p.location,
    stock: p.stock,
    minStock: p.min_stock,
    unit: p.unit,
    imageUrl: p.image_url,
    updatedAt: p.updated_at
  }));
};

export const saveProduct = async (product: Partial<Product>) => {
  const payload = {
    code: product.code,
    name: product.name,
    category: product.category,
    location: product.location,
    stock: product.stock,
    min_stock: product.minStock,
    unit: product.unit,
    image_url: product.imageUrl,
    updated_at: new Date().toISOString()
  };

  if (product.id) {
    await supabase.from('products').update(payload).eq('id', product.id);
  } else {
    await supabase.from('products').insert([payload]);
  }
};

export const deleteProduct = async (id: string) => {
  await supabase.from('products').delete().eq('id', id);
};

export const getContacts = async (): Promise<Contact[]> => {
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

export const saveContact = async (contact: Partial<Contact>) => {
  const payload = {
    name: contact.name,
    type: contact.type,
    phone: contact.phone,
    email: contact.email,
    tax_id: contact.taxId
  };
  if (contact.id) {
    await supabase.from('contacts').update(payload).eq('id', contact.id);
  } else {
    await supabase.from('contacts').insert([payload]);
  }
};

export const deleteContact = async (id: string) => {
  await supabase.from('contacts').delete().eq('id', id);
};

export const getMovements = async (): Promise<Movement[]> => {
  const { data } = await supabase.from('movements').select('*').order('date', { ascending: false });
  return (data || []).map(m => ({
    id: m.id,
    productId: m.product_id,
    productName: m.product_name,
    type: m.type,
    quantity: m.quantity,
    date: m.date,
    dispatcher: m.dispatcher,
    reason: m.reason,
    balanceAfter: m.balance_after,
    contactId: m.contact_id,
    contactName: m.contact_name
  }));
};

export const registerMovement = async (movement: any) => {
  const { data: product, error: pError } = await supabase
    .from('products')
    .select('name, stock')
    .eq('id', movement.productId)
    .single();

  if (pError || !product) throw new Error("Producto no encontrado");

  let newStock = product.stock;
  if (movement.type === 'INGRESO') {
    newStock += movement.quantity;
  } else {
    if (product.stock < movement.quantity) throw new Error("Stock insuficiente");
    newStock -= movement.quantity;
  }

  const { error: uError } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', movement.productId);

  if (uError) throw new Error("Error al actualizar el stock");

  const { error: iError } = await supabase.from('movements').insert([{
    product_id: movement.productId,
    product_name: product.name,
    type: movement.type,
    quantity: movement.quantity,
    dispatcher: movement.dispatcher,
    reason: movement.reason,
    balance_after: newStock,
    contact_id: movement.contactId,
    contact_name: movement.contactName
  }]);

  if (iError) throw new Error("Error al registrar movimiento");
};

export const getStats = async (): Promise<InventoryStats> => {
  const [products, movements, contacts] = await Promise.all([
    getProducts(),
    getMovements(),
    getContacts()
  ]);

  return {
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length,
    totalContacts: contacts.length
  };
};

export const uploadProductImage = async (file: File | Blob): Promise<string | null> => {
  const fileExt = file instanceof File ? file.name.split('.').pop() : 'webp';
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `products/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('inventory-images')
    .upload(filePath, file);

  if (uploadError) return null;

  const { data } = supabase.storage.from('inventory-images').getPublicUrl(filePath);
  return data.publicUrl;
};
