const migrate = (initial: any) => {
  initial.main.apiKeys = initial.main.apiKeys || { etherscan: '', polygonscan: '', arbiscan: '' }
  return initial
}

export default {
  version: 46,
  migrate
}
