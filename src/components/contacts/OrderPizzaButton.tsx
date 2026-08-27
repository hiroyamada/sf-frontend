"use client";

import { useEffect, useRef, useState } from "react";
import { Pizza } from "lucide-react";
import Button from "@/components/ui/Button";
import { addressLine, pizzaSearchUrl } from "@/lib/contacts/format";
import type { Address, AddressType } from "@/lib/contacts/types";

const TYPE_LABELS: Record<AddressType, string> = {
  home: "Home",
  work: "Work",
  other: "Other",
};

function openOrder(address: Address) {
  window.open(pizzaSearchUrl(address), "_blank", "noopener,noreferrer");
}

/**
 * Find pizza delivery near one of the contact's addresses (Google Maps).
 * One address opens the search directly; several first offer a picker. Without
 * any address the button stays visible but disabled, as a nudge to add one.
 */
export default function OrderPizzaButton({
  addresses,
  contactName,
}: {
  addresses: Address[];
  contactName: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPress(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof MouseEvent &&
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", onPress);
    document.addEventListener("keydown", onPress);
    return () => {
      document.removeEventListener("mousedown", onPress);
      document.removeEventListener("keydown", onPress);
    };
  }, [open]);

  return (
    <span ref={menuRef} className="relative inline-flex">
      <Button
        variant="ghost"
        size="sm"
        disabled={addresses.length === 0}
        aria-label={
          addresses.length === 0
            ? `Add an address to order ${contactName} a pizza`
            : `Order ${contactName} a pizza`
        }
        title={
          addresses.length === 0 ? "Add an address to order a pizza" : undefined
        }
        aria-haspopup={addresses.length > 1 ? "menu" : undefined}
        aria-expanded={addresses.length > 1 ? open : undefined}
        onClick={() => {
          if (addresses.length === 1) {
            openOrder(addresses[0]);
          } else {
            setOpen((current) => !current);
          }
        }}
      >
        <Pizza className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </Button>

      {open ? (
        <span
          role="menu"
          aria-label={`Deliver to which of ${contactName}'s addresses?`}
          className="absolute right-0 top-full z-10 mt-1 w-64 rounded-md border border-border bg-card p-1 shadow-lg"
        >
          {addresses.map((address) => (
            <button
              key={address.id}
              type="button"
              role="menuitem"
              className="block w-full rounded px-2.5 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-secondary/60"
              onClick={() => {
                setOpen(false);
                openOrder(address);
              }}
            >
              <span className="font-medium">{TYPE_LABELS[address.type]}</span>
              <span className="block truncate text-muted-foreground">
                {addressLine(address) ?? "No details"}
              </span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}
