// Smallest valid images, for upload tests.
export const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
export const GIF_1PX = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export const pngFile = (name = "photo.png") => new File([PNG_1PX], name, { type: "image/png" });
export const gifFile = (name = "anim.gif") => new File([GIF_1PX], name, { type: "image/gif" });
/** Text pretending to be an image: right extension and type, wrong content. */
export const fakePng = () => new File(["<?php echo 'hi'; ?>"], "evil.png", { type: "image/png" });
/** A PNG padded past the 10 MB limit (valid header, so only size is wrong). */
export const hugePng = () => new File([PNG_1PX, new Uint8Array(10 * 1024 * 1024)], "huge.png", { type: "image/png" });
