import { z } from "zod";
import { ADDRESS_TYPES, type AddressInput, type ContactInput } from "./types";

/**
 * Client/server-shared validation for the contact form.
 *
 * The rules mirror the API's Pydantic models (`ContactCreate` / `ContactReplace`)
 * so the user sees a mistake before a round trip — the API stays the authority,
 * and anything it rejects anyway is surfaced by `toFieldErrors` in `./api.ts`.
 */

/** Raw file cap for the photo picker: 2 MB before base64 encoding. */
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
/** Encoded cap, mirroring the API: 2 MB base64-encodes to ~2.8M characters. */
export const PHOTO_MAX_LENGTH = 3_000_000;
/** SVG is deliberately excluded: data:image/svg+xml can carry scripts. */
export const PHOTO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const PHOTO_DATA_URL = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Optional text: trimmed, and blank becomes `null` (the API clears the field). */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .transform((value) => value || null)
    .nullable()
    .default(null);
}

function requiredText(max: number, label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);
}

/** Mirrors the API's per-contact address cap. */
export const MAX_ADDRESSES = 20;

export const addressInputSchema = z.object({
  type: z.enum(ADDRESS_TYPES),
  street: optionalText(300, "Street"),
  city: optionalText(120, "City"),
  state: optionalText(120, "State"),
  postal_code: optionalText(20, "Postal code"),
  country: optionalText(120, "Country"),
}) satisfies z.ZodType<AddressInput, unknown>;

export const contactInputSchema = z.object({
  first_name: requiredText(100, "First name"),
  last_name: requiredText(100, "Last name"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(320, "Email must be 320 characters or fewer")
    .pipe(z.email("Enter a valid email address"))
    .transform((value) => value.toLowerCase()),
  phone: optionalText(40, "Phone"),
  company: optionalText(200, "Company"),
  job_title: optionalText(200, "Job title"),
  // The form serializes the address rows into one hidden JSON input; see
  // ContactAddressesInput. Parse it back before validating each row.
  addresses: z
    .string()
    .transform((value, ctx): unknown => {
      if (!value) return [];
      try {
        return JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Addresses could not be read" });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(addressInputSchema)
        .max(MAX_ADDRESSES, `At most ${MAX_ADDRESSES} addresses per contact`),
    ),
  notes: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable()
    .default(null),
  photo: z
    .string()
    .max(PHOTO_MAX_LENGTH, "Photo is too large — choose an image under 2 MB")
    .refine(
      (value) => value === "" || PHOTO_DATA_URL.test(value),
      "Photo must be a PNG, JPEG, GIF, or WebP image",
    )
    .transform((value) => value || null)
    .nullable()
    .default(null),
}) satisfies z.ZodType<ContactInput, unknown>;

export type ContactFormValues = z.input<typeof contactInputSchema>;

/** Collapse a ZodError into one message per field, keyed by input name. */
export function zodFieldErrors(
  error: z.ZodError,
): Partial<Record<keyof ContactInput, string>> {
  const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof ContactInput] = issue.message;
    }
  }
  return fieldErrors;
}

/* ------------------------------------------------------------------ */
/* Form metadata — one source of truth for the fields and their limits */
/* ------------------------------------------------------------------ */

export interface ContactFieldSpec {
  /** Addresses are structured rows, not a flat string input; see ContactAddressesInput. */
  name: Exclude<keyof ContactInput, "addresses">;
  label: string;
  type?: "text" | "email" | "tel" | "textarea";
  required?: boolean;
  maxLength: number;
  placeholder?: string;
  autoComplete?: string;
  /** Column span inside the section grid. */
  wide?: boolean;
}

export interface ContactFieldGroup {
  title: string;
  description: string;
  fields: ContactFieldSpec[];
}

export const CONTACT_FIELD_GROUPS: ContactFieldGroup[] = [
  {
    title: "Identity",
    description: "First name, last name, and email are required.",
    fields: [
      {
        name: "first_name",
        label: "First name",
        required: true,
        maxLength: 100,
        placeholder: "Ada",
        autoComplete: "given-name",
      },
      {
        name: "last_name",
        label: "Last name",
        required: true,
        maxLength: 100,
        placeholder: "Lovelace",
        autoComplete: "family-name",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        maxLength: 320,
        placeholder: "ada@example.com",
        autoComplete: "email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "tel",
        maxLength: 40,
        placeholder: "+1-415-555-0101",
        autoComplete: "tel",
      },
    ],
  },
  {
    title: "Work",
    description: "Where they work and what they do.",
    fields: [
      {
        name: "company",
        label: "Company",
        maxLength: 200,
        placeholder: "Analytical Engines",
        autoComplete: "organization",
      },
      {
        name: "job_title",
        label: "Job title",
        maxLength: 200,
        placeholder: "Mathematician",
        autoComplete: "organization-title",
      },
    ],
  },
  {
    title: "Notes",
    description: "Anything worth remembering. No length limit.",
    fields: [
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        maxLength: 10_000,
        placeholder: "Met at the SF hackathon.",
        wide: true,
      },
    ],
  },
];

export const CONTACT_FIELDS: ContactFieldSpec[] = CONTACT_FIELD_GROUPS.flatMap(
  (group) => group.fields,
);

/**
 * Inputs rendered outside the metadata-driven groups
 * (see ContactPhotoInput and ContactAddressesInput).
 */
export const EXTRA_FIELD_NAMES: (keyof ContactInput)[] = ["photo", "addresses"];

/** Pull the contact fields out of a submitted form, as raw strings. */
export function formDataToValues(
  formData: FormData,
): Record<keyof ContactInput, string> {
  const names = [
    ...CONTACT_FIELDS.map((field) => field.name),
    ...EXTRA_FIELD_NAMES,
  ];
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  ) as Record<keyof ContactInput, string>;
}
