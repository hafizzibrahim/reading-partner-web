-- =====================================================================
-- Reading Partner — skema Supabase
-- Jalankan SEKALI di: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Tabel ----------

create table public.books (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  author          text not null,
  category        text not null default 'Lainnya',
  isbn            text,
  synopsis        text,
  cover_url       text,
  stock_total     int  not null default 1 check (stock_total >= 1),
  stock_available int  not null default 1 check (stock_available >= 0 and stock_available <= stock_total),
  created_at      timestamptz not null default now()
);

-- Profil 1:1 dengan akun login (dibuat otomatis oleh trigger di bawah)
create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text,
  name       text,
  wa         text,
  address    text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.loans (
  id               uuid primary key default gen_random_uuid(),
  book_id          uuid references public.books on delete set null,
  user_id          uuid not null references auth.users on delete cascade,
  book_title       text not null,            -- disalin saat pinjam, riwayat tetap ada walau buku dihapus
  borrower_name    text not null,
  borrower_email   text not null,
  borrower_wa      text not null,
  borrower_address text not null,
  id_photo_path    text,                     -- path di bucket privat 'id-photos'
  status           text not null default 'active' check (status in ('active', 'returned')),
  borrowed_at      date not null default current_date,
  returned_at      date,
  created_at       timestamptz not null default now()
);

create index loans_user_id_idx     on public.loans (user_id);
create index loans_book_id_idx     on public.loans (book_id);
create index loans_borrowed_at_idx on public.loans (borrowed_at desc);

-- ---------- Helper ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- Akun baru (Google / magic link) → otomatis punya profil
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Aksi (atomik: stok & data pinjaman selalu konsisten) ----------

-- User meminjam buku
create function public.borrow_book(p_book_id uuid, p_name text, p_wa text, p_address text, p_photo_path text default null)
returns public.loans
language plpgsql security definer set search_path = '' as $$
declare
  v_book  public.books;
  v_loan  public.loans;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Kamu harus masuk dulu untuk meminjam.';
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_wa), '') = '' or coalesce(trim(p_address), '') = '' then
    raise exception 'Nama, WhatsApp, dan alamat wajib diisi.';
  end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Foto identitas tidak valid.';
  end if;

  select * into v_book from public.books where id = p_book_id for update;
  if not found or v_book.stock_available <= 0 then
    raise exception 'Buku tidak tersedia untuk dipinjam.';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  update public.books set stock_available = stock_available - 1 where id = p_book_id;

  insert into public.loans (book_id, user_id, book_title, borrower_name, borrower_email, borrower_wa, borrower_address, id_photo_path)
  values (p_book_id, auth.uid(), v_book.title, trim(p_name), v_email, trim(p_wa), trim(p_address), p_photo_path)
  returning * into v_loan;

  -- Ingat data untuk pinjaman berikutnya
  update public.profiles set name = trim(p_name), wa = trim(p_wa), address = trim(p_address) where id = auth.uid();

  return v_loan;
end $$;

-- Admin menandai buku sudah kembali
create function public.return_loan(p_loan_id uuid)
returns public.loans
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang bisa menandai pengembalian.';
  end if;

  update public.loans set status = 'returned', returned_at = current_date
  where id = p_loan_id and status = 'active'
  returning * into v_loan;
  if not found then
    raise exception 'Peminjaman tidak ditemukan atau sudah selesai.';
  end if;

  update public.books set stock_available = least(stock_total, stock_available + 1) where id = v_loan.book_id;
  return v_loan;
end $$;

-- Admin menambah/mengurangi eksemplar; tidak boleh kurang dari yang sedang dipinjam
create function public.adjust_stock(p_book_id uuid, p_delta int)
returns public.books
language plpgsql security definer set search_path = '' as $$
declare
  v_book     public.books;
  v_borrowed int;
  v_total    int;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang bisa mengubah stok.';
  end if;

  select * into v_book from public.books where id = p_book_id for update;
  if not found then
    raise exception 'Buku tidak ditemukan.';
  end if;

  v_borrowed := v_book.stock_total - v_book.stock_available;
  v_total    := v_book.stock_total + p_delta;
  if v_total < greatest(1, v_borrowed) then
    raise exception 'Stok tidak bisa kurang dari % (jumlah yang sedang dipinjam, minimal 1).', greatest(1, v_borrowed);
  end if;

  update public.books set stock_total = v_total, stock_available = v_total - v_borrowed
  where id = p_book_id
  returning * into v_book;
  return v_book;
end $$;

revoke execute on function public.borrow_book, public.return_loan, public.adjust_stock from public, anon;
grant  execute on function public.borrow_book, public.return_loan, public.adjust_stock to authenticated;

-- ---------- Row Level Security ----------

alter table public.books    enable row level security;
alter table public.profiles enable row level security;
alter table public.loans    enable row level security;

-- Katalog terbuka untuk semua; hanya admin yang mengelola
create policy "Katalog bisa dilihat semua" on public.books
  for select using (true);
create policy "Admin kelola buku" on public.books
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profil: lihat milik sendiri (admin lihat semua); user hanya boleh ubah nama/WA/alamat (bukan is_admin)
create policy "Lihat profil sendiri atau admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Ubah profil sendiri" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (name, wa, address) on public.profiles to authenticated;

-- Pinjaman: user lihat milik sendiri, admin lihat semua. Tulis hanya lewat fungsi di atas.
create policy "Lihat pinjaman sendiri atau admin" on public.loans
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- Izin Data API ----------
-- Project Supabase baru tidak otomatis memberi akses tabel ke anon/authenticated.
-- Izin ini hanya "pintu"; siapa boleh lihat/ubah baris tetap diatur RLS di atas.
grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
grant select on public.profiles, public.loans to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- Storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('id-photos', 'id-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),  -- privat, maks 2MB
  ('covers',    'covers',    true,  2097152, array['image/jpeg', 'image/png', 'image/webp'])   -- publik
on conflict (id) do nothing;

-- Foto KTP: user upload ke folder <user_id>/..., yang bisa lihat hanya pemilik & admin
create policy "Upload foto ID ke folder sendiri" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Lihat foto ID sendiri atau admin" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- Sampul buku: hanya admin yang upload (bucket publik, jadi bisa dilihat semua)
create policy "Admin upload sampul" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.is_admin());

-- ---------- Data awal: 8 buku koleksi ----------
-- cover_url relatif → gambar diambil dari folder images/ di web. ISBN dikosongkan (isi yang asli lewat admin).

insert into public.books (title, author, category, synopsis, stock_total, stock_available, cover_url) values
  ('Laskar Pelangi', 'Andrea Hirata', 'Novel',
   'Kisah sepuluh anak di Belitung yang berjuang bersekolah di sebuah sekolah sederhana, dengan guru yang tak pernah menyerah pada mimpi mereka.',
   3, 3, 'images/cover_laskar_pelangi.jpg'),
  ('Bumi Manusia', 'Pramoedya Ananta Toer', 'Fiksi Sejarah',
   'Minke, pemuda pribumi terpelajar di awal abad ke-20, menghadapi cinta, ketidakadilan kolonial, dan pergulatan menjadi manusia merdeka.',
   4, 4, 'images/cover_bumi_manusia.jpg'),
  ('Filosofi Kopi', 'Dewi Lestari', 'Kumpulan Cerpen',
   'Kumpulan cerita dan prosa pendek tentang obsesi, cinta, dan makna hidup — dibuka dengan kisah peracik kopi yang mencari racikan sempurna.',
   1, 1, 'images/cover_filosofi_kopi.jpg'),
  ('Pulang', 'Leila S. Chudori', 'Fiksi Sejarah',
   'Para eksil politik di Paris yang tak bisa pulang ke tanah air, dan generasi berikutnya yang mencari jawaban tentang asal-usulnya.',
   2, 2, 'images/cover_pulang.jpg'),
  ('Laut Bercerita', 'Leila S. Chudori', 'Fiksi Sejarah',
   'Kisah aktivis mahasiswa yang hilang di akhir 1990-an, diceritakan dari sudut pandang mereka dan keluarga yang terus menunggu.',
   4, 4, 'images/cover_laut_bercerita.jpg'),
  ('Negeri 5 Menara', 'Ahmad Fuadi', 'Novel',
   'Alif merantau ke pondok pesantren dan bersama lima sahabatnya belajar bahwa kesungguhan bisa membawa mimpi ke penjuru dunia.',
   1, 1, 'images/cover_negeri_5_menara.jpg'),
  ('Cantik Itu Luka', 'Eka Kurniawan', 'Fiksi Sejarah',
   'Saga keluarga lintas generasi yang memadukan sejarah, legenda, dan realisme magis dalam potret getir sebuah kota pesisir.',
   2, 2, 'images/cover_cantik_itu_luka.jpg'),
  ('Hujan', 'Tere Liye', 'Novel',
   'Di dunia masa depan yang dilanda bencana, Lail belajar tentang kehilangan, persahabatan, dan pilihan untuk melupakan atau mengingat.',
   5, 5, 'images/cover_hujan.jpg');


grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
grant select on public.profiles, public.loans to authenticated;
grant execute on function public.is_admin() to authenticated;