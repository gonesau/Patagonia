import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DataCard, type DataCardField } from "./DataCard";
import { Pagination } from "./Pagination";

export const DEFAULT_MOBILE_CARD_PAGE_SIZE = 10;

export interface TableRow {
  key: string;
  cells: ReactNode[];
}

function headerLabel(header: ReactNode): ReactNode {
  if (typeof header === "string" || typeof header === "number") {
    return header;
  }
  return "—";
}

function buildAutoMobileCard(
  row: TableRow,
  headers: ReactNode[],
  hiddenIndexes: Set<number>,
): ReactNode {
  const visibleEntries = row.cells
    .map((cell, index) => ({ cell, index, header: headers[index] }))
    .filter(({ index }) => !hiddenIndexes.has(index));

  if (visibleEntries.length === 0) {
    return null;
  }

  const actionsIndex = visibleEntries.length - 1;
  const lastHeader = headerLabel(visibleEntries[actionsIndex]?.header);
  const isActionsColumn =
    typeof lastHeader === "string" && lastHeader.toLowerCase() === "acciones";

  const dataEntries = isActionsColumn ? visibleEntries.slice(0, -1) : visibleEntries;
  const actionsCell = isActionsColumn ? visibleEntries[actionsIndex]?.cell : undefined;

  const fields: DataCardField[] = dataEntries.map(({ header, cell }) => ({
    label: headerLabel(header),
    value: cell,
  }));

  const titleField = fields[0];
  const restFields = fields.slice(1);

  return (
    <DataCard
      key={row.key}
      title={titleField?.value}
      fields={titleField ? restFields : fields}
      actions={actionsCell}
    />
  );
}

export function Table({
  headers,
  rows,
  emptyMessage = "No hay registros para mostrar.",
  renderMobileCard,
  mobileHiddenColumnIndexes = [],
  mobilePageSize = DEFAULT_MOBILE_CARD_PAGE_SIZE,
  enableMobilePagination = true,
  renderMobileToolbar,
}: {
  headers: ReactNode[];
  rows: Array<Array<ReactNode> | TableRow>;
  emptyMessage?: string;
  renderMobileCard?: (row: TableRow) => ReactNode;
  mobileHiddenColumnIndexes?: number[];
  mobilePageSize?: number;
  enableMobilePagination?: boolean;
  renderMobileToolbar?: (visibleRowKeys: string[]) => ReactNode;
}) {
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const normalizedRows = useMemo(
    () =>
      rows.map((row, rowIndex) => (Array.isArray(row) ? { key: `row-${rowIndex}`, cells: row } : row)),
    [rows],
  );

  const rowKeysSignature = useMemo(() => normalizedRows.map((row) => row.key).join("|"), [normalizedRows]);

  const hiddenIndexes = new Set(mobileHiddenColumnIndexes);

  const isMobilePaginationEnabled =
    enableMobilePagination && mobilePageSize > 0 && normalizedRows.length > mobilePageSize;

  const totalPages = isMobilePaginationEnabled
    ? Math.ceil(normalizedRows.length / mobilePageSize)
    : 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [rowKeysSignature]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [currentPage, totalPages]);

  const mobileRows = useMemo(() => {
    if (!isMobilePaginationEnabled) {
      return normalizedRows;
    }
    const start = (currentPage - 1) * mobilePageSize;
    return normalizedRows.slice(start, start + mobilePageSize);
  }, [currentPage, isMobilePaginationEnabled, mobilePageSize, normalizedRows]);

  const visibleRowKeys = useMemo(() => mobileRows.map((row) => row.key), [mobileRows]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    mobileContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div ref={mobileContainerRef} className="md:hidden">
        {renderMobileToolbar && normalizedRows.length > 0 ? (
          <div className="mb-3">{renderMobileToolbar(visibleRowKeys)}</div>
        ) : null}

        <div className="space-y-3">
          {mobileRows.length > 0 ? (
            mobileRows.map((row) =>
              renderMobileCard ? renderMobileCard(row) : buildAutoMobileCard(row, headers, hiddenIndexes),
            )
          ) : (
            <p className="rounded-lg border border-border bg-white px-3 py-6 text-center text-sm text-neutral">
              {emptyMessage}
            </p>
          )}
        </div>

        {isMobilePaginationEnabled ? (
          <Pagination
            className="mt-3"
            currentPage={currentPage}
            onPageChange={handlePageChange}
            pageSize={mobilePageSize}
            totalItems={normalizedRows.length}
            totalPages={totalPages}
          />
        ) : null}
      </div>

      <div className="hidden max-w-full overflow-x-auto rounded-lg border border-border md:block">
        <table className="min-w-full table-striped bg-white text-left text-sm md:table-fixed">
          <thead className="border-b border-border bg-[#f8f9fa]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={`header-${index}`}
                  className="whitespace-normal px-3 py-2 font-semibold text-textDark md:whitespace-nowrap"
                >
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
                    <td key={`${row.key}-cell-${cellIndex}`} className="break-words px-3 py-2 align-middle text-textDark">
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
    </>
  );
}
