import type { IIndexable } from '@aurelia/kernel';
import { isCustomElementViewModel, type PartialCustomElementDefinition } from '@aurelia/runtime-html';

import type { IChildRouteConfig, IRedirectRouteConfig, Routeable } from './options';
import type { IExtendedViewportInstruction, IViewportInstruction, Params, RouteableComponent } from './instructions';
import { NavigationStrategy } from './instructions';
import { tryStringify } from './util';
import { Events, getMessage } from './events';

/**
 * @returns `true` if the given `value` is an non-null, non-undefined, and non-CustomElement object.
 */
function isNotNullishOrTypeOrViewModel(value: RouteableComponent | IChildRouteConfig | null | undefined): value is PartialCustomElementDefinition | IChildRouteConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isCustomElementViewModel(value)
  );
}

export function isPartialCustomElementDefinition(value: RouteableComponent | IChildRouteConfig | null | undefined): value is PartialCustomElementDefinition {
  // 'name' is the only mandatory property of a CustomElementDefinition.
  // It overlaps with RouteType and may overlap with CustomElementViewModel, so this ducktype check is only valid when those are ruled out *first*
  return (
    isNotNullishOrTypeOrViewModel(value) &&
    Object.prototype.hasOwnProperty.call(value, 'name') === true
  );
}

export function isPartialChildRouteConfig(value: RouteableComponent | IChildRouteConfig | IRedirectRouteConfig | null | undefined): value is IChildRouteConfig {
  // 'component' is the only mandatory property of a ChildRouteConfig
  // It may overlap with RouteType and CustomElementViewModel, so this ducktype check is only valid when those are ruled out *first*
  return (
    isNotNullishOrTypeOrViewModel(value) &&
    Object.prototype.hasOwnProperty.call(value, 'component') === true
  );
}

export function isPartialRedirectRouteConfig(value: RouteableComponent | IChildRouteConfig | IRedirectRouteConfig | null | undefined): value is IRedirectRouteConfig {
  // 'redirectTo' and 'path' are mandatory properties of a RedirectRouteConfig
  // It may overlap with RouteType and CustomElementViewModel, so this ducktype check is only valid when those are ruled out *first*
  return (
    isNotNullishOrTypeOrViewModel(value) &&
    Object.prototype.hasOwnProperty.call(value, 'redirectTo') === true
  );
}

// Yes, `isPartialChildRouteConfig` and `isPartialViewportInstruction` have identical logic but since that is coincidental,
// and the two are intended to be used in specific contexts, we keep these as two separate functions for now.
export function isPartialViewportInstruction(value: RouteableComponent | IViewportInstruction | null | undefined): value is IExtendedViewportInstruction {
  // 'component' is the only mandatory property of a INavigationInstruction
  // It may overlap with RouteType and CustomElementViewModel, so this ducktype check is only valid when those are ruled out *first*
  return (
    isNotNullishOrTypeOrViewModel(value) &&
    Object.prototype.hasOwnProperty.call(value, 'component') === true
  );
}

export function expectType(expected: string, prop: string, value: unknown): never {
  throw new Error(getMessage(Events.rtInvalidConfigProperty, prop, expected, tryStringify(value)));
}

/**
 * Validate a `IRouteConfig` or `IChildRouteConfig`.
 *
 * The validation of these types is the same, except that `component` is a mandatory property of `IChildRouteConfig`.
 * This property is checked for in `validateComponent`.
 */
export function validateRouteConfig(config: Partial<IChildRouteConfig> | null | undefined, parentPath: string): void {
  if (config == null) throw new Error(getMessage(Events.rtInvalidConfig, config));

  const keys = Object.keys(config) as (keyof IChildRouteConfig)[];
  for (const key of keys) {
    const value = config[key];
    const path = [parentPath, key].join('.');
    switch (key) {
      case 'id':
      case 'viewport':
      case 'redirectTo':
        if (typeof value !== 'string') {
          expectType('string', path, value);
        }
        break;
      case 'caseSensitive':
      case 'nav':
        if (typeof value !== 'boolean') {
          expectType('boolean', path, value);
        }
        break;
      case 'data':
        if (typeof value !== 'object' || value === null) {
          expectType('object', path, value);
        }
        break;
      case 'title':
        switch (typeof value) {
          case 'string':
          case 'function':
            break;
          default:
            expectType('string or function', path, value);
        }
        break;
      case 'path':
        if (value instanceof Array) {
          for (let i = 0; i < value.length; ++i) {
            if (typeof value[i] !== 'string') {
              expectType('string', `${path}[${i}]`, value[i]);
            }
          }
        } else if (typeof value !== 'string') {
          expectType('string or Array of strings', path, value);
        }
        break;
      case 'component':
        validateComponent(value, path, 'component');
        break;
      case 'routes': {
        if (!(value instanceof Array)) {
          expectType('Array', path, value);
        }
        for (const route of value) {
          const childPath = `${path}[${value.indexOf(route as string)}]`;
          validateComponent(route, childPath, 'component');
        }
        break;
      }
      case 'transitionPlan':
        switch (typeof value) {
          case 'string':
            switch (value) {
              case 'none':
              case 'replace':
              case 'invoke-lifecycles':
                break;
              default:
                expectType('string(\'none\'|\'replace\'|\'invoke-lifecycles\') or function', path, value);
            }
            break;
          case 'function':
            break;
          default:
            expectType('string(\'none\'|\'replace\'|\'invoke-lifecycles\') or function', path, value);
        }
        break;
      case 'fallback':
        validateComponent(value, path, 'fallback');
        break;
      default:
        // We don't *have* to throw here, but let's be as strict as possible until someone gives a valid reason for not doing so.
        throw new Error(getMessage(Events.rtUnknownConfigProperty, parentPath, key));
    }
  }
}

function validateRedirectRouteConfig(config: Partial<IRedirectRouteConfig> | null | undefined, parentPath: string): void {
  if (config == null) throw new Error(getMessage(Events.rtInvalidConfig, config));

  const keys = Object.keys(config) as (keyof IRedirectRouteConfig)[];
  for (const key of keys) {
    const value = config[key];
    const path = [parentPath, key].join('.');
    switch (key) {
      case 'path':
        if (value instanceof Array) {
          for (let i = 0; i < value.length; ++i) {
            if (typeof value[i] !== 'string') {
              expectType('string', `${path}[${i}]`, value[i]);
            }
          }
        } else if (typeof value !== 'string') {
          expectType('string or Array of strings', path, value);
        }
        break;
      case 'redirectTo':
        if (typeof value !== 'string') {
          expectType('string', path, value);
        }
        break;
      default:
        // We don't *have* to throw here, but let's be as strict as possible until someone gives a valid reason for not doing so.
        throw new Error(getMessage(Events.rtUnknownRedirectConfigProperty, parentPath, key));
    }
  }
}

function validateComponent(component: Routeable | null | undefined, parentPath: string, property: string): void {
  switch (typeof component) {
    case 'function':
      break;
    case 'object':
      if (component instanceof Promise || component instanceof NavigationStrategy) {
        break;
      }
      if (isPartialRedirectRouteConfig(component)) {
        validateRedirectRouteConfig(component, parentPath);
        break;
      }
      if (isPartialChildRouteConfig(component)) {
        validateRouteConfig(component, parentPath);
        break;
      }
      if (
        !isCustomElementViewModel(component) &&
        !isPartialCustomElementDefinition(component)
      ) {
        expectType(`an object with at least a '${property}' property (see Routeable)`, parentPath, component);
      }
      break;
    case 'string':
      break;
    default:
      expectType('function, object or string (see Routeable)', parentPath, component);
  }
}

// This function is intentionally restricted to Params type as it is used only for Params.
// Feel free to extends the typings as per need.
export function shallowEquals(a: Params | null, b: Params | null): boolean {
  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return false;
  }

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (let i = 0, ii = aKeys.length; i < ii; ++i) {
    const key = aKeys[i];
    if (key !== bKeys[i]) {
      return false;
    }
    if ((a as IIndexable)[key] !== (b as IIndexable)[key]) {
      return false;
    }
  }

  return true;
}
