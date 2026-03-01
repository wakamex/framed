import log from 'electron-log'

const migrate = (initial: any) => {
  try {
    initial.main.txHistory = initial.main.txHistory || {}
    return initial
  } catch (e) {
    log.error('Migration 44: could not migrate state', e)
  }

  return initial
}

export default {
  version: 44,
  migrate
}
