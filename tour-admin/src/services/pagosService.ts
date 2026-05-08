import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
  startAfter,
  type QueryConstraint,
  where,
} from "firebase/firestore";
import type { Pago } from "@/types/pago.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";
import { inscripcionesService } from "./inscripcionesService";
import type { Inscripcion } from "@/types/inscripcion.types";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

export const pagosService = {
  async listBetweenFechas(inicio: Date, fin: Date): Promise<Pago[]> {
    const snapshot = await getDocs(
      query(
        collection(db, "pagos"),
        where("fecha", ">=", Timestamp.fromDate(inicio)),
        where("fecha", "<=", Timestamp.fromDate(fin)),
      ),
    );
    return snapshot.docs.map(
      (item) => timestampToDate({ id: item.id, ...item.data() } as Record<string, unknown>) as unknown as Pago,
    );
  },
  async listByTour(tourId: string): Promise<Pago[]> {
    const pagosCollection = collection(db, "pagos");
    const snapshot = await getDocs(query(pagosCollection, where("tourId", "==", tourId)));
    return snapshot.docs.map((item) => timestampToDate({ id: item.id, ...item.data() } as Record<string, unknown>) as unknown as Pago);
  },
  async create(data: Omit<Pago, "id">): Promise<void> {
    await addDoc(collection(db, "pagos"), {
      ...data,
      registradoPor: data.registradoPor ?? "sistema",
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
  async listPageByTour(tourId: string, options: PaginationParams = {}): Promise<PaginatedResult<Pago>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const pagosCollection = collection(db, "pagos");
    const constraints: QueryConstraint[] = [where("tourId", "==", tourId), orderBy("fecha", "desc"), limit(pageSize)];
    if (options.cursor) {
      constraints.splice(2, 0, startAfter(options.cursor));
    }
    const snapshot = await getDocs(query(pagosCollection, ...constraints));
    const items = snapshot.docs.map((item) =>
      timestampToDate({ id: item.id, ...item.data() } as Record<string, unknown>) as unknown as Pago,
    );
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
