<template>
  <span
    v-bind="forwardedAttrs"
    class="app-icon inline-block shrink-0 align-middle"
    :class="$attrs.class"
    :style="[$attrs.style, iconStyle]"
    :title="title || undefined"
    :role="title ? 'img' : undefined"
    :aria-label="title || undefined"
    :aria-hidden="title ? undefined : 'true'"
    v-html="iconMarkup"
  ></span>
</template>

<script setup>
import { computed, useAttrs } from 'vue'
import { resolveIconMarkup } from '../icons/registry.js'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: [Number, String], default: 20 },
  title: { type: String, default: '' }
})

const attrs = useAttrs()

const forwardedAttrs = computed(() =>
  Object.fromEntries(
    Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style')
  )
)

const iconMarkup = computed(() =>
  formatIconMarkup(resolveIconMarkup(props.name))
)

const iconSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size
)

const iconStyle = computed(() => ({
  width: iconSize.value,
  height: iconSize.value
}))

function formatIconMarkup(svg) {
  return svg
    .replace(/width="[^"]+"/, 'width="100%"')
    .replace(/height="[^"]+"/, 'height="100%"')
    .replace(
      '<svg ',
      '<svg fill="currentColor" focusable="false" aria-hidden="true" '
    )
}
</script>
