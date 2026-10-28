"use client";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "../LanguageProvider";

function compatible(value: unknown, schema: unknown): boolean {
  if (typeof value !== typeof schema || value === null) return false;
  if (typeof schema === "number")
    return typeof value === "number" && Number.isFinite(value);
  if (Array.isArray(schema))
    return (
      Array.isArray(value) &&
      value.every((item) => compatible(item, schema[0] ?? ""))
    );
  if (typeof schema === "object" && schema)
    return (
      !Array.isArray(value) &&
      Object.entries(schema).every(([key, shape]) =>
        compatible((value as Record<string, unknown>)[key], shape),
      )
    );
  return true;
}
export function useLocalDraft<T extends object>(
  key: string,
  initial: T,
  arrayItems: Partial<Record<keyof T, unknown>> = {},
) {
  const [state, update] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data: unknown = JSON.parse(raw);
          if (data && typeof data === "object" && !Array.isArray(data)) {
            const valid = { ...initial };
            for (const k of Object.keys(initial) as (keyof T)[]) {
              const v = (data as T)[k];
              if (Array.isArray(initial[k]) && arrayItems[k]) {
                if (
                  Array.isArray(v) &&
                  v.every((item) => compatible(item, arrayItems[k]))
                )
                  valid[k] = v;
              } else if (compatible(v, initial[k])) valid[k] = v;
            }
            update(valid);
          }
        }
      } catch {
        setStored(false);
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
    // Each workbench supplies a constant schema/default; a language switch never reloads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    const save = () => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
        setStored(true);
      } catch {
        setStored(false);
      }
    };
    const timer = setTimeout(save, 180);
    window.addEventListener("pagehide", save);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", save);
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* Reported by the next save. */
      }
    };
  }, [key, state, ready]);
  const set = useCallback(
    (patch: Partial<T> | ((s: T) => T)) =>
      update((s) =>
        typeof patch === "function" ? patch(s) : { ...s, ...patch },
      ),
    [],
  );
  return { state, set, ready, stored, reset: () => update(initial) };
}
export function download(
  name: string,
  content: string | Uint8Array,
  mime = "text/plain;charset=utf-8",
) {
  const part =
    typeof content === "string" ? content : new Uint8Array(content).buffer;
  const url = URL.createObjectURL(new Blob([part], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function LocalStatus({
  stored,
  children,
}: {
  stored: boolean;
  children?: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <p className="wb-status" role="status">
      {children ||
        (stored
          ? t(
              "Draft saved on this device. Files never leave your browser.",
              "草稿保存在这台设备上，文件不会上传。",
            )
          : t(
              "Browser storage is unavailable. Download your work to keep it.",
              "浏览器存储不可用，请下载文件保存进度。",
            ))}
    </p>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="wb-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id: string }>, { id })
        : children}
    </div>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: string | number;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={Number.isNaN(value) ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </Field>
  );
}
export function TextImport({
  value,
  onChange,
  label,
  accept = ".txt",
  disabled = false,
  maxBytes = 10 * 1024 * 1024,
}: {
  value: string;
  onChange: (raw: string) => void;
  label: string;
  accept?: string;
  disabled?: boolean;
  maxBytes?: number;
}) {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const version = useRef(0);
  return (
    <div className="wb-import">
      <Field label={t("Open a local file", "打开本地文件")}>
        <input
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const id = ++version.current;
            try {
              if (file.size > maxBytes) throw new Error("size");
              const raw = await file.text();
              if (id === version.current) {
                onChange(raw);
                setError("");
              }
            } catch {
              setError(
                t(
                  `Cannot read this file (limit ${Math.round(maxBytes / 1024 / 1024)} MB).`,
                  `无法读取文件（最大 ${Math.round(maxBytes / 1024 / 1024)} MB）。`,
                ),
              );
            }
            e.target.value = "";
          }}
        />
      </Field>
      <Field label={label}>
        <textarea
          spellCheck={false}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            version.current++;
            onChange(e.target.value);
          }}
        />
      </Field>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function ExportBar({
  name,
  content,
  disabled = false,
  mime,
}: {
  name: string;
  content: string;
  disabled?: boolean;
  mime?: string;
}) {
  const { t } = useLanguage();
  const [message, setMessage] = useState<"copied" | "failed" | "">("");
  return (
    <div className="wb-export">
      <button
        className="button primary"
        disabled={disabled}
        onClick={() => download(name, content, mime)}
      >
        {t("Download", "下载")} {name}
      </button>
      <button
        className="button"
        disabled={disabled}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content);
            setMessage("copied");
          } catch {
            setMessage("failed");
          }
        }}
      >
        {t("Copy output", "复制结果")}
      </button>
      <span role="status">
        {message === "copied"
          ? t("Copied.", "已复制。")
          : message === "failed"
            ? t(
                "Clipboard unavailable. Use download.",
                "剪贴板不可用，请下载文件。",
              )
            : ""}
      </span>
    </div>
  );
}
