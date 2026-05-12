import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  limit,
  type QueryConstraint,
} from "firebase/firestore";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Vago } from "@/types/vago.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

export const inscripcionesService = {
  async countActivas(tourId: string): Promise<number> {
    const ref = collection(db, "tours", tourId, "inscripciones");
    const snapshot = await getCountFromServer(query(ref, where("estado", "!=", "cancelado")));
    return snapshot.data().count;
  },

  async listByTour(tourId: string): Promise<Inscripcion[]> {
    const ref = collection(db, "tours", tourId, "inscripciones");
    const snapshot = await getDocs(query(ref, orderBy("inscritoEn", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Inscripcion);
  },
  async createForTour(
    tourId: string,
    vago: Vago,
    montoTotal: number,
    userId: string,
    cupoMaximo: number,
  ): Promise<string> {
    const ref = collection(db, "tours", tourId, "inscripciones");
    const activas = await this.countActivas(tourId);
    if (activas >= cupoMaximo) {
      throw new ServiceError("No hay cupos disponibles para esta ocurrencia.");
    }
    const duplicate = await getDocs(query(ref, where("vagoId", "==", vago.id), limit(1)));
    if (!duplicate.empty) {
      throw new ServiceError("El vago ya está inscrito en esta ocurrencia.");
    }
    const created = await addDoc(ref, {
      vagoId: vago.id,
      vagoNombre: `${vago.nombre} ${vago.apellido}`,
      vagoEmail: vago.email,
      vagoTelefono: vago.telefono,
      estado: "inscrito",
      montoTotal,
      montoPagado: 0,
      estadoPago: "pendiente",
      inscritoEn: serverTimestamp(),
      inscritoPor: userId,
    });
    return created.id;
  },
  async updatePaymentState(
    tourId: string,
    inscripcionId: string,
    montoPagado: number,
    estadoPago: Inscripcion["estadoPago"],
  ): Promise<void> {
    await updateDoc(doc(db, "tours", tourId, "inscripciones", inscripcionId), { montoPagado, estadoPago });
  },
  async listPageByTour(tourId: string, options: PaginationParams = {}): Promise<PaginatedResult<Inscripcion>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const ref = collection(db, "tours", tourId, "inscripciones");
    const constraints: QueryConstraint[] = [orderBy("inscritoEn", "desc"), queryLimit(pageSize)];
    if (options.cursor) {
      constraints.splice(1, 0, startAfter(options.cursor));
    }
    const snapshot = await getDocs(query(ref, ...constraints));
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Inscripcion);
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
