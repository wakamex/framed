const migrate = (initial: any) => {
  initial.main.gasAlerts = initial.main.gasAlerts || {}
  return initial
}

export default {
  version: 45,
  migrate
}
