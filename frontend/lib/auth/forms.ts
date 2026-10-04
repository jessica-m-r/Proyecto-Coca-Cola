import { z } from "zod";

// Shared validation keeps browser and API requirements in sync.
export const registerSchema = z.object({
  nombre: z.string({ required_error: "Ingresa tu nombre" }).trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  apellido: z.string({ required_error: "Ingresa tu apellido" }).trim().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string({ required_error: "Ingresa tu correo electrónico" }).trim().toLowerCase().email("Correo inválido"),
  celular: z.string({ required_error: "Ingresa tu celular" }).trim().min(6, "Celular inválido"),
  password: z.string({ required_error: "Ingresa tu contraseña" }).min(8, "La contraseña debe tener al menos 8 caracteres").max(256, "La contraseña no debe superar 256 caracteres"),
  ciudad: z.string().trim().optional(),
  age: z.string().optional(),
  preferencias: z.union([z.array(z.string()), z.string().transform((value) => value.split(",").filter(Boolean))]).optional().default([]),
});

export const loginSchema = z.object({
  email: z.string({ required_error: "Ingresa tu correo electrónico" }).trim().toLowerCase().email("Correo inválido"),
  password: z.string({ required_error: "Ingresa tu contraseña" }).min(1, "Ingresa tu contraseña").max(256, "La contraseña no debe superar 256 caracteres"),
  remember: z.boolean().optional().default(false),
});
