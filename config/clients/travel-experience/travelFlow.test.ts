import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import copy from './copy';
import { requireClayEffect } from './effects';
import {
  TRAVEL_DESTINATIONS,
  TRAVEL_HOME_BACKGROUND,
  countryCardFields,
  getTravelDestination,
} from './destinations';
import { reduceTravelScreen, type TravelScreen } from './travelFlow';

describe('travel two-step selection', () => {
  it('lists the six destinations and does not paint a second title on the card', () => {
    expect(TRAVEL_DESTINATIONS.map((destination) => destination.label)).toEqual([
      'México Centro',
      'Perú Cusco',
      'Colombia Eje Cafetero',
      'Argentina Región Pampeana',
      'Chile Zona Central',
      'Puerto Rico',
    ]);
    expect(TRAVEL_HOME_BACKGROUND.src).toBe(
      '/brand/travel-experience/destinations/home-background.jpg',
    );
    expect(existsSync(`public${TRAVEL_HOME_BACKGROUND.src}`)).toBe(true);

    for (const destination of TRAVEL_DESTINATIONS) {
      expect(countryCardFields(destination)).toEqual({
        src: destination.cardSrc,
        alt: destination.label,
      });
      expect(destination.cardSrc).toBe(
        `/brand/travel-experience/destinations/${destination.id}.webp`,
      );
      expect(destination.screenBackgroundSrc).toBe(
        `/brand/travel-experience/destinations/${destination.id}/fondo.webp`,
      );
      expect(existsSync(`public${destination.cardSrc}`)).toBe(true);
      expect(existsSync(`public${destination.screenBackgroundSrc}`)).toBe(true);
      expect(destination.choices).toHaveLength(2);
    }

    expect(copy.brickStudio?.destinationsTitle).toBe('Elige un destino');
    expect(copy.brickStudio?.changeLook).toBe('Cambiar');
    expect(copy.brickStudio?.restart).toBe('Volver');
    expect(copy.brickStudio?.variantBackLabel).toBe('← Volver');
    expect(getTravelDestination('colombia')?.variantHeadline).toBe('Colombia • Eje Cafetero');
  });

  it('asks Hombre or Mujer only where the pack has those looks', () => {
    const gendered = TRAVEL_DESTINATIONS.filter((destination) =>
      destination.choices.every((choice) => choice.label === 'Hombre' || choice.label === 'Mujer'),
    );

    expect(gendered.map((destination) => destination.id)).toEqual([
      'mexico',
      'peru',
      'argentina',
      'chile',
    ]);
    expect(getTravelDestination('colombia')?.choices.map((choice) => choice.label)).toEqual([
      'Arriero',
      'Chapolera',
    ]);
    expect(getTravelDestination('puerto-rico')?.choices.map((choice) => choice.label)).toEqual([
      'Vejigante Rojo/Amarillo',
      'Vejigante Azul/Verde',
    ]);
    expect(getTravelDestination('puerto-rico')?.variantLead).toBe('Elige tu vejigante');
  });

  it('reaches a single look only after country, then variant', () => {
    let screen: TravelScreen = { name: 'landing' };
    screen = reduceTravelScreen(screen, { type: 'begin' });
    expect(screen).toEqual({ name: 'countries' });

    screen = reduceTravelScreen(screen, { type: 'choose-country', destinationId: 'colombia' });
    expect(screen).toEqual({ name: 'variant', destinationId: 'colombia' });
    expect(() =>
      reduceTravelScreen(screen, { type: 'choose-look', effectId: 'mexico-hombre' }),
    ).toThrow(/not a Colombia Eje Cafetero variant/);

    screen = reduceTravelScreen(screen, {
      type: 'choose-look',
      effectId: 'colombia-arriero',
    });
    expect(screen).toEqual({
      name: 'live',
      destinationId: 'colombia',
      effectId: 'colombia-arriero',
    });

    screen = reduceTravelScreen(screen, { type: 'back-to-countries' });
    expect(screen).toEqual({ name: 'countries' });
    screen = reduceTravelScreen(screen, {
      type: 'choose-country',
      destinationId: 'puerto-rico',
    });
    screen = reduceTravelScreen(screen, {
      type: 'choose-look',
      effectId: 'puerto-rico-azul-verde',
    });
    expect(screen).toEqual({
      name: 'live',
      destinationId: 'puerto-rico',
      effectId: 'puerto-rico-azul-verde',
    });
    expect(requireClayEffect('puerto-rico-azul-verde').referenceImage?.src).toBe(
      '/brand/travel-experience/effects/puerto-rico-azul-verde.png',
    );
  });

  it('refuses a look chosen before its country', () => {
    expect(() =>
      reduceTravelScreen({ name: 'countries' }, {
        type: 'choose-look',
        effectId: 'chile-mujer',
      }),
    ).toThrow(/after its country/);
    expect(() =>
      reduceTravelScreen({ name: 'landing' }, {
        type: 'choose-country',
        destinationId: 'atlantis',
      }),
    ).toThrow(/Unknown destination/);
  });
});
