import { reactive, watch } from 'vue'
import { useViewStateStore } from '../stores/viewState.js'

function cloneDefaults(defaults) {
  if (typeof structuredClone === 'function') {
    return structuredClone(defaults)
  }

  return JSON.parse(JSON.stringify(defaults))
}

export function useCachedViewState(key, defaults = {}) {
  const viewStateStore = useViewStateStore()
  const state = reactive(viewStateStore.getState(key, defaults))

  function replaceState(nextState) {
    for (const currentKey of Object.keys(state)) {
      delete state[currentKey]
    }

    Object.assign(state, cloneDefaults(defaults), nextState)
  }

  watch(
    state,
    value => {
      viewStateStore.setState(key, value)
    },
    { deep: true }
  )

  function resetState(overrides = {}) {
    replaceState(overrides)
    viewStateStore.setState(key, state)
  }

  function clearState() {
    replaceState({})
    viewStateStore.clearState(key)
  }

  return {
    state,
    resetState,
    clearState,
    saveState: () => viewStateStore.setState(key, state)
  }
}
