# 📦 Kardex Pro - Sistema de Inventario Inteligente

Sistema profesional de gestión de inventarios y CRM desarrollado con **React**, **Tailwind CSS** y **Supabase**. Diseñado para el control eficiente de stock, movimientos de mercancía (Kardex) y gestión de contactos.

## 🚀 Características principales

- **Panel de Control (Dashboard):** Visualización en tiempo real de stock crítico, productos bajos y estadísticas generales con gráficos dinámicos.
- **Gestión de Inventario:** Registro completo de productos con soporte para imágenes (Supabase Storage), categorías personalizadas y ubicación en almacén.
- **Sistema de Kardex:** Historial detallado de ingresos y salidas, identificando quién despachó y el motivo del movimiento.
- **Control de Stock Semáforo:** Indicadores visuales automáticos para stock disponible, bajo o agotado.
- **CRM Integrado:** Agenda de clientes y proveedores vinculada a los movimientos de almacén.
- **Seguridad:** Autenticación de usuarios y protección de rutas mediante Supabase Auth.

## 🛠️ Tecnologías utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS.
- **Iconografía:** Lucide React.
- **Gráficos:** Recharts.
- **Backend/Base de Datos:** Supabase (PostgreSQL).
- **Almacenamiento:** Supabase Storage (para fotos de productos).

## ⚙️ Configuración del Entorno

Para ejecutar este proyecto localmente o desplegarlo en Vercel, asegúrate de configurar las siguientes variables de entorno:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anon_publica
```

## 📋 Estructura de la Base de Datos (SQL)

El sistema requiere las siguientes tablas en Supabase:
- `products`: Almacena el catálogo de ítems.
- `movements`: Registro de transacciones (Kardex).
- `contacts`: Directorio de clientes/proveedores.
- `categories`: Clasificación de productos.

---
Desarrollado para optimización de procesos logísticos.