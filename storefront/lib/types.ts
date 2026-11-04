// Types mirror docs/api.md (the v1 API contract). Keep them in sync.

export type Money = { cents: number; currency: string };

export type Role = "CUSTOMER" | "ADMIN";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  emailVerified: boolean;
};

export type AuthResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
};

export type Brand = { id: string; slug: string; name: string };
export type CategoryRef = { id: string; slug: string; name: string };
export type Category = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  children: Category[];
};

export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type Variant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: Money;
  compareAtPrice: Money | null;
  available: number;
  inStock: boolean;
};

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  price: Money;
  compareAtPrice: Money | null;
  imageUrl: string | null;
  inStock: boolean;
  sizes: string[];
  colors: string[];
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: Brand;
  categories: CategoryRef[];
  images: ProductImage[];
  sizes: string[];
  colors: string[];
  variants: Variant[];
  price: Money;
  compareAtPrice: Money | null;
  inStock: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type FacetValue = { value: string; label: string; count: number };

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type SearchResponse = Page<ProductSummary> & {
  facets: {
    brand: FacetValue[];
    category: FacetValue[];
    size: FacetValue[];
    color: FacetValue[];
  };
};

export type Address = {
  fullName: string;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
};

export type CartItem = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
  available: number;
  inStock: boolean;
};

export type Cart = {
  id: string | null;
  items: CartItem[];
  itemCount: number;
  subtotal: Money;
  shipping: Money;
  total: Money;
  freeShippingThreshold: Money;
};

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type OrderLine = {
  variantId: string;
  productSlug: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  imageUrl: string | null;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: Money;
  itemCount: number;
  createdAt: string;
  customerEmail: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerEmail: string;
  lines: OrderLine[];
  subtotal: Money;
  shipping: Money;
  total: Money;
  shippingAddress: Address;
  createdAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  paymentUrl: string | null;
};

export type CheckoutResponse = {
  orderId: string;
  orderNumber: string;
  paymentUrl: string;
};

// ---- Admin ----

export type AdminVariant = Variant & { onHand: number; reserved: number };

export type AdminProduct = Omit<ProductDetail, "variants"> & {
  variants: AdminVariant[];
};

export type AdminProductSummary = {
  id: string;
  slug: string;
  name: string;
  brand: Brand;
  status: ProductStatus;
  price: Money | null;
  totalAvailable: number;
  variantCount: number;
  imageUrl: string | null;
  updatedAt: string;
};

export type ProductUpsert = {
  name: string;
  slug?: string;
  description: string;
  brandId: string;
  categoryIds: string[];
  status: ProductStatus;
};

export type VariantUpsert = {
  sku: string;
  size: string | null;
  color: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  onHand?: number;
};

export type InventoryLevel = {
  variantId: string;
  onHand: number;
  reserved: number;
  available: number;
};

export type Dashboard = {
  revenue: { today: Money; last7Days: Money; last30Days: Money };
  orders: {
    today: number;
    last7Days: number;
    last30Days: number;
    pendingPayment: number;
    toShip: number;
  };
  lowStock: {
    variantId: string;
    productId: string;
    productName: string;
    sku: string;
    size: string | null;
    color: string | null;
    available: number;
  }[];
  recentOrders: OrderSummary[];
};

// ---- Errors ----

export type ErrorCode =
  | "VALIDATION_FAILED"
  | "EMPTY_CART"
  | "INVALID_CREDENTIALS"
  | "INVALID_TOKEN"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "INSUFFICIENT_STOCK"
  | "INVALID_STATE_TRANSITION"
  | "CONFLICT"
  | "PAYMENT_PROVIDER_ERROR"
  | "API_UNAVAILABLE"
  | "UNKNOWN";

export type StockProblem = {
  variantId: string;
  requested: number;
  available: number;
};
