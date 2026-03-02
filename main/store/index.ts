import { proxy, unstable_enableOp, subscribe, snapshot } from 'valtio'
import buildInitialState from './state'
import persist from './persist'

// Enable operation tracking for persistence + IPC sync
unstable_enableOp()

// Create the reactive state proxy
const state = proxy(buildInitialState())

// Persist initial full state
persist.set('main', snapshot(state).main)

// Persist incremental changes (only main state — transient UI state is not persisted)
subscribe(state, (ops: any[]) => {
  for (const [_op, path, value] of ops) {
    if (path[0] === 'main') {
      persist.queue(path.join('.'), value)
    }
  }
})

export default state
