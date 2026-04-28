import {
  trigger,
  transition,
  style,
  animate,
  AnimationTriggerMetadata,
} from '@angular/animations';

/**
 * Hero / section entrance: opacity 0→1, translateY(offset)→0.
 * Params: delay (ms), duration (ms), offset (px), ease (string).
 */
export const fadeInUp: AnimationTriggerMetadata = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY({{offset}}px)' }),
    animate(
      '{{duration}}ms {{delay}}ms {{ease}}',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ], { params: { delay: 0, duration: 500, offset: 10, ease: 'ease-out' } }),
]);

/**
 * Staggered list/table entrance: opacity 0→1, translateY(offset)→0.
 * Params: delay (ms), duration (ms), offset (px), ease (string).
 */
export const fadeInUpStagger: AnimationTriggerMetadata = trigger('fadeInUpStagger', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY({{offset}}px)' }),
    animate(
      '{{duration}}ms {{delay}}ms {{ease}}',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ], { params: { delay: 0, duration: 300, offset: 5, ease: 'ease-out' } }),
]);

/**
 * Left slide entrance (e.g. timeline items): opacity 0→1, translateX(-10px)→0.
 * Params: delay (ms), duration (ms).
 */
export const fadeInFromLeft: AnimationTriggerMetadata = trigger('fadeInFromLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-10px)' }),
    animate(
      '{{duration}}ms {{delay}}ms ease-out',
      style({ opacity: 1, transform: 'translateX(0)' })
    ),
  ], { params: { delay: 0, duration: 250 } }),
]);

export const routePageTransition: AnimationTriggerMetadata = trigger('routePageTransition', [
  transition('* <=> *', [
    style({ opacity: 0, transform: 'translateY(6px)' }),
    animate(
      '{{duration}}ms {{ease}}',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ], { params: { duration: 220, ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)' } }),
]);
