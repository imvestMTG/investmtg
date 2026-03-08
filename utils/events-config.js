/* events-config.js — Community events configuration
 * Static data kept as fallback; use getEventsAsync() for live backend data. */

import { fetchEvents } from './api.js';

export var COMMUNITY_EVENTS = [
  {
    id: 'tcgcon-2026',
    title: 'TCG Con 2026',
    subtitle: 'Las Vegas Convention Center',
    date: 'July 2026',
    image: 'images/event-tcgcon.webp',
    link: null
  },
  {
    id: 'commander-night',
    title: 'Commander Night',
    subtitle: 'Weekly at Geek Out Guam',
    date: 'Every Thursday',
    image: 'images/event-commander.webp',
    link: null
  },
  {
    id: 'mtg-weekend',
    title: 'MTG Weekend',
    subtitle: 'Modern & Standard',
    date: 'Monthly',
    image: 'images/event-weekend.webp',
    link: null
  }
];

/**
 * Fetch events from backend, fall back to static COMMUNITY_EVENTS on error.
 * The backend returns events with tags as a JSON string (already parsed by fetchEvents).
 * Returns a Promise resolving to an events array.
 */
export function getEventsAsync() {
  return fetchEvents().catch(function() {
    return COMMUNITY_EVENTS;
  });
}
