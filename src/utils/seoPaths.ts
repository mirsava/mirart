const slugify = (value?: string): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const getPaintingDetailPath = (id: number | string, title?: string): string => {
  const safeId = String(id).trim();
  const slug = slugify(title);
  return slug ? `/painting/${slug}-${safeId}` : `/painting/${safeId}`;
};

