import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const REQUIRED_FIELDS = [
  "email",
  "namaLengkap",
  "noTelepon",
  "alamat",
  "provinsi",
  "kotaKabupaten",
  "kecamatan",
  "ukuranJersey",
  "kategoriTiket",
  "namaBib",
  "tanggalLahir",
  "jenisKelamin",
  "golonganDarah",
  "namaKontakDarurat",
  "telpKontakDarurat",
  "noKtp",
  "buktiTransfer",
] as const;

const PACER_FIELDS = [
  "linkSosmed",
  "linkStrava",
  "usernameStrava",
  "punyaSmartwatch",
  "fotoPb",
  "fotoPortofolio",
] as const;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const isPacer = body.pacer === true;

  const required = isPacer
    ? [...REQUIRED_FIELDS.filter((f) => f !== "buktiTransfer"), ...PACER_FIELDS]
    : [...REQUIRED_FIELDS];

  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Field "${field}" wajib diisi.` }, { status: 400 });
    }
  }

  const client = await clientPromise;
  const db = client.db();
  const participants = db.collection(isPacer ? "pacers" : "participants");

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
    buktiTransfer: body.buktiTransfer ?? "",
    ...(isPacer
      ? {
          linkSosmed: body.linkSosmed,
          linkStrava: body.linkStrava,
          usernameStrava: body.usernameStrava,
          punyaSmartwatch: body.punyaSmartwatch,
          fotoPb: body.fotoPb,
          fotoPortofolio: body.fotoPortofolio,
        }
      : {}),
    tipe: isPacer ? "pacer" : "peserta",
    createdAt: new Date(),
  };

  const result = await participants.insertOne(doc);

  const webhookUrl = isPacer
    ? process.env.GHL_PACER_WEBHOOK_URL ?? process.env.GHL_WEBHOOK_URL
    : process.env.GHL_WEBHOOK_URL;
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
