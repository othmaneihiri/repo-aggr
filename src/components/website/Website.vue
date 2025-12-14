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
          v-for="p in safePositions"
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

        <div v-if="safePositions.length === 0" class="empty">
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


</style>