export type Size = "sm" | "md" | "lg";

export type AsyncState = "idle" | "loading" | "success" | "error";

export type EmployeeStatus =
  | "active"
  | "pending"
  | "on_leave"
  | "suspended"
  | "terminated";

export type NotificationTone = "success" | "info" | "warning" | "error";

export type FieldError = {
  message: string;
  code?: string;
};

export type EmployeeSummary = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  team?: string;
  avatarUrl?: string;
  status: EmployeeStatus;
};

export type Option<T extends string = string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

export type DateRangeValue = {
  from: Date | null;
  to: Date | null;
};

export type ColumnDef<T> = {
  key: keyof T & string;
  label: string;
  priority?: "high" | "medium" | "low";
  render?: (row: T) => string;
};
