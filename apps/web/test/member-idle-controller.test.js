import assert from 'node:assert/strict'
import test from 'node:test'
import { createMemberIdleController } from '../src/composables/member-idle-controller.js'

function createClock() {
  let now = 0
  let nextId = 1
  const tasks = new Map()
  return {
    setTimer(callback, delay) {
      const id = nextId++
      tasks.set(id, { callback, due: now + delay })
      return id
    },
    clearTimer(id) {
      tasks.delete(id)
    },
    advance(milliseconds) {
      const target = now + milliseconds
      while (true) {
        const next = [...tasks.entries()].sort((left, right) => left[1].due - right[1].due)[0]
        if (!next || next[1].due > target) break
        now = next[1].due
        tasks.delete(next[0])
        next[1].callback()
      }
      now = target
    },
  }
}

function setup(options = {}) {
  const clock = createClock()
  const state = { playing: false, resets: 0 }
  const controller = createMemberIdleController({
    timeoutMs: options.timeoutMs || 60_000,
    isVideoPlaying: () => state.playing,
    onTimeout: () => {
      state.resets += 1
    },
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  })
  return { clock, state, controller }
}

test('resets at the configured default timeout', () => {
  const { clock, state, controller } = setup()
  controller.start()
  clock.advance(59_999)
  assert.equal(state.resets, 0)
  clock.advance(1)
  assert.equal(state.resets, 1)
})

test('a member interaction restarts the inactivity countdown', () => {
  const { clock, state, controller } = setup({ timeoutMs: 1_000 })
  controller.start()
  clock.advance(800)
  controller.interact()
  clock.advance(800)
  assert.equal(state.resets, 0)
  clock.advance(200)
  assert.equal(state.resets, 1)
})

test('active video defers reset until playback ends', () => {
  const { clock, state, controller } = setup({ timeoutMs: 1_000 })
  controller.start()
  state.playing = true
  clock.advance(1_000)
  assert.equal(state.resets, 0)
  assert.equal(controller.resetPending, true)
  state.playing = false
  controller.playbackStopped()
  assert.equal(state.resets, 1)
})

test('interaction during playback cancels a pending reset', () => {
  const { clock, state, controller } = setup({ timeoutMs: 1_000 })
  controller.start()
  state.playing = true
  clock.advance(1_000)
  controller.interact()
  assert.equal(controller.resetPending, false)
  clock.advance(1_000)
  assert.equal(state.resets, 0)
})

test('paused video does not defer timeout and admin scope can stop the timer', () => {
  const { clock, state, controller } = setup({ timeoutMs: 1_000 })
  controller.start()
  state.playing = false
  clock.advance(1_000)
  assert.equal(state.resets, 1)
  controller.start()
  controller.stop()
  clock.advance(2_000)
  assert.equal(state.resets, 1)
  assert.equal(controller.enabled, false)
})

test('video errors release a pending reset', () => {
  const { clock, state, controller } = setup({ timeoutMs: 1_000 })
  controller.start()
  state.playing = true
  clock.advance(1_000)
  state.playing = false
  controller.playbackStopped()
  assert.equal(state.resets, 1)
})
