import { InjectionToken } from '@angular/core';

export const HYBRID_ENTITY_TYPE = new InjectionToken<string>('HYBRID_ENTITY_TYPE', {
  providedIn: 'root',
  factory: () => 'product'
});

export const HYBRID_ENTITY_DISPLAY_NAME = new InjectionToken<string>('HYBRID_ENTITY_DISPLAY_NAME', {
  providedIn: 'root',
  factory: () => 'Products'
});

export const HYBRID_TRANSLATION_PREFIX = new InjectionToken<string>('HYBRID_TRANSLATION_PREFIX', {
  providedIn: 'root',
  factory: () => 'products'
});
