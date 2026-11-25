export const DEFAULT_FAVICON_URL = '/favicon.svg';
const FAVICON_CACHE_KEY = 'simpkn_cached_favicon_url';

export function isValidFaviconUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,/i.test(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function resolveIconMimeType(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/svg+xml') || lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.startsWith('data:image/png') || lower.endsWith('.png')) return 'image/png';
  if (lower.startsWith('data:image/x-icon') || lower.startsWith('data:image/vnd.microsoft.icon') || lower.endsWith('.ico')) {
    return 'image/x-icon';
  }
  if (lower.startsWith('data:image/webp') || lower.endsWith('.webp')) return 'image/webp';
  if (lower.startsWith('data:image/jpeg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return undefined;
}

function upsertHeadLink(id: string, rel: string, href: string, mimeType?: string) {
  if (typeof document === 'undefined') return;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.rel = rel;
  if (mimeType) {
    link.type = mimeType;
  } else {
    link.removeAttribute('type');
  }
  link.href = href;
}

export function getCachedFaviconUrl(): string | null {
  try {
    const val = localStorage.getItem(FAVICON_CACHE_KEY);
    return val && isValidFaviconUrl(val) ? val : null;
  } catch {
    return null;
  }
}

export function setCachedFaviconUrl(url: string | null) {
  try {
    if (url && isValidFaviconUrl(url)) {
      localStorage.setItem(FAVICON_CACHE_KEY, url);
    } else {
      localStorage.removeItem(FAVICON_CACHE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function applyDocumentFavicon(faviconUrl?: string | null, appTitle?: string) {
  if (typeof document === 'undefined') return;

  const targetUrl =
    faviconUrl && isValidFaviconUrl(faviconUrl) ? faviconUrl.trim() : DEFAULT_FAVICON_URL;
  const mimeType = resolveIconMimeType(targetUrl);

  upsertHeadLink('app-favicon', 'icon', targetUrl, mimeType);
  upsertHeadLink('app-shortcut-icon', 'shortcut icon', targetUrl, mimeType);
  upsertHeadLink('app-apple-icon', 'apple-touch-icon', targetUrl);

  if (appTitle && appTitle.trim()) {
    document.title = appTitle.trim();
  }
}
