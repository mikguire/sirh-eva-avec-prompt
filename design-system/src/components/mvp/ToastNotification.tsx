import type { NotificationTone } from "../../types";

type ToastNotificationProps = {
  title: string;
  message?: string;
  tone: NotificationTone;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
};

const toneClassMap: Record<NotificationTone, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
  info: "border-sky-300 bg-sky-50 text-sky-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-rose-300 bg-rose-50 text-rose-900",
};

export function ToastNotification({ title, message, tone, actionLabel, onAction, onClose }: ToastNotificationProps) {
  return (
    <section
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`w-full max-w-sm rounded-lg border p-3 ${toneClassMap[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {message ? <p className="mt-1 text-xs">{message}</p> : null}
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="rounded px-1.5 py-0.5 text-xs hover:bg-white/60">
            Fermer
          </button>
        ) : null}
      </div>
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} className="mt-2 rounded bg-white/80 px-2 py-1 text-xs font-medium">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
