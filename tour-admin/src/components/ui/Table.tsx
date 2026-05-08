import type { ReactNode } from "react";

export interface TableRow {
  key: string;
  cells: ReactNode[];
}

export function Table({
  headers,
  rows,
  emptyMessage = "No hay registros para mostrar.",
}: {
  headers: ReactNode[];
  rows: Array<Array<ReactNode> | TableRow>;
  emptyMessage?: string;
}) {
  const normalizedRows = rows.map((row, rowIndex) =>
    Array.isArray(row) ? { key: `row-${rowIndex}`, cells: row } : row,
  );

  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full table-striped bg-white text-left text-sm md:table-fixed">
        <thead className="border-b border-border bg-[#f8f9fa]">
          <tr>
            {headers.map((header, index) => (
              <th key={`header-${index}`} className="whitespace-nowrap px-3 py-2 font-semibold text-textDark">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.length > 0 ? (
            normalizedRows.map((row) => (
              <tr key={row.key} className="border-t border-border odd:bg-white even:bg-[#f8f9fa] hover:bg-primary/10">
                {row.cells.map((cell, cellIndex) => (
                  <td key={`${row.key}-cell-${cellIndex}`} className="px-3 py-2 align-middle text-textDark md:break-words">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-3 py-6 text-center text-sm text-neutral" colSpan={headers.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
