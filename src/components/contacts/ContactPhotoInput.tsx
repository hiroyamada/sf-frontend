"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/contacts/schema";

/** Avatars render at 80px at most, so anything beyond this is wasted bytes. */
const PHOTO_MAX_DIMENSION = 512;
/** Files already this small skip re-encoding to avoid quality loss for nothing. */
const SKIP_DOWNSCALE_BYTES = 200 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Encode a picked file as a base64 data URL, downscaling to at most 512px on
 * the long edge first so a 2 MB camera photo becomes tens of kilobytes and
 * list responses stay small. GIFs are kept as-is (canvas would flatten the
 * animation), as are files that are already small and small enough in pixels.
 */
async function encodePhoto(file: File): Promise<string> {
  if (file.type === "image/gif") {
    return readAsDataUrl(file);
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  if (scale === 1 && file.size <= SKIP_DOWNSCALE_BYTES) {
    return readAsDataUrl(file);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const webp = canvas.toDataURL("image/webp", 0.85);
  if (webp.startsWith("data:image/webp")) {
    return webp;
  }
  // Safari cannot encode WebP; PNG keeps transparency intact.
  return canvas.toDataURL("image/png");
}

/**
 * Photo picker: file input → downscale → base64 data URL held in a hidden
 * `photo` input, so the photo travels through the normal form pipeline. The
 * hidden input also round-trips the existing photo on edit, where saving is a
 * full replace — without it, every edit would silently clear the photo.
 */
export default function ContactPhotoInput({
  defaultValue,
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const [photo, setPhoto] = useState(defaultValue ?? "");
  const [localError, setLocalError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const message = localError ?? error;
  const errorId = "field-photo-error";

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      setLocalError("Choose a PNG, JPEG, GIF, or WebP image.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setLocalError("Choose an image under 2 MB.");
      return;
    }
    try {
      const encoded = await encodePhoto(file);
      setLocalError(undefined);
      setPhoto(encoded);
    } catch {
      // createImageBitmap rejects when the bytes aren't a decodable image.
      setLocalError("That file doesn't look like a valid image.");
    }
  }

  function removePhoto() {
    setPhoto("");
    setLocalError(undefined);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name="photo" value={photo} />
      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_MIME_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChange}
      />

      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- base64 data URL; next/image cannot optimize it
          <img
            src={photo}
            alt="Contact photo preview"
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border bg-input text-muted-foreground"
          >
            <ImagePlus className="h-6 w-6" strokeWidth={1.5} />
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={buttonClasses("secondary")}
            aria-describedby={message ? errorId : undefined}
            onClick={() => fileRef.current?.click()}
          >
            {photo ? "Change photo" : "Upload photo"}
          </button>
          {photo ? (
            <button
              type="button"
              className={buttonClasses("secondary")}
              onClick={removePhoto}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-destructive">
          {message}
        </p>
      ) : null}
    </div>
  );
}
