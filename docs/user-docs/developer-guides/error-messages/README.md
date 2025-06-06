# Errors

## Error message format

Encountered an error and looking for answers? You've come to the right place.

{% hint style="danger" %}
This section is a work in progress and not yet complete. If you would like to help us document errors in Aurelia, we welcome all contributions.
{% endhint %}

Coded error in Aurelia comes with format: `AURxxxx:yyyy` where:

* `AUR` is the prefix to indicate it's an error from Aurelia
* `xxxx` is the code
* `:` is the delimiter between the prefix, code and the dynamic information associated with the error
* `yyyy` is the extra information, or parameters related to the error

### Enabling development debug information enhancement

When using the production build of the core Aurelia packages, you'll get some error message that looks like this `AUR0015:abcxyz`, which may not help much during development.
If you wish to have better information with regards to an issue you are facing, you can use the development build. To configure your bundler/dev server to pick development build:

#### Vite

Our `@aurelia/vite-plugin` will automatically pick the development build when `process.env.NODE_ENV` is not `production`. It can also be overriden using `useDev` property option, like the following example:
```ts
import { defineConfig } from 'vite';
import aurelia from '@aurelia/plugin-vite';

export default defineConfig({
    ...,
    plugins: [
        aurelia({ useDev: true })
    ]
})
```

#### Webpack

Add alias to the `resolve.alias` in your webpack config in `webpack.config.js`, like the scaffolding template at https://github.com/aurelia/new/blob/06f06862bab5f7b13107237a69cf59de1385d126/webpack/webpack.config.js#L117-L123


#### Others bundlers/dev server

The dist folder of an Aurelia core package looks like this:
```
dist
  |
  + -> cjs
  |     |
  |     + -> index.cjs
  |     + -> index.dev.cjs
  |
  + -> esm
        |
        + -> index.mjs
        + -> index.dev.mjs
```
Whenever there's a request to retrieve `dist/esm/index.mjs`, you can redirect it to `dist/esm/index.dev.mjs`.

## Error list

The section below will list errors by their prefix, and code and give a corresponding explanation, and a way to fix them.

### @aurelia/kernel Errors (from 0001 to 0023)

Aurelia Kernel errors can be found [here](0001-to-0023/).

### @aurelia/template-compiler Errors (From 0088 to 0723)

Template Compiler errors can be found [here](0088-to-0723/).

### @aurelia/runtime-html Errors (From 750-800)

Runtime HTML errors can be found [here](runtime-html/).

### Templating Errors (From 750-800)

| Error Code | Description                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUR0750    | This happens when there is a binding that looks like this `view.ref="..."`. This likely comes from a v1 template migration.                                                  |
| AUR0751    | This happens when there is a `ref` binding in the template that does not have matching target. Most likely a custom attribute reference                                      |
| AUR0752    | This happens when a controller renders a custom element instruction that it doesn't have a registration. Normally happens in hand-crafted definition                         |
| AUR0753    | This happens when a controller renders a custom attribute instruction that it doesn't have a registration. Normally happens in hand-crafted definition                       |
| AUR0754    | This happens when a controller renders a template controller instruction that it doesn't have a registration. Normally happens in hand-crafted definition                    |
| AUR0755    | This happens when a view factory provider tries to resolve but does not have a view factory associated                                                                       |
| AUR0756    | This happens when a view factory provider tries to resolve but the view factory associated does not have a valid name                                                        |
| AUR0757    | This happens when `IRendering.render` is called with different number of targets and instructions                                                                            |
| AUR0758    | This happens when `BindingCommand.getDefinition` is called on a class/object without any binding command metadata associated                                                 |
| AUR0759    | This happens when `CustomAttribute.getDefinition` is called on a class/object without any custom attribute metadata associated                                               |
| AUR0760    | This happens when `CustomElement.getDefinition` is called on a class/object without any custom element metadata associated                                                   |
| AUR0761    | This happens when `CustomElementDefinition.create` is called with a string as first parameter                                                                                |
| AUR0762    | This happens when `CustomElement.for` is called on an element that does not have any custom element with a given name, without searching in ancestor elements                |
| AUR0763    | This happens when `CustomElement.for` is called and Aurelia isn't able to find any custom element with the given name in the given element, or its ancestors                 |
| AUR0764    | This happens when `CustomElement.for` is called on an element with a given name, and Aurelia is unable to find any custom element in the given the element, or its ancestors |
| AUR0765    | This happens when `CustomElement.for` is called on an element without a given name, and Aurelia is unable to find any custom element in the given element, or its ancestors  |
| AUR0766    | This happens when `@processContent` is called with a string as its first parameter, and Aurelia couldn't find the method on the decorated class                              |
| AUR0767    | This happens when `root` property on an `Aurelia` instance is access before at least one application has been started with this `Aurelia` instance                           |
| AUR0768    | This happens when a new `Aurelia` is created with a predefined container that already has `IAurelia` registration in it, or its ancestors                                    |
| AUR0769    | This happens when an `Aurelia` application is started with a document fragment before it's adopted by a document                                                             |
| AUR0770    | This happens when `Aurelia.prototype.start` is called with a `null`/`undefined` value as the first parameter                                                                 |
| AUR0771    | This happens when `Aurelia.prototype.dispose` is called before the instance is stopped                                                                                       |
| AUR0772    | This happens when the `@watch` decorator is used without a valid first parameter                                                                                             |
| AUR0773    | This happens when the `@watch` decorator is used and Aurelia is not able to resolve the first parameter to a function                                                        |
| AUR0774    | This happens when the `@watch` decorator is used on a class property instead of a method                                                                                     |

### HTML observation errors

| Error Code | Description                                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUR0651    | This happens when the binding created `.attr` binding command is forced into two way mode against any attribute other than `class`/`style`                                      |
| AUR0652    | This happens when the default `NodeObserverLocator.getObserver` is called with an object and property combo that it doesn't know how to observe, and dirty checking is disabled |
| AUR0653    | This happens when `NodeObserverLocator` property->observation events mapping is getting overridden                                                                              |
| AUR0654    | This happens when a `<select>` element is specified `multiple`, but the binding value is not an array                                                                           |

### Controller errors

| Error Code | Description                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| AUR0500    | This happens when `Controller.getCachedOrThrow` throws                                                   |
| AUR0501    | This happens when a custom element is specified `containerless` and has `<slot>` element in its template |
| AUR0502    | This happens when a disposed controller is being activated                                               |
| AUR0503    | This happens when the internal state of a controller is corrputed during activation                      |
| AUR0504    | This happens when a synthetic view is activated without a proper scope                                   |
| AUR0505    | This happens when the internal state of a controller is coruppted during deactivation                    |
| AUR0506    | This happens when Aurelia fails to resolve a function from the first parameter of a `@watch` decorator   |

### Default resources errors

| Error Code | Description                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| AUR0801    | This happens when `& self` binding behavior is used on non-event binding                                                      |
| AUR0802    | This happens when `& updateTrigger` binding behavior is used without any arguments                                            |
| AUR0803    | This happens when `& updateTrigger` binding behavior is used on binding without view -> view model observation                |
| AUR0804    | This happens when `& updateTrigger` binding behavior is used on binding that does not target a DOM element                    |
| AUR0805    | This happens when `<au-compose>` `scopeBehavior` property is assigned a value that is not either `auto` or `scoped`           |
| AUR0806    | This happens when `<au-compose>` `component` binding is used with a custom element with `containerless = true`                |
| AUR0807    | This happens when there's a corrupted internal state of `<au-compose>` and activation is called twice                         |
| AUR0808    | This happens when there's a corrupted internal state of `<au-compose>` and deactivation is called twice                       |
| AUR0809    | This happens when `<au-render>` `component` binding is given a string value, and there's no custom element with matching name |
| AUR0810    | This happens when `else` attribute does not follow an `if` attribute                                                          |
| AUR0811    | This happens when `portal` attribute is a given an empty string as CSS selector for`target`, and `strict` mode is on          |
| AUR0812    | This happens when `portal` attribute couldn't find the target element to portal to, and `strict` mode is on                   |
| AUR0813    | This happens when `then`/`catch`/`pending` attributes is used outside of a `promise` attribute                                |
| AUR0814    | This happens when the internal of the `repeat` attribute get into a race condition and is corrupted                           |
| AUR0815    | This happens when `case`/`default-case` attributes is used outside of a `switch` attribute                                    |
| AUR0816    | This happens when there are multiple `default-case` attributes inside a `switch` attribute                                    |
| AUR0817    | This happens when `& signal` binding behavior is used on binding that does not have `handleChange` method                     |
| AUR0818    | This happens when `& signal` binding behavior is used without a valid name (non empty)                                        |

### Plugin errors

Dialog plugin errors can be found [here](0901-to-0908/).

## Runtime module

### AST errors (from 101 to 150)

| Error Code | Description                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| AUR0101    | This happens when Aurelia couldn't find a binding behavior specified in an expression                                   |
| AUR0102    | This happens when there are two binding behaviors with the same name in an expression                                   |
| AUR0103    | This happens when a value converter for a given name couldn't be found during the evaluation of an expression           |
| AUR0104    | This happens when a value converter for a given name couldn't be found during the assignment of an expression           |
| AUR0105    | This happens when the special `$host` contextual property is accessed but no thing is found in the scope tree           |
| AUR0106    | This happens when an expression looks like this `$host = ...`, as `$host` is a readonly property                        |
| AUR0107    | This happens when a call expression is evaluated but the object evaluated by the expression isn't a function            |
| AUR0108    | This happens when a binary expression is evaluated with an unknown operator                                             |
| AUR0109    | This happens when an unary expression is evaluated with an unknown operator                                             |
| AUR0110    | This happens when a tagged template (function call) is but the function specified isn't a function                      |
| AUR0111    | This happens when a function call AST is evaluated but no function is found                                             |
| AUR0112    | This happens when a non-object or non-array value is assigned for destructured declaration for a `repeat.for` statement |
| AUR0113    | This happens when an increment operator is used outside of an event handler                                             |

### Parser errors (from 151-200)

| Error Code | Description                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| AUR0151    | An expression has an invalid character at the start                                             |
| AUR0152    | An expression has `..` or `...`                                                                 |
| AUR0153    | The parser encounters an unexpected identifier in an expression                                 |
| AUR0154    | The parser encounters an invalid `AccessMember` expression                                      |
| AUR0155    | The parers encounters an unexpected end in an expression                                        |
| AUR0156    | The parser encounters an unconsumable token in an expression                                    |
| AUR0158    | The expression has an invalid assignment                                                        |
| AUR0159    | An expression has no valid identifier after the value converter \` \| \` symbol                 |
| AUR0160    | An expression has no valid identifier after the binding behavior `&` symbol                     |
| AUR0161    | The parser encounters an invalid `of` keyword                                                   |
| AUR0162    | The parser encounters an unconsumed token                                                       |
| AUR0163    | The parser encounters an invalid binding identifier at left hand side of an `of` keyword        |
| AUR0164    | The parser encounters a literal object with a property declaration that it doesn't understand   |
| AUR0165    | An expression has an opening string quote `'` or `"`, but no matching ending quote              |
| AUR0166    | An expression has an opening template string quote \`\`\`, but has no matching end              |
| AUR0167    | The parser encounters an unexpected token                                                       |
| AUR0168    | The parser encounters an unexpected character                                                   |
| AUR0169    | The parser encounters an unexpected character while parsing destructuring assignment expression |

### Others (from 200-300)

| Error Code | Description                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| AUR0201    | `BindingBehavior.getDefinition` is called on a class/object without any binding behavior metadata associated |
| AUR0202    | `ValueConverter.getDefinition` is called on a class/object without any value converter metadata associated   |
| AUR0203    | `BindingContext.get` is called with `null`/`undefined` as the first parameter                                |
| AUR0204    | `Scope.fromOverride` is called with `null`/`undefined` as the first parameter                                |
| AUR0205    | `Scope.fromParent` is called with `null`/`undefined` as the first parameter                                  |
| AUR0206    | `ConnectableSwitcher.enter` is called with `null`/`undefined` as the first parameter                         |
| AUR0207    | `ConnectableSwitcher.enter` is called with the currently active connectable                                  |
| AUR0208    | `ConnectableSwitcher.exit` is called with `null`/`undefined` as the first parameter                          |
| AUR0209    | `ConnectableSwitcher.exit` is called with an inactive connectable                                            |
| AUR0210    | `getCollectionObserver` is called with an not-supported collection type                                      |
| AUR0211    | a binding subscried to an observer, but does not implement method `handleChange`                             |
| AUR0212    | a binding subscribed to a collection observer, but does not implement method `handleCollectionChange`        |
| AUR0220    | a `Set`/`Map` size observer `.setValue` method is called                                                     |
| AUR0221    | the `setValue` method on a computed property without a setter                                                |
| AUR0222    | Aurelia doesn't know how to observe a property on an object, and dirty checking is disabled                  |
| AUR0224    | Encounters an invalid usage of `@observable`                                                                 |
| AUR0225    | An effect is attempted to run again, after it has stopped                                                    |
| AUR0226    | An effect has reach its limit of recursive update                                                            |

## Router-Lite

Router-Lite logs various events.
Majority of those events are traces.
The non-warn, non-error events are not logged in non-dev build, and are only available for troubleshooting in the dev-build.
This section only lists the error codes.

| Error Code | Description                                                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUR3155    | The route context cannot be resolved from the given DOM node. This happens if the given node is not a custom element or not a child-node of a custom element.                                                          |
| AUR3166    | This happens when an attempt to eagerly (without involving the route recognizer) recognize a routing instruction failed. If you are getting this error, please report it.                                              |
| AUR3167    | This happens when the application root is not yet set, but the router is trying to set a routing root. If you are getting this error, please report it.                                                                |
| AUR3168    | This happens when a route context already exist for the application root; for example if it attempted to set the routing root more than once.                                                                          |
| AUR3169    | This happens when no controller exists for the application root.  If you are getting this error, please report it.                                                                                                     |
| AUR3170    | A route context cannot be resolved for the given input.                                                                                                                                                                |
| AUR3171    | This happens when the route node of the route context is not set. If you are getting this error, please report it.                                                                                                     |
| AUR3172    | This happens when the viewport agent of the route context is not set. If you are getting this error, please report it.                                                                                                 |
| AUR3173    | This happens the `import()` function is used as `component`, while configuring a route, but no `path` has been specified. This is not supported.                                                                       |
| AUR3174    | No viewport agent can be resolved for a given request.                                                                                                                                                                 |
| AUR3175    | This happens the `import()` function is used as `component`, while configuring a route, but the module does not export any aurelia custom element.                                                                     |
| AUR3270    | A routing transition failed.                                                                                                                                                                                           |
| AUR3271    | The routing context of the router is not set. If you are getting this error, please report it.                                                                                                                         |
| AUR3350    | Activation of component from a viewport failed due to incorrect state. If you are getting this error, please report it.                                                                                                |
| AUR3351    | Deactivation of component from a viewport failed due to incorrect state. If you are getting this error, please report it.                                                                                              |
| AUR3352    | The state of the viewport agent is not as expected. If you are getting this error, please report it.                                                                                                                   |
| AUR3353    | The transition was either erred or cancelled via one of the `can*` hooks, but the router attempts to continue with the current instruction instead of cancelling it. If you are getting this error, please report it. |
| AUR3400    | A navigation instruction cannot be created.                                                                                                                                                                            |
| AUR3401    | Neither the given routing instruction can be recognized, nor a `fallback` is configured.                                                                                                                               |
| AUR3401    | The redirect route cannot be recognized.                                                                                                                                                                               |
| AUR3403    | `toUrlComponent` is invoked on a navigation instruction with incompatible type. This happens when the type of the instruction is a promise or a view-model.                                                            |
| AUR3450    | Thrown by the navigation model when the endpoint for a path is not found.                                                                                                                                              |
| AUR3500    | Thrown by the route expression parser upon encountering an unexpected segment.                                                                                                                                         |
| AUR3501    | Thrown by the route expression parser when all of the given input string cannot be consumed.                                                                                                                           |
| AUR3502    | Thrown if an unexpected segment is encountered during migrating parameters for redirect route.                                                                                                                         |
| AUR3550    | Thrown when a re-attempt is made to call the `getRouteConfig` hook for the same component. If you are getting this error, please report it.                                                                            |
| AUR3551    | A custom element definition could not be resolved from the given string name, as no route context was provided. If you are getting this error, please report it.                                                       |
| AUR3552    | A custom element definition could not be resolved from the given string name, as it is potentially not a custom element.                                                                                               |
| AUR3553    | A custom element definition could not be resolved from the`import()` function, as no route context was provided to resolve it.                                                                                         |
| AUR3554    | The validation of a route config failed due to unexpected type of property.                                                                                                                                            |
| AUR3555    | The validation of a route config failed, as the config is either `undefined` or `null`.                                                                                                                                |
| AUR3556    | The validation of a route config failed due to unexpected property.                                                                                                                                                    |
| AUR3556    | The validation of a redirect route config failed due to unexpected property.                                                                                                                                           |
