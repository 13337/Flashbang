/*
 * Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
///<reference path='references.ts' />

import Namespace = Shumway.AVM2.ABC.Namespace;

interface Object {
  runtimeId: number;
  resolutionMap: Shumway.Map<Shumway.Map<string>>;
  bindings: Shumway.AVM2.Runtime.Bindings;


  getNamespaceResolutionMap: any;
  resolveMultinameProperty: (namespaces: Namespace [], name: any, flags: number) => any;
  asGetProperty: (namespaces: Namespace [], name: any, flags: number) => any;
  asGetNumericProperty: (name: number) => any;
  asGetPublicProperty: (name: any) => any;
  asGetResolvedStringProperty: (name: string) => any;
  asSetProperty: (namespaces: Namespace [], name: any, flags: number, value: any) => void;
  asSetNumericProperty: (name: number, value: any) => void;
  asSetPublicProperty: (name: any, value: any) => void;
  asDefineProperty: (namespaces: Namespace [], name: any, flags: number, descriptor: PropertyDescriptor) => void;
  asDefinePublicProperty: (name: any, descriptor: PropertyDescriptor) => void;
  asCallProperty: (namespaces: Namespace [], name: any, flags: number, isLex: boolean, args: any []) => any;
  asCallSuper: (scope, namespaces: Namespace [], name: any, flags: number, args: any []) => any;
  asGetSuper: (scope, namespaces: Namespace [], name: any, flags: number) => any;
  asSetSuper: (scope, namespaces: Namespace [], name: any, flags: number, value: any) => void;
  asCallPublicProperty: (name: any, args: any []) => void;
  asCallResolvedStringProperty: (resolved: any, isLex: boolean, args: any []) => any;
  asConstructProperty: (namespaces: Namespace [], name: any, flags: number, args: any []) => any;
  asHasProperty: (namespaces: Namespace [], name: any, flags: number, nonProxy?: boolean) => boolean;
  asHasTraitProperty: (namespaces: Namespace [], name: any, flags: number) => boolean;
  asDeleteProperty: (namespaces: Namespace [], name: any, flags: number) => boolean;
  asNextName: (index: number) => any;
  asNextValue: (index: number) => any;
  asNextNameIndex: (index: number) => number;
  asGetEnumerableKeys: () => any [];
  class: any;
  hasProperty: (namespaces: Namespace [], name: any, flags: number) => boolean; // TODO: What's this?

  asEnumerableKeys: any [];
  asLazyInitializer: Shumway.AVM2.Runtime.LazyInitializer;
  asBindings: any [];
  asLength: number;
  asSlots: Shumway.AVM2.Runtime.SlotInfoMap;
  asIsNativePrototype: boolean;
  asOpenMethods: Shumway.Map<Function>;
  asIsClass: boolean;
  asIsProxy: boolean;
  asCallProxy: any;
}

module Shumway.AVM2.Runtime {

  declare var shumwayOptions: OptionSet;

  declare var isProxy;
  declare var isProxyObject;

  declare var XML;
  declare var XMLList;
  declare var isXMLType;

  import Option = Shumway.Options.Option;
  import OptionSet = Shumway.Options.OptionSet;

  var avm2Options = shumwayOptions.register(new OptionSet("AVM2"));
  var runtimeOptions = avm2Options.register(new OptionSet("Runtime"));
  export var traceExecution = runtimeOptions.register(new Option("tx", "traceExecution", "number", 0, "trace script execution", { choices: { "off":0, "normal":2, "verbose":3 } }));
  export var traceCallExecution = runtimeOptions.register(new Option("txc", "traceCallExecution", "number", 0, "trace call execution", { choices: { "off":0, "normal":1, "verbose":2 } }));
  var traceFunctions = runtimeOptions.register(new Option("t", "traceFunctions", "number", 0, "trace functions", { choices: { "off":0, "compiled":1, "compiled & abc":2 } }));
  export var traceClasses = runtimeOptions.register(new Option("tc", "traceClasses", "boolean", false, "trace class creation"));
  export var traceDomain = runtimeOptions.register(new Option("td", "traceDomain", "boolean", false, "trace domain property access"));

  var functionBreak = new Option("fb", "functionBreak", "number", -1, "Inserts a debugBreak at function index #");
  var compileOnly = new Option("co", "compileOnly", "number", -1, "Compiles only function number");
  var compileUntil = new Option("cu", "compileUntil", "number", -1, "Compiles only until a function number");

  export var enableVerifier = runtimeOptions.register(new Option("verifier", "verifier", "boolean", false, "Enable verifier."));

  export var globalMultinameAnalysis = runtimeOptions.register(new Option("ga", "globalMultinameAnalysis", "boolean", false, "Global multiname analysis."));
  export var codeCaching = runtimeOptions.register(new Option("cc", "codeCaching", "boolean", false, "Enable code caching."));

  var compilerEnableExceptions = runtimeOptions.register(new Option("cex", "exceptions", "boolean", false, "Compile functions with catch blocks."));
  var compilerMaximumMethodSize = runtimeOptions.register(new Option("cmms", "maximumMethodSize", "number", 4 * 1024, "Compiler maximum method size."));

  declare var Analysis;
  declare var getNative;

  /**
   * Seals const traits. Technically we need to throw an exception if they are ever modified after
   * the static or instance constructor executes, but we can safely ignore this incompatibility.
   */
  export var sealConstTraits = false;

  /**
   * Match AS3 add semantics related to toString/valueOf when adding values.
   */
  export var useAsAdd = true;

  /**
   * Allow overwriting of the native toString / valueOf with AS3 versions.
   */
  var useSurrogates = true;

  var callCounter = new Shumway.Metrics.Counter(true);

  declare var Counter: Shumway.Metrics.Counter;
  declare var Compiler;
  declare var installProxyClassWrapper;

  import Map = Shumway.Map;
  import Multiname = Shumway.AVM2.ABC.Multiname;
  import Namespace = Shumway.AVM2.ABC.Namespace;
  import MethodInfo = Shumway.AVM2.ABC.MethodInfo;
  import ClassInfo = Shumway.AVM2.ABC.ClassInfo;
  import InstanceInfo = Shumway.AVM2.ABC.InstanceInfo;
  import ScriptInfo = Shumway.AVM2.ABC.ScriptInfo;
  import SORT = Shumway.AVM2.ABC.SORT;

  import Trait = Shumway.AVM2.ABC.Trait;
  import IndentingWriter = Shumway.IndentingWriter;
  import hasOwnProperty = Shumway.ObjectUtilities.hasOwnProperty;
  import createMap = Shumway.ObjectUtilities.createMap;
  import cloneObject = Shumway.ObjectUtilities.cloneObject;
  import copyProperties = Shumway.ObjectUtilities.copyProperties;
  import createEmptyObject = Shumway.ObjectUtilities.createEmptyObject;
  import boxValue = Shumway.ObjectUtilities.boxValue;
  import bindSafely = Shumway.FunctionUtilities.bindSafely;

  import defineNonEnumerableGetterOrSetter = Shumway.ObjectUtilities.defineNonEnumerableGetterOrSetter;
  import defineNonEnumerableProperty = Shumway.ObjectUtilities.defineNonEnumerableProperty;
  import defineReadOnlyProperty = Shumway.ObjectUtilities.defineReadOnlyProperty;
  import defineNonEnumerableGetter = Shumway.ObjectUtilities.defineNonEnumerableGetter;
  import makeForwardingGetter = Shumway.FunctionUtilities.makeForwardingGetter;
  import makeForwardingSetter = Shumway.FunctionUtilities.makeForwardingSetter;
  import toSafeString = Shumway.StringUtilities.toSafeString;
  import toSafeArrayString = Shumway.StringUtilities.toSafeArrayString;

  import TRAIT = Shumway.AVM2.ABC.TRAIT;

  export var VM_SLOTS = "asSlots";
  export var VM_LENGTH = "asLength";
  export var VM_BINDINGS = "asBindings";
  export var VM_NATIVE_PROTOTYPE_FLAG = "asIsNative";
  export var VM_OPEN_METHODS = "asOpenMethods";
  export var VM_IS_CLASS = "asIsClass";
  export var VM_IS_PROXY = "asIsProxy";
  export var VM_CALL_PROXY = "asCallProxy";

  export var VM_OPEN_METHOD_PREFIX = "m";
  export var VM_MEMOIZER_PREFIX = "z";
  export var VM_OPEN_SET_METHOD_PREFIX = "s";
  export var VM_OPEN_GET_METHOD_PREFIX = "g";

  export var VM_NATIVE_BUILTIN_ORIGINALS = "asOriginals";

  /**
   * Overriden AS3 methods (see hacks.js). This allows you to provide your own JS implementation
   * for AS3 methods.
   */
  export var VM_METHOD_OVERRIDES = createEmptyObject();

  /**
   * We use this to give functions unique IDs to help with debugging.
   */
  var vmNextInterpreterFunctionId = 1;
  var vmNextCompiledFunctionId = 1;

  var totalFunctionCount = 0;
  var compiledFunctionCount = 0;
  var compilationCount = 0;

  export function isClass(object) {
    release || assert (object);
    return Object.hasOwnProperty.call(object, VM_IS_CLASS);
  }

  /**
   * Checks if the specified |object| is the prototype of a native JavaScript object.
   */
  export function isNativePrototype(object) {
    return Object.prototype.hasOwnProperty.call(object, VM_NATIVE_PROTOTYPE_FLAG);
  }

  var traitsWriter: IndentingWriter = null; // new IndentingWriter();
  var callWriter: IndentingWriter = null; // new IndentingWriter();

  export interface IPatchTarget {
    object: Object;
    get?: string;
    set?: string;
    name?: string;
  }

  export function patch(patchTargets: IPatchTarget [], value: Function) {
    release || assert (isFunction(value));
    for (var i = 0; i < patchTargets.length; i++) {
      var patchTarget = patchTargets[i];
      if (traceExecution.value >= 3) {
        var str = "Patching: ";
        if (patchTarget.name) {
          str += patchTarget.name;
        } else if (patchTarget.get) {
          str += "get " + patchTarget.get;
        } else if (patchTarget.set) {
          str += "set " + patchTarget.set;
        }
        traitsWriter && traitsWriter.redLn(str);
      }
      if (patchTarget.get) {
        defineNonEnumerableGetterOrSetter(patchTarget.object, patchTarget.get, value, true);
      } else if (patchTarget.set) {
        defineNonEnumerableGetterOrSetter(patchTarget.object, patchTarget.set, value, false);
      } else {
        defineNonEnumerableProperty(patchTarget.object, patchTarget.name, value);
      }
    }
  }

  /**
   * Applies a method trait that doesn't need a memoizer.
   */
  export function applyNonMemoizedMethodTrait(qn: string, trait: Trait, object: Object, scope, natives) {
    release || assert (scope);
    if (trait.isMethod()) {
      var trampoline = makeTrampoline(function (self) {
        var fn = getTraitFunction(trait, scope, natives);
        patch(self.patchTargets, fn);
        return fn;
      }, trait.methodInfo.parameters.length);
      trampoline.patchTargets = [
        { object: object, name: qn },
        { object: object, name: VM_OPEN_METHOD_PREFIX + qn }
      ];
      var closure = bindSafely(trampoline, object);
      defineReadOnlyProperty(closure, VM_LENGTH, trampoline.asLength);
      defineReadOnlyProperty(closure, Multiname.getPublicQualifiedName("prototype"), null);
      defineNonEnumerableProperty(object, qn, closure);
      defineNonEnumerableProperty(object, VM_OPEN_METHOD_PREFIX + qn, closure);
    } else if (trait.isGetter() || trait.isSetter()) {
      var trampoline = makeTrampoline(function (self) {
        var fn = getTraitFunction(trait, scope, natives);
        patch(self.patchTargets, fn);
        return fn;
      }, trait.isSetter() ? 1 : 0);
      if (trait.isGetter()) {
        trampoline.patchTargets = [{ object: object, get: qn }];
      } else {
        trampoline.patchTargets = [{ object: object, set: qn }];
      }
      defineNonEnumerableGetterOrSetter(object, qn, trampoline, trait.isGetter());
    } else {
      Shumway.Debug.unexpected(trait);
    }
  }

  export function applyMemoizedMethodTrait(qn: string, trait: Trait, object: Object, scope, natives) {
    release || assert (scope, trait);

    if (trait.isMethod()) {
      // Patch the target of the memoizer using a temporary |target| object that is visible to both the trampoline
      // and the memoizer. The trampoline closes over it and patches the target value while the memoizer uses the
      // target value for subsequent memoizations.
      var memoizerTarget = { value: null };
      var trampoline = makeTrampoline(function (self) {
        var fn = getTraitFunction(trait, scope, natives);
        patch(self.patchTargets, fn);
        return fn;
      }, trait.methodInfo.parameters.length, String(trait.name));

      memoizerTarget.value = trampoline;
      var openMethods = object.asOpenMethods;
      openMethods[qn] = trampoline;
      defineNonEnumerableProperty(object, VM_OPEN_METHOD_PREFIX + qn, trampoline);
      // TODO: We make the |memoizeMethodClosure| configurable since it may be
      // overridden by a derived class. Only do this non final classes.

      defineNonEnumerableGetter(object, qn, makeMemoizer(qn, memoizerTarget));

      trampoline.patchTargets = <IPatchTarget[]>[
        { object: memoizerTarget, name: "value"},
        { object: openMethods,    name: qn },
        { object: object,         name: VM_OPEN_METHOD_PREFIX + qn }
      ];
    } else if (trait.isGetter() || trait.isSetter()) {
      var trampoline = makeTrampoline(function (self) {
        var fn = getTraitFunction(trait, scope, natives);
        patch(self.patchTargets, fn);
        return fn;
      }, 0, String(trait.name));
      if (trait.isGetter()) {
        defineNonEnumerableProperty(object, VM_OPEN_GET_METHOD_PREFIX + qn, trampoline);
        trampoline.patchTargets = [
          <IPatchTarget>{ object: object, get: qn },
          { object: object, name: VM_OPEN_GET_METHOD_PREFIX + qn }
        ];
      } else {
        defineNonEnumerableProperty(object, VM_OPEN_SET_METHOD_PREFIX + qn, trampoline);
        trampoline.patchTargets = [
          <IPatchTarget>{ object: object, set: qn },
          { object: object, name: VM_OPEN_SET_METHOD_PREFIX + qn }
        ];
      }
      defineNonEnumerableGetterOrSetter(object, qn, trampoline, trait.isGetter());
    }
  }

  /**
   * Property Accessors:
   *
   * Every AS3 object has the following "virtual" accessors methods:
   * - asGetProperty(namespaces, name, flags)
   * - asSetProperty(namespaces, name, flags, value)
   * - asHasProperty(namespaces, name, flags)
   * - asHasTraitProperty(namespaces, name, flags)
   * - asCallProperty(namespaces, name, flags, isLex, args)
   * - asDeleteProperty(namespaces, name, flags)
   *
   * The default implementation of as[Get|Set]Property checks if these properties are defined on the object and
   * calls them if the name is numeric:
   *
   * - asGetNumericProperty(index)
   * - asSetNumericProperty(index, value)
   *
   * Not yet implemented:
   * - asGetDescendants(namespaces, name, flags)
   * - asNextName(index)
   * - asNextNameIndex(index)
   * - asNextValue(index)
   * - asGetEnumerableKeys()
   *
   * Multiname resolution methods:
   * - getNamespaceResolutionMap(namespaces)
   * - resolveMultinameProperty(namespaces, name, flags)
   *
   * Special objects like Vector, Dictionary, XML, etc. can override these to provide different behaviour.
   *
   * To avoid boxing we represent multinames as a group of 3 parts: |namespaces| undefined or an array of
   * namespace objects, |name| any value, and |flags| an integer value. To resolve a multiname to a qualified
   * name we call |resolveMultinameProperty|. The expensive case is when we resolve multinames with multiple
   * namespaces. This is done with the help of |getNamespaceResolutionMap|.
   *
   * Every object that contains traits has a hidden array property called "resolutionMap". This maps between
   * namespace sets to an object that maps all trait names to their resolved qualified names in each namespace.
   *
   * For example, suppose we had the class A { n0 var x; n1 var x; n0 var y; n1 var y; } and two namespace sets:
   * {n0, n2} and {n2, n1}. The namespace sets are given the unique IDs 0 and 1 respectively. The resolution map
   * for class A would be:
   *
   * resolutionMap[0] = {x: n0$$x, y: n0$$y}
   * resolutionMap[1] = {x: n1$$x, y: n1$$y}
   *
   * Resolving {n2, n1}::x on a = new A() then becomes:
   *
   * a[a.resolutionMap[1]["x"]] -> a[{x: n1$$x, y: n1$$y}["x"]] -> a[n1$$x]
   *
   */

  export function getNamespaceResolutionMap(namespaces: Namespace []) {
    var self: Object = this;
    var map = self.resolutionMap[namespaces.runtimeId];
    if (map) return map;
    map = self.resolutionMap[namespaces.runtimeId] = Shumway.ObjectUtilities.createMap<string>();
    var bindings = self.bindings;

    for (var key in bindings.map) {
      var multiname = key;
      var trait = bindings.map[key].trait;
      if (trait.isGetter() || trait.isSetter()) {
        multiname = multiname.substring(Binding.KEY_PREFIX_LENGTH);
      }
      multiname = Multiname.fromQualifiedName(multiname);
      if (multiname.getNamespace().inNamespaceSet(namespaces)) {
        map[multiname.getName()] = Multiname.getQualifiedName(trait.name);
      }
    }
    return map;
  }

  export function resolveMultinameProperty(namespaces: Namespace [], name: string, flags: number) {
    var self: Object = this;
    if (typeof name === "object") {
      name = String(name);
    }
    if (isNumeric(name)) {
      return toNumber(name);
    }
    if (!namespaces) {
      return Multiname.getPublicQualifiedName(name);
    }
    if (namespaces.length > 1) {
      var resolved = self.getNamespaceResolutionMap(namespaces)[name];
      if (resolved) return resolved;
      return Multiname.getPublicQualifiedName(name);
    } else {
      return Multiname.qualifyName(namespaces[0], name);
    }
  }

  export function asGetPublicProperty(name: any) {
    var self: Object = this;
    return self.asGetProperty(undefined, name, 0);
  }

  export function asGetProperty(namespaces: Namespace [], name: any, flags: number) {
    var self: Object = this;
    var resolved = self.resolveMultinameProperty(namespaces, name, flags);
    if (self.asGetNumericProperty && Multiname.isNumeric(resolved)) {
      return self.asGetNumericProperty(resolved);
    }
    return self[resolved];
  }

  export function asGetPropertyLikelyNumeric(namespaces: Namespace [], name: any, flags: number) {
    var self: Object = this;
    if (typeof name === "number") {
      return self.asGetNumericProperty(name);
    }
    return asGetProperty.call(self, namespaces, name, flags);
  }

  /**
   * Resolved string accessors.
   */

  export function asGetResolvedStringProperty(resolved) {
    release || assert(isString(resolved));
    return this[resolved];
  }

  export function asCallResolvedStringProperty(resolved: any, isLex: boolean, args: any []) {
    var self: Object = this;
    var receiver = isLex ? null : this;
    var openMethods = self.asOpenMethods;
    // TODO: Passing |null| as |this| doesn't work correctly for free methods. It just happens to work
    // when using memoizers because the function gets bound to |this|.
    var method;
    if (receiver && openMethods && openMethods[resolved]) {
      method = openMethods[resolved];
    } else {
      method = self[resolved];
    }
    return method.apply(receiver, args);
  }

  export function asGetResolvedStringPropertyFallback(resolved: any) {
    var self: Object = this;
    var name = Multiname.getNameFromPublicQualifiedName(resolved);
    return self.asGetProperty([Namespace.PUBLIC], name, 0);
  }

  export function asSetPublicProperty(name: any, value: any) {
    var self: Object = this;
    return self.asSetProperty(undefined, name, 0, value);
  }

  export function asSetProperty(namespaces: Namespace [], name: any, flags: number, value: any) {
    var self: Object = this;
    if (typeof name === "object") {
      name = String(name);
    }
    var resolved = self.resolveMultinameProperty(namespaces, name, flags);
    if (self.asSetNumericProperty && Multiname.isNumeric(resolved)) {
      return self.asSetNumericProperty(resolved, value);
    }
    var slotInfo = self.asSlots.byQN[resolved];
    if (slotInfo) {
      if (slotInfo.isConst) {
        // TODO: Seal after first assignment. return;
      }
      var type = slotInfo.type;
      if (type && type.coerce) {
        value = type.coerce(value);
      }
    }
    self[resolved] = value;
  }

  export function asSetPropertyLikelyNumeric(namespaces: Namespace [], name: any, flags: number, value: any) {
    var self: Object = this;
    if (typeof name === "number") {
      self.asSetNumericProperty(name, value);
      return;
    }
    return asSetProperty.call(self, namespaces, name, flags, value);
  }

  export function asDefinePublicProperty(name: any, descriptor: PropertyDescriptor) {
    var self: Object = this;
    return self.asDefineProperty(undefined, name, 0, descriptor);
  }

  export function asDefineProperty(namespaces: Namespace [], name: any, flags: number, descriptor: PropertyDescriptor) {
    var self: Object = this;
    if (typeof name === "object") {
      name = String(name);
    }
    var resolved = self.resolveMultinameProperty(namespaces, name, flags);
    Object.defineProperty(self, resolved, descriptor);
  }

  export function asCallPublicProperty(name: any, args: any []) {
    var self: Object = this;
    return self.asCallProperty(undefined, name, 0, false, args);
  }

  export function asCallProperty(namespaces: Namespace [], name: any, flags: number, isLex: boolean, args: any []) {
    var self: Object = this;
    if (traceCallExecution.value) {
      var receiverClassName = self.class ? self.class.className + " ": "";
      callWriter.enter("call " + receiverClassName + name + "(" + toSafeArrayString(args) + ") #" + callCounter.count(name));
    }
    var receiver: Object = isLex ? null : self;
    var result;
    if (isProxyObject(self)) {
      result = self[VM_CALL_PROXY](new Multiname(namespaces, name, flags), receiver, args);
    } else {
      var method;
      var resolved = self.resolveMultinameProperty(namespaces, name, flags);
      if (self.asGetNumericProperty && Multiname.isNumeric(resolved)) {
        method = self.asGetNumericProperty(resolved);
      } else {
        var openMethods = self.asOpenMethods;
        // TODO: Passing |null| as |this| doesn't work correctly for free methods. It just happens to work
        // when using memoizers because the function gets bound to |this|.
        if (receiver && openMethods && openMethods[resolved]) {
          method = openMethods[resolved];
        } else {
          method = self[resolved];
        }
      }
      result = method.apply(receiver, args);
    }
    traceCallExecution.value > 0 && callWriter.leave("return " + toSafeString(result));
    return result;
  }

  export function asCallSuper(scope, namespaces: Namespace [], name: any, flags: number, args: any []) {
    var self: Object = this;
    if (traceCallExecution.value) {
      var receiverClassName = self.class ? self.class.className + " ": "";
      callWriter.enter("call super " + receiverClassName + name + "(" + toSafeArrayString(args) + ") #" + callCounter.count(name));
    }
    var baseClass = scope.object.baseClass;
    var resolved = baseClass.traitsPrototype.resolveMultinameProperty(namespaces, name, flags);
    var openMethods = baseClass.traitsPrototype.asOpenMethods;
    assert (openMethods && openMethods[resolved]);
    var method = openMethods[resolved];
    var result = method.apply(this, args);
    traceCallExecution.value > 0 && callWriter.leave("return " + toSafeString(result));
    return result;
  }

  export function asSetSuper(scope, namespaces: Namespace [], name: any, flags: number, value: any) {
    var self: Object = this;
    if (traceCallExecution.value) {
      var receiverClassName = self.class ? self.class.className + " ": "";
      callWriter.enter("set super " + receiverClassName + name + "(" + toSafeString(value) + ") #" + callCounter.count(name));
    }
    var baseClass = scope.object.baseClass;
    var resolved = baseClass.traitsPrototype.resolveMultinameProperty(namespaces, name, flags);
    if (self.asSlots.byQN[resolved]) {
      this.asSetProperty(namespaces, name, flags, value);
    } else {
      baseClass.traitsPrototype[VM_OPEN_SET_METHOD_PREFIX + resolved].call(this, value);
    }
    traceCallExecution.value > 0 && callWriter.leave("");
  }

  export function asGetSuper(scope, namespaces: Namespace [], name: any, flags: number) {
    var self: Object = this;
    if (traceCallExecution.value) {
      var receiver = self.class ? self.class.className + " ": "";
      callWriter.enter("get super " + receiver + name + " #" + callCounter.count(name));
    }
    var baseClass = scope.object.baseClass;
    var resolved = baseClass.traitsPrototype.resolveMultinameProperty(namespaces, name, flags);
    var result;
    if (self.asSlots.byQN[resolved]) {
      result = this.asGetProperty(namespaces, name, flags);
    } else {
      result = baseClass.traitsPrototype[VM_OPEN_GET_METHOD_PREFIX + resolved].call(this);
    }
    traceCallExecution.value > 0 && callWriter.leave("return " + toSafeString(result));
    return result;
  }

  export function construct(cls: Class, args: any []) {
    if (cls.classInfo) {
      // return primitive values for new'd boxes
      var qn = Multiname.getQualifiedName(cls.classInfo.instanceInfo.name);
      if (qn === Multiname.String) {
        return String.apply(null, args);
      }
      if (qn === Multiname.Boolean) {
        return Boolean.apply(null, args);
      }
      if (qn === Multiname.Number) {
        return Number.apply(null, args);
      }
    }
    var c = <any> cls.instanceConstructor;
    var a = args;
    switch (args.length) {
      case  0: return new c();
      case  1: return new c(a[0]);
      case  2: return new c(a[0], a[1]);
      case  3: return new c(a[0], a[1], a[2]);
      case  4: return new c(a[0], a[1], a[2], a[3]);
      case  5: return new c(a[0], a[1], a[2], a[3], a[4]);
      case  6: return new c(a[0], a[1], a[2], a[3], a[4], a[5]);
      case  7: return new c(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
      case  8: return new c(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]);
      case  9: return new c(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
      case 10: return new c(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]);
    }
    var applyArguments = [];
    for (var i = 0; i < args.length; i++) {
      applyArguments[i + 1] = args[i];
    }
    return new (Function.bind.apply(c, applyArguments));
  }

  export function asConstructProperty(namespaces: Namespace [], name: any, flags: number, args: any []) {
    var self: Object = this;
    var constructor = self.asGetProperty(namespaces, name, flags);
    if (traceCallExecution.value) {
      callWriter.enter("construct " + name + "(" + toSafeArrayString(args) + ") #" + callCounter.count(name));
    }
    var result = construct(constructor, args);
    traceCallExecution.value > 0 && callWriter.leave("return " + toSafeString(result));
    return result;
  }

  /**
   * Proxy traps ignore operations passing through nonProxying functions.
   */
  export function nonProxyingHasProperty(object, name) {
    return name in object;
  }

  export function asHasProperty(namespaces: Namespace [], name: any, flags: number, nonProxy: boolean) {
    var self: Object = this;
    if (self.hasProperty) {
      return self.hasProperty(namespaces, name, flags);
    }
    if (nonProxy) {
      return nonProxyingHasProperty(self, self.resolveMultinameProperty(namespaces, name, flags));
    } else {
      return self.resolveMultinameProperty(namespaces, name, flags) in this;
    }
  }

  export function asDeleteProperty(namespaces: Namespace [], name: any, flags: number) {
    var self: Object = this;
    if (self.asHasTraitProperty(namespaces, name, flags)) {
      return false;
    }
    var resolved = self.resolveMultinameProperty(namespaces, name, flags);
    return delete self[resolved];
  }

  export function asHasTraitProperty(namespaces: Namespace [], name: any, flags: number) {
    var self: Object = this;
    var resolved = self.resolveMultinameProperty(namespaces, name, flags);
    return self.asBindings.indexOf(resolved) >= 0;
  }

  export function asGetNumericProperty(i: number) {
    return this[i];
  }

  export function asSetNumericProperty(i: number, v: string) {
    this[i] = v;
  }

  export function asGetDescendants(namespaces: Namespace [], name: any, flags: number) {
    Shumway.Debug.notImplemented("asGetDescendants");
  }

  /**
   * Gets the next name index of an object. Index |zero| is actually not an
   * index, but rather an indicator to start the iteration.
   */
  export function asNextNameIndex(index: number) {
    var self: Object = this;
    if (index === 0) {
      // Gather all enumerable keys since we're starting a new iteration.
      defineNonEnumerableProperty(self, "asEnumerableKeys", self.asGetEnumerableKeys());
    }
    var asEnumerableKeys = self.asEnumerableKeys;
    while (index < asEnumerableKeys.length) {
      if (self.asHasProperty(undefined, asEnumerableKeys[index], 0)) {
        return index + 1;
      }
      index ++;
    }
    return 0;
  }

  /**
   * Gets the nextName after the specified |index|, which you would expect to
   * be index + 1, but it's actually index - 1;
   */
  export function asNextName(index: number) {
    var self: Object = this;
    var asEnumerableKeys = self.asEnumerableKeys;
    release || assert(asEnumerableKeys && index > 0 && index < asEnumerableKeys.length + 1);
    return asEnumerableKeys[index - 1];
  }

  export function asNextValue(index: number) {
    return this.asGetPublicProperty(this.asNextName(index));
  }

  export function asGetEnumerableKeys(): any [] {
    var self: Object = this;
    var boxedValue = self.valueOf();
    // TODO: This is probably broken if the object has overwritten |valueOf|.
    if (typeof boxedValue === "string" || typeof boxedValue === "number") {
      return [];
    }
    var keys = Object.keys(this);
    var result = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (isNumeric(key)) {
        result.push(key);
      } else {
        var name = Multiname.stripPublicQualifier(key);
        if (name !== undefined) {
          result.push(name);
        }
      }
    }
    return result;
  }

  export function asTypeOf(x) {
    // ABC doesn't box primitives, so typeof returns the primitive type even when
    // the value is new'd
    if (x) {
      if (x.constructor === String) {
        return "string"
      } else if (x.constructor === Number) {
        return "number"
      } else if (x.constructor === Boolean) {
        return "boolean"
      } else if (x instanceof XML || x instanceof XMLList) {
        return "xml"
      }
    }
    return typeof x;
  }

  /**
   * Make an object's properties accessible from AS3. This prefixes all non-numeric
   * properties with the public prefix.
   */
  export function publicizeProperties(object) {
    var keys = Object.keys(object);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (!Multiname.isPublicQualifiedName(k)) {
        var v = object[k];
        object[Multiname.getPublicQualifiedName(k)] = v;
        delete object[k];
      }
    }
  }

  export function asGetSlot(object, index) {
    return object[object.asSlots.byID[index].name];
  }

  export function asSetSlot(object, index, value) {
    var slotInfo = object.asSlots.byID[index];
    if (slotInfo.const) {
      return;
    }
    var name = slotInfo.name;
    var type = slotInfo.type;
    if (type && type.coerce) {
      object[name] = type.coerce(value);
    } else {
      object[name] = value;
    }
  }


  export function throwError(name, error) {
    if (true) {
      var message = Shumway.AVM2.formatErrorMessage.apply(null, Array.prototype.slice.call(arguments, 1));
      throwErrorFromVM(AVM2.currentDomain(), name, message, error.code);
    } else {
      throwErrorFromVM(AVM2.currentDomain(), name, Shumway.AVM2.getErrorMessage(error.code), error.code);
    }
  }

  export function throwErrorFromVM(domain, errorClass, message, id) {
    var error = new (domain.getClass(errorClass)).instanceConstructor(message, id);
    throw error;
  }

  export function translateError(domain, error) {
    if (error instanceof Error) {
      var type = domain.getClass(error.name);
      if (type) {
        return new type.instanceConstructor(Shumway.AVM2.translateErrorMessage(error));
      }
      Shumway.Debug.unexpected("Can't translate error: " + error);
    }
    return error;
  }

  export function asIsInstanceOf(type, value) {
    return type.isInstanceOf(value);
  }

  export function asIsType(type, value) {
    return type.isInstance(value);
  }

  export function asAsType(type, value) {
    return asIsType(type, value) ? value : null;
  }

  export function asCoerceByMultiname(domain, multiname, value) {
    release || assert(multiname.isQName());
    switch (Multiname.getQualifiedName(multiname)) {
      case Multiname.Int:
        return asCoerceInt(value);
      case Multiname.Uint:
        return asCoerceUint(value);
      case Multiname.String:
        return asCoerceString(value);
      case Multiname.Number:
        return asCoerceNumber(value);
      case Multiname.Boolean:
        return asCoerceBoolean(value);
      case Multiname.Object:
        return asCoerceObject(value);
    }
    return asCoerce(domain.getType(multiname), value);
  }

  export function asCoerce(type, value) {
    if (type.coerce) {
      return type.coerce(value);
    }

    if (isNullOrUndefined(value)) {
      return null;
    }

    if (type.isInstance(value)) {
      return value;
    } else {
      // FIXME throwErrorFromVM needs to be called from within the runtime
      // because it needs access to the domain or the domain has to be
      // aquired through some other mechanism.
      // throwErrorFromVM("TypeError", "Cannot coerce " + obj + " to type " + type);

      // For now just assert false to print the message.
      release || assert(false, "Cannot coerce " + value + " to type " + type);
    }
  }

  /**
   * Similar to |toString| but returns |null| for |null| or |undefined| instead
   * of "null" or "undefined".
   */
  export function asCoerceString(x) {
    if (typeof x === "string") {
      return x;
    } else if (x == undefined) {
      return null;
    }
    return x + '';
  }

  export function asCoerceInt(x) {
    return x | 0;
  }

  export function asCoerceUint(x) {
    return x >>> 0;
  }

  export function asCoerceNumber(x) {
    return +x;
  }

  export function asCoerceBoolean(x) {
    return !!x;
  }

  export function asCoerceObject(x) {
    if (x == undefined) {
      return null;
    }
    if (typeof x === 'string' || typeof x === 'number') {
      return x;
    }
    return Object(x);
  }

  export function asDefaultCompareFunction(a, b) {
    return String(a).localeCompare(String(b));
  }

  export function asCompare(a, b, options, compareFunction) {
    release || Shumway.Debug.assertNotImplemented (!(options & SORT.UNIQUESORT), "UNIQUESORT");
    release || Shumway.Debug.assertNotImplemented (!(options & SORT.RETURNINDEXEDARRAY), "RETURNINDEXEDARRAY");
    var result = 0;
    if (!compareFunction) {
      compareFunction = asDefaultCompareFunction;
    }
    if (options & SORT.CASEINSENSITIVE) {
      a = String(a).toLowerCase();
      b = String(b).toLowerCase();
    }
    if (options & SORT.NUMERIC) {
      a = toNumber(a);
      b = toNumber(b);
      result = a < b ? -1 : (a > b ? 1 : 0);
    } else {
      result = compareFunction(a, b);
    }
    if (options & SORT.DESCENDING) {
      result *= -1;
    }
    return result;
  }

  /**
   * ActionScript 3 has different behaviour when deciding whether to call toString or valueOf
   * when one operand is a string. Unlike JavaScript, it calls toString if one operand is a
   * string and valueOf otherwise. This sucks, but we have to emulate this behaviour because
   * YouTube depends on it.
   */
  export function asAdd(l, r) {
    if (typeof l === "string" || typeof r === "string") {
      return String(l) + String(r);
    }
    return l + r;
  }


  /**
   * Determine if the given object has any more properties after the specified |index| and if so, return
   * the next index or |zero| otherwise. If the |obj| has no more properties then continue the search in
   * |obj.__proto__|. This function returns an updated index and object to be used during iteration.
   *
   * the |for (x in obj) { ... }| statement is compiled into the following pseudo bytecode:
   *
   * index = 0;
   * while (true) {
   *   (obj, index) = hasNext2(obj, index);
   *   if (index) { #1
   *     x = nextName(obj, index); #2
   *   } else {
   *     break;
   *   }
   * }
   *
   * #1 If we return zero, the iteration stops.
   * #2 The spec says we need to get the nextName at index + 1, but it's actually index - 1, this caused
   * me two hours of my life that I will probably never get back.
   *
   * TODO: We can't match the iteration order semantics of Action Script, hopefully programmers don't rely on it.
   */
  export function asHasNext2(object, index) {
    if (isNullOrUndefined(object)) {
      return {index: 0, object: null};
    }
    object = boxValue(object);
    var nextIndex = object.asNextNameIndex(index);
    if (nextIndex > 0) {
      return {index: nextIndex, object: object};
    }
    // If there are no more properties in the object then follow the prototype chain.
    while (true) {
      var object = Object.getPrototypeOf(object);
      if (!object) {
        return {index: 0, object: null};
      }
      nextIndex = object.asNextNameIndex(0);
      if (nextIndex > 0) {
        return {index: nextIndex, object: object};
      }
    }
    return {index: 0, object: null};
  }

  export function getDescendants(object, mn) {
    if (!isXMLType(object)) {
      throw "Not XML object in getDescendants";
    }
    return object.descendants(mn);
  }

  export function checkFilter(value) {
    if (!value.class || !isXMLType(value)) {
      throw "TypeError operand of childFilter not of XML type";
    }
    return value;
  }

  export function initializeGlobalObject(global) {
    var VM_NATIVE_BUILTIN_SURROGATES = [
      { name: "Object", methods: ["toString", "valueOf"] },
      { name: "Function", methods: ["toString", "valueOf"] }
    ];
    /**
     * Surrogates are used to make |toString| and |valueOf| work transparently. For instance, the expression
     * |a + b| should implicitly expand to |a.$valueOf() + b.$valueOf()|. Since, we don't want to call
     * |$valueOf| explicitly we instead patch the |valueOf| property in the prototypes of native builtins
     * to call the |$valueOf| instead.
     */
    var originals = global[VM_NATIVE_BUILTIN_ORIGINALS] = createEmptyObject();
    VM_NATIVE_BUILTIN_SURROGATES.forEach(function (surrogate) {
      var object = global[surrogate.name];
      assert (object);
      originals[surrogate.name] = createEmptyObject();
      surrogate.methods.forEach(function (originalFunctionName) {
        var originalFunction;
        if (object.prototype.hasOwnProperty(originalFunctionName)) {
          originalFunction = object.prototype[originalFunctionName];
        } else {
          originalFunction = originals["Object"][originalFunctionName];
        }
        // Save the original method in case |getNative| needs it.
        originals[surrogate.name][originalFunctionName] = originalFunction;
        var overrideFunctionName = Multiname.getPublicQualifiedName(originalFunctionName);
        if (useSurrogates) {
          // Patch the native builtin with a surrogate.
          global[surrogate.name].prototype[originalFunctionName] = function surrogate() {
            if (this[overrideFunctionName]) {
              return this[overrideFunctionName]();
            }
            return originalFunction.call(this);
          };
        }
      });
    });

    ["Object", "Number", "Boolean", "String", "Array", "Date", "RegExp"].forEach(function (name) {
      defineReadOnlyProperty(global[name].prototype, VM_NATIVE_PROTOTYPE_FLAG, true);
    });

    defineNonEnumerableProperty(global.Object.prototype, "getNamespaceResolutionMap", getNamespaceResolutionMap);
    defineNonEnumerableProperty(global.Object.prototype, "resolveMultinameProperty", resolveMultinameProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asGetProperty", asGetProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asGetPublicProperty", asGetPublicProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asGetResolvedStringProperty", asGetResolvedStringProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asSetProperty", asSetProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asSetPublicProperty", asSetPublicProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asDefineProperty", asDefineProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asDefinePublicProperty", asDefinePublicProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asCallProperty", asCallProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asCallSuper", asCallSuper);
    defineNonEnumerableProperty(global.Object.prototype, "asGetSuper", asGetSuper);
    defineNonEnumerableProperty(global.Object.prototype, "asSetSuper", asSetSuper);
    defineNonEnumerableProperty(global.Object.prototype, "asCallPublicProperty", asCallPublicProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asCallResolvedStringProperty", asCallResolvedStringProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asConstructProperty", asConstructProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asHasProperty", asHasProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asHasTraitProperty", asHasTraitProperty);
    defineNonEnumerableProperty(global.Object.prototype, "asDeleteProperty", asDeleteProperty);

    defineNonEnumerableProperty(global.Object.prototype, "asNextName", asNextName);
    defineNonEnumerableProperty(global.Object.prototype, "asNextValue", asNextValue);
    defineNonEnumerableProperty(global.Object.prototype, "asNextNameIndex", asNextNameIndex);
    defineNonEnumerableProperty(global.Object.prototype, "asGetEnumerableKeys", asGetEnumerableKeys);

    [
      "Array",
      "Int8Array",
      "Uint8Array",
      "Uint8ClampedArray",
      "Int16Array",
      "Uint16Array",
      "Int32Array",
      "Uint32Array",
      "Float32Array",
      "Float64Array"
    ].forEach(function (name) {
        if (!(name in global)) {
          log(name + ' was not found in globals');
          return;
        }
        defineNonEnumerableProperty(global[name].prototype, "asGetNumericProperty", asGetNumericProperty);
        defineNonEnumerableProperty(global[name].prototype, "asSetNumericProperty", asSetNumericProperty);

        defineNonEnumerableProperty(global[name].prototype, "asGetProperty", asGetPropertyLikelyNumeric);
        defineNonEnumerableProperty(global[name].prototype, "asSetProperty", asSetPropertyLikelyNumeric);
      });

    global.Array.prototype.asGetProperty = function (namespaces: Namespace [], name: any, flags: number): any {
      if (typeof name === "number") {
        return this[name];
      }
      return asGetProperty.call(this, namespaces, name, flags);
    };

    global.Array.prototype.asSetProperty = function (namespaces: Namespace [], name: any, flags: number, value: any) {
      if (typeof name === "number") {
        this[name] = value;
        return;
      }
      return asSetProperty.call(this, namespaces, name, flags, value);
    };
  }

  /**
   * Check if a qualified name is in an object's traits.
   */
  export function nameInTraits(object, qn) {
    // If the object itself holds traits, try to resolve it. This is true for
    // things like global objects and activations, but also for classes, which
    // both have their own traits and the traits of the Class class.
    if (object.hasOwnProperty(VM_BINDINGS) && object.hasOwnProperty(qn)) {
      return true;
    }

    // Else look on the prototype.
    var proto = Object.getPrototypeOf(object);
    return proto.hasOwnProperty(VM_BINDINGS) && proto.hasOwnProperty(qn);
  }

  /**
   * Scope object backing for catch blocks.
   */
  export function CatchScopeObject(domain, trait) {
    if (trait) {
      new CatchBindings(new Scope(null, this), trait).applyTo(domain, this);
    }
  }

  /**
   * Global object for a script.
   */
  export class Global {
    scriptInfo: ScriptInfo;
    scriptBindings: ScriptBindings;
    constructor(script: ScriptInfo) {
      this.scriptInfo = script;
      script.global = this;
      this.scriptBindings = new ScriptBindings(script, new Scope(null, this, false));
      this.scriptBindings.applyTo(script.abc.applicationDomain, this);
      script.loaded = true;
    }

    public toString() {
      return "[object global]";
    }

    public isExecuted() {
      return this.scriptInfo.executed;
    }

    public isExecuting() {
      return this.scriptInfo.executing;
    }

    public ensureExecuted() {
      Shumway.AVM2.Runtime.ensureScriptIsExecuted(this.scriptInfo);
    }
  }

  defineNonEnumerableProperty(Global.prototype, Multiname.getPublicQualifiedName("toString"), function () {
    return this.toString();
  });

  /**
   * Self patching global property stub that lazily initializes objects like scripts and
   * classes.
   */
  export class LazyInitializer {
    target: Object;
    name: string;
    private static _holder = jsGlobal;
    static create(target): LazyInitializer {
      if (target.asLazyInitializer) {
        return target.asLazyInitializer;
      }
      return target.asLazyInitializer = new LazyInitializer(target);
    }
    constructor (target: Object) {
      assert (!target.asLazyInitializer);
      this.target = target;
    }
    public getName() {
      if (this.name) {
        return this.name;
      }
      var target = this.target, initialize;
      if (this.target instanceof ScriptInfo) {
        var scriptInfo: ScriptInfo = <ScriptInfo>target;
        this.name = "$" + Shumway.StringUtilities.variableLengthEncodeInt32(scriptInfo.hash);
        initialize = function () {
          ensureScriptIsExecuted(target, "Lazy Initializer");
          return scriptInfo.global;
        };
      } else if (this.target instanceof ClassInfo) {
        var classInfo: ClassInfo = <ClassInfo>target;
        this.name = "$" + Shumway.StringUtilities.variableLengthEncodeInt32(classInfo.hash);
        initialize = function () {
          if (classInfo.classObject) {
            return classInfo.classObject;
          }
          return classInfo.abc.applicationDomain.getProperty(classInfo.instanceInfo.name);
        };
      } else {
        Shumway.Debug.notImplemented(String(target));
      }
      var name = this.name;
      assert (!LazyInitializer._holder[name], "Holder already has " + name);
      Object.defineProperty(LazyInitializer._holder, name, {
        get: function () {
          var value = initialize();
          assert (value);
          Object.defineProperty(LazyInitializer._holder, name, { value: value, writable: true });
          return value;
        }, configurable: true
      });
      return name;
    }
  }

  export function forEachPublicProperty(object, fn, self) {
    if (!object.asBindings) {
      for (var key in object) {
        fn.call(self, key, object[key]);
      }
      return;
    }

    for (var key in object) {
      if (isNumeric(key)) {
        fn.call(self, key, object[key]);
      } else if (Multiname.isPublicQualifiedName(key) && object.asBindings.indexOf(key) < 0) {
        var name = Multiname.stripPublicQualifier(key);
        fn.call(self, name, object[key]);
      }
    }
  }

  export function wrapJSObject(object) {
    var wrapper = Object.create(object);
    for (var i in object) {
      Object.defineProperty(wrapper, Multiname.getPublicQualifiedName(i), (function (object, i) {
        return {
          get: function () { return object[i] },
          set: function (value) { object[i] = value; },
          enumerable: true
        };
      })(object, i));
    }
    return wrapper;
  }

  export function asCreateActivation(methodInfo: MethodInfo): Object {
    return Object.create(methodInfo.activationPrototype);
  }

  /**
   * It's not possible to resolve the multiname {a, b, c}::x to {b}::x if no trait exists in any of the currently
   * loaded abc files that defines the {b}::x name. Of course, this can change if we load an abc file that defines it.
   */
  export class GlobalMultinameResolver {
    private static hasNonDynamicNamespaces = createEmptyObject();
    private static wasResolved = createEmptyObject();

    private static updateTraits(traits) {
      for (var i = 0; i < traits.length; i++) {
        var trait = traits[i];
        var name = trait.name.name;
        var namespace = trait.name.getNamespace();
        if (!namespace.isDynamic()) {
          GlobalMultinameResolver.hasNonDynamicNamespaces[name] = true;
          if (GlobalMultinameResolver.wasResolved[name]) {
            Shumway.Debug.notImplemented("We have to the undo the optimization, " + name + " can now bind to " + namespace);
          }
        }
      }
    }

    /**
     * Called after an .abc file is loaded. This invalidates inline caches if they have been created.
     */
    public static loadAbc(abc) {
      if (!globalMultinameAnalysis.value) {
        return;
      }
      var scripts = abc.scripts;
      var classes = abc.classes;
      var methods = abc.methods;
      for (var i = 0; i < scripts.length; i++) {
        GlobalMultinameResolver.updateTraits(scripts[i].traits);
      }
      for (var i = 0; i < classes.length; i++) {
        GlobalMultinameResolver.updateTraits(classes[i].traits);
        GlobalMultinameResolver.updateTraits(classes[i].instanceInfo.traits);
      }
      for (var i = 0; i < methods.length; i++) {
        if (methods[i].traits) {
          GlobalMultinameResolver.updateTraits(methods[i].traits);
        }
      }
    }

    public static resolveMultiname(multiname) {
      var name = multiname.name;
      if (GlobalMultinameResolver.hasNonDynamicNamespaces[name]) {
        return;
      }
      GlobalMultinameResolver.wasResolved[name] = true;
      return new Multiname([Namespace.PUBLIC], multiname.name);
    }
  }

  export class ActivationInfo {
    methodInfo: MethodInfo;
    constructor(methodInfo: MethodInfo) {
      this.methodInfo = methodInfo;
    }
  }

  export function sliceArguments(args, offset: number = 0) {
    return Array.prototype.slice.call(args, offset);
  }

  export function canCompile(mi) {
    if (!mi.hasBody) {
      return false;
    }
    if (mi.hasExceptions() && !compilerEnableExceptions.value) {
      return false;
    } else if (mi.code.length > compilerMaximumMethodSize.value) {
      return false;
    }
    return true;
  }

  /**
   * Checks if the specified method should be compiled. For now we just ignore very large methods.
   */
  export function shouldCompile(mi) {
    if (!canCompile(mi)) {
      return false;
    }
    // Don't compile class and script initializers since they only run once.
    if (mi.isClassInitializer || mi.isScriptInitializer) {
      return false;
    }
    return true;
  }

  /**
   * Checks if the specified method must be compiled, even if the compiled is not enabled.
   */
  export function forceCompile(mi) {
    if (mi.hasExceptions()) {
      return false;
    }
    var holder = mi.holder;
    if (holder instanceof ClassInfo) {
      holder = holder.instanceInfo;
    }
    if (holder instanceof InstanceInfo) {
      var packageName = holder.name.namespaces[0].uri;
      switch (packageName) {
        case "flash.geom":
        case "flash.events":
          return true;
        default:
          break;
      }
      var className = holder.name.getOriginalName();
      switch (className) {
        case "com.google.youtube.model.VideoData":
          return true;
      }
    }
    return false;
  }

  export var CODE_CACHE = createEmptyObject();

  export function searchCodeCache(methodInfo) {
    if (!codeCaching.value) {
      return;
    }
    var cacheInfo = CODE_CACHE[methodInfo.abc.hash];
    if (!cacheInfo) {
      warn("Cannot Find Code Cache For ABC, name: " + methodInfo.abc.name + ", hash: " + methodInfo.abc.hash);
      Counter.count("Code Cache ABC Miss");
      return;
    }
    if (!cacheInfo.isInitialized) {
      methodInfo.abc.scripts.forEach(function (scriptInfo) {
        LazyInitializer.create(scriptInfo).getName();
      });
      methodInfo.abc.classes.forEach(function (classInfo) {
        LazyInitializer.create(classInfo).getName();
      });
      cacheInfo.isInitialized = true;
    }
    var method = cacheInfo.methods[methodInfo.index];
    if (!method) {
      if (methodInfo.isInstanceInitializer || methodInfo.isClassInitializer) {
        Counter.count("Code Cache Query On Initializer");
      } else {
        Counter.count("Code Cache MISS ON OTHER");
        warn("Shouldn't MISS: " + methodInfo + " " + methodInfo.debugName);
      }
      // warn("Cannot Find Code Cache For Method, name: " + methodInfo);
      Counter.count("Code Cache Miss");
      return;
    }
    log("Linking CC: " + methodInfo);
    Counter.count("Code Cache Hit");
    return method;
  }

  export function createInterpretedFunction(methodInfo, scope, hasDynamicScope) {
    var mi = methodInfo;
    var hasDefaults = false;
    var defaults = mi.parameters.map(function (p) {
      if (p.value !== undefined) {
        hasDefaults = true;
      }
      return p.value;
    });
    var fn;
    if (hasDynamicScope) {
      fn = function (scope) {
        var global = (this === jsGlobal ? scope.global.object : this);
        var args = sliceArguments(arguments, 1);
        if (hasDefaults && args.length < defaults.length) {
          args = args.concat(defaults.slice(args.length - defaults.length));
        }
        return Shumway.AVM2.Interpreter.interpretMethod(global, methodInfo, scope, args);
      };
    } else {
      fn = function () {
        var global = (this === jsGlobal ? scope.global.object : this);
        var args = sliceArguments(arguments);
        if (hasDefaults && args.length < defaults.length) {
          args = args.concat(defaults.slice(arguments.length - defaults.length));
        }
        return Shumway.AVM2.Interpreter.interpretMethod(global, methodInfo, scope, args);
      };
    }
    fn.instanceConstructor = fn;
    fn.debugName = "Interpreter Function #" + vmNextInterpreterFunctionId++;
    return fn;
  }

  export function debugName(value) {
    if (isFunction(value)) {
      return value.debugName;
    }
    return value;
  }

  export function createCompiledFunction(methodInfo, scope, hasDynamicScope, breakpoint, deferCompilation) {
    var mi = methodInfo;
    var cached = searchCodeCache(mi);
    if (!cached) {
      var result = Compiler.compileMethod(mi, scope, hasDynamicScope);
      var parameters = result.parameters;
      var body = result.body;
    }

    var fnName = mi.name ? Multiname.getQualifiedName(mi.name) : "fn" + compiledFunctionCount;
    if (mi.holder) {
      var fnNamePrefix = "";
      if (mi.holder instanceof ClassInfo) {
        fnNamePrefix = "static$" + mi.holder.instanceInfo.name.getName();
      } else if (mi.holder instanceof InstanceInfo) {
        fnNamePrefix = mi.holder.name.getName();
      } else if (mi.holder instanceof ScriptInfo) {
        fnNamePrefix = "script";
      }
      fnName = fnNamePrefix + "$" + fnName;
    }
    fnName = Shumway.StringUtilities.escapeString(fnName);
    if (mi.verified) {
      fnName += "$V";
    }
    if (compiledFunctionCount == functionBreak.value || breakpoint) {
      body = "{ debugger; \n" + body + "}";
    }

    if (!cached) {
      var fnSource = "function " + fnName + " (" + parameters.join(", ") + ") " + body;
    }

    if (traceFunctions.value > 1) {
      mi.trace(new IndentingWriter(), mi.abc);
    }
    mi.debugTrace = function () {
      mi.trace(new IndentingWriter(), mi.abc);
    };
    if (traceFunctions.value > 0) {
      log(fnSource);
    }
    // mi.freeMethod = (1, eval)('[$M[' + ($M.length - 1) + '],' + fnSource + '][1]');
    // mi.freeMethod = new Function(parameters, body);

    var fn = cached || new Function("return " + fnSource)();
    fn.debugName = "Compiled Function #" + vmNextCompiledFunctionId++;
    return fn;
  }


  /**
   * Creates a function from the specified |methodInfo| that is bound to the given |scope|. If the
   * scope is dynamic (as is the case for closures) the compiler generates an additional prefix
   * parameter for the compiled function named |SAVED_SCOPE_NAME| and then wraps the compiled
   * function in a closure that is bound to the given |scope|. If the scope is not dynamic, the
   * compiler bakes it in as a constant which should be much more efficient. If the interpreter
   * is used, the scope object is passed in every time.
   */
  export function createFunction(mi, scope, hasDynamicScope, breakpoint = false) {
    release || assert(!mi.isNative(), "Method should have a builtin: ", mi.name);

    if (mi.freeMethod) {
      if (hasDynamicScope) {
        return bindFreeMethodScope(mi, scope);
      }
      return mi.freeMethod;
    }

    var fn;

    if ((fn = checkMethodOverrides(mi))) {
      release || assert (!hasDynamicScope);
      return fn;
    }

    ensureFunctionIsInitialized(mi);

    totalFunctionCount ++;

    var useInterpreter = false;
    if ((mi.abc.applicationDomain.mode === EXECUTION_MODE.INTERPRET || !shouldCompile(mi)) && !forceCompile(mi)) {
      useInterpreter = true;
    }

    if (compileOnly.value >= 0) {
      if (Number(compileOnly.value) !== totalFunctionCount) {
        log("Compile Only Skipping " + totalFunctionCount);
        useInterpreter = true;
      }
    }

    if (compileUntil.value >= 0) {
      if (totalFunctionCount > 1000) {
        log(Shumway.Debug.backtrace());
        log(AVM2.getStackTrace());
      }
      if (totalFunctionCount > compileUntil.value) {
        log("Compile Until Skipping " + totalFunctionCount);
        useInterpreter = true;
      }
    }

    if (useInterpreter) {
      mi.freeMethod = createInterpretedFunction(mi, scope, hasDynamicScope);
    } else {
      compiledFunctionCount++;
      // console.info("Compiling: " + mi + " count: " + compiledFunctionCount);
      if (compileOnly.value >= 0 || compileUntil.value >= 0) {
        log("Compiling " + totalFunctionCount);
      }
      mi.freeMethod = createCompiledFunction(mi, scope, hasDynamicScope, breakpoint, mi.isInstanceInitializer);
    }

    mi.freeMethod.methodInfo = mi;

    if (hasDynamicScope) {
      return bindFreeMethodScope(mi, scope);
    }
    return mi.freeMethod;
  }

  export function ensureFunctionIsInitialized(methodInfo) {
    var mi = methodInfo;

    // We use not having an analysis to mean "not initialized".
    if (!mi.analysis) {
      mi.analysis = new Analysis(mi);

      if (mi.needsActivation()) {
        mi.activationPrototype = new ActivationInfo(mi);
        new ActivationBindings(mi).applyTo(mi.abc.applicationDomain, mi.activationPrototype);
      }

      // If we have exceptions, make the catch scopes now.
      var exceptions = mi.exceptions;
      for (var i = 0, j = exceptions.length; i < j; i++) {
        var handler = exceptions[i];
        if (handler.varName) {
          var varTrait = Object.create(Trait.prototype);
          varTrait.kind = TRAIT.Slot;
          varTrait.name = handler.varName;
          varTrait.typeName = handler.typeName;
          varTrait.holder = mi;
          handler.scopeObject = new CatchScopeObject(mi.abc.applicationDomain, varTrait);
        } else {
          handler.scopeObject = new CatchScopeObject(undefined, undefined);
        }
      }
    }
  }

  /**
   * Gets the function associated with a given trait.
   */
  export function getTraitFunction(trait, scope, natives) {
    release || assert(scope);
    release || assert(trait.isMethod() || trait.isGetter() || trait.isSetter());

    var mi = trait.methodInfo;
    var fn;

    if (mi.isNative()) {
      var md = trait.metadata;
      if (md && md.native) {
        var nativeName = md.native.value[0].value;
        var makeNativeFunction = getNative(nativeName);
        fn = makeNativeFunction && makeNativeFunction(null, scope);
      } else if (md && md.unsafeJSNative) {
        fn = getNative(md.unsafeJSNative.value[0].value);
      } else if (natives) {
        // At this point the native class already had the scope, so we don't
        // need to close over the method again.
        var k = Multiname.getName(mi.name);
        if (trait.isGetter()) {
          fn = natives[k] ? natives[k].get : undefined;
        } else if (trait.isSetter()) {
          fn = natives[k] ? natives[k].set : undefined;
        } else {
          fn = natives[k];
        }
      }
      if (!fn) {
        Shumway.Debug.warning("No native method for: " + trait.kindName() + " " +
          mi.holder.name + "::" + Multiname.getQualifiedName(mi.name));
        return (function (mi) {
          return function () {
            Shumway.Debug.warning("Calling undefined native method: " + trait.kindName() +
              " " + mi.holder.name + "::" +
              Multiname.getQualifiedName(mi.name));
          };
        })(mi);
      }
    } else {
      if (traceExecution.value >= 2) {
        log("Creating Function For Trait: " + trait.holder + " " + trait);
      }
      fn = createFunction(mi, scope, false, false);
      release || assert (fn);
    }
    if (traceExecution.value >= 3) {
      log("Made Function: " + Multiname.getQualifiedName(mi.name));
    }
    return fn;
  }

  /**
   * ActionScript Classes are modeled as constructor functions (class objects) which hold additional properties:
   *
   * [scope]: a scope object holding the current class object
   *
   * [baseClass]: a reference to the base class object
   *
   * [instanceTraits]: an accumulated set of traits that are to be applied to instances of this class
   *
   * [prototype]: the prototype object of this constructor function  is populated with the set of instance traits,
   *   when instances are of this class are created, their __proto__ is set to this object thus inheriting this
   *   default set of properties.
   *
   * [construct]: a reference to the class object itself, this is used when invoking the constructor with an already
   *   constructed object (i.e. constructsuper)
   *
   * additionally, the class object also has a set of class traits applied to it which are visible via scope lookups.
   */
  export function createClass(classInfo, baseClass, scope) {
    release || assert (!baseClass || baseClass instanceof Class);

    var ci = classInfo;
    var ii = ci.instanceInfo;
    var domain = ci.abc.applicationDomain;

    var className = Multiname.getName(ii.name);
    if (traceExecution.value) {
      log("Creating " + (ii.isInterface() ? "Interface" : "Class") + ": " + className  + (ci.native ? " replaced with native " + ci.native.cls : ""));
    }

    var cls;

    if (ii.isInterface()) {
      cls = Interface.createInterface(classInfo);
    } else {
      cls = Class.createClass(classInfo, baseClass, scope);
    }

    if (traceClasses.value) {
      domain.loadedClasses.push(cls);
      domain.traceLoadedClasses(true);
    }

    if (ii.isInterface()) {
      return cls;
    }

    // Notify domain of class creation.
    domain.onMessage.notify1('classCreated', cls);

    if (cls.instanceConstructor && cls !== Class) {
      cls.verify();
    }

    // TODO: Seal constant traits in the instance object. This should be done after
    // the instance constructor has executed.

    if (baseClass && (Multiname.getQualifiedName(baseClass.classInfo.instanceInfo.name.name) === "Proxy" ||
      baseClass.isProxy)) {
      // TODO: This is very hackish.
      installProxyClassWrapper(cls);
      cls.isProxy = true;
    }

    classInfo.classObject = cls;

    // Run the static initializer.
    createFunction(classInfo.init, scope, false, false).call(cls);

    // Seal constant traits in the class object.
    if (sealConstTraits) {
      this.sealConstantTraits(cls, ci.traits);
    }

    return cls;
  }

  /**
   * In ActionScript, assigning to a property defined as "const" outside of a static or instance
   * initializer throws a |ReferenceError| exception. To emulate this behaviour in JavaScript,
   * we "seal" constant traits properties by replacing them with setters that throw exceptions.
   */
  export function sealConstantTraits(object, traits) {
    for (var i = 0, j = traits.length; i < j; i++) {
      var trait = traits[i];
      if (trait.isConst()) {
        var qn = Multiname.getQualifiedName(trait.name);
        var value = object[qn];
        (function (qn, value) {
          Object.defineProperty(object, qn, { configurable: false, enumerable: false,
            get: function () {
              return value;
            },
            set: function () {
              throwErrorFromVM(AVM2.currentDomain(), "ReferenceError", "Illegal write to read-only property " + qn + ".", 0);
            }
          });
        })(qn, value);
      }
    }
  }

  export function applyType(domain, factory, types) {
    var factoryClassName = factory.classInfo.instanceInfo.name.name;
    if (factoryClassName === "Vector") {
      release || assert(types.length === 1);
      var type = types[0];
      var typeClassName;
      if (!isNullOrUndefined(type)) {
        typeClassName = type.classInfo.instanceInfo.name.name.toLowerCase();
        switch (typeClassName) {
          case "int":
          case "uint":
          case "double":
          case "object":
            return domain.getClass("packageInternal __AS3__.vec.Vector$" + typeClassName);
        }
      }
      return domain.getClass("packageInternal __AS3__.vec.Vector$object").applyType(type);
    } else {
      return Shumway.Debug.notImplemented(factoryClassName);
    }
  }
}

import CC = Shumway.AVM2.Runtime.CODE_CACHE;
