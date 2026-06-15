import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es.js";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toursService } from "@/services/toursService";
import { guiasService } from "@/services/guiasService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { notificacionesService } from "@/services/notificacionesService";
import { useAuth } from "@/hooks/useAuth";
import { useIsLgDown } from "@/hooks/useBreakpoint";
import { toServiceErrorMessage } from "@/services/serviceErrors";

const statusColorMap: Record<string, string> = {
  publicado: "#5ea59b",
  lleno: "#3d8a80",
  borrador: "#6b7b7a",
  cancelado: "#c0544a",
  realizado: "#0e3832",
  en_curso: "#d97706",
};
interface CalendarEventRecord {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  extendedProps: {
    guiaId: string;
    guiaIds: string[];
    estado: string;
    inscritos: number;
    cupoMaximo: number;
  };
}

export function CalendarioPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canSendNotifications = profile?.rol === "admin";
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [guides, setGuides] = useState<Array<{ id: string; name: string }>>([]);
  const [guideFilter, setGuideFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const isMobile = useIsLgDown();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [isSendingReminder, setIsSendingReminder] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const [tours, allGuides] = await Promise.all([
        toursService.list(profile?.rol === "guia" ? profile.guiaId : undefined, profile?.rol),
        guiasService.list(),
      ]);
      setGuides(allGuides.map((item) => ({ id: item.id, name: `${item.nombre} ${item.apellido}` })));
      const built = await Promise.all(
        tours.map(async (tour) => {
          const inscritos = await inscripcionesService.countActivas(tour.id);
          const guiaIdsList = tour.guiaIds?.length ? tour.guiaIds : tour.guiaId ? [tour.guiaId] : [];
          return {
            id: tour.id,
            title: `${tour.nombre} (${inscritos}/${tour.cupoMaximo})`,
            start: new Date(tour.fechaInicio),
            end: new Date(tour.fechaFin),
            color: statusColorMap[tour.estado] ?? "#92c7c7",
            extendedProps: {
              guiaId: tour.guiaId,
              guiaIds: guiaIdsList,
              estado: tour.estado,
              inscritos,
              cupoMaximo: tour.cupoMaximo,
            },
          } satisfies CalendarEventRecord;
        }),
      );
      setEvents(built);
    };
    void load();
  }, [profile?.guiaId, profile?.rol]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesGuide = guideFilter
          ? event.extendedProps.guiaId === guideFilter || event.extendedProps.guiaIds.includes(guideFilter)
          : true;
        const matchesStatus = statusFilter ? event.extendedProps.estado === statusFilter : true;
        return matchesGuide && matchesStatus;
      }),
    [events, guideFilter, statusFilter],
  );

  const handleEventClick = (info: EventClickArg) => {
    const found = events.find((item) => item.id === info.event.id);
    if (found) {
      setSelectedEvent(found);
      setReminderError(null);
    }
  };

  const sendReminderFromCalendar = async () => {
    if (!selectedEvent || !canSendNotifications) {
      return;
    }
    setIsSendingReminder(true);
    setReminderError(null);
    try {
      await notificacionesService.sendManualReminder(
        selectedEvent.id,
        "Recordatorio enviado manualmente desde el calendario.",
      );
      setSelectedEvent(null);
    } catch (error) {
      setReminderError(toServiceErrorMessage(error));
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Calendario de ocurrencias"
        description="Vista mensual y semanal con filtros por estado y guía. Pulse un evento para ver detalle y acciones."
      />
      <Card>
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Filtrar por guía</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={guideFilter}
              onChange={(event) => setGuideFilter(event.target.value)}
              disabled={profile?.rol === "guia"}
            >
              <option value="">Todos</option>
              {guides.map((guide) => (
                <option key={guide.id} value={guide.id}>
                  {guide.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Filtrar por estado</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Todos</option>
              <option value="borrador">Borrador</option>
              <option value="publicado">Publicado</option>
              <option value="en_curso">En curso</option>
              <option value="lleno">Lleno</option>
              <option value="cancelado">Cancelado</option>
              <option value="realizado">Realizado</option>
            </select>
          </label>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <FullCalendar
            key={isMobile ? "fc-week" : "fc-month"}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={isMobile ? "timeGridWeek" : "dayGridMonth"}
            headerToolbar={
              isMobile
                ? { left: "prev,next", center: "title", right: "today" }
                : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }
            }
            locale={esLocale}
            events={filteredEvents}
            eventClick={handleEventClick}
            height="auto"
            dayMaxEventRows={isMobile ? 2 : 4}
          />
        </div>
      </Card>

      <Modal
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? "Detalle"}
      >
        {selectedEvent ? (
          <div className="space-y-3 text-sm text-textDark">
            <p>
              <span className="text-neutral">Estado:</span> {selectedEvent.extendedProps.estado}
            </p>
            <p>
              <span className="text-neutral">Inscripciones:</span> {selectedEvent.extendedProps.inscritos} /{" "}
              {selectedEvent.extendedProps.cupoMaximo}
            </p>
            <p>
              <span className="text-neutral">Inicio:</span> {selectedEvent.start.toLocaleString("es-SV")}
            </p>
            <p>
              <span className="text-neutral">Fin:</span> {selectedEvent.end.toLocaleString("es-SV")}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                onClick={() => {
                  navigate(`/tours?tour=${selectedEvent.id}`);
                  setSelectedEvent(null);
                }}
              >
                Abrir en Tours
              </Button>
              {canSendNotifications ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSendingReminder}
                  onClick={() => void sendReminderFromCalendar()}
                >
                  {isSendingReminder ? "Enviando…" : "Enviar recordatorio"}
                </Button>
              ) : null}
            </div>
            {reminderError ? <p className="text-danger">{reminderError}</p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
