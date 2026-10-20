import React from 'react';
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react';
import { money, fmt, openWhatsApp } from '../api';

export type ReceiptData = {
  receiptNumber: string;
  date: string | Date;
  gymName?: string;
  gymAddress?: string;
  gymPhone?: string;
  gymGstin?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    qty?: number;
    amountPaise: number;
    details?: string;
  }>;
  subtotalPaise: number;
  taxPaise?: number;
  discountPaise?: number;
  totalPaise: number;
  paymentMethod: string;
  status?: string;
  notes?: string;
  whatsappText?: string;
  whatsappUrl?: string;
};

export default function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: ReceiptData;
  onClose: () => void;
}) {
  function handlePrint() {
    window.print();
  }

  function handleShareWhatsApp() {
    if (receipt.whatsappUrl) {
      window.open(receipt.whatsappUrl, '_blank');
    } else {
      openWhatsApp(receipt.customerPhone, receipt.whatsappText || '');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Top Action Bar */}
        <div className="receipt-actions no-print">
          <div className="receipt-action-group">
            <button className="btn btn-green btn-sm" onClick={handleShareWhatsApp}>
              <Share2 size={15} /> Share to WhatsApp
            </button>
            <button className="btn btn-outline btn-sm" onClick={handlePrint}>
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="printable-receipt" id="printable-area">
          <div className="receipt-header">
            <div className="receipt-brand">FITNESS <span className="accent">VILLA</span></div>
            <div className="receipt-subtitle">{receipt.gymName || 'IronPulse Fitness Club'}</div>
            {receipt.gymAddress && <div className="receipt-meta">{receipt.gymAddress}</div>}
            <div className="receipt-meta">
              {receipt.gymPhone ? `Tel: ${receipt.gymPhone}` : ''}
              {receipt.gymGstin ? ` · GSTIN: ${receipt.gymGstin}` : ''}
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-grid">
            <div>
              <span className="receipt-label">RECEIPT NUMBER</span>
              <div className="receipt-value receipt-mono">#{receipt.receiptNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="receipt-label">DATE & TIME</span>
              <div className="receipt-value">{fmt(receipt.date)}</div>
            </div>
          </div>

          <div className="receipt-bill-to">
            <span className="receipt-label">MEMBER / CUSTOMER</span>
            <div className="receipt-customer-name">{receipt.customerName}</div>
            <div className="receipt-meta">
              {receipt.customerPhone ? `Phone: ${receipt.customerPhone}` : ''}
              {receipt.customerEmail ? ` · ${receipt.customerEmail}` : ''}
            </div>
          </div>

          <div className="receipt-divider" />

          {/* Line items table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th>DESCRIPTION</th>
                <th style={{ textAlign: 'center' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{it.name}</strong>
                    {it.details && <div className="receipt-item-details">{it.details}</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>{it.qty || 1}</td>
                  <td style={{ textAlign: 'right' }}>{money(it.amountPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="receipt-divider" />

          <div className="receipt-totals">
            <div className="receipt-total-row">
              <span>Subtotal</span>
              <span>{money(receipt.subtotalPaise)}</span>
            </div>
            {receipt.taxPaise ? (
              <div className="receipt-total-row">
                <span>Tax / GST</span>
                <span>+{money(receipt.taxPaise)}</span>
              </div>
            ) : null}
            {receipt.discountPaise ? (
              <div className="receipt-total-row receipt-discount">
                <span>Discount</span>
                <span>-{money(receipt.discountPaise)}</span>
              </div>
            ) : null}
            <div className="receipt-total-row receipt-grand-total">
              <span>TOTAL PAID</span>
              <span>{money(receipt.totalPaise)}</span>
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-footer">
            <div className="receipt-badge">
              <CheckCircle2 size={16} /> PAID VIA {receipt.paymentMethod.toUpperCase()}
            </div>
            {receipt.notes && <div className="receipt-notes">Note: {receipt.notes}</div>}
            <p className="receipt-tagline">Thank you for your business & dedication to fitness! 💪</p>
          </div>
        </div>
      </div>
    </div>
  );
}
