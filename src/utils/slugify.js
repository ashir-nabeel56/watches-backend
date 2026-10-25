export function slugify(value = '') {
	return String(value)
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export async function uniqueSlug(Model, value, excludeId = null) {
	const base = slugify(value) || 'item';
	let candidate = base;
	let suffix = 1;
	while (await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
		candidate = `${base}-${suffix++}`;
	}
	return candidate;
}