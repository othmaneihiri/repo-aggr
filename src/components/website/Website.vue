<template>
  <div class="pane-website">
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
        <div class="dropdown-divider"></div>
      </template>
    </pane-header>
    <div class="iframe__lock" v-if="locked">
      <div class="ml8 mr8">
        <p>
          Load
          <span
            class="text-condensed"
            v-text="trimmedUrl"
            title="url"
            v-tippy
          ></span>
          ?
        </p>
        <div class="text-center">
          <button class="btn" @click="$store.commit(paneId + '/UNLOCK_URL')">
            Yes, authorize
          </button>
        </div>
      </div>
    </div>
    <div class="iframe__wrapper" v-else>
      
<!-- USDT BALANCE -->
    <div class="cash">
      <span>USDT Balance</span>
<strong>{{ fmt(usdtBalanceValue, 4) }} USDT</strong>
    </div>

    <!-- POSITIONS TABLE -->
    <div class="table-wrapper">
      <table class="positions-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Entry</th>
            <th>Size</th>
            <th>Unrealized</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="safePositions.length === 0">
            <td colspan="4" class="empty">No spot positions found</td>
          </tr>
          <tr v-else v-for="p in safePositions" :key="p.symbol">
            <td class="symbol">
              {{ p.symbol }}
              <span class="tag">SPOT</span>
            </td>
            <td>{{ fmt(p.entry) }}</td>
            <td>{{ p.size }}</td>
            <td class="pnl" :class="(p.unrealized ?? 0) >= 0 ? 'positive' : 'negative'">
              {{ fmt(p.unrealized) }} USD
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- TOTAL -->
    <div class="footer">
      <span>Total Unrealized</span>
      <span :class="totalUnrealized >= 0 ? 'positive' : 'negative'">
        {{ fmt(totalUnrealized) }} USD
      </span>
    </div>


    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator'
import PaneHeader from '@/components/panes/PaneHeader.vue'
import PaneMixin from '@/mixins/paneMixin'
import { positions, usdtBalance, refreshPositions } from '@/store/positions'

@Component({
  components: { PaneHeader },
  name: 'Website'
})
export default class Website extends Mixins(PaneMixin) {
  // --- Props ---
  @Prop({ type: String, default: 'positionsPane' })
  readonly paneId!: string

  // --- Internal state ---
  customId = ''
  private _reloadTimeout: number | null = null

  $refs!: {
    iframe: HTMLIFrameElement
    paneHeader: PaneHeader
  }

  // --- Computed getters ---
  get locked() {
    return this.$store.state[this.paneId]?.locked
  }

  get url() {
    return (
      this.$store.state[this.paneId]?.url ||
      'https://alternative.me/crypto/fear-and-greed-index.png'
    )
  }

  get usdtBalanceValue(): number {
    return typeof usdtBalance.value === 'number'
      ? usdtBalance.value
      : 0
  }





  get interactive() {
    return this.$store.state[this.paneId]?.interactive
  }

  get invert() {
    return this.$store.state[this.paneId]?.invert
  }

  get reloadTimer() {
    return this.$store.state[this.paneId]?.reloadTimer
  }

  get zoom() {
    return this.$store.state.panes?.panes?.[this.paneId]?.zoom || 1
  }

  get style() {
    const size = (1 / this.zoom) * 100
    return {
      transform: `scale(${this.zoom})`,
      width: size + '%',
      height: size + '%',
      pointerEvents: this.interactive ? 'all' : 'none'
    }
  }

  get trimmedUrl() {
    if (!this.url) return ''
    if (this.url.length <= 33) return this.url
    return this.url.slice(0, 15) + '[...]' + this.url.slice(-15)
  }

  // --- Watchers ---
  @Watch('reloadTimer')
  onReloadTimerChange() {
    this.setupReloadTimer()
  }

  // --- Lifecycle hooks ---
  created() {
    this.setupReloadTimer()
  }

  beforeDestroy() {
    if (this._reloadTimeout) clearTimeout(this._reloadTimeout)
  }

  mounted() {
    refreshPositions()
    console.log(
    'USDT balance from store:',
    this.$store.state.positions?.usdtBalance
  )
  }

  // --- Methods ---
  getSettingsDialog() {
    return import('@/components/website/WebsiteDialog.vue')
  }

  setupReloadTimer() {
    if (this._reloadTimeout) clearTimeout(this._reloadTimeout)
    if (!this.reloadTimer) return

    let interval = this.reloadTimer.trim()

    if (/[\d.]+s/.test(interval)) {
      interval = parseFloat(interval) * 1000
    } else if (/[\d.]+h/.test(interval)) {
      interval = parseFloat(interval) * 1000 * 60 * 60
    } else {
      interval = parseFloat(interval) * 1000 * 60
    }

    if (!interval) return

    const now = Date.now()
    let delay = Math.ceil(now / interval) * interval - now - 20
    if (delay < 1000) delay += interval

    this._reloadTimeout = setTimeout(() => {
      this._reloadTimeout = null
      this.reload()
      this.setupReloadTimer()
    }, delay) as unknown as number
  }

  reload(focus?: boolean) {
    // Reload iframe (if exists)
    if (this.$refs.iframe) {
      this.$refs.iframe.src += ''
      if (focus) {
        this.$refs.iframe.onload = () => {
          this.$refs.iframe.onload = null
          this.$refs.iframe.focus()
        }
      }
    }

    // Refresh positions data
    refreshPositions()
  }

  // --- Computed helpers for positions ---
  get safePositions() {
    return Array.isArray(positions.value) ? positions.value : []
  }

  get totalUnrealized() {
    return this.safePositions.reduce((sum, p) => sum + (p.unrealized ?? 0), 0)
  }

  // --- Formatter ---
  fmt(v?: number, d = 2) {
    return typeof v === 'number' ? v.toFixed(d) : '0.00'
  }
}
</script>


<style lang="scss" scoped>
.iframe__lock {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba($red, 0.5);
}

.iframe__wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;

  iframe {
    border: 0;
    width: 100%;
    height: 100%;
    transform-origin: top left;

    &.-solid {
      filter: invert(1);
    }
  }
}

.pane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1a202c;
  padding: 10px;
  color: #e5e7eb;
}

.pane-header__highlight {
  display: flex;
  align-items: center;
  font-weight: bold;
}

.pane-header__edit {
  margin-left: 8px;
  background: none;
  border: none;
  color: inherit;
}

.dropdown-item {
  padding: 8px 12px;
  cursor: pointer;
}

.btn-group {
  display: flex;
  justify-content: space-between;
}

.icon-plus, .icon-minus, .icon-enlarge, .icon-copy-paste, .icon-download, .icon-trash {
  margin-right: 8px;
}


.page {
  color: #e5e7eb;
  height: 95% !important;
}

.cash {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #0f172a;
  border-radius: 10px;
  font-weight: 600;
  font-size: 20px;
}

.table-wrapper {
  background: #0b0f14;
  border-radius: 12px;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: gray transparent;
}

.table-wrapper::-webkit-scrollbar {
  width: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background-color: gray;
  border-radius: 4px;
  border: 2px solid transparent;
}

.positions-table {
  width: 100%;
  border-collapse: collapse;
}

.positions-table th {
  padding: 12px;
  font-size: 12px;
  color: #9ca3af;
  background: #0f172a;
  text-align: left;
}

.positions-table td {
  padding: 12px;
  border-top: 1px solid #1f2933;
}

.symbol {
  font-weight: 600;
}

.tag {
  margin-left: 6px;
  padding: 2px 6px;
  font-size: 10px;
  background: #111827;
  border-radius: 4px;
  color: #9ca3af;
}

.pnl.positive {
  color: #22c55e;
}

.pnl.negative {
  color: #ef4444;
}

.footer {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 20px;
  margin-top: 10px;
  color: #08fc2c;
}

.empty {
  text-align: center;
  color: #6b7280;
}
</style>