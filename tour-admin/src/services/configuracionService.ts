import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { ConfiguracionGlobal } from "@/types/config.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

const CONFIG_DOC_ID = "global";

const defaults: Omit<ConfiguracionGlobal, "id"> = {
  nombreEmpresa: "Patagonia Tours",
};

export const configuracionService = {
  async get(): Promise<ConfiguracionGlobal> {
    const snapshot = await getDoc(doc(db, "configuracion", CONFIG_DOC_ID));
    if (!snapshot.exists()) {
      return { id: CONFIG_DOC_ID, ...defaults };
    }
    const data = timestampToDate({ id: snapshot.id, ...snapshot.data() } as Record<string, unknown>) as unknown;
    return data as ConfiguracionGlobal;
  },

  async save(data: Partial<Omit<ConfiguracionGlobal, "id">>): Promise<void> {
    await setDoc(
      doc(db, "configuracion", CONFIG_DOC_ID),
      {
        ...data,
        actualizadoEn: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
