import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { api } from '../api';
import AppHeader from '../components/AppHeader';
import Spinner from '../components/Spinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function presetRange(kind) {
  const end = new Date();
  const start = new Date();

  if (kind === '7d') {
    start.setDate(end.getDate() - 7);
  } else if (kind === '3m') {
    start.setMonth(end.getMonth() - 3);
  } else if (kind === 'year') {
    start.setMonth(0, 1);
  } else {
    start.setDate(end.getDate() - 30);
  }

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isSalesManager(user) {
  return user?.role === 'sales_manager' || user?.role === 'salesManager';
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function SalesManagerDashboard() {
  const [user] = useState(() => readStoredUser());
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const authorized = !!token && isSalesManager(user);
  const initialRange = useMemo(() => presetRange('30d'), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [invoiceMeta, setInvoiceMeta] = useState({ total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    if (!authorized) return;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [revenueResult, invoiceResult] = await Promise.all([
        api.get(`/api/sales-manager/revenue?${params.toString()}`),
        api.get(`/api/sales-manager/invoices?${params.toString()}&page=1&limit=20`),
      ]);

      setSummary(revenueResult);
      setInvoices(invoiceResult.invoices || []);
      setInvoiceMeta({
        total: invoiceResult.total || 0,
        page: invoiceResult.page || 1,
        totalPages: invoiceResult.totalPages || 0,
      });
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [authorized, endDate, startDate]);

  useEffect(() => {
    if (authorized) loadReport();
  }, [authorized, loadReport]);

  if (!authorized) {
    return <Navigate to="/" replace />;
  }

  const chartData = summary?.chartData || [];
  const profitIsPositive = (summary?.profit || 0) >= 0;
  const chartConfig = {
    labels: chartData.map((point) => point.period),
    datasets: [
      {
        type: 'bar',
        label: 'Revenue',
        data: chartData.map((point) => point.revenue),
        backgroundColor: '#2563eb',
        borderRadius: 4,
      },
      {
        type: 'bar',
        label: 'Cost',
        data: chartData.map((point) => point.cost),
        backgroundColor: '#94a3b8',
        borderRadius: 4,
      },
      {
        type: 'line',
        label: 'Profit',
        data: chartData.map((point) => point.profit),
        borderColor: profitIsPositive ? '#16a34a' : '#dc2626',
        backgroundColor: profitIsPositive ? '#16a34a' : '#dc2626',
        pointBackgroundColor: chartData.map((point) => (point.profit >= 0 ? '#16a34a' : '#dc2626')),
        tension: 0.35,
        yAxisID: 'y',
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${currencyFormatter.format(context.parsed.y || 0)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => currencyFormatter.format(value),
        },
      },
    },
  };

  const applyPreset = (kind) => {
    const range = presetRange(kind);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  return (
    <div className="page">
      <AppHeader />

      <main className="page-body">
        <div className="container">
          <div className="page-hero">
            <h1>Sales Manager Dashboard</h1>
            <p>Revenue, estimated cost, profit, and invoices for the selected date range.</p>
          </div>

          <section className="sales-dashboard-toolbar" aria-label="Report date range">
            <label>
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              <span>End date</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <div className="sales-dashboard-presets" aria-label="Quick date ranges">
              <button type="button" className="btn btn-secondary" onClick={() => applyPreset('7d')}>
                Last 7 days
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => applyPreset('30d')}>
                Last 30 days
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => applyPreset('3m')}>
                Last 3 months
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => applyPreset('year')}>
                This year
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={loadReport} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </section>

          {error && <div className="error-message" role="alert">{error}</div>}
          {loading && <Spinner label="Generating sales report..." />}

          {!loading && summary && (
            <>
              <section className="sales-summary-grid" aria-label="Revenue summary">
                <SummaryCard label="Total Revenue" value={currencyFormatter.format(summary.totalRevenue || 0)} />
                <SummaryCard label="Total Cost" value={currencyFormatter.format(summary.totalCost || 0)} />
                <SummaryCard
                  label="Net Profit/Loss"
                  value={currencyFormatter.format(summary.profit || 0)}
                  tone={profitIsPositive ? 'positive' : 'negative'}
                />
                <SummaryCard label="Profit Margin" value={`${Number(summary.profitMargin || 0).toFixed(2)}%`} />
              </section>

              <section className="sales-dashboard-section" aria-label="Revenue and profit chart">
                <div className="sales-dashboard-section-head">
                  <h2>Revenue & Profit/Loss</h2>
                  <span>{chartData.length} period(s)</span>
                </div>
                {chartData.length ? (
                  <div className="sales-chart-frame">
                    <Chart type="bar" data={chartConfig} options={chartOptions} />
                  </div>
                ) : (
                  <div className="empty-state sales-dashboard-empty">No data for selected period</div>
                )}
              </section>

              <section className="sales-dashboard-section" aria-label="Invoices">
                <div className="sales-dashboard-section-head">
                  <h2>Invoices</h2>
                  <div className="sales-dashboard-table-actions">
                    <span>
                      {invoiceMeta.total} invoice(s)
                      {invoiceMeta.totalPages ? ` - page ${invoiceMeta.page}/${invoiceMeta.totalPages}` : ''}
                    </span>
                    <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                      Print
                    </button>
                  </div>
                </div>

                <div className="sales-dashboard-table-wrap">
                  <table className="sales-dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice, index) => (
                        <tr key={invoice.orderId || index}>
                          <td>{index + 1}</td>
                          <td>{formatDate(invoice.date)}</td>
                          <td>
                            <strong>{invoice.customerName || 'Unknown customer'}</strong>
                            {invoice.customerEmail && <span>{invoice.customerEmail}</span>}
                          </td>
                          <td>{currencyFormatter.format(invoice.totalPrice || 0)}</td>
                          <td>
                            <span className={`sales-status sales-status--${invoice.status}`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!invoices.length && (
                  <div className="empty-state sales-dashboard-empty">No invoices for selected period</div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <article className={`sales-summary-card ${tone ? `sales-summary-card--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
