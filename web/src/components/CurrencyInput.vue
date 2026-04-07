<template>
  <div>
    <div class="flex flex-col gap-2 sm:flex-row">
      <div class="flex-1">
        <label class="label">金额</label>
        <input
          type="number"
          step="0.01"
          min="0"
          class="input"
          :value="modelValue"
          @input="$emit('update:modelValue', Number($event.target.value))"
          placeholder="0.00"
        />
      </div>
      <div class="w-full sm:w-28">
        <label class="label">币种</label>
        <select
          class="select"
          :value="currency"
          @change="onCurrencyChange($event.target.value)"
        >
          <option v-for="c in currencies" :key="c.code" :value="c.code">
            {{ c.symbol }} {{ c.code }}
          </option>
        </select>
      </div>
    </div>
    <div
      v-if="showRate"
      class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <div class="flex-1">
        <label class="label"
          >汇率 (1 {{ currency }} = ? {{ defaultCurrency }})
          <span class="text-on-surface-secondary text-xs font-normal ml-1"
            >币种对汇率</span
          >
        </label>
        <input
          type="number"
          step="0.0001"
          min="0"
          class="input"
          :value="exchangeRate"
          @input="$emit('update:exchangeRate', Number($event.target.value))"
          placeholder="1.0000"
        />
      </div>
      <div class="text-sm text-on-surface-secondary sm:pb-3">
        ≈ {{ settingsStore.formatMoney(convertedAmount, defaultCurrency) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings.js'

const props = defineProps({
  modelValue: Number,
  currency: { type: String, default: 'CNY' },
  exchangeRate: { type: Number, default: 1 }
})
const emit = defineEmits([
  'update:modelValue',
  'update:currency',
  'update:exchangeRate'
])

const settingsStore = useSettingsStore()
const currencies = computed(() => settingsStore.currencies)
const defaultCurrency = computed(() => settingsStore.settings.default_currency)
const showRate = computed(() => props.currency !== defaultCurrency.value)
const convertedAmount = computed(
  () => (props.modelValue || 0) * (props.exchangeRate || 1)
)

function onCurrencyChange(code) {
  emit('update:currency', code)
  if (code === defaultCurrency.value) {
    emit('update:exchangeRate', 1)
  }
}
</script>
