import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_PAGE_SIZE } from "@/lib/constants";
import { listProducts } from "@/lib/data/public";
import { parseCatalogParams } from "@/lib/search-params";

/**
 * GET /api/products — used by the "Load More" button.
 * Read-only and public: it returns published products only (RLS + filter),
 * served from the same tagged cache as the pages.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = parseCatalogParams(params);
  const offset = Number.parseInt(params.get("offset") ?? "0", 10);
  const limit = Number.parseInt(params.get("limit") ?? String(PUBLIC_PAGE_SIZE), 10);

  const result = await listProducts({
    ...filters,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : PUBLIC_PAGE_SIZE,
  });

  if (result.failed) {
    return NextResponse.json(
      { error: "Products could not be loaded right now. Please try again." },
      { status: 503 },
    );
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
