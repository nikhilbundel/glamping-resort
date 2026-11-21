import { z, type ZodTypeAny } from 'zod';

/**
 * Field definitions drive three things at once:
 *  1. the Zod schema that validates admin input (client + server),
 *  2. the auto-generated admin form,
 *  3. default values for new sections / records.
 * This file must stay client-safe (no server imports).
 */

export type OptionSource =
  | 'stays'
  | 'faqCategories'
  | 'pages'
  | 'authors'
  | 'blogCategories'
  | 'tags'
  | 'menuCategories'
  | 'amenityGroups';

type Base = {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  placeholder?: string;
  /** Half-width field on desktop */
  half?: boolean;
  /** Value used for new records / when missing */
  default?: unknown;
  /** Only show this field in the admin when a sibling field has one of these values ('' matches empty) */
  showIf?: { field: string; equals: string | string[] };
};

export type Field =
  | (Base & { type: 'text' | 'textarea' | 'url' | 'email' | 'color' | 'icon' | 'date' | 'datetime' | 'file' | 'video'; max?: number })
  | (Base & { type: 'richtext' })
  | (Base & { type: 'number'; min?: number; max?: number; step?: number; /** may be left empty (saved as “no value”) */ nullable?: boolean })
  | (Base & { type: 'boolean' })
  | (Base & { type: 'select'; options?: { value: string; label: string }[]; source?: OptionSource })
  | (Base & { type: 'multiselect'; options?: { value: string; label: string }[]; source?: OptionSource })
  | (Base & { type: 'image' })
  | (Base & { type: 'images' })
  | (Base & { type: 'cta' })
  | (Base & { type: 'ctas'; maxItems?: number })
  | (Base & { type: 'tags' })
  | (Base & { type: 'list'; fields: Field[]; itemLabel?: string; maxItems?: number; addLabel?: string })
  /** Visual divider in admin forms — stores no data */
  | (Base & { type: 'heading' })
  | (Base & { type: 'group'; fields: Field[] });

export type FieldType = Field['type'];

const imageCore = z.object({
  url: z.string().min(1, 'Image required'),
  alt: z.string().trim().min(1, 'Alt text is required for accessibility'),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  publicId: z.string().nullish(),
  focalX: z.coerce.number().optional(),
  focalY: z.coerce.number().optional(),
});

export const imageSchema = imageCore.extend({ mobile: imageCore.nullish() });

export const ctaSchema = z.object({
  label: z.string().trim().min(1, 'Label required'),
  href: z.string().trim().min(1, 'Link required'),
  style: z.enum(['primary', 'secondary', 'link', 'light']).optional().default('primary'),
  newTab: z.boolean().optional().default(false),
});

const emptyToUndef = (v: unknown) => (v === '' || v === null ? undefined : v);

function fieldSchema(f: Field): ZodTypeAny {
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'color':
    case 'icon':
    case 'date':
    case 'datetime':
    case 'file':
    case 'video':
    case 'richtext': {
      let s = z.string();
      if ('max' in f && f.max) s = s.max(f.max);
      if (f.required) return s.trim().min(1, `${f.label} is required`);
      return s.optional().nullable().transform((v) => v ?? '');
    }
    case 'url': {
      const s = z
        .string()
        .trim()
        .refine((v) => !v || /^(https?:\/\/|\/|#|mailto:|tel:)/.test(v), 'Enter a full URL (https://…) or a path starting with /');
      return f.required ? s.pipe(z.string().min(1, `${f.label} is required`)) : s.optional().nullable().transform((v) => v ?? '');
    }
    case 'email': {
      const s = z.string().trim().refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), 'Enter a valid email');
      return f.required ? s.pipe(z.string().min(1)) : s.optional().nullable().transform((v) => v ?? '');
    }
    case 'number': {
      let s = z.coerce.number();
      if (f.min !== undefined) s = s.min(f.min);
      if (f.max !== undefined) s = s.max(f.max);
      return f.required ? s : z.preprocess(emptyToUndef, s.optional());
    }
    case 'boolean':
      return z.boolean().optional().default(false);
    case 'select': {
      const s = z.string();
      return f.required ? s.min(1, `${f.label} is required`) : s.optional().nullable().transform((v) => v ?? '');
    }
    case 'multiselect':
    case 'tags':
      return z.array(z.string()).optional().default([]);
    case 'image':
      return f.required ? imageSchema : imageSchema.nullable().optional().default(null);
    case 'images':
      return z.array(imageSchema).optional().default([]);
    case 'cta':
      return f.required ? ctaSchema : ctaSchema.nullable().optional().default(null);
    case 'ctas': {
      let s = z.array(ctaSchema);
      if (f.maxItems) s = s.max(f.maxItems);
      return s.optional().default([]);
    }
    case 'list': {
      let s = z.array(buildSchema(f.fields).extend({ _key: z.string().optional() }));
      if (f.maxItems) s = s.max(f.maxItems);
      return s.optional().default([]);
    }
    case 'group':
      return buildSchema(f.fields);
    case 'heading':
      return z.any().optional();
  }
}

export function buildSchema(fields: Field[]) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) if (f.type !== 'heading') shape[f.name] = fieldSchema(f);
  return z.object(shape).passthrough();
}

export function defaultValue(f: Field): unknown {
  if (f.default !== undefined) return f.default;
  switch (f.type) {
    case 'boolean':
      return false;
    case 'number':
      return f.nullable ? '' : (f.min ?? 0);
    case 'image':
    case 'cta':
      return null;
    case 'images':
    case 'ctas':
    case 'list':
    case 'tags':
    case 'multiselect':
      return [];
    case 'group':
      return defaults(f.fields);
    case 'select':
      return f.options?.[0]?.value ?? '';
    default:
      return '';
  }
}

export function defaults(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f.type !== 'heading') out[f.name] = defaultValue(f);
  return out;
}

/** Merge stored data over defaults so new fields added later never crash old records. */
export function withDefaults<T extends Record<string, unknown>>(fields: Field[], data: unknown): T {
  const base = defaults(fields);
  if (!data || typeof data !== 'object') return base as T;
  return { ...base, ...(data as Record<string, unknown>) } as T;
}

// ── Reusable field presets ──────────────────────────────────────────────
export const F = {
  eyebrow: { name: 'eyebrow', label: 'Eyebrow (small label above heading)', type: 'text', half: true } as Field,
  heading: { name: 'heading', label: 'Heading', type: 'text', half: true } as Field,
  intro: { name: 'intro', label: 'Intro text', type: 'textarea' } as Field,
  body: { name: 'body', label: 'Body', type: 'richtext' } as Field,
  ctas: { name: 'ctas', label: 'Buttons', type: 'ctas', maxItems: 2 } as Field,
  background: {
    name: 'background',
    label: 'Background',
    type: 'select',
    options: [
      { value: 'cream', label: 'Cream (page background)' },
      { value: 'white', label: 'White surface' },
      { value: 'green', label: 'Primary green (light text)' },
      { value: 'dark', label: 'Charcoal (light text)' },
    ],
    half: true,
  } as Field,
  anchor: { name: 'anchorId', label: 'Anchor ID (for #links)', type: 'text', half: true, help: 'Optional, e.g. "spa"' } as Field,
  align: {
    name: 'align',
    label: 'Heading alignment',
    type: 'select',
    options: [
      { value: 'center', label: 'Center' },
      { value: 'left', label: 'Left' },
    ],
    half: true,
  } as Field,
};

export const headingFields: Field[] = [F.eyebrow, F.heading, F.intro, F.align];
export const styleFields: Field[] = [F.background, F.anchor];
