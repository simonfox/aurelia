import { IContainer, onResolve } from '@aurelia/kernel';
import { IHydratedController, ICustomElementController, LifecycleHook, LifecycleHooksLookup, ILifecycleHooks } from '@aurelia/runtime-html';
import { ComponentAppellation, IRouteableComponent, RouteableComponentType, type ReloadBehavior, LoadInstruction } from '../interfaces';
import { Viewport } from './viewport';
import { RoutingInstruction } from '../instructions/routing-instruction';
import { Navigation } from '../navigation';
import { IConnectedCustomElement } from './endpoint';
import { Runner, Step } from '../utilities/runner';
import { AwaitableMap } from '../utilities/awaitable-map';
import { EndpointContent, NavigationCoordinator, Parameters, RoutingScope } from '../index';
import { IRouter } from '../router';
import { FoundRoute } from '../found-route';
import { FallbackAction } from '../router-options';
import { ErrorNames, createMappedError } from '../errors';

/**
 * The viewport content encapsulates the component loaded into a viewport
 * and keeps track of the component's lifecycle and routing states, meaning
 * that the callers don't have to query (internal) content state to know if
 * a "state method" can be called.
 *
 * During a transition, a viewport has two viewport contents, the current
 * and the next, which is turned back into one when the transition is either
 * finalized or aborted.
 *
 * Viewport contents are used to represent the full component state
 * and can be used for caching.
 */

/**
 * The content states for the viewport content content.
 */
export type ContentState = 'created' | 'checkedUnload' | 'checkedLoad' | 'loaded' | 'activating' | 'activated';

/**
 * @internal
 */
export class ViewportContent extends EndpointContent {
  /**
   * The current content states
   */
  public contentStates: AwaitableMap<ContentState, void> = new AwaitableMap();

  /**
   * Whether the viewport content is from the endpoint cache
   */
  public fromCache: boolean = false;

  /**
   * Whether the viewport content is from the history cache
   */
  public fromHistory: boolean = false;

  /**
   * Whether content is currently being reloaded
   */
  public reload: boolean = false;

  /**
   * Resolved when content is activated (and can be deactivated)
   */
  public activatedResolve?: ((value?: void | PromiseLike<void>) => void) | null = null;

  public constructor(
    public readonly router: IRouter,

    /**
     * The viewport the viewport content belongs to
     */
    viewport: Viewport,

    /**
     * The routing scope the viewport content belongs to/is owned by
     */
    owningScope: RoutingScope | null,

    /**
     * Whether the viewport has its own routing scope, containing
     * endpoints it owns
     */
    hasScope: boolean,

    /**
     * The routing instruction that created the viewport content
     */
    public instruction: RoutingInstruction = RoutingInstruction.create('') as RoutingInstruction,

    /**
     * The navigation that created the viewport content
     */
    public navigation = Navigation.create({
      instruction: '',
      fullStateInstruction: '',
    }),

    /**
     * The connected viewport custom element
     */
    connectedCE: IConnectedCustomElement | null = null
  ) {
    super(router, viewport, owningScope, hasScope, instruction, navigation);
    // If we've got a container, we're good to resolve type
    if (!this.instruction.component.isType() && connectedCE?.container != null) {
      this.instruction.component.type = this.toComponentType(connectedCE.container);
    }
  }

  /**
   * The viewport content's component instance
   */
  public get componentInstance(): IRouteableComponent | null {
    return this.instruction.component.instance;
  }

  /**
   * The viewport content's reload behavior, as in how it behaves
   * when the content is loaded again.
   */
  public get reloadBehavior(): ReloadBehavior {
    if (this.instruction.route instanceof FoundRoute
      && this.instruction.route.match?.reloadBehavior !== null
    ) {
      return this.instruction.route.match?.reloadBehavior as ReloadBehavior;
    }
    return (this.instruction.component.instance !== null &&
      'reloadBehavior' in this.instruction.component.instance &&
      this.instruction.component.instance.reloadBehavior !== void 0)
      ? this.instruction.component.instance.reloadBehavior
      : 'default';
  }

  /**
   * Get the controller of the component in the viewport content.
   */
  public get controller(): ICustomElementController | undefined {
    return this.instruction.component.instance?.$controller;
  }

  /**
   * Whether the viewport content's component is equal to that of
   * another viewport content.
   *
   * @param other - The viewport content to compare with
   */
  public equalComponent(other: ViewportContent): boolean {
    return this.instruction.sameComponent(this.router, other.instruction);
  }

  /**
   * Whether the viewport content's parameters is equal to that of
   * another viewport content.
   *
   * @param other - The viewport content to compare with
   */
  public equalParameters(other: ViewportContent): boolean {
    return this.instruction.sameComponent(this.router, other.instruction, true) &&
      // TODO: Review whether query is enough or if parameters need
      // to be checked as well depending on when query is updated.
      // Should probably be able to compare parameters vs query as well.
      (this.navigation.query ?? '') === (other.navigation.query ?? '');
  }

  /**
   * Whether the viewport content is equal from a caching perspective to
   * that of another viewport content.
   *
   * @param other - The viewport content to compare with
   */
  public isCacheEqual(other: ViewportContent): boolean {
    return this.instruction.sameComponent(this.router, other.instruction, true);
  }

  /**
   * Create the component for the viewport content (based on the instruction)
   *
   * @param connectedCE - The custom element connected to the viewport
   * @param fallback - A (possible) fallback component to create if the
   * instruction component can't be created. The name of the failing
   * component is passed as parameter `id` to the fallback component
   * @param fallbackAction - Whether the children of an unloadable component
   * will be processed under the fallback component or if the child
   * instructions will be aborted.
   */
  public createComponent(coordinator: NavigationCoordinator, connectedCE: IConnectedCustomElement, fallback?: ComponentAppellation, fallbackAction?: FallbackAction): void | Promise<void> {
    // Can be called at multiple times, only process the first
    if (this.contentStates.has('created')) {
      return;
    }
    // Don't load cached content or instantiated history content
    if (!this.fromCache && !this.fromHistory) {
      try {
        return onResolve(
          this.toComponentInstance(connectedCE.container, connectedCE.controller, connectedCE.element),
          (component: IRouteableComponent | null) => {
            this.instruction.component.set(component);
            this.contentStates.set('created', void 0);
          }) as void | Promise<void>;
      } catch (e: unknown) {
        this._assertInstantiationError(e);

        // If there's a fallback component...
        if ((fallback ?? '') !== '') {
          if (fallbackAction === 'process-children') {
            // ...set the failed component as the first parameter (0)...
            this.instruction.parameters.set([this.instruction.component.name]);
          } else { // 'abort'
            // ...set the unparsed string of the failed component as the first parameter (0)...
            this.instruction.parameters.set([this.instruction.unparsed ?? this.instruction.component.name]);
            // ...if the instruction has children...
            if (this.instruction.hasNextScopeInstructions) {
              // ...remove the children from the coordinator
              coordinator.removeInstructions(this.instruction.nextScopeInstructions!);
              // ...and prevent processing of the child instructions.
              this.instruction.nextScopeInstructions = null;
            }
          }
          // ...fallback is the new component...
          this.instruction.component.set(fallback);

          // ...and try again.
          try {
            return onResolve(
              this.toComponentInstance(connectedCE.container, connectedCE.controller, connectedCE.element),
              (fallbackComponent: IRouteableComponent | null) => {
                this.instruction.component.set(fallbackComponent);
                this.contentStates.set('created', void 0);
              }) as void | Promise<void>;
          } catch (ee) {
            this._assertInstantiationError(ee);

            throw createMappedError(ErrorNames.endpoint_instantiation_error, this.instruction.component.name, ee);
          }
        } else {
          throw createMappedError(ErrorNames.endpoint_instantiation_error, this.instruction.component.name);
        }
      }
    }
    this.contentStates.set('created', void 0);
  }

  /**
   * Check if the viewport content's component can be loaded.
   */
  public canLoad(): boolean | LoadInstruction | LoadInstruction[] | Promise<boolean | LoadInstruction | LoadInstruction[]> {
    // Since canLoad is called from more than one place multiple calls can happen (and is fine)
    if (!this.contentStates.has('created') || (this.contentStates.has('checkedLoad') && !this.reload)) {
      // If we got here, an earlier check has already stated it can be loaded
      return true;
    }
    const instance = this.instruction.component.instance!;
    if (instance == null) {
      return true;
    }

    this.contentStates.set('checkedLoad', void 0);

    // Propagate parent parameters
    // TODO: Do we really want this?
    const parentParameters = (this.endpoint as Viewport)
      .parentViewport?.getTimeContent(this.navigation.timestamp)?.instruction?.typeParameters(this.router);
    const parameters = this.instruction.typeParameters(this.router);
    const merged = { ...this.navigation.parameters, ...parentParameters, ...parameters };

    const hooks = this._getLifecycleHooks(instance, 'canLoad')
      .map(hook => ((innerStep: Step | null) => {
        if (innerStep?.previousValue != null && innerStep.previousValue !== true) {
          innerStep.exit(); // To prevent more calls down the pipeline
          return innerStep.previousValue ?? false;
        }
        // TODO: If requested, pass previous value into hook
        return hook(instance, merged, this.instruction, this.navigation);
      }));

    if (instance.canLoad != null) {
      hooks.push((innerStep: Step | null) => {
        if ((innerStep?.previousValue ?? true) === false) {
          return false;
        }
        // TODO: If requested, pass previous value into hook
        return instance.canLoad!(merged, this.instruction, this.navigation);
      });
    }

    if (hooks.length === 0) {
      return true;
    }

    if (hooks.length === 1) {
      return hooks[0](null);
    }
    return Runner.run('canLoad', ...hooks) as Promise<RoutingInstruction[]>;
  }

  /**
   * Check if the viewport content's component can be unloaded.
   *
   * @param navigation - The navigation that causes the content change
   */
  public canUnload(navigation: Navigation | null): boolean | Promise<boolean> {
    // Since canUnload is called recursively multiple calls can happen (and is fine)
    if (this.contentStates.has('checkedUnload') && !this.reload) {
      // If we got here, an earlier check has already stated it can be unloaded
      return true;
    }
    this.contentStates.set('checkedUnload', void 0);

    // If content hasn't loaded a component, we're done
    if (!this.contentStates.has('loaded')) {
      return true;
    }

    const instance = this.instruction.component.instance!;

    // If it's an unload without a navigation, such as custom element simply
    // being removed, create an empty navigation for canUnload hook
    if (navigation === null) {
      navigation = Navigation.create({
        instruction: '',
        fullStateInstruction: '',
        previous: this.navigation,
      });
    }

    const hooks = this._getLifecycleHooks(instance, 'canUnload').map(hook => ((innerStep: Step | null) => {
      if ((innerStep?.previousValue ?? true) === false) {
        return false;
      }
      return hook(instance, this.instruction, navigation);
    }));

    if (instance.canUnload != null) {
      hooks.push((innerStep: Step | null) => {
        if ((innerStep?.previousValue ?? true) === false) {
          return false;
        }
        // TODO: If requested, pass previous value into hook
        return instance.canUnload?.(this.instruction, navigation) as boolean | Promise<boolean>;
      });
    }

    if (hooks.length === 0) {
      return true;
    }

    if (hooks.length === 1) {
      return hooks[0](null);
    }
    return Runner.run('canUnload', ...hooks) as boolean | Promise<boolean>;
  }

  /**
   * Load the viewport content's content.
   *
   * @param step - The previous step in this transition Run
   */
  public load(step: Step<void>): Step<void> {
    return Runner.run(step,
      () => this.contentStates.await('checkedLoad'),
      () => {
        // Since load is called from more than one place multiple calls can happen (and is fine)
        if (!this.contentStates.has('created') || (this.contentStates.has('loaded') && !this.reload)) {
          // If we got here, it's already loaded
          return;
        }
        this.reload = false;

        this.contentStates.set('loaded', void 0);

        const instance = this.instruction.component.instance!;

        // Propagate parent parameters
        // TODO: Do we really want this?
        const parentParameters = (this.endpoint as Viewport)
          .parentViewport?.getTimeContent(this.navigation.timestamp)?.instruction?.typeParameters(this.router);
        const parameters = this.instruction.typeParameters(this.router);
        const merged = { ...this.navigation.parameters, ...parentParameters, ...parameters };

        const hooks = this._getLifecycleHooks(instance, 'loading').map(hook =>
          () => hook(instance, merged, this.instruction, this.navigation));

        hooks.push(...this._getLifecycleHooks(instance, 'load').map(hook =>
          () => {
            // eslint-disable-next-line no-console
            console.warn(`[Deprecated] Found deprecated hook name "load" in ${this.instruction.component.name}. Please use the new name "loading" instead.`);
            return hook(instance, merged, this.instruction, this.navigation);
          }));

        if (hooks.length !== 0) {
          // Add hook in component
          if (typeof instance.loading === 'function') {
            hooks.push(() => instance.loading!(merged, this.instruction, this.navigation));
          }
          if (hasVmHook(instance, 'load')) {
            // eslint-disable-next-line no-console
            console.warn(`[Deprecated] Found deprecated hook name "load" in ${this.instruction.component.name}. Please use the new name "loading" instead.`);
            hooks.push(() => instance.load(merged, this.instruction, this.navigation));
          }

          return Runner.run('load', ...hooks);
        }

        // Skip if there's no hook in component
        if (hasVmHook(instance, 'loading')) {
          return instance.loading(merged, this.instruction, this.navigation);
        }
        // Skip if there's no hook in component
        if (hasVmHook(instance, 'load')) {
          // eslint-disable-next-line no-console
          console.warn(`[Deprecated] Found deprecated hook name "load" in ${this.instruction.component.name}. Please use the new name "loading" instead.`);
          return instance.load(merged, this.instruction, this.navigation);
        }
      }
    ) as Step<void>;
  }

  /**
   * Unload the viewport content's content.
   *
   * @param navigation - The navigation that causes the content change
   */
  public unload(navigation: Navigation | null): void | Promise<void> {
    // Since load is called from more than one place multiple calls can happen (and is fine)
    if (!this.contentStates.has('loaded')) {
      // If we got here, it's already unloaded (or wasn't loaded in the first place)
      return;
    }
    this.contentStates.delete('loaded');

    const instance = this.instruction.component.instance!;

    if (navigation === null) {
      navigation = Navigation.create({
        instruction: '',
        fullStateInstruction: '',
        previous: this.navigation,
      });
    }

    const hooks = this._getLifecycleHooks(instance, 'unloading').map(hook =>
      () => hook(instance, this.instruction, navigation));

    hooks.push(...this._getLifecycleHooks(instance, 'unload').map(hook =>
      () => {
        // eslint-disable-next-line no-console
        console.warn(`[Deprecated] Found deprecated hook name "unload" in ${this.instruction.component.name}. Please use the new name "unloading" instead.`);
        return hook(instance, this.instruction, navigation);
      }));

    if (hooks.length !== 0) {
      // Add hook in component
      if (hasVmHook(instance, 'unloading')) {
        hooks.push(() => instance.unloading(this.instruction, navigation));
      }
      if (hasVmHook(instance, 'unload')) {
        // eslint-disable-next-line no-console
        console.warn(`[Deprecated] Found deprecated hook name "unload" in ${this.instruction.component.name}. Please use the new name "unloading" instead.`);
        hooks.push(() => instance.unload(this.instruction, navigation));
      }

      return Runner.run('unload', ...hooks) as void | Promise<void>;
    }

    // Skip if there's no hook in component
    if (hasVmHook(instance, 'unloading')) {
      return instance.unloading(this.instruction, navigation);
    }
    if (hasVmHook(instance, 'unload')) {
      // eslint-disable-next-line no-console
      console.warn(`[Deprecated] Found deprecated hook name "unload" in ${this.instruction.component.name}. Please use the new name "unloading" instead.`);
      return instance.unload(this.instruction, navigation);
    }
  }

  /**
   * Activate (bind and attach) the content's component.
   *
   * @param step - The previous step in this transition Run
   * @param initiator - The controller initiating the activation
   * @param parent - The parent controller for the content's component controller
   * @param flags - The lifecycle flags
   * @param connectedCE - The viewport's connectd custom element
   * @param boundCallback - A callback that's called when the content's component has been bound
   * @param attachPromise - A promise that th content's component controller will await before attaching
   */
  public activateComponent(
    step: Step<void>,
    initiator: IHydratedController | null,
    parent: ICustomElementController | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connectedCE: IConnectedCustomElement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    boundCallback: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    attachPromise: void | Promise<void> | undefined
  ): Step<void> {
    return Runner.run(step,
      () => this.contentStates.await('loaded'),
      () => this.waitForParent(parent), // TODO: It might be possible to refactor this away
      () => {
        if (this.contentStates.has('activating') || this.contentStates.has('activated')) {
          return;
        }
        this.contentStates.set('activating', void 0);

        return this.controller?.activate(
          initiator ?? this.controller,
          parent,
          void 0 /* , boundCallback, this.instruction.topInstruction ? attachPromise : void 0 */) as Promise<void>;
      },
      () => {
        this.contentStates.set('activated', void 0);
      },
      /* TODO: This should be added back in somehow/somewhere
      () => {
        if (this.fromCache || this.fromHistory) {
          const elements = Array.from(connectedCE.element.getElementsByTagName('*'));
          for (const el of elements) {
            const attr = el.getAttribute('au-element-scroll');
            if (attr) {
              const [top, left] = attr.split(',');
              el.removeAttribute('au-element-scroll');
              el.scrollTo(+left, +top);
            }
          }
        }
      },
    */
    ) as Step<void>;
  }

  /**
   * Deactivate (detach and unbind) the content's component.
   *
   * @param step - The previous step in this transition Run
   * @param initiator - The controller initiating the activation
   * @param parent - The parent controller for the content's component controller
   * @param flags - The lifecycle flags
   * @param connectedCE - The viewport's connectd custom element
   * @param stateful - Whether the content's component is stateful and shouldn't be disposed
   */
  public deactivateComponent(step: Step<void> | null, initiator: IHydratedController | null, parent: ICustomElementController | null, connectedCE: IConnectedCustomElement, stateful: boolean = false): void | Promise<void> | Step<void> {
    if (!this.contentStates.has('activated') && !this.contentStates.has('activating')) {
      return;
    }
    return Runner.run(
      step,
      // TODO: Revisit once it's possible to abort within lifecycle hooks
      // () => {
      //   if (!this.contentStates.has('activated')) {
      //     const elements = Array.from(connectedCE.element.children);
      //     for (const el of elements) {
      //       (el as HTMLElement).style.display = 'none';
      //     }
      //     return this.contentStates.await('activated');
      //   }
      // },
      // () => this.waitForActivated(this.controller, connectedCE),
      () => {
        if (stateful && connectedCE.element !== null) {
          const elements = Array.from(connectedCE.element.getElementsByTagName('*'));
          for (const el of elements) {
            if (el.scrollTop > 0 || el.scrollLeft) {
              el.setAttribute('au-element-scroll', `${el.scrollTop},${el.scrollLeft}`);
            }
          }
        }

        this.contentStates.delete('activated');
        this.contentStates.delete('activating');
        return this.controller?.deactivate(initiator ?? this.controller, parent);
      }
    ) as Step<void>;
  }

  /**
   * Dispose the content's component.
   *
   * @param connectedCE - The viewport's connectd custom element
   * @param cache - The cache to push the viewport content to if stateful
   * @param stateful - Whether the content's component is stateful and shouldn't be disposed
   */
  public disposeComponent(connectedCE: IConnectedCustomElement, cache: ViewportContent[], stateful: boolean = false): void {
    if (!this.contentStates.has('created') || this.instruction.component.instance == null) {
      return;
    }

    // Don't unload components when stateful
    // TODO: We're missing stuff here
    if (!stateful) {
      this.contentStates.delete('created');
      return this.controller?.dispose();
    } else {
      cache.push(this);
    }
  }

  /**
   * Free the content's content.
   *
   * @param step - The previous step in this transition Run
   * @param connectedCE - The viewport's connectd custom element
   * @param navigation - The navigation causing the content to be freed
   * @param cache - The cache to push the viewport content to if stateful
   * @param stateful - Whether the content's component is stateful and shouldn't be disposed
   */
  public freeContent(step: Step<void>, connectedCE: IConnectedCustomElement | null, navigation: Navigation | null, cache: ViewportContent[], stateful: boolean = false): Step<void> {
    return Runner.run(step,
      () => this.unload(navigation),
      (innerStep: Step<void>) => this.deactivateComponent(innerStep, null, connectedCE!.controller, connectedCE!, stateful),
      () => this.disposeComponent(connectedCE!, cache, stateful),
    ) as Step<void>;
  }

  /**
   * Get the content's component name (if any).
   */
  public toComponentName(): string | null {
    return this.instruction.component.name;
  }

  /**
   * Get the content's component type (if any).
   */
  public toComponentType(container: IContainer): RouteableComponentType | null {
    if (this.instruction.component.none) {
      return null;
    }
    return this.instruction.component.toType(container, this.instruction);
  }

  /**
   * Get the content's component instance (if any).
   */
  public toComponentInstance(parentContainer: IContainer, parentController: IHydratedController, parentElement: HTMLElement): IRouteableComponent | null | Promise<IRouteableComponent> {
    if (this.instruction.component.none) {
      return null;
    }
    return this.instruction.component.toInstance(parentContainer, parentController, parentElement, this.instruction);
  }

  /**
   * Wait for the viewport's parent to be active.
   *
   * @param parent - The parent controller to the viewport's controller
   */
  private waitForParent(parent: ICustomElementController | null): void | Promise<void> {
    if (parent === null) {
      return;
    }
    if (!parent.isActive) {
      return new Promise((resolve) => {
        (this.endpoint as Viewport).activeResolve = resolve;
      });
    }
  }

  /**
   * Assert that the error is an instantiation error. If it's not, throw
   * the error. If it is, log a warning in development mode.
   *
   * @param e - The error to assert
   */
  private _assertInstantiationError(e: unknown): void {
    if (!(e as Error).message.startsWith('AUR0009:')) {
      throw e;
    }

    if (__DEV__) {
      const componentName = this.instruction.component.name as string;
      // eslint-disable-next-line no-console
      console.warn(createMappedError(ErrorNames.endpoint_instantiation_error, componentName, e));
    }
  }

  /** @internal */
  // TODO: Move this elsewhere and fix the typings
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'canLoad'): LifecycleHook<IRouteableComponent, 'canLoad'>[];
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'loading'): LifecycleHook<IRouteableComponent, 'loading'>[];
  /**
   * @deprecated
   */
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'load'): LifecycleHook<IRouteableComponent, 'loading'>[];
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'canUnload'): LifecycleHook<IRouteableComponent, 'canUnload'>[];
  /**
   * @deprecated
   */
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'unload'): LifecycleHook<IRouteableComponent, 'unloading'>[];
  private _getLifecycleHooks(instance: IRouteableComponent, name: 'unloading'): LifecycleHook<IRouteableComponent, 'unloading'>[];
  private _getLifecycleHooks(instance: IRouteableComponent, name: LifecycleNames): unknown[] {
    const hooks = (instance.$controller!.lifecycleHooks as LifecycleHooksLookup<IRouteableComponentDeprecated>)[name] ?? [];
    return hooks.map(hook => ((hook.instance as ILifecycleHooks<IRouteableComponentDeprecated>)[name]).bind(hook.instance));
  }
}

type IRouteableComponentDeprecated = IRouteableComponent & {
  load?(parameters: Parameters, instruction: RoutingInstruction, navigation: Navigation): void | Promise<void>;
  unload?(instruction: RoutingInstruction, navigation: Navigation | null): void | Promise<void>;
};

type LifecycleNames = 'load' | 'unload' | 'loading' | 'unloading' | 'canLoad' | 'canUnload';
type IHasVmHook<T extends LifecycleNames> = IRouteableComponentDeprecated & {
  [key in T]: NonNullable<IRouteableComponentDeprecated[key]>;
};

/**
 * @deprecated
 * 'load' and 'unload' are deprecated in favor of 'loading' and 'unloading'
 */
function hasVmHook(
  instance: IRouteableComponentDeprecated,
  lifecycle: 'load' | 'unload',
): instance is IHasVmHook<typeof lifecycle>;
function hasVmHook(
  instance: IRouteableComponentDeprecated,
  lifecycle: 'load' | 'unload' | 'loading' | 'unloading' | 'canLoad' | 'canUnload',
): instance is IHasVmHook<typeof lifecycle>;
function hasVmHook(
  instance: IRouteableComponentDeprecated,
  lifecycle: 'load' | 'unload' | 'loading' | 'unloading' | 'canLoad' | 'canUnload',
): instance is IHasVmHook<typeof lifecycle> {
  return typeof instance[lifecycle] === 'function';
}
