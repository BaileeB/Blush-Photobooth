import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { head } from "@vercel/blob";

type Props = { params: Promise<{ id: string }> };

async function findStrip(id: string) {
  if (!/^[A-Za-z0-9_-]{6,24}$/.test(id) || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const blob = await head(`strips/${id}.jpg`);
    return blob.url;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const image = await findStrip(id);
  const title = "A Blush Booth photo strip";
  const description = "Snapped together on Blush Booth. Make your own strip with your friends.";
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [{ url: image }] : [] },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : [] },
  };
}

export default async function SharedStrip({ params }: Props) {
  const { id } = await params;
  const image = await findStrip(id);
  if (!image) notFound();

  return (
    <main className="shared">
      <p className="pixel shared-kicker">SOMEONE SENT YOU A STRIP</p>
      <h1 className="pixel shared-title">BLUSH BOOTH</h1>
      <div className="shared-strip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="Photo strip from Blush Booth" />
      </div>
      <div className="shared-actions">
        <a className="btn" href={image} download={`blush-booth-${id}.jpg`}>
          DOWNLOAD
        </a>
        <Link className="btn btn-primary" href="/">
          MAKE YOUR OWN ♥
        </Link>
      </div>
    </main>
  );
}
