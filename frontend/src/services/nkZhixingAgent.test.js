import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeNkZhixingHandoff,
  extractNavigationDestination,
  isNavigationRequest,
  NK_ZHIXING_MESSAGE_LIMIT,
  saveNkZhixingHandoff,
} from './nkZhixingAgent.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

test('hands a home question to the map exactly once', () => {
  const storage = memoryStorage()
  assert.equal(saveNkZhixingHandoff({ campus: 'jinnan', message: '  去中心图书馆  ' }, storage), true)
  assert.deepEqual(consumeNkZhixingHandoff(storage), { campus: 'jinnan', message: '去中心图书馆' })
  assert.equal(consumeNkZhixingHandoff(storage), null)
})

test('rejects invalid handoffs and limits message length', () => {
  const storage = memoryStorage()
  assert.equal(saveNkZhixingHandoff({ campus: 'unknown', message: 'test' }, storage), false)
  assert.equal(saveNkZhixingHandoff({ campus: 'balitai', message: ' ' }, storage), false)

  const longMessage = '南'.repeat(NK_ZHIXING_MESSAGE_LIMIT + 20)
  assert.equal(saveNkZhixingHandoff({ campus: 'balitai', message: longMessage }, storage), true)
  assert.equal(consumeNkZhixingHandoff(storage).message.length, NK_ZHIXING_MESSAGE_LIMIT)
})

test('extracts a destination for an AMap fallback only from navigation requests', () => {
  assert.equal(isNavigationRequest('从我的位置出发到公教A怎么走？'), true)
  assert.equal(extractNavigationDestination('从我的位置出发到公教A怎么走？'), '公教A')
  assert.equal(extractNavigationDestination('我想去校医院'), '校医院')
  assert.equal(isNavigationRequest('思源堂的历史是什么？'), false)
  assert.equal(extractNavigationDestination('思源堂的历史是什么？'), '')
})
