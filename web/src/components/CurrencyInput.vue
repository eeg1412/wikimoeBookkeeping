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
      <div class="w-full sm:w-36">
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings.js'

defineProps({
  modelValue: Number,
  currency: { type: String, default: 'CNY' }
})
const emit = defineEmits(['update:modelValue', 'update:currency'])

const settingsStore = useSettingsStore()
const currencies = computed(() => settingsStore.currencies)

function onCurrencyChange(code) {
  emit('update:currency', code)
}
</script>
