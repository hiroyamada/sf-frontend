"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/contacts/schema";

/**
 * Photo picker: file input → FileReader → base64 data URL held in a hidden
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

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
    const reader = new FileReader();
    reader.onload = () => {
      setLocalError(undefined);
      setPhoto(String(reader.result));
    };
    reader.readAsDataURL(file);
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
