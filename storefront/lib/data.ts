import "server-only";
import { api, apiRequest, isApiError } from "./api";
import { toApiQuery, type SearchQuery } from "./search";
import type {
  AdminProduct,
  AdminProductSummary,
  Brand,
  Cart,
  Category,
  Dashboard,
  Order,
  OrderStatus,
  OrderSummary,
  Page,
  ProductDetail,
  ProductStatus,
  SearchResponse,
} from "./types";

// Public catalog reads are anonymous and cached for a short time so they can be
// shared across visitors; everything personal is fetched with no-store.
const CATALOG_TTL = 60;
const TAXONOMY_TTL = 300;

export async function getCategories(): Promise<Category[]> {
  return api<Category[]>("/api/v1/categories", {
    auth: false,
    revalidate: TAXONOMY_TTL,
    tags: ["catalog"],
  });
}

export async function getBrands(): Promise<Brand[]> {
  return api<Brand[]>("/api/v1/brands", { auth: false, revalidate: TAXONOMY_TTL, tags: ["catalog"] });
}

/** Uncached brand list for admin screens. */
export async function getBrandsFresh(): Promise<Brand[]> {
  return api<Brand[]>("/api/v1/brands", { auth: false });
}

export async function searchProducts(q: SearchQuery, pageSize?: number): Promise<SearchResponse> {
  return api<SearchResponse>("/api/v1/products", {
    auth: false,
    revalidate: CATALOG_TTL,
    tags: ["catalog"],
    query: toApiQuery(q, pageSize),
  });
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await api<ProductDetail>(`/api/v1/products/${encodeURIComponent(slug)}`, {
      auth: false,
      revalidate: CATALOG_TTL,
      tags: ["catalog", `product:${slug}`],
    });
  } catch (e) {
    if (isApiError(e, "NOT_FOUND")) return null;
    throw e;
  }
}

/** The visitor's cart (guest or user). Rendering cannot set cookies, so this never does. */
export async function getCart(): Promise<Cart> {
  const { data } = await apiRequest<Cart>("/api/v1/cart", { cart: true });
  return data;
}

export async function getCartSafe(): Promise<Cart | null> {
  try {
    return await getCart();
  } catch {
    return null;
  }
}

export async function getMyOrders(page = 0, pageSize = 20): Promise<Page<OrderSummary>> {
  return api<Page<OrderSummary>>("/api/v1/orders", { query: { page, pageSize } });
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    return await api<Order>(`/api/v1/orders/${encodeURIComponent(id)}`);
  } catch (e) {
    if (isApiError(e, "NOT_FOUND") || isApiError(e, "FORBIDDEN")) return null;
    throw e;
  }
}

// ---- Admin ----

export async function getDashboard(): Promise<Dashboard> {
  return api<Dashboard>("/api/v1/admin/dashboard");
}

export async function getAdminProducts(params: {
  q?: string;
  status?: ProductStatus | "";
  page?: number;
  pageSize?: number;
}): Promise<Page<AdminProductSummary>> {
  return api<Page<AdminProductSummary>>("/api/v1/admin/products", {
    query: {
      q: params.q,
      status: params.status,
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 25,
    },
  });
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  try {
    return await api<AdminProduct>(`/api/v1/admin/products/${encodeURIComponent(id)}`);
  } catch (e) {
    if (isApiError(e, "NOT_FOUND")) return null;
    throw e;
  }
}

export async function getAdminCategories(): Promise<Category[]> {
  return api<Category[]>("/api/v1/admin/categories");
}

export async function getAdminOrders(params: {
  status?: OrderStatus | "";
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<OrderSummary>> {
  return api<Page<OrderSummary>>("/api/v1/admin/orders", {
    query: {
      status: params.status,
      q: params.q,
      page: params.page ?? 0,
      pageSize: params.pageSize ?? 25,
    },
  });
}

export async function getAdminOrder(id: string): Promise<Order | null> {
  try {
    return await api<Order>(`/api/v1/admin/orders/${encodeURIComponent(id)}`);
  } catch (e) {
    if (isApiError(e, "NOT_FOUND")) return null;
    throw e;
  }
}
