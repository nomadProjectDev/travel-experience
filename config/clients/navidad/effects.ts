/**
 * Live Lucy 2.6 looks (`enhance: false`).
 *
 * Follows Decart's official Lucy 2.6 two-sentence structure (45-70 words):
 *   1. Explicit commands: `Set the background to <complete claymation world>,
 *      swap the person's outfit for <costume>, and style the person in
 *      stop-motion plasticine claymation.`
 *   2. `The output will show <full scene filling the background>, with the same
 *      person in the foreground...`
 *
 * Why `Set the background` comes FIRST (and we avoid `restyle the scene`):
 * `restyle the scene` repaints the user's real room geometry, whereas `Set the
 * background` with concrete landmarks/walls/sky completely replaces the real-life
 * room behind the user.
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
  /** English two-sentence Lucy 2.6 prompt replacing background + outfit. */
  prompt: string;
}

export const DEFAULT_CLAY_EFFECT_ID = 'duende';

interface ClayOutfitSpec {
  background: string;
  outfit: string;
  resultWearing: string;
  resultBackdrop: string;
  /** Optional extra command clause (e.g. Santa's white clay beard). */
  extraCommand?: string;
}

function clayLook({
  background,
  outfit,
  resultWearing,
  resultBackdrop,
  extraCommand,
}: ClayOutfitSpec): string {
  const extra = extraCommand ? `, ${extraCommand}` : '';
  return (
    `Set the background to ${background}, swap the person's outfit for ${outfit}${extra}, ` +
    `and render the person in stop-motion plasticine claymation. ` +
    `The output will show ${resultBackdrop} filling the entire background, ` +
    `with the same person in the foreground with their natural face in smooth clay, wearing ${resultWearing}.`
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
      background:
        'a stop-motion claymation Christmas toy workshop with wooden shelves of colorful toys, wrapped gifts, and a snowy window',
      outfit: 'a green felt elf tunic, red striped scarf, and pointed green hat',
      resultBackdrop: 'clay wooden shelves packed with toys, gifts, and warm string lights',
      resultWearing: 'the green clay elf tunic, scarf, and pointed hat',
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
      background:
        'a cozy claymation North Pole log cabin with a glowing stone fireplace, decorated Christmas tree, and stockings',
      outfit: 'a red velvet Santa coat and hat',
      extraCommand: 'add a fluffy white plasticine Santa beard',
      resultBackdrop: 'a warm clay log cabin with a lit stone fireplace and Christmas tree',
      resultWearing: 'the red clay Santa coat, hat, and white clay beard',
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
      background:
        'a claymation desert palace courtyard at night with golden arches, glowing lanterns, and a bright Guiding Star in the sky',
      outfit: 'embroidered royal robes, a velvet cape, and a gold crown',
      resultBackdrop: 'clay palace arches, hanging lanterns, and a starry night sky',
      resultWearing: 'rich clay royal robes, cape, and gold crown',
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
      background:
        'a claymation snowy pine forest at night with snow-laden evergreen trees, falling snow, and a red wooden sleigh',
      outfit: 'a brown winter parka with sleigh bells and a reindeer antler headband',
      resultBackdrop: 'snow-covered clay pine trees, falling snow, and a red sleigh',
      resultWearing: 'the brown clay coat with sleigh bells and small clay antlers',
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
      background:
        'a claymation snowy Christmas village square at night with crooked cottages, glowing amber windows, and street lamps',
      outfit: 'a puffy white winter coat with coal buttons, red scarf, and black top hat',
      resultBackdrop: 'snowy clay cottages with glowing windows and warm street lamps',
      resultWearing: 'the white clay coat, red scarf, and black top hat',
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
      background:
        'a grand claymation Christmas theater stage with red velvet curtains, golden spotlights, and a giant decorated tree',
      outfit: 'a crimson toy soldier jacket with gold epaulets and a tall black hat',
      resultBackdrop: 'red clay velvet stage curtains, golden lights, and a Christmas tree',
      resultWearing: 'the crimson clay soldier jacket and tall black hat',
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
      background:
        'a dreamy claymation night sky above a tiny glowing Bethlehem village with fluffy cotton clouds and golden stars',
      outfit: 'a cream holiday tunic with white feathered wings and a gold halo',
      resultBackdrop: 'fluffy cotton clouds and golden clay stars in a deep blue sky',
      resultWearing: 'the cream clay tunic, white clay wings, and gold halo',
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
      background:
        'a claymation Christmas bakery kitchen with candy-cane pillars, gingerbread houses, frosting jars, and a warm brick oven',
      outfit: 'a cinnamon gingerbread sweater with white icing trim and gumdrop buttons',
      resultBackdrop: 'a clay bakery filled with gingerbread houses, candy canes, and a glowing oven',
      resultWearing: 'the cinnamon clay sweater with white icing and gumdrop buttons',
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
      background:
        'a claymation Arctic mountain ridge at night with snowdrifts, icy peaks, and glowing green northern lights across the sky',
      outfit: 'a navy quilted Arctic coat with fur hood trim and a knit beanie',
      resultBackdrop: 'snowy clay Arctic peaks beneath bright green northern lights',
      resultWearing: 'the navy clay Arctic coat and knit beanie',
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
