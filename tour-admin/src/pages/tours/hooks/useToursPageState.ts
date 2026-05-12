import { useCallback, useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toursService } from "@/services/toursService";
import { plantillasService } from "@/services/plantillasService";
import { guiasService } from "@/services/guiasService";
import { vagosService } from "@/services/vagosService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { pagosService } from "@/services/pagosService";
import { metodosPagoService } from "@/services/metodosPagoService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { TourOcurrencia, TourPlantilla } from "@/types/tour.types";
import type { Guia } from "@/types/guia.types";
import type { Vago } from "@/types/vago.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import type { UsuarioSistema } from "@/types/usuario.types";

const TOURS_PAGE_SIZE = 20;

export interface CreatePagoPayload {
  inscripcionId: string;
  monto: number;
  metodoPagoId: string;
  metodoPagoNombre?: string;
  comprobanteUrl?: string;
  registradoPor: string;
  notas?: string;
}

export interface CreateInscripcionConPagoPayload {
  vago: Vago;
  montoTotal: number;
  userId: string;
  pagoInicial?: {
    monto: number;
    metodoPagoId: string;
    metodoPagoNombre?: string;
    comprobanteUrl?: string;
  };
}

interface UseToursPageStateResult {
  tours: TourOcurrencia[];
  plantillas: TourPlantilla[];
  guias: Guia[];
  vagos: Vago[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  metodosPagoCatalog: MetodoPagoCatalogo[];
  selectedTourId: string;
  errorMessage: string | null;
  hasMoreTours: boolean;
  isLoadingMoreTours: boolean;
  isSubmittingInscripcion: boolean;
  isSubmittingPago: boolean;
  setSelectedTourId: (tourId: string) => void;
  setErrorMessage: (message: string | null) => void;
  reloadTours: () => Promise<void>;
  loadMoreTours: () => Promise<void>;
  createInscripcionConPagoInicial: (payload: CreateInscripcionConPagoPayload) => Promise<boolean>;
  createPago: (payload: CreatePagoPayload) => Promise<boolean>;
  cancelInscripcion: (inscripcionId: string) => Promise<boolean>;
  loadDetailData: (tourId: string) => Promise<void>;
}

function resolveEstadoPago(montoPagado: number, montoTotal: number): Inscripcion["estadoPago"] {
  if (montoPagado <= 0) {
    return "pendiente";
  }
  if (montoPagado >= montoTotal) {
    return "completo";
  }
  return "parcial";
}

export function useToursPageState(profile: UsuarioSistema | null): UseToursPageStateResult {
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [metodosPagoCatalog, setMetodosPagoCatalog] = useState<MetodoPagoCatalogo[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMoreTours, setHasMoreTours] = useState<boolean>(false);
  const [isLoadingMoreTours, setIsLoadingMoreTours] = useState<boolean>(false);
  const [isSubmittingInscripcion, setIsSubmittingInscripcion] = useState<boolean>(false);
  const [isSubmittingPago, setIsSubmittingPago] = useState<boolean>(false);
  const [toursCursor, setToursCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);

  const loadCatalogs = useCallback(async () => {
    if (profile?.rol === "guia") {
      const paymentMethodsData = await metodosPagoService.listActive();
      setPlantillas([]);
      setGuias([]);
      setVagos([]);
      setMetodosPagoCatalog(paymentMethodsData);
      return;
    }
    const [plantillasData, guiasData, vagosData] = await Promise.all([
      plantillasService.listPage({ pageSize: 200 }),
      guiasService.list(),
      vagosService.listPage({ pageSize: 200 }),
    ]);
    setPlantillas(plantillasData.items.filter((item) => item.activa));
    setGuias(guiasData);
    setVagos(vagosData.items.filter((item) => item.activo));
    const paymentMethodsData = await metodosPagoService.listActive();
    setMetodosPagoCatalog(paymentMethodsData);
  }, [profile?.rol]);

  const loadToursPage = useCallback(async (cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const result = await toursService.listPage({
      guiaId: profile?.rol === "guia" ? profile.guiaId : undefined,
      pageSize: TOURS_PAGE_SIZE,
      cursor,
    });
    return result;
  }, [profile]);

  const reloadTours = useCallback(async () => {
    const result = await loadToursPage();
    setTours(result.items);
    setToursCursor(result.nextCursor);
    setHasMoreTours(Boolean(result.nextCursor));
    if (!selectedTourId && result.items[0]) {
      setSelectedTourId(result.items[0].id);
    }
  }, [loadToursPage, selectedTourId]);

  const loadMoreTours = async () => {
    if (!toursCursor || isLoadingMoreTours) {
      return;
    }
    try {
      setIsLoadingMoreTours(true);
      const result = await loadToursPage(toursCursor);
      setTours((current) => [...current, ...result.items]);
      setToursCursor(result.nextCursor);
      setHasMoreTours(Boolean(result.nextCursor));
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoadingMoreTours(false);
    }
  };

  const loadDetailData = useCallback(async (tourId: string) => {
    const [inscripcionesData, pagosData] = await Promise.all([
      inscripcionesService.listByTour(tourId),
      pagosService.listByTour(tourId),
    ]);
    setInscripciones(inscripcionesData);
    setPagos(pagosData);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setErrorMessage(null);
          await loadCatalogs();
          await reloadTours();
        } catch (error) {
          setErrorMessage(toServiceErrorMessage(error));
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalogs, reloadTours]);

  useEffect(() => {
    if (!selectedTourId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadDetailData(selectedTourId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetailData, selectedTourId]);

  const createInscripcionConPagoInicial = async (
    payload: CreateInscripcionConPagoPayload,
  ): Promise<boolean> => {
    if (!selectedTourId) {
      setErrorMessage("Seleccioná un tour antes de inscribir.");
      return false;
    }
    if (isSubmittingInscripcion) {
      return false;
    }
    if (!payload.vago?.id) {
      setErrorMessage("Buscá y seleccioná un vago para inscribir.");
      return false;
    }
    if (!Number.isFinite(payload.montoTotal) || payload.montoTotal <= 0) {
      setErrorMessage("El monto acordado debe ser mayor a 0.");
      return false;
    }
    const anticipo = payload.pagoInicial?.monto ?? 0;
    if (anticipo < 0) {
      setErrorMessage("El monto del anticipo no puede ser negativo.");
      return false;
    }
    if (anticipo > payload.montoTotal) {
      setErrorMessage("El anticipo no puede ser mayor al monto acordado.");
      return false;
    }
    if (anticipo > 0 && !payload.pagoInicial?.metodoPagoId) {
      setErrorMessage("Seleccioná un método de pago para el anticipo.");
      return false;
    }
    const selectedTour = tours.find((item) => item.id === selectedTourId);
    if (!selectedTour) {
      setErrorMessage("No se encontró el tour seleccionado.");
      return false;
    }
    try {
      setIsSubmittingInscripcion(true);
      setErrorMessage(null);
      const newInscripcionId = await inscripcionesService.createForTour(
        selectedTourId,
        payload.vago,
        payload.montoTotal,
        payload.userId,
        selectedTour.cupoMaximo,
      );
      if (anticipo > 0 && payload.pagoInicial) {
        await pagosService.create({
          inscripcionId: newInscripcionId,
          tourId: selectedTourId,
          vagoId: payload.vago.id,
          monto: anticipo,
          metodoPago: payload.pagoInicial.metodoPagoNombre ?? "Sin especificar",
          metodoPagoId: payload.pagoInicial.metodoPagoId,
          fecha: new Date(),
          registradoPor: payload.userId,
          comprobanteUrl: payload.pagoInicial.comprobanteUrl,
        });
      }
      await loadDetailData(selectedTourId);
      return true;
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      return false;
    } finally {
      setIsSubmittingInscripcion(false);
    }
  };

  const createPago = async (payload: CreatePagoPayload): Promise<boolean> => {
    if (!selectedTourId) {
      setErrorMessage("Seleccioná un tour antes de registrar un pago.");
      return false;
    }
    if (isSubmittingPago) {
      return false;
    }
    if (!payload.inscripcionId) {
      setErrorMessage("Seleccioná una inscripción válida.");
      return false;
    }
    if (!Number.isFinite(payload.monto) || payload.monto <= 0) {
      setErrorMessage("El monto del pago debe ser mayor a 0.");
      return false;
    }
    if (!payload.metodoPagoId) {
      setErrorMessage("Seleccioná un método de pago.");
      return false;
    }
    const inscripcion = inscripciones.find((item) => item.id === payload.inscripcionId);
    if (!inscripcion) {
      setErrorMessage("No se encontró la inscripción seleccionada.");
      return false;
    }
    try {
      setIsSubmittingPago(true);
      setErrorMessage(null);
      await pagosService.create({
        inscripcionId: inscripcion.id,
        tourId: selectedTourId,
        vagoId: inscripcion.vagoId,
        monto: payload.monto,
        metodoPago: payload.metodoPagoNombre ?? "Sin especificar",
        metodoPagoId: payload.metodoPagoId,
        fecha: new Date(),
        registradoPor: payload.registradoPor,
        comprobanteUrl: payload.comprobanteUrl,
        notas: payload.notas,
      });
      await loadDetailData(selectedTourId);
      return true;
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      return false;
    } finally {
      setIsSubmittingPago(false);
    }
  };

  const cancelInscripcion = async (inscripcionId: string): Promise<boolean> => {
    if (!selectedTourId) return false;
    try {
      setErrorMessage(null);
      await inscripcionesService.cancelInscripcion(selectedTourId, inscripcionId);
      await loadDetailData(selectedTourId);
      return true;
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      return false;
    }
  };

  return {
    tours,
    plantillas,
    guias,
    vagos,
    inscripciones,
    pagos,
    metodosPagoCatalog,
    selectedTourId,
    errorMessage,
    hasMoreTours,
    isLoadingMoreTours,
    isSubmittingInscripcion,
    isSubmittingPago,
    setSelectedTourId,
    setErrorMessage,
    reloadTours,
    loadMoreTours,
    createInscripcionConPagoInicial,
    createPago,
    cancelInscripcion,
    loadDetailData,
  };
}

// `resolveEstadoPago` se exporta para que la UI pueda mostrar al usuario el
// estado calculado antes de enviar el formulario.
export { resolveEstadoPago };
