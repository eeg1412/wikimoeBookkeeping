import { reactive, toValue, watch } from 'vue'
import { useViewStateStore } from '../stores/viewState.js'

function cloneDefaults(defaults) {
  if (typeof structuredClone === 'function') {
    return structuredClone(defaults)
  }

  return JSON.parse(JSON.stringify(defaults))
}

export function useCachedViewState(key, defaults = {}) {
  const viewStateStore = useViewStateStore()
  const state = reactive(cloneDefaults(defaults))

  function resolveKey() {
    return toValue(key)
  }

  function replaceState(nextState) {
    for (const currentKey of Object.keys(state)) {
      delete state[currentKey]
    }

    Object.assign(state, cloneDefaults(defaults), nextState)
  }

  watch(
    () => resolveKey(),
    nextKey => {
      replaceState(viewStateStore.getState(nextKey, defaults))
    },
    { immediate: true }
  )

  watch(
    state,
    value => {
      viewStateStore.setState(resolveKey(), value)
    },
    { deep: true }
  )

  function resetState(overrides = {}) {
    replaceState(overrides)
    viewStateStore.setState(resolveKey(), state)
  }

  function clearState() {
    replaceState({})
    viewStateStore.clearState(resolveKey())
  }

  return {
    state,
    resetState,
    clearState,
    saveState: () => viewStateStore.setState(resolveKey(), state)
  }
}
