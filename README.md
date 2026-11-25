# Perpustakaan — Web Peminjaman Buku (MVP)

Aplikasi web peminjaman buku komunitas berbasis **Budget Rp 0**, responsif desktop & mobile, dibangun tanpa node_modules/bundler sesuai spesifikasi di `gemini-code-1795598234493.md`.

## 📁 Struktur Direktori
```text
├── index.html          # Katalog publik, detail buku, login user (Google / magic link), form pinjam, "Pinjaman Saya"
├── admin.html          # Dashboard admin (/admin.html): login, peminjam + filter, riwayat, kelola buku
├── css/doodle.css      # Gaya doodle (hybrid)
├── js/theme.js         # Config Tailwind (warna & font)
├── js/store.js         # Akses data & auth ke Supabase
└── supabase/schema.sql # Tabel, RLS, fungsi, storage, data awal
```

## 🗄️ Setup Supabase (sekali saja)
1. **SQL Editor** → New query → tempel isi `supabase/schema.sql` → Run.
2. **Authentication → URL Configuration** → Site URL: alamat produksi Vercel.
3. **Authentication → Sign In / Providers → Email**: matikan **Confirm email**.
   Login pakai email + password tanpa kirim email apa pun, jadi tidak kena limit email free tier.
4. **Jadikan admin**: daftar akun lewat tombol *Masuk → Daftar* di beranda (atau *Authentication → Users → Add user*),
   lalu jalankan di SQL Editor:
   ```sql
   update public.profiles set is_admin = true where email = 'email-admin@contoh.com';
   ```
   Buka `/admin.html` dan masuk dengan email + password tersebut.
5. **Lupa password**: admin reset manual di *Authentication → Users* → pilih user → ubah password.

## 🎨 Desain & Palet Warna
- **Primary Forest Green:** `#347928`
- **Soft Mint Green:** `#c0eba6` (Badge "Tersedia", hero accent)
- **Warm Yellow:** `#f4de40` (Badge "Dipinjam", highlight stat)
- **Info Teal:** `#1684a7` (Informasi stok & upload dropzone)
- **Crisp White:** `#ffffff` (Permukaan kartu & input)

## 🚀 Cara Menjalankan
Karena proyek ini berbasis static web murni (HTML + Tailwind CDN + Vanilla JS), Anda dapat langsung:
1. Katalog bisa dilihat dengan membuka `index.html` langsung.
2. Atau jalankan server lokal:
   ```bash
   python3 -m http.server 8080
   ```
   Lalu buka di browser: `http://localhost:8080`

## 🔄 Fitur yang Siap Diuji
1. **Katalog Publik (`index.html`)**:
   - Filter real-time: Semua, Tersedia, Dipinjam.
   - Pencarian instan berdasarkan judul buku atau penulis.
   - Modal Form Peminjaman: Validasi form nama, email, WA, alamat, dan opsional upload identitas.
   - Mengurangi stok buku secara otomatis saat peminjaman dikonfirmasi.
2. **Dashboard Admin (`admin.html`)**:
   - 3 Ringkasan statistik: Total Buku, Sedang Dipinjam, Buku Tersedia.
   - **Tab Data Peminjam**: Tabel di desktop & stacked cards di layar mobile, tombol *"Tandai Kembali"* (otomatis mengembalikan stok buku), serta modal pratinjau bukti foto identitas.
   - **Tab Kelola & Tambah Buku**: Form tambah buku baru dengan pratinjau unggah sampul + manajemen stok (+/-) & hapus buku.
