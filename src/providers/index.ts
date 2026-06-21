import type { Provider } from '../types/feed.js';
import { ganganOnlineProvider } from './gangan-online.js';
import { kadocomiProvider } from './kadocomi.js';

const providers = new Map<string, Provider>([
  [ganganOnlineProvider.id, ganganOnlineProvider],
  [kadocomiProvider.id, kadocomiProvider],
]);

export const getProvider = (providerId: string): Provider | undefined => providers.get(providerId);
export const listProviders = (): Provider[] => [...providers.values()];
