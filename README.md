# Perpustakaan — Web Peminjaman Buku (MVP)

Aplikasi web peminjaman buku komunitas berbasis **Budget Rp 0**, responsif desktop & mobile, dibangun tanpa node_modules/bundler sesuai spesifikasi di `gemini-code-1795598234493.md`.

## 📁 Struktur Direktori
```text
perpustakaan-app/
├── index.html        # Katalog buku publik, filter status, pencarian & form peminjaman buku
├── admin.html        # Dashboard admin: Ringkasan statistik, data peminjam & kelola/tambah buku
├── js/
│   └── store.js      # State & data store interaktif (disinkronkan via localStorage)
└── README.md
```

## 🎨 Desain & Palet Warna
- **Primary Forest Green:** `#347928`
- **Soft Mint Green:** `#c0eba6` (Badge "Tersedia", hero accent)
- **Warm Yellow:** `#f4de40` (Badge "Dipinjam", highlight stat)
- **Info Teal:** `#1684a7` (Informasi stok & upload dropzone)
- **Crisp White:** `#ffffff` (Permukaan kartu & input)

## 🚀 Cara Menjalankan
Karena proyek ini berbasis static web murni (HTML + Tailwind CDN + Vanilla JS), Anda dapat langsung:
1. Membuka berkas `index.html` langsung di browser favorit Anda (Chrome, Safari, Edge, dll).
2. Atau jalankan server lokal sederhana:
   ```bash
   cd perpustakaan-app
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
