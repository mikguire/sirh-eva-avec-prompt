import type { EmployeeStatus } from "../../types";

type StatusBadgeProps = {
  status: EmployeeStatus;
};

function assertNever(value: never): never {
  throw new Error(`Unhandled status: ${String(value)}`);
}

function getStatusConfig(status: EmployeeStatus): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Actif", className: "bg-emerald-100 text-emerald-700" };
    case "pending":
      return { label: "En attente", className: "bg-amber-100 text-amber-700" };
    case "on_leave":
      return { label: "En conge", className: "bg-sky-100 text-sky-700" };
    case "suspended":
      return { label: "Suspendu", className: "bg-orange-100 text-orange-700" };
    case "terminated":
      return { label: "Sorti", className: "bg-rose-100 text-rose-700" };
    default:
      return assertNever(status);
  }
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
