import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { api } from "./api";

export const message = (e: unknown) => (e instanceof Error ? e.message : "request failed");
export const today = () => new Date().toISOString().slice(0, 10);

/** GET a list once and expose reload; errors surface as text, never throw into render. */
export function useList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(
    () =>
      api<T[]>(path)
        .then((rows) => {
          setItems(rows);
          setError("");
        })
        .catch((e) => setError(message(e)))
        .finally(() => setLoading(false)),
    [path],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  return { items, error, loading, reload };
}

export const inputCls =
  "w-full px-4 py-2.5 bg-[#FAFAFC] border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#35079A] focus:outline-none text-sm";
export const cardCls =
  "bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50";
export const primaryBtn =
  "flex items-center px-5 py-2.5 bg-[#35079A] text-white font-semibold rounded-xl hover:bg-[#280575] transition-all shadow-md shadow-indigo-200 hover:-translate-y-0.5 disabled:opacity-50";
export const accentBtn =
  "flex items-center px-5 py-2.5 bg-[#F24416] text-white font-semibold rounded-xl hover:bg-[#D93D13] transition-all shadow-md shadow-orange-200 hover:-translate-y-0.5 disabled:opacity-50";
export const th = "px-6 py-4 text-left text-xs font-bold text-[#798A99] uppercase tracking-wider";

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-48" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#35079A]" />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-extrabold text-[#2E2C32] tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[#798A99]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="mb-6 p-4 text-sm font-semibold text-rose-800 border border-rose-200 rounded-2xl bg-rose-50"
    >
      {children}
    </p>
  );
}

export function Avatar({ name, tone = "indigo" }: { name: string; tone?: "indigo" | "orange" }) {
  const cls =
    tone === "indigo"
      ? "bg-indigo-50 text-[#35079A] border-indigo-100"
      : "bg-orange-50 text-[#F24416] border-orange-100";
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${cls}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-[#2E2C32]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label={title}
        className="bg-white rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-[#FAFAFC]">
          <div className="flex items-center">
            <div className="bg-[#35079A] p-2 rounded-xl mr-3 text-white">{icon}</div>
            <h2 className="text-xl font-bold text-[#2E2C32]">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-[#798A99] hover:text-[#F24416] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}

/** Label with htmlFor, so a select's option text never leaks into the control's accessible name. */
export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-[#2E2C32] mb-2">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}
