import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toursService } from "@/services/toursService";
import { plantillasService } from "@/services/plantillasService";
import { guiasService } from "@/services/guiasService";
import { vagosService } from "@/services/vagosService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { TourOcurrencia, TourPlantilla } from "@/types/tour.types";
import type { Guia } from "@/types/guia.types";
import type { Vago } from "@/types/vago.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";
import type { Compra } from "@/types/compra.types";
import type { UsuarioSistema } from "@/types/usuario.types";

const TOURS_PAGE_SIZE = 20;

interface UseToursPageStateResult {
  tours: TourOcurrencia[];
  plantillas: TourPlantilla[];
  guias: Guia[];
  vagos: Vago[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  compras: Compra[];
  selectedTourId: string;
  paymentInscripcionId: string;
  errorMessage: string | null;
  hasMoreTours: boolean;
  isLoadingMoreTours: boolean;
  isSubmittingInscripcion: boolean;
  isSubmittingPago: boolean;
  isSubmittingCompra: boolean;
  setSelectedTourId: (tourId: string) => void;
  setPaymentInscripcionId: (inscripcionId: string) => void;
  setErrorMessage: (message: string | null) => void;
  reloadTours: () => Promise<void>;
  loadMoreTours: () => Promise<void>;
  createInscripcion: (payload: { selectedVagoId: string; montoTotal: number; userId: string }) => Promise<void>;
  createPago: (payload: { inscripcionId: string; monto: number }) => Promise<boolean>;
  createCompra: (payload: Omit<Compra, "id">) => Promise<void>;
}

export function useToursPageState(profile: UsuarioSistema | null): UseToursPageStateResult {
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [paymentInscripcionId, setPaymentInscripcionId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMoreTours, setHasMoreTours] = useState<boolean>(false);
  const [isLoadingMoreTours, setIsLoadingMoreTours] = useState<boolean>(false);
  const [isSubmittingInscripcion, setIsSubmittingInscripcion] = useState<boolean>(false);
  const [isSubmittingPago, setIsSubmittingPago] = useState<boolean>(false);
  const [isSubmittingCompra, setIsSubmittingCompra] = useState<boolean>(false);
  const [toursCursor, setToursCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);

  const loadCatalogs = async () => {
    const [plantillasData, guiasData, vagosData] = await Promise.all([
      plantillasService.listPage({ pageSize: 200 }),
      guiasService.listPage({ pageSize: 200 }),
      vagosService.listPage({ pageSize: 200 }),
    ]);
    setPlantillas(plantillasData.items.filter((item) => item.activa));
    setGuias(guiasData.items.filter((item) => item.estado === "activo"));
    setVagos(vagosData.items.filter((item) => item.activo));
  };

  const loadToursPage = async (cursor?: QueryDocumentSnapshot<DocumentData>) => {
    const result = await toursService.listPage({
      guiaId: profile?.rol === "guia" ? profile.guiaId : undefined,
      pageSize: TOURS_PAGE_SIZE,
      cursor,
    });
    return result;
  };

  const reloadTours = async () => {
    const result = await loadToursPage();
    setTours(result.items);
    setToursCursor(result.nextCursor);
    setHasMoreTours(Boolean(result.nextCursor));
    if (!selectedTourId && result.items[0]) {
      setSelectedTourId(result.items[0].id);
    }
  };

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

  const loadDetailData = async (tourId: string) => {
    const [inscripcionesData, pagosData, comprasData] = await Promise.all([
      inscripcionesService.listByTour(tourId),
      pagosService.listByTour(tourId),
      comprasService.listByTour(tourId),
    ]);
    setInscripciones(inscripcionesData);
    setPagos(pagosData);
    setCompras(comprasData);
    if (!paymentInscripcionId && inscripcionesData[0]) {
      setPaymentInscripcionId(inscripcionesData[0].id);
    }
  };

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
  }, []);

  useEffect(() => {
    if (!selectedTourId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadDetailData(selectedTourId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedTourId]);

  const createInscripcion = async (payload: { selectedVagoId: string; montoTotal: number; userId: string }) => {
    if (!selectedTourId || !payload.selectedVagoId || payload.montoTotal <= 0 || isSubmittingInscripcion) {
      return;
    }
    const selectedVago = vagos.find((item) => item.id === payload.selectedVagoId);
    if (!selectedVago) {
      return;
    }
    try {
      setIsSubmittingInscripcion(true);
      setErrorMessage(null);
      await inscripcionesService.createForTour(selectedTourId, selectedVago, payload.montoTotal, payload.userId);
      await loadDetailData(selectedTourId);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmittingInscripcion(false);
    }
  };

  const createPago = async (payload: { inscripcionId: string; monto: number }): Promise<boolean> => {
    if (!selectedTourId || !payload.inscripcionId || payload.monto <= 0 || isSubmittingPago) {
      return false;
    }
    const inscripcion = inscripciones.find((item) => item.id === payload.inscripcionId);
    if (!inscripcion) {
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
        metodoPago: "transferencia",
        fecha: new Date(),
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

  const createCompra = async (payload: Omit<Compra, "id">) => {
    if (!selectedTourId || isSubmittingCompra) {
      return;
    }
    try {
      setIsSubmittingCompra(true);
      setErrorMessage(null);
      await comprasService.create(selectedTourId, payload);
      await loadDetailData(selectedTourId);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmittingCompra(false);
    }
  };

  return {
    tours,
    plantillas,
    guias,
    vagos,
    inscripciones,
    pagos,
    compras,
    selectedTourId,
    paymentInscripcionId,
    errorMessage,
    hasMoreTours,
    isLoadingMoreTours,
    isSubmittingInscripcion,
    isSubmittingPago,
    isSubmittingCompra,
    setSelectedTourId,
    setPaymentInscripcionId,
    setErrorMessage,
    reloadTours,
    loadMoreTours,
    createInscripcion,
    createPago,
    createCompra,
  };
}
