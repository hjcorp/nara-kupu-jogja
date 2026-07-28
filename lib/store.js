const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

// Redis.fromEnv() otomatis membaca env var yang di-inject Vercel saat kamu
// pasang integrasi Upstash Redis lewat Vercel Marketplace (KV_REST_API_URL /
// KV_REST_API_TOKEN, atau UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
const redis = Redis.fromEnv();

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

/* ---------------- MEMBERS ---------------- */
async function getMembers() {
  let list = await redis.get(MEMBERS_KEY);
  if (!list) { list = SEED_MEMBERS; await redis.set(MEMBERS_KEY, list); }
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
  await redis.set(MEMBERS_KEY, list);
  return newMember;
}

async function updateMember(id, body) {
  const list = await getMembers();
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) throw httpError(404, 'Member tidak ditemukan.');
  const { nama, email, hp, tipe, status } = body || {};
  if (!nama || !isValidEmail(email) || !isValidPhone(hp)) throw httpError(400, 'Data tidak valid.');
  list[idx] = { ...list[idx], nama, email, hp, tipe, status };
  await redis.set(MEMBERS_KEY, list);
  return list[idx];
}

async function deleteMember(id) {
  const list = await getMembers();
  if (!list.some(m => m.id === id)) throw httpError(404, 'Member tidak ditemukan.');
  await redis.set(MEMBERS_KEY, list.filter(m => m.id !== id));
}

/* ---------------- EVENTS / ARTIKEL ---------------- */
async function getEvents() {
  let list = await redis.get(EVENTS_KEY);
  if (!list) { list = SEED_EVENTS; await redis.set(EVENTS_KEY, list); }
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
  await redis.set(EVENTS_KEY, list);
  return newEvent;
}

async function updateEvent(id, body) {
  const list = await getEvents();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) throw httpError(404, 'Konten tidak ditemukan.');
  const { judul, kategori, tanggal, deskripsi, status } = body || {};
  if (!judul || !tanggal || !deskripsi) throw httpError(400, 'Judul, tanggal, dan deskripsi wajib diisi.');
  list[idx] = { ...list[idx], judul, kategori, tanggal, deskripsi, status };
  await redis.set(EVENTS_KEY, list);
  return list[idx];
}

async function deleteEvent(id) {
  const list = await getEvents();
  if (!list.some(e => e.id === id)) throw httpError(404, 'Konten tidak ditemukan.');
  await redis.set(EVENTS_KEY, list.filter(e => e.id !== id));
}

module.exports = {
  getMembers, createMember, updateMember, deleteMember,
  getEvents, createEvent, updateEvent, deleteEvent
};
