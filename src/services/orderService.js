import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Counter from '../models/Counter.js';
import { getSetting } from '../models/Setting.js';

export async function placeOrder(input, userId = null) {
  const merged = new Map();
  for (const item of input.items) {
    const key = String(item.variantId);
    merged.set(key, (merged.get(key) || 0) + item.quantity);
  }
  const reserved = [];
  let couponReserved = false;
  let couponDoc = null;
  try {
    const orderItems = [];
    let subtotal = 0;
    for (const [variantId, quantity] of merged) {
      if (!mongoose.isValidObjectId(variantId)) throw new AppError('Variant nahi mila', 404);
      const product = await Product.findOne({ isActive: true, variants: { $elemMatch: { _id: variantId, isActive: true } } });
      const variant = product?.variants.id(variantId);
      if (!product || !variant) throw new AppError('Product ya variant available nahi', 404);
      const update = await Product.updateOne(
        { _id: product._id, variants: { $elemMatch: { _id: variant._id, isActive: true, stock: { $gte: quantity } } } },
        { $inc: { 'variants.$.stock': -quantity } },
      );
      if (update.modifiedCount !== 1) throw new AppError('stock kam hai', 409);
      reserved.push({ productId: product._id, variantId: variant._id, quantity });
      const unitPrice = variant.price;
      const image = product.images[0]?.url || '';
      orderItems.push({
        product: product._id, variantId: variant._id, name: product.name, sku: variant.sku,
        image, color: variant.color, strap: variant.strap, unitPrice, quantity, lineTotal: unitPrice * quantity,
      });
      subtotal += unitPrice * quantity;
    }

    let discount = 0;
    if (input.couponCode) {
      const now = new Date();
      couponDoc = await Coupon.findOneAndUpdate({
        code: input.couponCode.toUpperCase(), isActive: true, minOrderAmount: { $lte: subtotal },
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          { $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }] },
        ],
      }, { $inc: { usedCount: 1 } }, { new: true });
      if (!couponDoc) throw new AppError('Coupon valid nahi ya limit khatam hai', 400);
      couponReserved = true;
      discount = couponDoc.type === 'percent' ? subtotal * couponDoc.value / 100 : couponDoc.value;
      discount = Math.min(subtotal, Math.round(discount * 100) / 100);
    }

    const shipping = await getSetting('shipping');
    const shippingFee = subtotal - discount >= shipping.freeAbove ? 0 : shipping.flatRate;
    const orderNumber = await Counter.nextOrderNumber();
    return await Order.create({
      orderNumber, user: userId, customer: input.customer,
      shippingAddress: input.address, items: orderItems, paymentMethod: input.paymentMethod,
      subtotal, discount, shippingFee, total: subtotal - discount + shippingFee,
      couponCode: couponDoc?.code || '', notes: input.notes,
      statusHistory: [{ status: 'pending', by: userId }],
    });
  } catch (error) {
    // Masla ho to reserved stock aur coupon wapas karein.
    await Promise.all(reserved.map(({ productId, variantId, quantity }) => Product.updateOne(
      { _id: productId, 'variants._id': variantId }, { $inc: { 'variants.$.stock': quantity } },
    )));
    if (couponReserved) await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: -1 } });
    throw error;
  }
}

export async function changeOrderStatus(orderId, status, userId, metadata = {}, allowedFrom = null) {
  const finalStatuses = ['cancelled', 'returned'];
  const currentOrder = status === 'delivered'
    ? await Order.findById(orderId).select('paymentMethod')
    : null;
  const update = {
    $set: { status, ...(metadata.courier !== undefined ? { courier: metadata.courier } : {}), ...(metadata.trackingNumber !== undefined ? { trackingNumber: metadata.trackingNumber } : {}) },
    $push: { statusHistory: { status, by: userId, at: new Date() } },
  };
  if (status === 'delivered' && currentOrder?.paymentMethod === 'cod') update.$set.paymentStatus = 'paid';
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $nin: finalStatuses, ...(allowedFrom ? { $in: allowedFrom } : {}) } }, update, { new: true, runValidators: true },
  );
  if (!order) throw new AppError('Order nahi mila ya final status mein hai', 409);
  if (status === 'cancelled' || status === 'returned') {
    await Promise.all(order.items.map((item) => Product.updateOne(
      { _id: item.product, 'variants._id': item.variantId }, { $inc: { 'variants.$.stock': item.quantity } },
    )));
    if (status === 'returned' && order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
      await order.save();
    }
  }
  return order;
}