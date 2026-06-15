import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { TourOcurrencia } from "@/types/tour.types";
import { getEstadoTour } from "@/types/estadoTour.types";
import type { TourCategoriaGroup } from "@/utils/tourCategoria";

interface TourListPanelProps {
  groupedTours: TourCategoriaGroup<TourOcurrencia>[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isAdmin: boolean;
  canViewFinancial: boolean;
  onAddTour: () => void;
  onSelectTour: (tourId: string) => void;
  onEditTour: (tour: TourOcurrencia) => void;
  onDeleteTour: (tour: TourOcurrencia) => void;
  onDuplicateTour?: (tour: TourOcurrencia) => void;
  onViewTour?: (tour: TourOcurrencia) => void;
  onLoadMore: () => void;
}

function renderTourRow(
  tour: TourOcurrencia,
  isAdmin: boolean,
  canViewFinancial: boolean,
  onSelectTour: (tourId: string) => void,
  onEditTour: (tour: TourOcurrencia) => void,
  onDeleteTour: (tour: TourOcurrencia) => void,
  onDuplicateTour?: (tour: TourOcurrencia) => void,
  onViewTour?: (tour: TourOcurrencia) => void,
) {
  return {
    key: tour.id,
    cells: [
      <button
        key={`select-${tour.id}`}
        className="font-semibold text-[#0d6efd] underline-offset-2 hover:underline"
        onClick={() => onSelectTour(tour.id)}
        type="button"
      >
        {tour.nombre}
      </button>,
      (() => {
        const estado = getEstadoTour(tour.estado);
        return (
          <span
            key={`estado-${tour.id}`}
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${estado.color}`}
          >
            {estado.nombre}
          </span>
        );
      })(),
      `${tour.cupoMinimo}-${tour.cupoMaximo}`,
      ...(canViewFinancial ? [`$${tour.precioVenta.toFixed(2)}`] : []),
      isAdmin ? (
        <TableActions
          key={`actions-${tour.id}`}
          onDelete={() => onDeleteTour(tour)}
          onDuplicate={onDuplicateTour ? () => onDuplicateTour(tour) : undefined}
          onEdit={() => {
            onSelectTour(tour.id);
            onEditTour(tour);
          }}
          onView={onViewTour ? () => onViewTour(tour) : undefined}
        />
      ) : (
        <span key={`ro-${tour.id}`} className="text-xs text-neutral">
          Solo lectura
        </span>
      ),
    ],
  };
}

export function TourListPanel({
  groupedTours,
  hasMore,
  isLoadingMore,
  isAdmin,
  canViewFinancial,
  onAddTour,
  onSelectTour,
  onEditTour,
  onDeleteTour,
  onDuplicateTour,
  onViewTour,
  onLoadMore,
}: TourListPanelProps) {
  const totalTours = groupedTours.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 font-heading text-xl">
          <ClipboardList size={18} strokeWidth={1.8} />
          Listado de tours
        </h3>
        {isAdmin ? <Button onClick={onAddTour}>Agregar tour</Button> : null}
      </div>
      {totalTours === 0 ? (
        <p className="text-sm text-neutral">No hay tours registrados.</p>
      ) : (
        <div className="space-y-6">
          {groupedTours.map((group) => (
            <section key={group.key}>
              <h4 className="mb-2 text-sm font-semibold text-textDark">
                {group.label} ({group.items.length})
              </h4>
              <Table
                emptyMessage="No hay tours en esta categoría."
                headers={[
                  "Tour",
                  "Estado",
                  "Cupo",
                  ...(canViewFinancial ? ["Precio"] : []),
                  "Acciones",
                ]}
                rows={group.items.map((tour) =>
                  renderTourRow(
                    tour,
                    isAdmin,
                    canViewFinancial,
                    onSelectTour,
                    onEditTour,
                    onDeleteTour,
                    onDuplicateTour,
                    onViewTour,
                  ),
                )}
              />
            </section>
          ))}
        </div>
      )}
      {hasMore ? (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Cargando..." : "Cargar más tours"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
