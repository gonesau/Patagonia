import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Vago } from "@/types/vago.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";

export const inscripcionesService = {
  async listByTour(tourId: string): Promise<Inscripcion[]> {
    const ref = collection(db, "tours", tourId, "inscripciones");
    const snapshot = await getDocs(query(ref, orderBy("inscritoEn", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Inscripcion);
  },
  async createForTour(tourId: string, vago: Vago, montoTotal: number, userId: string): Promise<void> {
    const ref = collection(db, "tours", tourId, "inscripciones");
    const duplicate = await getDocs(query(ref, where("vagoId", "==", vago.id), limit(1)));
    if (!duplicate.empty) {
      throw new ServiceError("El vago ya está inscrito en esta ocurrencia.");
    }
    await addDoc(ref, {
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
  },
  async updatePaymentState(
    tourId: string,
    inscripcionId: string,
    montoPagado: number,
    estadoPago: Inscripcion["estadoPago"],
  ): Promise<void> {
    await updateDoc(doc(db, "tours", tourId, "inscripciones", inscripcionId), { montoPagado, estadoPago });
  },
};
