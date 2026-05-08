"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Search…",
}: {
  data: Array<TData>;
  columns: Array<ColumnDef<TData, unknown>>;
  searchPlaceholder?: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  const headers = useMemo(() => table.getHeaderGroups(), [table]);
  const rows = useMemo(() => table.getRowModel().rows, [table]);

  return (
    <div className="rounded-2xl border border-token surface-1 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-3 border-b border-token p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold tracking-tight">Results</div>
          <div className="text-xs muted">{rows.length} rows</div>
        </div>
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-lg border border-token bg-transparent px-3 text-sm md:max-w-xs"
        />
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-1)]">
            {headers.map((hg) => (
              <tr key={hg.id} className="border-b border-token">
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide muted">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-token hover:bg-black/3">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-4 py-3">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-sm muted" colSpan={columns.length}>
                  No results.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="text-xs muted">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!canPrev}
            className="h-9 rounded-lg border border-token px-3 text-sm font-semibold disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!canNext}
            className="h-9 rounded-lg border border-token px-3 text-sm font-semibold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

