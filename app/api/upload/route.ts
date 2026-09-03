import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

// Batas per percobaan: cukup lama untuk file besar, cukup pendek untuk
// segera pindah provider kalau host-nya blackhole (connect timeout diam).
const TIMEOUT_MS = 15_000;

// Byte-nya dibaca sekali di awal; stream File habis sekali kirim, jadi tiap
// provider harus dapat File baru dari buffer yang sama.
type Payload = { bytes: Buffer; name: string; type: string };
type Uploader = { name: string; upload: (p: Payload) => Promise<string> };

const asFile = (p: Payload) => new File([new Uint8Array(p.bytes)], p.name, { type: p.type });

const cloudinary: Uploader = {
  name: "cloudinary",
  async upload(payload) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Kredensial Cloudinary belum diisi.");
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1")
      .update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
      .digest("hex");

    const body = new FormData();
    body.append("file", asFile(payload));
    body.append("api_key", CLOUDINARY_API_KEY);
    body.append("timestamp", String(timestamp));
    body.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Cloudinary menolak upload.");
    return data.secure_url as string;
  },
};

const imagekit: Uploader = {
  name: "imagekit",
  async upload(payload) {
    const key = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!key) throw new Error("IMAGEKIT_PRIVATE_KEY belum diisi.");

    const body = new FormData();
    body.append("file", payload.bytes.toString("base64")); // ImageKit menerima base64
    body.append("fileName", payload.name);
    body.append("folder", process.env.IMAGEKIT_FOLDER ?? "/topsellrun");

    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.message ?? "ImageKit menolak upload.");
    // URL default ImageKit melayani versi terkompresi (PNG -> JPEG). Bukti transfer
    // harus terbaca, jadi minta file aslinya.
    return `${data.url}?tr=orig-true`;
  },
};

// Urutan bisa dibalik lewat UPLOAD_PROVIDER=imagekit kalau Cloudinary sedang bermasalah.
function providers(): Uploader[] {
  return process.env.UPLOAD_PROVIDER === "imagekit"
    ? [imagekit, cloudinary]
    : [cloudinary, imagekit];
}

export async function POST(req: NextRequest) {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }
  const payload: Payload = {
    bytes: Buffer.from(await file.arrayBuffer()),
    name: file.name || "upload",
    type: file.type || "application/octet-stream",
  };

  const failures: string[] = [];
  for (const provider of providers()) {
    try {
      const url = await provider.upload(payload);
      return NextResponse.json({ url, provider: provider.name });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push(`${provider.name}: ${reason}`);
      console.error(`Upload via ${provider.name} gagal:`, err);
    }
  }

  return NextResponse.json(
    { error: "Tidak bisa mengunggah gambar. Coba lagi.", detail: failures },
    { status: 502 }
  );
}
