import { NextResponse } from "next/server";
import { apiTenant } from "@/lib/tenant";
import { saveItems } from "@/lib/items";
import { csvToLines, tableToLines } from "@/lib/stocksheet";
import { readItemsWorkbook } from "@/lib/xlsx";

const MAX_BYTES = 5 * 1024 * 1024;

/** Imports items from an uploaded Excel template (.xlsx) or CSV file. */
export async function POST(request: Request) {
  const auth = await apiTenant("catalog");
  if (!auth.ok) return auth.response;
  const { t } = auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "The file is larger than 5 MB." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  let parsed: ReturnType<typeof tableToLines>;
  try {
    if (name.endsWith(".xlsx")) {
      parsed = tableToLines(await readItemsWorkbook(await file.arrayBuffer()));
    } else if (name.endsWith(".csv")) {
      parsed = csvToLines(await file.text());
    } else {
      return NextResponse.json({ error: "Upload the Excel template (.xlsx) or a .csv file." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "That file couldn't be read. Save it as .xlsx and try again." }, { status: 400 });
  }
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.lines.length > 2000) {
    return NextResponse.json({ error: "Import up to 2,000 items at a time." }, { status: 400 });
  }

  return NextResponse.json(await saveItems(t, parsed.lines));
}
