import { describe, expect, it } from 'vitest';
import { buildLoopVideoPrompt, buildOmniLoopVideoPrompt } from './gemini-video.prompts';

describe('buildLoopVideoPrompt', () => {
  it('asks for left-to-right modeling yaw with identity and glasses locked on a face bust', () => {
    const prompt = buildLoopVideoPrompt({ faceFraming: true });
    expect(prompt).toMatch(/already wearing the selected glasses/i);
    expect(prompt).toMatch(/left-to-right/i);
    expect(prompt).toMatch(/head and torso yaw/i);
    expect(prompt).toMatch(/Lock identity/i);
    expect(prompt).toMatch(/glasses/i);
    expect(prompt).toMatch(/No cuts/i);
    expect(prompt).toMatch(/looping-friendly/i);
    expect(prompt).toMatch(/4-second/i);
    expect(prompt).toMatch(/head-and-shoulders/i);
    expect(prompt).toMatch(/Do not pull back to full body/i);
    expect(prompt).not.toMatch(/full-body framing/i);
  });

  it('keeps current framing on full-body looks instead of a bust crop', () => {
    const prompt = buildLoopVideoPrompt({ faceFraming: false });
    expect(prompt).toMatch(/left-to-right/i);
    expect(prompt).toMatch(/Keep the current framing/i);
    expect(prompt).toMatch(/looping-friendly/i);
    expect(prompt).toMatch(/4-second/i);
    expect(prompt).not.toMatch(/head-and-shoulders/i);
  });
});

describe('buildOmniLoopVideoPrompt', () => {
  it('requires a continuous unbroken shot, exact eyewear lock, and no zoom crop', () => {
    const prompt = buildOmniLoopVideoPrompt({ faceFraming: true });
    expect(prompt).toMatch(/Single continuous unbroken shot/i);
    expect(prompt).toMatch(/eyeglasses/i);
    expect(prompt).toMatch(/facial identity/i);
    expect(prompt).toMatch(/head-and-shoulders/i);
    expect(prompt).toMatch(/Do not zoom in/i);
    expect(prompt).toMatch(/do not crop the top of the head/i);
    expect(prompt).toMatch(/No cuts/i);
    expect(prompt).not.toMatch(/negativePrompt/i);
  });
});
