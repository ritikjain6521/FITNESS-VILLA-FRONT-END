import { api } from './api';

export type RazorpayOrderResponse = {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  paymentId: string;
  keyId: string;
};

export type RazorpayVerifyResponse = {
  message: string;
  payment: any;
  whatsappReceiptUrl?: string;
};

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type CheckoutOptions = {
  amountPaise: number;
  memberId?: string;
  membershipId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  notes?: string;
  businessName?: string;
};

export async function openRazorpayCheckout(
  options: CheckoutOptions
): Promise<RazorpayVerifyResponse> {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
  }

  // 1. Create order on backend
  const orderRes = await api<RazorpayOrderResponse>('/payments/razorpay/order', {
    method: 'POST',
    body: JSON.stringify({
      amountPaise: options.amountPaise,
      member: options.memberId,
      membership: options.membershipId,
      notes: options.notes || options.description || 'Online payment checkout',
    }),
  });

  const key = orderRes.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Ts9OVbN1BIApml';

  // 2. Open Razorpay modal
  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key,
      amount: orderRes.order.amount,
      currency: orderRes.order.currency || 'INR',
      name: options.businessName || 'Fitness Villa',
      description: options.description || 'Gym Membership & Services Payment',
      order_id: orderRes.order.id,
      prefill: {
        name: options.customerName || '',
        email: options.customerEmail || '',
        contact: options.customerPhone || '',
      },
      theme: {
        color: '#22c55e',
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          // 3. Verify signature cryptographically on backend
          const verifyRes = await api<RazorpayVerifyResponse>('/payments/razorpay/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          resolve(verifyRes);
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          reject(new Error('Payment was cancelled or closed before completion.'));
        },
      },
    });

    rzp.on('payment.failed', (response: any) => {
      reject(new Error(response?.error?.description || 'Razorpay payment failed.'));
    });

    rzp.open();
  });
}
