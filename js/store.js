// Data & auth via Supabase. Butuh <script src="supabase-js"> dimuat sebelum file ini.
// Key "publishable" memang aman di frontend — keamanan diatur RLS (lihat supabase/schema.sql).
const SUPABASE_URL = 'https://zkttqoxnhkvjfkolglcr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZTzakDmJGWgtHnLZmIqwOg_yao68WJq';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Kategori contoh — ganti sesuai koleksi komunitas
const CATEGORIES = ['Novel', 'Fiksi Sejarah', 'Kumpulan Cerpen', 'Non-fiksi', 'Pengembangan Diri', 'Anak & Remaja', 'Lainnya'];
const FALLBACK_COVER = 'images/brand_reading_partner_1.jpg';
const MAX_UPLOAD = 2 * 1024 * 1024; // sama dengan limit bucket

// Sampul rusak / URL mati / offline -> tampilkan logo brand
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && !img.dataset.fallback) {
    img.dataset.fallback = '1';
    img.src = FALLBACK_COVER;
  }
}, true);

// Lempar error Supabase sebagai Error biasa dengan pesan yang bisa ditampilkan
function must({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// Pesan error auth Supabase -> bahasa Indonesia
function authError(err) {
  const m = err.message || '';
  if (/invalid login credentials/i.test(m)) return new Error('Email atau password salah.');
  if (/already (been )?registered/i.test(m)) return new Error('Email sudah terdaftar. Silakan masuk.');
  if (/password should be|at least 6/i.test(m)) return new Error('Password minimal 6 karakter.');
  if (/email not confirmed/i.test(m)) return new Error('Email belum dikonfirmasi. Minta admin mematikan "Confirm email" di Supabase.');
  if (/rate limit/i.test(m)) return new Error('Terlalu banyak percobaan. Coba lagi beberapa saat.');
  return new Error(m);
}

async function upload(bucket, path, file) {
  if (file.size > MAX_UPLOAD) throw new Error('Ukuran gambar maksimal 2MB.');
  must(await sb.storage.from(bucket).upload(path, file, { upsert: false }));
  return path;
}

const ext = (file) => (file.name.split('.').pop() || 'jpg').toLowerCase();

window.PerpusStore = {
  sb,
  CATEGORIES,

  // ===== Auth =====
  // Profil user yang sedang masuk (id, email, name, wa, address, is_admin) atau null
  async getUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const profile = must(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
    return profile || { id: session.user.id, email: session.user.email, name: session.user.email, is_admin: false };
  },
  onAuthChange(cb) {
    sb.auth.onAuthStateChange((event) => setTimeout(() => cb(event), 0)); // setTimeout: hindari deadlock auth-js
  },
  // Email + password tanpa kirim email apa pun (syarat: "Confirm email" dimatikan di Supabase)
  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
  },
  async signUp(name, email, password) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if (error) throw authError(error);
    if (!data.session) throw new Error('Akun dibuat, tapi "Confirm email" masih aktif di Supabase. Minta admin mematikannya.');
  },
  async signOut() { await sb.auth.signOut(); },

  // ===== Data =====
  async getBooks() {
    return must(await sb.from('books').select('*').order('created_at', { ascending: false }).order('title'));
  },
  // RLS: user biasa hanya dapat pinjamannya sendiri, admin dapat semua
  async getLoans() {
    return must(await sb.from('loans').select('*').order('borrowed_at', { ascending: false }).order('created_at', { ascending: false }));
  },

  async borrowBook(bookId, borrower, photoFile) {
    let photoPath = null;
    if (photoFile) {
      const { data: { user } } = await sb.auth.getUser();
      photoPath = await upload('id-photos', `${user.id}/${Date.now()}.${ext(photoFile)}`, photoFile);
    }
    return must(await sb.rpc('borrow_book', {
      p_book_id: bookId, p_name: borrower.name, p_wa: borrower.wa, p_address: borrower.address, p_photo_path: photoPath,
    }));
  },

  async returnBook(loanId) {
    return must(await sb.rpc('return_loan', { p_loan_id: loanId }));
  },

  async addBook(book, coverFile) {
    let cover_url = book.cover_url || null;
    if (coverFile) {
      const path = await upload('covers', `${Date.now()}.${ext(coverFile)}`, coverFile);
      cover_url = sb.storage.from('covers').getPublicUrl(path).data.publicUrl;
    }
    const stock = Number(book.stock) || 1;
    return must(await sb.from('books').insert({
      title: book.title,
      author: book.author,
      category: book.category || 'Lainnya',
      isbn: book.isbn || null,
      synopsis: book.synopsis || null,
      cover_url: cover_url || FALLBACK_COVER,
      stock_total: stock,
      stock_available: stock,
    }).select().single());
  },

  async updateStock(bookId, delta) {
    return must(await sb.rpc('adjust_stock', { p_book_id: bookId, p_delta: delta }));
  },

  async deleteBook(bookId) {
    must(await sb.from('books').delete().eq('id', bookId));
  },

  // Link sementara (60 detik) untuk foto KTP di bucket privat
  async photoUrl(path) {
    return must(await sb.storage.from('id-photos').createSignedUrl(path, 60)).signedUrl;
  },

  // ===== Util =====
  // Escape teks sebelum masuk innerHTML
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // '2026-11-24' -> '24 Nov 2026'
  fmtDate(iso) {
    if (!iso) return '-';
    return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-white font-medium text-sm shadow-xl transition-all duration-300 transform ${
      type === 'error' ? 'bg-red-600' : 'bg-primary'
    }`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-xl">${type === 'error' ? 'error' : 'check_circle'}</span>
      <span>${this.esc(message)}</span>
    `;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
    }, type === 'error' ? 5000 : 3000);
  }
};
