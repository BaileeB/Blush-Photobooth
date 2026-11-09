import { put } from "@vercel/blob";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

/** Saves a photo strip and returns a link anyone can open. */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "Share links aren't switched on for this site yet." },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    // fall through to the error below
  }

  if (!file || file.type !== "image/jpeg") {
    return Response.json({ error: "Send the strip as a JPEG image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That strip is too big to share." }, { status: 413 });
  }

  const id = randomBytes(8).toString("base64url");
  await put(`strips/${id}.jpg`, file, {
    access: "public",
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });

  const origin = new URL(req.url).origin;
  return Response.json({ id, url: `${origin}/s/${id}` });
}
