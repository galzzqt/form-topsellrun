"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Mail,
  User,
  Phone,
  MapPin,
  Shirt,
  Ticket,
  Calendar,
  Users,
  Droplet,
  HeartPulse,
  UserPlus,
  IdCard,
  Receipt,
  Ruler,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const JERSEY_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const TICKET_CATEGORIES = [
  { value: "3K", label: "3K" },
  { value: "6K", label: "6K" },
];

// Free public API for Indonesian administrative regions, no key required.
const WILAYAH_API = "https://www.emsifa.com/api-wilayah-indonesia/api";

type WilayahOption = { id: string; name: string };

const initialForm = {
  email: "",
  namaLengkap: "",
  noTelepon: "",
  alamat: "",
  provinsi: "",
  kotaKabupaten: "",
  kecamatan: "",
  ukuranJersey: "",
  kategoriTiket: TICKET_CATEGORIES[0].value,
  namaBib: "",
  tanggalLahir: "",
  jenisKelamin: "Laki-laki",
  golonganDarah: "",
  komunitas: "",
  penyakitBawaan: "",
  namaKontakDarurat: "",
  telpKontakDarurat: "",
  noKtp: "",
  buktiTransfer: "",
};

type FormState = typeof initialForm;

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Icon className="h-4 w-4 text-orange-600" />
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const [provinces, setProvinces] = useState<WilayahOption[]>([]);
  const [regencies, setRegencies] = useState<WilayahOption[]>([]);
  const [districts, setDistricts] = useState<WilayahOption[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const sizeChartRef = useRef<HTMLDialogElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "Upload gagal.");
      update("buktiTransfer", data.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Prefill dari query string (link BC GHL): ?nama=...&hp=...&email=...&kategori=3K
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const nama = q.get("nama") ?? q.get("name") ?? "";
    const hp = q.get("hp") ?? q.get("phone") ?? "";
    const email = q.get("email") ?? "";
    const kategori = (q.get("kategori") ?? "").trim().toUpperCase();
    // +6281.. / 6281.. -> 081..
    const localHp = hp.trim().replace(/[\s-]/g, "").replace(/^\+?62/, "0");
    setForm((prev) => ({
      ...prev,
      namaLengkap: nama || prev.namaLengkap,
      noTelepon: localHp || prev.noTelepon,
      email: email || prev.email,
      kategoriTiket: TICKET_CATEGORIES.some((c) => c.value === kategori)
        ? kategori
        : prev.kategoriTiket,
    }));
  }, []);

  useEffect(() => {
    fetch(`${WILAYAH_API}/provinces.json`)
      .then((res) => res.json())
      .then(setProvinces)
      .catch(() => setProvinces([]));
  }, []);

  function handleProvinceChange(id: string) {
    setProvinceId(id);
    setRegencyId("");
    setDistrictId("");
    setRegencies([]);
    setDistricts([]);
    update("provinsi", provinces.find((p) => p.id === id)?.name ?? "");
    update("kotaKabupaten", "");
    update("kecamatan", "");
    if (!id) return;
    fetch(`${WILAYAH_API}/regencies/${id}.json`)
      .then((res) => res.json())
      .then(setRegencies)
      .catch(() => setRegencies([]));
  }

  function handleRegencyChange(id: string) {
    setRegencyId(id);
    setDistrictId("");
    setDistricts([]);
    update("kotaKabupaten", regencies.find((r) => r.id === id)?.name ?? "");
    update("kecamatan", "");
    if (!id) return;
    fetch(`${WILAYAH_API}/districts/${id}.json`)
      .then((res) => res.json())
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }

  function handleDistrictChange(id: string) {
    setDistrictId(id);
    update("kecamatan", districts.find((d) => d.id === id)?.name ?? "");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("submitting");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Terjadi kesalahan.");
      setStatus("success");
      setForm(initialForm);
      setProvinceId("");
      setRegencyId("");
      setDistrictId("");
      setRegencies([]);
      setDistricts([]);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }

  if (status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h1 className="text-xl font-semibold text-slate-900">Pendaftaran Berhasil</h1>
          <p className="mt-2 text-sm text-slate-500">
            Data kamu sudah tersimpan. Sampai jumpa di garis start!
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
          >
            Daftar Peserta Lain
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-white px-4 py-8">
        <div className="mx-auto max-w-[1200px]">
          <Image
            src="/images/hero.png"
            alt="TOPSELL x SAMSUNG Run for Changes 2026"
            width={1645}
            height={300}
            priority
            className="w-full rounded-xl"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-orange-600">
            Form Pendaftaran
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            Run for Changes 2026
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-orange-600" /> 18 Oktober 2026
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-600" /> Sunrise Mall Mojokerto
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-[1200px] space-y-6 px-4"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Data Peserta</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nama Lengkap" required icon={User}>
              <input
                required
                placeholder="Masukkan nama lengkap Anda"
                className={inputClass}
                value={form.namaLengkap}
                onChange={(e) => update("namaLengkap", e.target.value)}
              />
            </Field>
            <Field label="Email" required icon={Mail}>
              <input
                type="email"
                required
                placeholder="Masukkan alamat email Anda"
                className={inputClass}
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>

            <Field label="Nomor Telepon" required icon={Phone}>
              <input
                required
                placeholder="cth: 081234xxx"
                className={inputClass}
                value={form.noTelepon}
                onChange={(e) => update("noTelepon", e.target.value)}
              />
            </Field>
            <Field label="Tanggal Lahir" required icon={Calendar}>
              <input
                type="date"
                required
                className={inputClass}
                value={form.tanggalLahir}
                onChange={(e) => update("tanggalLahir", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Alamat" required icon={MapPin}>
                <textarea
                  required
                  rows={2}
                  placeholder="Masukkan alamat lengkap Anda"
                  className={inputClass}
                  value={form.alamat}
                  onChange={(e) => update("alamat", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Provinsi" required icon={MapPin}>
              <select
                required
                className={inputClass}
                value={provinceId}
                onChange={(e) => handleProvinceChange(e.target.value)}
              >
                <option value="">--Pilih Provinsi--</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kota/Kabupaten" required icon={MapPin}>
              <select
                required
                className={inputClass}
                value={regencyId}
                disabled={!provinceId}
                onChange={(e) => handleRegencyChange(e.target.value)}
              >
                <option value="">--Pilih Kota/Kabupaten--</option>
                {regencies.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kecamatan" required icon={MapPin}>
              <select
                required
                className={inputClass}
                disabled={!regencyId}
                value={districtId}
                onChange={(e) => handleDistrictChange(e.target.value)}
              >
                <option value="">--Pilih Kecamatan--</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <Field label="Ukuran Jersey" required icon={Shirt}>
                <select
                  required
                  className={inputClass}
                  value={form.ukuranJersey}
                  onChange={(e) => update("ukuranJersey", e.target.value)}
                >
                  <option value="">--Pilih Ukuran Jersey--</option>
                  {JERSEY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                onClick={() => sizeChartRef.current?.showModal()}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline"
              >
                <Ruler className="h-3.5 w-3.5" /> Lihat Size Chart
              </button>
              <dialog
                ref={sizeChartRef}
                onClick={(e) => e.currentTarget === e.target && sizeChartRef.current?.close()}
                className="m-auto max-w-[95vw] rounded-xl p-0 backdrop:bg-black/50"
              >
                <Image
                  src="/images/size.jpg"
                  alt="Size chart jersey"
                  width={900}
                  height={300}
                  loading="eager"
                  className="h-auto w-[900px] max-w-full"
                />
              </dialog>
            </div>

            <Field label="Pilih Kategori Tiket" required icon={Ticket}>
              <select
                required
                className={inputClass}
                value={form.kategoriTiket}
                onChange={(e) => update("kategoriTiket", e.target.value)}
              >
                {TICKET_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nama BIB" required icon={IdCard}>
              <input
                required
                placeholder="Enter BIB Name"
                className={inputClass}
                value={form.namaBib}
                onChange={(e) => update("namaBib", e.target.value)}
              />
            </Field>
            <Field label="Jenis Kelamin" required icon={Users}>
              <select
                required
                className={inputClass}
                value={form.jenisKelamin}
                onChange={(e) => update("jenisKelamin", e.target.value)}
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </Field>

            <Field label="Golongan Darah" required icon={Droplet}>
              <select
                required
                className={inputClass}
                value={form.golonganDarah}
                onChange={(e) => update("golonganDarah", e.target.value)}
              >
                <option value="">--Pilih--</option>
                {["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  )
                )}
              </select>
            </Field>
            <Field label="Komunitas" icon={Users}>
              <input
                placeholder="Masukan Komunitas"
                className={inputClass}
                value={form.komunitas}
                onChange={(e) => update("komunitas", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Penyakit Bawaan" icon={HeartPulse}>
                <input
                  placeholder="Masukan Penyakit Bawaan"
                  className={inputClass}
                  value={form.penyakitBawaan}
                  onChange={(e) => update("penyakitBawaan", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Nama Kontak Darurat" required icon={UserPlus}>
              <input
                required
                placeholder="Nama Kontak Darurat"
                className={inputClass}
                value={form.namaKontakDarurat}
                onChange={(e) => update("namaKontakDarurat", e.target.value)}
              />
            </Field>
            <Field label="Telp Kontak Darurat" required icon={Phone}>
              <input
                required
                placeholder="081xxx"
                className={inputClass}
                value={form.telpKontakDarurat}
                onChange={(e) => update("telpKontakDarurat", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="No. KTP" required icon={IdCard}>
                <input
                  required
                  placeholder="Masukan No. KTP"
                  className={inputClass}
                  value={form.noKtp}
                  onChange={(e) => update("noKtp", e.target.value)}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Bukti Transfer / Invoice Pembayaran" required icon={Receipt}>
                <input
                  type="file"
                  required={!form.buktiTransfer}
                  accept="image/*"
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-700`}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </Field>
              {uploading && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunggah...
                </p>
              )}
              {form.buktiTransfer && !uploading && (
                <a
                  href={form.buktiTransfer}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:underline"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Bukti terunggah — lihat file
                </a>
              )}
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting" || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "submitting" ? "Mengirim..." : "Daftar Sekarang"}
        </button>
      </form>
    </main>
  );
}
