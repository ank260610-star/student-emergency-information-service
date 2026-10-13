import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url))
const sceneRoot = join(publicRoot, 'campus-3d-assets')
const sceneAssetVersion = '3d-mobile-1'

test('3D scene resources do not shadow the Vue page route', () => {
  assert.equal(existsSync(join(publicRoot, 'campus-3d/index.html')), false)
  assert.equal(existsSync(join(sceneRoot, 'index.html')), true)
  const view = readFileSync(new URL('../views/Campus3DView.vue', import.meta.url), 'utf8')
  const sceneDocument = readFileSync(join(sceneRoot, 'index.html'), 'utf8')
  assert.match(view, new RegExp(`sceneAssetVersion = '${sceneAssetVersion}'`))
  assert.match(view, /sceneUrl = `\/campus-3d-assets\/index\.html\?v=\$\{sceneAssetVersion\}`/)
  for (const asset of ['style.css', 'bootstrap.js', 'game3d.js']) {
    const escapedAsset = asset.replace('.', '\\.')
    assert.match(sceneDocument, new RegExp(`${escapedAsset}\\?v=${sceneAssetVersion}`))
  }
})

test('3D runtime imports resolve locally without an inline import map', () => {
  function checkModules(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) checkModules(path)
      else if (entry.name.endsWith('.js')) {
        const source = readFileSync(path, 'utf8')
        assert.doesNotMatch(source, /^\s*(?:import.*from|\} from) ['"]three(?:\/[^'"]*)?['"]/m, path)
        for (const match of source.matchAll(/^\s*(?:import[^\n]*|\})\s+from ['"](\.\.?\/[^'"]+)['"]/gm)) {
          assert.equal(existsSync(resolve(dirname(path), match[1].split(/[?#]/)[0])), true, `${path}: ${match[1]}`)
        }
      }
    }
  }
  checkModules(sceneRoot)
  assert.doesNotMatch(readFileSync(join(sceneRoot, 'index.html'), 'utf8'), /type="importmap"/)
})

test('3D flight mode retains an editable widebody source and a local fallback', () => {
  const game = readFileSync(join(sceneRoot, 'game3d.js'), 'utf8')
  assert.equal(existsSync(join(publicRoot, '..', 'tools', 'build_campus_widebody.py')), true)
  assert.match(game, /makeWidebodyFallback/)
  assert.match(game, /campus-widebody-747\.glb/)
  assert.match(game, /jetWhine/)
})

test('3D runtime boots without referencing a missing desktop reset button', () => {
  const game = readFileSync(join(sceneRoot, 'game3d.js'), 'utf8')
  const sceneDocument = readFileSync(join(sceneRoot, 'index.html'), 'utf8')
  assert.doesNotMatch(game, /resetButton/)
  assert.match(game, /function reset\(/)
  assert.match(sceneDocument, /data-action="reset"/)
})

test('3D security rules allow only same-origin embedding and local model blobs', () => {
  const headers = readFileSync(join(publicRoot, '_headers'), 'utf8')
  const sceneRules = headers.split('/campus-3d-assets/*')[1]
  assert.ok(sceneRules)
  assert.match(headers.split('/campus-3d-assets/*')[0], /frame-ancestors 'none'/)
  assert.match(sceneRules, /frame-ancestors 'self'/)
  assert.match(sceneRules, /connect-src 'self' blob:/)
  assert.match(sceneRules, /X-Frame-Options: SAMEORIGIN/)
  assert.doesNotMatch(sceneRules, /unsafe-inline|unsafe-eval/)
})
