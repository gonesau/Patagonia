import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { GuiaDocumento } from "@/types/guiaDocumento.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

export const guiaDocumentosService = {
  async list(guiaId: string): Promise<GuiaDocumento[]> {
    const ref = collection(db, "guias", guiaId, "documentos");
    const snapshot = await getDocs(query(ref, orderBy("subidoEn", "desc")));
    return snapshot.docs.map((item) => timestampToDate({ id: item.id, ...item.data() }) as unknown as GuiaDocumento);
  },

  async create(
    guiaId: string,
    data: Omit<GuiaDocumento, "id" | "subidoEn">,
  ): Promise<void> {
    await addDoc(collection(db, "guias", guiaId, "documentos"), {
      ...data,
      subidoEn: serverTimestamp(),
    });
  },

  async remove(guiaId: string, documentoId: string): Promise<void> {
    await deleteDoc(doc(db, "guias", guiaId, "documentos", documentoId));
  },
};
