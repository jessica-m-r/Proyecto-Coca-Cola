import { z } from "zod";

const ticketSchema = z.object({
  id: z.string(), userId: z.number().int().positive(), eventId: z.string(),
  fullName: z.string().min(1), createdAt: z.string(),
});
export type DemoTicket = z.infer<typeof ticketSchema>;
type TicketStorage = Pick<Storage, "getItem" | "setItem">;
const storageKey = (userId: number) => `cce-demo-tickets:${userId}`;

export function readDemoTickets(storage: TicketStorage, userId: number): DemoTicket[] {
  const raw = storage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    const parsed = z.array(ticketSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.filter((ticket) => ticket.userId === userId) : [];
  } catch { return []; }
}

export function enrollDemoEvent(storage: TicketStorage, user: { id: number; nombre: string; apellido: string | null }, eventId: string) {
  const tickets = readDemoTickets(storage, user.id);
  const previous = tickets.find((ticket) => ticket.eventId === eventId);
  const ticket: DemoTicket = previous ?? {
    id: `DEMO-${user.id}-${eventId}`, userId: user.id, eventId,
    fullName: [user.nombre, user.apellido].filter(Boolean).join(" ").trim(),
    createdAt: new Date().toISOString(),
  };
  const next = previous ? tickets : [...tickets, ticket];
  storage.setItem(storageKey(user.id), JSON.stringify(next));
  return { ticket, tickets: next };
}

export function demoQrPayload(ticket: DemoTicket) {
  return JSON.stringify({ tipo: "ticket_ejemplo", ticket: ticket.id, evento: ticket.eventId, nombre: ticket.fullName });
}
