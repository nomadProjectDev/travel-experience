import type {
  PublicPocFrameMeasurement,
  PublishedFrame,
} from '../../../src/core/face/frameFit';

/**
 * Experimental measurement references. The manifest exposes them as research
 * data, but product UI and Gemini do not consume them.
 */
export const EYEWEAR_FRAME_MEASUREMENTS = [
  {
    id: 'ray-ban-rb2140-901-50',
    sku: '0RB2140-901-50',
    // Existing fixture documents this square acetate SKU as the local analogue.
    wardrobeAnalogueId: 'frame-square-04',
    catalogMatch: 'analogue',
    brand: 'Ray-Ban',
    model: 'Original Wayfarer RB2140',
    aLensWidthMm: 50,
    bLensHeightMm: 41,
    dblMm: 22,
    templeLengthMm: 150,
    // The cited retail size does not establish a real outer-edge/hinge width.
    totalFrontWidthMm: null,
    shape: 'wayfarer',
    supportType: 'integrated-acetate-bridge',
    wrapCategory: 'low',
    commercialSize: 'M',
    sourceUrl:
      'https://www.ray-ban.com/usa/sunglasses/RB2140original%20wayfarer%20classic-black/805289126577',
    provenance: {
      sourceKind: 'manufacturer',
      sourceLabel: 'Ray-Ban — Original Wayfarer Classic RB2140 901',
      statement:
        'Official product page for UPC 805289126577 publishes model code RB2140 901, size 50□22, 41 mm lens height, and 150 mm temple length.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Published measurements describe the Ray-Ban SKU only. frame-square-04 has no catalog model, color, or size identifier and remains an experimental analogue, never an exact identity match. Feel Good Contacts also labels the 50□22-150 variant Medium: https://www.feelgoodcontacts.com/sunglasses/ray-ban-orb2140-original-wayfarer-black',
  },
] as const satisfies readonly PublishedFrame[];

/**
 * Exact public products for physical-size validation only. These are not local
 * wardrobe products and are intentionally absent from the client manifest.
 */
export const publicPocFrameMeasurements = [
  {
    id: 'public-poc-zenni-688518-pink',
    sku: '688518',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '688518:pink:46-18-126',
    brand: 'Zenni Optical',
    model: 'Rectangle Glasses #688518',
    color: 'Pink',
    sizeVariant: '46-18-126',
    publishedSizeLabel: 'X-Small',
    pocWidthStratum: 'lower-width-cohort',
    aLensWidthMm: 46,
    bLensHeightMm: 25,
    dblMm: 18,
    templeLengthMm: 126,
    totalFrontWidthMm: 125,
    shape: 'rectangle',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'XS',
    sourceUrl:
      'https://www.zennioptical.com/p/womens-full-rim-stainless-steel-rectangle-eyeglass-frames/6885/688518',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/68/85/688518-eyeglasses-angle-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Pink Rectangle Glasses #688518',
      statement:
        'Product page publishes size 46-18-126, lens height 25 mm, Frame Width 125 mm, and retailer size X-Small.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-4441721-black',
    sku: '4441721',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '4441721:black:51-16-135',
    brand: 'Zenni Optical',
    model: 'Rectangle Glasses #4441721',
    color: 'Black',
    sizeVariant: '51-16-135',
    publishedSizeLabel: 'Medium',
    pocWidthStratum: 'lower-width-cohort',
    aLensWidthMm: 51,
    bLensHeightMm: 37,
    dblMm: 16,
    templeLengthMm: 135,
    totalFrontWidthMm: 126,
    shape: 'rectangle',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'M',
    sourceUrl:
      'https://www.zennioptical.com/p/womens-acetate-rectangle-eyeglass-frames/44417/4441721',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/44/41/4441721-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Black Rectangle Glasses #4441721',
      statement:
        'Product page publishes size 51-16-135, lens height 37 mm, Frame Width 126 mm, and retailer size Medium.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-3225114-gold',
    sku: '3225114',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '3225114:gold:51-18-135',
    brand: 'Zenni Optical',
    model: 'Cat-Eye Glasses #3225114',
    color: 'Gold',
    sizeVariant: '51-18-135',
    publishedSizeLabel: 'Medium',
    pocWidthStratum: 'lower-width-cohort',
    aLensWidthMm: 51,
    bLensHeightMm: 43,
    dblMm: 18,
    templeLengthMm: 135,
    totalFrontWidthMm: 127,
    shape: 'cat-eye',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'M',
    sourceUrl:
      'https://www.zennioptical.com/p/womens-stainless-steel-cat-eye-eyeglass-frames/32251/3225114',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/32/25/3225114-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Gold Cat-Eye Glasses #3225114',
      statement:
        'Product page publishes size 51-18-135, lens height 43 mm, Frame Width 127 mm, and retailer size Medium.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-4448939-multi',
    sku: '4448939',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '4448939:multi:53-20-145',
    brand: 'Zenni Optical',
    model: 'Travelers Glasses #4448939',
    color: 'Multi',
    sizeVariant: '53-20-145',
    publishedSizeLabel: 'Large',
    pocWidthStratum: 'middle-width-cohort',
    aLensWidthMm: 53,
    bLensHeightMm: 45,
    dblMm: 20,
    templeLengthMm: 145,
    totalFrontWidthMm: 133,
    shape: 'square',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'L',
    sourceUrl:
      'https://www.zennioptical.com/p/acetate-square-eyeglass-frames/44489/4448939',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/44/48/4448939-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Multi Travelers Glasses #4448939',
      statement:
        'Product page publishes size 53-20-145, lens height 45 mm, Frame Width 133 mm, and retailer size Large.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-827318-red',
    sku: '827318',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '827318:red:51-16-138',
    brand: 'Zenni Optical',
    model: 'Rectangle Glasses #827318',
    color: 'Red',
    sizeVariant: '51-16-138',
    publishedSizeLabel: 'Medium',
    pocWidthStratum: 'middle-width-cohort',
    aLensWidthMm: 51,
    bLensHeightMm: 23,
    dblMm: 16,
    templeLengthMm: 138,
    totalFrontWidthMm: 135,
    shape: 'rectangle',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'M',
    sourceUrl:
      'https://www.zennioptical.com/p/plastic-full-rim-frame-with-sparkling-crystals/8273/827318',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/82/73/827318-eyeglasses-angle-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Red Rectangle Glasses #827318',
      statement:
        'Product page publishes size 51-16-138, lens height 23 mm, Frame Width 135 mm, and retailer size Medium.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-p1302421-black',
    sku: 'P1302421',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: 'P1302421:black:54-17-145',
    brand: 'Zenni Optical',
    model: 'Rectangle Glasses #P1302421',
    color: 'Black',
    sizeVariant: '54-17-145',
    publishedSizeLabel: 'Large',
    pocWidthStratum: 'middle-width-cohort',
    aLensWidthMm: 54,
    bLensHeightMm: 37,
    dblMm: 17,
    templeLengthMm: 145,
    totalFrontWidthMm: 137,
    shape: 'rectangle',
    supportType: 'adjustable-nose-pads',
    wrapCategory: 'unknown',
    commercialSize: 'L',
    sourceUrl:
      'https://www.zennioptical.com/p/mens-halfrim-titanium-rectangle-eyeglass-frames/P13024/P1302421',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/P1/30/P1302421-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Black Rectangle Glasses #P1302421',
      statement:
        'Product page publishes size 54-17-145, lens height 37 mm, Frame Width 137 mm, and retailer size Large.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-4443021-black',
    sku: '4443021',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '4443021:black:59-18-148',
    brand: 'Zenni Optical',
    model: 'Post Up Glasses #4443021',
    color: 'Black',
    sizeVariant: '59-18-148',
    publishedSizeLabel: 'X-Large',
    pocWidthStratum: 'upper-width-cohort',
    aLensWidthMm: 59,
    bLensHeightMm: 39,
    dblMm: 18,
    templeLengthMm: 148,
    totalFrontWidthMm: 141,
    shape: 'rectangle',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'XL',
    sourceUrl:
      'https://www.zennioptical.com/p/mens-acetate-rectangle-eyeglass-frames/44430/4443021',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/44/43/4443021-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Black Post Up Glasses #4443021',
      statement:
        'Product page publishes size 59-18-148, lens height 39 mm, Frame Width 141 mm, and retailer size X-Large.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-148115-brown',
    sku: '148115',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '148115:brown:56-19-145',
    brand: 'Zenni Optical',
    model: 'Rectangle Glasses #148115',
    color: 'Brown',
    sizeVariant: '56-19-145',
    publishedSizeLabel: 'X-Large',
    pocWidthStratum: 'upper-width-cohort',
    aLensWidthMm: 56,
    bLensHeightMm: 34,
    dblMm: 19,
    templeLengthMm: 145,
    totalFrontWidthMm: 142,
    shape: 'rectangle',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'XL',
    sourceUrl:
      'https://www.zennioptical.com/p/mens-full-rim-mixed-materials-rectangle-eyeglass-frames/1481/148115',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/14/81/148115-eyeglasses-angle-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Brown Rectangle Glasses #148115',
      statement:
        'Product page publishes size 56-19-145, lens height 34 mm, Frame Width 142 mm, and retailer size X-Large.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
  {
    id: 'public-poc-zenni-7829912-grey',
    sku: '7829912',
    catalogMatch: 'unverified',
    evidenceClass: 'exact',
    variantId: '7829912:grey:56-21-147',
    brand: 'Zenni Optical',
    model: 'Titletown Glasses #7829912',
    color: 'Grey',
    sizeVariant: '56-21-147',
    publishedSizeLabel: 'X-Large',
    pocWidthStratum: 'upper-width-cohort',
    aLensWidthMm: 56,
    bLensHeightMm: 45,
    dblMm: 21,
    templeLengthMm: 147,
    totalFrontWidthMm: 144,
    shape: 'aviator',
    supportType: 'unknown',
    wrapCategory: 'unknown',
    commercialSize: 'XL',
    sourceUrl:
      'https://www.zennioptical.com/p/aviator-eyeglass-frames/78299/7829912',
    productImageUrl:
      'https://static.zennioptical.com/production/products/general/78/29/7829912-eyeglasses-front-view.jpg',
    provenance: {
      sourceKind: 'retailer',
      sourceLabel: 'Zenni Optical — Grey Titletown Glasses #7829912',
      statement:
        'Product page publishes size 56-21-147, lens height 45 mm, Frame Width 144 mm, and retailer size X-Large.',
      supportedFields: [
        'aLensWidthMm',
        'bLensHeightMm',
        'dblMm',
        'templeLengthMm',
        'totalFrontWidthMm',
        'commercialSize',
      ],
      accessedOn: '2026-09-03',
    },
    notes:
      'Zenni calls the total measurement “Frame Width.” The cohort is experimental dataset stratification, not a consumer recommendation threshold. Image URL is research metadata only.',
  },
] as const satisfies readonly PublicPocFrameMeasurement[];

/**
 * Production-safe exact join. Public PoC records are deliberately not searched.
 */
export function getFrameMeasurementsForWardrobeItem(
  wardrobeItemId: string,
): PublishedFrame | undefined {
  const productionMeasurements: readonly PublishedFrame[] =
    EYEWEAR_FRAME_MEASUREMENTS;
  return productionMeasurements.find(
    (frame) =>
      frame.catalogMatch === 'exact' &&
      frame.wardrobeItemId === wardrobeItemId,
  );
}

export default EYEWEAR_FRAME_MEASUREMENTS;
