// build config for every platform and architecture EXCEPT linux arm64

const baseConfig = require('./electron-builder-base.js')

const hasCert = !!process.env.CSC_LINK

const config = {
  ...baseConfig,
  afterSign: './build/notarize.js',
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'snap',
        arch: ['x64']
      },
      {
        target: 'tar.gz',
        arch: ['x64']
      }
    ]
  },
  mac: {
    target: {
      target: 'default',
      arch: ['x64', 'arm64']
    },
    notarize: false,
    // When no signing certificate is available (e.g. public CI), disable
    // signing entirely to avoid ad-hoc codesign verification failures on arm64.
    identity: hasCert ? undefined : null,
    hardenedRuntime: hasCert,
    gatekeeperAssess: false,
    entitlements: hasCert ? 'build/entitlements.mac.plist' : undefined,
    requirements: hasCert ? 'build/electron-builder-requirements.txt' : undefined
  },
  win: {
    signAndEditExecutable: true,
    icon: 'build/icons/icon.png'
  }
}

module.exports = config
