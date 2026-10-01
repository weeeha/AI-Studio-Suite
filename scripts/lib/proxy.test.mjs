import { test } from 'node:test'
import assert from 'node:assert/strict'
import { proxyTable } from './proxy.mjs'

test('one regex route per tool, matching the path with or without the slash', () => {
  const table = proxyTable([{ id: 'cork', path: '/cork/', devPort: 5171 }])
  assert.deepEqual(Object.keys(table), ['^/cork(/.*)?$'])
  assert.deepEqual(table['^/cork(/.*)?$'], { target: 'http://127.0.0.1:5171', ws: true })
  const re = new RegExp(Object.keys(table)[0])
  assert.ok(re.test('/cork') && re.test('/cork/') && re.test('/cork/assets/a.js'))
  assert.ok(!re.test('/corkboard'))
})
