"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { api } from "@/lib/api";
import { fail, ok, optStr, str, type ActionState } from "@/lib/action-state";
import { toActionState } from "@/lib/action-errors";
import { assertAdmin } from "@/lib/auth";
import { parsePriceToCents } from "@/lib/money";
import type {
  AdminProduct,
  Brand,
  Category,
  InventoryLevel,
  Order,
  ProductStatus,
  ProductUpsert,
  ShopSettings,
  ShopSettingsUpdate,
  VariantUpsert,
} from "@/lib/types";
import { isThemeId } from "@/lib/themes";

const STATUSES: ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);

/** Admin writes change what shoppers see, so expire the cached catalog immediately. */
function catalogChanged(): void {
  updateTag("catalog");
}

function parseProduct(fd: FormData): { value?: ProductUpsert; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const name = str(fd, "name");
  const slug = str(fd, "slug");
  const brandId = str(fd, "brandId");
  const status = str(fd, "status") as ProductStatus;
  const categoryIds = fd.getAll("categoryIds").filter((v): v is string => typeof v === "string" && v !== "");
  if (!name) errors.name = "Enter a product name";
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = "Use lowercase letters, numbers and dashes";
  if (!brandId) errors.brandId = "Choose a brand";
  if (!STATUSES.includes(status)) errors.status = "Choose a status";
  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      name,
      ...(slug ? { slug } : {}),
      description: str(fd, "description"),
      brandId,
      categoryIds,
      status,
    },
  };
}

function parseVariant(fd: FormData, withStock: boolean): { value?: VariantUpsert; errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  const sku = str(fd, "sku");
  const price = parsePriceToCents(str(fd, "price"));
  const compareRaw = str(fd, "compareAtPrice");
  const compare = compareRaw ? parsePriceToCents(compareRaw) : null;
  if (!sku) errors.sku = "Enter a SKU";
  if (price === null) errors.price = "Enter a price like 129.90";
  if (compareRaw && compare === null) errors.compareAtPrice = "Enter a price like 159.90, or leave empty";
  if (price !== null && compare !== null && compare <= price) {
    errors.compareAtPrice = "Must be higher than the price";
  }
  let onHand: number | undefined;
  if (withStock) {
    const raw = str(fd, "onHand") || "0";
    onHand = Number(raw);
    if (!Number.isInteger(onHand) || onHand < 0) errors.onHand = "Enter a whole number, 0 or more";
  }
  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      sku,
      size: optStr(fd, "size"),
      color: optStr(fd, "color"),
      priceCents: price!,
      compareAtPriceCents: compare,
      ...(withStock ? { onHand } : {}),
    },
  };
}

// ---- Products ----

export async function createProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseProduct(fd);
  if (!parsed.value) return fail("Check the highlighted fields.", parsed.errors);
  let created: AdminProduct;
  try {
    await assertAdmin();
    created = await api<AdminProduct>("/api/v1/admin/products", { method: "POST", body: parsed.value });
  } catch (e) {
    return toActionState(e, "We couldn't create the product.");
  }
  catalogChanged();
  redirect(`/admin/products/${created.id}?created=1`);
}

export async function updateProduct(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseProduct(fd);
  if (!parsed.value) return fail("Check the highlighted fields.", parsed.errors);
  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${id}`, { method: "PUT", body: parsed.value });
  } catch (e) {
    return toActionState(e, "We couldn't save the product.");
  }
  catalogChanged();
  refresh();
  return ok("Product saved.");
}

export async function archiveProduct(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<void>(`/api/v1/admin/products/${id}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't archive the product.");
  }
  catalogChanged();
  redirect("/admin/products?archived=1");
}

// ---- Variants & stock ----

export async function addVariant(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = parseVariant(fd, true);
  if (!parsed.value) return fail("Check the new variant's fields.", parsed.errors);
  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${productId}/variants`, {
      method: "POST",
      body: parsed.value,
    });
  } catch (e) {
    return toActionState(e, "We couldn't add the variant.");
  }
  catalogChanged();
  refresh();
  return ok("Variant added.");
}

export async function updateVariant(
  productId: string,
  variantId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const parsed = parseVariant(fd, false);
  if (!parsed.value) return fail("Check the variant's fields.", parsed.errors);
  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
      method: "PUT",
      body: parsed.value,
    });
  } catch (e) {
    return toActionState(e, "We couldn't save the variant.");
  }
  catalogChanged();
  refresh();
  return ok("Saved.");
}

export async function deleteVariant(productId: string, variantId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${productId}/variants/${variantId}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete the variant.");
  }
  catalogChanged();
  refresh();
  return ok("Variant deleted.");
}

export async function setStock(variantId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const onHand = Number(str(fd, "onHand"));
  if (!Number.isInteger(onHand) || onHand < 0) return fail("Enter a whole number, 0 or more.", { onHand: "Invalid" });
  try {
    await assertAdmin();
    await api<InventoryLevel>(`/api/v1/admin/inventory/${variantId}`, { method: "PUT", body: { onHand } });
  } catch (e) {
    return toActionState(e, "We couldn't update the stock.");
  }
  catalogChanged();
  refresh();
  return ok("Stock updated.");
}

// ---- Images ----

export async function uploadImage(productId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.", { file: "Required" });
  if (!IMAGE_TYPES.has(file.type)) return fail("Upload a JPEG, PNG or GIF image.", { file: "Unsupported type" });
  if (file.size > MAX_IMAGE_BYTES) return fail("Images can be up to 10 MB.", { file: "Too large" });

  const body = new FormData();
  body.append("file", file, file.name);
  const alt = str(fd, "alt");
  if (alt) body.append("alt", alt);

  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${productId}/images`, { method: "POST", formData: body });
  } catch (e) {
    return toActionState(e, "We couldn't upload the image.");
  }
  catalogChanged();
  refresh();
  return ok("Image uploaded.");
}

export async function deleteImage(productId: string, imageId: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<AdminProduct>(`/api/v1/admin/products/${productId}/images/${imageId}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete the image.");
  }
  catalogChanged();
  refresh();
  return ok("Image deleted.");
}

// ---- Categories & brands ----

function parseTaxonomy(fd: FormData, withParent: boolean) {
  const name = str(fd, "name");
  const slug = str(fd, "slug");
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter a name";
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = "Use lowercase letters, numbers and dashes";
  const body: Record<string, unknown> = { name };
  if (slug) body.slug = slug;
  if (withParent) body.parentId = optStr(fd, "parentId");
  return { body, errors };
}

export async function createCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { body, errors } = parseTaxonomy(fd, true);
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);
  try {
    await assertAdmin();
    await api<Category>("/api/v1/admin/categories", { method: "POST", body });
  } catch (e) {
    return toActionState(e, "We couldn't create the category.");
  }
  catalogChanged();
  refresh();
  return ok("Category created.");
}

export async function updateCategory(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { body, errors } = parseTaxonomy(fd, true);
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);
  if (body.parentId === id) return fail("A category can't be its own parent.", { parentId: "Invalid" });
  try {
    await assertAdmin();
    await api<Category>(`/api/v1/admin/categories/${id}`, { method: "PUT", body });
  } catch (e) {
    return toActionState(e, "We couldn't save the category.");
  }
  catalogChanged();
  refresh();
  return ok("Saved.");
}

export async function deleteCategory(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<void>(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't delete the category.");
  }
  catalogChanged();
  refresh();
  return ok("Category deleted.");
}

export async function createBrand(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { body, errors } = parseTaxonomy(fd, false);
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);
  try {
    await assertAdmin();
    await api<Brand>("/api/v1/admin/brands", { method: "POST", body });
  } catch (e) {
    return toActionState(e, "We couldn't create the brand.");
  }
  catalogChanged();
  refresh();
  return ok("Brand created.");
}

export async function updateBrand(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { body, errors } = parseTaxonomy(fd, false);
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);
  try {
    await assertAdmin();
    await api<Brand>(`/api/v1/admin/brands/${id}`, { method: "PUT", body });
  } catch (e) {
    return toActionState(e, "We couldn't save the brand.");
  }
  catalogChanged();
  refresh();
  return ok("Saved.");
}

export async function deleteBrand(id: string, _prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<void>(`/api/v1/admin/brands/${id}`, { method: "DELETE" });
  } catch (e) {
    const state = toActionState(e, "We couldn't delete the brand.");
    if (state.message?.startsWith("That clashes")) {
      return fail("Products still use this brand. Move them to another brand first.");
    }
    return state;
  }
  catalogChanged();
  refresh();
  return ok("Brand deleted.");
}

// ---- Orders & search ----

export async function setOrderStatus(
  orderId: string,
  status: "SHIPPED" | "DELIVERED" | "CANCELLED",
  _prev: ActionState,
): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<Order>(`/api/v1/admin/orders/${orderId}/status`, { method: "POST", body: { status } });
  } catch (e) {
    return toActionState(e, "We couldn't change the order status.");
  }
  refresh();
  const label = status === "SHIPPED" ? "shipped" : status === "DELIVERED" ? "delivered" : "cancelled";
  return ok(`Order marked as ${label}.`);
}

export async function reindexSearch(_prev: ActionState): Promise<ActionState> {
  let indexed = 0;
  try {
    await assertAdmin();
    ({ indexed } = await api<{ indexed: number }>("/api/v1/admin/search/reindex", { method: "POST" }));
  } catch (e) {
    return toActionState(e, "We couldn't rebuild the search index.");
  }
  catalogChanged();
  return ok(`Search index rebuilt with ${indexed} products.`);
}

// ---- Shop design ----

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** The storefront reads settings under the "shop" tag; expire it so the next navigation shows the change. */
function shopChanged(): void {
  updateTag("shop");
  refresh();
}

export async function saveShopSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = str(fd, "name");
  const tagline = optStr(fd, "tagline");
  const theme = str(fd, "theme");
  const useDefaultAccent = fd.get("accentDefault") === "on";
  const accent = str(fd, "accentColor").toLowerCase();

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter the shop name";
  else if (name.length > 80) errors.name = "Use at most 80 characters";
  if (tagline && tagline.length > 160) errors.tagline = "Use at most 160 characters";
  if (!isThemeId(theme)) errors.theme = "Choose a design";
  if (!useDefaultAccent && !/^#[0-9a-f]{6}$/.test(accent)) errors.accentColor = "Pick a colour";
  if (Object.keys(errors).length) return fail("Check the highlighted fields.", errors);

  const body: ShopSettingsUpdate = { name, tagline, theme, accentColor: useDefaultAccent ? null : accent };
  try {
    await assertAdmin();
    await api<ShopSettings>("/api/v1/admin/shop", { method: "PUT", body });
  } catch (e) {
    return toActionState(e, "We couldn't save the design.");
  }
  shopChanged();
  return ok("Saved. The shop now uses this design.");
}

export async function uploadLogo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a logo to upload.", { file: "Required" });
  if (!IMAGE_TYPES.has(file.type)) return fail("Upload a PNG, JPEG or GIF image.", { file: "Unsupported type" });
  if (file.size > MAX_LOGO_BYTES) return fail("Logos can be up to 2 MB.", { file: "Too large" });
  const body = new FormData();
  body.append("file", file, file.name);
  try {
    await assertAdmin();
    await api<ShopSettings>("/api/v1/admin/shop/logo", { method: "POST", formData: body });
  } catch (e) {
    return toActionState(e, "We couldn't upload the logo.");
  }
  shopChanged();
  return ok("Logo uploaded.");
}

export async function removeLogo(_prev: ActionState): Promise<ActionState> {
  try {
    await assertAdmin();
    await api<ShopSettings>("/api/v1/admin/shop/logo", { method: "DELETE" });
  } catch (e) {
    return toActionState(e, "We couldn't remove the logo.");
  }
  shopChanged();
  return ok("Logo removed. The shop name is shown instead.");
}
