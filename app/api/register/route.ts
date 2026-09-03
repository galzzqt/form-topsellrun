import { NextRequest, NextResponse, after } from "next/server";
import type { Collection, ObjectId } from "mongodb";
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

// Default GHL webhook untuk pendaftaran pacer; override lewat GHL_PACER_WEBHOOK_URL.
const PACER_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/FCXCaXzwNxN3BXWaoDM6/webhook-trigger/0ae0f648-9613-45ed-9d6e-e83ab93a528e";

// Total percobaan dijaga di bawah ~9 detik supaya muat dalam batas durasi function.
const WEBHOOK_TIMEOUT_MS = 4000;
const WEBHOOK_ATTEMPTS = 3;

// ponytail: antrian ini hanya berlaku dalam satu instance function. Di serverless
// tiap request bisa dapat instance sendiri, jadi ini meredam lonjakan lokal, bukan
// menjamin urutan global. Kalau nanti butuh urutan lintas instance, pindahkan ke
// antrian di luar proses (mis. koleksi outbox + cron).
let queue: Promise<unknown> = Promise.resolve();
function enqueue(job: () => Promise<void>) {
  queue = queue.then(job, job);
  return queue;
}

// Hasil kirim dicatat di dokumen supaya kegagalan tidak hilang diam-diam dan
// bisa dikirim ulang belakangan. Dicatat SETELAH kirim, jadi payload tetap sama.
async function deliver(
  url: string,
  payload: unknown,
  collection: Collection,
  id: ObjectId
) {
  let lastError = "tidak diketahui";
  for (let attempt = 1; attempt <= WEBHOOK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (res.ok) {
        await collection.updateOne({ _id: id }, { $set: { webhookSentAt: new Date() } });
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    console.error(`Webhook percobaan ${attempt}/${WEBHOOK_ATTEMPTS} gagal:`, lastError);
    if (attempt < WEBHOOK_ATTEMPTS) await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  await collection.updateOne(
    { _id: id },
    { $set: { webhookError: lastError, webhookFailedAt: new Date() } }
  );
}

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

  const PHONE = /^08\d{7,13}$/;
  if (!PHONE.test(body.noTelepon)) {
    return NextResponse.json({ error: "Nomor telepon harus diawali 08." }, { status: 400 });
  }
  if (!PHONE.test(body.telpKontakDarurat)) {
    return NextResponse.json(
      { error: "Telp kontak darurat harus diawali 08." },
      { status: 400 }
    );
  }
  if (!/^\S+@\S+$/.test(body.email)) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }
  if (!/^\d{16}$/.test(body.noKtp)) {
    return NextResponse.json({ error: "No. KTP harus 16 digit angka." }, { status: 400 });
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
    ? process.env.GHL_PACER_WEBHOOK_URL ?? PACER_WEBHOOK_URL
    : process.env.GHL_WEBHOOK_URL;
  if (webhookUrl) {
    // after() menahan function tetap hidup sampai pengiriman selesai — tanpa ini
    // request-nya ikut mati begitu response dikembalikan di serverless.
    const payload = { ...doc, _id: result.insertedId };
    after(() => enqueue(() => deliver(webhookUrl, payload, participants, result.insertedId)));
  }

  return NextResponse.json({ ok: true, id: result.insertedId });
}
