import { useCallback, useEffect, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { toursService } from "@/services/toursService";
import { plantillasService } from "@/services/plantillasService";
import { guiasService } from "@/services/guiasService";
import { vagosService } from "@/services/vagosService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { categoriasCompraService } from "@/services/categoriasCompraService";
import { estadosTourService } from "@/services/estadosTourService";
import { metodosPagoService } from "@/services/metodosPagoService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { TourOcurrencia, TourPlantilla } from "@/types/tour.types";
import type { Guia } from "@/types/guia.types";
import type { Vago } from "@/types/vago.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";
import type { Compra } from "@/types/compra.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import type { EstadoTour } from "@/types/estadoTour.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import type { UsuarioSistema } from "@/types/usuario.types";

const TOURS_PAGE_SIZE = 20;

interface UseToursPageStateResult {
  tours: TourOcurrencia[];
  plantillas: TourPlantilla[];
  guias: Guia[];
  vagos: Vago[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  comprasTour: Compra[];
  comprasGenerales: Compra[];
  categoriasCompra: CategoriaCompra[];
  estadosTourCatalog: EstadoTour[];
  metodosPagoCatalog: MetodoPagoCatalogo[];
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
  createPago: (payload: {
    inscripcionId: string;
    monto: number;
    metodoPago: string;
    metodoPagoId?: string;
    registradoPor: string;
    comprobanteUrl?: string;
    notas?: string;
  }) => Promise<boolean>;
  createCompra: (payload: Omit<Compra, "id" | "creadoEn" | "actualizadoEn">) => Promise<void>;
  updateCompra: (compraId: string, payload: Partial<Omit<Compra, "id" | "creadoEn" | "actualizadoEn">>) => Promise<void>;
  deleteCompra: (compraId: string) => Promise<void>;
}

export function useToursPageState(profile: UsuarioSistema | null): UseToursPageStateResult {
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [comprasTour, setComprasTour] = useState<Compra[]>([]);
  const [comprasGenerales, setComprasGenerales] = useState<Compra[]>([]);
  const [categoriasCompra, setCategoriasCompra] = useState<CategoriaCompra[]>([]);
  const [estadosTourCatalog, setEstadosTourCatalog] = useState<EstadoTour[]>([]);
  const [metodosPagoCatalog, setMetodosPagoCatalog] = useState<MetodoPagoCatalogo[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [paymentInscripcionId, setPaymentInscripcionId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMoreTours, setHasMoreTours] = useState<boolean>(false);
  const [isLoadingMoreTours, setIsLoadingMoreTours] = useState<boolean>(false);
  const [isSubmittingInscripcion, setIsSubmittingInscripcion] = useState<boolean>(false);
  const [isSubmittingPago, setIsSubmittingPago] = useState<boolean>(false);
  const [isSubmittingCompra, setIsSubmittingCompra] = useState<boolean>(false);
  const [toursCursor, setToursCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);

  const loadCatalogs = useCallback(async () => {
    if (profile?.rol === "guia") {
      const [tourStatesData, paymentMethodsData] = await Promise.all([
        estadosTourService.listActive(),
        metodosPagoService.listActive(),
      ]);
      setPlantillas([]);
      setGuias([]);
      setVagos([]);
      setEstadosTourCatalog(tourStatesData);
      setMetodosPagoCatalog(paymentMethodsData);
      return;
    }
    const [plantillasData, guiasData, vagosData] = await Promise.all([
      plantillasService.listPage({ pageSize: 200 }),
      guiasService.listPage({ pageSize: 200 }),
      vagosService.listPage({ pageSize: 200 }),
    ]);
    setPlantillas(plantillasData.items.filter((item) => item.activa));
    setGuias(guiasData.items.filter((item) => item.estado === "activo"));
    setVagos(vagosData.items.filter((item) => item.activo));
    const [tourStatesData, paymentMethodsData] = await Promise.all([
      estadosTourService.listActive(),
      metodosPagoService.listActive(),
    ]);
    setEstadosTourCatalog(tourStatesData);
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
    const [inscripcionesData, pagosData, comprasTourData, comprasGeneralesData, categoriasData] = await Promise.all([
      inscripcionesService.listByTour(tourId),
      pagosService.listByTour(tourId),
      comprasService.listByTour(tourId),
      comprasService.listGeneral(),
      categoriasCompraService.listActive(),
    ]);
    setInscripciones(inscripcionesData);
    setPagos(pagosData);
    setComprasTour(comprasTourData);
    setComprasGenerales(comprasGeneralesData);
    setCategoriasCompra(categoriasData);
    if (!paymentInscripcionId && inscripcionesData[0]) {
      setPaymentInscripcionId(inscripcionesData[0].id);
    }
  }, [paymentInscripcionId]);

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

  const createInscripcion = async (payload: { selectedVagoId: string; montoTotal: number; userId: string }) => {
    if (!selectedTourId || !payload.selectedVagoId || payload.montoTotal <= 0 || isSubmittingInscripcion) {
      return;
    }
    const selectedTour = tours.find((item) => item.id === selectedTourId);
    if (!selectedTour) {
      return;
    }
    const selectedVago = vagos.find((item) => item.id === payload.selectedVagoId);
    if (!selectedVago) {
      return;
    }
    try {
      setIsSubmittingInscripcion(true);
      setErrorMessage(null);
      await inscripcionesService.createForTour(
        selectedTourId,
        selectedVago,
        payload.montoTotal,
        payload.userId,
        selectedTour.cupoMaximo,
      );
      await loadDetailData(selectedTourId);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmittingInscripcion(false);
    }
  };

  const createPago = async (payload: {
    inscripcionId: string;
    monto: number;
    metodoPago: string;
    metodoPagoId?: string;
    registradoPor: string;
    comprobanteUrl?: string;
    notas?: string;
  }): Promise<boolean> => {
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
        metodoPago: payload.metodoPago,
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

  const createCompra = async (payload: Omit<Compra, "id" | "creadoEn" | "actualizadoEn">) => {
    if (isSubmittingCompra) {
      return;
    }
    try {
      setIsSubmittingCompra(true);
      setErrorMessage(null);
      await comprasService.create(payload);
      if (selectedTourId) {
        await loadDetailData(selectedTourId);
      }
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmittingCompra(false);
    }
  };

  const updateCompra = async (
    compraId: string,
    payload: Partial<Omit<Compra, "id" | "creadoEn" | "actualizadoEn">>,
  ) => {
    if (!selectedTourId || isSubmittingCompra) {
      return;
    }
    try {
      setIsSubmittingCompra(true);
      setErrorMessage(null);
      await comprasService.update(compraId, payload);
      await loadDetailData(selectedTourId);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmittingCompra(false);
    }
  };

  const deleteCompra = async (compraId: string) => {
    if (!selectedTourId || isSubmittingCompra) {
      return;
    }
    try {
      setIsSubmittingCompra(true);
      setErrorMessage(null);
      await comprasService.remove(compraId);
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
    comprasTour,
    comprasGenerales,
    categoriasCompra,
    estadosTourCatalog,
    metodosPagoCatalog,
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
    updateCompra,
    deleteCompra,
  };
}
