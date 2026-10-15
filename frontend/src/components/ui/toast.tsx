"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "error" | "success" | "warning" | "info" | "default";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

function dispatchToast(type: ToastType, message: string, titleOrOpts?: string | { title?: string; duration?: number }) {
  const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  let title: string | undefined;
  let duration = 4500;

  if (typeof titleOrOpts === "string") {
    title = titleOrOpts;
  } else if (titleOrOpts) {
    title = titleOrOpts.title;
    if (titleOrOpts.duration) duration = titleOrOpts.duration;
  }

  const toastItem: ToastItem = { id, type, message, title, duration };
  listeners.forEach((listener) => listener(toastItem));
  return id;
}

// ponytail: lightweight, dependency-free Shadcn-styled toast dispatcher
export const toast = Object.assign(
  (message: string, opts?: { title?: string; duration?: number }) => dispatchToast("default", message, opts),
  {
    error: (message: string, titleOrOpts?: string | { title?: string; duration?: number }) =>
      dispatchToast("error", message, titleOrOpts),
    success: (message: string, titleOrOpts?: string | { title?: string; duration?: number }) =>
      dispatchToast("success", message, titleOrOpts),
    warning: (message: string, titleOrOpts?: string | { title?: string; duration?: number }) =>
      dispatchToast("warning", message, titleOrOpts),
    info: (message: string, titleOrOpts?: string | { title?: string; duration?: number }) =>
      dispatchToast("info", message, titleOrOpts),
  }
);

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (item: ToastItem) => {
      setToasts((prev) => [...prev, item]);

      if (item.duration !== 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, item.duration || 4500);
      }
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const isError = t.type === "error";
          const isSuccess = t.type === "success";
          const isWarning = t.type === "warning";

          const bgStyle = isError
            ? "bg-[#2A0E0B] border-[#7F1D1D]/80 text-[#FEE2E2]"
            : isSuccess
            ? "bg-[#0E2413] border-[#166534]/80 text-[#DCFCE7]"
            : isWarning
            ? "bg-[#2B1D09] border-[#B45309]/80 text-[#FEF3C7]"
            : "bg-[#1E1714] border-[#E8AA62]/40 text-[#FAF8F5]";

          const iconColor = isError
            ? "text-[#EF4444]"
            : isSuccess
            ? "text-[#22C55E]"
            : isWarning
            ? "text-[#F59E0B]"
            : "text-[#E8AA62]";

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.92, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 select-none touch-manipulation ${bgStyle}`}
              role="alert"
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className={`w-5 h-5 ${iconColor}`} />}
                {isSuccess && <CheckCircle2 className={`w-5 h-5 ${iconColor}`} />}
                {isWarning && <AlertTriangle className={`w-5 h-5 ${iconColor}`} />}
                {!isError && !isSuccess && !isWarning && <Info className={`w-5 h-5 ${iconColor}`} />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-bold font-sans uppercase tracking-wider leading-none mb-1 text-white/90">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs font-medium leading-relaxed font-sans break-words">{t.message}</p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/50 hover:text-white rounded-md p-1 transition-colors hover:bg-white/10 active:scale-95 cursor-pointer touch-manipulation"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
