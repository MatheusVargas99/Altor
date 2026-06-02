import { z } from 'zod';

// Helpers Zod 4-compatíveis. Histórico: os schemas originais usavam o padrão
// `z.union([z.string(), z.null(), z.undefined()]).transform(...)` herdado do
// Zod 3. Em Zod 4 isso quebra de duas formas (ver
// docs/AUDIT_REPORT.md e memory/feedback_zod4_altor.md):
//   1. campos com .transform() deixam de ser opcionais num object — payload
//      sem o campo retorna "Invalid input: expected nonoptional".
//   2. enums com .nullable().optional() rejeitam string vazia (default do
//      <Select placeholder>) com "Invalid option".
// Estes helpers nivelam ambos os casos via z.preprocess + .optional() no
// field-level.

export const nullifyEmpty = (v: unknown) =>
  v === '' || v == null ? null : v;

export const optStr = z.preprocess(
  nullifyEmpty,
  z
    .string()
    .nullable()
    .transform((v) => (v == null ? null : v.trim())),
);

export const optUuid = z.preprocess(
  nullifyEmpty,
  z
    .string()
    .nullable()
    .refine((v) => v == null || /^[0-9a-f-]{36}$/i.test(v), 'UUID inválido'),
);

export const optNum = z.preprocess(
  nullifyEmpty,
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v == null) return null;
      const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
      return Number.isFinite(n) ? n : null;
    }),
);

/** Para campos numéricos onde "vazio" deve virar 0 (não null). */
export const num0 = z.preprocess(
  (v) => (v === '' || v == null ? 0 : v),
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
      return Number.isFinite(n) ? n : 0;
    }),
);

export const optInt = z.preprocess(
  nullifyEmpty,
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => {
      if (v == null) return null;
      const n = parseInt(String(v), 10);
      return Number.isFinite(n) ? n : null;
    }),
);

export const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(nullifyEmpty, z.enum(values).nullable()).optional();
