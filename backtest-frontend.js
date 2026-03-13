/**
 * Backtest Frontend Module
 * 
 * Provides UI for running and visualizing walk-forward backtests
 * of level detection algorithms and HOD/LOD predictions.
 */

class BacktestUI {
    constructor(apiBaseUrl = '', authToken = null) {
        this.apiBaseUrl = apiBaseUrl;
        this.authToken = authToken;
        this.isRunning = false;
        this.lastResults = null;
    }

    /**
     * Run a backtest via the API
     */
    async runBacktest(params = {}) {
        const defaults = {
            ticker: 'SPY',
            timeframe: '1d',
            lookback_bars: 200,
            eval_bars: 5,
            step_bars: 1,
            tolerance_pct: 0.15,
            max_eval_points: 100,
            mode: 'full',
        };
        const body = { ...defaults, ...params };

        this.isRunning = true;

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const response = await fetch(`${this.apiBaseUrl}/api/backtest`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            this.lastResults = data;
            return data;
        } catch (error) {
            console.error('Backtest error:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Render the backtest configuration form
     */
    renderForm(container) {
        container.innerHTML = `
            <div class="backtest-form">
                <h3>Backtest Configuration</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="bt-ticker">Ticker</label>
                        <input type="text" id="bt-ticker" value="SPY" placeholder="SPY, AAPL, etc.">
                    </div>
                    <div class="form-group">
                        <label for="bt-timeframe">Timeframe</label>
                        <select id="bt-timeframe">
                            <option value="1d" selected>1 Day</option>
                            <option value="1h">1 Hour</option>
                            <option value="4h">4 Hour</option>
                            <option value="15m">15 Min</option>
                            <option value="5m">5 Min</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bt-mode">Mode</label>
                        <select id="bt-mode">
                            <option value="full" selected>Full (Levels + HOD/LOD)</option>
                            <option value="levels">Levels Only</option>
                            <option value="hodlod">HOD/LOD Only</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="bt-lookback">Lookback Bars</label>
                        <input type="number" id="bt-lookback" value="200" min="60" max="500">
                    </div>
                    <div class="form-group">
                        <label for="bt-eval-bars">Eval Bars (forward)</label>
                        <input type="number" id="bt-eval-bars" value="5" min="1" max="20">
                    </div>
                    <div class="form-group">
                        <label for="bt-tolerance">Tolerance (%)</label>
                        <input type="number" id="bt-tolerance" value="0.15" min="0.01" max="1.0" step="0.01">
                    </div>
                    <div class="form-group">
                        <label for="bt-max-points">Max Eval Points</label>
                        <input type="number" id="bt-max-points" value="100" min="10" max="500">
                    </div>
                </div>
                <button id="bt-run" class="bt-run-btn">Run Backtest</button>
                <div id="bt-status" class="bt-status"></div>
            </div>
        `;

        // Wire up the run button
        const runBtn = container.querySelector('#bt-run');
        runBtn.addEventListener('click', () => this._handleRun(container));
    }

    async _handleRun(container) {
        const statusEl = container.querySelector('#bt-status');
        const runBtn = container.querySelector('#bt-run');

        const params = {
            ticker: container.querySelector('#bt-ticker').value.trim() || 'SPY',
            timeframe: container.querySelector('#bt-timeframe').value,
            mode: container.querySelector('#bt-mode').value,
            lookback_bars: parseInt(container.querySelector('#bt-lookback').value) || 200,
            eval_bars: parseInt(container.querySelector('#bt-eval-bars').value) || 5,
            tolerance_pct: parseFloat(container.querySelector('#bt-tolerance').value) || 0.15,
            max_eval_points: parseInt(container.querySelector('#bt-max-points').value) || 100,
        };

        runBtn.disabled = true;
        runBtn.textContent = 'Running...';
        statusEl.textContent = 'Backtest in progress. This may take a few minutes...';
        statusEl.className = 'bt-status running';

        try {
            const results = await this.runBacktest(params);
            statusEl.textContent = 'Backtest complete!';
            statusEl.className = 'bt-status success';

            // Render results below the form
            let resultsContainer = container.querySelector('.backtest-results');
            if (!resultsContainer) {
                resultsContainer = document.createElement('div');
                resultsContainer.className = 'backtest-results';
                container.appendChild(resultsContainer);
            }
            this.renderResults(results, resultsContainer);
        } catch (error) {
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.className = 'bt-status error';
        } finally {
            runBtn.disabled = false;
            runBtn.textContent = 'Run Backtest';
        }
    }

    /**
     * Render backtest results
     */
    renderResults(data, container) {
        if (!data || !data.success) {
            container.innerHTML = `<div class="bt-error">Backtest failed: ${data?.error || 'Unknown error'}</div>`;
            return;
        }

        let html = `
            <div class="bt-results-container">
                <div class="bt-results-header">
                    <h3>Backtest Results: ${data.ticker || ''} (${data.timeframe || ''})</h3>
                    <span class="bt-timestamp">${data.timestamp || new Date().toISOString()}</span>
                </div>
        `;

        // Level backtest results
        if (data.levels && data.levels.success) {
            html += this._renderLevelResults(data.levels);
        }

        // HOD/LOD backtest results
        if (data.hodlod && data.hodlod.success) {
            html += this._renderHodLodResults(data.hodlod);
        }

        // If mode was levels-only or hodlod-only, handle that
        if (data.algorithm_metrics) {
            html += this._renderLevelResults(data);
        }
        if (data.method_metrics) {
            html += this._renderHodLodResults(data);
        }

        html += '</div>';
        container.innerHTML = html;
    }

    _renderLevelResults(levelData) {
        const metrics = levelData.algorithm_metrics;
        if (!metrics) return '';

        // Sort algorithms by hit rate descending
        const sorted = Object.entries(metrics)
            .filter(([_, m]) => m.total_levels_generated > 0)
            .sort((a, b) => b[1].hit_rate - a[1].hit_rate);

        let html = `
            <div class="bt-section">
                <h4>Level Detection Backtest</h4>
                <div class="bt-meta">
                    ${levelData.eval_points || 0} evaluation points | 
                    ${levelData.total_bars || 0} total bars |
                    Lookback: ${levelData.lookback_bars || 0} | 
                    Eval window: ${levelData.eval_bars || 0} bars |
                    Tolerance: ${levelData.tolerance_pct || 0}%
                </div>
                <table class="bt-table">
                    <thead>
                        <tr>
                            <th>Algorithm</th>
                            <th>Levels</th>
                            <th>Avg/Eval</th>
                            <th>Hit Rate</th>
                            <th>Bounce Rate</th>
                            <th>Break Rate</th>
                            <th>False Pos.</th>
                            <th>Avg Dist %</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const [name, m] of sorted) {
            const hitClass = m.hit_rate >= 50 ? 'good' : m.hit_rate >= 25 ? 'ok' : 'bad';
            const bounceClass = m.bounce_rate >= 60 ? 'good' : m.bounce_rate >= 40 ? 'ok' : 'bad';

            html += `
                <tr>
                    <td class="algo-name">${name}</td>
                    <td>${m.total_levels_generated}</td>
                    <td>${m.avg_levels_per_eval}</td>
                    <td class="${hitClass}">${m.hit_rate}%</td>
                    <td class="${bounceClass}">${m.bounce_rate}%</td>
                    <td>${m.break_rate}%</td>
                    <td>${m.false_positive_rate}%</td>
                    <td>${m.avg_distance_pct}%</td>
                </tr>
            `;
        }

        // Show algorithms with 0 levels
        const empty = Object.entries(metrics)
            .filter(([_, m]) => m.total_levels_generated === 0);
        for (const [name, _] of empty) {
            html += `
                <tr class="empty-row">
                    <td class="algo-name">${name}</td>
                    <td colspan="7" class="no-data">No levels generated (model/dependency missing?)</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    _renderHodLodResults(hodlodData) {
        const metrics = hodlodData.method_metrics;
        if (!metrics) return '';

        let html = `
            <div class="bt-section">
                <h4>HOD/LOD Prediction Backtest</h4>
                <div class="bt-meta">
                    ${hodlodData.eval_points || 0} evaluation points | 
                    ${hodlodData.total_bars || 0} total bars |
                    Lookback: ${hodlodData.lookback_bars || 0}
                </div>
                <table class="bt-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Points</th>
                            <th>HOD MAE</th>
                            <th>LOD MAE</th>
                            <th>HOD MAPE</th>
                            <th>LOD MAPE</th>
                            <th>Containment</th>
                            <th>HOD Cons.</th>
                            <th>LOD Cons.</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        const methodLabels = {
            'statistical_1std': 'Statistical (1\u03C3)',
            'statistical_2std': 'Statistical (2\u03C3)',
            'statistical_3std': 'Statistical (3\u03C3)',
            'level_constrained': 'Level-Constrained',
        };

        for (const [name, m] of Object.entries(metrics)) {
            if (m.error) continue;
            const label = methodLabels[name] || name;
            const containClass = m.containment_rate >= 80 ? 'good' : m.containment_rate >= 60 ? 'ok' : 'bad';

            html += `
                <tr>
                    <td class="algo-name">${label}</td>
                    <td>${m.total_eval_points}</td>
                    <td>$${m.hod_mae.toFixed(2)}</td>
                    <td>$${m.lod_mae.toFixed(2)}</td>
                    <td>${m.hod_mape.toFixed(2)}%</td>
                    <td>${m.lod_mape.toFixed(2)}%</td>
                    <td class="${containClass}">${m.containment_rate}%</td>
                    <td>${m.hod_conservative_rate}%</td>
                    <td>${m.lod_conservative_rate}%</td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
                <div class="bt-legend">
                    <span><strong>MAE</strong> = Mean Absolute Error ($ from actual)</span>
                    <span><strong>MAPE</strong> = Mean Abs % Error</span>
                    <span><strong>Containment</strong> = % where predicted range contained actual HOD/LOD</span>
                    <span><strong>Conservative</strong> = % where prediction was beyond actual (safe side)</span>
                </div>
            </div>
        `;

        return html;
    }
}

// CSS Styles
const BACKTEST_STYLES = `
.backtest-form {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 20px;
    color: #e5e5e5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin-bottom: 20px;
}

.backtest-form h3 {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    color: #fff;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.form-group label {
    font-size: 0.75rem;
    color: #9ca3af;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-group input,
.form-group select {
    background: #252525;
    border: 1px solid #404040;
    border-radius: 6px;
    padding: 8px 10px;
    color: #e5e5e5;
    font-size: 0.875rem;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: #3b82f6;
}

.bt-run-btn {
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.bt-run-btn:hover {
    background: #2563eb;
}

.bt-run-btn:disabled {
    background: #4b5563;
    cursor: not-allowed;
}

.bt-status {
    margin-top: 10px;
    font-size: 0.875rem;
    min-height: 1.5em;
}

.bt-status.running {
    color: #f59e0b;
}

.bt-status.success {
    color: #10b981;
}

.bt-status.error {
    color: #ef4444;
}

.bt-results-container {
    background: #1a1a1a;
    border-radius: 12px;
    padding: 20px;
    color: #e5e5e5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bt-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

.bt-results-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #fff;
}

.bt-timestamp {
    font-size: 0.75rem;
    color: #6b7280;
}

.bt-section {
    margin-bottom: 24px;
}

.bt-section h4 {
    margin: 0 0 8px 0;
    font-size: 1.1rem;
    color: #fff;
}

.bt-meta {
    font-size: 0.8rem;
    color: #6b7280;
    margin-bottom: 12px;
}

.bt-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.bt-table thead th {
    background: #252525;
    color: #9ca3af;
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border-bottom: 2px solid #404040;
}

.bt-table tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #2a2a2a;
    color: #e5e5e5;
}

.bt-table tbody tr:hover {
    background: #252525;
}

.bt-table .algo-name {
    font-weight: 600;
    color: #fff;
}

.bt-table .good {
    color: #10b981;
    font-weight: 600;
}

.bt-table .ok {
    color: #f59e0b;
    font-weight: 600;
}

.bt-table .bad {
    color: #ef4444;
    font-weight: 600;
}

.bt-table .no-data {
    color: #6b7280;
    font-style: italic;
}

.bt-table .empty-row {
    opacity: 0.5;
}

.bt-legend {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.75rem;
    color: #6b7280;
}

.bt-error {
    padding: 20px;
    background: #1a1a1a;
    border-radius: 12px;
    border-left: 4px solid #ef4444;
    color: #ef4444;
}
`;

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BacktestUI, BACKTEST_STYLES };
}

if (typeof window !== 'undefined') {
    window.BacktestUI = BacktestUI;
    window.BACKTEST_STYLES = BACKTEST_STYLES;
}
