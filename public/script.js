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

async function analisaSaham() {
    const symbol = document.getElementById('symbol-input').value.trim().toUpperCase();
    if (!symbol) {
        showError('analisa-results', 'Please enter a stock code first');
        return;
    }

    const resultsDiv = document.getElementById('analisa-results');
    const updateProgress = showLoadingWithProgress('analisa-results', `Analyzing ${symbol}...`);

    try {
        updateProgress(20);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(80);

        const response = await fetch(`/api/analisa/${symbol}`);
        const result = await response.json();

        updateProgress(100);

        if (result.error) {
            showError('analisa-results', result.error);
            return;
        }

        if (!result.success || !result.data) {
            showError('analisa-results', 'No analysis data available');
            return;
        }

        displayAnalisaResults(result.data);
    } catch (error) {
        showError('analisa-results', `Failed to analyze stock: ${error.message || error}`);
    }
}

function displayAnalisaResults(d) {
    const data = d || {};

    const changeClass = data.change > 0 ? 'positive' : 'negative';
    const changeSymbol = data.change > 0 ? '+' : '';

    // Add highlight class for summary signals
    const summary = data.summary || {};
    const signalClass = summary.signal && summary.signal.toUpperCase() === 'STRONG_BULLISH' ? 'key-signal positive' :
                        summary.signal && summary.signal.toUpperCase() === 'STRONG_BEARISH' ? 'key-signal negative' : '';

    let html = `
        <div class="analysis-card">
            <h3>Stock Analysis: ${data.symbol?.replace('.JK', '') || 'N/A'} - ${data.name || 'N/A'}</h3>
            <div class="analysis-row">
                <span class="analysis-label">Price</span>
                <span class="analysis-value">${formatCurrency(data.price)}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Change</span>
                <span class="analysis-value ${changeClass}">
                    ${changeSymbol}${data.change ?? 'N/A'} (${(data.changePercent != null ? (data.changePercent * 100).toFixed(2) : 'N/A')}%)
                </span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Volume</span>
                <span class="analysis-value">${data.volume?.toLocaleString('en-US') ?? 'N/A'}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Market Cap</span>
                <span class="analysis-value">${formatCurrency(data.marketCap)}</span>
            </div>
    `;

    if (data.fullData) {
        const fd = data.fullData?.fullData || data.fullData; // safer fallback

        html += `
        <div class="analysis-row">
            <span class="analysis-label">MA50</span>
            <span class="analysis-value">${formatCurrency(fd?.fiftyDayAverage ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">MA200</span>
            <span class="analysis-value">${formatCurrency(fd?.twoHundredDayAverage ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">PER</span>
            <span class="analysis-value">${fd?.trailingPE ?? '-'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">PBV</span>
            <span class="analysis-value">${fd?.priceToBook ?? '-'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Div Yield</span>
            <span class="analysis-value">${fd?.dividendYield ?? 0}%</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">EPS</span>
            <span class="analysis-value">${fd?.epsTrailingTwelveMonths ?? '-'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Analyst Rating</span>
            <span class="analysis-value">${fd?.averageAnalystRating ?? '-'}</span>
        </div>
    `;
    }
    if (data.summary) {
        const sum = data.summary;

        html += `
    <div class="section-title">Summary</div>

    <div class="analysis-row">
        <span class="analysis-label">Signal</span>
        <span class="analysis-value ${signalClass}">${sum.signal ?? 'N/A'}</span>
    </div>

    <div class="analysis-row">
        <span class="analysis-label">Action</span>
        <span class="analysis-value">${sum.action ?? 'N/A'}</span>
    </div>

    <div class="analysis-row">
        <span class="analysis-label">Confidence</span>
        <span class="analysis-value">${sum.confidence ?? 'N/A'}</span>
    </div>

    <div class="analysis-row">
        <span class="analysis-label">Risk Level</span>
        <span class="analysis-value">${sum.riskLevel ?? 'N/A'}</span>
    </div>

    <div class="analysis-row">
        <span class="analysis-label">Time Frame</span>
        <span class="analysis-value">${sum.timeFrame ?? 'N/A'}</span>
    </div>
    `;
    }



    if (data.summary?.keyLevels) {
        const kl = data.summary.keyLevels;
        html += `
    <div class="analysis-subsection-title">Summary Key Levels</div>
    <div class="analysis-row">
        <span class="analysis-label">Support</span>
        <span class="analysis-value">${formatCurrency(kl.support ?? 0)}</span>
    </div>
    <div class="analysis-row">
        <span class="analysis-label">Resistance</span>
        <span class="analysis-value">${formatCurrency(kl.resistance ?? 0)}</span>
    </div>
    `;
    }



    if (data.technicalAnalysis) {
        const ta = data.technicalAnalysis;

        html += `
        <div class="section-title">Technical Analysis</div>
        <div class="analysis-row">
            <span class="analysis-label">Trend Direction</span>
            <span class="analysis-value">${ta.trend?.trendDirection ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Golden Cross</span>
            <span class="analysis-value">${ta.trend?.goldenCross ? 'Yes' : 'No'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Volume Signal</span>
            <span class="analysis-value">${ta.volume?.volumeSignal ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Price Position</span>
            <span class="analysis-value">${ta.priceAction?.positionSignal ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Momentum</span>
            <span class="analysis-value">${ta.momentum?.priceMomentum ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Volatility Risk</span>
            <span class="analysis-value">${ta.risk?.volatilityRisk ?? 'N/A'}</span>
        </div>
        `;
    }


    if (data.tradingStrategy) {
        const ts = data.tradingStrategy;
        html += `
        <div class="section-title">Trading Strategy</div>
        <div class="analysis-row">
            <span class="analysis-label">Signal</span>
            <span class="analysis-value">${ts.primarySignal ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Action</span>
            <span class="analysis-value">${ts.action ?? 'HOLD'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Confidence</span>
            <span class="analysis-value">${ts.confidence ?? 'MEDIUM'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Risk Level</span>
            <span class="analysis-value">${ts.riskManagement?.riskLevel ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Time Frame</span>
            <span class="analysis-value">${ts.timeFrame ?? 'N/A'}</span>
        </div>

        <div class="analysis-subsection-title">Entry Strategy</div>
        <div class="analysis-row">
            <span class="analysis-label">Recommendation</span>
            <span class="analysis-value">${ts.entryStrategy?.recommendation ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Ideal Entry</span>
            <span class="analysis-value">${typeof ts.entryStrategy?.idealEntry === 'number' ? formatCurrency(ts.entryStrategy.idealEntry) : ts.entryStrategy?.idealEntry ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Aggressive Entry</span>
            <span class="analysis-value">${typeof ts.entryStrategy?.aggressiveEntry === 'number' ? formatCurrency(ts.entryStrategy.aggressiveEntry) : ts.entryStrategy?.aggressiveEntry ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Entry Condition</span>
            <span class="analysis-value">${ts.entryStrategy?.entryCondition ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Confirmation</span>
            <span class="analysis-value">${ts.entryStrategy?.confirmation ?? 'N/A'}</span>
        </div>

        <div class="analysis-subsection-title">Exit Strategy</div>
        <div class="analysis-row">
            <span class="analysis-label">Take Profit 1</span>
            <span class="analysis-value">${typeof ts.exitStrategy?.takeProfit1 === 'number' ? formatCurrency(ts.exitStrategy.takeProfit1) : ts.exitStrategy?.takeProfit1 ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Take Profit 2</span>
            <span class="analysis-value">${typeof ts.exitStrategy?.takeProfit2 === 'number' ? formatCurrency(ts.exitStrategy.takeProfit2) : ts.exitStrategy?.takeProfit2 ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Stop Loss</span>
            <span class="analysis-value">${typeof ts.exitStrategy?.stopLoss === 'number' ? formatCurrency(ts.exitStrategy.stopLoss) : ts.exitStrategy?.stopLoss ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Trailing Stop</span>
            <span class="analysis-value">${ts.exitStrategy?.trailingStop ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Risk Reward Ratio</span>
            <span class="analysis-value">${ts.exitStrategy?.riskRewardRatio ?? 'N/A'}</span>
        </div>

        <div class="analysis-subsection-title">Risk Management</div>
        <div class="analysis-row">
            <span class="analysis-label">Position Size</span>
            <span class="analysis-value">${ts.riskManagement?.positionSize ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Max Loss</span>
            <span class="analysis-value">${ts.riskManagement?.maxLoss ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Volatility Alert</span>
            <span class="analysis-value">${ts.riskManagement?.volatilityAlert ?? 'N/A'}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Recommendation</span>
            <span class="analysis-value">${ts.riskManagement?.recommendation ?? 'N/A'}</span>
        </div>

        <div class="analysis-subsection-title">Key Levels</div>
        <div class="analysis-row">
            <span class="analysis-label">Immediate Resistance</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.immediateResistance ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Immediate Support</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.immediateSupport ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Resistance 1</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.resistance1 ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Resistance 2</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.resistance2 ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Support 1</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.support1 ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Support 2</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.support2 ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Psychological Resistance</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.psychologicalResistance ?? 0)}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Psychological Support</span>
            <span class="analysis-value">${formatCurrency(ts.keyLevels?.psychologicalSupport ?? 0)}</span>
        </div>
        `;
    }


    // Last update info
    html += `
        <div class="analysis-row">
            <span class="analysis-label">Last Update</span>
            <span class="analysis-value">${new Date(data.lastUpdated).toLocaleString('en-US')}</span>
        </div>
    </div>`;

    document.getElementById('analisa-results').innerHTML = html;
}



// Allow Enter key for symbol input
document.getElementById('symbol-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        analisaSaham();
    }
});
