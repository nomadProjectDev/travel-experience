import { describe, expect, it } from 'vitest';
import {
  assertPublicPocFrameMeasurement,
  assertPublishedFrame,
  type PublishedFrame,
} from '../../../src/core/face/frameFit';
import {
  EYEWEAR_FRAME_MEASUREMENTS,
  getFrameMeasurementsForWardrobeItem,
  publicPocFrameMeasurements,
} from './frameMeasurements';
import eyewearWardrobe from './wardrobe';

describe('eyewear frame measurements', () => {
  it('records the audited 0 exact / 1 analogue / 21 unresolved outcome', () => {
    const measurements: readonly PublishedFrame[] =
      EYEWEAR_FRAME_MEASUREMENTS;
    const exactIds = measurements.flatMap((frame) =>
      frame.catalogMatch === 'exact' && frame.wardrobeItemId
        ? [frame.wardrobeItemId]
        : [],
    );
    const analogueIds = measurements.flatMap((frame) =>
      frame.catalogMatch === 'analogue' && frame.wardrobeAnalogueId
        ? [frame.wardrobeAnalogueId]
        : [],
    );
    const researchedIds = new Set([...exactIds, ...analogueIds]);

    expect(eyewearWardrobe).toHaveLength(22);
    expect(exactIds).toEqual([]);
    expect(analogueIds).toEqual(['frame-square-04']);
    expect(
      eyewearWardrobe.filter((item) => !researchedIds.has(item.id)),
    ).toHaveLength(21);
  });

  it('contains the cited RB2140 box size without inventing total front width', () => {
    expect(EYEWEAR_FRAME_MEASUREMENTS).toHaveLength(1);
    expect(EYEWEAR_FRAME_MEASUREMENTS[0]).toMatchObject({
      sku: '0RB2140-901-50',
      wardrobeAnalogueId: 'frame-square-04',
      catalogMatch: 'analogue',
      aLensWidthMm: 50,
      bLensHeightMm: 41,
      dblMm: 22,
      templeLengthMm: 150,
      totalFrontWidthMm: null,
      commercialSize: 'M',
    });
  });

  it('requires a source URL and measurement provenance', () => {
    for (const frame of EYEWEAR_FRAME_MEASUREMENTS) {
      expect(() => assertPublishedFrame(frame)).not.toThrow();
      expect(frame.sourceUrl).toMatch(/^https:\/\//);
      expect(frame.provenance.sourceLabel).not.toHaveLength(0);
      expect(frame.provenance.statement).not.toHaveLength(0);
      expect(frame.provenance.supportedFields).toEqual(
        expect.arrayContaining([
          'aLensWidthMm',
          'bLensHeightMm',
          'dblMm',
          'templeLengthMm',
        ]),
      );
    }

    const withoutSource = {
      ...EYEWEAR_FRAME_MEASUREMENTS[0],
      sourceUrl: '',
    } as PublishedFrame;
    const withoutProvenance = {
      ...EYEWEAR_FRAME_MEASUREMENTS[0],
      provenance: {
        ...EYEWEAR_FRAME_MEASUREMENTS[0].provenance,
        statement: '',
      },
    } as PublishedFrame;

    expect(() => assertPublishedFrame(withoutSource)).toThrow(
      /Invalid published frame/,
    );
    expect(() => assertPublishedFrame(withoutProvenance)).toThrow(
      /Invalid published frame/,
    );
  });

  it('does not present the wardrobe analogue as an exact catalog match', () => {
    const frame = EYEWEAR_FRAME_MEASUREMENTS[0];
    expect(frame.catalogMatch).toBe('analogue');
    expect(frame).not.toHaveProperty('wardrobeItemId');
    expect(frame.notes).toMatch(/never an exact identity match/i);
  });

  it('keeps nine exact public products in a separate validation fixture', () => {
    expect(publicPocFrameMeasurements).toHaveLength(9);
    for (const frame of publicPocFrameMeasurements) {
      expect(() => assertPublicPocFrameMeasurement(frame)).not.toThrow();
      expect(frame.evidenceClass).toBe('exact');
      expect(frame.catalogMatch).toBe('unverified');
      expect(frame.totalFrontWidthMm).toBeGreaterThan(0);
      expect(frame.provenance.sourceKind).toBe('retailer');
      expect(frame.provenance.accessedOn).toBe('2026-09-03');
      expect(frame.provenance.supportedFields).toContain('totalFrontWidthMm');
      expect(frame.provenance.statement).toMatch(/Frame Width \d+ mm/);
      expect(frame.sourceUrl).toMatch(/^https:\/\/www\.zennioptical\.com\/p\//);
      expect(frame.productImageUrl).toMatch(
        /^https:\/\/static\.zennioptical\.com\//,
      );
      expect(frame.notes).toMatch(/research metadata only/i);
    }
  });

  it('uses unique exact product and variant identifiers', () => {
    const skus = publicPocFrameMeasurements.map((frame) => frame.sku);
    const variants = publicPocFrameMeasurements.map(
      (frame) => frame.variantId,
    );

    expect(new Set(skus).size).toBe(publicPocFrameMeasurements.length);
    expect(new Set(variants).size).toBe(publicPocFrameMeasurements.length);
  });

  it('cannot resolve public PoC products as current wardrobe measurements', () => {
    const wardrobeIds = new Set(eyewearWardrobe.map((item) => item.id));

    for (const frame of publicPocFrameMeasurements) {
      expect(frame).not.toHaveProperty('wardrobeItemId');
      expect(frame).not.toHaveProperty('wardrobeAnalogueId');
      expect(wardrobeIds.has(frame.id)).toBe(false);
    }
    for (const item of eyewearWardrobe) {
      expect(getFrameMeasurementsForWardrobeItem(item.id)).toBeUndefined();
    }
  });

  it('covers three explicitly experimental front-width cohorts', () => {
    const widthsFor = (
      stratum: (typeof publicPocFrameMeasurements)[number]['pocWidthStratum'],
    ) =>
      publicPocFrameMeasurements
        .filter((frame) => frame.pocWidthStratum === stratum)
        .map((frame) => frame.totalFrontWidthMm);

    expect(widthsFor('lower-width-cohort')).toEqual([125, 126, 127]);
    expect(widthsFor('middle-width-cohort')).toEqual([133, 135, 137]);
    expect(widthsFor('upper-width-cohort')).toEqual([141, 142, 144]);
    expect(
      publicPocFrameMeasurements.every((frame) =>
        frame.notes?.includes('experimental dataset stratification'),
      ),
    ).toBe(true);
  });
});
