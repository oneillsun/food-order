// Capa de datos para los pedidos.
//
// - En Vercel (producción), el sistema de archivos de las funciones serverless
//   es efectivamente de solo lectura y no persiste entre invocaciones, así que
//   usamos Vercel Blob para guardar orders.json de forma duradera.
// - En desarrollo local, si no hay token de Blob configurado, caemos a un
//   archivo JSON real en disco (data/orders.json), tal como se pidió.
//
// La detección es automática: si existe BLOB_READ_WRITE_TOKEN (Vercel lo
// inyecta solo cuando conectas un Blob Store al proyecto) se usa Blob; si no,
// se usa el archivo local.
import { list, put } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

const BLOB_PATHNAME = "orders.json";
const LOCAL_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(LOCAL_DIR, "orders.json");

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
// En Vercel el filesystem es de solo lectura: sin Blob configurado, el
// fallback local fallaría de forma confusa. Lo detectamos temprano y damos
// un mensaje claro en vez de un error de escritura genérico.
const runningOnVercelWithoutBlob = Boolean(process.env.VERCEL) && !useBlob;

function assertStorageConfigured() {
  if (runningOnVercelWithoutBlob) {
    throw new Error(
      "Falta conectar Vercel Blob: ve al proyecto en vercel.com → Storage → " +
        "Create Database → Blob, conéctalo a este proyecto y vuelve a desplegar."
    );
  }
}

async function readFromBlob() {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 10 });
  const match = blobs.find((b) => b.pathname === BLOB_PATHNAME);
  if (!match) return [];
  const res = await fetch(match.url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function writeToBlob(orders) {
  await put(BLOB_PATHNAME, JSON.stringify(orders, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readFromLocal() {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeToLocal(orders) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

export async function getOrders() {
  assertStorageConfigured();
  return useBlob ? readFromBlob() : readFromLocal();
}

export async function saveOrders(orders) {
  assertStorageConfigured();
  return useBlob ? writeToBlob(orders) : writeToLocal(orders);
}

export function isUsingBlob() {
  return useBlob;
}
