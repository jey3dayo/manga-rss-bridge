import type { Provider } from '../types/feed.ts';
import { comicDaysProvider } from './comic-days.ts';
import { firecrossProvider } from './firecross.ts';
import { gaugauProvider } from './gaugau.ts';
import { ganganOnlineProvider } from './gangan-online.ts';
import { hayacomicProvider } from './hayacomic.ts';
import { jumpRookieProvider } from './jump-rookie.ts';
import { kadocomiProvider } from './kadocomi.ts';
import { mangaOneProvider } from './manga-one.ts';
import { mangaboxProvider } from './mangabox.ts';
import { yanmagaProvider } from './yanmaga.ts';

const providers = new Map<string, Provider>([
  [comicDaysProvider.id, comicDaysProvider],
  [firecrossProvider.id, firecrossProvider],
  [gaugauProvider.id, gaugauProvider],
  [ganganOnlineProvider.id, ganganOnlineProvider],
  [hayacomicProvider.id, hayacomicProvider],
  [jumpRookieProvider.id, jumpRookieProvider],
  [kadocomiProvider.id, kadocomiProvider],
  [mangaOneProvider.id, mangaOneProvider],
  [mangaboxProvider.id, mangaboxProvider],
  [yanmagaProvider.id, yanmagaProvider],
]);

export const getProvider = (providerId: string): Provider | undefined => providers.get(providerId);
export const listProviders = (): Provider[] => [...providers.values()];
