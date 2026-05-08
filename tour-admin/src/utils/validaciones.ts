import { z } from "zod";
import { normalizeDui, normalizePhone } from "./inputMasks";

const phoneSchema = z
  .string()
  .refine((value) => normalizePhone(value).length === 8, "Teléfono inválido");

const duiSchema = z
  .string()
  .refine((value) => normalizeDui(value).length === 9, "DUI inválido");

export const vagoFormSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  email: z.string().email("Correo inválido"),
  telefono: phoneSchema,
  contactoEmergenciaNombre: z.string().min(1, "Contacto de emergencia requerido"),
  contactoEmergenciaRelacion: z.string().min(1, "Relación requerida"),
  contactoEmergenciaTel: phoneSchema,
});

export type VagoFormValues = z.infer<typeof vagoFormSchema>;

export const guiaFormSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellido: z.string().min(1, "Apellido requerido"),
  dui: duiSchema,
  email: z.string().email("Correo inválido"),
  telefono: phoneSchema,
  estado: z.enum(["activo", "inactivo", "suspendido"]),
  contactoEmergenciaNombre: z.string().min(1, "Contacto requerido"),
  contactoEmergenciaTel: phoneSchema,
});
export type GuiaFormValues = z.infer<typeof guiaFormSchema>;

export const transporteFormSchema = z.object({
  empresa: z.string().min(1, "Empresa requerida"),
  motorista: z.string().min(1, "Motorista requerido"),
  marca: z.string().min(1, "Marca requerida"),
  modelo: z.string().min(1, "Modelo requerido"),
  placa: z.string().min(5, "Placa requerida"),
  capacidad: z.number().min(1, "Capacidad inválida"),
  costoPorTour: z.number().min(0, "Costo inválido"),
  activo: z.boolean(),
});
export type TransporteFormValues = z.infer<typeof transporteFormSchema>;

export const plantillaFormSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  descripcion: z.string().min(1, "Descripción requerida"),
  dificultad: z.enum(["muy_facil", "facil", "moderado", "dificil", "muy_dificil"]),
  precioBase: z.number().min(0, "Precio inválido"),
  activa: z.boolean(),
});
export type PlantillaFormValues = z.infer<typeof plantillaFormSchema>;

export const tourFormSchema = z
  .object({
    plantillaId: z.string().min(1, "Plantilla requerida"),
    nombre: z.string().min(1, "Nombre requerido"),
    estado: z.enum(["borrador", "publicado", "lleno", "en_curso", "realizado", "cancelado"]),
    guiaId: z.string().min(1, "Guía requerido"),
    fechaInicio: z.string().min(1, "Fecha de inicio requerida"),
    fechaFin: z.string().min(1, "Fecha de fin requerida"),
    cupoMaximo: z.number().min(1, "Cupo inválido"),
    cupoMinimo: z.number().min(1, "Cupo inválido"),
    precioVenta: z.number().min(0, "Precio inválido"),
    puntoEncuentro: z.string().min(1, "Punto de encuentro requerido"),
  })
  .superRefine((values, ctx) => {
    const inicio = new Date(values.fechaInicio);
    const fin = new Date(values.fechaFin);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return;
    }
    if (fin < inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fechaFin"],
        message: "La fecha de fin debe ser igual o posterior a la fecha de inicio.",
      });
    }
  });
export type TourFormValues = z.infer<typeof tourFormSchema>;
