import type { Provider } from '../types/feed.ts';
import { ganganOnlineProvider } from './gangan-online.ts';
import { kadocomiProvider } from './kadocomi.ts';

const providers = new Map<string, Provider>([
  [ganganOnlineProvider.id, ganganOnlineProvider],
  [kadocomiProvider.id, kadocomiProvider],
]);

export const getProvider = (providerId: string): Provider | undefined => providers.get(providerId);
export const listProviders = (): Provider[] => [...providers.values()];
