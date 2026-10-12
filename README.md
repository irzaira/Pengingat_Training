# Pengingat Training dan Refresher

Aplikasi Android untuk mencatat jadwal training atau refresher peserta dan mengirim pengingat lewat email (EmailJS) dan SMS otomatis dari HP.

## Struktur
```
pengingat-license/
├── .github/workflows/build-apk.yml   build APK otomatis
├── native/
│   ├── SmsSenderPlugin.java          plugin Android untuk kirim SMS otomatis
│   └── MainActivity.java             mendaftarkan plugin SMS
├── www/
│   ├── index.html
│   ├── style.css
│   └── app.js                        logika aplikasi + EmailJS + SMS
├── capacitor.config.json
├── package.json
└── README.md
```

## Build APK dari GitHub
1. Buat repo baru di GitHub, lalu upload semua isi folder ini ke branch `main`.
2. Buka tab **Actions**, pilih **Build APK**, lalu **Run workflow** (juga jalan otomatis tiap push).
3. Setelah selesai, unduh `pengingat-license-apk` dari bagian **Artifacts**, ekstrak, lalu pasang `app-debug.apk` di HP (izinkan pasang dari sumber tidak dikenal).

## Setup EmailJS (sekali saja)
1. Daftar di emailjs.com, lalu **Email Services** > Add New Service (Gmail atau lainnya). Catat **Service ID**.
2. **Email Templates** > Create New Template:
   - To Email: `{{to_email}}`
   - Subject: `{{subject}}`
   - Content: `{{message}}`
   
   Catat **Template ID**.
3. **Account** > General: salin **Public Key**.
4. Di aplikasi, buka **Pengaturan EmailJS dan SMS**, isi ketiganya, lalu Simpan. Kunci disimpan di HP, bukan di repo.

## Cara kerja pengiriman
- Tombol **Kirim email** pada kartu mengirim langsung lewat EmailJS.
- Jika **Kirim otomatis** aktif, setiap aplikasi dibuka, jadwal yang masuk masa pengingat dikirimi pesan (email dan SMS): tiap 7 hari, lalu tiap hari selama 5 hari terakhir sampai hari pelaksanaan. Setelah tanggal lewat, pengiriman berhenti.
- Paket gratis EmailJS: 200 email per bulan.

## Notifikasi pengingat
Aplikasi menjadwalkan notifikasi di HP (jam 08.00) pada awal masa pengingat, 7 hari sebelum tanggal pelaksanaan, lalu tiap hari selama 5 hari terakhir (sampai hari pelaksanaan). Ketuk notifikasi untuk membuka aplikasi, dan pesan pengingat dikirim otomatis. Izinkan notifikasi saat diminta.

## Cadangan data
Menu **Cadangan data**: salin teks cadangan dan simpan di catatan. APK hasil build baru tidak bisa menimpa APK lama, jadi aplikasi lama harus dihapus dulu. Pulihkan datanya dari teks cadangan itu.

## SMS otomatis
Isi kolom **Nomor HP** pada tiap peserta (format 08xxx, 62xxx, atau +62xxx). Email atau nomor HP boleh salah satu.
- SMS dikirim langsung dari HP yang memasang aplikasi, memakai pulsa atau paket SMS HP tersebut. Tidak perlu layanan pihak ketiga.
- Saat pertama kali mengirim, Android meminta izin **SMS**. Pilih **Izinkan**.
- Jadwalnya sama dengan email: tiap 7 hari, lalu tiap hari selama 5 hari terakhir sampai hari pelaksanaan. Pengiriman otomatis berjalan saat aplikasi dibuka (termasuk lewat ketukan notifikasi 08.00).
- Tombol **Kirim SMS** pada kartu mengirim langsung. Jika dibuka di luar APK (misalnya di browser), tombol itu membuka aplikasi SMS dengan pesan yang sudah terisi.
- Status "SMS terkirim" berarti SMS sudah diserahkan ke jaringan seluler, bukan jaminan sudah diterima peserta.
- Beberapa HP (Xiaomi, Oppo, Vivo, dan sejenisnya) punya pengaturan keamanan tambahan untuk "kirim SMS". Jika SMS gagal, cek izin aplikasi di pengaturan HP.
- Data lama yang berisi nomor WhatsApp otomatis dipindah menjadi nomor HP.

## Isi pesan
Tiap jadwal diisi **Training** atau **Refresher** (salah satu). Pesan yang dikirim:

> Kepada Yth. (nama peserta), akan ada training (nama) pada tanggal (tanggal). Mohon agar hadir di training tersebut.

Untuk SMS, isinya sama tetapi dibuat ringkas dalam satu paragraf.

Untuk refresher, kata "training" diganti "refresher".
