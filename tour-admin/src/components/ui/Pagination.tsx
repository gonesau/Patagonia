import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getRangeLabel(currentPage: number, pageSize: number, totalItems: number): string {
  if (totalItems === 0) {
    return "0 de 0";
  }
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  return `${start}-${end} de ${totalItems}`;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación"
      className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 ${className}`}
    >
      <Button
        className="min-h-11 shrink-0"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
        variant="secondary"
      >
        Anterior
      </Button>
      <span className="text-center text-sm text-textDark">{getRangeLabel(currentPage, pageSize, totalItems)}</span>
      <Button
        className="min-h-11 shrink-0"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
        variant="secondary"
      >
        Siguiente
      </Button>
    </nav>
  );
}
