import { ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { TourOcurrencia } from "@/types/tour.types";

interface TourListPanelProps {
  tours: TourOcurrencia[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onAddTour: () => void;
  onSelectTour: (tourId: string) => void;
  onEditTour: (tour: TourOcurrencia) => void;
  onDeleteTour: (tour: TourOcurrencia) => void;
  onLoadMore: () => void;
}

export function TourListPanel({
  tours,
  hasMore,
  isLoadingMore,
  onAddTour,
  onSelectTour,
  onEditTour,
  onDeleteTour,
  onLoadMore,
}: TourListPanelProps) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-heading text-xl">
          <ClipboardList size={18} strokeWidth={1.8} />
          Listado de tours
        </h3>
        <Button onClick={onAddTour}>Agregar tour</Button>
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
            tour.estado,
            `${tour.cupoMinimo}-${tour.cupoMaximo}`,
            `$${tour.precioVenta.toFixed(2)}`,
            (
              <TableActions
                key={`actions-${tour.id}`}
                onDelete={() => onDeleteTour(tour)}
                onEdit={() => {
                  onSelectTour(tour.id);
                  onEditTour(tour);
                }}
              />
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
