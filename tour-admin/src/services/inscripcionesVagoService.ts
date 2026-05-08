import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import type { Inscripcion } from "@/types/inscripcion.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

export interface InscripcionConTourId {
  tourId: string;
  inscripcion: Inscripcion;
}

export const inscripcionesVagoService = {
  async listByVagoId(vagoId: string): Promise<InscripcionConTourId[]> {
    const snapshot = await getDocs(query(collectionGroup(db, "inscripciones"), where("vagoId", "==", vagoId)));
    const results: InscripcionConTourId[] = [];
    for (const docSnap of snapshot.docs) {
      const tourRef = docSnap.ref.parent.parent;
      if (!tourRef) {
        continue;
      }
      const data = timestampToDate({ id: docSnap.id, ...docSnap.data() } as Record<string, unknown>) as unknown as Inscripcion;
      results.push({ tourId: tourRef.id, inscripcion: data });
    }
    return results.sort((a, b) => {
      const ta = a.inscripcion.inscritoEn ? new Date(a.inscripcion.inscritoEn).getTime() : 0;
      const tb = b.inscripcion.inscritoEn ? new Date(b.inscripcion.inscritoEn).getTime() : 0;
      return tb - ta;
    });
  },
};
