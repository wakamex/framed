const config = {
  appId: 'sh.framed.app',
  productName: 'Framed',
  files: ['compiled', 'bundle', '!compiled/main/dev'],
  asarUnpack: ['compiled/main/workers/**'],
  npmRebuild: false
}

module.exports = config
