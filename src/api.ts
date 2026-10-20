const getApiBase = (): string => {
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string)?.trim();
  if (envUrl) {
    const clean = envUrl.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  // In production (Vercel), default to the deployed Render backend
  if ((import.meta as any).env?.PROD) {
    return 'https://fitness-villa-back-end.onrender.com/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const BASE = getApiBase();

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('fitnessvilla_token') || localStorage.getItem('ironpulse_token');
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Only set application/json if body is NOT FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({ message: 'Unexpected server response' }));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = localStorage.getItem('fitnessvilla_token') || localStorage.getItem('ironpulse_token');
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Download failed' }));
    throw new Error(err.message || 'Download failed');
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format((paise || 0) / 100);

export const fmt = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const daysLeft = (end: string | Date) =>
  Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);

export function cleanPhone(phone?: string): string {
  if (!phone) return '';
  let p = phone.replace(/[^0-9]/g, '');
  if (p.length === 10) p = '91' + p;
  return p;
}

export function openWhatsApp(phone?: string, text?: string) {
  const p = cleanPhone(phone);
  const url = `https://wa.me/${p}?text=${encodeURIComponent(text || '')}`;
  window.open(url, '_blank');
}
