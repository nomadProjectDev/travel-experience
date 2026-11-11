/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prompt set for gemini-image.service.
 * Product-fidelity rules are phrased as a "re-render as worn" transformation
 * (recognizable design, realistic drape/fit) rather than exact-copy commands,
 * to avoid IMAGE_RECITATION blocks against commercial catalog photos.
 * Combined with the quantitative session framing lock from
 * buildLockedFramingPromptSuffix (anti zoom-drift across compose rounds).
 */

import type { EnvironmentSceneId } from '@config/types';
import { formatFaceBustFramingLock } from '@/core/media/framing';

export type ComposeSlot = 'tops' | 'bottoms' | 'kits' | 'hats' | 'glasses';

const CATALOG_GARMENT_RULES =
  'The second image is a product catalog / mockup photo. Ignore its backdrop, card, gradient, floor shadow, and presentation surface—use only the garment itself.';

const PRODUCT_FIDELITY_RULES =
  'Re-render the catalog garment as naturally worn by the model: same design, colors, and identifying details, ' +
  'but with realistic drape, folds, body-fit deformation, and scene lighting — a new original photograph of the garment on a body, not a copy of the product image. ' +
  'Do not overlay texture only, do not invent a similar fabric, and do not borrow colors from the product photo background.';

const PRESERVE_OTHER_LAYERS =
  'Keep every other garment already visible on the model unchanged—no recolor, restyle, replacement, or blur of unrelated pieces.';

const EDGE_TO_EDGE =
  'Output must be edge-to-edge with no white border, matte bands, or extra canvas padding.';

/** Shared studio look clauses — used by bootstrap polish and first capture-base try-on. */
const STUDIO_BACKGROUND_FACE =
  'Background: seamless light-gray / soft off-white studio paper — clean and even.';
const STUDIO_LIGHTING_FACE =
  'Lighting: soft even studio key light, gentle wrap, minimal harsh shadows, natural skin texture — not beauty-filtered.';
const STUDIO_BACKGROUND_FULL_BODY =
  'Preserve realism, clean light-gray studio background, and soft balanced lighting.';

/**
 * Capture → studio and glasses try-on: identity first so Flash Lite does not
 * beautify or swap toward a generic fashion face.
 */
const STUDIO_FACE_IDENTITY_LOCK =
  'IDENTITY LOCK — HIGHEST PRIORITY: ' +
  'The input photo is the only identity reference. Preserve the exact same person and facial identity. ' +
  'Keep unchanged: face shape and bone structure; eye shape, spacing, color, and gaze; eyebrows; nose shape and proportions; ' +
  'lips, mouth, and expression; jawline, cheeks, and ears; skin tone, age, texture, freckles, moles, and facial hair; ' +
  'hairline, hairstyle, and hair color. ' +
  'Do not beautify, smooth, reshape, age, rejuvenate, feminize, masculinize, or replace the face. ' +
  'Do not generate a lookalike or a generic fashion model. ' +
  'Allowed changes ONLY: background (seamless studio paper) and lighting. ' +
  'Do not change face geometry, clothes, head pose, or gaze direction. ';

const TRY_ON_FACE_IDENTITY_LOCK =
  'IDENTITY LOCK — HIGHEST PRIORITY: ' +
  'Image 1 is the only identity reference. Preserve the exact same person and facial identity from Image 1. ' +
  'Keep unchanged: face shape and bone structure; eye shape, spacing, color, and gaze; eyebrows; nose shape and proportions; ' +
  'lips, mouth, and expression; jawline, cheeks, and ears; skin tone, age, texture, freckles, moles, and facial hair; ' +
  'hairline, hairstyle, and hair color. ' +
  'Do not beautify, smooth, reshape, age, rejuvenate, feminize, masculinize, or replace the face. ' +
  'Do not generate a lookalike or a generic fashion model. ' +
  'Image 2 is an eyewear product reference only. Ignore any face, person, mannequin, skin, styling, or identity cues visible in Image 2. ' +
  'Change only the pixels and natural occlusion around the eyewear area. Everything else must remain visually unchanged from Image 1. ';

/**
 * Product fidelity for eyewear — "re-render as worn" (not pixel-copy) to limit
 * IMAGE_RECITATION, with an explicit silhouette / bridge / temple checklist.
 */
const EYEWEAR_FIDELITY_RULES =
  'Integrate and re-render the recognizable eyewear design from Image 2 as naturally worn on Image 1 — ' +
  'fit the frames onto the same face with realistic scale, perspective, reflections, and occlusion. ' +
  'Do not paste or copy the product photo. Do not create a new photograph of the whole scene. ' +
  'Preserve product-defining features from Image 2: overall frame silhouette and lens shape; lens width-to-height proportion; bridge shape and position; ' +
  'rim thickness; frame color and material appearance; temple-arm design; visible decorative or brand details; lens transparency or tint. ' +
  'Only adapt scale, perspective, reflections, and natural occlusion as required to fit the same person\'s face. ' +
  'The bridge must rest naturally on the nose. Both lenses must remain symmetrical. Temple arms must align toward the ears. ' +
  'Do not create a similar or generic frame. Do not redesign, simplify, thicken, recolor, or replace the selected eyewear. ';

export const buildSlotCompositionInstruction = (slot: ComposeSlot): string => {
  switch (slot) {
    case 'hats':
      return (
        'Slot target: headwear only. Dress the model with the hat/cap/headset from the catalog reference, keeping its design, color, and branding recognizable as it sits naturally on the head. ' +
        'Do not modify tops, bottoms, kits, or glasses on the model.'
      );
    case 'glasses':
      return (
        'Slot target: eyewear only. Edit Image 1 by changing ONLY the eyewear. ' +
        'Do not turn the head, change expression, reframe the bust, or alter camera distance. ' +
        'Do not modify face, hair, skin, clothes, camera, background, or crop. ' +
        'Do not modify tops, bottoms, kits, or any hat on the model.'
      );
    case 'tops':
      return (
        'Slot target: top only. Dress the model with the shirt/jacket/sweater from the catalog reference, keeping its cut, color, pattern, and logos recognizable as it fits the body. ' +
        'Do not modify bottoms, kits, hats, or glasses on the model.'
      );
    case 'bottoms':
      return (
        'Slot target: bottoms only. Dress the model with the pants/shorts from the catalog reference, keeping their cut, color, pattern, and logos recognizable as they fit the body. ' +
        'Do not modify tops, kits, hats, or glasses on the model.'
      );
    case 'kits':
      return (
        'Slot target: full kit. Dress the model with the top-and-bottom kit from the catalog reference as one worn outfit—not a generic coordinated look—keeping its colors, graphics, and branding recognizable. ' +
        'Do not modify any hat or glasses on the model.'
      );
    default: {
      const _exhaustive: never = slot;
      return _exhaustive;
    }
  }
};

export type PortraitFramingMode = 'full-body' | 'face';

export interface ModelImagePromptOptions {
  /** Second pass when Gemini echoed the camera snapshot instead of a studio rewrite. */
  insistStudio?: boolean;
}

export const buildModelImagePrompt = (
  geminiFrameAspectRatio: string,
  portraitFraming: PortraitFramingMode = 'full-body',
  options?: ModelImagePromptOptions,
): string => {
  if (portraitFraming === 'face') {
    const insist = options?.insistStudio
      ? 'CRITICAL RETRY: the previous output looked like the original camera snapshot. ' +
        'Same face stays locked — replace ONLY the background with seamless light-gray paper and re-light with soft even studio key light. ' +
        'Same person and clothes; do not return or lightly retouch the snapshot. '
      : '';
    return (
      `${STUDIO_FACE_IDENTITY_LOCK}` +
      `${insist}` +
      'Create one NEW photorealistic optical retail studio photograph of the same person — not a filter, color-grade, crop, or light retouch of the snapshot. ' +
      'Do NOT return the original camera photo. Do NOT keep the room, wall texture, household lighting, phone-snapshot look, or any location from the input. ' +
      'Rephotograph them in a professional optical studio: change ONLY background and lighting. ' +
      'Preserve head pose, expression, and gaze exactly while changing scene and light. ' +
      'Shot type: classic frontal eyewear retail still — head and shoulders only, crop from mid-chest up. ' +
      'No full body, no waist, no hips, no legs, no three-quarter body crop. ' +
      'Camera: eye-level, straight-on frontal (not angled, not from above/below, no dutch tilt). ' +
      'Subject faces the lens directly with the same natural expression as the input; eyes toward camera. ' +
      'Center the face horizontally. ' +
      `${formatFaceBustFramingLock()} ` +
      `${STUDIO_BACKGROUND_FACE} ` +
      `${STUDIO_LIGHTING_FACE} ` +
      'The result must read as an optical retail still on seamless studio paper, even if the input was already against a light wall. ' +
      'Do not invent glasses if the person is not wearing any; keep existing eyewear only if already present. ' +
      'Photoreal skin texture with natural pores — never soft, painterly, smoothed, or beauty-filtered. ' +
      'Frame must be edge-to-edge with no external padding, no white border, and no matte bands. ' +
      `Output aspect ratio must be ${geminiFrameAspectRatio}. Return only the final edited image.`
    );
  }

  return (
    'Create one photorealistic sports e-commerce studio portrait of the same person in this image. ' +
    'Keep identity, face, body type, and natural proportions intact. ' +
    'Keep a full-body head-to-toe composition with the same camera distance and perspective as the input. ' +
    'Do not zoom, crop, reframe, or alter figure scale in frame. ' +
    'Keep the subject centered horizontally with consistent top margin and neutral standing pose. ' +
    'Compose at a classic lookbook distance: the subject occupies roughly 60% of the frame height, centered, with generous studio background above, below, and to the sides of the figure — full body visible head to toe. ' +
    'Frame must be edge-to-edge with no external padding, no white border, and no matte bands. ' +
    `${STUDIO_BACKGROUND_FULL_BODY} ` +
    `Output aspect ratio must be ${geminiFrameAspectRatio}. Return only the final edited image.`
  );
};

export interface TryOnPromptParams {
  slot: ComposeSlot;
  lockedFramingSuffix: string;
  portraitFraming?: PortraitFramingMode;
}

export const buildTryOnPrompt = ({
  slot,
  lockedFramingSuffix,
  portraitFraming = 'full-body',
}: TryOnPromptParams): string => {
  const slotInstruction = buildSlotCompositionInstruction(slot);
  const faceLock =
    portraitFraming === 'face'
      ? 'Preserve the exact frontal head-and-shoulders studio bust — same eye contact, same head angle, same vertical crop landmarks, same soft studio light. Do not raise/lower the subject or change head size in frame. '
      : '';

  if (slot === 'glasses') {
    return (
      `${TRY_ON_FACE_IDENTITY_LOCK}` +
      'Image 1 is the identity, face, pose, clothing, framing, lighting, and background reference. Keep all of these visually unchanged. ' +
      'Image 2 is the product reference for the selected eyeglasses. ' +
      'Ignore its backdrop, card, gradient, floor shadow, presentation surface, and any mannequin or face — use only the eyewear itself. ' +
      'Task: edit Image 1 by changing ONLY the eyewear. ' +
      `${EYEWEAR_FIDELITY_RULES}` +
      `${slotInstruction} ` +
      `${PRESERVE_OTHER_LAYERS} ` +
      `${faceLock}` +
      'Keep the face perfectly sharp, detailed, and identical to Image 1 — never soften, blur, or repaint facial features. ' +
      `${EDGE_TO_EDGE} ` +
      `${lockedFramingSuffix} ` +
      'Return only the final edited image.'
    );
  }

  return (
    'Image 1: person/model wearing their current look. Image 2: product catalog garment reference. ' +
    `${CATALOG_GARMENT_RULES} ` +
    'Task: create one original photograph — an incremental virtual try-on adding only the catalog garment to the model while keeping existing layers. ' +
    `${PRODUCT_FIDELITY_RULES} ` +
    `${slotInstruction} ` +
    `${PRESERVE_OTHER_LAYERS} ` +
    'Preserve model identity, pose, body shape, skin tone, hair, and studio background exactly. ' +
    `${faceLock}` +
    'Keep the face perfectly sharp, detailed, and identical to the first image — never soften, blur, or repaint facial features. ' +
    `${EDGE_TO_EDGE} ` +
    `${lockedFramingSuffix} ` +
    'Return only the final edited image.'
  );
};

/**
 * Per-scene place + pose + light. Pose is required so Gemini leaves the studio bust
 * and places the person naturally IN the location (not a tight face against wallpaper).
 */
const ENVIRONMENT_SCENE_BRIEF: Record<EnvironmentSceneId, string> = {
  beach:
    'coastal beach lifestyle — subject standing or in a casual coastal pose on sand with sea and horizon clearly readable; ' +
    'open sky daylight key from above-front, warm sand bounce, soft ocean haze and aerial perspective; ' +
    'feet/lower body contact with sand when visible; natural sun on skin — not studio beauty light',
  mountain:
    'alpine mountain lifestyle — subject standing on a trail or seated on rock with peaks, trail, and sky readable behind; ' +
    'natural outdoor stance (not a studio bust); crisp cool high-altitude daylight, distant peak depth and soft atmospheric haze; ' +
    'cool sky fill and rock/snow bounce; feet or seat contact with ground/rock when visible; alpine light on skin — not warm studio wrap',
  city:
    'urban street lifestyle — subject standing on a sidewalk with readable city architecture / street context; ' +
    'natural standing pose in the urban space; mixed sky and building-bounce ambient, soft street-side fill, believable depth of field; ' +
    'feet contact with pavement when visible; cool-neutral city ambient on skin — not seamless paper studio light',
  'sunset-cafe':
    'sunset café terrace lifestyle — subject SITTING at an outdoor café table / terrace (not standing bust); ' +
    'coffee cup or table setting and seating context visible; warm golden-hour side/front key, terracotta and cream bounce, soft seating depth; ' +
    'hips/seat contact with chair and forearms or hands near table when natural; warm rim on hair and cheek edges, glasses catch warm speculars — not artificial orange cast or purple glow',
};

const ENVIRONMENT_IDENTITY_LOCK =
  'IDENTITY LOCK (highest priority — read before any scene or pose instruction): ' +
  'Image 1 is the REFERENCE PHOTO of the exact person to depict. ' +
  'Output must be an identity-locked portrait of that exact person — do NOT invent a new face, do NOT swap in a lookalike, and do NOT average toward a generic model. ' +
  'HARD RULES — preserve from Image 1 with zero drift: face geometry (bone structure, eye spacing, nose, lips, jaw, brow), age appearance, skin tone, ethnicity, gender presentation, ' +
  'hair line/color/style/length, facial hair if any, freckles/moles/marks, and every facial feature as in the reference. ' +
  'FORBIDDEN: beautify, face morph, celebrity look, age change (younger/older), gender shift, different ethnicity, smoother/different nose or jaw, ' +
  'altered eye shape/color, new haircut, or any rewrite of facial identity. ' +
  'Pose, body placement, and expression MAY change for lifestyle composition; FACE IDENTITY MUST NOT. ';

const ENVIRONMENT_ANTI_CUTOUT =
  'CRITICAL — this must be ONE coherent photograph shot on location with a real camera, NOT a cutout composite. ' +
  'FORBIDDEN: green-screen / chroma-key look, flat backdrop replacement, video-call / Zoom virtual background, ' +
  'person floating in front of a wallpaper, tight bust pasted on a scenic blur, halo or fringing around hair/shoulders, ' +
  'hard subject/background edge mismatch, uniform studio lighting on the subject with a mismatched outdoor scene, ' +
  'plastic beauty-filter skin, oversharpen halos. ';

const ENVIRONMENT_LIGHTING_INTEGRATION =
  'REQUIRE: match light direction and color temperature across face, skin, hair, clothes, and eyeglasses to the environment. ' +
  'Add soft contact shadows where the subject meets ground, furniture, or props; environmental bounce on skin and clothing; ' +
  'natural depth/atmosphere so the person occupies real space in the location. ' +
  'You MUST adapt the subject lighting to the environment — re-light face, skin, hair, glasses, and clothes as if they were photographed there. ' +
  'Do NOT preserve the source studio lighting, seamless gray paper, or beauty-light wrap on the subject. ' +
  'Face geometry and identity stay locked to Image 1; only illumination on that same face may change. ' +
  'Eyeglasses geometry and clothing design stay the same; lighting, color temperature, body pose, and environmental placement MUST change to fit the location. ';

export interface EnvironmentVariantPromptParams {
  environmentId: EnvironmentSceneId;
  /** Prefer buildEnvironmentFramingPromptSuffix — lifestyle waist-up / 3/4, not tight bust lock. */
  lockedFramingSuffix: string;
  portraitFraming?: PortraitFramingMode;
}

export const buildEnvironmentVariantPrompt = ({
  environmentId,
  lockedFramingSuffix,
  portraitFraming = 'face',
}: EnvironmentVariantPromptParams): string => {
  const scene = ENVIRONMENT_SCENE_BRIEF[environmentId];
  const framingGuidance =
    portraitFraming === 'face'
      ? 'Shot type: photoreal lifestyle photograph — prefer waist-up or three-quarter body (head through hips; café scenes may crop near the knees while seated). ' +
        'NOT an extreme close-up face, NOT a tight head-and-shoulders bust filling most of the frame. ' +
        'Subject occupies roughly 40–55% of frame height with real readable environment around them (sky, ground, architecture, or café context). ' +
        'Camera: natural 35–50mm lifestyle look, slight environmental depth, eye-level or gently natural — not beauty-dish studio crop. ' +
        'Reinterpret Image 1 as a natural lifestyle photograph at this location; body pose and placement MAY change from the studio bust reference, ' +
        'but the FACE must remain the identity-locked exact person from Image 1, wearing the same glasses. '
      : 'Keep a natural full-body lifestyle composition with readable environment around the figure. ' +
        'Reinterpret as a natural lifestyle photograph at this location; body pose may change from the studio reference, ' +
        'but the FACE must remain the identity-locked exact person from Image 1, wearing the same glasses. ';
  return (
    `${ENVIRONMENT_IDENTITY_LOCK}` +
    'Image 1: studio try-on reference — the exact person already wearing eyeglasses and their current clothes (PRIMARY identity + outfit reference). ' +
    'Task: create one original photorealistic on-location lifestyle photograph of this same person naturally IN the real-world scene — ' +
    'as if a photographer shot them there with a real camera, integrated into the place, not pasted in front of it. ' +
    `On-location scene, required pose, and cinematography: ${scene}. ` +
    `${ENVIRONMENT_ANTI_CUTOUT}` +
    `${ENVIRONMENT_LIGHTING_INTEGRATION}` +
    `${framingGuidance}` +
    'Reconfirm identity lock: same person, same face geometry, same age, same skin tone, same hair, same facial features as Image 1. ' +
    'Expression may soften naturally for the location. ' +
    'Gaze may be toward camera or naturally engaged with the scene; do NOT freeze the stiff studio bust pose. ' +
    'Preserve the eyeglasses exactly — same frame geometry, color, bridge, temples, lenses, and fit. Do not remove, restyle, or invent different glasses. ' +
    'Preserve clothing design, colors, and cut; only their lighting, color temperature, and how they drape in the new pose may adapt. ' +
    'Do not invent a product catalog garment; glasses are already worn in Image 1. ' +
    'Photoreal skin texture with natural pores and micro-detail — no plastic AI skin, no over-smoothed beauty filter, no painterly look. ' +
    'No objects blocking the eyeglasses, no reflections that hide the eyes, no text overlays, no extra people as subjects. ' +
    'Keep face and eyewear optically sharp and recognizable — never blur, morph, or rewrite facial features; DO re-light that same face and place the body naturally for the location. ' +
    `${EDGE_TO_EDGE} ` +
    `${lockedFramingSuffix} ` +
    'Return only the final edited image.'
  );
};

export type SideYaw = 'left' | 'right';

/**
 * Positive-only TARGET VIEW (image space). Never name the opposite edge / direction —
 * vision models often ignore negation and latch onto whichever side is mentioned.
 */
const SIDE_YAW_TARGET: Record<SideYaw, string> = {
  left:
    'TARGET VIEW — required head orientation: ' +
    'Rotate only the head approximately 35 degrees in image space. ' +
    'The nose points toward the LEFT edge of the image. ' +
    'The RIGHT cheek, RIGHT ear area, and RIGHT eyeglasses temple become more visible. ',
  right:
    'TARGET VIEW — required head orientation: ' +
    'Rotate only the head approximately 35 degrees in image space. ' +
    'The nose points toward the RIGHT edge of the image. ' +
    'The LEFT cheek, LEFT ear area, and LEFT eyeglasses temple become more visible. ',
};

/**
 * Slight head yaw from an already-worn studio try-on.
 * Caller must pass a yaw-only framing suffix (no "frontal facing").
 */
export const buildSideYawPrompt = ({
  yaw,
  lockedFramingSuffix,
  portraitFraming = 'full-body',
}: {
  yaw: SideYaw;
  lockedFramingSuffix: string;
  portraitFraming?: PortraitFramingMode;
}): string => {
  const shotType =
    portraitFraming === 'face'
      ? 'head-and-shoulders optical lookbook still'
      : 'full-body catalog image';
  const yawLabel = yaw === 'left' ? 'LEFTWARD' : 'RIGHTWARD';
  return (
    `YAW TASK — ${yawLabel} head turn only (highest priority after identity). ` +
    `Create a NEW photorealistic ${shotType}. ` +
    SIDE_YAW_TARGET[yaw] +
    'Keep both eyes visible. Keep shoulders, crop, camera, head size, identity, lighting, and eyeglasses unchanged. ' +
    'Use Image 1 as an exact identity, clothing, eyeglasses, and studio-lighting reference. ' +
    'Keep the same person, face geometry, skin tone, hair, clothes, and eyeglasses — same frame geometry, color, bridge, temples, lenses, and fit. ' +
    'Plain light-gray optical studio paper and soft beauty lighting unchanged. ' +
    'The turn must be enough to read the temple and side of the frame — not a full profile, not 90 degrees. ' +
    'Both eyes stay readable; shoulders remain nearly square to camera. ' +
    (lockedFramingSuffix ? `${lockedFramingSuffix} ` : '') +
    'No new garments, no outfit redesign, no background change, and do not remove or restyle the eyeglasses. ' +
    `${EDGE_TO_EDGE} ` +
    'Return only the final edited image.'
  );
};
