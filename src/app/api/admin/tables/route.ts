import { z } from "zod";
import { getAdminContext } from "@/lib/auth/admin-context";
import { exceedsContentLength, rejectCrossOrigin } from "@/lib/security/request";

const createTableSchema = z.object({
  tableNumber: z.number().int().positive(),
  tagCode: z.string().min(3).max(64).regex(/^[a-z0-9_-]+$/),
  area: z.string().trim().min(1).max(80),
});

const updateTableSchema = z.object({
  id: z.uuid(),
  active: z.boolean(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { data, error } = await context.supabase
    .from("cafeteria_tables")
    .select("id, table_number, tag_code, display_name, active")
    .eq("school_id", context.schoolId)
    .eq("cafeteria_id", context.cafeteriaId)
    .order("table_number");

  if (error) {
    console.error("Unable to load tables:", error.message);
    return Response.json({ error: "Tables could not be loaded." }, { status: 500 });
  }

  return Response.json({
    tables: data.map((table) => ({
      id: table.id,
      tableNumber: table.table_number,
      tagCode: table.tag_code,
      area: table.display_name,
      active: table.active,
    })),
  });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (exceedsContentLength(request, 16 * 1024)) {
    return Response.json({ error: "Table payload is too large." }, { status: 413 });
  }
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = createTableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid table data." }, { status: 400 });

  const { data, error } = await context.supabase
    .from("cafeteria_tables")
    .insert({
      school_id: context.schoolId,
      cafeteria_id: context.cafeteriaId,
      table_number: parsed.data.tableNumber,
      tag_code: parsed.data.tagCode,
      name: "Table " + parsed.data.tableNumber,
      display_name: parsed.data.area,
    })
    .select("id, table_number, tag_code, display_name, active")
    .single();

  if (error) {
    console.error("Unable to create table:", error.message);
    return Response.json({ error: "That table number or tag is already in use." }, { status: 409 });
  }

  return Response.json(
    {
      table: {
        id: data.id,
        tableNumber: data.table_number,
        tagCode: data.tag_code,
        area: data.display_name,
        active: data.active,
      },
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  if (exceedsContentLength(request, 16 * 1024)) {
    return Response.json({ error: "Table payload is too large." }, { status: 413 });
  }
  const context = await getAdminContext();
  if (!context) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = updateTableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid table data." }, { status: 400 });

  const { error } = await context.supabase
    .from("cafeteria_tables")
    .update({ active: parsed.data.active })
    .eq("id", parsed.data.id)
    .eq("school_id", context.schoolId);

  if (error) {
    console.error("Unable to update table:", error.message);
    return Response.json({ error: "The table could not be updated." }, { status: 500 });
  }
  return Response.json({ updated: true });
}
