export const CATEGORY_COLOR_LIMITS = {
  saturation: { min: 62, max: 84 },
  lightness: { min: 42, max: 58 }
}

const DEFAULT_SATURATION = 72
const DEFAULT_LIGHTNESS = 50
const SWATCH_HUES = [
  12, 28, 44, 62, 86, 118, 148, 178, 206, 232, 264, 296, 324, 344
]

export const CATEGORY_COLOR_SWATCHES = SWATCH_HUES.map(hue =>
  buildCategoryColor(hue)
)

export function buildCategoryColor(
  hue,
  saturation = DEFAULT_SATURATION,
  lightness = DEFAULT_LIGHTNESS
) {
  return formatCategoryColor(clampCategoryColor({ hue, saturation, lightness }))
}

export function generateCategoryColor(randomFn = Math.random) {
  return buildCategoryColor(Math.floor(clampUnit(randomFn()) * 360))
}

export function normalizeCategoryColor(value, fallback = null) {
  const parsed = parseCategoryColor(value)
  if (parsed) {
    return formatCategoryColor(parsed)
  }

  const parsedFallback = parseCategoryColor(fallback)
  return parsedFallback ? formatCategoryColor(parsedFallback) : null
}

export function parseCategoryColor(value) {
  if (typeof value !== 'string') {
    return null
  }

  const match = value
    .trim()
    .match(
      /^hsl\(\s*(-?\d+(?:\.\d+)?)\s*(?:,|\s)\s*(\d+(?:\.\d+)?)%\s*(?:,|\s)\s*(\d+(?:\.\d+)?)%\s*\)$/i
    )

  if (!match) {
    return null
  }

  return clampCategoryColor({
    hue: Number(match[1]),
    saturation: Number(match[2]),
    lightness: Number(match[3])
  })
}

export function clampCategoryColor({ hue, saturation, lightness }) {
  return {
    hue: normalizeHue(hue),
    saturation: clamp(
      Math.round(Number(saturation) || DEFAULT_SATURATION),
      CATEGORY_COLOR_LIMITS.saturation.min,
      CATEGORY_COLOR_LIMITS.saturation.max
    ),
    lightness: clamp(
      Math.round(Number(lightness) || DEFAULT_LIGHTNESS),
      CATEGORY_COLOR_LIMITS.lightness.min,
      CATEGORY_COLOR_LIMITS.lightness.max
    )
  }
}

export function formatCategoryColor({ hue, saturation, lightness }) {
  const normalized = clampCategoryColor({ hue, saturation, lightness })
  return `hsl(${normalized.hue} ${normalized.saturation}% ${normalized.lightness}%)`
}

function normalizeHue(value) {
  const hue = Number(value)
  if (!Number.isFinite(hue)) {
    return 0
  }

  return ((Math.round(hue) % 360) + 360) % 360
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function clampUnit(value) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return clamp(value, 0, 0.999999)
}
