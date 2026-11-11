/**
 * Image-to-video prompts.
 * Omni has no separate negativePrompt — constraints live in the main prompt.
 * Prefer English (fully evaluated for Omni).
 */

export function buildLoopVideoPrompt(options: { faceFraming: boolean }): string {
  if (options.faceFraming) {
    return [
      'Animate this existing optical studio portrait. The person is already wearing the selected glasses — do not add, remove, or restyle eyewear.',
      'Lock identity, face, hair, skin, clothing, glasses (frame shape, color, temples, lenses), soft studio lighting, and the light-gray background.',
      'Keep the same tight head-and-shoulders bust crop. Do not pull back to full body, do not zoom, do not re-crop, do not change camera height.',
      'Subtle fashion-model motion only: a slow left-to-right head and torso yaw (gentle modeling turn), quiet breathing, optional blink.',
      'No cuts, no camera move, no new wardrobe, no extra people, no text.',
      'One continuous ~4-second clip that is looping-friendly (first and last frames can meet).',
    ].join(' ');
  }

  return [
    'Animate this existing fashion studio portrait. The person is already wearing the selected look — do not restyle outfit or glasses.',
    'Lock identity, body shape, outfit, glasses, lighting, and background.',
    'Keep the current framing. Do not zoom, do not re-crop, do not change camera height.',
    'Subtle fashion-model motion only: a slow left-to-right head and torso yaw (gentle modeling turn), quiet breathing.',
    'No cuts, no camera move, no extra people, no text.',
    'One continuous ~4-second clip that is looping-friendly (first and last frames can meet).',
  ].join(' ');
}

/** Omni Flash: continuous shot + identity lock; duration set via response_format. */
export function buildOmniLoopVideoPrompt(options: { faceFraming: boolean }): string {
  const framing = options.faceFraming
    ? [
        'CRITICAL framing lock: match Image 1 pixel-for-pixel crop and subject scale.',
        'Keep the same head-and-shoulders bust with visible forehead, crown/hair top, chin, and shoulder line — do not crop the top of the head.',
        'Do not zoom in, punch-in, enlarge the face, or tighten the crop. Do not pull back to full body.',
        'Same eye-level camera height and centering. Figure must fill the frame the same amount as the still.',
      ].join(' ')
    : [
        'CRITICAL framing lock: match Image 1 crop and subject scale exactly.',
        'Do not zoom in, punch-in, or tighten the crop. Do not change camera height.',
      ].join(' ');

  return [
    'Single continuous unbroken shot.',
    'Animate this existing optical studio still as the literal first frame. The person is already wearing the selected eyeglasses — do not add, remove, replace, or restyle the frames.',
    'Keep the exact same person, facial identity, hairstyle, skin tone, clothing, eyewear geometry, frame color, lens shape, temple arms, soft studio lighting, and light-gray background.',
    framing,
    'Very subtle natural motion only: gentle left-to-right head turn (small yaw), quiet breathing, optional blink. Motion must not cause reframing.',
    'No cuts, no camera movement, no zoom, no dolly, no push-in, no pull-out, no extra people, no dialogue, no text overlay.',
    'Looping-friendly clip so the first and last frames can meet.',
  ].join(' ');
}
