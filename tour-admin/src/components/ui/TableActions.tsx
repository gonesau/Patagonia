interface TableActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function TableActions({ onEdit, onDelete, onDuplicate }: TableActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded-md border border-[#0d6efd] bg-white px-3 py-1 text-sm font-semibold text-[#0d6efd] transition hover:bg-[#0d6efd] hover:text-white"
        onClick={onEdit}
        type="button"
      >
        Editar
      </button>
      {onDuplicate ? (
        <button
          className="rounded-md border border-[#6c757d] bg-white px-3 py-1 text-sm font-semibold text-[#6c757d] transition hover:bg-[#6c757d] hover:text-white"
          onClick={onDuplicate}
          type="button"
        >
          Duplicar
        </button>
      ) : null}
      <button
        className="rounded-md border border-[#dc3545] bg-white px-3 py-1 text-sm font-semibold text-[#dc3545] transition hover:bg-[#dc3545] hover:text-white"
        onClick={onDelete}
        type="button"
      >
        Eliminar
      </button>
    </div>
  );
}
