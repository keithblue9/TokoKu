// Default configuration seeded into localStorage on first load.
export const defaultConfig = {
  meta: {
    title: "TokoKu — Jasa Pembuatan Toko Online untuk UMKM",
    description: "Punya tokomu sendiri. Bukan numpang di marketplace orang lain.",
  },
  status: "online", // 'online' | 'maintenance'
  hero: {
    headline: "Sudah Waktunya Punya Toko Online Sendiri.",
    sub_headline:
      "Bukan numpang di marketplace orang lain — toko kamu, brand kamu, keuntungan full buat kamu.",
    cta_primary: "Lihat Paket",
    cta_secondary: "Chat WhatsApp",
    whatsapp_number: "628XXXXXXXXXX",
    hero_image: "",
  },
  business: {
    name: "TokoKu",
    tagline: "Solusi toko online untuk UMKM Indonesia",
    email: "halo@tokoku.id",
    phone: "08XXXXXXXXXX",
    address: "",
    copyright: "TokoKu. Semua hak dilindungi.",
  },
  whyOwnStore: [
    {
      id: "w1",
      icon: "ShieldCheck",
      title: "Toko kamu, aturan kamu",
      description:
        "Di marketplace, kamu cuma numpang. Kapan saja kebijakan bisa berubah — komisi naik, tampilan diubah, akunmu bisa kena suspend tanpa peringatan.",
      punchLine:
        "Buat apa kerja keras bangun pelanggan, kalau sewaktu-waktu bisa diusir?",
      active: true,
    },
    {
      id: "w2",
      icon: "Sparkles",
      title: "Pembeli ingat brand kamu, bukan marketplace-nya",
      description:
        "Di Shopee atau Tokopedia, pembeli ingat nama platform, bukan nama tokomu. Dengan web sendiri, brand kamu yang diingat dan dicari lagi.",
      punchLine:
        "Pelanggan setia itu aset. Kamu mau aset itu milik kamu atau milik Tokopedia?",
      active: true,
    },
    {
      id: "w3",
      icon: "Percent",
      title: "Tanpa potongan komisi yang terus naik",
      description:
        "Marketplace potong 2–15% tiap transaksi. Omzet Rp 10 juta/bulan? Kamu bisa rugi Rp 1,5 juta hanya dari komisi — belum biaya iklan di dalam platform.",
      punchLine:
        "Biaya web satu tahun bisa balik modal dari penghematan komisi dalam 1–2 bulan.",
      active: true,
    },
    {
      id: "w4",
      icon: "Database",
      title: "Data pelangganmu milik kamu sendiri",
      description:
        "Di marketplace, kamu tidak tahu siapa yang beli, dari mana, dan berapa sering. Di web sendiri, semua data itu milikmu dan bisa dipakai untuk jualan lebih pintar.",
      punchLine:
        "Pedagang yang tahu siapa pembelinya, bisa jualan berulang tanpa biaya iklan tambahan.",
      active: true,
    },
    {
      id: "w5",
      icon: "Crown",
      title: "Tampil lebih profesional, harga bisa lebih tinggi",
      description:
        "Toko dengan domain sendiri terlihat lebih serius dan terpercaya. Pembeli lebih rela bayar harga yang pantas dan tidak terus membandingkan dengan penjual sebelah.",
      punchLine:
        "Toko online sendiri itu bukan pengeluaran. Itu investasi kredibilitas bisnis kamu.",
      active: true,
    },
    {
      id: "w6",
      icon: "Layers",
      title: "Tetap bisa pakai marketplace, tapi tidak bergantung",
      description:
        "Web toko sendiri bukan berarti meninggalkan Shopee. Justru kamu bisa pakai keduanya, tapi punya 'rumah' yang aman sebagai pusat bisnismu.",
      punchLine:
        "Jangan taruh semua telur di satu keranjang yang bukan milikmu.",
      active: true,
    },
  ],
  howItWorks: [
    { id: "s1", title: "Pilih paket", description: "Pilih paket yang sesuai kebutuhan dan budget bisnismu." },
    { id: "s2", title: "Chat WhatsApp", description: "Hubungi kami via WhatsApp untuk diskusi singkat." },
    { id: "s3", title: "Kami bangun tokomu", description: "Tim kami siapkan toko online kamu dalam 3–5 hari kerja." },
    { id: "s4", title: "Kelola sendiri, tanpa ribet", description: "Tidak perlu jago IT — semua bisa diatur dari dashboard." },
    { id: "s5", title: "Toko live, siap jualan!", description: "Toko online kamu siap menerima pembeli kapan saja." },
  ],
  packages: [
    {
      id: "basic",
      name: "Basic Store",
      tagline: "Cocok buat yang baru mau coba.",
      badge: "Paket Dasar",
      featured: false,
      modal_setup: 800000,
      margin_setup: 47,
      modal_domain_monthly: 20000,
      margin_domain: 43,
      price_setup_override: null,
      price_domain_monthly_override: null,
      price_domain_yearly_override: null,
      price_domain_2year_override: null,
      features: [
        { text: "Domain sendiri (.com)", available: true },
        { text: "Login seller & kelola produk", available: true },
        { text: "Foto produk", available: false },
        { text: "Kategori produk", available: false },
        { text: "Kustomisasi tampilan toko", available: false },
      ],
      warning_note: "Toko tanpa foto produk sulit menarik pembeli.",
      cta_text: "Pilih Paket Ini",
      wa_message: "Halo, saya tertarik dengan Paket Basic Store. Bisa info lebih lanjut?",
    },
    {
      id: "growth",
      name: "Growth Store",
      tagline: "Tampil profesional, langsung siap jualan.",
      badge: "Paling Banyak Dipilih",
      featured: true,
      modal_setup: 1800000,
      margin_setup: 49,
      modal_domain_monthly: 32000,
      margin_domain: 42,
      price_setup_override: null,
      price_domain_monthly_override: null,
      price_domain_yearly_override: null,
      price_domain_2year_override: null,
      features: [
        { text: "Semua fitur Basic", available: true },
        { text: "Foto & galeri produk", available: true },
        { text: "Kategori produk", available: true },
        { text: "Kustomisasi tampilan & wording toko", available: true },
        { text: "Laporan penjualan & analitik", available: false },
      ],
      warning_note: "",
      cta_text: "Pilih Paket Ini",
      wa_message: "Halo, saya tertarik dengan Paket Growth Store. Bisa info lebih lanjut?",
    },
    {
      id: "pro",
      name: "Pro Store",
      tagline: "Untuk bisnis yang serius berkembang.",
      badge: "Pro",
      featured: false,
      modal_setup: 3500000,
      margin_setup: 50,
      modal_domain_monthly: 45000,
      margin_domain: 40,
      price_setup_override: null,
      price_domain_monthly_override: null,
      price_domain_yearly_override: null,
      price_domain_2year_override: null,
      features: [
        { text: "Semua fitur Growth", available: true },
        { text: "Laporan penjualan & keuangan", available: true },
        { text: "Analitik toko (jam ramai, produk favorit)", available: true },
        { text: "Notifikasi order ke WhatsApp", available: true },
        { text: "Tombol chat WA di halaman produk", available: true },
        { text: "Prioritas support", available: true },
      ],
      warning_note: "",
      cta_text: "Pilih Paket Ini",
      wa_message: "Halo, saya tertarik dengan Paket Pro Store. Bisa info lebih lanjut?",
    },
  ],
  domainRenewal: {
    title: "Perpanjang Domain dengan Mudah",
    description: "Pilih durasi yang paling nyaman buat kamu. Semakin lama, semakin hemat.",
    options: {
      monthly: { label: "Per Bulan", sublabel: "Fleksibel" },
      yearly: { label: "Per Tahun", sublabel: "Paling Populer" },
      twoYear: { label: "Per 2 Tahun", sublabel: "Hemat Terbanyak" },
    },
  },
  testimonials: {
    title: "Apa Kata Mereka",
    subtitle: "Kisah nyata UMKM yang udah punya toko online sendiri.",
    items: [
      {
        id: "t1",
        name: "Sari Wulandari",
        business: "Kopi Senja, Yogyakarta",
        message:
          "Sejak punya toko sendiri, pelanggan repeat order lewat WA. Gak perlu nunggu marketplace approve, gak ada potongan komisi. Omzet naik 2x lipat dalam 3 bulan!",
        rating: 5,
        photo: "",
      },
      {
        id: "t2",
        name: "Bayu Pratama",
        business: "Batik Lintang, Solo",
        message:
          "Awalnya ragu karena saya gak ngerti IT. Ternyata gampang banget kelola sendiri. Sekarang pelanggan dari Singapura & Malaysia bisa langsung beli dari website kami.",
        rating: 5,
        photo: "",
      },
      {
        id: "t3",
        name: "Dewi Anggraeni",
        business: "Hijab Ayyana, Bandung",
        message:
          "Saya pakai paket Growth. Tampilan tokonya profesional banget, pembeli langsung percaya. Customer service tim TokoKu juga responsif kalau ada pertanyaan.",
        rating: 5,
        photo: "",
      },
    ],
  },
  faqs: {
    title: "Pertanyaan yang Sering Ditanya",
    subtitle: "Masih ragu? Mungkin jawabannya ada di sini.",
    items: [
      {
        id: "f1",
        question: "Berapa lama proses pembuatan tokonya?",
        answer:
          "Setelah pembayaran setup masuk dan kami terima brief lengkap (logo, daftar produk, foto), toko online kamu siap online dalam 3–5 hari kerja.",
      },
      {
        id: "f2",
        question: "Apakah saya perlu bisa coding atau jago IT?",
        answer:
          "Tidak sama sekali. Dashboard admin dirancang sangat sederhana — kalau kamu bisa pakai Instagram atau Shopee, kamu pasti bisa kelola toko ini sendiri. Kami juga sediakan video panduan singkat.",
      },
      {
        id: "f3",
        question: "Bagaimana cara pembayaran dari pembeli?",
        answer:
          "Saat ini pembayaran dilakukan via transfer bank atau e-wallet, dengan konfirmasi otomatis ke WhatsApp kamu. Untuk paket Pro, kami bisa integrasikan payment gateway (Midtrans/Xendit) atas permintaan.",
      },
      {
        id: "f4",
        question: "Kalau saya berhenti perpanjang domain, data saya hilang?",
        answer:
          "Tidak. Data produk & pelanggan tetap kami simpan selama 6 bulan setelah masa aktif berakhir. Kamu bisa perpanjang kapan saja dalam periode tersebut dan toko kamu kembali aktif tanpa kehilangan apapun.",
      },
      {
        id: "f5",
        question: "Apakah ada biaya tambahan tersembunyi?",
        answer:
          "Tidak ada. Biaya yang kamu bayar hanya: (1) setup sekali bayar, dan (2) sewa domain sesuai durasi yang kamu pilih. Tidak ada komisi per transaksi, tidak ada biaya iklan internal.",
      },
      {
        id: "f6",
        question: "Bisa upgrade dari paket Basic ke Growth/Pro nanti?",
        answer:
          "Sangat bisa. Kamu cukup bayar selisih harga setup-nya saja, fitur tambahan langsung aktif di hari yang sama tanpa harus pindah domain atau bangun ulang.",
      },
    ],
  },
};

export const defaultCredentials = {
  email: "admin@website.id",
  pin: "503625", // 6-digit PIN — user can change from dashboard
};
