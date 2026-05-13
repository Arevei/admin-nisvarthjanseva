"use client";

import { useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
};

export function CloudinaryUpload({ value, onChange, label }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Upload failed");
      }

      onChange(payload.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="rounded-xl border border-dashed border-rose-300 bg-rose-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-zinc-600">Upload image to Cloudinary</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-rose-400 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Choose Image"}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
      </div>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://..."
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-rose-500"
      />

      {value && (
        <img src={value} alt="Uploaded preview" className="h-44 w-full rounded-lg border border-zinc-200 object-cover" />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
