# IDX Scalping Sniper 🚀

![Hacker Theme Banner](https://user-images.githubusercontent.com/674621/210176084-6d8b5b8e-6b9e-4e7a-8b6e-2e7e8c2e7b3d.png)

> **IDX Scalping Sniper**  
> Terminal-based real-time stock screener & REST API for Indonesia Stock Exchange (IDX)  
> **By Fattan Malva**

---

## ✨ Fitur Utama

- **REST API** data saham IDX (Yahoo Finance) — auto refresh tiap 1 menit
- **Terminal Screener** dengan tampilan hacker theme (hijau-hitam, tabel ASCII, progress bar)
- **Screening Sinyal Scalping**: Ranking 10 besar & 5 rekomendasi terbaik, lengkap dengan TP/SL/Entry
- **Analisis Momentum & Volume** otomatis
- **Super cepat** & ringan, cocok untuk trader aktif

---

## 🚦 Cara Pakai

### 1. Clone & Install

```bash
git clone https://github.com/Fattan-malva/Sniper-IHSG-NodeJS.git
cd scalping-ihsg
npm install
```

### 2. Siapkan Data Kode Saham

Pastikan file `stockcode.csv` sudah ada di folder utama.  
Format minimal:
```
Code
BBCA
BBRI
TLKM
UNVR
...
```

### 3. Jalankan REST API

```bash
npm start
```
Server berjalan di: [https://sniper-ihsg.vercel.app/api/stocks](https://sniper-ihsg.vercel.app/api/stocks)

### 4. Jalankan Screener Terminal

```bash
node Screnning.js
```

### 5. Jalankan Warrant Screener

```bash
node WarrantScreener.js
```