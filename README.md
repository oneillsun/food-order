# Pedidos de Comidas

App web responsive para gestionar pedidos de empanadas y arepas por encargo:
control por fecha, cliente y cantidad, con dashboard de totales por día y
estatus de cada pedido (Pendiente, Pagado).

## Reglas del negocio

- **Empanada** → combo de **3** unidades.
- **Arepa** → combo de **2** unidades.
- Sabores disponibles (uno por unidad del combo): Molida, Pollo, Queso,
  Carne con queso, Queso con tocineta.
- Estatus de un pedido: Pendiente → Pagado.

## Cómo se guardan los datos

Cada pedido se guarda en su propio archivo, identificado por su id
(`orders/<id>.json`), en vez de un único archivo compartido entre todos los
pedidos. Así, crear un pedido nunca puede pisar el de otro pedido creado casi
al mismo tiempo (dos pestañas abiertas, un reintento tras un timeout, etc.).

- **En tu computador (desarrollo):** si no configuras nada, cada pedido se
  guarda como un archivo JSON dentro de `data/orders/` en el proyecto.
- **En Vercel (producción):** el sistema de archivos de Vercel es de solo
  lectura para las funciones que atienden tus peticiones, así que esos
  archivos locales **no persistirían** ahí. Por eso, en producción la app usa
  automáticamente **Vercel Blob** (plan gratis) para guardar cada pedido de
  forma duradera, leyendo siempre la versión más reciente (sin caché de CDN)
  para evitar datos desactualizados justo después de guardar.

La app detecta sola cuál usar: si existe la variable de entorno
`BLOB_READ_WRITE_TOKEN`, usa Blob; si no, usa los archivos locales.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Los pedidos quedarán en `data/orders/`
(no se sube a git).

## Publicar en Vercel (gratis)

1. Sube este proyecto a un repositorio de GitHub.
2. En https://vercel.com, "Add New Project" e importa el repo. Vercel
   detecta Next.js automáticamente, no hay que tocar nada.
3. **Antes o después del primer deploy**, entra al proyecto en Vercel →
   pestaña **Storage** → **Create Database** → **Blob** → conéctalo al
   proyecto. Esto crea la variable `BLOB_READ_WRITE_TOKEN` automáticamente.
4. Vuelve a desplegar (o el primer deploy ya la tomará si conectaste el
   Blob Store antes). Listo: los pedidos ahora persisten en producción.

Si en algún momento quieres probar el modo Blob desde tu computador:

```bash
vercel env pull .env.local
```

Esto trae la variable `BLOB_READ_WRITE_TOKEN` a tu entorno local.

## Estructura relevante

- `lib/constants.js` — catálogo de sabores, tipos de comida, tamaños de
  combo y estatus.
- `lib/orders-store.js` — capa de datos, un archivo por pedido (Blob en
  producción, JSON local en desarrollo).
- `app/api/orders/route.js` — listar (`GET`, con filtro `?fecha=`) y crear
  (`POST`) pedidos.
- `app/api/orders/[id]/route.js` — cambiar estatus (`PATCH`) y eliminar
  (`DELETE`) un pedido.
- `components/Dashboard.jsx` — dashboard por fecha (totales, sabores,
  estatus, detalle de pedidos).
- `components/OrderForm.jsx` — formulario de nuevo pedido.
