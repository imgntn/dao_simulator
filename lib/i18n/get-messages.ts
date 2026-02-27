/**
 * Locale-aware message loader.
 *
 * Uses a synchronous import map — all 4 locale bundles are available at
 * build time. At this scale (~713 strings) dynamic import adds async
 * complexity for no real benefit.
 */

import type { Messages } from './types';
import type { Locale } from './config';
import { messages as en } from './messages/en';
import { messages as es } from './messages/es';
import { messages as zh } from './messages/zh';
import { messages as ja } from './messages/ja';

const messageMap: Record<Locale, Messages> = { en, es, zh, ja };

export function getMessages(locale: Locale): Messages {
  return messageMap[locale] ?? messageMap.en;
}
