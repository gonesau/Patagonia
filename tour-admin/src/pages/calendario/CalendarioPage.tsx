import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { toursService } from "@/services/toursService";
import { guiasService } from "@/services/guiasService";
import { useAuth } from "@/hooks/useAuth";

const statusColorMap: Record<string, string> = {
  publicado: "#5ea59b",
  lleno: "#3d8a80",
  borrador: "#6b7b7a",
  cancelado: "#c0544a",
  realizado: "#0e3832",
};

export function CalendarioPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<
    Array<{ id: string; title: string; start: Date; end: Date; color: string; extendedProps: { guiaId: string; estado: string } }>
  >([]);
  const [guides, setGuides] = useState<Array<{ id: string; name: string }>>([]);
  const [guideFilter, setGuideFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const syncViewport = () => setIsMobile(window.innerWidth < 768);
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [tours, allGuides] = await Promise.all([
        toursService.list(profile?.rol === "guia" ? profile.guiaId : undefined),
        guiasService.list(),
      ]);
      setGuides(allGuides.map((item) => ({ id: item.id, name: `${item.nombre} ${item.apellido}` })));
      setEvents(
        tours.map((tour) => ({
          id: tour.id,
          title: tour.nombre,
          start: new Date(tour.fechaInicio),
          end: new Date(tour.fechaFin),
          color: statusColorMap[tour.estado] ?? "#92c7c7",
          extendedProps: { guiaId: tour.guiaId, estado: tour.estado },
        })),
      );
    };
    void load();
  }, [profile?.guiaId, profile?.rol]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesGuide = guideFilter ? event.extendedProps.guiaId === guideFilter : true;
        const matchesStatus = statusFilter ? event.extendedProps.estado === statusFilter : true;
        return matchesGuide && matchesStatus;
      }),
    [events, guideFilter, statusFilter],
  );

  return (
    <>
      <PageHeader
        title="Calendario de ocurrencias"
        description="Vista mensual y semanal con filtros por estado y guía."
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
              <option value="lleno">Lleno</option>
              <option value="cancelado">Cancelado</option>
              <option value="realizado">Realizado</option>
            </select>
          </label>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridWeek" : "dayGridMonth"}
          headerToolbar={
            isMobile
              ? { left: "prev,next", center: "title", right: "today" }
              : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek" }
          }
          locale="es"
          events={filteredEvents}
          height="auto"
          dayMaxEventRows={isMobile ? 2 : 4}
        />
      </Card>
    </>
  );
}
