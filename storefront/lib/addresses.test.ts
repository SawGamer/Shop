import { describe, expect, it } from "vitest";
import { describeAddress, parseAddressForm, pickDefaultAddress, savedAddressToFields } from "./addresses";
import type { SavedAddress } from "./types";

const home: SavedAddress = {
  id: "1",
  label: "Home",
  isDefault: true,
  fullName: "Erika Mustermann",
  line1: "Hauptstraße 1",
  line2: null,
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
  phone: null,
};
const work: SavedAddress = { ...home, id: "2", label: null, isDefault: false, line2: "3rd floor", phone: "0170 1", city: "Wien", country: "AT" };

describe("savedAddressToFields", () => {
  it("maps a saved address to form field strings", () => {
    expect(savedAddressToFields(work)).toEqual({
      fullName: "Erika Mustermann",
      line1: "Hauptstraße 1",
      line2: "3rd floor",
      postalCode: "10115",
      city: "Wien",
      country: "AT",
      phone: "0170 1",
    });
  });

  it("turns missing optional parts into empty strings", () => {
    const fields = savedAddressToFields(home);
    expect(fields.line2).toBe("");
    expect(fields.phone).toBe("");
  });
});

describe("pickDefaultAddress", () => {
  it("prefers the marked default, then the first, then nothing", () => {
    expect(pickDefaultAddress([work, home])).toBe(home);
    expect(pickDefaultAddress([{ ...work }])).toEqual(work);
    expect(pickDefaultAddress([])).toBeNull();
  });
});

describe("describeAddress", () => {
  it("shows the label when there is one", () => {
    expect(describeAddress(home)).toBe("Home · Erika Mustermann, Hauptstraße 1, 10115 Berlin");
    expect(describeAddress(work)).toBe("Erika Mustermann, Hauptstraße 1, 10115 Wien");
  });
});

describe("parseAddressForm", () => {
  const valid = {
    label: " Home ",
    fullName: " Erika Mustermann ",
    line1: "Hauptstraße 1",
    line2: "",
    postalCode: "10115",
    city: "Berlin",
    country: "de",
    phone: "",
    isDefault: "on",
  };

  it("builds the API body, trimming and normalising", () => {
    const { value, errors } = parseAddressForm(valid);
    expect(errors).toEqual({});
    expect(value).toEqual({
      label: "Home",
      fullName: "Erika Mustermann",
      line1: "Hauptstraße 1",
      line2: null,
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
      phone: null,
      isDefault: true,
    });
  });

  it("treats a missing checkbox as not default", () => {
    expect(parseAddressForm({ ...valid, isDefault: "" }).value?.isDefault).toBe(false);
  });

  it("reports every missing or invalid field", () => {
    const { value, errors } = parseAddressForm({ country: "Germany" });
    expect(value).toBeUndefined();
    expect(Object.keys(errors).sort()).toEqual(["city", "country", "fullName", "line1", "postalCode"]);
  });

  it("rejects over-long values", () => {
    expect(parseAddressForm({ ...valid, line1: "x".repeat(161) }).errors.line1).toBeDefined();
    expect(parseAddressForm({ ...valid, label: "x".repeat(41) }).errors.label).toBeDefined();
  });
});
