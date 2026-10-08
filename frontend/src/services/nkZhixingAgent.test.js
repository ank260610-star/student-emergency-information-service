import test from 'node:test'
import assert from 'node:assert/strict'
import {
  consumeNkZhixingHandoff,
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
