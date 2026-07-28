const Redis = require('ioredis');
const crypto = require('crypto');

/* =========================================================
   KONEKSI REDIS
   Database kamu adalah "Redis" (Redis Cloud) dari Vercel
   Marketplace — pakai connection string standar redis://...,
   BUKAN Upstash REST API. Nama env var-nya bisa berbeda-beda
   tergantung prefix yang kamu pilih saat connect project
   (mis. REDIS_URL, STORAGE_URL, dst), jadi di bawah ini kita
   cari otomatis: utamakan nama umum, kalau tidak ketemu, cari
   env var mana pun yang isinya berupa connection string redis://
   ========================================================= */
function findRedisUrl() {
  const commonNames = ['REDIS_URL', 'STORAGE_URL', 'KV_URL', 'REDIS_CONNECTION_STRING'];
  for (const name of commonNames) {
    if (process.env[name]) return { name, url: process.env[name] };
  }
  for (const key of Object.keys(process.env)) {
    const val = process.env[key];
    if (val && /^rediss?:\/\//.test(val)) return { name: key, url: val };
  }
  return null;
}

let _client = null;
function getClient() {
  if (_client) return _client;
  const found = findRedisUrl();
  if (!found) {
    throw httpError(
      500,
      'Connection string Redis tidak ditemukan di environment variables. Cek Vercel Dashboard > Settings > Environment Variables, cari nama variabel yang isinya diawali redis://, lalu redeploy.'
    );
  }
  _client = new Redis(found.url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    lazyConnect: false
  });
  _client.on('error', (e) => console.error('[Redis client error]', e.message));
  return _client;
}

const MEMBERS_KEY = 'nkj:members';
const EVENTS_KEY = 'nkj:events';

const SEED_MEMBERS = [
  { id: crypto.randomUUID(), nama: 'Shelli Moniaga', email: 'shelli@narakupujogja.id', hp: '081234561234', tipe: 'Gold', status: 'Aktif', tanggalDaftar: '2024-11-18' },
  { id: crypto.randomUUID(), nama: 'Joyobadik', email: 'joyobadik@narakupujogja.id', hp: '081234562345', tipe: 'Silver', status: 'Aktif', tanggalDaftar: '2025-02-03' },
  { id: crypto.randomUUID(), nama: 'Dyar Ayu', email: 'dyar.ayu@gmail.com', hp: '081234563456', tipe: 'Reguler', status: 'Aktif', tanggalDaftar: '2025-07-10' }
];

const SEED_EVENTS = [
  {
    id: crypto.randomUUID(), judul: 'Malam Observasi Serangga', kategori: 'Edukasi', tanggal: '2026-03-15',
    deskripsi: 'Rangkaian edukasi biodiversitas serangga bersama Agenda Sekolah Alam, KSE Biologi UGM, dan KSH Biologi UGM.',
    status: 'Publish'
  },
  {
    id: crypto.randomUUID(), judul: 'Kelas Melukis Gerabah Akhir Pekan', kategori: 'Workshop', tanggal: '2026-08-09',
    deskripsi: 'Belajar melukis gerabah bersama pengrajin lokal, cocok untuk anak-anak maupun dewasa.',
    status: 'Publish'
  },
  {
    id: crypto.randomUUID(), judul: 'Festival Kuliner Gultik & Bakmi Jogja', kategori: 'Kuliner', tanggal: '2026-09-05',
    deskripsi: 'Menu andalan Nara Kupu Jogja tampil dalam satu festival kecil, lengkap live cooking dan diskon member.',
    status: 'Draft'
  }
];

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }
function isValidPhone(v) { const d = String(v || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 14; }

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function readList(key, seed) {
  const client = getClient();
  const raw = await client.get(key);
  if (raw) return JSON.parse(raw);
  await client.set(key, JSON.stringify(seed));
  return seed;
}
async function writeList(key, list) {
  await getClient().set(key, JSON.stringify(list));
}

/* ---------------- MEMBERS ---------------- */
async function getMembers() {
  const list = await readList(MEMBERS_KEY, SEED_MEMBERS);
  return list.sort((a, b) => (a.tanggalDaftar < b.tanggalDaftar ? 1 : -1));
}

async function createMember(body) {
  const { nama, email, hp, tipe, status } = body || {};
  if (!nama || !isValidEmail(email) || !isValidPhone(hp)) {
    throw httpError(400, 'Data tidak valid. Pastikan nama, email, dan nomor HP terisi benar.');
  }
  const list = await getMembers();
  const newMember = {
    id: crypto.randomUUID(),
    nama: String(nama).trim(),
    email: String(email).trim(),
    hp: String(hp).trim(),
    tipe: tipe || 'Reguler',
    status: status || 'Aktif',
    tanggalDaftar: new Date().toISOString().slice(0, 10)
  };
  list.unshift(newMember);
  await writeList(MEMBERS_KEY, list);
  return newMember;
}

async function updateMember(id, body) {
  const list = await getMembers();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) throw httpError(404, 'Member tidak ditemukan.');
  const { nama, email, hp, tipe, status } = body || {};
  if (!nama || !isValidEmail(email) || !isValidPhone(hp)) throw httpError(400, 'Data tidak valid.');
  list[idx] = { ...list[idx], nama, email, hp, tipe, status };
  await writeList(MEMBERS_KEY, list);
  return list[idx];
}

async function deleteMember(id) {
  const list = await getMembers();
  if (!list.some(m => m.id === id)) throw httpError(404, 'Member tidak ditemukan.');
  await writeList(MEMBERS_KEY, list.filter(m => m.id !== id));
}

/* ---------------- EVENTS / ARTIKEL ---------------- */
async function getEvents() {
  const list = await readList(EVENTS_KEY, SEED_EVENTS);
  return list.sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
}

async function createEvent(body) {
  const { judul, kategori, tanggal, deskripsi, status } = body || {};
  if (!judul || !tanggal || !deskripsi) throw httpError(400, 'Judul, tanggal, dan deskripsi wajib diisi.');
  const list = await getEvents();
  const newEvent = {
    id: crypto.randomUUID(),
    judul: String(judul).trim(),
    kategori: kategori || 'Edukasi',
    tanggal,
    deskripsi: String(deskripsi).trim(),
    status: status || 'Draft'
  };
  list.unshift(newEvent);
  await writeList(EVENTS_KEY, list);
  return newEvent;
}

async function updateEvent(id, body) {
  const list = await getEvents();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) throw httpError(404, 'Konten tidak ditemukan.');
  const { judul, kategori, tanggal, deskripsi, status } = body || {};
  if (!judul || !tanggal || !deskripsi) throw httpError(400, 'Judul, tanggal, dan deskripsi wajib diisi.');
  list[idx] = { ...list[idx], judul, kategori, tanggal, deskripsi, status };
  await writeList(EVENTS_KEY, list);
  return list[idx];
}

async function deleteEvent(id) {
  const list = await getEvents();
  if (!list.some(e => e.id === id)) throw httpError(404, 'Konten tidak ditemukan.');
  await writeList(EVENTS_KEY, list.filter(e => e.id !== id));
}

module.exports = {
  getMembers, createMember, updateMember, deleteMember,
  getEvents, createEvent, updateEvent, deleteEvent
};
