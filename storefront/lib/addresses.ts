import { COUNTRIES } from "./format";
import type { SavedAddress, SavedAddressInput } from "./types";

export const MAX_SAVED_ADDRESSES = 10;

/** The address fields of a form, as the strings the inputs hold. */
export type AddressFields = {
  fullName: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
};

/** What a form shows for a saved address; missing parts become empty strings. */
export function savedAddressToFields(a: Pick<SavedAddress, keyof AddressFields>): AddressFields {
  return {
    fullName: a.fullName ?? "",
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    postalCode: a.postalCode ?? "",
    city: a.city ?? "",
    country: a.country ?? "",
    phone: a.phone ?? "",
  };
}

/** The default address, or the first one when none is marked (the API lists the default first). */
export function pickDefaultAddress(list: SavedAddress[]): SavedAddress | null {
  return list.find((a) => a.isDefault) ?? list[0] ?? null;
}

/** One line for a "Use a saved address" option: "Home · Erika Mustermann, Hauptstraße 1, 10115 Berlin". */
export function describeAddress(a: SavedAddress): string {
  const place = `${a.fullName}, ${a.line1}, ${a.postalCode} ${a.city}`;
  return a.label ? `${a.label} · ${place}` : place;
}

const COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

/** Validates the add/edit address form. Returns the API body, or field errors. */
export function parseAddressForm(values: Record<string, string>): {
  value?: SavedAddressInput;
  errors: Record<string, string>;
} {
  const get = (k: string) => (values[k] ?? "").trim();
  const errors: Record<string, string> = {};
  const fullName = get("fullName");
  const line1 = get("line1");
  const postalCode = get("postalCode");
  const city = get("city");
  const country = get("country").toUpperCase();
  if (!fullName) errors.fullName = "Enter the recipient's name";
  else if (fullName.length > 120) errors.fullName = "Use at most 120 characters";
  if (!line1) errors.line1 = "Enter a street and house number";
  else if (line1.length > 160) errors.line1 = "Use at most 160 characters";
  if (get("line2").length > 160) errors.line2 = "Use at most 160 characters";
  if (!postalCode) errors.postalCode = "Enter a postal code";
  else if (postalCode.length > 20) errors.postalCode = "Use at most 20 characters";
  if (!city) errors.city = "Enter a city";
  else if (city.length > 80) errors.city = "Use at most 80 characters";
  if (!COUNTRY_CODES.has(country)) errors.country = "Choose a country";
  if (get("phone").length > 40) errors.phone = "Use at most 40 characters";
  if (get("label").length > 40) errors.label = "Use at most 40 characters";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    value: {
      label: get("label") || null,
      fullName,
      line1,
      line2: get("line2") || null,
      postalCode,
      city,
      country,
      phone: get("phone") || null,
      isDefault: ["on", "true"].includes(get("isDefault")),
    },
  };
}
