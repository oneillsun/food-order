// Traspaso en memoria del pedido recién editado, de OrderForm al Dashboard.
//
// Al editar un pedido, la respuesta del PATCH ya trae el contenido más
// reciente, pero Vercel Blob puede tardar un poco en propagar la
// sobreescritura del mismo archivo (consistencia eventual), así que un
// refetch inmediato desde el Dashboard a veces devuelve la versión vieja.
// En vez de depender de ese refetch, guardamos aquí el pedido ya actualizado
// para que el Dashboard lo aplique directo al volver, sin esperar a Blob.
let pending = null;

export function setPendingOrderUpdate(order) {
  pending = order;
}

export function takePendingOrderUpdate() {
  const order = pending;
  pending = null;
  return order;
}
