/**
 * Live Lucy 2.6 looks (`enhance: false`).
 *
 * Follows Decart's official Lucy 2.6 two-sentence structure (40-65 words):
 *   1. Explicit commands: `Swap the person's outfit for <costume>, set the
 *      background to <scene>, and restyle the entire scene as ...`
 *   2. `The output will show ...` describing ONLY desired visible elements.
 *
 * IMPORTANT: Never put negative lists ("do not add glasses/beard/earrings") or
 * the word "puppet" in diffusion prompts — mentioning `glasses` or `beard`
 * activates those tokens and hallucinates them onto clean faces. `Swap` keeps
 * the person's real visual identity; only `noel` explicitly adds a Santa beard.
 */

export const CLAY_EFFECT_GROUPS = ['restyle'] as const;

export type ClayEffectGroup = (typeof CLAY_EFFECT_GROUPS)[number];

export interface ClayEffect {
  id: string;
  group: ClayEffectGroup;
  /** Rail label. */
  name: string;
  /** Short gallery-style kicker. */
  kicker: string;
  /** Clay lump color. */
  stud: string;
  /** Label ink on that lump. */
  ink: 'dark' | 'light';
  /** English two-sentence Lucy 2.6 prompt (40-65 words). */
  prompt: string;
}

export const DEFAULT_CLAY_EFFECT_ID = 'duende';

interface ClayOutfitSpec {
  outfit: string;
  resultWearing: string;
  scene: string;
  /** Optional extra command clause (e.g. Santa's white clay beard). */
  extraCommand?: string;
}

function clayLook({ outfit, resultWearing, scene, extraCommand }: ClayOutfitSpec): string {
  const extra = extraCommand ? `, ${extraCommand}` : '';
  return (
    `Swap the person's outfit for ${outfit}${extra}, set the background to ${scene}, ` +
    `and restyle the scene as stop-motion plasticine claymation. ` +
    `The output will show the same person with their natural face in smooth clay, ` +
    `wearing ${resultWearing} in ${scene}.`
  );
}

export const CLAY_EFFECTS: readonly ClayEffect[] = [
  {
    id: 'duende',
    group: 'restyle',
    name: 'Duende',
    kicker: 'Taller',
    stud: '#1B6B45',
    ink: 'light',
    prompt: clayLook({
      outfit: 'a green felt elf tunic, red striped scarf, and pointed green hat',
      resultWearing: 'the green clay elf tunic, scarf, and pointed hat',
      scene: 'a warm clay toy workshop',
    }),
  },
  {
    id: 'noel',
    group: 'restyle',
    name: 'Papá Noel',
    kicker: 'Polo Norte',
    stud: '#C23A32',
    ink: 'light',
    prompt: clayLook({
      outfit: 'a red velvet Santa coat and hat',
      extraCommand: 'add a fluffy white plasticine Santa beard',
      resultWearing: 'the red clay Santa coat, hat, and white clay beard',
      scene: 'a snowy clay North Pole cabin',
    }),
  },
  {
    id: 'reyes',
    group: 'restyle',
    name: 'Rey Mago',
    kicker: 'Oriente',
    stud: '#E2B33A',
    ink: 'dark',
    prompt: clayLook({
      outfit: 'embroidered royal robes, a velvet cape, and a gold crown',
      resultWearing: 'rich clay royal robes, cape, and gold crown',
      scene: 'a starry clay palace courtyard',
    }),
  },
  {
    id: 'reno',
    group: 'restyle',
    name: 'Reno',
    kicker: 'Trineo',
    stud: '#7A4A28',
    ink: 'light',
    prompt: clayLook({
      outfit: 'a brown winter parka with sleigh bells and a reindeer antler headband',
      resultWearing: 'the brown clay coat with sleigh bells and small clay antlers',
      scene: 'a snowy clay pine forest',
    }),
  },
  {
    id: 'nieve',
    group: 'restyle',
    name: 'Muñeco Nieve',
    kicker: 'Invierno',
    stud: '#F7F3EA',
    ink: 'dark',
    prompt: clayLook({
      outfit: 'a puffy white winter coat with coal buttons, red scarf, and black top hat',
      resultWearing: 'the white clay coat, red scarf, and black top hat',
      scene: 'a snowy clay village square',
    }),
  },
  {
    id: 'cascanueces',
    group: 'restyle',
    name: 'Cascanueces',
    kicker: 'Guardia',
    stud: '#6B1D2A',
    ink: 'light',
    prompt: clayLook({
      outfit: 'a crimson toy soldier jacket with gold epaulets and a tall black hat',
      resultWearing: 'the crimson clay soldier jacket and tall black hat',
      scene: 'a festive clay theater stage',
    }),
  },
  {
    id: 'angel',
    group: 'restyle',
    name: 'Ángel',
    kicker: 'Belén',
    stud: '#F6E6C4',
    ink: 'dark',
    prompt: clayLook({
      outfit: 'a cream holiday tunic with white feathered wings and a gold halo',
      resultWearing: 'the cream clay tunic, white clay wings, and gold halo',
      scene: 'a starry sky with cotton clouds',
    }),
  },
  {
    id: 'galleta',
    group: 'restyle',
    name: 'Jengibre',
    kicker: 'Horno',
    stud: '#C47A3A',
    ink: 'dark',
    prompt: clayLook({
      outfit: 'a cinnamon gingerbread sweater with white icing trim and gumdrop buttons',
      resultWearing: 'the cinnamon clay sweater with white icing and gumdrop buttons',
      scene: 'a warm clay Christmas bakery',
    }),
  },
  {
    id: 'trineo',
    group: 'restyle',
    name: 'Explorador',
    kicker: 'Aurora',
    stud: '#1E3A5F',
    ink: 'light',
    prompt: clayLook({
      outfit: 'a navy quilted Arctic coat with fur hood trim and a knit beanie',
      resultWearing: 'the navy clay Arctic coat and knit beanie',
      scene: 'a snowy hill under green northern lights',
    }),
  },
];

export function getClayEffect(id: string): ClayEffect {
  const found = CLAY_EFFECTS.find((effect) => effect.id === id);
  if (found) return found;
  const fallback = CLAY_EFFECTS[0];
  if (!fallback) {
    throw new Error('Clay effect catalog is empty');
  }
  return fallback;
}

export function effectsInGroup(group: ClayEffectGroup): readonly ClayEffect[] {
  return CLAY_EFFECTS.filter((effect) => effect.group === group);
}
