import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildSpeechText,
  createNavigationSpeechTracker,
  createSpeechRecognition,
  speakNkZhixingResult,
  supportsSpeechRecognition,
} from './nkZhixingSpeech.js'

test('live navigation cues announce turn thresholds once and reset for a new route', () => {
  const tracker = createNavigationSpeechTracker()
  const cue = { type: 'left', label: '左转', maneuverId: 'turn-4' }
  assert.equal(tracker.messageForCue({ ...cue, distanceMeters: 150 }, 'bicycling'), '')
  assert.match(tracker.messageForCue({ ...cue, distanceMeters: 110 }, 'bicycling'), /110 米左转/)
  assert.equal(tracker.messageForCue({ ...cue, distanceMeters: 90 }, 'bicycling'), '')
  assert.match(tracker.messageForCue({ ...cue, distanceMeters: 30 }, 'bicycling'), /即将左转/)
  assert.equal(tracker.messageForCue({ ...cue, distanceMeters: 20 }, 'bicycling'), '')
  tracker.reset()
  assert.match(tracker.messageForCue({ ...cue, distanceMeters: 100 }, 'bicycling'), /100 米左转/)
  assert.match(tracker.messageForCue({ type: 'arrive', label: '到达目的地', maneuverId: 'finish', distanceMeters: 10 }), /即将到达/)
})

test('speech text prefers the route summary, keeps the first three steps and removes links', () => {
  const speech = buildSpeechText({
    answer: '已找到路线，详情：https://example.com/route',
    routeSummary: '全程约 800 米，预计 10 分钟。',
    steps: ['向北直行 100 米', '在路口右转', '继续直行', '第四步不应播报'],
    warning: '夜间注意车辆。',
  })

  assert.equal(speech.includes('https://'), false)
  assert.equal(speech.includes('向北直行 100 米'), true)
  assert.equal(speech.includes('在路口右转'), true)
  assert.equal(speech.includes('继续直行'), true)
  assert.equal(speech.includes('第四步不应播报'), false)
  assert.equal(speech.includes('全程约 800 米'), true)
  assert.equal(speech.includes('夜间注意车辆'), true)
})

test('speech recognition wrapper configures Mandarin and forwards transcripts', () => {
  class RecognitionMock {}
  const target = { webkitSpeechRecognition: RecognitionMock }
  let received = null
  const recognition = createSpeechRecognition({
    onResult: (text, final) => { received = { text, final } },
  }, target)

  assert.equal(supportsSpeechRecognition(target), true)
  assert.equal(recognition.lang, 'zh-CN')
  assert.equal(recognition.interimResults, true)
  recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: '带我去图书馆' }], { isFinal: true })] })
  assert.deepEqual(received, { text: '带我去图书馆', final: true })
})

test('speech synthesis cancels the previous utterance before speaking', () => {
  const calls = []
  class UtteranceMock {
    constructor(text) { this.text = text }
  }
  const target = {
    SpeechSynthesisUtterance: UtteranceMock,
    speechSynthesis: {
      cancel: () => calls.push('cancel'),
      speak: (utterance) => calls.push(utterance.text),
    },
  }

  assert.equal(speakNkZhixingResult({ answer: '正在为你规划路线。' }, target), true)
  assert.deepEqual(calls, ['cancel', '正在为你规划路线。'])
})
