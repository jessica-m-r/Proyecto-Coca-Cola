import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { EventKpis, Statistics } from "@/lib/statistics.types";

export class StatisticsEventNotFoundError extends Error {}

export async function readStatistics(eventId?: number): Promise<Statistics> {
  const db = createServiceClient();
  const events: EventKpis[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("v_event_kpis").select("*").order("evento_id").range(offset, offset + 999);
    if (error) throw error;
    events.push(...data.filter((row) => row.evento_id !== null));
    if (data.length < 1000) break;
  }
  events.sort((a, b) => (b.fecha_inicio ?? "").localeCompare(a.fecha_inicio ?? ""));
  const selected = eventId === undefined ? events[0] ?? null : events.find((event) => event.evento_id === eventId) ?? null;
  if (eventId !== undefined && !selected) throw new StatisticsEventNotFoundError("El evento no existe");
  if (!selected) return { events, selected, funnel: [], hourly: [], activities: [], products: [], cities: [], updatedAt: new Date().toISOString() };
  const id = selected.evento_id!;
  // Pagina todas las vistas para no perder registros por el límite de Supabase.
  type DetailView = "v_funnel_levels" | "v_hourly_traffic" | "v_activity_performance" | "v_product_interest" | "v_city_map";
  const readView = async <K extends DetailView>(name: K) => {
    type Row = import("@/lib/database.types").Database["public"]["Views"][K]["Row"];
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 1000) {
      const orderColumn = { v_funnel_levels: "nivel", v_hourly_traffic: "hora", v_activity_performance: "actividad_id", v_product_interest: "producto_id", v_city_map: "ciudad" }[name];
      const { data, error } = await db.from(name as DetailView).select("*").eq("evento_id", id).order(orderColumn).range(offset, offset + 999);
      if (error) throw error;
      rows.push(...data as unknown as Row[]);
      if (data.length < 1000) break;
    }
    return rows;
  };
  const [funnel, hourly, activities, products, cities] = await Promise.all([
    readView("v_funnel_levels"), readView("v_hourly_traffic"), readView("v_activity_performance"), readView("v_product_interest"), readView("v_city_map"),
  ]);
  funnel.sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0));
  hourly.sort((a, b) => (a.hora ?? "").localeCompare(b.hora ?? ""));
  activities.sort((a, b) => (b.participantes_unicos ?? 0) - (a.participantes_unicos ?? 0));
  return { events, selected, funnel, hourly, activities, products, cities, updatedAt: new Date().toISOString() };
}
