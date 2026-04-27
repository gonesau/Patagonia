import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  getDoc,
  where,
} from "firebase/firestore";
import type { Pago } from "@/types/pago.types";
import { db } from "./firebase";
import { inscripcionesService } from "./inscripcionesService";
import type { Inscripcion } from "@/types/inscripcion.types";

export const pagosService = {
  async listByTour(tourId: string): Promise<Pago[]> {
    const pagosCollection = collection(db, "pagos");
    const snapshot = await getDocs(query(pagosCollection, where("tourId", "==", tourId)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Pago);
  },
  async create(data: Omit<Pago, "id">): Promise<void> {
    await addDoc(collection(db, "pagos"), {
      ...data,
      creadoEn: serverTimestamp(),
    });
    const inscripcionRef = doc(db, "tours", data.tourId, "inscripciones", data.inscripcionId);
    const inscripcionSnapshot = await getDoc(inscripcionRef);
    if (!inscripcionSnapshot.exists()) {
      return;
    }
    const currentInscripcion = { id: inscripcionSnapshot.id, ...inscripcionSnapshot.data() } as Inscripcion;
    const allPayments = await this.listByTour(data.tourId);
    const paidAmount = allPayments
      .filter((item) => item.inscripcionId === data.inscripcionId)
      .reduce((total, item) => total + item.monto, 0);

    const paymentState: Inscripcion["estadoPago"] =
      paidAmount <= 0 ? "pendiente" : paidAmount < currentInscripcion.montoTotal ? "parcial" : "completo";

    await inscripcionesService.updatePaymentState(data.tourId, data.inscripcionId, paidAmount, paymentState);
  },
};
