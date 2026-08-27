"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { CONTROL } from "@/components/ui/Field";
import { MAX_ADDRESSES } from "@/lib/contacts/schema";
import { ADDRESS_TYPES, type AddressInput, type AddressType } from "@/lib/contacts/types";

const TYPE_LABELS: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

const EMPTY_ADDRESS: AddressInput = {
  type: "home",
  street: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
};

const PART_FIELDS: {
  key: Exclude<keyof AddressInput, "type">;
  label: string;
  autoComplete: string;
  wide?: boolean;
}[] = [
  { key: "street", label: "Street", autoComplete: "street-address", wide: true },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State / region", autoComplete: "address-level1" },
  { key: "postal_code", label: "Postal code", autoComplete: "postal-code" },
  { key: "country", label: "Country", autoComplete: "country-name" },
];

function parseDefault(value: string | undefined): AddressInput[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as AddressInput[];
  } catch {
    return [];
  }
}

/**
 * Editable list of address rows. The rows are serialized as JSON into a hidden
 * `addresses` input so they travel through the normal form pipeline, where the
 * Zod schema parses and validates each row (and PUT round-trips the full set).
 */
export default function ContactAddressesInput({
  defaultValue,
  error,
}: {
  defaultValue?: string;
  error?: string;
}) {
  const [rows, setRows] = useState<AddressInput[]>(() => parseDefault(defaultValue));

  const errorId = "field-addresses-error";
  const controlClasses = `${CONTROL} border-border focus:border-primary`;

  function updateRow(index: number, patch: Partial<AddressInput>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="addresses" value={JSON.stringify(rows)} />

      {rows.map((row, index) => (
        <div
          key={index}
          className="space-y-4 rounded-lg border border-border bg-card/50 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <label
                htmlFor={`address-${index}-type`}
                className="mb-1.5 block text-[13px] font-medium text-foreground"
              >
                Type
              </label>
              <select
                id={`address-${index}-type`}
                value={row.type}
                onChange={(event) =>
                  updateRow(index, { type: event.target.value as AddressType })
                }
                className={`${controlClasses} w-40`}
              >
                {ADDRESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className={buttonClasses("ghost", "sm")}
              aria-label={`Remove address ${index + 1}`}
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {PART_FIELDS.map((part) => (
              <div key={part.key} className={part.wide ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={`address-${index}-${part.key}`}
                  className="mb-1.5 block text-[13px] font-medium text-foreground"
                >
                  {part.label}
                </label>
                <input
                  id={`address-${index}-${part.key}`}
                  type="text"
                  value={row[part.key] ?? ""}
                  autoComplete={part.autoComplete}
                  onChange={(event) =>
                    updateRow(index, { [part.key]: event.target.value })
                  }
                  className={controlClasses}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {rows.length < MAX_ADDRESSES ? (
        <button
          type="button"
          className={buttonClasses("secondary")}
          aria-describedby={error ? errorId : undefined}
          onClick={() => setRows((current) => [...current, EMPTY_ADDRESS])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add address
        </button>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
