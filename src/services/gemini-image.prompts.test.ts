import { describe, expect, it } from 'vitest';
import {
  buildEnvironmentVariantPrompt,
  buildModelImagePrompt,
  buildSideYawPrompt,
  buildTryOnPrompt,
} from './gemini-image.prompts';
import {
  FACE_CHIN_FROM_TOP,
  FACE_EYES_FROM_TOP,
  FACE_FRAMING_OPTIONS,
  FACE_SUBJECT_HEIGHT_TARGET,
  FACE_SUBJECT_TOP_MARGIN_TARGET,
  buildEnvironmentFramingPromptSuffix,
  buildLockedFramingPromptSuffix,
  buildSideYawFramingPromptSuffix,
  formatFaceBustFramingLock,
  type FramingProfile,
} from '@/core/media/framing';

const faceProfile = {
  frameWidth: 1536,
  frameHeight: 2048,
  subjectRect: { x: 0, y: 0, width: 1536, height: 2048 },
  frameAspectRatio: 3 / 4,
  subjectHeightTarget: FACE_FRAMING_OPTIONS.subjectHeightTarget!,
  subjectTopMarginTarget: FACE_FRAMING_OPTIONS.subjectTopMarginTarget!,
  backgroundColor: '#f5f5f7',
  mimeType: 'image/jpeg',
  quality: 0.9,
} satisfies FramingProfile;

const headroomPct = Math.round(FACE_SUBJECT_TOP_MARGIN_TARGET * 100);
const subjectPct = Math.round(FACE_SUBJECT_HEIGHT_TARGET * 100);
const eyesPct = Math.round(FACE_EYES_FROM_TOP * 100);
const chinPct = Math.round(FACE_CHIN_FROM_TOP * 100);

describe('eyewear frontal studio prompts', () => {
  it('asks for a frontal head-and-shoulders lookbook portrait', () => {
    const prompt = buildModelImagePrompt('3:4', 'face');
    expect(prompt.indexOf('IDENTITY LOCK')).toBe(0);
    expect(prompt).toMatch(/IDENTITY LOCK — HIGHEST PRIORITY/i);
    expect(prompt).toMatch(/Allowed changes ONLY: background .* and lighting/i);
    expect(prompt).toMatch(/Do not beautify/i);
    expect(prompt).toMatch(/Do not generate a lookalike or a generic fashion model/i);
    expect(prompt).toMatch(/frontal/i);
    expect(prompt).toMatch(/head and shoulders/i);
    expect(prompt).toMatch(/eye-level/i);
    expect(prompt).toMatch(/NEW photorealistic optical retail studio photograph/i);
    expect(prompt).toMatch(/Do NOT return the original camera photo/i);
    expect(prompt).toMatch(/not beauty-filtered/i);
    expect(prompt).not.toMatch(/beauty light|soft beauty lighting/i);
    expect(prompt).not.toMatch(/lookbook model|classic lookbook distance/i);
    expect(prompt).not.toMatch(/light studio polish|Prefer a light/i);
    expect(prompt).not.toMatch(/full-body/i);
  });

  it('retry prompt insists on a studio rewrite after a snapshot echo', () => {
    const prompt = buildModelImagePrompt('3:4', 'face', { insistStudio: true });
    expect(prompt.indexOf('IDENTITY LOCK')).toBe(0);
    expect(prompt.indexOf('IDENTITY LOCK')).toBeLessThan(prompt.indexOf('CRITICAL RETRY'));
    expect(prompt).toMatch(/CRITICAL RETRY/i);
    expect(prompt).toMatch(/Same face stays locked/i);
    expect(prompt).toMatch(/replace ONLY the background/i);
    expect(prompt).toMatch(/do not return or lightly retouch the snapshot/i);
  });

  it('embeds quantitative bust landmarks aligned with FACE_FRAMING_OPTIONS', () => {
    const prompt = buildModelImagePrompt('3:4', 'face');
    const lock = formatFaceBustFramingLock();

    expect(FACE_FRAMING_OPTIONS.subjectHeightTarget).toBe(FACE_SUBJECT_HEIGHT_TARGET);
    expect(FACE_FRAMING_OPTIONS.subjectTopMarginTarget).toBe(FACE_SUBJECT_TOP_MARGIN_TARGET);
    expect(prompt).toContain(lock);
    expect(prompt).toContain(`~${headroomPct}%`);
    expect(prompt).toContain(`~${subjectPct}%`);
    expect(prompt).toContain(`~${eyesPct}%`);
    expect(prompt).toContain(`~${chinPct}%`);
    expect(prompt).toMatch(/eyes near upper-third/i);
    expect(prompt).toMatch(/chin around mid-lower third/i);
    expect(prompt).toMatch(/shoulders near bottom edge/i);
    expect(prompt).toMatch(/Forbid a floating head/i);
    expect(prompt).toMatch(/forbid cropping through the forehead/i);
    expect(prompt).toMatch(/Ignore how tight or loose the input photo was/i);
  });

  it('locks bust framing across try-on rounds with the same quantitative landmarks', () => {
    const suffix = buildLockedFramingPromptSuffix(faceProfile);
    expect(suffix).toMatch(/head-and-shoulders bust/i);
    expect(suffix).toMatch(/frontal facing/i);
    expect(suffix).toContain(formatFaceBustFramingLock(
      faceProfile.subjectHeightTarget,
      faceProfile.subjectTopMarginTarget,
    ));
    expect(suffix).toContain(`~${headroomPct}%`);
    expect(suffix).toContain(`~${subjectPct}%`);

    const tryOn = buildTryOnPrompt({
      slot: 'glasses',
      lockedFramingSuffix: suffix,
      portraitFraming: 'face',
    });
    expect(tryOn.indexOf('IDENTITY LOCK')).toBe(0);
    expect(tryOn).toMatch(/IDENTITY LOCK — HIGHEST PRIORITY/i);
    expect(tryOn).toMatch(/changing ONLY the eyewear/i);
    expect(tryOn).toMatch(/frontal head-and-shoulders/i);
    expect(tryOn).toMatch(/Do not turn the head/i);
    expect(tryOn).toMatch(/Do not raise\/lower the subject/i);
    expect(tryOn).toContain(`~${eyesPct}%`);
    expect(tryOn).toMatch(/same soft studio light/i);
    expect(tryOn).not.toMatch(/Preserve model identity, pose, body shape, skin tone, hair, and studio background exactly/i);
    expect(tryOn).not.toMatch(/adding only the catalog garment/i);
    expect(tryOn).not.toMatch(/not yet a studio render/i);
  });

  it('glasses try-on leads with identity lock and eyewear-only fidelity', () => {
    const suffix = buildLockedFramingPromptSuffix(faceProfile);
    const tryOn = buildTryOnPrompt({
      slot: 'glasses',
      lockedFramingSuffix: suffix,
      portraitFraming: 'face',
    });
    expect(tryOn.indexOf('IDENTITY LOCK')).toBe(0);
    expect(tryOn.indexOf('IDENTITY LOCK')).toBeLessThan(
      tryOn.indexOf('Integrate and re-render the recognizable eyewear'),
    );
    expect(tryOn).toMatch(/Image 2 is an eyewear product reference only/i);
    expect(tryOn).toMatch(/Change only the pixels and natural occlusion around the eyewear area/i);
    expect(tryOn).toMatch(/edit Image 1 by changing ONLY the eyewear/i);
    expect(tryOn).toMatch(/Slot target: eyewear only/i);
    expect(tryOn).toMatch(/Integrate and re-render the recognizable eyewear design/i);
    expect(tryOn).toMatch(/naturally worn on Image 1/i);
    expect(tryOn).toMatch(/Do not paste or copy the product photo/i);
    expect(tryOn).toMatch(/Do not create a new photograph of the whole scene/i);
    expect(tryOn).toMatch(/overall frame silhouette and lens shape/i);
    expect(tryOn).toMatch(/bridge shape and position/i);
    expect(tryOn).toMatch(/temple-arm design/i);
    expect(tryOn).toMatch(/frame color and material appearance/i);
    expect(tryOn).not.toMatch(/new original photograph of those frames worn/i);
    expect(tryOn).not.toMatch(/adding only the catalog garment/i);
    expect(tryOn).not.toMatch(/Preserve model identity, pose, body shape, skin tone, hair, and studio background exactly/i);
    expect(tryOn).not.toMatch(/Also transform Image 1 into a photorealistic optical retail studio/i);
  });

  it('environment variant keeps glasses/identity with waist-up lifestyle framing', () => {
    const bustSuffix = buildLockedFramingPromptSuffix(faceProfile);
    const envSuffix = buildEnvironmentFramingPromptSuffix(faceProfile);
    const prompt = buildEnvironmentVariantPrompt({
      environmentId: 'beach',
      lockedFramingSuffix: envSuffix,
      portraitFraming: 'face',
    });
    expect(prompt).toMatch(/already wearing eyeglasses/i);
    expect(prompt).toMatch(/Preserve the eyeglasses exactly/i);
    expect(prompt).toMatch(/IDENTITY LOCK/i);
    expect(prompt).toMatch(/identity-locked portrait of that exact person/i);
    expect(prompt).toMatch(/do NOT invent a new face/i);
    expect(prompt).toMatch(/FACE IDENTITY MUST NOT/i);
    expect(prompt).toMatch(/Preserve clothing design/i);
    expect(prompt).toMatch(/photorealistic on-location lifestyle photograph/i);
    expect(prompt).toMatch(/waist-up or three-quarter/i);
    expect(prompt).toMatch(/40–55%|40-55%/);
    expect(prompt).toMatch(/pose MAY change|pose may change|body pose and placement MAY change/i);
    expect(prompt).toMatch(/35–50mm|35-50mm/);
    expect(prompt).toMatch(/beach/i);
    expect(prompt).toMatch(/standing or in a casual coastal pose/i);
    expect(prompt).toMatch(/sea and horizon/i);
    expect(prompt).not.toMatch(/product catalog garment reference/i);
    expect(prompt).not.toMatch(/Keep frontal pose and gaze toward camera/i);
    expect(prompt).not.toMatch(/half-body from mid-torso/i);
    expect(prompt).not.toContain(formatFaceBustFramingLock());
    expect(prompt).not.toContain(bustSuffix);
    expect(prompt).toContain(envSuffix);
    expect(envSuffix).toMatch(/waist-up or three-quarter/i);
    expect(envSuffix).toMatch(/40–55%|40-55%/);
    expect(envSuffix).toMatch(/3:4/);
    expect(envSuffix).not.toMatch(/tight head-and-shoulders bust/i);
    expect(envSuffix).not.toMatch(/roughly 60% of frame height/i);
  });

  it('environment variant locks face identity while allowing lifestyle pose change', () => {
    const envSuffix = buildEnvironmentFramingPromptSuffix(faceProfile);
    const prompt = buildEnvironmentVariantPrompt({
      environmentId: 'mountain',
      lockedFramingSuffix: envSuffix,
      portraitFraming: 'face',
    });
    // Identity block leads the prompt (highest priority for the model).
    expect(prompt.indexOf('IDENTITY LOCK')).toBeLessThan(prompt.indexOf('On-location scene'));
    expect(prompt).toMatch(/REFERENCE PHOTO/i);
    expect(prompt).toMatch(/face geometry/i);
    expect(prompt).toMatch(/same age|age appearance/i);
    expect(prompt).toMatch(/skin tone/i);
    expect(prompt).toMatch(/FORBIDDEN:[\s\S]*beautify/i);
    expect(prompt).toMatch(/face morph/i);
    expect(prompt).toMatch(/celebrity look/i);
    expect(prompt).toMatch(/age change/i);
    expect(prompt).toMatch(/gender shift/i);
    expect(prompt).toMatch(/different ethnicity/i);
    expect(prompt).toMatch(/Pose[\s\S]*MAY change[\s\S]*FACE IDENTITY MUST NOT/i);
    expect(prompt).toMatch(/PRIMARY identity/i);
    expect(prompt).toMatch(/only illumination on that same face may change/i);
    expect(prompt).toMatch(/Reconfirm identity lock/i);
  });

  it('environment variant forbids cutout / Zoom backdrop and requires on-location lighting', () => {
    const envSuffix = buildEnvironmentFramingPromptSuffix(faceProfile);
    const prompt = buildEnvironmentVariantPrompt({
      environmentId: 'beach',
      lockedFramingSuffix: envSuffix,
      portraitFraming: 'face',
    });
    expect(prompt).toMatch(/NOT a cutout composite/i);
    expect(prompt).toMatch(/green-screen|chroma-key/i);
    expect(prompt).toMatch(/Zoom virtual background/i);
    expect(prompt).toMatch(/halo or fringing/i);
    expect(prompt).toMatch(/tight bust pasted/i);
    expect(prompt).toMatch(/ONE coherent photograph shot on location/i);
    expect(prompt).toMatch(/adapt the subject lighting to the environment/i);
    expect(prompt).toMatch(/Do NOT preserve the source studio lighting/i);
    expect(prompt).toMatch(/soft contact shadows/i);
    expect(prompt).toMatch(/environmental bounce/i);
    expect(prompt).toMatch(/no plastic AI skin/i);
    expect(prompt).toMatch(/place the body naturally for the location/i);
    expect(prompt).toMatch(/body pose, and environmental placement MUST change/i);
    // Must not over-lock studio face lighting or freeze bust pose (Zoom paste look).
    expect(prompt).not.toMatch(/identical to the source/i);
    expect(prompt).not.toMatch(/Preserve model identity, pose, body shape, skin tone, hair, and studio background exactly/i);
    expect(prompt).not.toMatch(/Keep frontal pose and gaze toward camera/i);
  });

  it('mountain environment brief asks for alpine stance, light, and depth', () => {
    const envSuffix = buildEnvironmentFramingPromptSuffix(faceProfile);
    const prompt = buildEnvironmentVariantPrompt({
      environmentId: 'mountain',
      lockedFramingSuffix: envSuffix,
      portraitFraming: 'face',
    });
    expect(prompt).toMatch(/alpine mountain lifestyle/i);
    expect(prompt).toMatch(/standing on a trail or seated on rock/i);
    expect(prompt).toMatch(/peaks, trail, and sky/i);
    expect(prompt).toMatch(/high-altitude|atmospheric haze|distant peak/i);
    expect(prompt).toMatch(/cool sky fill|alpine light/i);
    expect(prompt).toMatch(/waist-up or three-quarter/i);
    expect(prompt).toMatch(/NOT a cutout composite/i);
    expect(prompt).toMatch(/adapt the subject lighting/i);
  });

  it('sunset-cafe environment requires sitting at a café table, not standing bust', () => {
    const envSuffix = buildEnvironmentFramingPromptSuffix(faceProfile);
    const prompt = buildEnvironmentVariantPrompt({
      environmentId: 'sunset-cafe',
      lockedFramingSuffix: envSuffix,
      portraitFraming: 'face',
    });
    expect(prompt).toMatch(/SITTING at an outdoor café table/i);
    expect(prompt).toMatch(/coffee cup or table setting/i);
    expect(prompt).toMatch(/not standing bust/i);
    expect(prompt).toMatch(/golden-hour|golden hour/i);
    expect(prompt).toMatch(/pose[\s\S]{0,40}MAY change|pose may change/i);
    expect(prompt).toMatch(/knees/i);
  });

  it('side-yaw prompt asks for a temple-readable ~35° turn, not a profile', () => {
    const suffix = buildSideYawFramingPromptSuffix(faceProfile);
    const prompt = buildSideYawPrompt({
      yaw: 'left',
      lockedFramingSuffix: suffix,
      portraitFraming: 'face',
    });
    expect(prompt.indexOf('YAW TASK')).toBe(0);
    expect(prompt).toMatch(/LEFTWARD/i);
    expect(prompt).toMatch(/TARGET VIEW/i);
    expect(prompt).toMatch(/approximately 35 degrees/i);
    expect(prompt).toMatch(/nose points toward the LEFT edge/i);
    expect(prompt).toMatch(/RIGHT cheek/i);
    expect(prompt).toMatch(/RIGHT eyeglasses temple/i);
    expect(prompt).toMatch(/RIGHT ear/i);
    expect(prompt).not.toMatch(/FORBIDDEN/i);
    expect(prompt).not.toMatch(/nose toward the RIGHT edge/i);
    expect(prompt).not.toMatch(/opposite direction/i);
    expect(prompt).not.toMatch(/frontal facing/i);
    expect(prompt).not.toMatch(/frontal optical lookbook bust/i);
    expect(prompt).toMatch(/not a full profile/i);
    expect(prompt).toMatch(/Both eyes stay readable/i);
    expect(prompt).toMatch(/shoulders remain nearly square/i);
    expect(prompt).toMatch(/eyeglasses/i);
    expect(prompt).toMatch(/head-and-shoulders/i);
    expect(prompt).toContain(suffix);
    expect(prompt).not.toContain(formatFaceBustFramingLock());
    expect(prompt).not.toMatch(/full-body catalog/i);
    expect(prompt).toMatch(/not 90 degrees/i);
  });

  it('side-yaw right mirrors the left turn with positive-only language', () => {
    const suffix = buildSideYawFramingPromptSuffix(faceProfile);
    const left = buildSideYawPrompt({
      yaw: 'left',
      lockedFramingSuffix: suffix,
      portraitFraming: 'face',
    });
    const right = buildSideYawPrompt({
      yaw: 'right',
      lockedFramingSuffix: suffix,
      portraitFraming: 'face',
    });
    expect(right.indexOf('YAW TASK')).toBe(0);
    expect(right).toMatch(/RIGHTWARD/i);
    expect(right).toMatch(/nose points toward the RIGHT edge/i);
    expect(right).toMatch(/LEFT cheek/i);
    expect(right).toMatch(/LEFT eyeglasses temple/i);
    expect(right).toMatch(/LEFT ear/i);
    expect(right).not.toMatch(/FORBIDDEN/i);
    expect(right).not.toMatch(/opposite direction/i);
    expect(right).not.toMatch(/nose toward the LEFT edge/i);
    expect(right).not.toMatch(/nose points toward the LEFT edge/i);
    expect(left).not.toMatch(/nose toward the RIGHT edge/i);
    expect(left).not.toMatch(/nose points toward the RIGHT edge/i);
    expect(right).not.toMatch(/frontal facing/i);
    expect(suffix).not.toMatch(/frontal facing/i);
    expect(suffix).toMatch(/Yaw framing lock/i);
    expect(right).toContain(suffix);
    expect(left).not.toEqual(right);
  });
});
