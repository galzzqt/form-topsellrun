import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest("hex");

  // Body dibangun ulang tiap percobaan karena stream-nya habis sekali kirim.
  const buildBody = () => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", CLOUDINARY_API_KEY!);
    body.append("timestamp", String(timestamp));
    body.append("signature", signature);
    return body;
  };

  // Sebagian IP api.cloudinary.com kadang connect-timeout; retry dapat IP lain.
  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: buildBody() }
      );
      break;
    } catch (err) {
      console.error(`Cloudinary attempt ${attempt + 1} gagal:`, err);
    }
  }
  if (!res) {
    return NextResponse.json(
      { error: "Tidak bisa terhubung ke server gambar. Coba lagi." },
      { status: 502 }
    );
  }

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? "Upload gagal." },
      { status: res.status }
    );
  }
  return NextResponse.json({ url: data.secure_url });
}
