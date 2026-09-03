// Kirim ulang peserta dari MongoDB ke webhook GHL, satu per satu.
// Pemakaian:
//   node kirim-webhook.mjs --only-dummy     -> hanya data dummy tes
//   node kirim-webhook.mjs --dry            -> tampilkan saja, tidak mengirim
//   node kirim-webhook.mjs                  -> semua peserta asli (dummy dilewati)
import fs from "fs";
import { MongoClient } from "mongodb";

const WEBHOOK =
  "https://services.leadconnectorhq.com/hooks/FCXCaXzwNxN3BXWaoDM6/webhook-trigger/GuzNrcLZCwsgPYsCMyOt";
const DUMMY = "dummy.test.hapus.aja@example.com";
const JEDA_MS = 400;

const onlyDummy = process.argv.includes("--only-dummy");
const dry = process.argv.includes("--dry");

const uri = fs.readFileSync(".env.local", "utf8").match(/MONGODB_URI="?([^"\n]+)"?/)[1];
const client = await new MongoClient(uri).connect();
const filter = onlyDummy ? { email: DUMMY } : { email: { $ne: DUMMY } };
const docs = await client
  .db()
  .collection("participants")
  .find(filter)
  .sort({ createdAt: 1 })
  .toArray();

console.log(`${docs.length} dokumen${dry ? " (dry run, tidak dikirim)" : ""}\n`);

let ok = 0;
const gagal = [];
for (const [i, doc] of docs.entries()) {
  const label = `${String(i + 1).padStart(2)}/${docs.length} ${doc.email}`;
  if (dry) {
    console.log(`${label} -> dilewati (dry)`);
    continue;
  }
  try {
    // Dikirim apa adanya, persis bentuk yang dipakai route pendaftaran.
    const res = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await res.text()).slice(0, 80);
    console.log(`${label} -> ${res.status} ${body}`);
    res.ok ? ok++ : gagal.push(doc.email);
  } catch (err) {
    console.log(`${label} -> GAGAL ${err.message}`);
    gagal.push(doc.email);
  }
  await new Promise((r) => setTimeout(r, JEDA_MS));
}

console.log(`\nberhasil: ${ok} | gagal: ${gagal.length}`);
if (gagal.length) console.log("email gagal:", gagal.join(", "));
await client.close();
