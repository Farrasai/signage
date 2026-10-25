import DOMPurify from "isomorphic-dompurify";

export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function sanitizeYouTubeId(input: string): string | null {
  const id = input.trim();
  if (!id) return null;
  // Allow only alphanumeric, dash, underscore for video/playlist IDs
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

export function sanitizeUrl(dirty: string | null | undefined): string | null {
  if (!dirty) return null;
  try {
    const url = new URL(dirty.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
