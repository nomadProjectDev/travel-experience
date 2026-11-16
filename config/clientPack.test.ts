import { describe, expect, it } from 'vitest';
import { REGISTERED_CLIENT_IDS, resolveManifestForClient } from './registry';
import { CLAY_EFFECTS } from './clients/navidad/effects';

describe('client pack isolation', () => {
  it('registers the eyewear, clothing, navidad, and travel packs', () => {
    expect(REGISTERED_CLIENT_IDS).toEqual([
      'eyewear',
      'clothing',
      'navidad',
      'travel-experience',
    ]);
  });

  it('clothing pack configures full-body framing, Decart VTON prompts, and disables environment scenes', () => {
    const manifest = resolveManifestForClient('clothing');
    expect(manifest.features.portraitFraming).toBe('full-body');
    expect(manifest.features.environmentScenes).toBe(false);
    expect(manifest.wardrobe.length).toBeGreaterThanOrEqual(4);
    expect(manifest.wardrobe.every((item) => Boolean(item.vtonPrompt?.trim()))).toBe(true);
  });

  it('eyewear pack uses bottom-bar studio chrome, face framing, and glasses wardrobe', () => {
    const manifest = resolveManifestForClient('eyewear');
    expect(manifest.features.studioChrome).toBe('bottom-bar');
    expect(manifest.features.portraitFraming).toBe('face');
    expect(manifest.features.stylistAssistant).toBe(true);
    expect(manifest.features.voiceStylist).toBe(false);
    expect(manifest.features.backgroundAudio).toBe(false);
    expect(manifest.features.environmentScenes).toBe(true);
    // Face-fit MediaPipe path stays off unless VITE_FACE_FIT_ANALYSIS or pack flag.
    expect(manifest.features.faceFitAnalysis).toBeFalsy();
    expect(manifest.features.faceFitRecommendations).toBe(false);
    expect(manifest.environmentScenes?.presets.map((p) => p.id)).toEqual([
      'beach',
      'mountain',
      'city',
      'sunset-cafe',
    ]);
    expect(manifest.copy.environmentScenes?.title.length).toBeGreaterThan(0);
    expect(manifest.copy.environmentScenes?.labels.beach).toBe('Playa');
    expect(manifest.copy.eyewearDock?.continue).toMatch(/carrito|Continuar/i);
    expect(manifest.copy.eyewearDock?.lookTitle).toMatch(/Probador virtual/i);
    expect(manifest.copy.eyewearDock?.chosenSectionTitle?.length).toBeGreaterThan(0);
    expect(manifest.copy.eyewearDock?.changeModel?.length).toBeGreaterThan(0);
    expect(manifest.copy.eyewearDock?.galleryTitle).toBe('Tus fotos');
    expect(manifest.copy.eyewearDock).not.toHaveProperty('fit');
    expect(JSON.stringify(manifest.copy.eyewearDock)).not.toMatch(
      /talla estimada|puede quedar estrecha|puede verse ancha|S\/M\/L/i,
    );
    expect(manifest.copy.videoLoop?.generateLabel).toBe('Crear vídeo');
    expect(manifest.copy.videoLoop?.generatingLabel.length).toBeGreaterThan(0);
    expect(manifest.copy.videoLoop?.readyLabel).toBe('Vídeo listo');
    expect(manifest.copy.eyewearDock?.gallerySideLeft?.length).toBeGreaterThan(0);
    expect(manifest.copy.environmentScenes?.labels['sunset-cafe']).toBe('Café');
    expect(manifest.copy.captureChrome?.faceHint).toMatch(/frente|cámara/i);
    const faceFitPanel = manifest.copy.captureChrome?.faceFitPanel;
    expect(faceFitPanel?.toggleLabel).toBe('Ver análisis facial');
    expect(faceFitPanel?.title).toBe('Análisis facial estimado');
    expect(faceFitPanel?.caveat).toMatch(/píxeles|proporciones/i);
    expect(faceFitPanel?.preliminaryLabel).toMatch(/curso|preliminar/i);
    expect(faceFitPanel?.states.initializing).toBe('Inicializando análisis');
    expect(faceFitPanel?.states.searching).toBe('Buscando rostro');
    expect(faceFitPanel?.states.singleFace).toBe('Solo una persona en cámara');
    expect(faceFitPanel?.states.poseUnavailable).toMatch(/frente|postura/i);
    expect(faceFitPanel?.states.stabilizing).toBe('Estabilizando medición');
    expect(faceFitPanel?.states.ready).toBe('Medición lista');
    expect(faceFitPanel?.states.limited).toBe('Análisis limitado');
    expect(faceFitPanel?.states.runtimeFailure).toMatch(/no disponible|continuar/i);
    expect(faceFitPanel?.metrics.ipd.label).toMatch(/iris/i);
    expect(faceFitPanel?.metrics.ipdRatio.label).toMatch(/IPD/i);
    expect(faceFitPanel?.metrics.canthiRatio.label).toMatch(/Cantos externos/i);
    expect(faceFitPanel?.calibration?.warning).toMatch(/experimental|no clínico/i);
    expect(faceFitPanel?.calibration?.consent).toMatch(/consentimiento|anónimos/i);
    expect(faceFitPanel?.calibration?.privacy).toMatch(/local|no se sube/i);
    expect(faceFitPanel?.calibration?.simpleHint).toMatch(/frente|mm|JSON/i);
    expect(faceFitPanel?.calibration?.labProtocolToggle).toMatch(/laboratorio|14/i);
    expect(faceFitPanel?.calibration?.blockedReasons.noCapture).toMatch(/foto|descargar/i);
    expect(faceFitPanel?.calibration?.widthHint).toMatch(/opcional|incompleto/i);
    expect(Object.keys(faceFitPanel?.calibration?.steps ?? {})).toHaveLength(14);
    expect(JSON.stringify({ ...faceFitPanel, calibration: undefined })).not.toMatch(
      /progresivos|receta|pupilarómetro|laboratorio|bridgeNarrow|bridgeMedium|bridgeWide|monoPd|mm/i,
    );
    expect(manifest.copy.generating.waitSlides?.map((slide) => slide.imageSrc)).toEqual([
      '/brand/eyewear/wait-promo-summer.png',
      '/brand/eyewear/wait-promo-variety.png',
      '/brand/eyewear/wait-promo-vacation.png',
    ]);
    expect(manifest.copy.generating.waitSlides?.[0]?.title).toMatch(/verano/i);
    expect(manifest.copy.generating.waitSlides?.[1]?.eyebrow).toMatch(/estilo/i);
    expect(manifest.copy.generating.waitSlides?.[2]?.title).toMatch(/Vacaciones/i);
    expect(manifest.copy.productPage?.ctaLabel).toMatch(/Probador virtual/i);
    expect(manifest.copy.productPage?.otherFrames.length).toBeGreaterThan(0);
    expect(manifest.copy.productPage?.addLabel.length).toBeGreaterThan(0);
    expect(manifest.copy.productPage?.detailsTitle.length).toBeGreaterThan(0);
    expect(manifest.copy.productPage?.shapes.aviator).toBeTruthy();
    expect(manifest.wardrobe[0]?.url).toMatch(/\.jpg$/);
    expect(manifest.wardrobe.slice(0, 6).every((item) => item.url.endsWith('.jpg'))).toBe(
      true,
    );
    expect(manifest.wardrobe[0]?.priceLabel).toBeTruthy();
    expect(manifest.wardrobe.length).toBeGreaterThanOrEqual(20);
    expect(manifest.wardrobe.every((item) => item.category === 'glasses')).toBe(true);
    expect(manifest.wardrobe.every((item) => Boolean(item.eyewear?.stylistReason))).toBe(true);
    expect(manifest.frameMeasurements).toHaveLength(1);
    expect(manifest.frameMeasurements?.[0]?.wardrobeAnalogueId).toBe(
      'frame-square-04',
    );
    expect(manifest.frameMeasurements?.[0]?.catalogMatch).toBe('analogue');
    expect(manifest.frameMeasurements?.[0]?.wardrobeItemId).toBeUndefined();
    expect(
      manifest.wardrobe.some(
        (item) =>
          item.id === manifest.frameMeasurements?.[0]?.wardrobeAnalogueId,
      ),
    ).toBe(true);
    expect(manifest.brand.logoSrc).toBe('');
  });

  it('scopes wardrobe URLs to the eyewear pack', () => {
    const manifest = resolveManifestForClient('eyewear');
    const serialized = JSON.stringify({
      logo: manifest.brand.logoSrc,
      wardrobe: manifest.wardrobe.map((item) => item.url),
    });
    for (const foreign of [
      '/garments/nomad/',
      '/brand/nomad/',
      '/garments/marca-de-prueba/',
      '/brand/marca-de-prueba/',
      '/garments/real-madrid/',
      '/brand/real-madrid/',
    ]) {
      expect(serialized).not.toContain(foreign);
    }
    for (const item of manifest.wardrobe) {
      expect(item.url).toMatch(/^\/garments\/eyewear\//);
    }
  });

  it('navidad pack is a portrait multi-style festive kiosk', () => {
    const manifest = resolveManifestForClient('navidad');
    expect(manifest.theme).toBe('navidad');
    expect(manifest.display).toEqual({
      mode: 'mupi',
      targetWidth: 1080,
      targetHeight: 1920,
    });
    expect(manifest.features.videoLoop).toBe(false);
    expect(manifest.features.backgroundAudio).toBe(false);
    expect(manifest.wardrobe).toEqual([]);
    expect(manifest.copy.brickStudio?.restylesTitle).toBe('Personajes');
    expect(`${manifest.copy.landing.titleLine1} ${manifest.copy.landing.titleLine2}`).toBe(
      'Elige tu Navidad',
    );
    expect(manifest.copy.landing.subtitle).toBe(
      'Conviértete en un personaje navideño adorable.',
    );
    expect(manifest.brand.productName).toBe('Navidad en vivo');
    expect(JSON.stringify(manifest.copy)).not.toMatch(/barro|arcilla|plastilina/i);
    expect(JSON.stringify(manifest.copy)).not.toMatch(/lucy|decart/i);
    expect(manifest.copy.landing.ctaLabel).toBe('Empezar');
    expect(CLAY_EFFECTS.length).toBeGreaterThanOrEqual(8);
  });

  it('travel pack is the NO.MAD LAB destination kiosk', () => {
    const manifest = resolveManifestForClient('travel-experience');
    expect(manifest.theme).toBe('travel-experience');
    expect(manifest.display).toEqual({
      mode: 'mupi',
      targetWidth: 1080,
      targetHeight: 1920,
    });
    expect(manifest.features.backgroundAudio).toBe(false);
    expect(manifest.wardrobe).toEqual([]);
    expect(manifest.brand.productName).toBe('Travel Experience');
    expect(manifest.brand.logoAlt).toBe('NO.MAD LAB');
    expect(manifest.brand.landingPlate).toBe(true);
    expect(manifest.copy.brickStudio?.restylesTitle).toBe('Vestuario');
    expect(manifest.copy.brickStudio?.restart).toBe('Volver');
    expect(manifest.copy.landing.ctaLabel).toBe('Comenzar experiencia');
  });
});
