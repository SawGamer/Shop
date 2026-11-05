import { NextResponse } from "next/server";
import { isApiError } from "@/lib/api";
import { getOrder } from "@/lib/data";

// Lets the checkout success page poll the order status from the browser
// without ever exposing the access token to client-side code.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(
      { status: order.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const status = isApiError(e) && e.status === 401 ? 401 : 503;
    return NextResponse.json({ error: "unavailable" }, { status });
  }
}
