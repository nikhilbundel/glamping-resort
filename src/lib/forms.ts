import { z } from 'zod';

const optDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date');

export const enquirySchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name').max(120),
    email: z.string().trim().email('Please enter a valid email').max(200),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    checkIn: optDate,
    checkOut: optDate,
    // empty box = not given (an empty number input arrives as "" or NaN, which must not become 0)
    guests: z.preprocess(
      (v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.coerce.number({ invalid_type_error: 'Please enter a number' }).int().min(1, 'At least 1 guest').max(50).optional(),
    ),
    stayType: z.string().max(120).optional().or(z.literal('')),
    message: z.string().trim().max(3000).optional().or(z.literal('')),
    website: z.string().max(0, 'Spam detected').optional().or(z.literal('')), // honeypot
  })
  .refine((d) => !d.checkIn || !d.checkOut || new Date(d.checkOut) > new Date(d.checkIn), { message: 'Check-out must be after check-in', path: ['checkOut'] });

export type EnquiryInput = z.input<typeof enquirySchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email').max(200),
  source: z.string().max(60).optional(),
  website: z.string().max(0).optional().or(z.literal('')),
});
