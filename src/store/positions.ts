import { ref } from 'vue'
import type { Position } from '@/types/Position'
import { loadSpotData } from '@/worker/exchanges/binanceSpot'

export const positions = ref<Position[]>([])
export const usdtBalance = ref<number>(0)

export async function refreshPositions() {
  try {
    const data = await loadSpotData()

    positions.value = data.positions
    usdtBalance.value = data.usdt
  } catch (err) {
    console.error('Failed to refresh positions', err)

    positions.value = []
    usdtBalance.value = 0
  }
}