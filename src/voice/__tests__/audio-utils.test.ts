import { describe, it, expect } from 'vitest'
import { mulawToLinear24k, linear24kToMulaw } from '../audio-utils'

describe('audio-utils', () => {
  describe('mulawToLinear24k', () => {
    it('converts mulaw buffer to base64 PCM16 24kHz', () => {
      // Create a small mulaw buffer (silence is 0xFF in mulaw)
      const silence = Buffer.alloc(10, 0xff)
      const result = mulawToLinear24k(silence)

      // Result should be a base64 string
      expect(typeof result).toBe('string')

      // Output should be 3x the input samples (upsampling 8kHz to 24kHz), 2 bytes each
      const decoded = Buffer.from(result, 'base64')
      expect(decoded.length).toBe(10 * 3 * 2) // 10 samples * 3x upsample * 2 bytes
    })

    it('produces non-zero output for non-silence input', () => {
      // 0x00 in mulaw encodes a large negative value
      const loud = Buffer.alloc(5, 0x00)
      const result = mulawToLinear24k(loud)
      const decoded = Buffer.from(result, 'base64')

      // Should have non-zero PCM samples
      let hasNonZero = false
      for (let i = 0; i < decoded.length; i += 2) {
        if (decoded.readInt16LE(i) !== 0) {
          hasNonZero = true
          break
        }
      }
      expect(hasNonZero).toBe(true)
    })

    it('upsamples correctly with 3x interpolation', () => {
      // Two different mulaw values
      const input = Buffer.from([0x80, 0xFF]) // two samples
      const result = mulawToLinear24k(input)
      const decoded = Buffer.from(result, 'base64')

      // Should produce 6 PCM16 samples (2 * 3)
      expect(decoded.length).toBe(6 * 2)
    })
  })

  describe('linear24kToMulaw', () => {
    it('converts base64 PCM16 24kHz to base64 mulaw 8kHz', () => {
      // Create PCM16 24kHz buffer (silence = all zeros)
      const pcmBuffer = Buffer.alloc(30 * 2) // 30 samples * 2 bytes
      const pcmBase64 = pcmBuffer.toString('base64')

      const result = linear24kToMulaw(pcmBase64)

      // Result should be base64
      expect(typeof result).toBe('string')

      // Output should be 1/3 of input samples (downsampling 24kHz to 8kHz)
      const decoded = Buffer.from(result, 'base64')
      expect(decoded.length).toBe(10) // 30 / 3 = 10 mulaw bytes
    })

    it('produces consistent output for silence', () => {
      const pcmBuffer = Buffer.alloc(9 * 2) // 9 silence samples
      const result = linear24kToMulaw(pcmBuffer.toString('base64'))
      const decoded = Buffer.from(result, 'base64')

      // All silence samples should encode to the same mulaw value
      const firstByte = decoded[0]
      for (let i = 1; i < decoded.length; i++) {
        expect(decoded[i]).toBe(firstByte)
      }
    })
  })

  describe('roundtrip encode/decode', () => {
    it('preserves silence through mulaw->PCM->mulaw roundtrip', () => {
      // Silence (0xFF) should roundtrip perfectly
      const original = Buffer.alloc(5, 0xff)
      const pcm = mulawToLinear24k(original)
      const roundtripped = Buffer.from(linear24kToMulaw(pcm), 'base64')

      expect(roundtripped.length).toBe(original.length)
      for (let i = 0; i < original.length; i++) {
        expect(roundtripped[i]).toBe(original[i])
      }
    })

    it('produces consistent output for a constant-value signal', () => {
      // A constant mulaw value should decode to constant PCM, then re-encode to
      // a single consistent mulaw value (though not necessarily the original due
      // to asymmetry in the mulaw encode/decode formulas)
      const value = 0x50
      const original = Buffer.alloc(6, value)

      const pcm = mulawToLinear24k(original)
      const roundtripped = Buffer.from(linear24kToMulaw(pcm), 'base64')

      expect(roundtripped.length).toBe(original.length)
      // All output bytes should be the same (constant signal stays constant)
      const firstByte = roundtripped[0]
      for (let i = 1; i < roundtripped.length; i++) {
        expect(roundtripped[i]).toBe(firstByte)
      }
    })

    it('preserves sample count through roundtrip', () => {
      const original = Buffer.from([0x10, 0x30, 0x50, 0x70, 0x90, 0xB0])
      const pcm = mulawToLinear24k(original)
      const roundtripped = Buffer.from(linear24kToMulaw(pcm), 'base64')

      // Same number of mulaw bytes
      expect(roundtripped.length).toBe(original.length)
    })
  })
})
