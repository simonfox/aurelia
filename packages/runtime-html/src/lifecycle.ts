import { DI, IContainer, IIndexable, IDisposable } from '@aurelia/kernel';
import { IBindingTargetAccessor, LifecycleFlags, Scope, ILifecycle, IBinding } from '@aurelia/runtime';

import { HooksDefinition } from './definitions';
import { INode, INodeSequence, IRenderLocation } from './dom';
import { CustomElementDefinition, PartialCustomElementDefinition } from './resources/custom-element';
import { IRenderContext, ICompiledRenderContext } from './templating/render-context';
import { CustomAttributeDefinition } from './resources/custom-attribute';

import type { IAppRoot } from './app-root';
import { IPlatform } from './platform';
import { ElementProjector } from './projectors';
import { Instruction } from './instructions';

export const enum ViewModelKind {
  customElement,
  customAttribute,
  synthetic
}

/**
 * A controller that is ready for activation. It can be `ISyntheticView`, `ICustomElementController` or `ICustomAttributeController`.
 *
 * In terms of specificity this is identical to `IController`. The only difference is that this
 * type is further initialized and thus has more properties and APIs available.
 */
export type IHydratedController = ISyntheticView | ICustomElementController | ICustomAttributeController;
/**
 * A controller that is ready for activation. It can be `ICustomElementController` or `ICustomAttributeController`.
 *
 * This type of controller is backed by a real component (hence the name) and therefore has ViewModel and may have lifecycle hooks.
 *
 * In contrast, `ISyntheticView` has neither a view model nor lifecycle hooks (but its child controllers, if any, may).
 */
export type IHydratedComponentController = ICustomElementController | ICustomAttributeController;
/**
 * A controller that is ready for activation. It can be `ISyntheticView` or `ICustomElementController`.
 *
 * This type of controller may have child controllers (hence the name) and bindings directly placed on it during hydration.
 *
 * In contrast, `ICustomAttributeController` has neither child controllers nor bindings directly placed on it (but the backing component may).
 *
 * Note: the parent of a `ISyntheticView` is always a `IHydratedComponentController` because views cannot directly own other views. Views may own components, and components may own views or components.
 */
export type IHydratedParentController = ISyntheticView | ICustomElementController;

/**
 * A callback that is invoked on each controller in the component tree.
 *
 * Return `true` to stop traversal.
 */
export type ControllerVisitor = (controller: IHydratedController) => void | true;

/**
 * The base type for all controller types.
 *
 * Every controller, regardless of their type and state, will have at least the properties/methods in this interface.
 */
export interface IController<C extends IViewModel = IViewModel> extends IDisposable {
  /** @internal */readonly id: number;
  readonly platform: IPlatform;
  readonly root: IAppRoot | null;
  readonly flags: LifecycleFlags;
  readonly lifecycle: ILifecycle;
  readonly hooks: HooksDefinition;
  readonly vmKind: ViewModelKind;
  readonly definition: CustomElementDefinition | CustomAttributeDefinition | undefined;
}

/**
 * The base type for `ICustomAttributeController` and `ICustomElementController`.
 *
 * Both of those types have the `viewModel` and `bindingContext` properties which represent the user instance containing the bound properties and hooks for this component.
 */
export interface IComponentController<C extends IViewModel = IViewModel> extends IController<C> {
  readonly vmKind: ViewModelKind.customAttribute | ViewModelKind.customElement;
  readonly definition: CustomElementDefinition | CustomAttributeDefinition;

  /**
   * The user instance containing the bound properties. This is always an instance of a class, which may either be user-defined, or generated by a view locator.
   *
   * This is the raw instance; never a proxy.
   */
  readonly viewModel: C;
  /**
   * In Proxy observation mode, this will be a proxy that wraps the view model, otherwise it is the exactly the same reference to the same object.
   *
   * This property is / should be used for creating the `Scope` and invoking lifecycle hooks.
   */
  readonly bindingContext: C & IIndexable;

}

/**
 * The base type for `ISyntheticView` and `ICustomElementController`.
 *
 * Both of those types can:
 * - Have `bindings` and `children` which are populated during composing (hence, 'Composable').
 * - Have physical DOM nodes that can be mounted.
 */
export interface IComposableController<C extends IViewModel = IViewModel> extends IController<C> {
  readonly vmKind: ViewModelKind.customElement | ViewModelKind.synthetic;
  readonly definition: CustomElementDefinition | undefined;

  readonly bindings: readonly IBinding[] | undefined;
  readonly children: readonly IHydratedController[] | undefined;

  getTargetAccessor(propertyName: string): IBindingTargetAccessor | undefined;

  addBinding(binding: IBinding): void;
  addController(controller: IController): void;
}

export const enum State {
  none                     = 0b00_00_00,
  activating               = 0b00_00_01,
  activated                = 0b00_00_10,
  deactivating             = 0b00_01_00,
  deactivated              = 0b00_10_00,
  released                 = 0b01_00_00,
  disposed                 = 0b10_00_00,
}

export function stringifyState(state: State): string {
  const names: string[] = [];

  if ((state & State.activating) === State.activating) { names.push('activating'); }
  if ((state & State.activated) === State.activated) { names.push('activated'); }
  if ((state & State.deactivating) === State.deactivating) { names.push('deactivating'); }
  if ((state & State.deactivated) === State.deactivated) { names.push('deactivated'); }
  if ((state & State.released) === State.released) { names.push('released'); }
  if ((state & State.disposed) === State.disposed) { names.push('disposed'); }

  return names.length === 0 ? 'none' : names.join('|');
}

interface IHydratedControllerProperties {
  readonly state: State;
  readonly isActive: boolean;

  /** @internal */head: IHydratedController | null;
  /** @internal */tail: IHydratedController | null;
  /** @internal */next: IHydratedController | null;

  /**
   * Return `true` to stop traversal.
   */
  accept(visitor: ControllerVisitor): void | true;
}

/**
 * The controller for a synthetic view, that is, a controller created by an `IViewFactory`.
 *
 * A synthetic view, typically created when composing a template controller (`if`, `repeat`, etc), is a composable component with mountable DOM nodes that has no user view model.
 *
 * It has either its own synthetic binding context or is locked to some externally sourced scope (in the case of `au-compose`)
 */
export interface ISyntheticView extends IComposableController, IHydratedControllerProperties {
  parent: IHydratedComponentController | null;

  readonly vmKind: ViewModelKind.synthetic;
  readonly definition: undefined;
  readonly viewModel: undefined;
  readonly bindingContext: undefined;
  /**
   * The scope that belongs to this view. This property will always be defined when the `state` property of this view indicates that the view is currently bound.
   *
   * The `scope` may be set during `activate()` and unset during `deactivate()`, or it may be statically set during composing with `lockScope()`.
   */
  readonly scope: Scope;
  hostScope: Scope | null;
  /**
   * The compiled render context used for composing this view. Compilation was done by the `IViewFactory` prior to creating this view.
   */
  readonly context: ICompiledRenderContext;
  readonly isStrictBinding: boolean;
  /**
   * The physical DOM nodes that will be appended during the `mount()` operation.
   */
  readonly nodes: INodeSequence;
  /**
   * The DOM node that this view will be mounted to.
   */
  readonly location: IRenderLocation | undefined;

  activate(
    initiator: IHydratedController,
    parent: IHydratedComponentController,
    flags: LifecycleFlags,
    scope: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController,
    parent: IHydratedComponentController,
    flags: LifecycleFlags,
  ): void | Promise<void>;

  /**
   * Lock this view's scope to the provided `Scope`. The scope, which is normally set during `activate()`, will then not change anymore.
   *
   * This is used by `au-compose` to set the binding context of a view to a particular component instance.
   *
   * @param scope - The scope to lock this view to.
   */
  lockScope(scope: Scope): void;
  /**
   * Set the DOM node that this view will be mounted to, as well as the mounting mechanism that will be used.
   *
   * @param location - The `IRenderLocation` that this view will be mounted to.
   * @param mountStrategy - The method that will be used during mounting.
   */
  setLocation(location: IRenderLocation, mountStrategy: MountStrategy): void;
  /**
   * Mark this view as not-in-use, so that it can either be disposed or returned to cache after finishing the deactivate lifecycle.
   *
   * If this view is cached and later retrieved from the cache, it will be marked as in-use again before starting the activate lifecycle, so this method must be called each time.
   *
   * If this method is *not* called before `deactivate()`, this view will neither be cached nor disposed.
   */
  release(): void;
}

export interface ICustomAttributeController<C extends ICustomAttributeViewModel = ICustomAttributeViewModel> extends IComponentController<C>, IHydratedControllerProperties {
  parent: IHydratedParentController | null;

  readonly vmKind: ViewModelKind.customAttribute;
  readonly definition: CustomAttributeDefinition;
  /**
   * @inheritdoc
   */
  readonly viewModel: C;
  /**
   * @inheritdoc
   */
  readonly bindingContext: C & IIndexable;
  /**
   * The scope that belongs to this custom attribute. This property will always be defined when the `state` property of this view indicates that the view is currently bound.
   *
   * The `scope` will be set during `activate()` and unset during `deactivate()`.
   *
   * The scope's `bindingContext` will be the same instance as this controller's `bindingContext` property.
   */
  readonly scope: Scope;
  hostScope: Scope | null;
  readonly children: undefined;
  readonly bindings: undefined;

  activate(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags,
    scope: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController,
    parent: IHydratedParentController,
    flags: LifecycleFlags,
  ): void | Promise<void>;
}

/**
 * A representation of `IController` specific to a custom element whose `create` hook is about to be invoked (if present).
 *
 * It is not yet hydrated (hence 'dry') with any render-specific information.
 */
export interface IDryCustomElementController<C extends IViewModel = IViewModel> extends IComponentController<C>, IComposableController<C> {
  readonly vmKind: ViewModelKind.customElement;
  readonly definition: CustomElementDefinition;
  /**
   * The scope that belongs to this custom element. This property is set immediately after the controller is created and is always guaranteed to be available.
   *
   * It may be overwritten by end user during the `create()` hook.
   *
   * By default, the scope's `bindingContext` will be the same instance as this controller's `bindingContext` property.
   */
  scope: Scope;
  hostScope: Scope | null;
  /**
   * The physical DOM node that this controller's `nodes` will be mounted to.
   */
  host: Node;
}

/**
 * A representation of `IController` specific to a custom element whose `hydrating` hook is about to be invoked (if present).
 *
 * It has the same properties as `IDryCustomElementController`, as well as a render context (hence 'contextual').
 */
export interface IContextualCustomElementController<C extends IViewModel = IViewModel> extends IDryCustomElementController<C> {
  /**
   * The non-compiled render context used for compiling this component's `CustomElementDefinition`.
   */
  readonly context: IRenderContext;
}

/**
 * A representation of `IController` specific to a custom element whose `hydrated` hook is about to be invoked (if present).
 *
 * It has the same properties as `IContextualCustomElementController`, except the context is now compiled (hence 'compiled'), as well as the nodes, and projector.
 */
export interface ICompiledCustomElementController<C extends IViewModel = IViewModel> extends IContextualCustomElementController<C>, IHydratedControllerProperties {
  /**
   * The compiled render context used for hydrating this controller.
   */
  readonly context: ICompiledRenderContext;
  readonly isStrictBinding: boolean;
  /**
   * The projector used for mounting the `nodes` of this controller. Typically this will be one of:
   * - `HostProjector` (the host is a normal DOM node)
   * - `ShadowDOMProjector` (the host is a shadow root)
   * - `ContainerlessProjector` (the host is a comment node)
   */
  readonly projector: ElementProjector;
  /**
   * The physical DOM nodes that will be appended during the `mount()` operation.
   */
  readonly nodes: INodeSequence;
}

/**
 * A fully hydrated custom element controller.
 */
export interface ICustomElementController<C extends ICustomElementViewModel = ICustomElementViewModel> extends ICompiledCustomElementController<C> {
  parent: IHydratedParentController | null;

  /**
   * @inheritdoc
   */
  readonly viewModel: C;
  /**
   * @inheritdoc
   */
  readonly bindingContext: C & IIndexable;

  activate(
    initiator: IHydratedController,
    parent: IHydratedParentController | null,
    flags: LifecycleFlags,
    scope?: Scope,
    hostScope?: Scope | null,
  ): void | Promise<void>;
  deactivate(
    initiator: IHydratedController,
    parent: IHydratedParentController | null,
    flags: LifecycleFlags,
  ): void | Promise<void>;
}

export const IController = DI.createInterface<IController>('IController').noDefault();

/**
 * Describing characteristics of a mounting operation a controller will perform
 */
export const enum MountStrategy {
  insertBefore = 1,
  append = 2,
}

export interface IActivationHooks<TParent> {
  binding?(
    initiator: IHydratedController,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  bound?(
    initiator: IHydratedController,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  attaching?(
    initiator: IHydratedController,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  attached?(
    initiator: IHydratedController,
    flags: LifecycleFlags,
  ): void | Promise<void>;

  detaching?(
    initiator: IHydratedController,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;
  beforeUnbind?(
    initiator: IHydratedController,
    parent: TParent,
    flags: LifecycleFlags,
  ): void | Promise<void>;

  dispose?(): void;
  /**
   * If this component controls the instantiation and lifecycles of one or more controllers,
   * implement this hook to enable component tree traversal for plugins that use it (such as the router).
   *
   * Return `true` to stop traversal.
   */
  accept?(visitor: ControllerVisitor): void | true;
}

export interface ICompileHooks {
  define?(
    controller: IDryCustomElementController<this>,
    parentContainer: IContainer,
    definition: CustomElementDefinition,
  ): PartialCustomElementDefinition | void;
  hydrating?(
    controller: IContextualCustomElementController<this>,
  ): void;
  hydrated?(
    controller: ICompiledCustomElementController<this>,
  ): void;
  created?(
    controller: ICustomElementController<this>,
  ): void;
}

/**
 * Defines optional lifecycle hooks that will be called only when they are implemented.
 */
export interface IViewModel {
  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor: Function;
  readonly $controller?: IController<this>;
}

export interface ICustomElementViewModel extends IViewModel, IActivationHooks<IHydratedParentController | null>, ICompileHooks {
  readonly $controller?: ICustomElementController<this>;
}

export interface ICustomAttributeViewModel extends IViewModel, IActivationHooks<IHydratedParentController> {
  readonly $controller?: ICustomAttributeController<this>;
  link?(
    flags: LifecycleFlags,
    parentContext: ICompiledRenderContext,
    controller: IComposableController,
    childController: ICustomAttributeController,
    target: INode,
    instruction: Instruction,
  ): void;
}

export interface IHydratedCustomElementViewModel extends ICustomElementViewModel {
  readonly $controller: ICustomElementController<this>;
}

export interface IHydratedCustomAttributeViewModel extends ICustomAttributeViewModel {
  readonly $controller: ICustomAttributeController<this>;
}
