import { collection, getDocs, query, where } from "firebase/firestore";
import type { NotificacionRegistro } from "@/types/notificacion.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

export const notificacionesFirestoreService = {
  async listByTour(tourId: string): Promise<NotificacionRegistro[]> {
    const snapshot = await getDocs(query(collection(db, "notificaciones"), where("tourId", "==", tourId)));
    const items = snapshot.docs.map((item) => timestampToDate({ id: item.id, ...item.data() }) as NotificacionRegistro);
    return items.sort((a, b) => {
      const ta = a.enviadaEn ? new Date(a.enviadaEn).getTime() : 0;
      const tb = b.enviadaEn ? new Date(b.enviadaEn).getTime() : 0;
      return tb - ta;
    });
  },
};
