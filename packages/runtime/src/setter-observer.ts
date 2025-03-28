import { ICoercionConfiguration, IObserver, InterceptorFunc, atObserver } from './interfaces';
import { subscriberCollection } from './subscriber-collection';
import { rtDef, rtObjectAssign } from './utilities';

import { areEqual, type IIndexable } from '@aurelia/kernel';
import type {
  AccessorType,
  ISubscriber,
  ISubscriberCollection,
} from './interfaces';

export interface SetterObserver extends ISubscriberCollection {}

/**
 * Observer for the mutation of object property value employing getter-setter strategy.
 * This is used for observing object properties that has no decorator.
 */
export class SetterObserver implements IObserver, ISubscriberCollection {
  static {
    subscriberCollection(SetterObserver, null!);
  }

  // todo(bigopon): tweak the flag based on typeof obj (array/set/map/iterator/proxy etc...)
  public type: AccessorType = atObserver;

  /** @internal */
  private _value: unknown = void 0;
  /** @internal */
  private _observing: boolean = false;

  /** @internal */
  private _callback?: (newValue: unknown, oldValue: unknown) => void = void 0;
  /** @internal */
  private _coercer?: InterceptorFunc = void 0;
  /** @internal */
  private _coercionConfig?: ICoercionConfiguration = void 0;

  /** @internal */ private readonly _obj: IIndexable;
  /** @internal */ private readonly _key: PropertyKey;

  public constructor(
    obj: IIndexable,
    key: PropertyKey,
  ) {
    this._obj = obj;
    this._key = key;
  }

  public getValue(): unknown {
    return this._value;
  }

  public setValue(newValue: unknown): void {
    if (this._coercer !== void 0) {
      newValue = this._coercer.call(void 0, newValue, this._coercionConfig);
    }
    const oldValue = this._value;
    if (this._observing) {
      if (areEqual(newValue, this._value)) {
        return;
      }
      this._value = newValue;
      this.subs.notifyDirty();
      this.subs.notify(newValue, oldValue);

      // only call the callback if _value is the same with newValue
      // which means if during subs.notify() the value of this observer is changed
      // then it's the job of that setValue() to call the callback
      if (areEqual(newValue, this._value)) {
        this._callback?.(newValue, oldValue);
      }
    } else {
      // If subscribe() has been called, the target property descriptor is replaced by these getter/setter methods,
      // so calling obj[propertyKey] will actually return this.value.
      // However, if subscribe() was not yet called (indicated by !this.observing), the target descriptor
      // is unmodified and we need to explicitly set the property value.
      // This will happen in one-time, to-view and two-way bindings during bind, meaning that the bind will not actually update the target value.
      // This wasn't visible in vCurrent due to connect-queue always doing a delayed update, so in many cases it didn't matter whether bind updated the target or not.
      this._value = this._obj[this._key] = newValue;
      this._callback?.(newValue, oldValue);
    }
  }

  public useCallback(callback: (newValue: unknown, oldValue: unknown) => void): boolean {
    this._callback = callback;
    this.start();
    return true;
  }

  public useCoercer(coercer: InterceptorFunc, coercionConfig?: ICoercionConfiguration | undefined): boolean {
    this._coercer = coercer;
    this._coercionConfig = coercionConfig;
    this.start();
    return true;
  }

  public subscribe(subscriber: ISubscriber): void {
    if (this._observing === false) {
      this.start();
    }

    this.subs.add(subscriber);
  }

  public start(): this {
    if (this._observing === false) {
      this._observing = true;
      this._value = this._obj[this._key];
      rtDef(
        this._obj,
        this._key,
        {
          enumerable: true,
          configurable: true,
          get: rtObjectAssign((/* Setter Observer */) => this.getValue(), { getObserver: () => this }),
          set: (/* Setter Observer */value) => {
            this.setValue(value);
          },
        },
      );
    }
    return this;
  }

  public stop(): this {
    if (this._observing) {
      rtDef(this._obj, this._key, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: this._value,
      });
      this._observing = false;
      // todo(bigopon/fred): add .removeAllSubscribers()
    }
    return this;
  }
}
