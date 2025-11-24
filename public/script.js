// Update current time
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('en-US');
}

setInterval(updateTime, 1000);
updateTime();

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionId).classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');
}

// Utility functions
function formatCurrency(num) {
    if (num === 'N/A' || num === undefined || isNaN(num)) return 'N/A';
    return 'Rp ' + Number(num).toLocaleString('id-ID');
}


function formatTime(value) {
    if (typeof value === 'string') {
        // Handle custom time strings from API like OPEN_30MIN, OPEN_5MIN, PRE_OPEN
        if (value === 'PRE_OPEN') return 'Pre-Open';
        const match = value.match(/OPEN_(\d+)MIN/);
        if (match) return `Open +${match[1]}m`;
        return value; // fallback to raw string
    } else if (typeof value === 'number') {
        if (value < 60) {
            return `${value}m`;
        } else {
            const hours = Math.floor(value / 60);
            const remainingMinutes = value % 60;
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
    } else {
        return 'N/A';
    }
}

function showLoading(elementId, message = 'Loading...') {
    document.getElementById(elementId).innerHTML = `
        <div class="loading">
            <span class="loading-spinner"></span>
            ${message}
        </div>
    `;
}

function showLoadingWithProgress(elementId, message = 'Processing...') {
    const progressBar = `
        <div class="progress-bar" id="progress-bar"></div>
        <div class="progress-text">${message} [0%]</div>
    `;
    document.getElementById(elementId).innerHTML = progressBar;

    let progress = 0;
    const updateProgress = (newProgress) => {
        progress = Math.min(newProgress, 100);
        document.getElementById('progress-bar').style.width = progress + '%';
        document.querySelector('.progress-text').textContent = `${message} [${Math.round(progress)}%]`;
    };

    // Return the update function so it can be called externally
    return updateProgress;
}

function showError(elementId, message) {
    document.getElementById(elementId).innerHTML = `
        <div class="error">
            ❌ ${message}
        </div>
    `;
}

// Screening function
async function loadScreening() {
    const resultsDiv = document.getElementById('screening-results');
    const updateProgress = showLoadingWithProgress('screening-results', 'Processing stock screening...');

    try {
        // Simulate progress updates
        updateProgress(25);
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 200));
        updateProgress(75);

        const response = await fetch('/api/screening');
            const data = await response.json();

            updateProgress(100);

            if (data.error) {
                const detail = data.details ? `: ${data.details}` : '';
                showError('screening-results', `Server error${detail}`);
                console.error('Screening API returned error:', data);
                // Optionally show debug info in console for deeper inspection
                if (data.debug) console.debug('Screening debug:', data.debug);
                return;
            }

            // Defensive checks in case API shape changed
            if (!Array.isArray(data.top10) || !Array.isArray(data.top5)) {
                console.warn('Unexpected screening response shape:', data);
                showError('screening-results', 'Unexpected response shape from server — check console for details');
                console.debug('Full screening response:', data);
                return;
            }

            displayScreeningResults(data.top10, data.top5);
    } catch (error) {
        showError('screening-results', `Failed to load screening data: ${error.message}`);
        console.error('Failed to fetch /api/screening:', error);
    }
}

function displayScreeningResults(top10, top5) {
    let html = '';

    // Top 10 Table
    html += `
        <h3>TOP 10 MOMENTUM SCALPING STOCKS</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Symbol</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Chg%</th>
                        <th>Volume</th>
                        <th>TP</th>
                        <th>SL</th>
                        <th>Est.Time</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
    `;

    top10.forEach((stock, i) => {
        const rankClass = i < 3 ? `rank-${i + 1}` : '';
        const changeClass = stock.changePercent > 0 ? 'positive' : 'negative';
        const changeSymbol = stock.changePercent > 0 ? '+' : '';

        html += `
            <tr class="${rankClass}">
                <td>${i + 1}</td>
                <td><strong>${stock.symbol.replace('.JK', '')}</strong></td>
                <td>${stock.name}</td>
                <td>${formatCurrency(stock.price)}</td>
        <td class="${changeClass}">${changeSymbol}${(stock.changePercent !== undefined && stock.changePercent !== null) ? stock.changePercent.toFixed(2) : 'N/A'}%</td>
                <td>${stock.volume.toLocaleString('en-US')}</td>
                <td>${formatCurrency(Number(stock.tp))}</td>
                <td>${formatCurrency(Number(stock.sl))}</td>
                <td>${formatTime(stock.estimatedTime)}</td>
                <td>${stock.momentumScore}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    // Top 5 Recommendations
    html += `
        <h3>TOP 5 SCALPING RECOMMENDATIONS</h3>
    `;

    top5.forEach((stock, i) => {
        html += `
            <div class="analysis-card">
                <h4>RANKING #${i + 1}</h4>
                <div class="analysis-row">
                    <span class="analysis-label">🏢 Name</span>
                    <span class="analysis-value">PT. ${stock.name}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">📊 Symbol</span>
                    <span class="analysis-value" style ="font-weight:bold;">${stock.symbol.replace('.JK', '')}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">💰 Entry</span>
                    <span class="analysis-value">${formatCurrency(stock.entry)}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">🎯 TP</span>
                    <span class="analysis-value">${formatCurrency(Number(stock.tp))}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">🛑 SL</span>
                    <span class="analysis-value">${formatCurrency(Number(stock.sl))}</span>
                </div>
                <div class="analysis-row">
                <span class="analysis-label">⏳ Est.</span>
                    <span class="analysis-value">${formatTime(stock.estimatedTime)}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">⚡ Score</span>
                    <span class="analysis-value">${stock.momentumScore}</span>
                </div>
                <div class="analysis-row">
                <span class="analysis-label">💵 Pnl</span>
                    <span class="analysis-value">${formatCurrency(stock.potentialGain)} ${(stock.profitPercent !== undefined && stock.profitPercent !== null) ? `(${stock.profitPercent.toFixed(2)}%)` : ''}</span>
                </div>
                <div class="analysis-row">
                    <span class="analysis-label">📝 </span>
                    <span class="analysis-value">   ${stock.reasons.join(', ')}</span>
                </div>
            </div>
        `;
    });

    html += `
        <div class="warning">
            ⚠️ Stock trading carries risk. This analysis is not a guarantee of profit. Focus on TOP 3 for the best opportunities.
        </div>
    `;

    document.getElementById('screening-results').innerHTML = html;
}

// Stock Analysis function
async function analisaSaham() {
    const symbol = document.getElementById('symbol-input').value.trim().toUpperCase();
    if (!symbol) {
        showError('analisa-results', 'Please enter a stock code first');
        return;
    }

    const resultsDiv = document.getElementById('analisa-results');
    const updateProgress = showLoadingWithProgress('analisa-results', `Analyzing ${symbol}...`);

    try {
        // Simulate progress updates
        updateProgress(20);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(80);

        const response = await fetch(`/api/analisa/${symbol}`);
        const data = await response.json();

        updateProgress(100);

        if (data.error) {
            showError('analisa-results', data.error);
            return;
        }

        displayAnalisaResults(data);
    } catch (error) {
        showError('analisa-results', 'Failed to analyze stock');
    }
}

function displayAnalisaResults(data) {
    const changeClass = data.change > 0 ? 'positive' : 'negative';
    const changeSymbol = data.change > 0 ? '+' : '';

    let html = `
        <div class="analysis-card">
            <h3>Stock Analysis: ${data.symbol.replace('.JK', '')} - ${data.name}</h3>
            <div class="analysis-row">
                <span class="analysis-label">Price</span>
                <span class="analysis-value">${formatCurrency(data.price)}</span>
            </div>
    <div class="analysis-row">
                <span class="analysis-label">Change</span>
                <span class="analysis-value ${changeClass}">${changeSymbol}${data.change} ${(data.changePercent !== undefined && data.changePercent !== null) ? `(${data.changePercent.toFixed(2)}%)` : '(N/A)'}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Volume</span>
                <span class="analysis-value">${data.volume.toLocaleString('en-US')}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Market Cap</span>
                <span class="analysis-value">${formatCurrency(data.marketCap)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">High/Low</span>
                <span class="analysis-value">${formatCurrency(data.dayHigh)} / ${formatCurrency(data.dayLow)}</span>
            </div>
    `;

    if (data.fullData) {
        html += `
            <div class="analysis-row">
                <span class="analysis-label">MA50</span>
                <span class="analysis-value">${formatCurrency(data.fullData.fiftyDayAverage || 0)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">MA200</span>
                <span class="analysis-value">${formatCurrency(data.fullData.twoHundredDayAverage || 0)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">PER</span>
                <span class="analysis-value">${(data.fullData.trailingPE || '-')}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">PBV</span>
                <span class="analysis-value">${(data.fullData.priceToBook || '-')}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Div Yield</span>
                <span class="analysis-value">${(data.fullData.dividendYield || '-')}%</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">EPS</span>
                <span class="analysis-value">${(data.fullData.epsTrailingTwelveMonths || '-')}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Analyst Rating</span>
                <span class="analysis-value">${(data.fullData.averageAnalystRating || '-')}</span>
            </div>
        `;
    }

    // Strategy calculation
    const price = data.price;
    const ma50 = data.fullData?.fiftyDayAverage || 0;
    const ma200 = data.fullData?.twoHundredDayAverage || 0;
    const high = data.dayHigh || price * 1.05;
    const low = data.dayLow || price * 0.95;

    let entry = price;
    let tp1, tp2, sl, note;

    if (price > ma50 && price > ma200) {
        note = "Momentum Bullish ✅";
        entry = price;
        tp1 = price * 1.05;
        tp2 = high * 1.02;
        sl = Math.min(ma50, low, entry * 0.97);
    } else if (price > ma200 && price < ma50) {
        note = "Sideways ⚠️ - be cautious entering";
        entry = price * 0.99;
        tp1 = price * 1.03;
        tp2 = high;
        sl = Math.min(ma200 * 0.98, entry * 0.97);
    } else {
        note = "Bearish ❌ - high risk";
        entry = price;
        tp1 = price * 1.02;
        tp2 = price * 1.04;
        sl = entry * 0.97;
    }

    if (sl >= entry) {
        sl = entry * 0.97;
    }

    const rr = ((tp1 - entry) / (entry - sl)).toFixed(2);

    html += `
        </div>

        <div class="strategy-section">
            <div class="strategy-title">Trading Strategy:</div>
            <div class="analysis-row">
                <span class="analysis-label">Signal</span>
                <span class="analysis-value">${note}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Entry</span>
                <span class="analysis-value">${formatCurrency(entry)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Take Profit</span>
                <span class="analysis-value">${formatCurrency(tp1)} (TP1), ${formatCurrency(tp2)} (TP2)</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Stop Loss</span>
                <span class="analysis-value">${formatCurrency(sl)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Risk/Reward</span>
                <span class="analysis-value">${rr !== undefined && rr !== null ? rr : 'N/A'}</span>
            </div>
        </div>

        <div class="analysis-row">
            <span class="analysis-label">Last Update</span>
            <span class="analysis-value">${new Date(data.lastUpdated).toLocaleString('en-US')}</span>
        </div>
    `;

    document.getElementById('analisa-results').innerHTML = html;
}



// Allow Enter key for symbol input
document.getElementById('symbol-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        analisaSaham();
    }
});
