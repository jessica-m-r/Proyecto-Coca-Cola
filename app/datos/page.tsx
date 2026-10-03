import { createServiceClient } from "@/lib/supabase/server";
import { FunnelChart } from "./funnel-chart";

type EventKpis = {
  evento_id: string;
  evento_nombre: string;
  evento_estado: string;
  tipo_evento: string | null;
  campana: string | null;
  fecha_inicio: string;
  total_registrados: number;
  total_asistentes: number;
  pct_asistencia: number;
  total_interacciones: number;
  indice_agrado: number | null;
  nps_promedio: number;
  total_ventas: number;
  ingresos_totales: number;
  pct_canje_cupones: number;
};

type FunnelLevel = {
  evento_id: string;
  nivel: number;
  etapa: string;
  personas: number;
  pct_sobre_registrados: number | null;
};

export const dynamic = "force-dynamic";

export default function DatosPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <DataView />
    </main>
  );
}

async function DataView() {
  const supabase = createServiceClient();

  const [kpisResult, funnelResult] = await Promise.all([
    supabase
      .from("v_event_kpis")
      .select("*")
      .order("fecha_inicio", { ascending: false }),
    supabase.from("v_funnel_levels").select("*").order("nivel"),
  ]);

  if (kpisResult.error || funnelResult.error) {
    const message = kpisResult.error?.message ?? funnelResult.error?.message;
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">No se pudieron cargar los datos</p>
        <p className="mt-1 font-mono text-xs">{message}</p>
        <p className="mt-2">
          Verifica que Supabase local esté arriba (<code>supabase start</code>) y
          que las migraciones estén aplicadas (<code>npm run db:reset</code>).
        </p>
      </div>
    );
  }

  const kpis = (kpisResult.data ?? []) as EventKpis[];
  const funnel = (funnelResult.data ?? []) as FunnelLevel[];

  if (kpis.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        No hay eventos cargados. Ejecuta <code>npm run db:reset</code> para
        aplicar migraciones y seed.
      </p>
    );
  }

  const featured = kpis[0];
  const featuredFunnel = funnel.filter((f) => f.evento_id === featured.evento_id);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          {featured.evento_nombre}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Registrados" value={featured.total_registrados} />
          <Kpi
            label="Asistentes"
            value={featured.total_asistentes}
            hint={`${featured.pct_asistencia}% asistencia`}
          />
          <Kpi label="NPS promedio" value={featured.nps_promedio} />
          <Kpi
            label="Ingresos"
            value={`$${Number(featured.ingresos_totales).toLocaleString("es-CO")}`}
            hint={`${featured.total_ventas} ventas`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Embudo de conversión
        </h2>
        <FunnelChart
          data={featuredFunnel.map((f) => ({
            etapa: f.etapa,
            personas: f.personas,
            pct: f.pct_sobre_registrados ?? 0,
          }))}
        />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Todos los eventos
        </h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-900">
              <tr>
                <Th>Evento</Th>
                <Th>Estado</Th>
                <Th>Registrados</Th>
                <Th>Asistencia</Th>
                <Th>Agrado</Th>
                <Th>Canje cupones</Th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k) => (
                <tr
                  key={k.evento_id}
                  className="border-t border-neutral-200 dark:border-neutral-800"
                >
                  <Td>{k.evento_nombre}</Td>
                  <Td>{k.evento_estado}</Td>
                  <Td>{k.total_registrados}</Td>
                  <Td>{k.pct_asistencia}%</Td>
                  <Td>{k.indice_agrado ?? "—"}%</Td>
                  <Td>{k.pct_canje_cupones}%</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2 font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2">{children}</td>;
}
