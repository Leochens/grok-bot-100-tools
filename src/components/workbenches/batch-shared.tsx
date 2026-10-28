"use client";
import { useRef, useState, type InputHTMLAttributes } from "react";
import { useLanguage } from "../LanguageProvider";
import { Field } from "./shared";
export function BatchError({ code }: { code: string }) {
  const { t } = useLanguage();
  const messages: Record<string, string> = {
    spool: t(
      "Gross weight must be at least the nonnegative tare; reserve must be between 0% and 99%.",
      "总重不能小于空盘重量；空盘重量不能为负，余量需在 0% 到 99% 之间。",
    ),
    jobs: t(
      "Each print needs a nonnegative gram estimate and a positive whole-number copy count.",
      "每项任务的用量须非负，份数须为正整数。",
    ),
    gcode: t(
      "No usable filament total or E extrusion moves found in this text G-code.",
      "此文本 G-code 中未找到可用的耗材总量或 E 挤出指令。",
    ),
    volumetric: t(
      "Volumetric G-code needs a slicer mass/length summary; motion-only parsing is unavailable.",
      "体积挤出 G-code 需要切片器的重量或长度统计，无法仅凭动作估算。",
    ),
    measurement: t(
      "Check the measurement direction and cut count. Kerf must be nonnegative.",
      "请检查内外测量方向和切割数量，切缝不能为负。",
    ),
    dimensions: t(
      "Enter positive material dimensions and a kerf smaller than the thickness.",
      "请输入正数尺寸，切缝须小于材料厚度。",
    ),
    gauge: t(
      "The gauge needs 3–21 slots and a positive step; all compensated slots must have positive width.",
      "梳尺需要 3–21 个槽及正数步进，所有补偿后槽宽必须为正。",
    ),
    "coupon-thickness": t(
      "The finger-joint SVG supports material up to 8 mm. Reduce thickness to export the coupon.",
      "指接 SVG 支持不超过 8 mm 的材料，请减小厚度后导出试片。",
    ),
    hp: t(
      "Use -14 for damage, +8 for healing or a whole number to set HP.",
      "输入 -14 扣血、+8 治疗，或用非负整数设定生命值。",
    ),
    condition: t(
      "Enter a condition name and a duration of 1–10,000 whole rounds.",
      "请输入状态名称及 1–10,000 的整数轮数。",
    ),
    encounter: t(
      "Invalid encounter JSON. Check version 1, unique IDs, HP bounds and condition durations.",
      "遭遇 JSON 无效，请检查版本号 1、唯一 ID、生命值范围及状态时长。",
    ),
    pattern: t(
      "Use {event}, {seq:03d}, {date}, {name} or {ext}; start must be a nonnegative integer.",
      "可使用 {event}、{seq:03d}、{date}、{name}、{ext}；起始序号须为非负整数。",
    ),
    metadata: t(
      "Use one filename, a TAB and an ISO timestamp on each line.",
      "每行请填写文件名、一个制表符和 ISO 时间戳。",
    ),
    timestamp: t(
      "A timestamp is invalid. Use an ISO date/time such as 2026-10-20T09:30:00Z.",
      "时间戳无效，请使用如 2026-10-20T09:30:00Z 的 ISO 日期时间。",
    ),
    bundle: t(
      "Enter a JSON array of objects with string path and content properties.",
      "请输入 JSON 数组，每项需包含字符串 path 与 content。",
    ),
    duplicate: t(
      "Two notes have the same path. Import each vault-relative path only once.",
      "两篇笔记路径重复，同一库内相对路径只能导入一次。",
    ),
    table: t(
      "Use CSV rows: name, positive length, positive width, whole quantity, optional yes/no grain lock.",
      "CSV 每行需包含：名称、正数长度、正数宽度、整数数量，以及可选的 yes/no 纹理锁定。",
    ),
    quote: t(
      "CSV quoting is invalid. Wrap fields in double quotes and double embedded quotes.",
      "CSV 引号格式有误，请用双引号包住字段，字段内双引号写成两个。",
    ),
    kerf: t(
      "Blade kerf must be a finite value from 0 to 100 mm.",
      "锯缝必须为 0 到 100 mm 之间的有限数值。",
    ),
    limit: t(
      "Use at most 2,000 parts and 1,000 stock items per plan.",
      "每次规划最多支持 2,000 个零件和 1,000 件原料。",
    ),
  };
  return code ? (
    <p className="wb-error" role="alert">
      {messages[code] ||
        t(
          "Cannot process this input. Check its format.",
          "无法处理当前输入，请检查格式。",
        )}{" "}
      <code>{code}</code>
    </p>
  ) : null;
}
export function FileDrop({
  onFiles,
  accept,
  folder = false,
  label,
}: {
  onFiles: (files: File[]) => Promise<void> | void;
  accept: string;
  folder?: boolean;
  label: string;
}) {
  const { t } = useLanguage(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    version = useRef(0);
  const receive = async (files: File[]) => {
    const id = ++version.current;
    setBusy(true);
    try {
      if (
        files.length > 3000 ||
        files.reduce((a, f) => a + f.size, 0) > 100 * 1024 * 1024
      )
        throw new Error("Maximum 3000 files / 100 MB");
      await onFiles(files);
      if (id === version.current) setError("");
    } catch (e) {
      if (id === version.current) setError((e as Error).message);
    } finally {
      if (id === version.current) setBusy(false);
    }
  };
  const collect = async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      const f = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject),
      );
      Object.defineProperty(f, "vaultPath", {
        value: entry.fullPath.replace(/^\//, ""),
      });
      return [f];
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    let result: File[] = [];
    for (;;) {
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (!entries.length) break;
      for (const child of entries) {
        result = result.concat(await collect(child));
        if (result.length > 3000) throw new Error("Maximum 3000 files");
      }
    }
    return result;
  };
  return (
    <div
      className="wb-drop"
      onDragOver={(e) => e.preventDefault()}
      onDrop={async (e) => {
        e.preventDefault();
        if (busy) return;
        const items = Array.from(e.dataTransfer.items),
          fallback = Array.from(e.dataTransfer.files);
        try {
          const entries = items
            .map((i) => i.webkitGetAsEntry?.())
            .filter((e): e is FileSystemEntry => !!e);
          await receive(
            entries.length
              ? (await Promise.all(entries.map(collect))).flat()
              : fallback,
          );
        } catch (err) {
          setError((err as Error).message);
        }
      }}
    >
      <p>
        {label} · {t("Drop files here", "将文件拖到这里")}
      </p>
      <Field label={t("Choose local files", "选择本地文件")}>
        <input
          type="file"
          multiple
          accept={accept}
          disabled={busy}
          onChange={(e) => {
            if (e.target.files) void receive(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </Field>
      {folder && (
        <Field label={t("Choose a folder", "选择文件夹")}>
          <input
            type="file"
            multiple
            {...({
              webkitdirectory: "",
            } as InputHTMLAttributes<HTMLInputElement>)}
            disabled={busy}
            onChange={(e) => {
              if (e.target.files) void receive(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </Field>
      )}
      {busy && (
        <p role="status">{t("Reading local files…", "正在读取本地文件……")}</p>
      )}
      {error && (
        <p role="alert">
          {t("File import failed: ", "文件导入失败：")}
          {error}
        </p>
      )}
    </div>
  );
}
export function localFilePath(file: File) {
  return (
    (file as File & { vaultPath?: string }).vaultPath ||
    file.webkitRelativePath ||
    file.name
  );
}
