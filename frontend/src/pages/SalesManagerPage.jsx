import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import PricingPanel from '../components/PricingPanel';
import InvoicesPanel from '../components/InvoicesPanel';
import RevenuePanel from '../components/RevenuePanel';
import ReturnsPanel from '../components/ReturnsPanel';

function readStoredSalesUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role === 'sales_manager' ? parsed : null;
  } catch {
    return null;
  }
}

export default function SalesManagerPage() {
  const navigate = useNavigate();
  const [authedUser] = useState(() => readStoredSalesUser());
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  const authed = !!authedUser;
  const [activeTab, setActiveTab] = useState('pricing');

  useEffect(() => {
    if (!hasToken || !authed) {
      navigate('/login', { replace: true });
    }
  }, [hasToken, authed, navigate]);

  if (!authed) return null;

  return (
    <div className="page">
      <AppHeader />

      <div className="manager-subnav">
        <div className="manager-subnav-inner">
          <div className="category-tabs" role="tablist" aria-label="Sales manager tabs" style={{ marginBottom: 0 }}>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'pricing'}
              onClick={() => setActiveTab('pricing')}
            >
              Pricing & Discounts
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'invoices'}
              onClick={() => setActiveTab('invoices')}
            >
              Invoices
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'revenue'}
              onClick={() => setActiveTab('revenue')}
            >
              Revenue & Profit
            </button>
            <button
              type="button"
              role="tab"
              className="category-tab"
              aria-pressed={activeTab === 'returns'}
              onClick={() => setActiveTab('returns')}
            >
              Returns & Refunds
            </button>
          </div>
        </div>
      </div>

      <main className="page-body">
        <div className="container-md" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="page-hero">
            <h1>Sales Manager</h1>
            <p>
              Set prices &amp; discounts (wishlist owners get notified automatically),
              review invoices in a date range, and chart revenue / profit.
            </p>
          </div>
        </div>

        {activeTab === 'pricing' && <PricingPanel />}
        {activeTab === 'invoices' && <InvoicesPanel />}
        {activeTab === 'revenue' && <RevenuePanel />}
        {activeTab === 'returns' && <ReturnsPanel />}
      </main>
    </div>
  );
}
