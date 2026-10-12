# Pengingat License

Aplikasi Android untuk mencatat masa berlaku license peserta dan mengirim pengingat ke email mereka lewat EmailJS.

## Struktur
```
pengingat-license/
├── .github/workflows/build-apk.yml   build APK otomatis
├── www/
│   ├── index.html
│   ├── style.css
│   └── app.js                        logika aplikasi + EmailJS
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
4. Di aplikasi, buka **Pengaturan EmailJS**, isi ketiganya, lalu Simpan. Kunci disimpan di HP, bukan di repo.

## Cara kerja pengiriman
- Tombol **Kirim email** pada kartu mengirim langsung lewat EmailJS.
- Jika **Kirim otomatis** aktif, setiap aplikasi dibuka, license yang masuk masa pengingat atau sudah kedaluwarsa dikirimi email, lalu diulang tiap 7 hari.
- Paket gratis EmailJS: 200 email per bulan.
