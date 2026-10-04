import type { Database } from "@/lib/database.types";

type View<K extends keyof Database["public"]["Views"]> = Database["public"]["Views"][K]["Row"];
export type EventKpis = View<"v_event_kpis">;
export type Statistics = {
  events: EventKpis[];
  selected: EventKpis | null;
  funnel: View<"v_funnel_levels">[];
  hourly: View<"v_hourly_traffic">[];
  activities: View<"v_activity_performance">[];
  products: View<"v_product_interest">[];
  cities: View<"v_city_map">[];
  updatedAt: string;
};
