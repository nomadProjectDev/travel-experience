import { getTravelDestination } from './destinations';

export type TravelScreen =
  | { name: 'landing' }
  | { name: 'countries' }
  | { name: 'variant'; destinationId: string }
  | { name: 'live'; destinationId: string; effectId: string };

export type TravelAction =
  | { type: 'begin' }
  | { type: 'choose-country'; destinationId: string }
  | { type: 'choose-look'; effectId: string }
  | { type: 'back-to-countries' }
  | { type: 'back-to-landing' };

export function reduceTravelScreen(screen: TravelScreen, action: TravelAction): TravelScreen {
  switch (action.type) {
    case 'begin':
      if (screen.name !== 'landing') return screen;
      return { name: 'countries' };
    case 'choose-country': {
      const destination = getTravelDestination(action.destinationId);
      if (!destination) {
        throw new Error(`Unknown destination "${action.destinationId}"`);
      }
      return { name: 'variant', destinationId: destination.id };
    }
    case 'choose-look': {
      if (screen.name !== 'variant') {
        throw new Error('A look can only be chosen after its country');
      }
      const destination = getTravelDestination(screen.destinationId);
      if (!destination) {
        throw new Error(`Unknown destination "${screen.destinationId}"`);
      }
      const choice = destination.choices.find((item) => item.effectId === action.effectId);
      if (!choice) {
        throw new Error(`Look "${action.effectId}" is not a ${destination.label} variant`);
      }
      return {
        name: 'live',
        destinationId: destination.id,
        effectId: choice.effectId,
      };
    }
    case 'back-to-countries':
      if (screen.name === 'landing') return screen;
      return { name: 'countries' };
    case 'back-to-landing':
      return { name: 'landing' };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
