import type { Prisma } from "@prisma/client";
import { pageTenant } from "@/lib/tenant";
import { paging, searchText, type ListParams } from "@/lib/paging";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ListSearch } from "@/components/search/ListSearch";
import { AddCatalogItem, CatalogItemRow } from "@/components/inventory/CatalogItems";

/**
 * The item list of a business that sells without keeping stock in Parallax (manufacturers).
 * Connected buyers see names, forms and packs of the items shown, never the prices.
 */
export default async function ItemsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const t = await pageTenant("catalog");
  const params = await searchParams;
  const { page, take, skip, pageSize } = paging(params);
  const q = searchText(params);
  const text = q ? { contains: q, mode: "insensitive" as const } : undefined;
  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(text ? { OR: [{ name: text }, { sku: text }, { genericName: text }] } : {}),
  };
  const [items, total] = await Promise.all([
    t.db.product.findMany({ where, orderBy: { name: "asc" }, take, skip }),
    t.db.product.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Items"
        description="What you make or supply. Connected buyers see the names of shown items when they write an inquiry; your prices stay private until you quote."
        action={t.readOnly ? null : <AddCatalogItem />}
      />
      <section className="rounded-2xl border border-pine-900/10 bg-white p-5 shadow-panel">
        <div className="mb-4 max-w-md">
          <ListSearch placeholder="Search items" />
        </div>
        <div className="overflow-x-auto">
          <table className="table-grid min-w-[760px]">
            <thead>
              <tr>
                <th>Stock code</th>
                <th>Item</th>
                <th>Pack</th>
                <th>List price</th>
                <th>Buyers</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <CatalogItemRow
                  key={item.id}
                  readOnly={t.readOnly}
                  item={{
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    genericName: item.genericName ?? "",
                    form: item.form ?? "",
                    strength: item.strength ?? "",
                    unit: item.unit,
                    sellingPrice: item.sellingPrice,
                    offered: item.offered,
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} basePath="/items" params={params} />
      </section>
    </div>
  );
}
