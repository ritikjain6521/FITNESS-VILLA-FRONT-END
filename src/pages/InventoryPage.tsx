import React, { useEffect, useState } from 'react';
import { api, money, fmt, downloadFile } from '../api';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Truck,
  Printer,
  Share2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';

type Product = {
  _id: string;
  sku: string;
  name: string;
  category: string;
  currentQty: number;
  reorderThreshold: number;
  sellingPricePaise: number;
  purchasePricePaise: number;
  active: boolean;
};

type Supplier = { _id: string; name: string; phone?: string; contactPerson?: string };
type Member = { _id: string; name: string; phone?: string; email: string };

type Sale = {
  _id: string;
  saleNumber: string;
  member?: { name: string; phone?: string };
  items: Array<{
    product: string;
    productName: string;
    qty: number;
    unitPricePaise: number;
    totalPaise: number;
  }>;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  paymentMethod: string;
  createdAt: string;
};

type Analytics = {
  totalProductsCount: number;
  totalStockUnits: number;
  totalValuationCostPaise: number;
  totalValuationSellingPaise: number;
  potentialProfitPaise: number;
  lowStockCount: number;
  totalSalesCount: number;
  totalSalesRevenuePaise: number;
  totalCOGS: number;
  grossProfitPaise: number;
  grossMarginPercent: number;
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'pos' | 'purchases' | 'analytics'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLow, setShowLow] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddProd, setShowAddProd] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // New product form
  const [newProd, setNewProd] = useState({
    sku: '',
    name: '',
    category: 'Supplements',
    currentQty: '10',
    reorderThreshold: '5',
    purchasePrice: '500',
    sellingPrice: '999',
  });
  const [savingProd, setSavingProd] = useState(false);

  // Restock modal
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('New stock batch');
  const [adjusting, setAdjusting] = useState(false);

  // POS Sale Form State
  const [posCustomer, setPosCustomer] = useState('');
  const [posWalkInName, setPosWalkInName] = useState('');
  const [posWalkInPhone, setPosWalkInPhone] = useState('');
  const [posItems, setPosItems] = useState<Array<{ product: string; qty: number }>>([]);
  const [posDiscount, setPosDiscount] = useState('0');
  const [posMethod, setPosMethod] = useState<'cash' | 'upi' | 'card'>('upi');
  const [submittingSale, setSubmittingSale] = useState(false);

  // Inward Purchase Form State
  const [purSupplier, setPurSupplier] = useState('');
  const [purInvoice, setPurInvoice] = useState('');
  const [purItems, setPurItems] = useState<Array<{ product: string; qty: number; unitCost: string }>>([]);
  const [purMethod, setPurMethod] = useState('bank_transfer');
  const [purNotes, setPurNotes] = useState('');
  const [submittingPur, setSubmittingPur] = useState(false);

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({
      limit: '200',
      ...(showLow ? { lowStock: 'true' } : {}),
      ...(search ? { search } : {}),
    });

    Promise.all([
      api<{ items: Product[] }>(`/inventory/products?${qs}`),
      api<{ items: Supplier[] }>('/inventory/suppliers'),
      api<{ items: Sale[] }>('/inventory/sales?limit=100'),
      api<Analytics>('/inventory/analytics'),
      api<{ items: Member[] }>('/members?limit=300'),
    ])
      .then(([p, sup, s, ana, m]) => {
        setProducts(p.items);
        setSuppliers(sup.items || []);
        setSales(s.items || []);
        setAnalytics(ana);
        setMembers(m.items || []);
        if (p.items.length > 0 && posItems.length === 0) {
          setPosItems([{ product: p.items[0]._id, qty: 1 }]);
          setPurItems([{ product: p.items[0]._id, qty: 10, unitCost: (p.items[0].purchasePricePaise / 100).toString() }]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [showLow]);

  // Handle Add Product
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProd(true);
    try {
      await api('/inventory/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: newProd.sku.trim(),
          name: newProd.name.trim(),
          category: newProd.category.trim(),
          currentQty: Math.max(0, parseInt(newProd.currentQty, 10) || 0),
          reorderThreshold: Math.max(0, parseInt(newProd.reorderThreshold, 10) || 5),
          purchasePricePaise: Math.round(Number(newProd.purchasePrice) * 100),
          sellingPricePaise: Math.round(Number(newProd.sellingPrice) * 100),
        }),
      });
      setShowAddProd(false);
      setNewProd({
        sku: '',
        name: '',
        category: 'Supplements',
        currentQty: '10',
        reorderThreshold: '5',
        purchasePrice: '500',
        sellingPrice: '999',
      });
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to add product');
    } finally {
      setSavingProd(false);
    }
  }

  // Handle Stock Adjust
  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustTarget) return;
    setAdjusting(true);
    try {
      await api(`/inventory/products/${adjustTarget._id}/adjust`, {
        method: 'POST',
        body: JSON.stringify({
          qtyChange: parseInt(adjustQty, 10) || 0,
          reason: adjustReason.trim(),
        }),
      });
      setAdjustTarget(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed');
    } finally {
      setAdjusting(false);
    }
  }

  // Handle Inward Purchase from Supplier
  async function handlePurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingPur(true);
    try {
      await api('/inventory/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier: purSupplier || undefined,
          invoiceNumber: purInvoice.trim() || undefined,
          paymentMethod: purMethod,
          notes: purNotes.trim(),
          items: purItems.map((it) => ({
            product: it.product,
            qty: Math.max(1, it.qty),
            unitCostPaise: Math.round(Number(it.unitCost) * 100),
          })),
        }),
      });
      setShowPurchase(false);
      alert('Stock inward purchase recorded and added to inventory!');
      load();
    } catch (err: any) {
      alert(err.message || 'Purchase recording failed');
    } finally {
      setSubmittingPur(false);
    }
  }

  // Handle POS Sale Submit
  async function handlePOSSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingSale(true);
    try {
      const res = await api<{
        item: Sale;
        whatsappReceiptUrl?: string;
        whatsappReceiptText?: string;
      }>('/inventory/sales', {
        method: 'POST',
        body: JSON.stringify({
          member: posCustomer || undefined,
          customerName: !posCustomer ? posWalkInName.trim() : undefined,
          customerPhone: !posCustomer ? posWalkInPhone.trim() : undefined,
          items: posItems.map((it) => ({ product: it.product, qty: Math.max(1, it.qty) })),
          discountPaise: Math.round(Number(posDiscount) * 100),
          paymentMethod: posMethod,
        }),
      });

      setShowPOS(false);
      load();

      // Show digital receipt modal immediately
      if (res.item) {
        showReceiptForSale(res.item, res.whatsappReceiptUrl, res.whatsappReceiptText);
      }
    } catch (err: any) {
      alert(err.message || 'Sale failed');
    } finally {
      setSubmittingSale(false);
    }
  }

  function showReceiptForSale(s: Sale, waUrl?: string, waText?: string) {
    setActiveReceipt({
      receiptNumber: s.saleNumber,
      date: s.createdAt,
      customerName: s.member?.name || posWalkInName || 'Walk-in Customer',
      customerPhone: s.member?.phone || posWalkInPhone,
      items: s.items.map((it) => ({
        name: it.productName,
        qty: it.qty,
        amountPaise: it.totalPaise,
        details: `Unit Price: ${money(it.unitPricePaise)}`,
      })),
      subtotalPaise: s.subtotalPaise,
      discountPaise: s.discountPaise,
      totalPaise: s.totalPaise,
      paymentMethod: s.paymentMethod,
      whatsappUrl: waUrl,
      whatsappText: waText,
    });
  }

  function viewExistingSaleReceipt(s: Sale) {
    api<{ sale: Sale; whatsappReceiptUrl: string }>(`/inventory/sales/${s._id}/receipt`)
      .then((r) => {
        showReceiptForSale(s, r.whatsappReceiptUrl);
      })
      .catch(() => showReceiptForSale(s));
  }

  // Calculate POS subtotal live
  const posSubtotalPaise = posItems.reduce((sum, item) => {
    const prod = products.find((p) => p._id === item.product);
    return sum + (prod ? prod.sellingPricePaise * item.qty : 0);
  }, 0);
  const posDiscountPaise = Math.round(Number(posDiscount || 0) * 100);
  const posTotalPaise = Math.max(0, posSubtotalPaise - posDiscountPaise);

  const lowStockCount = products.filter((p) => p.currentQty <= p.reorderThreshold).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Stock, Purchases & POS Sales</h1>
          <p className="muted">Supplements, retail merchandise, inward supplier orders, and profit analysis</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => downloadFile('/reports/export/inventory?format=xlsx', 'inventory_stock.xlsx')}>
            <FileSpreadsheet size={15} color="#22c55e" /> Export Excel
          </button>
          <button className="btn btn-outline" onClick={() => setShowPurchase(true)}>
            <Truck size={15} /> Record Inward Purchase
          </button>
          <button className="btn btn-green" onClick={() => setShowPOS(true)}>
            <ShoppingBag size={15} /> POS Counter Sale
          </button>
          <button className="btn btn-outline" onClick={() => setShowAddProd(true)}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={18} />
          <span>
            <strong>{lowStockCount}</strong> product{lowStockCount > 1 ? 's' : ''} have fallen at or below safety reorder threshold!
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} /> All Products & Stock ({products.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pos')}
        >
          <ShoppingBag size={16} /> POS Counter Sales ({sales.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrendingUp size={16} /> Profit & Margins Analysis
        </button>
      </div>

      {/* Tab 1: Products & Stock */}
      {activeTab === 'products' && (
        <>
          <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={showLow} onChange={(e) => setShowLow(e.target.checked)} /> Show low stock only
            </label>
            <input
              type="text"
              placeholder="Search by SKU or Product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{ width: '280px', padding: '6px 12px' }}
            />
          </div>

          {loading ? (
            <div className="page-loading"><div className="spinner" /></div>
          ) : (
            <div className="table-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>In Stock</th>
                      <th>Cost Price</th>
                      <th>Selling Price</th>
                      <th>Margin</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr><td colSpan={8} className="empty-td">No products found.</td></tr>
                    ) : (
                      products.map((p) => {
                        const isLow = p.currentQty <= p.reorderThreshold;
                        const margin = p.sellingPricePaise > 0 ? Math.round(((p.sellingPricePaise - p.purchasePricePaise) / p.sellingPricePaise) * 100) : 0;
                        return (
                          <tr key={p._id}>
                            <td><code>{p.sku}</code></td>
                            <td><strong>{p.name}</strong></td>
                            <td><span className="pill">{p.category || 'General'}</span></td>
                            <td>
                              <span className={isLow ? 'badge badge-red' : 'badge badge-green'}>
                                {p.currentQty} units {isLow ? '⚠ Low' : ''}
                              </span>
                            </td>
                            <td>{money(p.purchasePricePaise)}</td>
                            <td><strong style={{ color: 'var(--green)' }}>{money(p.sellingPricePaise)}</strong></td>
                            <td><span className="pill" style={{ color: margin > 20 ? '#86efac' : '#fde047' }}>+{margin}%</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => { setAdjustTarget(p); setAdjustQty('10'); }}
                                title="Adjust or restock stock level"
                              >
                                <RefreshCw size={12} /> Restock
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab 2: POS Counter Sales */}
      {activeTab === 'pos' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Items Purchased</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Receipt & Sharing</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr><td colSpan={7} className="empty-td">No retail store sales recorded yet.</td></tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s._id}>
                      <td><code>{s.saleNumber}</code></td>
                      <td>
                        <strong>{s.member?.name || 'Walk-in'}</strong>
                        {s.member?.phone && <br />}
                        {s.member?.phone && <small className="muted">{s.member.phone}</small>}
                      </td>
                      <td>
                        <small>
                          {s.items.map((it) => `${it.productName} (x${it.qty})`).join(', ')}
                        </small>
                      </td>
                      <td><strong style={{ color: 'var(--green)' }}>{money(s.totalPaise)}</strong></td>
                      <td><span className="pill">{s.paymentMethod.toUpperCase()}</span></td>
                      <td>{fmt(s.createdAt)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => viewExistingSaleReceipt(s)} title="View & Print Bill">
                            <Printer size={13} /> Bill
                          </button>
                          <button
                            className="btn btn-sm whatsapp-btn"
                            onClick={() => {
                              api<{ whatsappReceiptUrl: string }>(`/inventory/sales/${s._id}/receipt`).then((r) => {
                                if (r.whatsappReceiptUrl) window.open(r.whatsappReceiptUrl, '_blank');
                              });
                            }}
                            title="Share Bill on WhatsApp"
                          >
                            <Share2 size={13} /> WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Profit & Margins Analytics */}
      {activeTab === 'analytics' && analytics && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-value">{money(analytics.totalValuationCostPaise)}</div>
              <div className="kpi-label">Stock Value at Cost</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{money(analytics.totalValuationSellingPaise)}</div>
              <div className="kpi-label">Stock Value at Retail</div>
            </div>
            <div className="kpi-card kpi-accent">
              <div className="kpi-value" style={{ color: 'var(--green)' }}>{money(analytics.potentialProfitPaise)}</div>
              <div className="kpi-label">Potential Gross Profit in Warehouse</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{analytics.totalStockUnits}</div>
              <div className="kpi-label">Total Units in Stock</div>
            </div>
          </div>

          <div className="kpi-grid mt-4">
            <div className="kpi-card">
              <div className="kpi-value">{money(analytics.totalSalesRevenuePaise)}</div>
              <div className="kpi-label">Realized Retail Sales Revenue</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">{money(analytics.totalCOGS)}</div>
              <div className="kpi-label">Cost of Goods Sold (COGS)</div>
            </div>
            <div className="kpi-card kpi-accent">
              <div className="kpi-value" style={{ color: 'var(--green)' }}>{money(analytics.grossProfitPaise)}</div>
              <div className="kpi-label">Realized Store Profit</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value" style={{ color: '#86efac' }}>{analytics.grossMarginPercent}%</div>
              <div className="kpi-label">Gross Margin %</div>
            </div>
          </div>
        </div>
      )}

      {/* POS Modal */}
      {showPOS && (
        <div className="modal-backdrop" onClick={() => setShowPOS(false)}>
          <div className="login-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">COUNTER CHECKOUT</div>
                <h2 style={{ fontSize: '26px', margin: '4px 0' }}>Point of Sale (POS)</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowPOS(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handlePOSSubmit} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <label>Customer Type
                <select value={posCustomer} onChange={(e) => setPosCustomer(e.target.value)}>
                  <option value="">Walk-in Customer (Non-Member)</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.phone || m.email})
                    </option>
                  ))}
                </select>
              </label>

              {!posCustomer && (
                <div className="modal-grid-2">
                  <label>Walk-in Name
                    <input value={posWalkInName} onChange={(e) => setPosWalkInName(e.target.value)} placeholder="e.g. Rahul Kumar" />
                  </label>
                  <label>WhatsApp Phone Number
                    <input value={posWalkInPhone} onChange={(e) => setPosWalkInPhone(e.target.value)} placeholder="e.g. 9876543210" />
                  </label>
                </div>
              )}

              {/* Items in cart */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Items to Sell</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (products.length > 0) {
                        setPosItems([...posItems, { product: products[0]._id, qty: 1 }]);
                      }
                    }}
                  >
                    + Add Another Product
                  </button>
                </label>
                {posItems.map((item, idx) => (
                  <div key={idx} className="pos-item-row">
                    <select
                      style={{ flex: 3 }}
                      value={item.product}
                      onChange={(e) => {
                        const next = [...posItems];
                        next[idx].product = e.target.value;
                        setPosItems(next);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({money(p.sellingPricePaise)}) - {p.currentQty} in stock
                        </option>
                      ))}
                    </select>
                    <input
                      style={{ flex: 1 }}
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => {
                        const next = [...posItems];
                        next[idx].qty = parseInt(e.target.value, 10) || 1;
                        setPosItems(next);
                      }}
                      placeholder="Qty"
                    />
                    {posItems.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setPosItems(posItems.filter((_, i) => i !== idx))}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-grid-2">
                <label>Discount (₹)
                  <input
                    type="number"
                    min="0"
                    value={posDiscount}
                    onChange={(e) => setPosDiscount(e.target.value)}
                    placeholder="0"
                  />
                </label>
                <label>Payment Method
                  <select value={posMethod} onChange={(e) => setPosMethod(e.target.value as any)}>
                    <option value="upi">UPI / GPay / QR</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS Machine</option>
                  </select>
                </label>
              </div>

              {/* Total Summary */}
              <div style={{ background: '#181f1a', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>Total Amount Payable:</span>
                <strong style={{ fontSize: '20px', color: 'var(--green)' }}>{money(posTotalPaise)}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPOS(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }} disabled={submittingSale || posItems.length === 0}>
                  {submittingSale ? 'Processing…' : 'Complete Sale & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Inward Purchase Modal */}
      {showPurchase && (
        <div className="modal-backdrop" onClick={() => setShowPurchase(false)}>
          <div className="login-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">INWARD STOCK</div>
                <h2 style={{ fontSize: '26px', margin: '4px 0' }}>Record Supplier Purchase</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowPurchase(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handlePurchaseSubmit} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <div className="modal-grid-2">
                <label>Supplier
                  <select value={purSupplier} onChange={(e) => setPurSupplier(e.target.value)}>
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                </label>
                <label>Supplier Invoice / Bill No
                  <input value={purInvoice} onChange={(e) => setPurInvoice(e.target.value)} placeholder="e.g. INV-2026-908" />
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Purchased Products</span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      if (products.length > 0) {
                        setPurItems([...purItems, { product: products[0]._id, qty: 10, unitCost: '400' }]);
                      }
                    }}
                  >
                    + Add Product Batch
                  </button>
                </label>
                {purItems.map((item, idx) => (
                  <div key={idx} className="pos-item-row">
                    <select
                      style={{ flex: 3 }}
                      value={item.product}
                      onChange={(e) => {
                        const next = [...purItems];
                        next[idx].product = e.target.value;
                        setPurItems(next);
                      }}
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input
                      style={{ flex: 1 }}
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => {
                        const next = [...purItems];
                        next[idx].qty = parseInt(e.target.value, 10) || 1;
                        setPurItems(next);
                      }}
                      placeholder="Qty"
                    />
                    <input
                      style={{ flex: 1.5 }}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => {
                        const next = [...purItems];
                        next[idx].unitCost = e.target.value;
                        setPurItems(next);
                      }}
                      placeholder="Cost (₹)"
                    />
                    {purItems.length > 1 && (
                      <button type="button" className="icon-btn danger" onClick={() => setPurItems(purItems.filter((_, i) => i !== idx))}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-grid-2">
                <label>Payment Method
                  <select value={purMethod} onChange={(e) => setPurMethod(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer / IMPS</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit / Account Payable</option>
                  </select>
                </label>
                <label>Notes
                  <input value={purNotes} onChange={(e) => setPurNotes(e.target.value)} placeholder="Batch expiry date, lot #, etc." />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPurchase(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }} disabled={submittingPur || purItems.length === 0}>
                  {submittingPur ? 'Recording…' : 'Record Inward Stock & Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProd && (
        <div className="modal-backdrop" onClick={() => setShowAddProd(false)}>
          <div className="login-modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">NEW CATALOG ITEM</div>
                <h2 style={{ fontSize: '26px', margin: '4px 0' }}>Add Product</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowAddProd(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: 'grid', gap: '12px', marginTop: '14px' }}>
              <div className="modal-grid-1-2">
                <label>SKU Code *
                  <input required value={newProd.sku} onChange={(e) => setNewProd((p) => ({ ...p, sku: e.target.value }))} placeholder="SUP-WHEY-01" />
                </label>
                <label>Product Name *
                  <input required value={newProd.name} onChange={(e) => setNewProd((p) => ({ ...p, name: e.target.value }))} placeholder="Whey Isolate 2kg" />
                </label>
              </div>
              <div className="modal-grid-2">
                <label>Category
                  <select value={newProd.category} onChange={(e) => setNewProd((p) => ({ ...p, category: e.target.value }))}>
                    <option value="Supplements">Supplements</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Beverages">Beverages & Shakes</option>
                  </select>
                </label>
                <label>Initial Stock Qty
                  <input type="number" min="0" required value={newProd.currentQty} onChange={(e) => setNewProd((p) => ({ ...p, currentQty: e.target.value }))} />
                </label>
              </div>
              <div className="modal-grid-3">
                <label>Cost Price (₹)
                  <input type="number" min="0" step="0.01" required value={newProd.purchasePrice} onChange={(e) => setNewProd((p) => ({ ...p, purchasePrice: e.target.value }))} />
                </label>
                <label>Selling Price (₹) *
                  <input type="number" min="0" step="0.01" required value={newProd.sellingPrice} onChange={(e) => setNewProd((p) => ({ ...p, sellingPrice: e.target.value }))} />
                </label>
                <label>Reorder Alert Level
                  <input type="number" min="0" required value={newProd.reorderThreshold} onChange={(e) => setNewProd((p) => ({ ...p, reorderThreshold: e.target.value }))} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddProd(false)}>Cancel</button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }} disabled={savingProd}>
                  {savingProd ? 'Adding…' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {adjustTarget && (
        <div className="modal-backdrop" onClick={() => setAdjustTarget(null)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <div className="eyebrow">STOCK ADJUSTMENT</div>
            <h2 style={{ fontSize: '26px', margin: '4px 0' }}>{adjustTarget.name}</h2>
            <p className="muted">Current quantity in stock: <strong>{adjustTarget.currentQty}</strong></p>
            <form onSubmit={handleAdjust} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              <label>Quantity Change (+ to restock, - to write-off)
                <input type="number" required value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} />
              </label>
              <label>Reason / Note
                <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder="e.g. Restocked batch" />
              </label>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAdjustTarget(null)}>Cancel</button>
                <button type="submit" className="btn btn-green" style={{ flex: 1 }} disabled={adjusting}>
                  {adjusting ? 'Updating…' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}
