import type { ColumnDef } from "../../types";

type MobileDataTableProps<T extends Record<string, unknown>> = {
  columns: Array<ColumnDef<T>>;
  rows: T[];
  keyField: keyof T & string;
};

export function MobileDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
}: MobileDataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Aucune ligne a afficher.</p>;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <article
          key={String(row[keyField])}
          className="rounded-lg border border-slate-200 bg-white p-3"
          aria-label="Ligne de donnees"
        >
          <dl className="grid grid-cols-1 gap-2">
            {columns
              .filter((column) => column.priority !== "low")
              .map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3">
                  <dt className="text-xs font-medium text-slate-500">{column.label}</dt>
                  <dd className="text-xs text-slate-900">
                    {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                  </dd>
                </div>
              ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
