import type { EmployeeSummary } from "../../types";
import { StatusBadge } from "./StatusBadge";

type EmployeeCardProps = {
  employee: EmployeeSummary;
  selected?: boolean;
  onOpenProfile?: (employeeId: string) => void;
  onMessage?: (employeeId: string) => void;
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function EmployeeCard({ employee, selected, onOpenProfile, onMessage }: EmployeeCardProps) {
  return (
    <article
      className={`rounded-xl border p-4 transition ${
        selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      aria-selected={selected}
    >
      <div className="flex items-center gap-3">
        {employee.avatarUrl ? (
          <img src={employee.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
          >
            {getInitials(employee.firstName, employee.lastName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="truncate text-xs text-slate-600">{employee.role}</p>
          {employee.team ? <p className="truncate text-xs text-slate-500">{employee.team}</p> : null}
        </div>

        <StatusBadge status={employee.status} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onOpenProfile?.(employee.id)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Voir profil
        </button>
        <button
          type="button"
          onClick={() => onMessage?.(employee.id)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
        >
          Contacter
        </button>
      </div>
    </article>
  );
}
