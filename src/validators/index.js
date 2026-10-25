import { z } from 'zod';

export function normalizePakistaniPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('0092')) return `0${digits.slice(4)}`;
  if (digits.startsWith('92')) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('3')) return `0${digits}`;
  return digits;
}

const phone = z.preprocess(normalizePakistaniPhone, z.string().regex(/^03\d{9}$/, 'Mobile number 03XXXXXXXXX format mein dein'));
const email = z.string().trim().email().transform((value) => value.toLowerCase());
const address = z.object({
  fullName: z.string().trim().min(2), phone,
  addressLine: z.string().trim().min(4), city: z.string().trim().min(2),
  province: z.string().trim().min(2), postalCode: z.string().trim().optional().default(''),
  isDefault: z.boolean().optional().default(false),
});

export const registerBody = z.object({
  name: z.string().trim().min(2), email, phone, password: z.string().min(8),
});
export const loginBody = z.object({ email, password: z.string().min(1) });
export const checkoutBody = z.object({
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(10) })).min(1).max(20),
  customer: z.object({ name: z.string().trim().min(2), email, phone }),
  address: z.object({ addressLine: z.string().trim().min(4), city: z.string().trim().min(2), province: z.string().trim().min(2), postalCode: z.string().trim().optional().default('') }),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'jazzcash', 'easypaisa', 'card']).default('cod'),
  couponCode: z.string().trim().optional().default(''), notes: z.string().trim().max(1000).optional().default(''),
});

const variant = z.object({
  _id: z.string().optional(), sku: z.string().trim().min(1), color: z.string().trim().optional().default(''),
  strap: z.string().trim().optional().default(''), price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).nullable().optional(), stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(3), isActive: z.boolean().optional().default(true),
});
export const productBody = z.object({
  name: z.string().trim().min(2), slug: z.string().trim().optional(), description: z.string().optional().default(''),
  brand: z.string().min(1), category: z.string().min(1), gender: z.enum(['men', 'women', 'unisex']).default('unisex'),
  movement: z.enum(['quartz', 'automatic', 'mechanical', 'digital']).default('quartz'),
  caseSizeMm: z.coerce.number().min(0).nullable().optional(), waterResistanceM: z.coerce.number().min(0).optional().default(0),
  warrantyMonths: z.coerce.number().int().min(0).optional().default(12),
  images: z.array(z.object({ url: z.string().url(), alt: z.string().optional().default('') })).optional().default([]),
  variants: z.array(variant).min(1), isActive: z.boolean().optional().default(true), isFeatured: z.boolean().optional().default(false),
});
export const productUpdateBody = productBody.partial().refine((data) => Object.keys(data).length > 0, 'Kam az kam aik field dein');
export const couponBody = z.object({
  code: z.string().trim().min(2).transform((value) => value.toUpperCase()), type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive(), minOrderAmount: z.coerce.number().min(0).optional().default(0),
  maxUses: z.coerce.number().int().positive().nullable().optional().default(null),
  expiresAt: z.coerce.date().nullable().optional().default(null), isActive: z.boolean().optional().default(true),
});
export const nameBody = z.object({ name: z.string().trim().min(2), logoUrl: z.string().url().optional().or(z.literal('')) });
export const addressBody = address;
export const reviewBody = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional().default('') });
export const orderStatusBody = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']),
  courier: z.string().trim().optional(), trackingNumber: z.string().trim().optional(),
});
export const shippingBody = z.object({ flatRate: z.coerce.number().min(0), freeAbove: z.coerce.number().min(0) });
export const profileBody = z.object({ name: z.string().trim().min(2).optional(), phone: phone.optional() }).refine((data) => Object.keys(data).length > 0);
export const changePasswordBody = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });
export const paymentBody = z.object({ paymentStatus: z.enum(['unpaid', 'paid', 'refunded']) });
export const roleBody = z.object({ role: z.enum(['customer', 'staff', 'admin']) });
export const stockBody = z.object({ stock: z.coerce.number().int().min(0) });

export const schemas = {
  register: z.object({ body: registerBody }), login: z.object({ body: loginBody }), checkout: z.object({ body: checkoutBody }),
  product: z.object({ body: productBody }), productUpdate: z.object({ body: productUpdateBody }), coupon: z.object({ body: couponBody }),
  name: z.object({ body: nameBody }), address: z.object({ body: addressBody }), review: z.object({ body: reviewBody }),
  orderStatus: z.object({ body: orderStatusBody }), shipping: z.object({ body: shippingBody }), profile: z.object({ body: profileBody }),
  changePassword: z.object({ body: changePasswordBody }), payment: z.object({ body: paymentBody }), role: z.object({ body: roleBody }),
  stock: z.object({ body: stockBody }),
};