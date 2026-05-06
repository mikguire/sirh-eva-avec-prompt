import type { ReactNode } from "react";

type DataListProps<T extends { id: string }> = {
  items: T[];
  loading?: boolean;
  emptyState?: ReactNode;
  renderItem: (item: T) => ReactNode;
};

export function DataList<T extends { id: string }>({ items, loading, emptyState, renderItem }: DataListProps<T>) {
  if (loading) {
    return <p className="text-sm text-slate-500">Chargement...</p>;
  }

  if (items.length === 0) {
    return <>{emptyState ?? <p className="text-sm text-slate-500">Aucune donnee.</p>}</>;
  }

  return (
    <ul className="space-y-2" role="list">
      {items.map((item) => (
        <li key={item.id} role="listitem">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
