<template>
  <div class="pane-website">

    <!-- HEADER -->
    <pane-header
      ref="paneHeader"
      :paneId="paneId"
      :settings="() => import('@/components/website/WebsiteDialog.vue')"
      :show-search="false"
    >
      <template v-slot:menu>
        <div class="dropdown-item">
          <label class="checkbox-control -small" @click.stop>
            <input
              type="checkbox"
              class="form-control"
              :checked="interactive"
              @change="$store.commit(paneId + '/TOGGLE_INTERACTIVE')"
            />
            <div></div>
            <span>Interactive</span>
          </label>
        </div>

        <button type="button" class="dropdown-item" @click="reload(true)">
          <i class="icon-refresh"></i>
          <span>Reload</span>
        </button>
      </template>
    </pane-header>

    <!-- PORTFOLIO -->
    <div class="portfolio">

      <!-- BALANCE -->
      <div class="portfolio__balance">
        <span class="label">USDT Balance</span>
        <span class="value">
          {{ fmt(usdtBalanceValue, 4) }}
          <small>USDT</small>
        </span>
      </div>

      <!-- POSITIONS -->
      <div class="portfolio__table">
        <div class="row header">
          <span>Symbol</span>
          <span class="right">Entry</span>
          <span class="right">Size</span>
          <span class="right">PnL</span>
        </div>

        <div
          v-for="p in filteredPositions"
          :key="p.symbol"
          class="row"
          :class="{ compact: compactRows, noborder: !showBorders }"
        >

          <span class="symbol">
            {{ p.symbol }}
            <em>SPOT</em>
          </span>

          <span class="right mono">{{ fmt(p.entry) }}</span>
          <span class="right mono">{{ p.size }}</span>

          <span
            class="right mono pnl"
            :style="{
              color: p.unrealized >= 0
                ? pnlPositiveColor
                : pnlNegativeColor
            }"
          >

            {{ fmt(p.unrealized) }}
          </span>
        </div>

        <div v-if="filteredPositions.length === 0" class="empty">
          No open spot positions
        </div>
      </div>

      <!-- TOTAL -->
      <div class="portfolio__total">
        <span>Total Unrealized</span>
        <span
          class="mono"
          :class="totalUnrealized >= 0 ? 'pos' : 'neg'"
        >
          {{ fmt(totalUnrealized) }} USD
        </span>


        <!-- NEW: USDT ON-CHAIN BALANCE -->
        <span class="sub-label">USDT Balance (On-chain)</span>
        <span class="mono"
          :class="ethBalance >= 0 ? 'pos' : 'neg'">
          {{ ethBalance }} USDT
        </span>
      </div>

<!-- BINANCE STYLE ORDER FORM -->
<div class="binance-order">

  <div class="order-top">
    <span>Place Order</span>
    <span class="pair">BTCUSDT</span>
  </div>

  <div class="order-type">
    <select v-model="orderType">
      <option value="MARKET">Market Order</option>
    </select>
  </div>

  <div class="order-box">
    <div class="order-field">
      <span>BTC</span>
      <input
        type="number"
        step="0.0001"
        v-model.number="orderQty"
        placeholder="0"
      />
    </div>

    <div class="order-field disabled">
      <span>USDT</span>
      <input
        type="text"
        :value="(orderQty * lastPrice).toFixed(2)"
        disabled
      />
    </div>
  </div>

  <!-- SLIDER -->
  <div class="order-slider">
    <input
      type="range"
      min="0"
      max="100"
      step="25"
      v-model.number="orderPercent"
      @input="applyPercent"
    />
    <div class="slider-label"> {{ orderPercent }}% </div>
  </div>

  <div class="order-options">
    <span>REDUCE</span>
    <span>TP/SL</span>
  </div>

  <!-- BUY / SELL -->
  <div class="order-actions">
    <button class="buy" @click="placeOrder('BUY')">
      BUY / LONG
      <small>≈ {{ lastPrice }}</small>
    </button>

    <button class="sell" @click="placeOrder('SELL')">
      SELL / SHORT
      <small>≈ {{ lastPrice }}</small>
    </button>
  </div>

  <div class="order-footer">
    <div>
      <span>Total</span>
      <strong>{{ usdtBalanceValue.toFixed(2) }} USDT</strong>
    </div>
    <div>
      <span>Available</span>
      <strong>{{ usdtBalanceValue.toFixed(2) }} USDT</strong>
    </div>
  </div>

</div>

    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import PaneMixin from '@/mixins/paneMixin'
import { positions, usdtBalance, refreshPositions } from '@/store/positions'

@Component({
  components: { PaneHeader },
  name: 'Website'
})
export default class Website extends Mixins(PaneMixin) {

  pnlPositiveColor = '#2962FF'
  pnlNegativeColor = '#E91E63'
  compactRows = false
  showBorders = true

  orderQty: number = 0
orderType: string = 'MARKET'
orderPercent: number = 0
lastPrice: number = 88646.2


  @Prop({ type: String, default: 'positionsPane' })
  readonly paneId!: string

  ethBalance: string = '0.00'

  mounted() {
    refreshPositions()
    this.fetchEthBalance()

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        refreshPositions()
        this.fetchEthBalance()
      }
    })
    this.loadTableSettings()

  }

  loadTableSettings() {
    const s = localStorage.getItem('portfolioTableSettings')
    if (!s) return

    const settings = JSON.parse(s)

    this.pnlPositiveColor = settings.pnlPositiveColor || this.pnlPositiveColor
    this.pnlNegativeColor = settings.pnlNegativeColor || this.pnlNegativeColor
    this.compactRows = !!settings.compactRows
    this.showBorders = settings.showBorders !== false
  }

  applyPercent() {
  const available = this.usdtBalanceValue
  if (!available) return

  const usdtAmount = (available * this.orderPercent) / 100
  this.orderQty = usdtAmount / this.lastPrice
}

async placeOrder(side: 'BUY' | 'SELL') {
  if (!this.orderQty || this.orderQty <= 0) return

  const endpoint =
    side === 'BUY'
      ? '/api/binance/spot/buy'
      : '/api/binance/spot/sell'

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_APP_API_TOKEN}`
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        quantity: this.orderQty
      })
    })

    const data = await res.json()
    console.log('Binance order:', data)

    this.orderQty = 0
    this.orderPercent = 0
    refreshPositions()
  } catch (e) {
    console.error('Order error', e)
  }
}



  async fetchEthBalance() {
  try {
    const res = await fetch(
      'https://api.etherscan.io/v2/api' +
        '?chainid=1' +
        '&module=account' +
        '&action=tokenbalance' +
        '&contractaddress=0xdAC17F958D2ee523a2206206994597C13D831ec7' + // USDT
        '&address=0x1fcA81339198392209c06295eeAedfeC0dA0f90b' +
        '&tag=latest' +
        '&apikey=FXW47GPVKF7ZQF3ABN692PD9IE3SPV1W7R'
    )

    const data = await res.json()
    console.log('USDT data:', data)

    if (data.status === '1') {
      // USDT has 6 decimals
      const usdt = Number(data.result) / 1e6
      this.ethBalance = usdt.toFixed(2)
    } else {
      console.error('Etherscan USDT error:', data.result)
      this.ethBalance = '0.00'
    }
  } catch (e) {
    console.error('USDT balance fetch failed', e)
    this.ethBalance = '0.00'
  }
}


  /* STATE */
  get interactive() {
    return this.$store.state[this.paneId]?.interactive
  }

  get usdtBalanceValue(): number {
    return typeof usdtBalance.value === 'number'
      ? usdtBalance.value
      : 0
  }

  get safePositions() {
    return Array.isArray(positions.value) ? positions.value : []
  }

  get totalUnrealized() {
    return this.safePositions.reduce(
      (sum, p) => sum + (p.unrealized ?? 0),
      0
    )
  }

  get filteredPositions() {
  return this.safePositions.filter(p =>
    typeof p.unrealized === 'number' &&
    Math.abs(p.unrealized) >= 1
  )
}


  /* ACTIONS */
  reload() {
    refreshPositions()
  }

  /* FORMAT */
  fmt(v?: number, d = 2) {
    return typeof v === 'number' ? v.toFixed(d) : '0.00'
  }
}
</script>

<style lang="scss" scoped>
.row.compact {
  padding: 4px 12px;
  font-size: 12px;
}

.row.noborder {
  border-bottom: none !important;
}

/* ───────────────────────────── */
/* GLOBAL BACKGROUND MATCH       */
/* ───────────────────────────── */
.pane-website,
.portfolio,
.portfolio__balance,
.portfolio__total,
.portfolio__table {
  background: #161616;
  color: #e5e7eb;
}

/* ───────────────────────────── */
/* PORTFOLIO LAYOUT              */
/* ───────────────────────────── */
.portfolio {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

/* ───────────────────────────── */
/* BALANCE                       */
/* ───────────────────────────── */
.portfolio__balance {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 12px;
    border-bottom: 0.15px solid #494949ff;

  .label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #9ca3af;
  }

  .value {
    font-size: 20px;
    font-weight: 400;

    small {
      font-size: 12px;
      color: #9ca3af;
      margin-left: 4px;
    }
  }
}

/* ───────────────────────────── */
/* TABLE (NO SCROLLBAR, STILL SCROLLS) */
/* ───────────────────────────── */
.portfolio__table {
  flex: 1;
  overflow-y: auto;

  /* hide scrollbar but keep scroll */
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* Edge */

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .row {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr 1fr;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 0.15px solid #494949ff;

    &.header {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #161616;
      font-size: 11px;
      text-transform: uppercase;
      color: #9ca3af;
    }
  }

  .symbol {
    font-weight: 400;

    em {
      margin-left: 6px;
      font-size: 9px;
      font-style: normal;
      color: #6b7280;
    }
  }

  .right {
    text-align: right;
  }

  .mono {
    font-variant-numeric: tabular-nums;
  }

  .pnl.pos {
    color: #2962FF;
  }

  .pnl.neg {
    color: #E91E63;
  }

  .empty {
    padding: 20px;
    text-align: center;
    color: #6b7280;
    font-size: 12px;
  }
}

/* ───────────────────────────── */
/* TOTAL                         */
/* ───────────────────────────── */
.portfolio__total {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
    border-top: 0.15px solid #494949ff;
  font-weight: 400;

  .pos {
    color: #2962FF;
  }

  .neg {
    color: #E91E63;
  }
}

/* ───────────────────────────── */
/* BINANCE ORDER FORM            */
/* ───────────────────────────── */
.binance-order {
  border-top: 0.15px solid #494949ff;
  padding: 12px;
  background: #0f0f0f;
  font-size: 12px;
}

.order-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #9ca3af;

  .pair {
    color: #e5e7eb;
  }
}

.order-type select {
  width: 100%;
  background: #161616;
  border: 1px solid #333;
  color: #e5e7eb;
  padding: 6px;
  margin-bottom: 8px;
}

.order-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.order-field {
  background: #161616;
  border: 1px solid #333;
  padding: 6px;

  span {
    font-size: 10px;
    color: #9ca3af;
  }

  input {
    width: 100%;
    background: transparent;
    border: none;
    color: #e5e7eb;
    font-size: 13px;
    outline: none;
  }

  &.disabled {
    opacity: 0.6;
  }
}

.order-slider {
  margin: 10px 0;

  input {
    width: 100%;
  }

  .slider-label {
    text-align: right;
    font-size: 10px;
    color: #9ca3af;
  }
}

.order-options {
  display: flex;
  justify-content: space-between;
  color: #6b7280;
  margin-bottom: 10px;
}

.order-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;

  button {
    padding: 10px;
    font-size: 13px;
    border: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
  }

  .buy {
    background: #00c087;
    color: #000;
  }

  .sell {
    background: #f6465d;
    color: #000;
  }

  small {
    font-size: 10px;
    opacity: 0.8;
  }
}

.order-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: #9ca3af;

  strong {
    color: #e5e7eb;
    font-weight: 400;
  }
}


</style>