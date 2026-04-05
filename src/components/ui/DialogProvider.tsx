import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type DialogState =
  | {
      kind: "alert";
      title: string;
      message: string;
      confirmText: string;
      resolve: () => void;
    }
  | {
      kind: "confirm";
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      danger: boolean;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      title: string;
      message: string;
      confirmText: string;
      cancelText: string;
      placeholder: string;
      value: string;
      resolve: (value: string | null) => void;
    };

interface DialogApi {
  alertDialog: (message: string, options?: { title?: string; confirmText?: string }) => Promise<void>;
  confirmDialog: (
    message: string,
    options?: { title?: string; confirmText?: string; cancelText?: string; danger?: boolean }
  ) => Promise<boolean>;
  promptDialog: (
    message: string,
    defaultValue?: string,
    options?: { title?: string; confirmText?: string; cancelText?: string; placeholder?: string }
  ) => Promise<string | null>;
  toast: (message: string, type?: ToastType) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within DialogProvider");
  }
  return context;
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const alertDialog = useCallback<DialogApi["alertDialog"]>((message, options) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: "alert",
        title: options?.title || "Notice",
        message,
        confirmText: options?.confirmText || "OK",
        resolve,
      });
    });
  }, []);

  const confirmDialog = useCallback<DialogApi["confirmDialog"]>((message, options) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: "confirm",
        title: options?.title || "Please confirm",
        message,
        confirmText: options?.confirmText || "Confirm",
        cancelText: options?.cancelText || "Cancel",
        danger: Boolean(options?.danger),
        resolve,
      });
    });
  }, []);

  const promptDialog = useCallback<DialogApi["promptDialog"]>((message, defaultValue = "", options) => {
    return new Promise<string | null>((resolve) => {
      setDialog({
        kind: "prompt",
        title: options?.title || "Enter value",
        message,
        confirmText: options?.confirmText || "Save",
        cancelText: options?.cancelText || "Cancel",
        placeholder: options?.placeholder || "",
        value: defaultValue,
        resolve,
      });
    });
  }, []);

  const value = useMemo(
    () => ({
      alertDialog,
      confirmDialog,
      promptDialog,
      toast,
    }),
    [alertDialog, confirmDialog, promptDialog, toast]
  );

  const closeDialog = () => setDialog(null);

  const renderDialog = () => {
    if (!dialog) return null;

    const isPrompt = dialog.kind === "prompt";
    const isConfirm = dialog.kind === "confirm";
    const confirmButtonClass = isConfirm && dialog.danger
      ? "bg-red-600 hover:bg-red-700"
      : "bg-teal-600 hover:bg-teal-700";

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">{dialog.title}</h3>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{dialog.message}</p>

            {isPrompt && (
              <input
                autoFocus
                value={dialog.value}
                placeholder={dialog.placeholder}
                onChange={(e) => setDialog((prev) => (prev && prev.kind === "prompt" ? { ...prev, value: e.target.value } : prev))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    dialog.resolve(dialog.value.trim());
                    closeDialog();
                  }
                  if (e.key === "Escape") {
                    dialog.resolve(null);
                    closeDialog();
                  }
                }}
                className="w-full mt-4 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            )}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-2">
            {dialog.kind !== "alert" && (
              <button
                onClick={() => {
                  if (dialog.kind === "confirm") dialog.resolve(false);
                  if (dialog.kind === "prompt") dialog.resolve(null);
                  closeDialog();
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
              >
                {dialog.cancelText}
              </button>
            )}
            <button
              onClick={() => {
                if (dialog.kind === "alert") dialog.resolve();
                if (dialog.kind === "confirm") dialog.resolve(true);
                if (dialog.kind === "prompt") dialog.resolve(dialog.value.trim());
                closeDialog();
              }}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${confirmButtonClass}`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getToastIcon = (type: ToastType) => {
    if (type === "success") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (type === "error") return <XCircle className="h-4 w-4 text-red-600" />;
    return <Info className="h-4 w-4 text-blue-600" />;
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {renderDialog()}
      <div className="fixed top-4 right-4 z-[110] space-y-2 w-[320px] max-w-[90vw]">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="bg-white border shadow-sm rounded-lg px-3 py-2 flex items-start gap-2"
          >
            {getToastIcon(item.type)}
            <span className="text-sm text-gray-800">{item.message}</span>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
};
