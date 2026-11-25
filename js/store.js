// Store & State Management (dengan localStorage sync)
const DEFAULT_BOOKS = [
  {
    id: '1',
    title: 'Laskar Pelangi',
    author: 'Andrea Hirata',
    stock_total: 3,
    stock_available: 2,
    cover_url: 'images/cover_laskar_pelangi.jpg'
  },
  {
    id: '2',
    title: 'Bumi Manusia',
    author: 'Pramoedya Ananta Toer',
    stock_total: 4,
    stock_available: 3,
    cover_url: 'images/cover_bumi_manusia.jpg'
  },
  {
    id: '3',
    title: 'Filosofi Kopi',
    author: 'Dewi Lestari',
    stock_total: 1,
    stock_available: 0,
    cover_url: 'images/cover_filosofi_kopi.jpg'
  },
  {
    id: '4',
    title: 'Pulang',
    author: 'Leila S. Chudori',
    stock_total: 2,
    stock_available: 1,
    cover_url: 'images/cover_pulang.jpg'
  },
  {
    id: '5',
    title: 'Laut Bercerita',
    author: 'Leila S. Chudori',
    stock_total: 4,
    stock_available: 4,
    cover_url: 'images/cover_laut_bercerita.jpg'
  },
  {
    id: '6',
    title: 'Negeri 5 Menara',
    author: 'Ahmad Fuadi',
    stock_total: 1,
    stock_available: 0,
    cover_url: 'images/cover_negeri_5_menara.jpg'
  },
  {
    id: '7',
    title: 'Cantik Itu Luka',
    author: 'Eka Kurniawan',
    stock_total: 2,
    stock_available: 2,
    cover_url: 'images/cover_cantik_itu_luka.jpg'
  },
  {
    id: '8',
    title: 'Hujan',
    author: 'Tere Liye',
    stock_total: 5,
    stock_available: 5,
    cover_url: 'images/cover_hujan.jpg'
  }
];

const DEFAULT_LOANS = [
  {
    id: '101',
    book_id: '1',
    book_title: 'Laskar Pelangi',
    borrower_name: 'Siti Rahmawati',
    borrower_email: 'siti.rahma@email.com',
    borrower_wa: '0812-3456-7890',
    borrower_address: 'Jl. Braga No. 48, Bandung',
    id_photo_url: null,
    status: 'active',
    borrowed_at: '24 Nov 2026'
  },
  {
    id: '102',
    book_id: '3',
    book_title: 'Filosofi Kopi',
    borrower_name: 'Budi Santoso',
    borrower_email: 'budi.santoso@email.com',
    borrower_wa: '0857-9912-4410',
    borrower_address: 'Jl. Dago Atas No. 19, Bandung',
    id_photo_url: null,
    status: 'active',
    borrowed_at: '22 Nov 2026'
  },
  {
    id: '103',
    book_id: '6',
    book_title: 'Negeri 5 Menara',
    borrower_name: 'Nadia Kusuma',
    borrower_email: 'nadia.k@email.com',
    borrower_wa: '0813-7781-2094',
    borrower_address: 'Jl. Setiabudi No. 102, Bandung',
    id_photo_url: null,
    status: 'active',
    borrowed_at: '20 Nov 2026'
  },
  {
    id: '104',
    book_id: '2',
    book_title: 'Bumi Manusia',
    borrower_name: 'Rizky Pratama',
    borrower_email: 'rizky.pratama@email.com',
    borrower_wa: '0821-5504-1182',
    borrower_address: 'Jl. Riau No. 74, Bandung',
    id_photo_url: null,
    status: 'returned',
    borrowed_at: '15 Nov 2026',
    returned_at: '23 Nov 2026'
  }
];

window.PerpusStore = {
  getBooks() {
    const raw = localStorage.getItem('perpus_books');
    if (!raw) {
      localStorage.setItem('perpus_books', JSON.stringify(DEFAULT_BOOKS));
      return DEFAULT_BOOKS;
    }
    try {
      let books = JSON.parse(raw);
      // Auto-migrate legacy URLs to local images
      let updated = false;
      books = books.map(b => {
        const def = DEFAULT_BOOKS.find(d => d.title === b.title || d.id === b.id);
        if (def && (!b.cover_url || b.cover_url.includes('googleusercontent.com'))) {
          b.cover_url = def.cover_url;
          updated = true;
        }
        return b;
      });
      if (updated) {
        localStorage.setItem('perpus_books', JSON.stringify(books));
      }
      return books;
    } catch (e) {
      return DEFAULT_BOOKS;
    }
  },

  saveBooks(books) {
    localStorage.setItem('perpus_books', JSON.stringify(books));
  },

  getLoans() {
    const raw = localStorage.getItem('perpus_loans');
    if (!raw) {
      localStorage.setItem('perpus_loans', JSON.stringify(DEFAULT_LOANS));
      return DEFAULT_LOANS;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULT_LOANS;
    }
  },

  saveLoans(loans) {
    localStorage.setItem('perpus_loans', JSON.stringify(loans));
  },

  borrowBook(bookId, borrowerData) {
    const books = this.getBooks();
    const book = books.find(b => b.id === bookId);
    if (!book || book.stock_available <= 0) {
      throw new Error('Buku tidak tersedia untuk dipinjam.');
    }

    book.stock_available -= 1;
    this.saveBooks(books);

    const loans = this.getLoans();
    const newLoan = {
      id: String(Date.now()),
      book_id: book.id,
      book_title: book.title,
      borrower_name: borrowerData.name,
      borrower_email: borrowerData.email,
      borrower_wa: borrowerData.wa,
      borrower_address: borrowerData.address,
      id_photo_url: borrowerData.idPhotoUrl || null,
      status: 'active',
      borrowed_at: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    loans.unshift(newLoan);
    this.saveLoans(loans);
    return newLoan;
  },

  returnBook(loanId) {
    const loans = this.getLoans();
    const loan = loans.find(l => l.id === loanId);
    if (!loan || loan.status === 'returned') return null;

    loan.status = 'returned';
    loan.returned_at = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    this.saveLoans(loans);

    const books = this.getBooks();
    const book = books.find(b => b.id === loan.book_id || b.title === loan.book_title);
    if (book) {
      book.stock_available = Math.min(book.stock_total, book.stock_available + 1);
      this.saveBooks(books);
    }
    return loan;
  },

  addBook(newBook) {
    const books = this.getBooks();
    const item = {
      id: String(Date.now()),
      title: newBook.title,
      author: newBook.author,
      stock_total: Number(newBook.stock) || 1,
      stock_available: Number(newBook.stock) || 1,
      cover_url: newBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80'
    };
    books.unshift(item);
    this.saveBooks(books);
    return item;
  },

  updateStock(bookId, delta) {
    const books = this.getBooks();
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const newTotal = Math.max(1, book.stock_total + delta);
    const newAvail = Math.max(0, book.stock_available + delta);
    book.stock_total = newTotal;
    book.stock_available = newAvail;
    this.saveBooks(books);
    return book;
  },

  deleteBook(bookId) {
    const books = this.getBooks().filter(b => b.id !== bookId);
    this.saveBooks(books);
    return books;
  },

  showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-white font-medium text-sm shadow-xl transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-white font-medium text-sm shadow-xl transition-all duration-300 transform ${
      type === 'error' ? 'bg-red-600' : 'bg-primary'
    }`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-xl">${type === 'error' ? 'error' : 'check_circle'}</span>
      <span>${message}</span>
    `;
    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0');
    }, 3000);
  }
};
