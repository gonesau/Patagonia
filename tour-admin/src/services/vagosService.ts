import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  doc,
  getDoc,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { Vago } from "@/types/vago.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";
import { DEFAULT_PAGE_SIZE, type PaginatedResult } from "./pagination";

const vagosCollection = collection(db, "vagos");
const SEARCH_PREFIXES_LIMIT = 40;

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildSearchPrefixes(data: Pick<Vago, "nombre" | "apellido" | "email" | "telefono">): string[] {
  const base = [data.nombre, data.apellido, data.email, data.telefono]
    .map(normalizeSearchText)
    .filter(Boolean);
  const prefixes = new Set<string>();
  for (const item of base) {
    for (let index = 1; index <= item.length; index += 1) {
      prefixes.add(item.slice(0, index));
      if (prefixes.size >= SEARCH_PREFIXES_LIMIT) {
        return Array.from(prefixes);
      }
    }
  }
  return Array.from(prefixes);
}

async function ensureUniqueEmail(email: string, excludeId?: string): Promise<void> {
  const emailQuery = query(vagosCollection, where("email", "==", email), limit(1));
  const snapshot = await getDocs(emailQuery);
  const first = snapshot.docs[0];
  if (first && first.id !== excludeId) {
    throw new ServiceError("Ya existe un vago registrado con ese correo.");
  }
}

export const vagosService = {
  async list(searchTerm = ""): Promise<Vago[]> {
    const page = await this.listPage({ searchTerm, pageSize: 100 });
    return page.items;
  },

  async create(data: Omit<Vago, "id" | "creadoEn">): Promise<void> {
    await ensureUniqueEmail(data.email);
    await addDoc(vagosCollection, {
      ...data,
      searchPrefixes: buildSearchPrefixes(data),
      creadoEn: serverTimestamp(),
    });
  },

  async update(vagoId: string, data: Partial<Vago>): Promise<void> {
    if (data.email) {
      await ensureUniqueEmail(data.email, vagoId);
    }
    const vagoRef = doc(db, "vagos", vagoId);
    const patchData: Partial<Vago> & { searchPrefixes?: string[] } = { ...data };
    if (data.nombre || data.apellido || data.email || data.telefono) {
      const snapshot = await getDoc(vagoRef);
      const currentData = snapshot.exists() ? (snapshot.data() as Vago) : undefined;
      if (currentData) {
        patchData.searchPrefixes = buildSearchPrefixes({
          nombre: data.nombre ?? currentData.nombre,
          apellido: data.apellido ?? currentData.apellido,
          email: data.email ?? currentData.email,
          telefono: data.telefono ?? currentData.telefono,
        });
      }
    }
    await updateDoc(vagoRef, patchData);
  },
  async listPage(options: {
    searchTerm?: string;
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData>;
    nivelExperienciaId?: string;
  }): Promise<PaginatedResult<Vago>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const normalizedTerm = normalizeSearchText(options.searchTerm ?? "");
    const constraints: QueryConstraint[] = [];
    if (normalizedTerm) {
      constraints.push(where("searchPrefixes", "array-contains", normalizedTerm));
    } else if (options.nivelExperienciaId) {
      constraints.push(where("nivelExperienciaId", "==", options.nivelExperienciaId));
    }
    constraints.push(orderBy("creadoEn", "desc"));
    if (options.cursor) {
      constraints.push(startAfter(options.cursor));
    }
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(vagosCollection, ...constraints));
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Vago);
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
