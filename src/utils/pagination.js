export function str(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getPaging(query = {}) {
  const page = Math.max(1, Number.parseInt(str(query.page, '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(str(query.limit, '20'), 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageResult(items, total, { page, limit }) {
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}