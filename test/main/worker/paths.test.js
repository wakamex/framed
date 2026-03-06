import path from 'path'

import { resolveWorkerPath } from '../../../main/worker/paths'

describe('resolveWorkerPath', () => {
  it('prefers the unpacked worker path inside app.asar builds', () => {
    const dirname = path.join('/tmp', 'Framed.app', 'Contents', 'Resources', 'app.asar', 'compiled', 'main')
    const existsSync = jest.fn((candidate) => candidate.includes('app.asar.unpacked'))

    expect(resolveWorkerPath(dirname, 'balances.js', 'worker.js', existsSync)).toBe(
      path.join('/tmp', 'Framed.app', 'Contents', 'Resources', 'app.asar.unpacked', 'compiled', 'main', 'workers', 'balances.js')
    )
  })

  it('uses the bundled worker when running from compiled/main', () => {
    const dirname = path.join('/code', 'frame-modernized', 'compiled', 'main')
    const bundledPath = path.join(dirname, 'workers', 'ringSigner.js')
    const existsSync = jest.fn((candidate) => candidate === bundledPath)

    expect(resolveWorkerPath(dirname, 'ringSigner.js', 'worker.js', existsSync)).toBe(bundledPath)
  })

  it('falls back to the source worker when no bundled worker exists', () => {
    const dirname = path.join('/code', 'frame-modernized', 'main', 'externalData', 'balances')
    const fallbackPath = path.join(dirname, 'worker.js')

    expect(resolveWorkerPath(dirname, 'balances.js', 'worker.js', () => false)).toBe(fallbackPath)
  })
})
