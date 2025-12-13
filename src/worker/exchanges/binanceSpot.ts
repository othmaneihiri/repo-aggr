import type { Position } from '@/types/Position';

const API_BASE = import.meta.env.VITE_APP_API_URL_ANG;

export interface SpotResponse {
  positions: Position[];
  usdt: number;
}

export async function loadSpotData(): Promise<SpotResponse> {
  console.log('Sending token:', import.meta.env.VITE_APP_API_TOKEN);

  const res = await fetch(`${API_BASE}/api/binance/spot`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_APP_API_TOKEN}`
    }
  });

  if (!res.ok) {
    throw new Error('Failed to load spot data');
  }

  const data = await res.json();

  return {
    positions: Array.isArray(data?.positions) ? data.positions : [],
    usdt: typeof data?.usdt === 'number' ? data.usdt : 0
  };
}
