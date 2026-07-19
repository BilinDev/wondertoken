"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { CloseIcon } from "@/components/design/icons";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DOT: Record<ToastType, string> = {
  success: "bg-up",
  error: "bg-danger",
  warning: "bg-warn",
};

// Spoken prefix so the toast state doesn't rely on dot color alone.
const TOAST_SR_LABEL: Record<ToastType, string> = {
  success: "Success:",
  error: "Error:",
  warning: "Warning:",
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastMessage = useRef<string>("");
  const lastTime = useRef<number>(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    // Prevent duplicate toasts within 1s
    const now = Date.now();
    if (message === lastMessage.current && now - lastTime.current < 1000) return;
    lastMessage.current = message;
    lastTime.current = now;

    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-[140px] z-[9999] flex w-full max-w-[min(340px,calc(100vw-32px))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-toast-in items-start gap-2.5 rounded-xl border border-line-2 bg-surface-2 px-3.5 py-3 shadow-pop"
          >
            <span
              className={`mt-[5px] h-[7px] w-[7px] flex-none rounded-full ${TOAST_DOT[toast.type]}`}
            />
            <p className="flex-1 text-[13px] leading-normal text-ink">
              <span className="sr-only">{TOAST_SR_LABEL[toast.type]} </span>
              {toast.message}
            </p>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] text-ink-3 transition-colors hover:text-ink"
            >
              <CloseIcon size={10} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
