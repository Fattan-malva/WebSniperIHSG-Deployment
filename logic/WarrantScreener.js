const axios = require('axios');
const colors = require('colors');
const Table = require('cli-table3');
const yahooFinance = require('yahoo-finance2').default;
const fs = require('fs');
const parse = require('csv-parse/sync');

yahooFinance.setGlobalConfig({ validation: { logErrors: false } });

// Hacker theme: hijau, hitam, kuning untuk warning
colors.setTheme({
    main: 'green',
    accent: 'brightGreen',
    warn: 'yellow',
    danger: 'red',
    info: 'cyan',
    faded: 'grey',
    highlight: ['black', 'bgGreen'],
    tableHead: ['green', 'bold'],
    tableCell: 'brightGreen'
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearConsole() {
    process.stdout.write('\x1B[2J\x1B[0f');
}

function formatCurrency(num) {
    if (num === 'N/A' || num === undefined) return 'N/A'.faded;
    return 'Rp' + num.toLocaleString('id-ID');
}

// Fungsi untuk mengambil semua kode saham dari file lokal
function getAllIDXStockCodes() {
    try {
        const csvText = fs.readFileSync('./api/stockcode.csv', 'utf8');
        const records = parse.parse(csvText, { columns: true, skip_empty_lines: true });
        return records.map(rec => rec.Code?.trim()).filter(Boolean);
    } catch (error) {
        console.log('Error membaca file stockcode.csv'.danger);
        return [];
    }
}

// Fungsi untuk generate simbol warran
function getWarrantSymbols() {
    const stockCodes = getAllIDXStockCodes();
    return stockCodes.map(code => `${code}-W.JK`);
}

async function getWarrantData() {
    const warrantSymbols = getWarrantSymbols();
    console.log(`📡 Mengambil data ${warrantSymbols.length} warran...`.info);

    const results = [];
    const cliProgress = require('cli-progress');
    const bar = new cliProgress.SingleBar(
        {
            format: `Screening [{bar}] {percentage}% | {value}/{total} Warran`.bold.magenta,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true,
            barsize: 50,
            linewrap: true,
        },
        cliProgress.Presets.shades_classic
    );

    bar.start(warrantSymbols.length, 0);

    for (const symbol of warrantSymbols) {
        try {
            const stock = await yahooFinance.quote(symbol, { validateResult: false });
            
            if (stock?.symbol && stock.regularMarketPrice !== undefined && stock.regularMarketPrice > 0 && (stock.regularMarketVolume || 0) > 0) {
                results.push(stock);
            }
        } catch (error) {
            // Skip tanpa log error
        }
        bar.increment();
        await sleep(50);
    }

    bar.stop();
    return results;
}

async function getParentStockData(symbol) {
    try {
        const parentSymbol = symbol.replace('-W.JK', '');
        const res = await axios.get(`https://sniper-ihsg.vercel.app/api/stocks/${parentSymbol}`);
        const stock = res.data.data;

        return {
            symbol: stock.symbol,
            price: stock.price || 0
        };
    } catch (error) {
        return null;
    }
}

async function screenWarrants(warrants) {
    const screenedWarrants = [];

    for (const warrant of warrants) {
        const parentData = await getParentStockData(warrant.symbol);
        if (!parentData) {
            continue;
        }

        screenedWarrants.push({
            symbol: warrant.symbol,
            price: warrant.regularMarketPrice || 0,
            parentPrice: parentData.price
        });

        await sleep(100);
    }

    return screenedWarrants;
}

function displayWarrantTable(warrants, title = 'DAFTAR WARRAN YANG AKTIF') {
    if (warrants.length === 0) {
        console.log('❌ Tidak ditemukan warran yang memenuhi kriteria saat ini.'.warn);
        return;
    }

    const table = new Table({
        head: [
            'Symbol', 'Harga Warran', 'Harga Induk'
        ].map(h => h.tableHead),
        style: { head: [], border: ['green'] },
        colAligns: ['left', 'right', 'right'],
        colWidths: [15, 15, 15]
    });

    // Sort by symbol for consistent display
    warrants.sort((a, b) => a.symbol.localeCompare(b.symbol));

    warrants.forEach((warrant) => {
        table.push([
            warrant.symbol.accent,
            formatCurrency(warrant.price).main,
            formatCurrency(warrant.parentPrice).info
        ]);
    });

    console.log('\n' + '═'.repeat(60).main);
    console.log(` ${title.main} `.highlight);
    console.log('═'.repeat(60).main);
    console.log(table.toString());
    console.log(`📊 Total: ${warrants.length} warran aktif ditemukan`.info);
}

async function runWarrantScreener(callback) {
    clearConsole();
    console.log(`

██████╗░░█████╗░░█████╗░██╗░░██╗██████╗░░█████╗░██████╗░  ██╗██╗░░██╗░██████╗░██████╗░
██╔══██╗██╔══██╗██╔══██╗██║░██╔╝██╔══██╗██╔══██╗██╔══██╗  ██║██║░░██║██╔════╝██╔════╝░
██████╦╝███████║██║░░╚═╝█████═╝░██║░░██║██║░░██║██████╔╝  ██║███████║╚█████╗░██║░░██╗░
██╔══██╗██╔══██║██║░░██╗██╔═██╗░██║░░██║██║░░██║██╔══██╗  ██║██╔══██║░╚═══██╗██║░░╚██╗
██████╦╝██║░░██║╚█████╔╝██║░╚██╗██████╔╝╚█████╔╝██║░░██║  ██║██║░░██║██████╔╝╚██████╔╝
╚═════╝░╚═╝░░╚═╝░╚════╝░╚═╝░░╚═╝╚═════╝░░╚════╝░╚═╝░░╚═╝  ╚═╝╚═╝░░╚═╝╚═════╝░░╚═════╝░
                 IDX SCALPING SNIPER • by Fattan Malva • v3.0
`.accent);

    console.log(`⏰ ${new Date().toLocaleString('id-ID')}\n`.faded);

    try {
        const warrants = await getWarrantData();
        
        if (warrants.length === 0) {
            console.log('❌ Tidak ada data warran yang ditemukan'.danger);
            return;
        }

        console.log(`✅ Ditemukan ${warrants.length} warran aktif`.main);
        console.log('🔍 Menganalisis data warran...'.info);

        const screenedWarrants = await screenWarrants(warrants);
        displayWarrantTable(screenedWarrants);

        console.log('\n' + '⚠️  PERINGATAN RISIKO:'.warn.bold);
        console.log('• Trading warran berisiko tinggi dan kompleks'.warn);
        console.log('• Harga bisa turun drastis mendekati expiry date'.warn);
        console.log('• Analisis ini bukan jaminan profit, lakukan riset mandiri'.warn);
        console.log('• Data mungkin tidak lengkap karena keterbatasan API'.warn);
        console.log('• Harga warran mungkin tidak real-time karena keterbatasan sumber data'.warn);

        console.log('\n' + '🎯 Tips:'.info.bold);
        console.log('• Bandingkan harga warran dengan harga saham induk'.info);
        console.log('• Volume trading yang tinggi menandakan likuiditas baik'.info);

    } catch (error) {
        console.log('❌ Error dalam screening warran'.danger);
    }

    // Call callback to return to menu
    if (callback) callback();
}

// Suppress semua Yahoo Finance validation errors
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args[0];
    if (typeof message === 'string' && (
        message.includes('validation.md') || 
        message.includes('Expected union value') ||
        message.includes('YahooNumber') ||
        message.includes('schema validation') ||
        message.includes('yahoo-finance2')
    )) {
        return;
    }
    originalConsoleError.apply(console, args);
};

// Export the function for use in menu
module.exports = runWarrantScreener;
