import type { Address, AddressType, Contact } from "./types";

/** Presentation helpers shared by the list, the detail page, and the cards. */

/** Up to two letters for the avatar bubble. */
export function initials(contact: Pick<Contact, "first_name" | "last_name">) {
  return `${contact.first_name.at(0) ?? ""}${contact.last_name.at(0) ?? ""}`
    .toUpperCase()
    .trim();
}

/**
 * Stable hue per contact so the same person keeps the same avatar colour
 * across renders and machines (no randomness, no hydration mismatch).
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

// Rendered on the server and hydrated on the client, so pin the locale and zone
// rather than letting each side pick its own and mismatch.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${TIMESTAMP_FORMAT.format(date)} UTC`;
}

/** "Ada Lovelace · Mathematician at Analytical Engines"-style subtitle. */
export function jobLine(contact: Contact): string | null {
  if (contact.job_title && contact.company) {
    return `${contact.job_title} at ${contact.company}`;
  }
  return contact.job_title ?? contact.company ?? null;
}

/** Single-line postal address, skipping the parts that are not filled in. */
export function addressLine(address: Omit<Address, "id" | "type">): string | null {
  const parts = [
    address.street,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(" "),
    address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.length ? parts.join(", ") : null;
}

/**
 * Google Maps search for pizza delivery near the address, `+` for spaces:
 * `https://www.google.com/maps/search/pizza+delivery+near+1600+15th+St+San+Francisco+CA+94103`
 */
export function pizzaSearchUrl(
  address: Pick<Address, "street" | "city" | "state" | "postal_code">,
): string {
  const place = [address.street, address.city, address.state, address.postal_code]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");

  const query = `pizza delivery near ${place}`;
  return `https://www.google.com/maps/search/${encodeURIComponent(query).replace(/%20/g, "+")}`;
}

/** A contact's addresses bucketed by type, in display order, empty types dropped. */
export function addressesByType(
  addresses: Address[],
): [AddressType, Address[]][] {
  const order: AddressType[] = ["home", "work", "other"];
  return order
    .map((type): [AddressType, Address[]] => [
      type,
      addresses.filter((address) => address.type === type),
    ])
    .filter(([, items]) => items.length > 0);
}
