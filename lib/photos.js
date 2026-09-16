// Event photos. Unlike payment proofs these are meant to be seen, so the
// bucket is public and URLs are permanent — no signed-URL round trip on
// every page render.
//
// Deliberately not tied to a week: this is one pool of photos for the site,
// ordered by hand in the admin panel.
export const PHOTO_BUCKET = "event-photos";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB per photo
export const MAX_PHOTOS_PER_UPLOAD = 20;

// Formats a browser will actually decode. Anything else is rejected rather
// than stored as a file nobody can view.
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

// The ribbon on the homepage only needs enough to fill a loop.
export const RIBBON_LIMIT = 24;

export function photoUrl(supabase, path) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
