"use client";

import { FileIcon, UploadIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/registry/default/lib/utils";
import { Button } from "@/registry/default/ui/button";

type DropzoneRejectionReason = "type" | "size" | "count";

interface DropzoneRejection {
  file: File;
  reason: DropzoneRejectionReason;
}

interface DropzoneLabels {
  /** The text of the drop area. Defaults to "Drop files here or " followed by `browse`. */
  prompt: ReactNode;
  /** The emphasised last word of the default prompt. */
  browse: ReactNode;
  /** A second line under the prompt: accepted types, size limit. */
  hint: ReactNode;
  /** Accessible name of the list of chosen files. */
  files: string;
  /** Accessible name of a file's remove button. */
  remove: (name: string) => string;
  /** Shown when a file does not match `accept`. */
  rejectedType: (name: string) => string;
  /** Shown when a file is larger than `maxSize`; gets the formatted limit. */
  rejectedSize: (name: string, maxSize: string) => string;
  /** Shown when a file would go over `maxFiles` (1 without `multiple`). */
  rejectedCount: (name: string, maxFiles: number) => string;
}

const DEFAULT_LABELS: Omit<DropzoneLabels, "prompt" | "hint"> = {
  browse: "browse",
  files: "Chosen files",
  remove: (name) => `Remove ${name}`,
  rejectedType: (name) => `${name} is not an accepted file type.`,
  rejectedSize: (name, maxSize) => `${name} is larger than ${maxSize}.`,
  rejectedCount: (name, maxFiles) =>
    maxFiles === 1
      ? `${name} was not added: only one file is allowed.`
      : `${name} was not added: up to ${maxFiles} files are allowed.`,
};

/**
 * Formats a byte count with the locale's kilobyte or megabyte unit
 * ("340 kB", "1.2 MB"), in decimal units.
 *
 * @example
 * formatFileSize(1_250_000); // "1.3 MB"
 */
function formatFileSize(bytes: number, locale?: Intl.LocalesArgument) {
  const mega = bytes >= 1_000_000;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: mega ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(mega ? bytes / 1_000_000 : bytes / 1_000);
}

/**
 * Whether a file matches an `accept` string the way the file input reads
 * it: comma-separated extensions (".pdf"), MIME types ("image/png") and
 * wildcards ("image/*"). An empty or missing `accept` matches everything.
 */
function matchesAccept(file: File, accept: string | undefined) {
  if (!accept?.trim()) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return accept
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)
    .some((pattern) => {
      if (pattern.startsWith(".")) return name.endsWith(pattern);
      if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
      return type === pattern;
    });
}

function sameFile(a: File, b: File) {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Keeps the input's own FileList in step with the chosen files, so a form
 * submits exactly what is listed. Without DataTransfer it can only be cleared.
 */
function syncInput(input: HTMLInputElement | null, files: File[]) {
  if (!input) return;
  if (typeof DataTransfer !== "undefined") {
    try {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(file);
      input.files = transfer.files;
      return;
    } catch {
      // Some browsers cannot build a DataTransfer by hand.
    }
  }
  if (files.length === 0) input.value = "";
}

interface DropzoneProps extends Omit<ComponentProps<"div">, "onChange" | "defaultValue"> {
  /** Accepted files, in the syntax of the input's `accept` attribute. Checked on drop too. */
  accept?: string;
  /** Allows more than one file. Without it a new file replaces the current one. */
  multiple?: boolean;
  /** Largest accepted file, in bytes. */
  maxSize?: number;
  /** Most files kept at once when `multiple` is set. */
  maxFiles?: number;
  /** Blocks picking and dropping. */
  disabled?: boolean;
  /** Chosen files (controlled). */
  files?: File[];
  /** Chosen files at first (uncontrolled). */
  defaultFiles?: File[];
  /** Called with the full list of chosen files after a pick, drop or removal. */
  onFilesChange?: (files: File[]) => void;
  /** Called with the files that were turned away, and why. */
  onReject?: (rejections: DropzoneRejection[]) => void;
  /** Field name, so the chosen files submit with a form. */
  name?: string;
  /** Id of the file input, for an external `<label htmlFor>`. */
  id?: string;
  /** Makes a file required for form submission. */
  required?: boolean;
  /** Locale for the file sizes. Defaults to the browser's. */
  locale?: Intl.LocalesArgument;
  /** User-facing text. */
  labels?: Partial<DropzoneLabels>;
}

/**
 * An area to drop files on, or to click to pick them, built on a native
 * `<input type="file">`. The input is visually hidden but stays in the Tab
 * order; the drop area is its `<label>`, so Enter, Space or a click open the
 * file picker, and screen readers announce the prompt as the input's name.
 * The area shows the focus ring while the input has keyboard focus and sets
 * `data-dragging` while files are dragged over it (`data-disabled` when
 * disabled). Files are checked against `accept`, `maxSize` and `maxFiles`
 * on both pick and drop; the ones turned away are listed in a `role="alert"`
 * message and passed to `onReject`. Chosen files are listed below with their
 * size and a named remove button; removing one moves focus to the next.
 * With `name`, the input holds the chosen files, so they submit with a form.
 * Only colours transition, and not with reduced motion.
 *
 * @example
 * <Dropzone
 *   name="attachments"
 *   accept="image/*,.pdf"
 *   multiple
 *   maxSize={5_000_000}
 *   labels={{ hint: "Images or PDF, up to 5 MB" }}
 *   onFilesChange={setFiles}
 * />
 */
function Dropzone({
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  files: filesProp,
  defaultFiles,
  onFilesChange,
  onReject,
  name,
  id,
  required,
  locale,
  labels: labelsProp,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: DropzoneProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const errorId = `${generatedId}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const areaRef = useRef<HTMLLabelElement>(null);

  const [internalFiles, setInternalFiles] = useState<File[]>(defaultFiles ?? []);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<DropzoneRejection[]>([]);
  const files = filesProp ?? internalFiles;
  const limit = multiple ? (maxFiles ?? Infinity) : 1;

  useEffect(() => {
    syncInput(inputRef.current, files);
  }, [files]);

  const commit = (next: File[]) => {
    if (filesProp === undefined) setInternalFiles(next);
    onFilesChange?.(next);
    syncInput(inputRef.current, next);
  };

  const addFiles = (incoming: File[]) => {
    const rejected: DropzoneRejection[] = [];
    const valid: File[] = [];
    for (const file of incoming) {
      if (!matchesAccept(file, accept)) rejected.push({ file, reason: "type" });
      else if (maxSize !== undefined && file.size > maxSize)
        rejected.push({ file, reason: "size" });
      else valid.push(file);
    }
    // One file at a time: a new pick replaces the current one.
    let next = multiple ? [...files] : [];
    for (const file of valid) {
      if (next.some((existing) => sameFile(existing, file))) continue;
      if (next.length >= limit) rejected.push({ file, reason: "count" });
      else next = [...next, file];
    }
    setRejections(rejected);
    if (rejected.length) onReject?.(rejected);
    if (valid.length) commit(next);
    else syncInput(inputRef.current, files);
  };

  const removeFile = (index: number) => {
    // Hand focus to the next remove button, the previous one, or the input.
    const buttons = listRef.current?.querySelectorAll<HTMLElement>("[data-slot=dropzone-remove]");
    const target = buttons?.[index + 1] ?? buttons?.[index - 1] ?? inputRef.current;
    setRejections([]);
    commit(files.filter((_, position) => position !== index));
    target?.focus();
  };

  // The drop listeners read the latest props and files through this ref.
  const latest = useRef({ disabled, addFiles });
  useEffect(() => {
    latest.current = { disabled, addFiles };
  });

  // Dropping is an extra on top of the input, so the listeners go on the
  // label natively rather than as JSX handlers on a non-interactive element.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    let depth = 0;
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onDragEnter = (event: DragEvent) => {
      if (latest.current.disabled || !hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = latest.current.disabled ? "none" : "copy";
    };
    const onDragLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      if (latest.current.disabled) return;
      latest.current.addFiles(Array.from(event.dataTransfer?.files ?? []));
    };
    area.addEventListener("dragenter", onDragEnter);
    area.addEventListener("dragover", onDragOver);
    area.addEventListener("dragleave", onDragLeave);
    area.addEventListener("drop", onDrop);
    return () => {
      area.removeEventListener("dragenter", onDragEnter);
      area.removeEventListener("dragover", onDragOver);
      area.removeEventListener("dragleave", onDragLeave);
      area.removeEventListener("drop", onDrop);
    };
  }, []);

  const state = {
    "data-dragging": dragging ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
  };
  const describedBy = [ariaDescribedBy, rejections.length ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      data-slot="dropzone"
      {...state}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        required={required}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy || undefined}
        data-slot="dropzone-input"
        className="peer sr-only"
        onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
      />
      <label
        htmlFor={inputId}
        data-slot="dropzone-area"
        ref={areaRef}
        {...state}
        className={cn(
          "border-input flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm",
          "transition-[color,background-color,border-color,box-shadow] motion-reduce:transition-none",
          "hover:bg-muted/50 data-[dragging]:border-primary data-[dragging]:bg-accent",
          "peer-focus-visible:border-ring peer-focus-visible:ring-ring/50 peer-focus-visible:ring-[3px]",
          "peer-aria-[invalid=true]:border-destructive",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent"
        )}
      >
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full"
        >
          <UploadIcon className="size-5" />
        </span>
        <span data-slot="dropzone-prompt" className="font-medium">
          {labels.prompt ?? (
            <>
              Drop files here or{" "}
              <span className="text-primary underline underline-offset-4">{labels.browse}</span>
            </>
          )}
        </span>
        {labels.hint ? (
          <span data-slot="dropzone-hint" className="text-muted-foreground text-xs">
            {labels.hint}
          </span>
        ) : null}
      </label>
      {rejections.length ? (
        <div
          id={errorId}
          role="alert"
          data-slot="dropzone-error"
          className="text-destructive flex flex-col gap-1 text-sm"
        >
          {rejections.map(({ file, reason }, index) => (
            <p key={`${fileKey(file)}-${index}`} data-reason={reason}>
              {reason === "type"
                ? labels.rejectedType(file.name)
                : reason === "size"
                  ? labels.rejectedSize(file.name, formatFileSize(maxSize ?? 0, locale))
                  : labels.rejectedCount(file.name, limit)}
            </p>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <ul
          ref={listRef}
          data-slot="dropzone-files"
          aria-label={labels.files}
          className="flex flex-col gap-2"
        >
          {files.map((file, index) => (
            <li
              key={fileKey(file)}
              data-slot="dropzone-file"
              className="bg-card flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <FileIcon aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span data-slot="dropzone-file-size" className="text-muted-foreground shrink-0">
                {formatFileSize(file.size, locale)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-slot="dropzone-remove"
                aria-label={labels.remove(file.name)}
                disabled={disabled}
                onClick={() => removeFile(index)}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export {
  Dropzone,
  formatFileSize,
  matchesAccept,
  type DropzoneLabels,
  type DropzoneProps,
  type DropzoneRejection,
  type DropzoneRejectionReason,
};
