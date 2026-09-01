import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const REQUIRED_FIELDS = [
  "email",
  "namaLengkap",
  "noTelepon",
  "provinsi",
  "ukuranJersey",
  "kategoriTiket",
  "noKtp",
] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) {
      return NextResponse.json({ error: `Field "${field}" wajib diisi.` }, { status: 400 });
    }
  }

  const client = await clientPromise;
  const db = client.db();
  const participants = db.collection("participants");

  if (await participants.findOne({ email: body.email })) {
    return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
  }

  const doc = {
    email: body.email,
    namaLengkap: body.namaLengkap,
    noTelepon: body.noTelepon,
    alamat: body.alamat ?? "",
    provinsi: body.provinsi,
    kotaKabupaten: body.kotaKabupaten ?? "",
    kecamatan: body.kecamatan ?? "",
    ukuranJersey: body.ukuranJersey,
    kategoriTiket: body.kategoriTiket,
    namaBib: body.namaBib ?? "",
    tanggalLahir: body.tanggalLahir ?? "",
    jenisKelamin: body.jenisKelamin ?? "",
    golonganDarah: body.golonganDarah ?? "",
    komunitas: body.komunitas ?? "",
    penyakitBawaan: body.penyakitBawaan ?? "",
    namaKontakDarurat: body.namaKontakDarurat ?? "",
    telpKontakDarurat: body.telpKontakDarurat ?? "",
    noKtp: body.noKtp,
    createdAt: new Date(),
  };

  const result = await participants.insertOne(doc);

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (webhookUrl) {
    // ponytail: fire-and-forget, don't block the response on GHL being up
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...doc, _id: result.insertedId }),
    }).catch((err) => console.error("GHL webhook failed:", err));
  }

  return NextResponse.json({ ok: true, id: result.insertedId });
}
