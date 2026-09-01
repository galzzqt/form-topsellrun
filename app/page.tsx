"use client";

import { FormEvent, useEffect, useState } from "react";
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
  Loader2,
  CheckCircle2,
} from "lucide-react";

const JERSEY_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];
const TICKET_CATEGORIES = [
  { value: "6K", label: "6K - Rp 149,000" },
  { value: "10K", label: "10K - Rp 199,000" },
  { value: "21K", label: "21K - Rp 299,000" },
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
        <Icon className="h-4 w-4 text-teal-600" />
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-teal-500" />
          <h1 className="text-xl font-semibold text-slate-900">Pendaftaran Berhasil</h1>
          <p className="mt-2 text-sm text-slate-500">
            Data kamu sudah tersimpan. Sampai jumpa di garis start!
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-6 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            Daftar Peserta Lain
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-gradient-to-br from-teal-600 to-slate-900 px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300">
            Formulir Pendaftaran
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            TOPSELL x SAMSUNG Run for Changes 2026
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-200">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> 18 Oktober 2026
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Sunrise Mall Mojokerto
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto -mt-6 max-w-3xl space-y-6 px-4"
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
            <Field label="Tanggal Lahir" icon={Calendar}>
              <input
                type="date"
                className={inputClass}
                value={form.tanggalLahir}
                onChange={(e) => update("tanggalLahir", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Alamat" icon={MapPin}>
                <textarea
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
            <Field label="Kota/Kabupaten" icon={MapPin}>
              <select
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
            <Field label="Kecamatan" icon={MapPin}>
              <select
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

            <Field label="Nama BIB" icon={IdCard}>
              <input
                placeholder="Enter BIB Name"
                className={inputClass}
                value={form.namaBib}
                onChange={(e) => update("namaBib", e.target.value)}
              />
            </Field>
            <Field label="Jenis Kelamin" icon={Users}>
              <select
                className={inputClass}
                value={form.jenisKelamin}
                onChange={(e) => update("jenisKelamin", e.target.value)}
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </Field>

            <Field label="Golongan Darah" icon={Droplet}>
              <select
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

            <Field label="Nama Kontak Darurat" icon={UserPlus}>
              <input
                placeholder="Nama Kontak Darurat"
                className={inputClass}
                value={form.namaKontakDarurat}
                onChange={(e) => update("namaKontakDarurat", e.target.value)}
              />
            </Field>
            <Field label="Telp Kontak Darurat" icon={Phone}>
              <input
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
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "submitting" ? "Mengirim..." : "Daftar Sekarang"}
        </button>
      </form>
    </main>
  );
}
