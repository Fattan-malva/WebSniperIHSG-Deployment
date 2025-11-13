const axios = require("axios");
const colors = require("colors");

colors.setTheme({
  main: "green",
  accent: "brightGreen",
  warn: "yellow",
  danger: "red",
  info: "cyan",
  faded: "grey",
  purple: "magenta",
});

function formatCurrency(num) {
  return "Rp" + num.toLocaleString("id-ID");
}

function calculateStrategy(data) {
  const price = data.price;
  const ma50 = data.fullData?.fiftyDayAverage || 0;
  const ma200 = data.fullData?.twoHundredDayAverage || 0;
  const high = data.dayHigh || price * 1.05;
  const low = data.dayLow || price * 0.95;

  let entry = price;
  let tp1, tp2, sl, note;

  // === Analisis Momentum ===
  if (price > ma50 && price > ma200) {
    note = "Momentum Bullish ✅";
    entry = price;
    tp1 = price * 1.05;
    tp2 = high * 1.02;
    sl = Math.min(ma50, low, entry * 0.97); // SL pasti di bawah entry
  } else if (price > ma200 && price < ma50) {
    note = "Sideways ⚠️ - hati-hati entry";
    entry = price * 0.99;
    tp1 = price * 1.03;
    tp2 = high;
    sl = Math.min(ma200 * 0.98, entry * 0.97);
  } else {
    note = "Bearish ❌ - risiko tinggi";
    entry = price;
    tp1 = price * 1.02;
    tp2 = price * 1.04;
    sl = entry * 0.97; // fix: selalu 3% di bawah entry
  }

  // Pastikan SL < entry
  if (sl >= entry) {
    sl = entry * 0.97;
  }

  return { entry, tp1, tp2, sl, note };
}


function showAnalysis(data) {
  console.log(`\nAnalisa Saham: ${data.symbol.accent} - ${data.name.main}`);
  console.log(`Harga        : ${formatCurrency(data.price).main}`);
  console.log(
    `Perubahan    : ${data.change > 0 ? "+" : ""}${data.change} (${data.changePercent.toFixed(2)}%)`
  );
  console.log(`Volume       : ${data.volume.toLocaleString("id-ID").accent}`);
  console.log(`Market Cap   : ${formatCurrency(data.marketCap).faded}`);
  console.log(
    `High/Low     : ${formatCurrency(data.dayHigh)} / ${formatCurrency(data.dayLow)}`
  );

  if (data.fullData) {
    console.log(`MA50         : ${formatCurrency(data.fullData.fiftyDayAverage || 0)}`);
    console.log(`MA200        : ${formatCurrency(data.fullData.twoHundredDayAverage || 0)}`);
    console.log(`PER          : ${(data.fullData.trailingPE || "-").toString().accent}`);
    console.log(`PBV          : ${(data.fullData.priceToBook || "-").toString().accent}`);
    console.log(`Div Yield    : ${(data.fullData.dividendYield || "-").toString().accent}%`);
    console.log(`EPS          : ${(data.fullData.epsTrailingTwelveMonths || "-").toString().accent}`);
    console.log(`Analyst Rate : ${(data.fullData.averageAnalystRating || "-").toString().info}`);
  }

  // ===== Strategi Dinamis =====
  const strat = calculateStrategy(data);
  const rr = ((strat.tp1 - strat.entry) / (strat.entry - strat.sl)).toFixed(2);

  console.log("\nStrategi Trading:".warn);
  console.log(`Sinyal        : ${strat.note}`);
  console.log(`Entry Posisi  : ${formatCurrency(strat.entry).purple}`);
  console.log(`Take Profit   : ${formatCurrency(strat.tp1)} (TP1), ${formatCurrency(strat.tp2)} (TP2)`);
  console.log(`Stop Loss     : ${formatCurrency(strat.sl).danger}`);
  console.log(`Risk/Reward   : ${rr}`.info);

  console.log(`\nLast Update   : ${new Date(data.lastUpdated).toLocaleString("id-ID").faded}`);
}


function runAnalisaSaham(callback, rl) {
  rl.question("Masukkan Kode/Nama Saham (Contoh: BBCA): ".accent, async (query) => {
    try {
      const res = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${query}`);
      if (res.data && res.data.data) {
        showAnalysis(res.data.data);
      } else {
        console.log("Data tidak ditemukan.".danger);
      }
    } catch (err) {
      console.log("Gagal mengambil data:".danger, err.message);
    }
    if (typeof callback === "function") callback();
  });
}

module.exports = runAnalisaSaham;
