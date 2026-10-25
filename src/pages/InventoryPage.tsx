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
  BookOpen,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  Zap,
  Trash2,
} from 'lucide-react';
import ReceiptModal, { ReceiptData } from '../components/ReceiptModal';
import { openRazorpayCheckout } from '../razorpay';

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

  // User Guidance state
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('inventory_guide_open') !== 'false';
  });
  const [guideTab, setGuideTab] = useState<'flow' | 'products' | 'purchases' | 'pos' | 'analytics'>('flow');

  function toggleGuide() {
    setShowGuide((prev) => {
      localStorage.setItem('inventory_guide_open', String(!prev));
      return !prev;
    });
  }

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
  const [posMethod, setPosMethod] = useState<'cash' | 'upi' | 'card' | 'razorpay'>('razorpay');
  const [submittingSale, setSubmittingSale] = useState(false);

  type PurchaseItemRow = {
    isManual: boolean;
    product?: string;
    name?: string;
    category?: string;
    qty: number;
    unitCost: string;
    sellingPrice?: string;
  };

  // Inward Purchase Form State
  const [purSupplierType, setPurSupplierType] = useState<'select' | 'manual'>('manual');
  const [purSupplier, setPurSupplier] = useState('');
  const [purSupplierManual, setPurSupplierManual] = useState('');
  const [purInvoice, setPurInvoice] = useState('');
  const [purItems, setPurItems] = useState<PurchaseItemRow[]>([]);
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

  async function handleDeleteProduct(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete product "${name}"? It will be removed from active inventory.`)) return;
    try {
      await api(`/inventory/products/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p._id !== id));
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  }

  async function handleDeleteSale(id: string, saleNumber: string) {
    if (!window.confirm(`Are you sure you want to delete sale ${saleNumber}? Product stock will be returned to inventory.`)) return;
    try {
      await api(`/inventory/sales/${id}`, { method: 'DELETE' });
      setSales(prev => prev.filter(s => s._id !== id));
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sale');
    }
  }

  function openPurchaseModal() {
    const hasSuppliers = suppliers.length > 0;
    setPurSupplierType(hasSuppliers ? 'select' : 'manual');
    setPurSupplier(hasSuppliers ? suppliers[0]._id : '');
    setPurSupplierManual('');
    setPurInvoice(`PUR-${Date.now().toString().slice(-6)}`);
    setPurNotes('');

    if (products.length > 0) {
      setPurItems([
        {
          isManual: false,
          product: products[0]._id,
          name: products[0].name,
          category: products[0].category,
          qty: 10,
          unitCost: (products[0].purchasePricePaise / 100).toString(),
          sellingPrice: (products[0].sellingPricePaise / 100).toString(),
        },
      ]);
    } else {
      setPurItems([
        {
          isManual: true,
          product: '',
          name: '',
          category: 'Supplements',
          qty: 10,
          unitCost: '500',
          sellingPrice: '750',
        },
      ]);
    }
    setShowPurchase(true);
  }

  // Handle Inward Purchase from Supplier
  async function handlePurchaseSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (purSupplierType === 'manual' && !purSupplierManual.trim()) {
      alert('Please enter a supplier name');
      return;
    }
    if (purSupplierType === 'select' && !purSupplier) {
      alert('Please select a supplier from the list or switch to manual entry');
      return;
    }
    if (purItems.length === 0) {
      alert('Please add at least one product to purchase');
      return;
    }

    for (let i = 0; i < purItems.length; i++) {
      const it = purItems[i];
      if (it.isManual && !it.name?.trim()) {
        alert(`Please enter a name for item #${i + 1}`);
        return;
      }
      if (!it.isManual && !it.product) {
        alert(`Please select an existing product for item #${i + 1} or switch it to manual`);
        return;
      }
    }

    setSubmittingPur(true);
    try {
      await api('/inventory/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplier: purSupplierType === 'select' && purSupplier ? purSupplier : undefined,
          supplierName: purSupplierType === 'manual' ? purSupplierManual.trim() : undefined,
          invoiceNumber: purInvoice.trim() || undefined,
          paymentMethod: purMethod,
          notes: purNotes.trim(),
          items: purItems.map((it) => ({
            product: !it.isManual && it.product ? it.product : undefined,
            name: it.isManual ? it.name?.trim() : undefined,
            category: it.isManual ? it.category || 'Supplements' : undefined,
            sellingPricePaise:
              it.isManual && it.sellingPrice ? Math.round(Number(it.sellingPrice) * 100) : undefined,
            qty: Math.max(1, it.qty || 1),
            unitCostPaise: Math.round(Number(it.unitCost || 0) * 100),
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
      if (posMethod === 'razorpay') {
        const selectedM = members.find((m) => m._id === posCustomer);
        const customerName = selectedM?.name || posWalkInName || 'Walk-in Customer';
        const customerPhone = selectedM?.phone || posWalkInPhone;
        const customerEmail = selectedM?.email;

        await openRazorpayCheckout({
          amountPaise: posTotalPaise,
          memberId: posCustomer || undefined,
          customerName,
          customerPhone,
          customerEmail,
          description: `POS Counter Store Sale`,
        });
      }

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
          <button
            className={`btn ${showGuide ? 'btn-green' : 'btn-outline'}`}
            onClick={toggleGuide}
            title="Toggle Step-by-Step User Guidance"
          >
            <BookOpen size={15} /> {showGuide ? 'Hide Guide' : 'User Guide'}
          </button>
          <button className="btn btn-outline" onClick={openPurchaseModal}>
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

      {/* Interactive User Guidance Banner */}
      {showGuide && (
        <div
          style={{
            background: 'linear-gradient(145deg, #121915 0%, #0d1210 100%)',
            border: '1px solid #23382b',
            borderRadius: '12px',
            padding: '18px 20px',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            position: 'relative',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--green)',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#f3f4f6', fontWeight: 600 }}>
                  Stock, Purchases & POS Sales — Operations Guide (उपयोग मार्गदर्शिका)
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                  Complete step-by-step workflow: Master Products ➔ Inward Purchases ➔ POS Counter Billing ➔ Profit Reports
                </p>
              </div>
            </div>

            <button
              className="icon-btn"
              onClick={toggleGuide}
              title="Close Guide"
              style={{ background: '#1c2420', color: '#9ca3af' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Sub Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #1f2a23', paddingBottom: '10px', marginBottom: '14px' }}>
            {[
              { id: 'flow', label: '⚡ Complete Workflow (पूरा चक्र)' },
              { id: 'products', label: '📦 1. Add Product' },
              { id: 'purchases', label: '🚚 2. Record Inward Purchase' },
              { id: 'pos', label: '🛍️ 3. POS Counter Sale' },
              { id: 'analytics', label: '📊 4. Margins & Reorder' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn btn-xs ${guideTab === t.id ? 'btn-green' : 'btn-outline'}`}
                style={{
                  fontSize: '12px',
                  padding: '5px 12px',
                  height: 'auto',
                  borderRadius: '6px',
                  borderColor: guideTab === t.id ? undefined : '#26332a',
                }}
                onClick={() => setGuideTab(t.id as any)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content: Flow */}
          {guideTab === 'flow' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>STEP 1</span>
                  <strong style={{ fontSize: '14px', color: '#f3f4f6' }}>Stock Inward (माल अंदर लेना)</strong>
                </div>
                <p style={{ fontSize: '12.5px', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
                  सप्लायर से माल आने पर <strong>Record Inward Purchase</strong> दबाएं। सप्लायर का नाम लिखें और खरीदे गए प्रोडक्ट्स दर्ज करें। इससे स्टॉक अपने आप बढ़ जाएगा और जिम का खर्चा भी जुड़ जाएगा।
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  style={{ marginTop: '10px', fontSize: '11px', width: '100%', justifyContent: 'center' }}
                  onClick={openPurchaseModal}
                >
                  <Truck size={13} /> Record Inward Stock
                </button>
              </div>

              <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ background: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>STEP 2</span>
                  <strong style={{ fontSize: '14px', color: '#f3f4f6' }}>POS Counter Sale (काउंटर बिलिंग)</strong>
                </div>
                <p style={{ fontSize: '12.5px', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
                  मेंबर या वॉक-इन ग्राहक को बेचते समय <strong>POS Counter Sale</strong> खोलें। प्रोडक्ट चुनें, डिस्काउंट दें और बिल बनाएं। तुरंत <strong>WhatsApp रसीद</strong> या <strong>प्रिंट बिल</strong> निकालें।
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  style={{ marginTop: '10px', fontSize: '11px', width: '100%', justifyContent: 'center', borderColor: 'var(--green)', color: 'var(--green)' }}
                  onClick={() => setShowPOS(true)}
                >
                  <ShoppingBag size={13} /> Open POS Counter
                </button>
              </div>

              <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ background: '#78350f', color: '#fcd34d', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>STEP 3</span>
                  <strong style={{ fontSize: '14px', color: '#f3f4f6' }}>Profit & Reorders (निगरानी)</strong>
                </div>
                <p style={{ fontSize: '12.5px', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
                  जब भी कोई प्रोडक्ट रीऑर्डर सीमा से कम होगा, आपको <strong>Low Stock Alert</strong> दिखेगा। <strong>Profit & Margins</strong> टैब में देखें कि जिम ने इन्वेंटरी से कितना शुद्ध मुनाफा कमाया।
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  style={{ marginTop: '10px', fontSize: '11px', width: '100%', justifyContent: 'center' }}
                  onClick={() => setActiveTab('analytics')}
                >
                  <TrendingUp size={13} /> View Profit Margins
                </button>
              </div>
            </div>
          )}

          {/* Tab Content: Add Product */}
          {guideTab === 'products' && (
            <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px', color: '#f3f4f6' }}>📦 How to Use: Add Product (नया आइटम जोड़ना)</strong>
                <button className="btn btn-green btn-xs" onClick={() => setShowAddProd(true)}>
                  <Plus size={13} /> + Open Add Product
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d1d5db', lineHeight: 1.7 }}>
                <li><strong>कब करें:</strong> जब कोई नया आइटम (ब्रांड, शेकर, प्रोटीन, मर्चेंडाइज) जिम में पहली बार बेचना हो।</li>
                <li><strong>SKU Code:</strong> प्रोडक्ट का एक यूनिक कोड दर्ज करें (उदा. <code>ON-WHEY-1KG</code> या बारकोड) जो बिलिंग में तुरंत सर्च करने में मदद करे।</li>
                <li><strong>Purchase Price vs Selling Price:</strong> लागत मूल्य (Cost) और बिक्री मूल्य (MRP) डालें ताकि सिस्टम आपका ग्रॉस प्रॉफिट मार्जिन (%) खुद निकाल सके।</li>
                <li><strong>Reorder Alert Threshold:</strong> न्यूनतम सीमा (जैसे 5 पीस) तय करें। जब भी स्टॉक इस नंबर पर या इससे नीचे पहुंचेगा, सिस्टम आपको अलर्ट देगा।</li>
              </ul>
            </div>
          )}

          {/* Tab Content: Purchases */}
          {guideTab === 'purchases' && (
            <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px', color: '#f3f4f6' }}>🚚 How to Use: Record Inward Purchase (खरीद दर्ज करना)</strong>
                <button className="btn btn-green btn-xs" onClick={openPurchaseModal}>
                  <Truck size={13} /> Open Purchase Form
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d1d5db', lineHeight: 1.7 }}>
                <li><strong>सप्लायर मैनुअल एंट्री:</strong> यदि सप्लायर पहले से सेव नहीं है, तो <code>✍️ Manual Entry</code> बटन दबाकर सीधे सप्लायर/डिस्ट्रीब्यूटर का नाम टाइप करें। सिस्टम इसे अपने आप डेटाबेस में सेव कर लेगा।</li>
                <li><strong>इनलाइन नया प्रोडक्ट जोड़ना:</strong> अगर इस खरीद में कोई नया प्रोडक्ट आया है, तो <code>+ ✍️ Manual / New Product</code> बटन दबाएं। आप सीधे प्रोडक्ट का नाम, कैटेगरी, खरीद रेट और बिक्री रेट एक साथ दर्ज कर सकते हैं — अलग से पहले प्रोडक्ट बनाने की ज़रूरत नहीं!</li>
                <li><strong>ऑटोमैटिक स्टॉक & खर्चा:</strong> बिल सबमिट करते ही प्रोडक्ट का स्टॉक बढ़ जाएगा और जिम के एकाउंट्स/खर्चों में इसका बिल अपने आप जुड़ जाएगा।</li>
              </ul>
            </div>
          )}

          {/* Tab Content: POS */}
          {guideTab === 'pos' && (
            <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px', color: '#f3f4f6' }}>🛍️ How to Use: POS Counter Sale (काउंटर बिक्री & रसीद)</strong>
                <button className="btn btn-green btn-xs" onClick={() => setShowPOS(true)}>
                  <ShoppingBag size={13} /> Open POS Checkout
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d1d5db', lineHeight: 1.7 }}>
                <li><strong>ग्राहक चयन:</strong> अगर खरीदार जिम का मेंबर है तो लिस्ट से उसका नाम चुनें (उसकी खरीद हिस्ट्री में दर्ज होगा)। अगर बाहरी ग्राहक है तो 'Walk-in Customer' रखकर नाम और WhatsApp नंबर डालें।</li>
                <li><strong>मल्टी-आइटम कार्ट:</strong> <code>+ Add Another Product</code> दबाकर एक ही बिल में कई प्रोडक्ट्स बेच सकते हैं।</li>
                <li><strong>डिस्काउंट & पेमेंट:</strong> अगर कोई छूट देनी हो तो डिस्काउंट (₹) भरें और UPI / Cash / Card चुनें।</li>
                <li><strong>डिजिटल रसीद & WhatsApp:</strong> बिक्री पूरी होते ही स्क्रीन पर ऑफिशियल रसीद आ जाती है, जिसे एक क्लिक में ग्राहक के WhatsApp पर भेजा या प्रिंट किया जा सकता है।</li>
              </ul>
            </div>
          )}

          {/* Tab Content: Analytics */}
          {guideTab === 'analytics' && (
            <div style={{ background: '#151d18', border: '1px solid #233128', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px', color: '#f3f4f6' }}>📊 How to Use: Profit Margins & Stock Control (मार्जिन और स्टॉक निगरानी)</strong>
                <button className="btn btn-outline btn-xs" onClick={() => downloadFile('/reports/export/inventory?format=xlsx', 'inventory_stock.xlsx')}>
                  <FileSpreadsheet size={13} color="#22c55e" /> Download Excel
                </button>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#d1d5db', lineHeight: 1.7 }}>
                <li><strong>Low Stock Filter:</strong> ऊपर 'Show low stock only' पर टिक करने से केवल वही प्रोडक्ट्स दिखेंगे जो खत्म होने वाले हैं।</li>
                <li><strong>Profit & Margins Tab:</strong> यह आपको बताता है कि वर्तमान में आपके स्टोर रूम में कितने रुपये का माल रखा है (Cost vs Selling Valuation) और बिक्री पर कुल कितना ग्रॉस मार्जिन (%) कमाया।</li>
                <li><strong>Excel Export:</strong> पूरा इन्वेंटरी स्टॉक, खरीद लागत, बिक्री मूल्य और बैलेंस किसी भी समय Excel फाइल में डाउनलोड करें।</li>
              </ul>
            </div>
          )}
        </div>
      )}

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
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => { setAdjustTarget(p); setAdjustQty('10'); }}
                                  title="Adjust or restock stock level"
                                >
                                  <RefreshCw size={12} /> Restock
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={() => handleDeleteProduct(p._id, p.name)}
                                  title="Delete Product"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
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
                          <button
                            className="icon-btn danger"
                            onClick={() => handleDeleteSale(s._id, s.saleNumber)}
                            title="Delete Sale (Restores Stock)"
                          >
                            <Trash2 size={13} />
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
                    <option value="razorpay">⚡ Razorpay Online Gateway (Live UPI QR / Cards / Netbanking)</option>
                    <option value="upi">UPI / GPay / QR (Manual)</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS Machine (Offline)</option>
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
                  {submittingSale
                    ? 'Processing…'
                    : posMethod === 'razorpay'
                    ? '⚡ Pay via Razorpay & Generate Receipt'
                    : 'Complete Sale & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Inward Purchase Modal */}
      {showPurchase && (
        <div className="modal-backdrop" onClick={() => setShowPurchase(false)}>
          <div className="login-modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="eyebrow">INWARD STOCK</div>
                <h2 style={{ fontSize: '26px', margin: '4px 0' }}>Record Supplier Purchase</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowPurchase(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handlePurchaseSubmit} style={{ display: 'grid', gap: '14px', marginTop: '16px' }}>
              {/* Supplier & Invoice Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Supplier / Vendor</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className={`btn btn-xs ${purSupplierType === 'select' ? 'btn-green' : 'btn-outline'}`}
                        style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', minHeight: 0 }}
                        onClick={() => {
                          setPurSupplierType('select');
                          if (!purSupplier && suppliers.length > 0) setPurSupplier(suppliers[0]._id);
                        }}
                        disabled={suppliers.length === 0}
                        title={suppliers.length === 0 ? 'No suppliers saved yet' : 'Select from existing suppliers'}
                      >
                        📋 Saved ({suppliers.length})
                      </button>
                      <button
                        type="button"
                        className={`btn btn-xs ${purSupplierType === 'manual' ? 'btn-green' : 'btn-outline'}`}
                        style={{ padding: '2px 8px', fontSize: '11px', height: 'auto', minHeight: 0 }}
                        onClick={() => setPurSupplierType('manual')}
                      >
                        ✍️ Manual Entry
                      </button>
                    </div>
                  </div>

                  {purSupplierType === 'select' && suppliers.length > 0 ? (
                    <select
                      value={purSupplier}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setPurSupplierType('manual');
                        } else {
                          setPurSupplier(e.target.value);
                        }
                      }}
                    >
                      <option value="">-- Choose Existing Supplier --</option>
                      {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                      <option value="__NEW__">➕ Type New Supplier Manually...</option>
                    </select>
                  ) : (
                    <div>
                      <input
                        value={purSupplierManual}
                        onChange={(e) => setPurSupplierManual(e.target.value)}
                        placeholder="Type Supplier Name (e.g. Optimum Nutrition, MuscleBlaze, Star Distributors)"
                        required
                        style={{ borderColor: purSupplierManual.trim() ? 'var(--green)' : undefined }}
                      />
                      {suppliers.length === 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                          💡 No suppliers saved yet. Enter the supplier name above and it will be saved automatically.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                    Supplier Invoice / Bill No
                  </label>
                  <input
                    value={purInvoice}
                    onChange={(e) => setPurInvoice(e.target.value)}
                    placeholder="e.g. INV-2026-908"
                  />
                </div>
              </div>

              {/* Purchased Products */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Purchased Products</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {products.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                        onClick={() => {
                          setPurItems([
                            ...purItems,
                            {
                              isManual: false,
                              product: products[0]._id,
                              name: products[0].name,
                              category: products[0].category,
                              qty: 10,
                              unitCost: (products[0].purchasePricePaise / 100).toString(),
                              sellingPrice: (products[0].sellingPricePaise / 100).toString(),
                            },
                          ]);
                        }}
                      >
                        + Existing Product
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '12px', padding: '4px 10px', borderColor: 'var(--green)', color: 'var(--green)' }}
                      onClick={() => {
                        setPurItems([
                          ...purItems,
                          {
                            isManual: true,
                            name: '',
                            category: 'Supplements',
                            qty: 10,
                            unitCost: '500',
                            sellingPrice: '750',
                          },
                        ]);
                      }}
                    >
                      + ✍️ Manual / New Product
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                  {purItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#121714',
                        border: '1px solid #232b24',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                          Item #{idx + 1} &nbsp;
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: item.isManual ? '#1f2937' : '#064e3b',
                              color: item.isManual ? '#9ca3af' : '#6ee7b7',
                            }}
                          >
                            {item.isManual ? '✍️ Manual New Product' : '📦 Existing Product'}
                          </span>
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {products.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-xs btn-outline"
                              style={{ padding: '1px 6px', fontSize: '11px', height: 'auto', minHeight: 0 }}
                              onClick={() => {
                                const next = [...purItems];
                                if (next[idx].isManual) {
                                  next[idx].isManual = false;
                                  next[idx].product = products[0]._id;
                                  next[idx].unitCost = (products[0].purchasePricePaise / 100).toString();
                                  next[idx].sellingPrice = (products[0].sellingPricePaise / 100).toString();
                                } else {
                                  next[idx].isManual = true;
                                  next[idx].name = '';
                                  next[idx].category = 'Supplements';
                                  next[idx].sellingPrice = '750';
                                }
                                setPurItems(next);
                              }}
                            >
                              {item.isManual ? 'Switch to Existing' : 'Switch to Manual Entry'}
                            </button>
                          )}
                          {purItems.length > 1 && (
                            <button
                              type="button"
                              className="icon-btn danger"
                              style={{ width: '22px', height: '22px' }}
                              onClick={() => setPurItems(purItems.filter((_, i) => i !== idx))}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.isManual ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.8fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <input
                              placeholder="Product Name (e.g. Whey Gold 1kg)"
                              value={item.name || ''}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].name = e.target.value;
                                setPurItems(next);
                              }}
                              required
                            />
                          </div>
                          <div>
                            <select
                              value={item.category || 'Supplements'}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].category = e.target.value;
                                setPurItems(next);
                              }}
                            >
                              <option value="Supplements">Supplements</option>
                              <option value="Equipment">Equipment</option>
                              <option value="Accessories">Accessories</option>
                              <option value="Beverages">Beverages</option>
                              <option value="Apparel">Apparel</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.qty}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].qty = parseInt(e.target.value, 10) || 1;
                                setPurItems(next);
                              }}
                              title="Quantity received"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Cost ₹"
                              value={item.unitCost}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].unitCost = e.target.value;
                                setPurItems(next);
                              }}
                              title="Unit Purchase Cost"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Sell ₹"
                              value={item.sellingPrice || ''}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].sellingPrice = e.target.value;
                                setPurItems(next);
                              }}
                              title="Selling Price / MRP"
                            />
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.2fr', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <select
                              value={item.product}
                              onChange={(e) => {
                                const p = products.find((prod) => prod._id === e.target.value);
                                const next = [...purItems];
                                next[idx].product = e.target.value;
                                if (p) {
                                  next[idx].unitCost = (p.purchasePricePaise / 100).toString();
                                  next[idx].sellingPrice = (p.sellingPricePaise / 100).toString();
                                }
                                setPurItems(next);
                              }}
                            >
                              {products.map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name} ({p.sku}) — {p.currentQty} in stock
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.qty}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].qty = parseInt(e.target.value, 10) || 1;
                                setPurItems(next);
                              }}
                              title="Quantity received"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Cost ₹"
                              value={item.unitCost}
                              onChange={(e) => {
                                const next = [...purItems];
                                next[idx].unitCost = e.target.value;
                                setPurItems(next);
                              }}
                              title="Unit Purchase Cost"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Cost Summary */}
              <div
                style={{
                  background: '#181f1a',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Total Purchase Cost:</span>
                <strong style={{ fontSize: '18px', color: 'var(--green)' }}>
                  {money(
                    purItems.reduce(
                      (sum, it) => sum + Math.round(Number(it.unitCost || 0) * 100) * Math.max(1, it.qty || 1),
                      0
                    )
                  )}
                </strong>
              </div>

              <div className="modal-grid-2">
                <label>Payment Method
                  <select value={purMethod} onChange={(e) => setPurMethod(e.target.value)}>
                    <option value="bank_transfer">Bank Transfer / IMPS</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="credit">Credit / Account Payable</option>
                    <option value="card">Debit / Credit Card</option>
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
