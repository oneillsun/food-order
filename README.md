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

- **En tu computador (desarrollo):** si no configuras nada, los pedidos se
  guardan en el archivo `data/orders.json` dentro del proyecto, tal como se
  pidió originalmente.
- **En Vercel (producción):** el sistema de archivos de Vercel es de solo
  lectura para las funciones que atienden tus peticiones, así que un
  `orders.json` local **no persistiría** ahí. Por eso, en producción la app
  usa automáticamente **Vercel Blob** (plan gratis) para guardar ese mismo
  `orders.json` de forma duradera. El cambio es transparente: mismo formato
  de datos, solo cambia dónde vive el archivo.

La app detecta sola cuál usar: si existe la variable de entorno
`BLOB_READ_WRITE_TOKEN`, usa Blob; si no, usa el archivo local.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Los pedidos quedarán en `data/orders.json`
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
- `lib/orders-store.js` — capa de datos (Blob en producción, JSON local en
  desarrollo).
- `app/api/orders/route.js` — listar (`GET`, con filtro `?fecha=`) y crear
  (`POST`) pedidos.
- `app/api/orders/[id]/route.js` — cambiar estatus (`PATCH`) y eliminar
  (`DELETE`) un pedido.
- `components/Dashboard.jsx` — dashboard por fecha (totales, sabores,
  estatus, detalle de pedidos).
- `components/OrderForm.jsx` — formulario de nuevo pedido.
