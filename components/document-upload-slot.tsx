"use client";

import { useId, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  buildDocumentStoragePath,
  MAX_DOCUMENT_BYTES,
  PRIVATE_DOCUMENTS_BUCKET,
  type DocumentOwnerType,
  type DocumentSlot
} from "@/lib/storage";

type DocumentUploadSlotProps = {
  ownerType: DocumentOwnerType;
  userId: string;
  slot: DocumentSlot;
};

type Status =
  | { kind: "empty" }
  | { kind: "uploading"; fileName: string }
  | { kind: "uploaded"; fileName: string; sizeBytes: number; storagePath: string }
  | { kind: "error"; message: string };

function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function randomSuffix(): string {
  // Browser-native; crypto.randomUUID is available in every supported browser.
  return crypto.randomUUID().slice(0, 12);
}

export function DocumentUploadSlot({
  ownerType,
  userId,
  slot
}: DocumentUploadSlotProps) {
  const fileInputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "empty" });

  const accept = ALLOWED_DOCUMENT_MIME_TYPES.join(",");

  async function handleFile(file: File) {
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setStatus({
        kind: "error",
        message: "Use a PDF or an image (PNG / JPEG / WebP)."
      });
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setStatus({
        kind: "error",
        message: `That file is ${humanBytes(file.size)}. The cap is 10 MB.`
      });
      return;
    }

    const storagePath = buildDocumentStoragePath({
      ownerType,
      userId,
      documentType: slot.documentType,
      mimeType: file.type,
      randomSuffix: randomSuffix()
    });

    setStatus({ kind: "uploading", fileName: file.name });

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from(PRIVATE_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      setStatus({
        kind: "error",
        message: error.message || "Upload failed. Try again."
      });
      return;
    }

    setStatus({
      kind: "uploaded",
      fileName: file.name,
      sizeBytes: file.size,
      storagePath
    });
  }

  function handleClear() {
    setStatus({ kind: "empty" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const storagePath = status.kind === "uploaded" ? status.storagePath : "";
  const slotTestId = `document-slot-${slot.documentType}`;

  return (
    <div
      className="rounded-lg border border-black/10 bg-white p-4"
      data-testid={slotTestId}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={fileInputId} className="font-semibold text-ink">
            {slot.label}
            {slot.required ? (
              <span className="ml-1 text-clay">*</span>
            ) : (
              <span className="ml-2 text-xs font-normal text-black/50">
                (optional)
              </span>
            )}
          </label>
          <p className="mt-1 text-body-sm text-black/55">{slot.helpText}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          id={fileInputId}
          className="block w-full text-sm text-black/70 file:mr-3 file:rounded-md file:border-0 file:bg-mint file:px-3 file:py-2 file:text-sm file:font-semibold file:text-leaf hover:file:bg-mint/80"
          data-testid={`${slotTestId}-file-input`}
          type="file"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {status.kind === "uploaded" ? (
          <button
            type="button"
            className="btn-secondary shrink-0"
            data-testid={`${slotTestId}-clear-button`}
            onClick={handleClear}
          >
            Replace
          </button>
        ) : null}
      </div>

      <p
        className="mt-2 text-xs"
        data-testid={`${slotTestId}-status`}
        data-status={status.kind}
      >
        {status.kind === "empty" ? (
          <span className="text-black/45">PDF or photo, up to 10 MB.</span>
        ) : null}
        {status.kind === "uploading" ? (
          <span className="text-black/70">Uploading {status.fileName}…</span>
        ) : null}
        {status.kind === "uploaded" ? (
          <span className="text-leaf">
            Uploaded — {status.fileName} ({humanBytes(status.sizeBytes)})
          </span>
        ) : null}
        {status.kind === "error" ? (
          <span className="text-red-600">{status.message}</span>
        ) : null}
      </p>

      <input
        type="hidden"
        name={`document_path__${slot.documentType}`}
        value={storagePath}
      />
    </div>
  );
}
