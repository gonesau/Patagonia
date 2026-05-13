import { Eye, Pencil, Copy, Trash2 } from "lucide-react";
import { Button } from "./Button";

interface TableActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onView?: () => void;
}

export function TableActions({ onEdit, onDelete, onDuplicate, onView }: TableActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {onView ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
          type="button"
          title="Ver detalles"
          className="text-[#0dcaf0] hover:bg-[#0dcaf0]/10"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : null}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onEdit}
        type="button"
        title="Editar"
        className="text-[#0d6efd] hover:bg-[#0d6efd]/10"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      {onDuplicate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDuplicate}
          type="button"
          title="Duplicar"
          className="text-[#6c757d] hover:bg-[#6c757d]/10"
        >
          <Copy className="h-4 w-4" />
        </Button>
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        type="button"
        title="Eliminar"
        className="text-danger hover:bg-danger/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
