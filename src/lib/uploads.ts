import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import { dataDir, db } from "@/db";
import { boardGroups, postImages, posts } from "@/db/schema";
import { canAccess, type Viewer } from "@/lib/access";

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export class UploadError extends Error {}

export type CheckedImage = { data: Buffer; contentType: string; ext: string };

const uploadsRoot = () => join(dataDir(), "uploads");

/**
 * AC-23: up to 4 images, 10 MB each, and actually JPEG/PNG/WebP/GIF — the
 * content is sniffed, the file name and browser-supplied type are ignored.
 * Checks everything before anything is written.
 */
export async function checkImages(files: File[]): Promise<CheckedImage[]> {
  const real = files.filter((f) => f.size > 0);
  if (real.length > MAX_IMAGES) throw new UploadError(`You can attach up to ${MAX_IMAGES} images`);
  const checked: CheckedImage[] = [];
  for (const file of real) {
    if (file.size > MAX_IMAGE_BYTES) throw new UploadError(`“${file.name}” is over 10 MB`);
    const data = Buffer.from(await file.arrayBuffer());
    const type = await fileTypeFromBuffer(data);
    const ext = type && ALLOWED[type.mime];
    if (!type || !ext) throw new UploadError(`“${file.name}” isn't an image. Use JPEG, PNG, WebP or GIF.`);
    checked.push({ data, contentType: type.mime, ext });
  }
  return checked;
}

/** Write checked images under uploads/<folder>/ with random names. Returns their relative paths. */
export function storeImages(folder: string, images: CheckedImage[]): string[] {
  if (!images.length) return [];
  const dir = join(uploadsRoot(), folder);
  mkdirSync(dir, { recursive: true });
  return images.map((img) => {
    const rel = `${folder}/${crypto.randomUUID()}.${img.ext}`;
    writeFileSync(join(uploadsRoot(), rel), img.data, { flag: "wx" });
    return rel;
  });
}

export function removeStored(paths: string[]) {
  for (const rel of paths) {
    try {
      unlinkSync(join(uploadsRoot(), rel));
    } catch {
      // already gone
    }
  }
}

/**
 * AC-26: an uploaded image, only for viewers who can see the board it was
 * posted on. Files are found by exact database path, never by joining
 * user input onto the filesystem.
 */
export async function mediaForViewer(viewer: Viewer, path: string): Promise<{ data: Buffer; contentType: string } | null> {
  const [image] = await db
    .select({ path: postImages.path, contentType: postImages.contentType, boardId: posts.boardId })
    .from(postImages)
    .innerJoin(posts, eq(posts.id, postImages.postId))
    .where(eq(postImages.path, path));
  if (!image) return null;
  const groupIds = (await db.select().from(boardGroups).where(eq(boardGroups.boardId, image.boardId))).map((g) => g.groupId);
  if (!(await canAccess(viewer, groupIds))) return null;
  try {
    return { data: await readFile(join(uploadsRoot(), image.path)), contentType: image.contentType };
  } catch {
    return null;
  }
}
