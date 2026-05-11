import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { TourOcurrencia } from "@/types/tour.types";
import { getEstadoTour } from "@/types/estadoTour.types";

interface TourListPanelProps {
  tours: TourOcurrencia[];
  hasMore: boolean;
  isLoadingMore: boolean;
  isAdmin: boolean;
  onAddTour: () => void;
  onSelectTour: (tourId: string) => void;
  onEditTour: (tour: TourOcurrencia) => void;
  onDeleteTour: (tour: TourOcurrencia) => void;
  onDuplicateTour?: (tour: TourOcurrencia) => void;
  onLoadMore: () => void;
}

export function TourListPanel({
  tours,
  hasMore,
  isLoadingMore,
  isAdmin,
  onAddTour,
  onSelectTour,
  onEditTour,
  onDeleteTour,
  onDuplicateTour,
  onLoadMore,
}: TourListPanelProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-heading text-xl">
          <ClipboardList size={18} strokeWidth={1.8} />
          Listado de tours
        </h3>
        {isAdmin ? <Button onClick={onAddTour}>Agregar tour</Button> : null}
      </div>
      <Table
        emptyMessage="No hay tours registrados."
        headers={["Tour", "Estado", "Cupo", "Precio", "Acciones"]}
        rows={tours.map((tour) => ({
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
            `$${tour.precioVenta.toFixed(2)}`,
            isAdmin ? (
              <TableActions
                key={`actions-${tour.id}`}
                onDelete={() => onDeleteTour(tour)}
                onDuplicate={onDuplicateTour ? () => onDuplicateTour(tour) : undefined}
                onEdit={() => {
                  onSelectTour(tour.id);
                  onEditTour(tour);
                }}
              />
            ) : (
              <span key={`ro-${tour.id}`} className="text-xs text-neutral">
                Solo lectura
              </span>
            ),
          ],
        }))}
      />
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
