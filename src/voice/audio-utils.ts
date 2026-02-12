/**
 * Audio conversion utilities for Twilio ↔ OpenAI Realtime relay.
 *
 * Twilio Media Stream sends/receives G.711 μ-law 8kHz mono.
 * OpenAI Realtime API sends/receives PCM16 (linear 16-bit LE) 24kHz mono.
 *
 * We convert between these two formats in real-time.
 */

// μ-law decoding table (8-bit μ-law → 16-bit linear PCM)
const MULAW_DECODE_TABLE = new Int16Array(256)

// Build the μ-law decode table once at module load
;(function buildMulawTable() {
  for (let i = 0; i < 256; i++) {
    let mulaw = ~i // Complement
    const sign = mulaw & 0x80
    const exponent = (mulaw >> 4) & 0x07
    let mantissa = mulaw & 0x0f

    mantissa = (mantissa << 1) | 0x21
    mantissa <<= exponent
    mantissa -= 0x21

    MULAW_DECODE_TABLE[i] = sign ? -mantissa : mantissa
  }
})()

// PCM16 linear → μ-law encoding
const MULAW_BIAS = 0x84
const MULAW_CLIP = 32635

function linearToMulaw(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0
  if (sample < 0) sample = -sample
  if (sample > MULAW_CLIP) sample = MULAW_CLIP

  sample += MULAW_BIAS

  let exponent = 7
  let mask = 0x4000
  while (exponent > 0 && (sample & mask) === 0) {
    exponent--
    mask >>= 1
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f
  return ~(sign | (exponent << 4) | mantissa) & 0xff
}

/**
 * Convert μ-law 8kHz audio to PCM16 24kHz.
 *
 * Steps:
 * 1. Decode μ-law bytes → 16-bit linear PCM samples (8kHz)
 * 2. Upsample 8kHz → 24kHz (3x interpolation with linear interp)
 *
 * @param mulawData - Raw μ-law encoded bytes from Twilio
 * @returns Base64 encoded PCM16 24kHz audio for OpenAI
 */
export function mulawToLinear24k(mulawData: Buffer): string {
  const inputSamples = mulawData.length
  const outputSamples = inputSamples * 3 // 8kHz → 24kHz = 3x

  const output = Buffer.alloc(outputSamples * 2) // 16-bit = 2 bytes per sample

  for (let i = 0; i < inputSamples; i++) {
    const sample = MULAW_DECODE_TABLE[mulawData[i]]
    const nextSample = i < inputSamples - 1
      ? MULAW_DECODE_TABLE[mulawData[i + 1]]
      : sample

    // Write 3 interpolated samples for each input sample
    const outIdx = i * 3

    // First sample: original
    output.writeInt16LE(sample, outIdx * 2)

    // Second sample: 1/3 interpolation
    const interp1 = Math.round(sample + (nextSample - sample) / 3)
    output.writeInt16LE(interp1, (outIdx + 1) * 2)

    // Third sample: 2/3 interpolation
    const interp2 = Math.round(sample + (2 * (nextSample - sample)) / 3)
    output.writeInt16LE(interp2, (outIdx + 2) * 2)
  }

  return output.toString('base64')
}

/**
 * Convert PCM16 24kHz audio to μ-law 8kHz.
 *
 * Steps:
 * 1. Downsample 24kHz → 8kHz (take every 3rd sample)
 * 2. Encode 16-bit linear PCM → μ-law bytes
 *
 * @param pcm16Base64 - Base64 encoded PCM16 24kHz audio from OpenAI
 * @returns Base64 encoded μ-law 8kHz audio for Twilio
 */
export function linear24kToMulaw(pcm16Base64: string): string {
  const input = Buffer.from(pcm16Base64, 'base64')
  const inputSamples = input.length / 2 // 16-bit = 2 bytes per sample
  const outputSamples = Math.floor(inputSamples / 3) // 24kHz → 8kHz = 1/3

  const output = Buffer.alloc(outputSamples)

  for (let i = 0; i < outputSamples; i++) {
    const sample = input.readInt16LE(i * 3 * 2) // Take every 3rd sample
    output[i] = linearToMulaw(sample)
  }

  return output.toString('base64')
}
