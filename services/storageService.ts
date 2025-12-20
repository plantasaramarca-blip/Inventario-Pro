import { Product, Movement, InventoryStats, Contact } from '../types';

const PRODUCTS_KEY = 'kardex_products';
const MOVEMENTS_KEY = 'kardex_movements';
const CONTACTS_KEY = 'kardex_contacts';
const CATEGORIES_KEY = 'kardex_categories';

// Helper to simulate initial data if empty
const seedData = () => {
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    const categories = ['Tecnología', 'Oficina', 'Impresión', 'Limpieza', 'Otros'];
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }

  if (!localStorage.getItem(PRODUCTS_KEY)) {
    const products: Product[] = [
      { id: '1', code: 'P001', name: 'Laptop Dell Latitude', category: 'Tecnología', location: 'Estante A-1', stock: 15, minStock: 5, unit: 'und', updatedAt: new Date().toISOString() },
      { id: '2', code: 'P002', name: 'Papel Bond A4', category: 'Oficina', location: 'Pasillo 2', stock: 3, minStock: 10, unit: 'pqte', updatedAt: new Date().toISOString() },
      { id: '3', code: 'P003', name: 'Toner HP 85A', category: 'Impresión', location: 'Almacén Central', stock: 0, minStock: 2, unit: 'und', updatedAt: new Date().toISOString() },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }
  if (!localStorage.getItem(MOVEMENTS_KEY)) {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(CONTACTS_KEY)) {
    const contacts: Contact[] = [
      { id: '1', name: 'Distribuidora Global S.A.', type: 'PROVEEDOR', taxId: '201001001', email: 'ventas@global.com' },
      { id: '2', name: 'Juan Perez (Cliente Final)', type: 'CLIENTE', taxId: '10405060', phone: '999888777' },
      { id: '3', name: 'Tech Solutions Ltd', type: 'PROVEEDOR', taxId: '205556667', email: 'contacto@techsol.com' },
    ];
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  }
};

// --- CATEGORIES ---
export const getCategories = (): string[] => {
  seedData();
  const data = localStorage.getItem(CATEGORIES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveCategory = (category: string): void => {
  const categories = getCategories();
  if (!categories.includes(category)) {
    categories.push(category);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }
};

// --- PRODUCTS ---
export const getProducts = (): Product[] => {
  seedData();
  const data = localStorage.getItem(PRODUCTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProduct = (product: Product): void => {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.id === product.id);
  
  if (existingIndex >= 0) {
    products[existingIndex] = product;
  } else {
    products.push(product);
  }
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const deleteProduct = (id: string): void => {
  const products = getProducts().filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// --- CONTACTS ---
export const getContacts = (): Contact[] => {
  seedData();
  const data = localStorage.getItem(CONTACTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveContact = (contact: Contact): void => {
  const contacts = getContacts();
  const existingIndex = contacts.findIndex(c => c.id === contact.id);
  
  if (existingIndex >= 0) {
    contacts[existingIndex] = contact;
  } else {
    contacts.push(contact);
  }
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
};

export const deleteContact = (id: string): void => {
  const contacts = getContacts().filter(c => c.id !== id);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
};

// --- MOVEMENTS ---
export const getMovements = (): Movement[] => {
  seedData();
  const data = localStorage.getItem(MOVEMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const registerMovement = (movement: Omit<Movement, 'id' | 'balanceAfter' | 'productName'>): Movement => {
  const products = getProducts();
  const productIndex = products.findIndex(p => p.id === movement.productId);
  
  if (productIndex === -1) throw new Error("Producto no encontrado");

  const product = products[productIndex];
  let newStock = product.stock;

  if (movement.type === 'INGRESO') {
    newStock += movement.quantity;
  } else {
    if (product.stock < movement.quantity) {
      throw new Error("Stock insuficiente para realizar esta salida.");
    }
    newStock -= movement.quantity;
  }

  // Update Product
  product.stock = newStock;
  product.updatedAt = new Date().toISOString();
  products[productIndex] = product;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

  // Create Record
  const newMovement: Movement = {
    ...movement,
    id: Date.now().toString(),
    productName: product.name,
    balanceAfter: newStock,
  };

  const movements = getMovements();
  movements.unshift(newMovement); // Add to top
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));

  return newMovement;
};

export const getStats = (): InventoryStats => {
  const products = getProducts();
  const movements = getMovements();
  const contacts = getContacts();
  
  return {
    totalProducts: products.length,
    lowStockCount: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length,
    totalContacts: contacts.length
  };
};