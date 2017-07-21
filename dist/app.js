(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

class Container {
    constructor(registry, resolver = null) {
        this._registry = registry;
        this._resolver = resolver;
        this._lookups = {};
        this._factoryDefinitionLookups = {};
    }
    factoryFor(specifier) {
        let factoryDefinition = this._factoryDefinitionLookups[specifier];
        if (!factoryDefinition) {
            if (this._resolver) {
                factoryDefinition = this._resolver.retrieve(specifier);
            }
            if (!factoryDefinition) {
                factoryDefinition = this._registry.registration(specifier);
            }
            if (factoryDefinition) {
                this._factoryDefinitionLookups[specifier] = factoryDefinition;
            }
        }
        if (!factoryDefinition) {
            return;
        }
        return this.buildFactory(specifier, factoryDefinition);
    }
    lookup(specifier) {
        let singleton = this._registry.registeredOption(specifier, 'singleton') !== false;
        if (singleton && this._lookups[specifier]) {
            return this._lookups[specifier];
        }
        let factory = this.factoryFor(specifier);
        if (!factory) {
            return;
        }
        if (this._registry.registeredOption(specifier, 'instantiate') === false) {
            return factory.class;
        }
        let object = factory.create();
        if (singleton && object) {
            this._lookups[specifier] = object;
        }
        return object;
    }
    defaultInjections(specifier) {
        return {};
    }
    buildInjections(specifier) {
        let hash = this.defaultInjections(specifier);
        let injections = this._registry.registeredInjections(specifier);
        let injection;
        for (let i = 0; i < injections.length; i++) {
            injection = injections[i];
            hash[injection.property] = this.lookup(injection.source);
        }
        return hash;
    }
    buildFactory(specifier, factoryDefinition) {
        let injections = this.buildInjections(specifier);
        return {
            class: factoryDefinition,
            create(options) {
                let mergedOptions = Object.assign({}, injections, options);
                return factoryDefinition.create(mergedOptions);
            }
        };
    }
}

class Registry {
    constructor(options) {
        this._registrations = {};
        this._registeredOptions = {};
        this._registeredInjections = {};
        if (options && options.fallback) {
            this._fallback = options.fallback;
        }
    }
    register(specifier, factoryDefinition, options) {
        this._registrations[specifier] = factoryDefinition;
        if (options) {
            this._registeredOptions[specifier] = options;
        }
    }
    registration(specifier) {
        let registration = this._registrations[specifier];
        if (registration === undefined && this._fallback) {
            registration = this._fallback.registration(specifier);
        }
        return registration;
    }
    unregister(specifier) {
        delete this._registrations[specifier];
        delete this._registeredOptions[specifier];
        delete this._registeredInjections[specifier];
    }
    registerOption(specifier, option, value) {
        let options = this._registeredOptions[specifier];
        if (!options) {
            options = {};
            this._registeredOptions[specifier] = options;
        }
        options[option] = value;
    }
    registeredOption(specifier, option) {
        let result;
        let options = this.registeredOptions(specifier);
        if (options) {
            result = options[option];
        }
        if (result === undefined && this._fallback !== undefined) {
            result = this._fallback.registeredOption(specifier, option);
        }
        return result;
    }
    registeredOptions(specifier) {
        let options = this._registeredOptions[specifier];
        if (options === undefined) {
            var _specifier$split = specifier.split(':');

            let type = _specifier$split[0];

            options = this._registeredOptions[type];
        }
        return options;
    }
    unregisterOption(specifier, option) {
        let options = this._registeredOptions[specifier];
        if (options) {
            delete options[option];
        }
    }
    registerInjection(specifier, property, source) {
        let injections = this._registeredInjections[specifier];
        if (injections === undefined) {
            this._registeredInjections[specifier] = injections = [];
        }
        injections.push({
            property,
            source
        });
    }
    registeredInjections(specifier) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0];

        let injections = this._fallback ? this._fallback.registeredInjections(specifier) : [];
        Array.prototype.push.apply(injections, this._registeredInjections[type]);
        Array.prototype.push.apply(injections, this._registeredInjections[specifier]);
        return injections;
    }
}

// TODO - use symbol
const OWNER = '__owner__';
function getOwner(object) {
    return object[OWNER];
}
function setOwner(object, owner) {
    object[OWNER] = owner;
}

// There is a small whitelist of namespaced attributes specially
// enumerated in
// https://www.w3.org/TR/html/syntax.html#attributes-0
//
// > When a foreign element has one of the namespaced attributes given by
// > the local name and namespace of the first and second cells of a row
// > from the following table, it must be written using the name given by
// > the third cell from the same row.
//
// In all other cases, colons are interpreted as a regular character
// with no special meaning:
//
// > No other namespaced attribute can be expressed in the HTML syntax.

function unwrap(val) {
    if (val === null || val === undefined) throw new Error(`Expected value to be present`);
    return val;
}
function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
}
function unreachable() {
    return new Error('unreachable');
}
function typePos(lastOperand) {
    return lastOperand - 4;
}

// import Logger from './logger';
// let alreadyWarned = false;
function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
        throw new Error(msg || "assertion failure");
    }
}

var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 0] = "Trace";
    LogLevel[LogLevel["Debug"] = 1] = "Debug";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
class NullConsole {
    log(_message) {}
    warn(_message) {}
    error(_message) {}
    trace() {}
}
let ALWAYS;
class Logger {
    constructor({ console, level }) {
        this.f = ALWAYS;
        this.force = ALWAYS;
        this.console = console;
        this.level = level;
    }
    skipped(level) {
        return level < this.level;
    }
    trace(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Trace)) return;
        this.console.log(message);
        if (stackTrace) this.console.trace();
    }
    debug(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Debug)) return;
        this.console.log(message);
        if (stackTrace) this.console.trace();
    }
    warn(message, { stackTrace = false } = {}) {
        if (this.skipped(LogLevel.Warn)) return;
        this.console.warn(message);
        if (stackTrace) this.console.trace();
    }
    error(message) {
        if (this.skipped(LogLevel.Error)) return;
        this.console.error(message);
    }
}
let _console = typeof console === 'undefined' ? new NullConsole() : console;
ALWAYS = new Logger({ console: _console, level: LogLevel.Trace });
const LOG_LEVEL = LogLevel.Debug;
new Logger({ console: _console, level: LOG_LEVEL });

const objKeys = Object.keys;

function assign(obj) {
    for (let i = 1; i < arguments.length; i++) {
        let assignment = arguments[i];
        if (assignment === null || typeof assignment !== 'object') continue;
        let keys = objKeys(assignment);
        for (let j = 0; j < keys.length; j++) {
            let key = keys[j];
            obj[key] = assignment[key];
        }
    }
    return obj;
}
function fillNulls(count) {
    let arr = new Array(count);
    for (let i = 0; i < count; i++) {
        arr[i] = null;
    }
    return arr;
}

let GUID = 0;
function initializeGuid(object) {
    return object._guid = ++GUID;
}
function ensureGuid(object) {
    return object._guid || initializeGuid(object);
}

let proto = Object.create(null, {
    // without this, we will always still end up with (new
    // EmptyObject()).constructor === Object
    constructor: {
        value: undefined,
        enumerable: false,
        writable: true
    }
});
function EmptyObject() {}
EmptyObject.prototype = proto;
function dict() {
    // let d = Object.create(null);
    // d.x = 1;
    // delete d.x;
    // return d;
    return new EmptyObject();
}
class DictSet {
    constructor() {
        this.dict = dict();
    }
    add(obj) {
        if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[ensureGuid(obj)] = obj;
        return this;
    }
    delete(obj) {
        if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    }
    forEach(callback) {
        let dict = this.dict;

        let dictKeys = Object.keys(dict);
        for (let i = 0; dictKeys.length; i++) {
            callback(dict[dictKeys[i]]);
        }
    }
    toArray() {
        return Object.keys(this.dict);
    }
}
class Stack {
    constructor() {
        this.stack = [];
        this.current = null;
    }
    toArray() {
        return this.stack;
    }
    push(item) {
        this.current = item;
        this.stack.push(item);
    }
    pop() {
        let item = this.stack.pop();
        let len = this.stack.length;
        this.current = len === 0 ? null : this.stack[len - 1];
        return item === undefined ? null : item;
    }
    isEmpty() {
        return this.stack.length === 0;
    }
}

class ListNode {
    constructor(value) {
        this.next = null;
        this.prev = null;
        this.value = value;
    }
}
class LinkedList {
    constructor() {
        this.clear();
    }
    static fromSlice(slice) {
        let list = new LinkedList();
        slice.forEachNode(n => list.append(n.clone()));
        return list;
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    clear() {
        this._head = this._tail = null;
    }
    isEmpty() {
        return this._head === null;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    splice(start, end, reference) {
        let before;
        if (reference === null) {
            before = this._tail;
            this._tail = end;
        } else {
            before = reference.prev;
            end.next = reference;
            reference.prev = end;
        }
        if (before) {
            before.next = start;
            start.prev = before;
        }
    }
    nextNode(node) {
        return node.next;
    }
    prevNode(node) {
        return node.prev;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = node.next;
        }
    }
    contains(needle) {
        let node = this._head;
        while (node !== null) {
            if (node === needle) return true;
            node = node.next;
        }
        return false;
    }
    insertBefore(node, reference = null) {
        if (reference === null) return this.append(node);
        if (reference.prev) reference.prev.next = node;else this._head = node;
        node.prev = reference.prev;
        node.next = reference;
        reference.prev = node;
        return node;
    }
    append(node) {
        let tail = this._tail;
        if (tail) {
            tail.next = node;
            node.prev = tail;
            node.next = null;
        } else {
            this._head = node;
        }
        return this._tail = node;
    }
    pop() {
        if (this._tail) return this.remove(this._tail);
        return null;
    }
    prepend(node) {
        if (this._head) return this.insertBefore(node, this._head);
        return this._head = this._tail = node;
    }
    remove(node) {
        if (node.prev) node.prev.next = node.next;else this._head = node.next;
        if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
        return node;
    }
}
class ListSlice {
    constructor(head, tail) {
        this._head = head;
        this._tail = tail;
    }
    static toList(slice) {
        let list = new LinkedList();
        slice.forEachNode(n => list.append(n.clone()));
        return list;
    }
    forEachNode(callback) {
        let node = this._head;
        while (node !== null) {
            callback(node);
            node = this.nextNode(node);
        }
    }
    contains(needle) {
        let node = this._head;
        while (node !== null) {
            if (node === needle) return true;
            node = node.next;
        }
        return false;
    }
    head() {
        return this._head;
    }
    tail() {
        return this._tail;
    }
    toArray() {
        let out = [];
        this.forEachNode(n => out.push(n));
        return out;
    }
    nextNode(node) {
        if (node === this._tail) return null;
        return node.next;
    }
    prevNode(node) {
        if (node === this._head) return null;
        return node.prev;
    }
    isEmpty() {
        return false;
    }
}
const EMPTY_SLICE = new ListSlice(null, null);

const HAS_NATIVE_WEAKMAP = function () {
    // detect if `WeakMap` is even present
    let hasWeakMap = typeof WeakMap === 'function';
    if (!hasWeakMap) {
        return false;
    }
    let instance = new WeakMap();
    // use `Object`'s `.toString` directly to prevent us from detecting
    // polyfills as native weakmaps
    return Object.prototype.toString.call(instance) === '[object WeakMap]';
}();

const HAS_TYPED_ARRAYS = typeof Uint32Array !== 'undefined';
let A;
if (HAS_TYPED_ARRAYS) {
    A = Uint32Array;
} else {
    A = Array;
}
const EMPTY_ARRAY = HAS_NATIVE_WEAKMAP ? Object.freeze([]) : [];

var Register;
(function (Register) {
    // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
    Register[Register["pc"] = 0] = "pc";
    // $1 or $ra (return address): pointer into `program` for the return
    Register[Register["ra"] = 1] = "ra";
    // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
    Register[Register["fp"] = 2] = "fp";
    // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
    Register[Register["sp"] = 3] = "sp";
    // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
    Register[Register["s0"] = 4] = "s0";
    Register[Register["s1"] = 5] = "s1";
    // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
    Register[Register["t0"] = 6] = "t0";
    Register[Register["t1"] = 7] = "t1";
})(Register || (Register = {}));

class AppendOpcodes {
    constructor() {
        this.evaluateOpcode = fillNulls(72 /* Size */).slice();
    }
    add(name, evaluate) {
        this.evaluateOpcode[name] = evaluate;
    }
    evaluate(vm, opcode, type) {
        let func = this.evaluateOpcode[type];
        func(vm, opcode);
        
    }
}
const APPEND_OPCODES = new AppendOpcodes();
class AbstractOpcode {
    constructor() {
        initializeGuid(this);
    }
    toJSON() {
        return { guid: this._guid, type: this.type };
    }
}
class UpdatingOpcode extends AbstractOpcode {
    constructor() {
        super(...arguments);
        this.next = null;
        this.prev = null;
    }
}

const CONSTANT = 0;
const INITIAL = 1;
const VOLATILE = NaN;
class RevisionTag {
    validate(snapshot) {
        return this.value() === snapshot;
    }
}
RevisionTag.id = 0;
const VALUE = [];
const VALIDATE = [];
class TagWrapper {
    constructor(type, inner) {
        this.type = type;
        this.inner = inner;
    }
    value() {
        let func = VALUE[this.type];
        return func(this.inner);
    }
    validate(snapshot) {
        let func = VALIDATE[this.type];
        return func(this.inner, snapshot);
    }
}
function register(Type) {
    let type = VALUE.length;
    VALUE.push(tag => tag.value());
    VALIDATE.push((tag, snapshot) => tag.validate(snapshot));
    Type.id = type;
}
///
// CONSTANT: 0
VALUE.push(() => CONSTANT);
VALIDATE.push((_tag, snapshot) => snapshot === CONSTANT);
const CONSTANT_TAG = new TagWrapper(0, null);
// VOLATILE: 1
VALUE.push(() => VOLATILE);
VALIDATE.push((_tag, snapshot) => snapshot === VOLATILE);
const VOLATILE_TAG = new TagWrapper(1, null);
// CURRENT: 2
VALUE.push(() => $REVISION);
VALIDATE.push((_tag, snapshot) => snapshot === $REVISION);
const CURRENT_TAG = new TagWrapper(2, null);
///
let $REVISION = INITIAL;
class DirtyableTag extends RevisionTag {
    static create(revision = $REVISION) {
        return new TagWrapper(this.id, new DirtyableTag(revision));
    }
    constructor(revision = $REVISION) {
        super();
        this.revision = revision;
    }
    value() {
        return this.revision;
    }
    dirty() {
        this.revision = ++$REVISION;
    }
}
register(DirtyableTag);
function combineTagged(tagged) {
    let optimized = [];
    for (let i = 0, l = tagged.length; i < l; i++) {
        let tag = tagged[i].tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function combineSlice(slice) {
    let optimized = [];
    let node = slice.head();
    while (node !== null) {
        let tag = node.tag;
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag !== CONSTANT_TAG) optimized.push(tag);
        node = slice.nextNode(node);
    }
    return _combine(optimized);
}
function combine(tags) {
    let optimized = [];
    for (let i = 0, l = tags.length; i < l; i++) {
        let tag = tags[i];
        if (tag === VOLATILE_TAG) return VOLATILE_TAG;
        if (tag === CONSTANT_TAG) continue;
        optimized.push(tag);
    }
    return _combine(optimized);
}
function _combine(tags) {
    switch (tags.length) {
        case 0:
            return CONSTANT_TAG;
        case 1:
            return tags[0];
        case 2:
            return TagsPair.create(tags[0], tags[1]);
        default:
            return TagsCombinator.create(tags);
    }
    
}
class CachedTag extends RevisionTag {
    constructor() {
        super(...arguments);
        this.lastChecked = null;
        this.lastValue = null;
    }
    value() {
        let lastChecked = this.lastChecked,
            lastValue = this.lastValue;

        if (lastChecked !== $REVISION) {
            this.lastChecked = $REVISION;
            this.lastValue = lastValue = this.compute();
        }
        return this.lastValue;
    }
    invalidate() {
        this.lastChecked = null;
    }
}
class TagsPair extends CachedTag {
    static create(first, second) {
        return new TagWrapper(this.id, new TagsPair(first, second));
    }
    constructor(first, second) {
        super();
        this.first = first;
        this.second = second;
    }
    compute() {
        return Math.max(this.first.value(), this.second.value());
    }
}
register(TagsPair);
class TagsCombinator extends CachedTag {
    static create(tags) {
        return new TagWrapper(this.id, new TagsCombinator(tags));
    }
    constructor(tags) {
        super();
        this.tags = tags;
    }
    compute() {
        let tags = this.tags;

        let max = -1;
        for (let i = 0; i < tags.length; i++) {
            let value = tags[i].value();
            max = Math.max(value, max);
        }
        return max;
    }
}
register(TagsCombinator);
class UpdatableTag extends CachedTag {
    static create(tag) {
        return new TagWrapper(this.id, new UpdatableTag(tag));
    }
    constructor(tag) {
        super();
        this.tag = tag;
        this.lastUpdated = INITIAL;
    }
    compute() {
        return Math.max(this.lastUpdated, this.tag.value());
    }
    update(tag) {
        if (tag !== this.tag) {
            this.tag = tag;
            this.lastUpdated = $REVISION;
            this.invalidate();
        }
    }
}
register(UpdatableTag);
class CachedReference {
    constructor() {
        this.lastRevision = null;
        this.lastValue = null;
    }
    value() {
        let tag = this.tag,
            lastRevision = this.lastRevision,
            lastValue = this.lastValue;

        if (!lastRevision || !tag.validate(lastRevision)) {
            lastValue = this.lastValue = this.compute();
            this.lastRevision = tag.value();
        }
        return lastValue;
    }
    invalidate() {
        this.lastRevision = null;
    }
}
class MapperReference extends CachedReference {
    constructor(reference, mapper) {
        super();
        this.tag = reference.tag;
        this.reference = reference;
        this.mapper = mapper;
    }
    compute() {
        let reference = this.reference,
            mapper = this.mapper;

        return mapper(reference.value());
    }
}
function map(reference, mapper) {
    return new MapperReference(reference, mapper);
}
//////////
class ReferenceCache {
    constructor(reference) {
        this.lastValue = null;
        this.lastRevision = null;
        this.initialized = false;
        this.tag = reference.tag;
        this.reference = reference;
    }
    peek() {
        if (!this.initialized) {
            return this.initialize();
        }
        return this.lastValue;
    }
    revalidate() {
        if (!this.initialized) {
            return this.initialize();
        }
        let reference = this.reference,
            lastRevision = this.lastRevision;

        let tag = reference.tag;
        if (tag.validate(lastRevision)) return NOT_MODIFIED;
        this.lastRevision = tag.value();
        let lastValue = this.lastValue;

        let value = reference.value();
        if (value === lastValue) return NOT_MODIFIED;
        this.lastValue = value;
        return value;
    }
    initialize() {
        let reference = this.reference;

        let value = this.lastValue = reference.value();
        this.lastRevision = reference.tag.value();
        this.initialized = true;
        return value;
    }
}
const NOT_MODIFIED = "adb3b78e-3d22-4e4b-877a-6317c2c5c145";
function isModified(value) {
    return value !== NOT_MODIFIED;
}

class ConstReference {
    constructor(inner) {
        this.inner = inner;
        this.tag = CONSTANT_TAG;
    }
    value() {
        return this.inner;
    }
}
function isConst(reference) {
    return reference.tag === CONSTANT_TAG;
}

class ListItem extends ListNode {
    constructor(iterable, result) {
        super(iterable.valueReferenceFor(result));
        this.retained = false;
        this.seen = false;
        this.key = result.key;
        this.iterable = iterable;
        this.memo = iterable.memoReferenceFor(result);
    }
    update(item) {
        this.retained = true;
        this.iterable.updateValueReference(this.value, item);
        this.iterable.updateMemoReference(this.memo, item);
    }
    shouldRemove() {
        return !this.retained;
    }
    reset() {
        this.retained = false;
        this.seen = false;
    }
}
class IterationArtifacts {
    constructor(iterable) {
        this.map = dict();
        this.list = new LinkedList();
        this.tag = iterable.tag;
        this.iterable = iterable;
    }
    isEmpty() {
        let iterator = this.iterator = this.iterable.iterate();
        return iterator.isEmpty();
    }
    iterate() {
        let iterator = this.iterator || this.iterable.iterate();
        this.iterator = null;
        return iterator;
    }
    has(key) {
        return !!this.map[key];
    }
    get(key) {
        return this.map[key];
    }
    wasSeen(key) {
        let node = this.map[key];
        return node && node.seen;
    }
    append(item) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        list.append(node);
        return node;
    }
    insertBefore(item, reference) {
        let map = this.map,
            list = this.list,
            iterable = this.iterable;

        let node = map[item.key] = new ListItem(iterable, item);
        node.retained = true;
        list.insertBefore(node, reference);
        return node;
    }
    move(item, reference) {
        let list = this.list;

        item.retained = true;
        list.remove(item);
        list.insertBefore(item, reference);
    }
    remove(item) {
        let list = this.list;

        list.remove(item);
        delete this.map[item.key];
    }
    nextNode(item) {
        return this.list.nextNode(item);
    }
    head() {
        return this.list.head();
    }
}
class ReferenceIterator {
    // if anyone needs to construct this object with something other than
    // an iterable, let @wycats know.
    constructor(iterable) {
        this.iterator = null;
        let artifacts = new IterationArtifacts(iterable);
        this.artifacts = artifacts;
    }
    next() {
        let artifacts = this.artifacts;

        let iterator = this.iterator = this.iterator || artifacts.iterate();
        let item = iterator.next();
        if (!item) return null;
        return artifacts.append(item);
    }
}
var Phase;
(function (Phase) {
    Phase[Phase["Append"] = 0] = "Append";
    Phase[Phase["Prune"] = 1] = "Prune";
    Phase[Phase["Done"] = 2] = "Done";
})(Phase || (Phase = {}));
class IteratorSynchronizer {
    constructor({ target, artifacts }) {
        this.target = target;
        this.artifacts = artifacts;
        this.iterator = artifacts.iterate();
        this.current = artifacts.head();
    }
    sync() {
        let phase = Phase.Append;
        while (true) {
            switch (phase) {
                case Phase.Append:
                    phase = this.nextAppend();
                    break;
                case Phase.Prune:
                    phase = this.nextPrune();
                    break;
                case Phase.Done:
                    this.nextDone();
                    return;
            }
        }
    }
    advanceToKey(key) {
        let current = this.current,
            artifacts = this.artifacts;

        let seek = current;
        while (seek && seek.key !== key) {
            seek.seen = true;
            seek = artifacts.nextNode(seek);
        }
        this.current = seek && artifacts.nextNode(seek);
    }
    nextAppend() {
        let iterator = this.iterator,
            current = this.current,
            artifacts = this.artifacts;

        let item = iterator.next();
        if (item === null) {
            return this.startPrune();
        }
        let key = item.key;

        if (current && current.key === key) {
            this.nextRetain(item);
        } else if (artifacts.has(key)) {
            this.nextMove(item);
        } else {
            this.nextInsert(item);
        }
        return Phase.Append;
    }
    nextRetain(item) {
        let artifacts = this.artifacts,
            current = this.current;

        current = expect(current, 'BUG: current is empty');
        current.update(item);
        this.current = artifacts.nextNode(current);
        this.target.retain(item.key, current.value, current.memo);
    }
    nextMove(item) {
        let current = this.current,
            artifacts = this.artifacts,
            target = this.target;
        let key = item.key;

        let found = artifacts.get(item.key);
        found.update(item);
        if (artifacts.wasSeen(item.key)) {
            artifacts.move(found, current);
            target.move(found.key, found.value, found.memo, current ? current.key : null);
        } else {
            this.advanceToKey(key);
        }
    }
    nextInsert(item) {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        let node = artifacts.insertBefore(item, current);
        target.insert(node.key, node.value, node.memo, current ? current.key : null);
    }
    startPrune() {
        this.current = this.artifacts.head();
        return Phase.Prune;
    }
    nextPrune() {
        let artifacts = this.artifacts,
            target = this.target,
            current = this.current;

        if (current === null) {
            return Phase.Done;
        }
        let node = current;
        this.current = artifacts.nextNode(node);
        if (node.shouldRemove()) {
            artifacts.remove(node);
            target.delete(node.key);
        } else {
            node.reset();
        }
        return Phase.Prune;
    }
    nextDone() {
        this.target.done();
    }
}

class PrimitiveReference extends ConstReference {
    constructor(value) {
        super(value);
    }
    static create(value) {
        if (value === undefined) {
            return UNDEFINED_REFERENCE;
        } else if (value === null) {
            return NULL_REFERENCE;
        } else if (value === true) {
            return TRUE_REFERENCE;
        } else if (value === false) {
            return FALSE_REFERENCE;
        } else if (typeof value === 'number') {
            return new ValueReference(value);
        } else {
            return new StringReference(value);
        }
    }
    get(_key) {
        return UNDEFINED_REFERENCE;
    }
}
class StringReference extends PrimitiveReference {
    constructor() {
        super(...arguments);
        this.lengthReference = null;
    }
    get(key) {
        if (key === 'length') {
            let lengthReference = this.lengthReference;

            if (lengthReference === null) {
                lengthReference = this.lengthReference = new ValueReference(this.inner.length);
            }
            return lengthReference;
        } else {
            return super.get(key);
        }
    }
}
class ValueReference extends PrimitiveReference {
    constructor(value) {
        super(value);
    }
}
const UNDEFINED_REFERENCE = new ValueReference(undefined);
const NULL_REFERENCE = new ValueReference(null);
const TRUE_REFERENCE = new ValueReference(true);
const FALSE_REFERENCE = new ValueReference(false);
class ConditionalReference {
    constructor(inner) {
        this.inner = inner;
        this.tag = inner.tag;
    }
    value() {
        return this.toBool(this.inner.value());
    }
    toBool(value) {
        return !!value;
    }
}

class ConcatReference extends CachedReference {
    constructor(parts) {
        super();
        this.parts = parts;
        this.tag = combineTagged(parts);
    }
    compute() {
        let parts = new Array();
        for (let i = 0; i < this.parts.length; i++) {
            let value = this.parts[i].value();
            if (value !== null && value !== undefined) {
                parts[i] = castToString(value);
            }
        }
        if (parts.length > 0) {
            return parts.join('');
        }
        return null;
    }
}
function castToString(value) {
    if (typeof value.toString !== 'function') {
        return '';
    }
    return String(value);
}

APPEND_OPCODES.add(1 /* Helper */, (vm, { op1: _helper }) => {
    let stack = vm.stack;
    let helper = vm.constants.getFunction(_helper);
    let args = stack.pop();
    let value = helper(vm, args);
    args.clear();
    vm.stack.push(value);
});
APPEND_OPCODES.add(2 /* Function */, (vm, { op1: _function }) => {
    let func = vm.constants.getFunction(_function);
    vm.stack.push(func(vm));
});
APPEND_OPCODES.add(5 /* GetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.referenceForSymbol(symbol);
    vm.stack.push(expr);
});
APPEND_OPCODES.add(4 /* SetVariable */, (vm, { op1: symbol }) => {
    let expr = vm.stack.pop();
    vm.scope().bindSymbol(symbol, expr);
});
APPEND_OPCODES.add(70 /* ResolveMaybeLocal */, (vm, { op1: _name }) => {
    let name = vm.constants.getString(_name);
    let locals = vm.scope().getPartialMap();
    let ref = locals[name];
    if (ref === undefined) {
        ref = vm.getSelf().get(name);
    }
    vm.stack.push(ref);
});
APPEND_OPCODES.add(19 /* RootScope */, (vm, { op1: symbols, op2: bindCallerScope }) => {
    vm.pushRootScope(symbols, !!bindCallerScope);
});
APPEND_OPCODES.add(6 /* GetProperty */, (vm, { op1: _key }) => {
    let key = vm.constants.getString(_key);
    let expr = vm.stack.pop();
    vm.stack.push(expr.get(key));
});
APPEND_OPCODES.add(7 /* PushBlock */, (vm, { op1: _block }) => {
    let block = _block ? vm.constants.getBlock(_block) : null;
    vm.stack.push(block);
});
APPEND_OPCODES.add(8 /* GetBlock */, (vm, { op1: _block }) => {
    vm.stack.push(vm.scope().getBlock(_block));
});
APPEND_OPCODES.add(9 /* HasBlock */, (vm, { op1: _block }) => {
    let hasBlock = !!vm.scope().getBlock(_block);
    vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(10 /* HasBlockParams */, (vm, { op1: _block }) => {
    let block = vm.scope().getBlock(_block);
    let hasBlockParams = block && block.symbolTable.parameters.length;
    vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(11 /* Concat */, (vm, { op1: count }) => {
    let out = [];
    for (let i = count; i > 0; i--) {
        out.push(vm.stack.pop());
    }
    vm.stack.push(new ConcatReference(out.reverse()));
});

class Arguments {
    constructor() {
        this.stack = null;
        this.positional = new PositionalArguments();
        this.named = new NamedArguments();
    }
    empty() {
        this.setup(null, true);
        return this;
    }
    setup(stack, synthetic) {
        this.stack = stack;
        let names = stack.fromTop(0);
        let namedCount = names.length;
        let positionalCount = stack.fromTop(namedCount + 1);
        let start = positionalCount + namedCount + 2;
        let positional = this.positional;
        positional.setup(stack, start, positionalCount);
        let named = this.named;
        named.setup(stack, namedCount, names, synthetic);
    }
    get tag() {
        return combineTagged([this.positional, this.named]);
    }
    get length() {
        return this.positional.length + this.named.length;
    }
    at(pos) {
        return this.positional.at(pos);
    }
    get(name) {
        return this.named.get(name);
    }
    capture() {
        return {
            tag: this.tag,
            length: this.length,
            positional: this.positional.capture(),
            named: this.named.capture()
        };
    }
    clear() {
        let stack = this.stack,
            length = this.length;

        stack.pop(length + 2);
    }
}
class PositionalArguments {
    constructor() {
        this.length = 0;
        this.stack = null;
        this.start = 0;
        this._tag = null;
        this._references = null;
    }
    setup(stack, start, length) {
        this.stack = stack;
        this.start = start;
        this.length = length;
        this._tag = null;
        this._references = null;
    }
    get tag() {
        let tag = this._tag;
        if (!tag) {
            tag = this._tag = combineTagged(this.references);
        }
        return tag;
    }
    at(position) {
        let start = this.start,
            length = this.length;

        if (position < 0 || position >= length) {
            return UNDEFINED_REFERENCE;
        }
        // stack: pos1, pos2, pos3, named1, named2
        // start: 4 (top - 4)
        //
        // at(0) === pos1 === top - start
        // at(1) === pos2 === top - (start - 1)
        // at(2) === pos3 === top - (start - 2)
        let fromTop = start - position - 1;
        return this.stack.fromTop(fromTop);
    }
    capture() {
        return new CapturedPositionalArguments(this.tag, this.references);
    }
    get references() {
        let references = this._references;
        if (!references) {
            let length = this.length;

            references = this._references = new Array(length);
            for (let i = 0; i < length; i++) {
                references[i] = this.at(i);
            }
        }
        return references;
    }
}
class CapturedPositionalArguments {
    constructor(tag, references, length = references.length) {
        this.tag = tag;
        this.references = references;
        this.length = length;
    }
    at(position) {
        return this.references[position];
    }
    value() {
        return this.references.map(this.valueOf);
    }
    get(name) {
        let references = this.references,
            length = this.length;

        if (name === 'length') {
            return PrimitiveReference.create(length);
        } else {
            let idx = parseInt(name, 10);
            if (idx < 0 || idx >= length) {
                return UNDEFINED_REFERENCE;
            } else {
                return references[idx];
            }
        }
    }
    valueOf(reference) {
        return reference.value();
    }
}
class NamedArguments {
    constructor() {
        this.length = 0;
        this._tag = null;
        this._references = null;
        this._names = null;
        this._realNames = EMPTY_ARRAY;
    }
    setup(stack, length, names, synthetic) {
        this.stack = stack;
        this.length = length;
        this._tag = null;
        this._references = null;
        if (synthetic) {
            this._names = names;
            this._realNames = EMPTY_ARRAY;
        } else {
            this._names = null;
            this._realNames = names;
        }
    }
    get tag() {
        return combineTagged(this.references);
    }
    get names() {
        let names = this._names;
        if (!names) {
            names = this._names = this._realNames.map(this.sliceName);
        }
        return names;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let names = this.names,
            length = this.length;

        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        }
        // stack: pos1, pos2, pos3, named1, named2
        // start: 4 (top - 4)
        // namedDict: { named1: 1, named2: 0 };
        //
        // get('named1') === named1 === top - (start - 1)
        // get('named2') === named2 === top - start
        let fromTop = length - idx;
        return this.stack.fromTop(fromTop);
    }
    capture() {
        return new CapturedNamedArguments(this.tag, this.names, this.references);
    }
    get references() {
        let references = this._references;
        if (!references) {
            let names = this.names,
                length = this.length;

            references = this._references = [];
            for (let i = 0; i < length; i++) {
                references[i] = this.get(names[i]);
            }
        }
        return references;
    }
    sliceName(name) {
        return name.slice(1);
    }
}
class CapturedNamedArguments {
    constructor(tag, names, references) {
        this.tag = tag;
        this.names = names;
        this.references = references;
        this.length = names.length;
        this._map = null;
    }
    get map() {
        let map$$1 = this._map;
        if (!map$$1) {
            let names = this.names,
                references = this.references;

            map$$1 = this._map = dict();
            for (let i = 0; i < names.length; i++) {
                let name = names[i];
                map$$1[name] = references[i];
            }
        }
        return map$$1;
    }
    has(name) {
        return this.names.indexOf(name) !== -1;
    }
    get(name) {
        let names = this.names,
            references = this.references;

        let idx = names.indexOf(name);
        if (idx === -1) {
            return UNDEFINED_REFERENCE;
        } else {
            return references[idx];
        }
    }
    value() {
        let names = this.names,
            references = this.references;

        let out = dict();
        for (let i = 0; i < names.length; i++) {
            let name = names[i];
            out[name] = references[i].value();
        }
        return out;
    }
}
var ARGS = new Arguments();

APPEND_OPCODES.add(20 /* ChildScope */, vm => vm.pushChildScope());
APPEND_OPCODES.add(21 /* PopScope */, vm => vm.popScope());
APPEND_OPCODES.add(39 /* PushDynamicScope */, vm => vm.pushDynamicScope());
APPEND_OPCODES.add(40 /* PopDynamicScope */, vm => vm.popDynamicScope());
APPEND_OPCODES.add(12 /* Immediate */, (vm, { op1: number }) => {
    vm.stack.push(number);
});
APPEND_OPCODES.add(13 /* Constant */, (vm, { op1: other }) => {
    vm.stack.push(vm.constants.getOther(other));
});
APPEND_OPCODES.add(14 /* PrimitiveReference */, (vm, { op1: primitive }) => {
    let stack = vm.stack;
    let flag = (primitive & 3 << 30) >>> 30;
    let value = primitive & ~(3 << 30);
    switch (flag) {
        case 0:
            stack.push(PrimitiveReference.create(value));
            break;
        case 1:
            stack.push(PrimitiveReference.create(vm.constants.getString(value)));
            break;
        case 2:
            switch (value) {
                case 0:
                    stack.push(FALSE_REFERENCE);
                    break;
                case 1:
                    stack.push(TRUE_REFERENCE);
                    break;
                case 2:
                    stack.push(NULL_REFERENCE);
                    break;
                case 3:
                    stack.push(UNDEFINED_REFERENCE);
                    break;
            }
            break;
    }
});
APPEND_OPCODES.add(15 /* Dup */, (vm, { op1: register, op2: offset }) => {
    let position = vm.fetchValue(register) - offset;
    vm.stack.dup(position);
});
APPEND_OPCODES.add(16 /* Pop */, (vm, { op1: count }) => vm.stack.pop(count));
APPEND_OPCODES.add(17 /* Load */, (vm, { op1: register }) => vm.load(register));
APPEND_OPCODES.add(18 /* Fetch */, (vm, { op1: register }) => vm.fetch(register));
APPEND_OPCODES.add(38 /* BindDynamicScope */, (vm, { op1: _names }) => {
    let names = vm.constants.getArray(_names);
    vm.bindDynamicScope(names);
});
APPEND_OPCODES.add(47 /* PushFrame */, vm => vm.pushFrame());
APPEND_OPCODES.add(48 /* PopFrame */, vm => vm.popFrame());
APPEND_OPCODES.add(49 /* Enter */, (vm, { op1: args }) => vm.enter(args));
APPEND_OPCODES.add(50 /* Exit */, vm => vm.exit());
APPEND_OPCODES.add(41 /* CompileDynamicBlock */, vm => {
    let stack = vm.stack;
    let block = stack.pop();
    stack.push(block ? block.compileDynamic(vm.env) : null);
});
APPEND_OPCODES.add(42 /* InvokeStatic */, (vm, { op1: _block }) => {
    let block = vm.constants.getBlock(_block);
    let compiled = block.compileStatic(vm.env);
    vm.call(compiled.handle);
});
APPEND_OPCODES.add(43 /* InvokeDynamic */, (vm, { op1: _invoker }) => {
    let invoker = vm.constants.getOther(_invoker);
    let block = vm.stack.pop();
    invoker.invoke(vm, block);
});
APPEND_OPCODES.add(44 /* Jump */, (vm, { op1: target }) => vm.goto(target));
APPEND_OPCODES.add(45 /* JumpIf */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(46 /* JumpUnless */, (vm, { op1: target }) => {
    let reference = vm.stack.pop();
    if (isConst(reference)) {
        if (!reference.value()) {
            vm.goto(target);
        }
    } else {
        let cache = new ReferenceCache(reference);
        if (!cache.peek()) {
            vm.goto(target);
        }
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(22 /* Return */, vm => vm.return());
APPEND_OPCODES.add(23 /* ReturnTo */, (vm, { op1: relative }) => {
    vm.returnTo(relative);
});
const ConstTest = function ConstTest(ref, _env) {
    return new ConstReference(!!ref.value());
};
const SimpleTest = function SimpleTest(ref, _env) {
    return ref;
};
const EnvironmentTest = function EnvironmentTest(ref, env) {
    return env.toConditionalReference(ref);
};
APPEND_OPCODES.add(51 /* Test */, (vm, { op1: _func }) => {
    let stack = vm.stack;
    let operand = stack.pop();
    let func = vm.constants.getFunction(_func);
    stack.push(func(operand, vm.env));
});
class Assert extends UpdatingOpcode {
    constructor(cache) {
        super();
        this.type = 'assert';
        this.tag = cache.tag;
        this.cache = cache;
    }
    evaluate(vm) {
        let cache = this.cache;

        if (isModified(cache.revalidate())) {
            vm.throw();
        }
    }
    toJSON() {
        let type = this.type,
            _guid = this._guid,
            cache = this.cache;

        let expected;
        try {
            expected = JSON.stringify(cache.peek());
        } catch (e) {
            expected = String(cache.peek());
        }
        return {
            args: [],
            details: { expected },
            guid: _guid,
            type
        };
    }
}
class JumpIfNotModifiedOpcode extends UpdatingOpcode {
    constructor(tag, target) {
        super();
        this.target = target;
        this.type = 'jump-if-not-modified';
        this.tag = tag;
        this.lastRevision = tag.value();
    }
    evaluate(vm) {
        let tag = this.tag,
            target = this.target,
            lastRevision = this.lastRevision;

        if (!vm.alwaysRevalidate && tag.validate(lastRevision)) {
            vm.goto(target);
        }
    }
    didModify() {
        this.lastRevision = this.tag.value();
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.target.inspect())],
            guid: this._guid,
            type: this.type
        };
    }
}
class DidModifyOpcode extends UpdatingOpcode {
    constructor(target) {
        super();
        this.target = target;
        this.type = 'did-modify';
        this.tag = CONSTANT_TAG;
    }
    evaluate() {
        this.target.didModify();
    }
}
class LabelOpcode {
    constructor(label) {
        this.tag = CONSTANT_TAG;
        this.type = 'label';
        this.label = null;
        this.prev = null;
        this.next = null;
        initializeGuid(this);
        this.label = label;
    }
    evaluate() {}
    inspect() {
        return `${this.label} [${this._guid}]`;
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.inspect())],
            guid: this._guid,
            type: this.type
        };
    }
}

APPEND_OPCODES.add(24 /* Text */, (vm, { op1: text }) => {
    vm.elements().appendText(vm.constants.getString(text));
});
APPEND_OPCODES.add(25 /* Comment */, (vm, { op1: text }) => {
    vm.elements().appendComment(vm.constants.getString(text));
});
APPEND_OPCODES.add(27 /* OpenElement */, (vm, { op1: tag }) => {
    vm.elements().openElement(vm.constants.getString(tag));
});
APPEND_OPCODES.add(28 /* OpenElementWithOperations */, (vm, { op1: tag }) => {
    let tagName = vm.constants.getString(tag);
    let operations = vm.stack.pop();
    vm.elements().openElement(tagName, operations);
});
APPEND_OPCODES.add(29 /* OpenDynamicElement */, vm => {
    let operations = vm.stack.pop();
    let tagName = vm.stack.pop().value();
    vm.elements().openElement(tagName, operations);
});
APPEND_OPCODES.add(36 /* PushRemoteElement */, vm => {
    let elementRef = vm.stack.pop();
    let nextSiblingRef = vm.stack.pop();
    let element;
    let nextSibling;
    if (isConst(elementRef)) {
        element = elementRef.value();
    } else {
        let cache = new ReferenceCache(elementRef);
        element = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    if (isConst(nextSiblingRef)) {
        nextSibling = nextSiblingRef.value();
    } else {
        let cache = new ReferenceCache(nextSiblingRef);
        nextSibling = cache.peek();
        vm.updateWith(new Assert(cache));
    }
    vm.elements().pushRemoteElement(element, nextSibling);
});
APPEND_OPCODES.add(37 /* PopRemoteElement */, vm => vm.elements().popRemoteElement());
class ClassList {
    constructor() {
        this.list = null;
        this.isConst = true;
    }
    append(reference) {
        let list = this.list,
            isConst$$1 = this.isConst;

        if (list === null) list = this.list = [];
        list.push(reference);
        this.isConst = isConst$$1 && isConst(reference);
    }
    toReference() {
        let list = this.list,
            isConst$$1 = this.isConst;

        if (!list) return NULL_REFERENCE;
        if (isConst$$1) return PrimitiveReference.create(toClassName(list));
        return new ClassListReference(list);
    }
}
class ClassListReference extends CachedReference {
    constructor(list) {
        super();
        this.list = [];
        this.tag = combineTagged(list);
        this.list = list;
    }
    compute() {
        return toClassName(this.list);
    }
}
function toClassName(list) {
    let ret = [];
    for (let i = 0; i < list.length; i++) {
        let value = list[i].value();
        if (value !== false && value !== null && value !== undefined) ret.push(value);
    }
    return ret.length === 0 ? null : ret.join(' ');
}
class SimpleElementOperations {
    constructor(env) {
        this.env = env;
        this.opcodes = null;
        this.classList = null;
    }
    addStaticAttribute(element, name, value) {
        if (name === 'class') {
            this.addClass(PrimitiveReference.create(value));
        } else {
            this.env.getAppendOperations().setAttribute(element, name, value);
        }
    }
    addStaticAttributeNS(element, namespace, name, value) {
        this.env.getAppendOperations().setAttribute(element, name, value, namespace);
    }
    addDynamicAttribute(element, name, reference, isTrusting) {
        if (name === 'class') {
            this.addClass(reference);
        } else {
            let attributeManager = this.env.attributeFor(element, name, isTrusting);
            let attribute = new DynamicAttribute(element, attributeManager, name, reference);
            this.addAttribute(attribute);
        }
    }
    addDynamicAttributeNS(element, namespace, name, reference, isTrusting) {
        let attributeManager = this.env.attributeFor(element, name, isTrusting, namespace);
        let nsAttribute = new DynamicAttribute(element, attributeManager, name, reference, namespace);
        this.addAttribute(nsAttribute);
    }
    flush(element, vm) {
        let env = vm.env;
        let opcodes = this.opcodes,
            classList = this.classList;

        for (let i = 0; opcodes && i < opcodes.length; i++) {
            vm.updateWith(opcodes[i]);
        }
        if (classList) {
            let attributeManager = env.attributeFor(element, 'class', false);
            let attribute = new DynamicAttribute(element, attributeManager, 'class', classList.toReference());
            let opcode = attribute.flush(env);
            if (opcode) {
                vm.updateWith(opcode);
            }
        }
        this.opcodes = null;
        this.classList = null;
    }
    addClass(reference) {
        let classList = this.classList;

        if (!classList) {
            classList = this.classList = new ClassList();
        }
        classList.append(reference);
    }
    addAttribute(attribute) {
        let opcode = attribute.flush(this.env);
        if (opcode) {
            let opcodes = this.opcodes;

            if (!opcodes) {
                opcodes = this.opcodes = [];
            }
            opcodes.push(opcode);
        }
    }
}
class ComponentElementOperations {
    constructor(env) {
        this.env = env;
        this.attributeNames = null;
        this.attributes = null;
        this.classList = null;
    }
    addStaticAttribute(element, name, value) {
        if (name === 'class') {
            this.addClass(PrimitiveReference.create(value));
        } else if (this.shouldAddAttribute(name)) {
            this.addAttribute(name, new StaticAttribute(element, name, value));
        }
    }
    addStaticAttributeNS(element, namespace, name, value) {
        if (this.shouldAddAttribute(name)) {
            this.addAttribute(name, new StaticAttribute(element, name, value, namespace));
        }
    }
    addDynamicAttribute(element, name, reference, isTrusting) {
        if (name === 'class') {
            this.addClass(reference);
        } else if (this.shouldAddAttribute(name)) {
            let attributeManager = this.env.attributeFor(element, name, isTrusting);
            let attribute = new DynamicAttribute(element, attributeManager, name, reference);
            this.addAttribute(name, attribute);
        }
    }
    addDynamicAttributeNS(element, namespace, name, reference, isTrusting) {
        if (this.shouldAddAttribute(name)) {
            let attributeManager = this.env.attributeFor(element, name, isTrusting, namespace);
            let nsAttribute = new DynamicAttribute(element, attributeManager, name, reference, namespace);
            this.addAttribute(name, nsAttribute);
        }
    }
    flush(element, vm) {
        let env = this.env;
        let attributes = this.attributes,
            classList = this.classList;

        for (let i = 0; attributes && i < attributes.length; i++) {
            let opcode = attributes[i].flush(env);
            if (opcode) {
                vm.updateWith(opcode);
            }
        }
        if (classList) {
            let attributeManager = env.attributeFor(element, 'class', false);
            let attribute = new DynamicAttribute(element, attributeManager, 'class', classList.toReference());
            let opcode = attribute.flush(env);
            if (opcode) {
                vm.updateWith(opcode);
            }
        }
    }
    shouldAddAttribute(name) {
        return !this.attributeNames || this.attributeNames.indexOf(name) === -1;
    }
    addClass(reference) {
        let classList = this.classList;

        if (!classList) {
            classList = this.classList = new ClassList();
        }
        classList.append(reference);
    }
    addAttribute(name, attribute) {
        let attributeNames = this.attributeNames,
            attributes = this.attributes;

        if (!attributeNames) {
            attributeNames = this.attributeNames = [];
            attributes = this.attributes = [];
        }
        attributeNames.push(name);
        unwrap(attributes).push(attribute);
    }
}
APPEND_OPCODES.add(33 /* FlushElement */, vm => {
    let stack = vm.elements();
    let action = 'FlushElementOpcode#evaluate';
    stack.expectOperations(action).flush(stack.expectConstructing(action), vm);
    stack.flushElement();
});
APPEND_OPCODES.add(34 /* CloseElement */, vm => vm.elements().closeElement());
APPEND_OPCODES.add(30 /* StaticAttr */, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
    let name = vm.constants.getString(_name);
    let value = vm.constants.getString(_value);
    if (_namespace) {
        let namespace = vm.constants.getString(_namespace);
        vm.elements().setStaticAttributeNS(namespace, name, value);
    } else {
        vm.elements().setStaticAttribute(name, value);
    }
});
APPEND_OPCODES.add(35 /* Modifier */, (vm, { op1: _manager }) => {
    let manager = vm.constants.getOther(_manager);
    let stack = vm.stack;
    let args = stack.pop();
    let tag = args.tag;

    var _vm$elements = vm.elements();

    let element = _vm$elements.constructing,
        updateOperations = _vm$elements.updateOperations;

    let dynamicScope = vm.dynamicScope();
    let modifier = manager.create(element, args, dynamicScope, updateOperations);
    args.clear();
    vm.env.scheduleInstallModifier(modifier, manager);
    let destructor = manager.getDestructor(modifier);
    if (destructor) {
        vm.newDestroyable(destructor);
    }
    vm.updateWith(new UpdateModifierOpcode(tag, manager, modifier));
});
class UpdateModifierOpcode extends UpdatingOpcode {
    constructor(tag, manager, modifier) {
        super();
        this.tag = tag;
        this.manager = manager;
        this.modifier = modifier;
        this.type = 'update-modifier';
        this.lastUpdated = tag.value();
    }
    evaluate(vm) {
        let manager = this.manager,
            modifier = this.modifier,
            tag = this.tag,
            lastUpdated = this.lastUpdated;

        if (!tag.validate(lastUpdated)) {
            vm.env.scheduleUpdateModifier(modifier, manager);
            this.lastUpdated = tag.value();
        }
    }
    toJSON() {
        return {
            guid: this._guid,
            type: this.type
        };
    }
}
class StaticAttribute {
    constructor(element, name, value, namespace) {
        this.element = element;
        this.name = name;
        this.value = value;
        this.namespace = namespace;
    }
    flush(env) {
        env.getAppendOperations().setAttribute(this.element, this.name, this.value, this.namespace);
        return null;
    }
}
class DynamicAttribute {
    constructor(element, attributeManager, name, reference, namespace) {
        this.element = element;
        this.attributeManager = attributeManager;
        this.name = name;
        this.reference = reference;
        this.namespace = namespace;
        this.cache = null;
        this.tag = reference.tag;
    }
    patch(env) {
        let element = this.element,
            cache = this.cache;

        let value = expect(cache, 'must patch after flush').revalidate();
        if (isModified(value)) {
            this.attributeManager.updateAttribute(env, element, value, this.namespace);
        }
    }
    flush(env) {
        let reference = this.reference,
            element = this.element;

        if (isConst(reference)) {
            let value = reference.value();
            this.attributeManager.setAttribute(env, element, value, this.namespace);
            return null;
        } else {
            let cache = this.cache = new ReferenceCache(reference);
            let value = cache.peek();
            this.attributeManager.setAttribute(env, element, value, this.namespace);
            return new PatchElementOpcode(this);
        }
    }
    toJSON() {
        let element = this.element,
            namespace = this.namespace,
            name = this.name,
            cache = this.cache;

        let formattedElement = formatElement(element);
        let lastValue = expect(cache, 'must serialize after flush').peek();
        if (namespace) {
            return {
                element: formattedElement,
                lastValue,
                name,
                namespace,
                type: 'attribute'
            };
        }
        return {
            element: formattedElement,
            lastValue,
            name,
            namespace: namespace === undefined ? null : namespace,
            type: 'attribute'
        };
    }
}
function formatElement(element) {
    return JSON.stringify(`<${element.tagName.toLowerCase()} />`);
}
APPEND_OPCODES.add(32 /* DynamicAttrNS */, (vm, { op1: _name, op2: _namespace, op3: trusting }) => {
    let name = vm.constants.getString(_name);
    let namespace = vm.constants.getString(_namespace);
    let reference = vm.stack.pop();
    vm.elements().setDynamicAttributeNS(namespace, name, reference, !!trusting);
});
APPEND_OPCODES.add(31 /* DynamicAttr */, (vm, { op1: _name, op2: trusting }) => {
    let name = vm.constants.getString(_name);
    let reference = vm.stack.pop();
    vm.elements().setDynamicAttribute(name, reference, !!trusting);
});
class PatchElementOpcode extends UpdatingOpcode {
    constructor(operation) {
        super();
        this.type = 'patch-element';
        this.tag = operation.tag;
        this.operation = operation;
    }
    evaluate(vm) {
        this.operation.patch(vm.env);
    }
    toJSON() {
        let _guid = this._guid,
            type = this.type,
            operation = this.operation;

        return {
            details: operation.toJSON(),
            guid: _guid,
            type
        };
    }
}

APPEND_OPCODES.add(56 /* PushComponentManager */, (vm, { op1: _definition }) => {
    let definition = vm.constants.getOther(_definition);
    let stack = vm.stack;
    stack.push({ definition, manager: definition.manager, component: null });
});
APPEND_OPCODES.add(57 /* PushDynamicComponentManager */, vm => {
    let stack = vm.stack;
    let reference = stack.pop();
    let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
    let definition = cache ? cache.peek() : reference.value();
    stack.push({ definition, manager: definition.manager, component: null });
    if (cache) {
        vm.updateWith(new Assert(cache));
    }
});
APPEND_OPCODES.add(58 /* PushArgs */, (vm, { op1: synthetic }) => {
    let stack = vm.stack;
    ARGS.setup(stack, !!synthetic);
    stack.push(ARGS);
});
APPEND_OPCODES.add(59 /* PrepareArgs */, (vm, { op1: _state }) => {
    let stack = vm.stack;

    var _vm$fetchValue = vm.fetchValue(_state);

    let definition = _vm$fetchValue.definition,
        manager = _vm$fetchValue.manager;

    let args = stack.pop();
    let preparedArgs = manager.prepareArgs(definition, args);
    if (preparedArgs) {
        args.clear();
        let positional = preparedArgs.positional,
            named = preparedArgs.named;

        let positionalCount = positional.length;
        for (let i = 0; i < positionalCount; i++) {
            stack.push(positional[i]);
        }
        stack.push(positionalCount);
        let names = Object.keys(named);
        let namedCount = names.length;
        let atNames = [];
        for (let i = 0; i < namedCount; i++) {
            let value = named[names[i]];
            let atName = `@${names[i]}`;
            stack.push(value);
            atNames.push(atName);
        }
        stack.push(atNames);
        args.setup(stack, false);
    }
    stack.push(args);
});
APPEND_OPCODES.add(60 /* CreateComponent */, (vm, { op1: flags, op2: _state }) => {
    var _vm$fetchValue2;

    let definition;
    let manager;
    let args = vm.stack.pop();
    let dynamicScope = vm.dynamicScope();
    let state = (_vm$fetchValue2 = vm.fetchValue(_state), definition = _vm$fetchValue2.definition, manager = _vm$fetchValue2.manager, _vm$fetchValue2);
    let hasDefaultBlock = flags & 1;
    let component = manager.create(vm.env, definition, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);
    state.component = component;
    vm.updateWith(new UpdateComponentOpcode(args.tag, definition.name, component, manager, dynamicScope));
});
APPEND_OPCODES.add(61 /* RegisterComponentDestructor */, (vm, { op1: _state }) => {
    var _vm$fetchValue3 = vm.fetchValue(_state);

    let manager = _vm$fetchValue3.manager,
        component = _vm$fetchValue3.component;

    let destructor = manager.getDestructor(component);
    if (destructor) vm.newDestroyable(destructor);
});
APPEND_OPCODES.add(65 /* BeginComponentTransaction */, vm => {
    vm.beginCacheGroup();
    vm.elements().pushSimpleBlock();
});
APPEND_OPCODES.add(62 /* PushComponentOperations */, vm => {
    vm.stack.push(new ComponentElementOperations(vm.env));
});
APPEND_OPCODES.add(67 /* DidCreateElement */, (vm, { op1: _state }) => {
    var _vm$fetchValue4 = vm.fetchValue(_state);

    let manager = _vm$fetchValue4.manager,
        component = _vm$fetchValue4.component;

    let action = 'DidCreateElementOpcode#evaluate';
    manager.didCreateElement(component, vm.elements().expectConstructing(action), vm.elements().expectOperations(action));
});
APPEND_OPCODES.add(63 /* GetComponentSelf */, (vm, { op1: _state }) => {
    let state = vm.fetchValue(_state);
    vm.stack.push(state.manager.getSelf(state.component));
});
APPEND_OPCODES.add(64 /* GetComponentLayout */, (vm, { op1: _state }) => {
    var _vm$fetchValue5 = vm.fetchValue(_state);

    let manager = _vm$fetchValue5.manager,
        definition = _vm$fetchValue5.definition,
        component = _vm$fetchValue5.component;

    vm.stack.push(manager.layoutFor(definition, component, vm.env));
});
APPEND_OPCODES.add(68 /* DidRenderLayout */, (vm, { op1: _state }) => {
    var _vm$fetchValue6 = vm.fetchValue(_state);

    let manager = _vm$fetchValue6.manager,
        component = _vm$fetchValue6.component;

    let bounds = vm.elements().popBlock();
    manager.didRenderLayout(component, bounds);
    vm.env.didCreate(component, manager);
    vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
});
APPEND_OPCODES.add(66 /* CommitComponentTransaction */, vm => vm.commitCacheGroup());
class UpdateComponentOpcode extends UpdatingOpcode {
    constructor(tag, name, component, manager, dynamicScope) {
        super();
        this.name = name;
        this.component = component;
        this.manager = manager;
        this.dynamicScope = dynamicScope;
        this.type = 'update-component';
        let componentTag = manager.getTag(component);
        if (componentTag) {
            this.tag = combine([tag, componentTag]);
        } else {
            this.tag = tag;
        }
    }
    evaluate(_vm) {
        let component = this.component,
            manager = this.manager,
            dynamicScope = this.dynamicScope;

        manager.update(component, dynamicScope);
    }
    toJSON() {
        return {
            args: [JSON.stringify(this.name)],
            guid: this._guid,
            type: this.type
        };
    }
}
class DidUpdateLayoutOpcode extends UpdatingOpcode {
    constructor(manager, component, bounds) {
        super();
        this.manager = manager;
        this.component = component;
        this.bounds = bounds;
        this.type = 'did-update-layout';
        this.tag = CONSTANT_TAG;
    }
    evaluate(vm) {
        let manager = this.manager,
            component = this.component,
            bounds = this.bounds;

        manager.didUpdateLayout(component, bounds);
        vm.env.didUpdate(component, manager);
    }
}

class Cursor {
    constructor(element, nextSibling) {
        this.element = element;
        this.nextSibling = nextSibling;
    }
}

class ConcreteBounds {
    constructor(parentNode, first, last) {
        this.parentNode = parentNode;
        this.first = first;
        this.last = last;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.first;
    }
    lastNode() {
        return this.last;
    }
}
class SingleNodeBounds {
    constructor(parentNode, node) {
        this.parentNode = parentNode;
        this.node = node;
    }
    parentElement() {
        return this.parentNode;
    }
    firstNode() {
        return this.node;
    }
    lastNode() {
        return this.node;
    }
}

function single(parent, node) {
    return new SingleNodeBounds(parent, node);
}
function move(bounds, reference) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.insertBefore(node, reference);
        if (node === last) return next;
        node = next;
    }
    return null;
}
function clear(bounds) {
    let parent = bounds.parentElement();
    let first = bounds.firstNode();
    let last = bounds.lastNode();
    let node = first;
    while (node) {
        let next = node.nextSibling;
        parent.removeChild(node);
        if (node === last) return next;
        node = next;
    }
    return null;
}

class First {
    constructor(node) {
        this.node = node;
    }
    firstNode() {
        return this.node;
    }
}
class Last {
    constructor(node) {
        this.node = node;
    }
    lastNode() {
        return this.node;
    }
}
class Fragment {
    constructor(bounds$$1) {
        this.bounds = bounds$$1;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    update(bounds$$1) {
        this.bounds = bounds$$1;
    }
}
class ElementStack {
    constructor(env, parentNode, nextSibling) {
        this.constructing = null;
        this.operations = null;
        this.elementStack = new Stack();
        this.nextSiblingStack = new Stack();
        this.blockStack = new Stack();
        this.env = env;
        this.dom = env.getAppendOperations();
        this.updateOperations = env.getDOM();
        this.element = parentNode;
        this.nextSibling = nextSibling;
        this.defaultOperations = new SimpleElementOperations(env);
        this.pushSimpleBlock();
        this.elementStack.push(this.element);
        this.nextSiblingStack.push(this.nextSibling);
    }
    static forInitialRender(env, parentNode, nextSibling) {
        return new ElementStack(env, parentNode, nextSibling);
    }
    static resume(env, tracker, nextSibling) {
        let parentNode = tracker.parentElement();
        let stack = new ElementStack(env, parentNode, nextSibling);
        stack.pushBlockTracker(tracker);
        return stack;
    }
    expectConstructing(method) {
        return expect(this.constructing, `${method} should only be called while constructing an element`);
    }
    expectOperations(method) {
        return expect(this.operations, `${method} should only be called while constructing an element`);
    }
    block() {
        return expect(this.blockStack.current, "Expected a current block tracker");
    }
    popElement() {
        let elementStack = this.elementStack,
            nextSiblingStack = this.nextSiblingStack;

        let topElement = elementStack.pop();
        nextSiblingStack.pop();
        // LOGGER.debug(`-> element stack ${this.elementStack.toArray().map(e => e.tagName).join(', ')}`);
        this.element = expect(elementStack.current, "can't pop past the last element");
        this.nextSibling = nextSiblingStack.current;
        return topElement;
    }
    pushSimpleBlock() {
        let tracker = new SimpleBlockTracker(this.element);
        this.pushBlockTracker(tracker);
        return tracker;
    }
    pushUpdatableBlock() {
        let tracker = new UpdatableBlockTracker(this.element);
        this.pushBlockTracker(tracker);
        return tracker;
    }
    pushBlockTracker(tracker, isRemote = false) {
        let current = this.blockStack.current;
        if (current !== null) {
            current.newDestroyable(tracker);
            if (!isRemote) {
                current.newBounds(tracker);
            }
        }
        this.blockStack.push(tracker);
        return tracker;
    }
    pushBlockList(list) {
        let tracker = new BlockListTracker(this.element, list);
        let current = this.blockStack.current;
        if (current !== null) {
            current.newDestroyable(tracker);
            current.newBounds(tracker);
        }
        this.blockStack.push(tracker);
        return tracker;
    }
    popBlock() {
        this.block().finalize(this);
        return expect(this.blockStack.pop(), "Expected popBlock to return a block");
    }
    openElement(tag, _operations) {
        // workaround argument.length transpile of arg initializer
        let operations = _operations === undefined ? this.defaultOperations : _operations;
        let element = this.dom.createElement(tag, this.element);
        this.constructing = element;
        this.operations = operations;
        return element;
    }
    flushElement() {
        let parent = this.element;
        let element = expect(this.constructing, `flushElement should only be called when constructing an element`);
        this.dom.insertBefore(parent, element, this.nextSibling);
        this.constructing = null;
        this.operations = null;
        this.pushElement(element, null);
        this.block().openElement(element);
    }
    pushRemoteElement(element, nextSibling = null) {
        this.pushElement(element, nextSibling);
        let tracker = new RemoteBlockTracker(element);
        this.pushBlockTracker(tracker, true);
    }
    popRemoteElement() {
        this.popBlock();
        this.popElement();
    }
    pushElement(element, nextSibling) {
        this.element = element;
        this.elementStack.push(element);
        // LOGGER.debug(`-> element stack ${this.elementStack.toArray().map(e => e.tagName).join(', ')}`);
        this.nextSibling = nextSibling;
        this.nextSiblingStack.push(nextSibling);
    }
    newDestroyable(d) {
        this.block().newDestroyable(d);
    }
    newBounds(bounds$$1) {
        this.block().newBounds(bounds$$1);
    }
    appendText(string) {
        let dom = this.dom;

        let text = dom.createTextNode(string);
        dom.insertBefore(this.element, text, this.nextSibling);
        this.block().newNode(text);
        return text;
    }
    appendComment(string) {
        let dom = this.dom;

        let comment = dom.createComment(string);
        dom.insertBefore(this.element, comment, this.nextSibling);
        this.block().newNode(comment);
        return comment;
    }
    setStaticAttribute(name, value) {
        this.expectOperations('setStaticAttribute').addStaticAttribute(this.expectConstructing('setStaticAttribute'), name, value);
    }
    setStaticAttributeNS(namespace, name, value) {
        this.expectOperations('setStaticAttributeNS').addStaticAttributeNS(this.expectConstructing('setStaticAttributeNS'), namespace, name, value);
    }
    setDynamicAttribute(name, reference, isTrusting) {
        this.expectOperations('setDynamicAttribute').addDynamicAttribute(this.expectConstructing('setDynamicAttribute'), name, reference, isTrusting);
    }
    setDynamicAttributeNS(namespace, name, reference, isTrusting) {
        this.expectOperations('setDynamicAttributeNS').addDynamicAttributeNS(this.expectConstructing('setDynamicAttributeNS'), namespace, name, reference, isTrusting);
    }
    closeElement() {
        this.block().closeElement();
        this.popElement();
    }
}
class SimpleBlockTracker {
    constructor(parent) {
        this.parent = parent;
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
    }
    destroy() {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                destroyables[i].destroy();
            }
        }
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        return this.first && this.first.firstNode();
    }
    lastNode() {
        return this.last && this.last.lastNode();
    }
    openElement(element) {
        this.newNode(element);
        this.nesting++;
    }
    closeElement() {
        this.nesting--;
    }
    newNode(node) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = new First(node);
        }
        this.last = new Last(node);
    }
    newBounds(bounds$$1) {
        if (this.nesting !== 0) return;
        if (!this.first) {
            this.first = bounds$$1;
        }
        this.last = bounds$$1;
    }
    newDestroyable(d) {
        this.destroyables = this.destroyables || [];
        this.destroyables.push(d);
    }
    finalize(stack) {
        if (!this.first) {
            stack.appendComment('');
        }
    }
}
class RemoteBlockTracker extends SimpleBlockTracker {
    destroy() {
        super.destroy();
        clear(this);
    }
}
class UpdatableBlockTracker extends SimpleBlockTracker {
    reset(env) {
        let destroyables = this.destroyables;

        if (destroyables && destroyables.length) {
            for (let i = 0; i < destroyables.length; i++) {
                env.didDestroy(destroyables[i]);
            }
        }
        let nextSibling = clear(this);
        this.first = null;
        this.last = null;
        this.destroyables = null;
        this.nesting = 0;
        return nextSibling;
    }
}
class BlockListTracker {
    constructor(parent, boundList) {
        this.parent = parent;
        this.boundList = boundList;
        this.parent = parent;
        this.boundList = boundList;
    }
    destroy() {
        this.boundList.forEachNode(node => node.destroy());
    }
    parentElement() {
        return this.parent;
    }
    firstNode() {
        let head = this.boundList.head();
        return head && head.firstNode();
    }
    lastNode() {
        let tail = this.boundList.tail();
        return tail && tail.lastNode();
    }
    openElement(_element) {
        debugAssert(false, 'Cannot openElement directly inside a block list');
    }
    closeElement() {
        debugAssert(false, 'Cannot closeElement directly inside a block list');
    }
    newNode(_node) {
        debugAssert(false, 'Cannot create a new node directly inside a block list');
    }
    newBounds(_bounds) {}
    newDestroyable(_d) {}
    finalize(_stack) {}
}

const COMPONENT_DEFINITION_BRAND = 'COMPONENT DEFINITION [id=e59c754e-61eb-4392-8c4a-2c0ac72bfcd4]';
function isComponentDefinition(obj) {
    return typeof obj === 'object' && obj !== null && obj[COMPONENT_DEFINITION_BRAND];
}
class ComponentDefinition {
    constructor(name, manager, ComponentClass) {
        this[COMPONENT_DEFINITION_BRAND] = true;
        this.name = name;
        this.manager = manager;
        this.ComponentClass = ComponentClass;
    }
}

function isSafeString(value) {
    return typeof value === 'object' && value !== null && typeof value.toHTML === 'function';
}
function isNode(value) {
    return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}
function isString(value) {
    return typeof value === 'string';
}
class Upsert {
    constructor(bounds$$1) {
        this.bounds = bounds$$1;
    }
}
function cautiousInsert(dom, cursor, value) {
    if (isString(value)) {
        return TextUpsert.insert(dom, cursor, value);
    }
    if (isSafeString(value)) {
        return SafeStringUpsert.insert(dom, cursor, value);
    }
    if (isNode(value)) {
        return NodeUpsert.insert(dom, cursor, value);
    }
    throw unreachable();
}
function trustingInsert(dom, cursor, value) {
    if (isString(value)) {
        return HTMLUpsert.insert(dom, cursor, value);
    }
    if (isNode(value)) {
        return NodeUpsert.insert(dom, cursor, value);
    }
    throw unreachable();
}
class TextUpsert extends Upsert {
    static insert(dom, cursor, value) {
        let textNode = dom.createTextNode(value);
        dom.insertBefore(cursor.element, textNode, cursor.nextSibling);
        let bounds$$1 = new SingleNodeBounds(cursor.element, textNode);
        return new TextUpsert(bounds$$1, textNode);
    }
    constructor(bounds$$1, textNode) {
        super(bounds$$1);
        this.textNode = textNode;
    }
    update(_dom, value) {
        if (isString(value)) {
            let textNode = this.textNode;

            textNode.nodeValue = value;
            return true;
        } else {
            return false;
        }
    }
}
class HTMLUpsert extends Upsert {
    static insert(dom, cursor, value) {
        let bounds$$1 = dom.insertHTMLBefore(cursor.element, cursor.nextSibling, value);
        return new HTMLUpsert(bounds$$1);
    }
    update(dom, value) {
        if (isString(value)) {
            let bounds$$1 = this.bounds;

            let parentElement = bounds$$1.parentElement();
            let nextSibling = clear(bounds$$1);
            this.bounds = dom.insertHTMLBefore(parentElement, nextSibling, value);
            return true;
        } else {
            return false;
        }
    }
}
class SafeStringUpsert extends Upsert {
    constructor(bounds$$1, lastStringValue) {
        super(bounds$$1);
        this.lastStringValue = lastStringValue;
    }
    static insert(dom, cursor, value) {
        let stringValue = value.toHTML();
        let bounds$$1 = dom.insertHTMLBefore(cursor.element, cursor.nextSibling, stringValue);
        return new SafeStringUpsert(bounds$$1, stringValue);
    }
    update(dom, value) {
        if (isSafeString(value)) {
            let stringValue = value.toHTML();
            if (stringValue !== this.lastStringValue) {
                let bounds$$1 = this.bounds;

                let parentElement = bounds$$1.parentElement();
                let nextSibling = clear(bounds$$1);
                this.bounds = dom.insertHTMLBefore(parentElement, nextSibling, stringValue);
                this.lastStringValue = stringValue;
            }
            return true;
        } else {
            return false;
        }
    }
}
class NodeUpsert extends Upsert {
    static insert(dom, cursor, node) {
        dom.insertBefore(cursor.element, node, cursor.nextSibling);
        return new NodeUpsert(single(cursor.element, node));
    }
    update(dom, value) {
        if (isNode(value)) {
            let bounds$$1 = this.bounds;

            let parentElement = bounds$$1.parentElement();
            let nextSibling = clear(bounds$$1);
            this.bounds = dom.insertNodeBefore(parentElement, value, nextSibling);
            return true;
        } else {
            return false;
        }
    }
}

APPEND_OPCODES.add(26 /* DynamicContent */, (vm, { op1: append }) => {
    let opcode = vm.constants.getOther(append);
    opcode.evaluate(vm);
});
function isEmpty(value) {
    return value === null || value === undefined || typeof value.toString !== 'function';
}
function normalizeTextValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    return String(value);
}
function normalizeTrustedValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    if (isString(value)) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (isNode(value)) {
        return value;
    }
    return String(value);
}
function normalizeValue(value) {
    if (isEmpty(value)) {
        return '';
    }
    if (isString(value)) {
        return value;
    }
    if (isSafeString(value) || isNode(value)) {
        return value;
    }
    return String(value);
}
class AppendDynamicOpcode {
    evaluate(vm) {
        let reference = vm.stack.pop();
        let normalized = this.normalize(reference);
        let value;
        let cache;
        if (isConst(reference)) {
            value = normalized.value();
        } else {
            cache = new ReferenceCache(normalized);
            value = cache.peek();
        }
        let stack = vm.elements();
        let upsert = this.insert(vm.env.getAppendOperations(), stack, value);
        let bounds$$1 = new Fragment(upsert.bounds);
        stack.newBounds(bounds$$1);
        if (cache /* i.e. !isConst(reference) */) {
                vm.updateWith(this.updateWith(vm, reference, cache, bounds$$1, upsert));
            }
    }
}
class IsComponentDefinitionReference extends ConditionalReference {
    static create(inner) {
        return new IsComponentDefinitionReference(inner);
    }
    toBool(value) {
        return isComponentDefinition(value);
    }
}
class UpdateOpcode extends UpdatingOpcode {
    constructor(cache, bounds$$1, upsert) {
        super();
        this.cache = cache;
        this.bounds = bounds$$1;
        this.upsert = upsert;
        this.tag = cache.tag;
    }
    evaluate(vm) {
        let value = this.cache.revalidate();
        if (isModified(value)) {
            let bounds$$1 = this.bounds,
                upsert = this.upsert;
            let dom = vm.dom;

            if (!this.upsert.update(dom, value)) {
                let cursor = new Cursor(bounds$$1.parentElement(), clear(bounds$$1));
                upsert = this.upsert = this.insert(vm.env.getAppendOperations(), cursor, value);
            }
            bounds$$1.update(upsert.bounds);
        }
    }
    toJSON() {
        let guid = this._guid,
            type = this.type,
            cache = this.cache;

        return {
            details: { lastValue: JSON.stringify(cache.peek()) },
            guid,
            type
        };
    }
}
class OptimizedCautiousAppendOpcode extends AppendDynamicOpcode {
    constructor() {
        super(...arguments);
        this.type = 'optimized-cautious-append';
    }
    normalize(reference) {
        return map(reference, normalizeValue);
    }
    insert(dom, cursor, value) {
        return cautiousInsert(dom, cursor, value);
    }
    updateWith(_vm, _reference, cache, bounds$$1, upsert) {
        return new OptimizedCautiousUpdateOpcode(cache, bounds$$1, upsert);
    }
}
class OptimizedCautiousUpdateOpcode extends UpdateOpcode {
    constructor() {
        super(...arguments);
        this.type = 'optimized-cautious-update';
    }
    insert(dom, cursor, value) {
        return cautiousInsert(dom, cursor, value);
    }
}
class OptimizedTrustingAppendOpcode extends AppendDynamicOpcode {
    constructor() {
        super(...arguments);
        this.type = 'optimized-trusting-append';
    }
    normalize(reference) {
        return map(reference, normalizeTrustedValue);
    }
    insert(dom, cursor, value) {
        return trustingInsert(dom, cursor, value);
    }
    updateWith(_vm, _reference, cache, bounds$$1, upsert) {
        return new OptimizedTrustingUpdateOpcode(cache, bounds$$1, upsert);
    }
}
class OptimizedTrustingUpdateOpcode extends UpdateOpcode {
    constructor() {
        super(...arguments);
        this.type = 'optimized-trusting-update';
    }
    insert(dom, cursor, value) {
        return trustingInsert(dom, cursor, value);
    }
}

function debugCallback(context, get) {
    console.info('Use `context`, and `get(<path>)` to debug this template.');
    // for example...
    context === get('this');
    debugger;
}
/* tslint:enable */
let callback = debugCallback;
// For testing purposes


class ScopeInspector {
    constructor(scope, symbols, evalInfo) {
        this.scope = scope;
        this.locals = dict();
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = symbols[slot - 1];
            let ref = scope.getSymbol(slot);
            this.locals[name] = ref;
        }
    }
    get(path) {
        let scope = this.scope,
            locals = this.locals;

        let parts = path.split('.');

        var _path$split = path.split('.');

        let head = _path$split[0],
            tail = _path$split.slice(1);

        let evalScope = scope.getEvalScope();
        let ref;
        if (head === 'this') {
            ref = scope.getSelf();
        } else if (locals[head]) {
            ref = locals[head];
        } else if (head.indexOf('@') === 0 && evalScope[head]) {
            ref = evalScope[head];
        } else {
            ref = this.scope.getSelf();
            tail = parts;
        }
        return tail.reduce((r, part) => r.get(part), ref);
    }
}
APPEND_OPCODES.add(71 /* Debugger */, (vm, { op1: _symbols, op2: _evalInfo }) => {
    let symbols = vm.constants.getOther(_symbols);
    let evalInfo = vm.constants.getArray(_evalInfo);
    let inspector = new ScopeInspector(vm.scope(), symbols, evalInfo);
    callback(vm.getSelf().value(), path => inspector.get(path).value());
});

APPEND_OPCODES.add(69 /* GetPartialTemplate */, vm => {
    let stack = vm.stack;
    let definition = stack.pop();
    stack.push(definition.value().template.asPartial());
});

class IterablePresenceReference {
    constructor(artifacts) {
        this.tag = artifacts.tag;
        this.artifacts = artifacts;
    }
    value() {
        return !this.artifacts.isEmpty();
    }
}
APPEND_OPCODES.add(54 /* PutIterator */, vm => {
    let stack = vm.stack;
    let listRef = stack.pop();
    let key = stack.pop();
    let iterable = vm.env.iterableFor(listRef, key.value());
    let iterator = new ReferenceIterator(iterable);
    stack.push(iterator);
    stack.push(new IterablePresenceReference(iterator.artifacts));
});
APPEND_OPCODES.add(52 /* EnterList */, (vm, { op1: relativeStart }) => {
    vm.enterList(relativeStart);
});
APPEND_OPCODES.add(53 /* ExitList */, vm => vm.exitList());
APPEND_OPCODES.add(55 /* Iterate */, (vm, { op1: breaks }) => {
    let stack = vm.stack;
    let item = stack.peek().next();
    if (item) {
        let tryOpcode = vm.iterate(item.memo, item.value);
        vm.enterItem(item.key, tryOpcode);
    } else {
        vm.goto(breaks);
    }
});

var Opcodes;
(function (Opcodes) {
    // Statements
    Opcodes[Opcodes["Text"] = 0] = "Text";
    Opcodes[Opcodes["Append"] = 1] = "Append";
    Opcodes[Opcodes["Comment"] = 2] = "Comment";
    Opcodes[Opcodes["Modifier"] = 3] = "Modifier";
    Opcodes[Opcodes["Block"] = 4] = "Block";
    Opcodes[Opcodes["Component"] = 5] = "Component";
    Opcodes[Opcodes["OpenElement"] = 6] = "OpenElement";
    Opcodes[Opcodes["FlushElement"] = 7] = "FlushElement";
    Opcodes[Opcodes["CloseElement"] = 8] = "CloseElement";
    Opcodes[Opcodes["StaticAttr"] = 9] = "StaticAttr";
    Opcodes[Opcodes["DynamicAttr"] = 10] = "DynamicAttr";
    Opcodes[Opcodes["Yield"] = 11] = "Yield";
    Opcodes[Opcodes["Partial"] = 12] = "Partial";
    Opcodes[Opcodes["DynamicArg"] = 13] = "DynamicArg";
    Opcodes[Opcodes["StaticArg"] = 14] = "StaticArg";
    Opcodes[Opcodes["TrustingAttr"] = 15] = "TrustingAttr";
    Opcodes[Opcodes["Debugger"] = 16] = "Debugger";
    Opcodes[Opcodes["ClientSideStatement"] = 17] = "ClientSideStatement";
    // Expressions
    Opcodes[Opcodes["Unknown"] = 18] = "Unknown";
    Opcodes[Opcodes["Get"] = 19] = "Get";
    Opcodes[Opcodes["MaybeLocal"] = 20] = "MaybeLocal";
    Opcodes[Opcodes["FixThisBeforeWeMerge"] = 21] = "FixThisBeforeWeMerge";
    Opcodes[Opcodes["HasBlock"] = 22] = "HasBlock";
    Opcodes[Opcodes["HasBlockParams"] = 23] = "HasBlockParams";
    Opcodes[Opcodes["Undefined"] = 24] = "Undefined";
    Opcodes[Opcodes["Helper"] = 25] = "Helper";
    Opcodes[Opcodes["Concat"] = 26] = "Concat";
    Opcodes[Opcodes["ClientSideExpression"] = 27] = "ClientSideExpression";
})(Opcodes || (Opcodes = {}));

function is(variant) {
    return function (value) {
        return Array.isArray(value) && value[0] === variant;
    };
}
var Expressions;
(function (Expressions) {
    Expressions.isUnknown = is(Opcodes.Unknown);
    Expressions.isGet = is(Opcodes.Get);
    Expressions.isConcat = is(Opcodes.Concat);
    Expressions.isHelper = is(Opcodes.Helper);
    Expressions.isHasBlock = is(Opcodes.HasBlock);
    Expressions.isHasBlockParams = is(Opcodes.HasBlockParams);
    Expressions.isUndefined = is(Opcodes.Undefined);
    Expressions.isClientSide = is(Opcodes.ClientSideExpression);
    Expressions.isMaybeLocal = is(Opcodes.MaybeLocal);
    function isPrimitiveValue(value) {
        if (value === null) {
            return true;
        }
        return typeof value !== 'object';
    }
    Expressions.isPrimitiveValue = isPrimitiveValue;
})(Expressions || (Expressions = {}));
var Statements;
(function (Statements) {
    Statements.isText = is(Opcodes.Text);
    Statements.isAppend = is(Opcodes.Append);
    Statements.isComment = is(Opcodes.Comment);
    Statements.isModifier = is(Opcodes.Modifier);
    Statements.isBlock = is(Opcodes.Block);
    Statements.isComponent = is(Opcodes.Component);
    Statements.isOpenElement = is(Opcodes.OpenElement);
    Statements.isFlushElement = is(Opcodes.FlushElement);
    Statements.isCloseElement = is(Opcodes.CloseElement);
    Statements.isStaticAttr = is(Opcodes.StaticAttr);
    Statements.isDynamicAttr = is(Opcodes.DynamicAttr);
    Statements.isYield = is(Opcodes.Yield);
    Statements.isPartial = is(Opcodes.Partial);
    Statements.isDynamicArg = is(Opcodes.DynamicArg);
    Statements.isStaticArg = is(Opcodes.StaticArg);
    Statements.isTrustingAttr = is(Opcodes.TrustingAttr);
    Statements.isDebugger = is(Opcodes.Debugger);
    Statements.isClientSide = is(Opcodes.ClientSideStatement);
    function isAttribute(val) {
        return val[0] === Opcodes.StaticAttr || val[0] === Opcodes.DynamicAttr || val[0] === Opcodes.TrustingAttr;
    }
    Statements.isAttribute = isAttribute;
    function isArgument(val) {
        return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
    }
    Statements.isArgument = isArgument;
    function isParameter(val) {
        return isAttribute(val) || isArgument(val);
    }
    Statements.isParameter = isParameter;
    function getParameterName(s) {
        return s[1];
    }
    Statements.getParameterName = getParameterName;
})(Statements || (Statements = {}));

var Ops$1;
(function (Ops) {
    Ops[Ops["OpenComponentElement"] = 0] = "OpenComponentElement";
    Ops[Ops["DidCreateElement"] = 1] = "DidCreateElement";
    Ops[Ops["DidRenderLayout"] = 2] = "DidRenderLayout";
    Ops[Ops["FunctionExpression"] = 3] = "FunctionExpression";
})(Ops$1 || (Ops$1 = {}));

class CompiledStaticTemplate {
    constructor(handle) {
        this.handle = handle;
    }
}
class CompiledDynamicTemplate {
    constructor(handle, symbolTable) {
        this.handle = handle;
        this.symbolTable = symbolTable;
    }
}

function compileLayout(compilable, env) {
    let builder = new ComponentLayoutBuilder(env);
    compilable.compile(builder);
    return builder.compile();
}
class ComponentLayoutBuilder {
    constructor(env) {
        this.env = env;
    }
    wrapLayout(layout) {
        this.inner = new WrappedBuilder(this.env, layout);
    }
    fromLayout(componentName, layout) {
        this.inner = new UnwrappedBuilder(this.env, componentName, layout);
    }
    compile() {
        return this.inner.compile();
    }
    get tag() {
        return this.inner.tag;
    }
    get attrs() {
        return this.inner.attrs;
    }
}
class WrappedBuilder {
    constructor(env, layout) {
        this.env = env;
        this.layout = layout;
        this.tag = new ComponentTagBuilder();
        this.attrs = new ComponentAttrsBuilder();
    }
    compile() {
        //========DYNAMIC
        //        PutValue(TagExpr)
        //        Test
        //        JumpUnless(BODY)
        //        OpenDynamicPrimitiveElement
        //        DidCreateElement
        //        ...attr statements...
        //        FlushElement
        // BODY:  Noop
        //        ...body statements...
        //        PutValue(TagExpr)
        //        Test
        //        JumpUnless(END)
        //        CloseElement
        // END:   Noop
        //        DidRenderLayout
        //        Exit
        //
        //========STATIC
        //        OpenPrimitiveElementOpcode
        //        DidCreateElement
        //        ...attr statements...
        //        FlushElement
        //        ...body statements...
        //        CloseElement
        //        DidRenderLayout
        //        Exit
        let env = this.env,
            layout = this.layout;

        let meta = { templateMeta: layout.meta, symbols: layout.symbols, asPartial: false };
        let dynamicTag = this.tag.getDynamic();
        let staticTag = this.tag.getStatic();
        let b = builder(env, meta);
        b.startLabels();
        if (dynamicTag) {
            b.fetch(Register.s1);
            expr(dynamicTag, b);
            b.dup();
            b.load(Register.s1);
            b.test('simple');
            b.jumpUnless('BODY');
            b.fetch(Register.s1);
            b.pushComponentOperations();
            b.openDynamicElement();
        } else if (staticTag) {
            b.pushComponentOperations();
            b.openElementWithOperations(staticTag);
        }
        if (dynamicTag || staticTag) {
            b.didCreateElement(Register.s0);
            let attrs = this.attrs.buffer;
            for (let i = 0; i < attrs.length; i++) {
                compileStatement(attrs[i], b);
            }
            b.flushElement();
        }
        b.label('BODY');
        b.invokeStatic(layout.asBlock());
        if (dynamicTag) {
            b.fetch(Register.s1);
            b.test('simple');
            b.jumpUnless('END');
            b.closeElement();
        } else if (staticTag) {
            b.closeElement();
        }
        b.label('END');
        b.didRenderLayout(Register.s0);
        if (dynamicTag) {
            b.load(Register.s1);
        }
        b.stopLabels();
        let start = b.start;
        let end = b.finalize();
        return new CompiledDynamicTemplate(start, {
            meta,
            hasEval: layout.hasEval,
            symbols: layout.symbols.concat([ATTRS_BLOCK])
        });
    }
}
class UnwrappedBuilder {
    constructor(env, componentName, layout) {
        this.env = env;
        this.componentName = componentName;
        this.layout = layout;
        this.attrs = new ComponentAttrsBuilder();
    }
    get tag() {
        throw new Error('BUG: Cannot call `tag` on an UnwrappedBuilder');
    }
    compile() {
        let env = this.env,
            layout = this.layout;

        return layout.asLayout(this.componentName, this.attrs.buffer).compileDynamic(env);
    }
}
class ComponentTagBuilder {
    constructor() {
        this.isDynamic = null;
        this.isStatic = null;
        this.staticTagName = null;
        this.dynamicTagName = null;
    }
    getDynamic() {
        if (this.isDynamic) {
            return this.dynamicTagName;
        }
    }
    getStatic() {
        if (this.isStatic) {
            return this.staticTagName;
        }
    }
    static(tagName) {
        this.isStatic = true;
        this.staticTagName = tagName;
    }
    dynamic(tagName) {
        this.isDynamic = true;
        this.dynamicTagName = [Opcodes.ClientSideExpression, Ops$1.FunctionExpression, tagName];
    }
}
class ComponentAttrsBuilder {
    constructor() {
        this.buffer = [];
    }
    static(name, value) {
        this.buffer.push([Opcodes.StaticAttr, name, value, null]);
    }
    dynamic(name, value) {
        this.buffer.push([Opcodes.DynamicAttr, name, [Opcodes.ClientSideExpression, Ops$1.FunctionExpression, value], null]);
    }
}
class ComponentBuilder {
    constructor(builder) {
        this.builder = builder;
        this.env = builder.env;
    }
    static(definition, args) {
        let params = args[0],
            hash = args[1],
            _default = args[2],
            inverse = args[3];
        let builder = this.builder;

        builder.pushComponentManager(definition);
        builder.invokeComponent(null, params, hash, _default, inverse);
    }
    dynamic(definitionArgs, getDefinition, args) {
        let params = args[0],
            hash = args[1],
            block = args[2],
            inverse = args[3];
        let builder = this.builder;

        if (!definitionArgs || definitionArgs.length === 0) {
            throw new Error("Dynamic syntax without an argument");
        }
        let meta = this.builder.meta.templateMeta;
        function helper(vm, a) {
            return getDefinition(vm, a, meta);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        builder.compileArgs(definitionArgs[0], definitionArgs[1], true);
        builder.helper(helper);
        builder.dup();
        builder.test('simple');
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.pushDynamicComponentManager();
        builder.invokeComponent(null, params, hash, block, inverse);
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    }
}
function builder(env, meta) {
    return new OpcodeBuilder(env, meta);
}

class RawInlineBlock {
    constructor(meta, statements, parameters) {
        this.meta = meta;
        this.statements = statements;
        this.parameters = parameters;
    }
    scan() {
        return new CompilableTemplate(this.statements, { parameters: this.parameters, meta: this.meta });
    }
}

class Labels {
    constructor() {
        this.labels = dict();
        this.targets = [];
    }
    label(name, index) {
        this.labels[name] = index;
    }
    target(at, Target, target) {
        this.targets.push({ at, Target, target });
    }
    patch(program) {
        let targets = this.targets,
            labels = this.labels;

        for (let i = 0; i < targets.length; i++) {
            var _targets$i = targets[i];
            let at = _targets$i.at,
                target = _targets$i.target;

            let goto = labels[target] - at;
            program.heap.setbyaddr(at + 1, goto);
        }
    }
}
class BasicOpcodeBuilder {
    constructor(env, meta, program) {
        this.env = env;
        this.meta = meta;
        this.program = program;
        this.labelsStack = new Stack();
        this.constants = program.constants;
        this.heap = program.heap;
        this.start = this.heap.malloc();
    }
    get pos() {
        return typePos(this.heap.size());
    }
    get nextPos() {
        return this.heap.size();
    }
    upvars(count) {
        return fillNulls(count);
    }
    reserve(name) {
        this.push(name, 0, 0, 0);
    }
    push(name, op1 = 0, op2 = 0, op3 = 0) {
        this.heap.push(name);
        this.heap.push(op1);
        this.heap.push(op2);
        this.heap.push(op3);
    }
    finalize() {
        this.push(22 /* Return */);
        this.heap.finishMalloc(this.start);
        return this.start;
    }
    // args
    pushArgs(synthetic) {
        this.push(58 /* PushArgs */, synthetic === true ? 1 : 0);
    }
    // helpers
    get labels() {
        return expect(this.labelsStack.current, 'bug: not in a label stack');
    }
    startLabels() {
        this.labelsStack.push(new Labels());
    }
    stopLabels() {
        let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
        label.patch(this.program);
    }
    // components
    pushComponentManager(definition) {
        this.push(56 /* PushComponentManager */, this.other(definition));
    }
    pushDynamicComponentManager() {
        this.push(57 /* PushDynamicComponentManager */);
    }
    prepareArgs(state) {
        this.push(59 /* PrepareArgs */, state);
    }
    createComponent(state, hasDefault, hasInverse) {
        let flag = (hasDefault === true ? 1 : 0) | (hasInverse === true ? 1 : 0) << 1;
        this.push(60 /* CreateComponent */, flag, state);
    }
    registerComponentDestructor(state) {
        this.push(61 /* RegisterComponentDestructor */, state);
    }
    beginComponentTransaction() {
        this.push(65 /* BeginComponentTransaction */);
    }
    commitComponentTransaction() {
        this.push(66 /* CommitComponentTransaction */);
    }
    pushComponentOperations() {
        this.push(62 /* PushComponentOperations */);
    }
    getComponentSelf(state) {
        this.push(63 /* GetComponentSelf */, state);
    }
    getComponentLayout(state) {
        this.push(64 /* GetComponentLayout */, state);
    }
    didCreateElement(state) {
        this.push(67 /* DidCreateElement */, state);
    }
    didRenderLayout(state) {
        this.push(68 /* DidRenderLayout */, state);
    }
    // partial
    getPartialTemplate() {
        this.push(69 /* GetPartialTemplate */);
    }
    resolveMaybeLocal(name) {
        this.push(70 /* ResolveMaybeLocal */, this.string(name));
    }
    // debugger
    debugger(symbols, evalInfo) {
        this.push(71 /* Debugger */, this.constants.other(symbols), this.constants.array(evalInfo));
    }
    // content
    dynamicContent(Opcode) {
        this.push(26 /* DynamicContent */, this.other(Opcode));
    }
    cautiousAppend() {
        this.dynamicContent(new OptimizedCautiousAppendOpcode());
    }
    trustingAppend() {
        this.dynamicContent(new OptimizedTrustingAppendOpcode());
    }
    // dom
    text(text) {
        this.push(24 /* Text */, this.constants.string(text));
    }
    openPrimitiveElement(tag) {
        this.push(27 /* OpenElement */, this.constants.string(tag));
    }
    openElementWithOperations(tag) {
        this.push(28 /* OpenElementWithOperations */, this.constants.string(tag));
    }
    openDynamicElement() {
        this.push(29 /* OpenDynamicElement */);
    }
    flushElement() {
        this.push(33 /* FlushElement */);
    }
    closeElement() {
        this.push(34 /* CloseElement */);
    }
    staticAttr(_name, _namespace, _value) {
        let name = this.constants.string(_name);
        let namespace = _namespace ? this.constants.string(_namespace) : 0;
        let value = this.constants.string(_value);
        this.push(30 /* StaticAttr */, name, value, namespace);
    }
    dynamicAttrNS(_name, _namespace, trusting) {
        let name = this.constants.string(_name);
        let namespace = this.constants.string(_namespace);
        this.push(32 /* DynamicAttrNS */, name, namespace, trusting === true ? 1 : 0);
    }
    dynamicAttr(_name, trusting) {
        let name = this.constants.string(_name);
        this.push(31 /* DynamicAttr */, name, trusting === true ? 1 : 0);
    }
    comment(_comment) {
        let comment = this.constants.string(_comment);
        this.push(25 /* Comment */, comment);
    }
    modifier(_definition) {
        this.push(35 /* Modifier */, this.other(_definition));
    }
    // lists
    putIterator() {
        this.push(54 /* PutIterator */);
    }
    enterList(start) {
        this.reserve(52 /* EnterList */);
        this.labels.target(this.pos, 52 /* EnterList */, start);
    }
    exitList() {
        this.push(53 /* ExitList */);
    }
    iterate(breaks) {
        this.reserve(55 /* Iterate */);
        this.labels.target(this.pos, 55 /* Iterate */, breaks);
    }
    // expressions
    setVariable(symbol) {
        this.push(4 /* SetVariable */, symbol);
    }
    getVariable(symbol) {
        this.push(5 /* GetVariable */, symbol);
    }
    getProperty(key) {
        this.push(6 /* GetProperty */, this.string(key));
    }
    getBlock(symbol) {
        this.push(8 /* GetBlock */, symbol);
    }
    hasBlock(symbol) {
        this.push(9 /* HasBlock */, symbol);
    }
    hasBlockParams(symbol) {
        this.push(10 /* HasBlockParams */, symbol);
    }
    concat(size) {
        this.push(11 /* Concat */, size);
    }
    function(f) {
        this.push(2 /* Function */, this.func(f));
    }
    load(register) {
        this.push(17 /* Load */, register);
    }
    fetch(register) {
        this.push(18 /* Fetch */, register);
    }
    dup(register = Register.sp, offset = 0) {
        return this.push(15 /* Dup */, register, offset);
    }
    pop(count = 1) {
        return this.push(16 /* Pop */, count);
    }
    // vm
    pushRemoteElement() {
        this.push(36 /* PushRemoteElement */);
    }
    popRemoteElement() {
        this.push(37 /* PopRemoteElement */);
    }
    label(name) {
        this.labels.label(name, this.nextPos);
    }
    pushRootScope(symbols, bindCallerScope) {
        this.push(19 /* RootScope */, symbols, bindCallerScope ? 1 : 0);
    }
    pushChildScope() {
        this.push(20 /* ChildScope */);
    }
    popScope() {
        this.push(21 /* PopScope */);
    }
    returnTo(label) {
        this.reserve(23 /* ReturnTo */);
        this.labels.target(this.pos, 23 /* ReturnTo */, label);
    }
    pushDynamicScope() {
        this.push(39 /* PushDynamicScope */);
    }
    popDynamicScope() {
        this.push(40 /* PopDynamicScope */);
    }
    pushImmediate(value) {
        this.push(13 /* Constant */, this.other(value));
    }
    primitive(_primitive) {
        let flag = 0;
        let primitive;
        switch (typeof _primitive) {
            case 'number':
                primitive = _primitive;
                break;
            case 'string':
                primitive = this.string(_primitive);
                flag = 1;
                break;
            case 'boolean':
                primitive = _primitive | 0;
                flag = 2;
                break;
            case 'object':
                // assume null
                primitive = 2;
                flag = 2;
                break;
            case 'undefined':
                primitive = 3;
                flag = 2;
                break;
            default:
                throw new Error('Invalid primitive passed to pushPrimitive');
        }
        this.push(14 /* PrimitiveReference */, flag << 30 | primitive);
    }
    helper(func) {
        this.push(1 /* Helper */, this.func(func));
    }
    pushBlock(block) {
        this.push(7 /* PushBlock */, this.block(block));
    }
    bindDynamicScope(_names) {
        this.push(38 /* BindDynamicScope */, this.names(_names));
    }
    enter(args) {
        this.push(49 /* Enter */, args);
    }
    exit() {
        this.push(50 /* Exit */);
    }
    return() {
        this.push(22 /* Return */);
    }
    pushFrame() {
        this.push(47 /* PushFrame */);
    }
    popFrame() {
        this.push(48 /* PopFrame */);
    }
    compileDynamicBlock() {
        this.push(41 /* CompileDynamicBlock */);
    }
    invokeDynamic(invoker) {
        this.push(43 /* InvokeDynamic */, this.other(invoker));
    }
    invokeStatic(block, callerCount = 0) {
        let parameters = block.symbolTable.parameters;

        let calleeCount = parameters.length;
        let count = Math.min(callerCount, calleeCount);
        this.pushFrame();
        if (count) {
            this.pushChildScope();
            for (let i = 0; i < count; i++) {
                this.dup(Register.fp, callerCount - i);
                this.setVariable(parameters[i]);
            }
        }
        let _block = this.constants.block(block);
        this.push(42 /* InvokeStatic */, _block);
        if (count) {
            this.popScope();
        }
        this.popFrame();
    }
    test(testFunc) {
        let _func;
        if (testFunc === 'const') {
            _func = ConstTest;
        } else if (testFunc === 'simple') {
            _func = SimpleTest;
        } else if (testFunc === 'environment') {
            _func = EnvironmentTest;
        } else if (typeof testFunc === 'function') {
            _func = testFunc;
        } else {
            throw new Error('unreachable');
        }
        let func = this.constants.function(_func);
        this.push(51 /* Test */, func);
    }
    jump(target) {
        this.reserve(44 /* Jump */);
        this.labels.target(this.pos, 44 /* Jump */, target);
    }
    jumpIf(target) {
        this.reserve(45 /* JumpIf */);
        this.labels.target(this.pos, 45 /* JumpIf */, target);
    }
    jumpUnless(target) {
        this.reserve(46 /* JumpUnless */);
        this.labels.target(this.pos, 46 /* JumpUnless */, target);
    }
    string(_string) {
        return this.constants.string(_string);
    }
    names(_names) {
        let names = [];
        for (let i = 0; i < _names.length; i++) {
            let n = _names[i];
            names[i] = this.constants.string(n);
        }
        return this.constants.array(names);
    }
    symbols(symbols) {
        return this.constants.array(symbols);
    }
    other(value) {
        return this.constants.other(value);
    }
    block(block) {
        return block ? this.constants.block(block) : 0;
    }
    func(func) {
        return this.constants.function(func);
    }
}
function isCompilableExpression(expr$$1) {
    return typeof expr$$1 === 'object' && expr$$1 !== null && typeof expr$$1.compile === 'function';
}
class OpcodeBuilder extends BasicOpcodeBuilder {
    constructor(env, meta, program = env.program) {
        super(env, meta, program);
        this.component = new ComponentBuilder(this);
    }
    compileArgs(params, hash, synthetic) {
        let positional = 0;
        if (params) {
            for (let i = 0; i < params.length; i++) {
                expr(params[i], this);
            }
            positional = params.length;
        }
        this.pushImmediate(positional);
        let names = EMPTY_ARRAY;
        if (hash) {
            names = hash[0];
            let val = hash[1];
            for (let i = 0; i < val.length; i++) {
                expr(val[i], this);
            }
        }
        this.pushImmediate(names);
        this.pushArgs(synthetic);
    }
    compile(expr$$1) {
        if (isCompilableExpression(expr$$1)) {
            return expr$$1.compile(this);
        } else {
            return expr$$1;
        }
    }
    guardedAppend(expression, trusting) {
        this.startLabels();
        this.pushFrame();
        this.returnTo('END');
        expr(expression, this);
        this.dup();
        this.test(reference => {
            return IsComponentDefinitionReference.create(reference);
        });
        this.enter(2);
        this.jumpUnless('ELSE');
        this.pushDynamicComponentManager();
        this.invokeComponent(null, null, null, null, null);
        this.exit();
        this.return();
        this.label('ELSE');
        if (trusting) {
            this.trustingAppend();
        } else {
            this.cautiousAppend();
        }
        this.exit();
        this.return();
        this.label('END');
        this.popFrame();
        this.stopLabels();
    }
    invokeComponent(attrs, params, hash, block, inverse = null) {
        this.fetch(Register.s0);
        this.dup(Register.sp, 1);
        this.load(Register.s0);
        this.pushBlock(block);
        this.pushBlock(inverse);
        this.compileArgs(params, hash, false);
        this.prepareArgs(Register.s0);
        this.beginComponentTransaction();
        this.pushDynamicScope();
        this.createComponent(Register.s0, block !== null, inverse !== null);
        this.registerComponentDestructor(Register.s0);
        this.getComponentSelf(Register.s0);
        this.getComponentLayout(Register.s0);
        this.invokeDynamic(new InvokeDynamicLayout(attrs && attrs.scan()));
        this.popFrame();
        this.popScope();
        this.popDynamicScope();
        this.commitComponentTransaction();
        this.load(Register.s0);
    }
    template(block) {
        if (!block) return null;
        return new RawInlineBlock(this.meta, block.statements, block.parameters);
    }
}

var Ops$2 = Opcodes;
const ATTRS_BLOCK = '&attrs';
class Compilers {
    constructor(offset = 0) {
        this.offset = offset;
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    compile(sexp, builder) {
        let name = sexp[this.offset];
        let index = this.names[name];
        let func = this.funcs[index];
        debugAssert(!!func, `expected an implementation for ${this.offset === 0 ? Ops$2[sexp[0]] : Ops$1[sexp[1]]}`);
        func(sexp, builder);
    }
}
const STATEMENTS = new Compilers();
const CLIENT_SIDE = new Compilers(1);
STATEMENTS.add(Ops$2.Text, (sexp, builder) => {
    builder.text(sexp[1]);
});
STATEMENTS.add(Ops$2.Comment, (sexp, builder) => {
    builder.comment(sexp[1]);
});
STATEMENTS.add(Ops$2.CloseElement, (_sexp, builder) => {
    builder.closeElement();
});
STATEMENTS.add(Ops$2.FlushElement, (_sexp, builder) => {
    builder.flushElement();
});
STATEMENTS.add(Ops$2.Modifier, (sexp, builder) => {
    let env = builder.env,
        meta = builder.meta;
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3];

    if (env.hasModifier(name, meta.templateMeta)) {
        builder.compileArgs(params, hash, true);
        builder.modifier(env.lookupModifier(name, meta.templateMeta));
    } else {
        throw new Error(`Compile Error ${name} is not a modifier: Helpers may not be used in the element form.`);
    }
});
STATEMENTS.add(Ops$2.StaticAttr, (sexp, builder) => {
    let name = sexp[1],
        value = sexp[2],
        namespace = sexp[3];

    builder.staticAttr(name, namespace, value);
});
STATEMENTS.add(Ops$2.DynamicAttr, (sexp, builder) => {
    dynamicAttr(sexp, false, builder);
});
STATEMENTS.add(Ops$2.TrustingAttr, (sexp, builder) => {
    dynamicAttr(sexp, true, builder);
});
function dynamicAttr(sexp, trusting, builder) {
    let name = sexp[1],
        value = sexp[2],
        namespace = sexp[3];

    expr(value, builder);
    if (namespace) {
        builder.dynamicAttrNS(name, namespace, trusting);
    } else {
        builder.dynamicAttr(name, trusting);
    }
}
STATEMENTS.add(Ops$2.OpenElement, (sexp, builder) => {
    builder.openPrimitiveElement(sexp[1]);
});
CLIENT_SIDE.add(Ops$1.OpenComponentElement, (sexp, builder) => {
    builder.pushComponentOperations();
    builder.openElementWithOperations(sexp[2]);
});
CLIENT_SIDE.add(Ops$1.DidCreateElement, (_sexp, builder) => {
    builder.didCreateElement(Register.s0);
});
CLIENT_SIDE.add(Ops$1.DidRenderLayout, (_sexp, builder) => {
    builder.didRenderLayout(Register.s0);
});
STATEMENTS.add(Ops$2.Append, (sexp, builder) => {
    let value = sexp[1],
        trusting = sexp[2];

    var _builder$env$macros = builder.env.macros();

    let inlines = _builder$env$macros.inlines;

    let returned = inlines.compile(sexp, builder) || value;
    if (returned === true) return;
    let isGet = E.isGet(value);
    let isMaybeLocal = E.isMaybeLocal(value);
    if (trusting) {
        builder.guardedAppend(value, true);
    } else {
        if (isGet || isMaybeLocal) {
            builder.guardedAppend(value, false);
        } else {
            expr(value, builder);
            builder.cautiousAppend();
        }
    }
});
STATEMENTS.add(Ops$2.Block, (sexp, builder) => {
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3],
        _template = sexp[4],
        _inverse = sexp[5];

    let template = builder.template(_template);
    let inverse = builder.template(_inverse);
    let templateBlock = template && template.scan();
    let inverseBlock = inverse && inverse.scan();

    var _builder$env$macros2 = builder.env.macros();

    let blocks = _builder$env$macros2.blocks;

    blocks.compile(name, params, hash, templateBlock, inverseBlock, builder);
});
class InvokeDynamicLayout {
    constructor(attrs) {
        this.attrs = attrs;
    }
    invoke(vm, layout) {
        var _layout$symbolTable = layout.symbolTable;
        let symbols = _layout$symbolTable.symbols,
            hasEval = _layout$symbolTable.hasEval;

        let stack = vm.stack;
        let scope = vm.pushRootScope(symbols.length + 1, true);
        scope.bindSelf(stack.pop());
        scope.bindBlock(symbols.indexOf(ATTRS_BLOCK) + 1, this.attrs);
        let lookup = null;
        let $eval = -1;
        if (hasEval) {
            $eval = symbols.indexOf('$eval') + 1;
            lookup = dict();
        }
        let callerNames = stack.pop();
        for (let i = callerNames.length - 1; i >= 0; i--) {
            let symbol = symbols.indexOf(callerNames[i]);
            let value = stack.pop();
            if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
            if (hasEval) lookup[callerNames[i]] = value;
        }
        let numPositionalArgs = stack.pop();
        debugAssert(typeof numPositionalArgs === 'number', '[BUG] Incorrect value of positional argument count found during invoke-dynamic-layout.');
        // Currently we don't support accessing positional args in templates, so just throw them away
        stack.pop(numPositionalArgs);
        let inverseSymbol = symbols.indexOf('&inverse');
        let inverse = stack.pop();
        if (inverseSymbol !== -1) {
            scope.bindBlock(inverseSymbol + 1, inverse);
        }
        if (lookup) lookup['&inverse'] = inverse;
        let defaultSymbol = symbols.indexOf('&default');
        let defaultBlock = stack.pop();
        if (defaultSymbol !== -1) {
            scope.bindBlock(defaultSymbol + 1, defaultBlock);
        }
        if (lookup) lookup['&default'] = defaultBlock;
        if (lookup) scope.bindEvalScope(lookup);
        vm.pushFrame();
        vm.call(layout.handle);
    }
    toJSON() {
        return { GlimmerDebug: '<invoke-dynamic-layout>' };
    }
}
STATEMENTS.add(Ops$2.Component, (sexp, builder) => {
    let tag = sexp[1],
        attrs = sexp[2],
        args = sexp[3],
        block = sexp[4];

    if (builder.env.hasComponentDefinition(tag, builder.meta.templateMeta)) {
        let child = builder.template(block);
        let attrsBlock = new RawInlineBlock(builder.meta, attrs, EMPTY_ARRAY);
        let definition = builder.env.getComponentDefinition(tag, builder.meta.templateMeta);
        builder.pushComponentManager(definition);
        builder.invokeComponent(attrsBlock, null, args, child && child.scan());
    } else if (block && block.parameters.length) {
        throw new Error(`Compile Error: Cannot find component ${tag}`);
    } else {
        builder.openPrimitiveElement(tag);
        for (let i = 0; i < attrs.length; i++) {
            STATEMENTS.compile(attrs[i], builder);
        }
        builder.flushElement();
        if (block) {
            let stmts = block.statements;
            for (let i = 0; i < stmts.length; i++) {
                STATEMENTS.compile(stmts[i], builder);
            }
        }
        builder.closeElement();
    }
});
class PartialInvoker {
    constructor(outerSymbols, evalInfo) {
        this.outerSymbols = outerSymbols;
        this.evalInfo = evalInfo;
    }
    invoke(vm, _partial) {
        let partial = unwrap(_partial);
        let partialSymbols = partial.symbolTable.symbols;
        let outerScope = vm.scope();
        let partialScope = vm.pushRootScope(partialSymbols.length, false);
        partialScope.bindCallerScope(outerScope.getCallerScope());
        partialScope.bindEvalScope(outerScope.getEvalScope());
        partialScope.bindSelf(outerScope.getSelf());
        let evalInfo = this.evalInfo,
            outerSymbols = this.outerSymbols;

        let locals = dict();
        for (let i = 0; i < evalInfo.length; i++) {
            let slot = evalInfo[i];
            let name = outerSymbols[slot - 1];
            let ref = outerScope.getSymbol(slot);
            locals[name] = ref;
        }
        let evalScope = outerScope.getEvalScope();
        for (let i = 0; i < partialSymbols.length; i++) {
            let name = partialSymbols[i];
            let symbol = i + 1;
            let value = evalScope[name];
            if (value !== undefined) partialScope.bind(symbol, value);
        }
        partialScope.bindPartialMap(locals);
        vm.pushFrame();
        vm.call(partial.handle);
    }
}
STATEMENTS.add(Ops$2.Partial, (sexp, builder) => {
    let name = sexp[1],
        evalInfo = sexp[2];
    var _builder$meta = builder.meta;
    let templateMeta = _builder$meta.templateMeta,
        symbols = _builder$meta.symbols;

    function helper(vm, args) {
        let env = vm.env;

        let nameRef = args.positional.at(0);
        return map(nameRef, n => {
            if (typeof n === 'string' && n) {
                if (!env.hasPartial(n, templateMeta)) {
                    throw new Error(`Could not find a partial named "${n}"`);
                }
                return env.lookupPartial(n, templateMeta);
            } else if (n) {
                throw new Error(`Could not find a partial named "${String(n)}"`);
            } else {
                return null;
            }
        });
    }
    builder.startLabels();
    builder.pushFrame();
    builder.returnTo('END');
    expr(name, builder);
    builder.pushImmediate(1);
    builder.pushImmediate(EMPTY_ARRAY);
    builder.pushArgs(true);
    builder.helper(helper);
    builder.dup();
    builder.test('simple');
    builder.enter(2);
    builder.jumpUnless('ELSE');
    builder.getPartialTemplate();
    builder.compileDynamicBlock();
    builder.invokeDynamic(new PartialInvoker(symbols, evalInfo));
    builder.popScope();
    builder.popFrame();
    builder.label('ELSE');
    builder.exit();
    builder.return();
    builder.label('END');
    builder.popFrame();
    builder.stopLabels();
});
class InvokeDynamicYield {
    constructor(callerCount) {
        this.callerCount = callerCount;
    }
    invoke(vm, block) {
        let callerCount = this.callerCount;

        let stack = vm.stack;
        if (!block) {
            // To balance the pop{Frame,Scope}
            vm.pushFrame();
            vm.pushCallerScope();
            return;
        }
        let table = block.symbolTable;
        let locals = table.parameters; // always present in inline blocks
        let calleeCount = locals ? locals.length : 0;
        let count = Math.min(callerCount, calleeCount);
        vm.pushFrame();
        vm.pushCallerScope(calleeCount > 0);
        let scope = vm.scope();
        for (let i = 0; i < count; i++) {
            scope.bindSymbol(locals[i], stack.fromBase(callerCount - i));
        }
        vm.call(block.handle);
    }
    toJSON() {
        return { GlimmerDebug: `<invoke-dynamic-yield caller-count=${this.callerCount}>` };
    }
}
STATEMENTS.add(Ops$2.Yield, (sexp, builder) => {
    let to = sexp[1],
        params = sexp[2];

    let count = compileList(params, builder);
    builder.getBlock(to);
    builder.compileDynamicBlock();
    builder.invokeDynamic(new InvokeDynamicYield(count));
    builder.popScope();
    builder.popFrame();
    if (count) {
        builder.pop(count);
    }
});
STATEMENTS.add(Ops$2.Debugger, (sexp, builder) => {
    let evalInfo = sexp[1];

    builder.debugger(builder.meta.symbols, evalInfo);
});
STATEMENTS.add(Ops$2.ClientSideStatement, (sexp, builder) => {
    CLIENT_SIDE.compile(sexp, builder);
});
const EXPRESSIONS = new Compilers();
const CLIENT_SIDE_EXPRS = new Compilers(1);
var E = Expressions;
function expr(expression, builder) {
    if (Array.isArray(expression)) {
        EXPRESSIONS.compile(expression, builder);
    } else {
        builder.primitive(expression);
    }
}
EXPRESSIONS.add(Ops$2.Unknown, (sexp, builder) => {
    let name = sexp[1];
    if (builder.env.hasHelper(name, builder.meta.templateMeta)) {
        EXPRESSIONS.compile([Ops$2.Helper, name, EMPTY_ARRAY, null], builder);
    } else if (builder.meta.asPartial) {
        builder.resolveMaybeLocal(name);
    } else {
        builder.getVariable(0);
        builder.getProperty(name);
    }
});
EXPRESSIONS.add(Ops$2.Concat, (sexp, builder) => {
    let parts = sexp[1];
    for (let i = 0; i < parts.length; i++) {
        expr(parts[i], builder);
    }
    builder.concat(parts.length);
});
CLIENT_SIDE_EXPRS.add(Ops$1.FunctionExpression, (sexp, builder) => {
    builder.function(sexp[2]);
});
EXPRESSIONS.add(Ops$2.Helper, (sexp, builder) => {
    let env = builder.env,
        meta = builder.meta;
    let name = sexp[1],
        params = sexp[2],
        hash = sexp[3];

    if (env.hasHelper(name, meta.templateMeta)) {
        builder.compileArgs(params, hash, true);
        builder.helper(env.lookupHelper(name, meta.templateMeta));
    } else {
        throw new Error(`Compile Error: ${name} is not a helper`);
    }
});
EXPRESSIONS.add(Ops$2.Get, (sexp, builder) => {
    let head = sexp[1],
        path = sexp[2];

    builder.getVariable(head);
    for (let i = 0; i < path.length; i++) {
        builder.getProperty(path[i]);
    }
});
EXPRESSIONS.add(Ops$2.MaybeLocal, (sexp, builder) => {
    let path = sexp[1];

    if (builder.meta.asPartial) {
        let head = path[0];
        path = path.slice(1);
        builder.resolveMaybeLocal(head);
    } else {
        builder.getVariable(0);
    }
    for (let i = 0; i < path.length; i++) {
        builder.getProperty(path[i]);
    }
});
EXPRESSIONS.add(Ops$2.Undefined, (_sexp, builder) => {
    return builder.primitive(undefined);
});
EXPRESSIONS.add(Ops$2.HasBlock, (sexp, builder) => {
    builder.hasBlock(sexp[1]);
});
EXPRESSIONS.add(Ops$2.HasBlockParams, (sexp, builder) => {
    builder.hasBlockParams(sexp[1]);
});
EXPRESSIONS.add(Ops$2.ClientSideExpression, (sexp, builder) => {
    CLIENT_SIDE_EXPRS.compile(sexp, builder);
});
function compileList(params, builder) {
    if (!params) return 0;
    for (let i = 0; i < params.length; i++) {
        expr(params[i], builder);
    }
    return params.length;
}
class Blocks {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(name, params, hash, template, inverse, builder) {
        let index = this.names[name];
        if (index === undefined) {
            debugAssert(!!this.missing, `${name} not found, and no catch-all block handler was registered`);
            let func = this.missing;
            let handled = func(name, params, hash, template, inverse, builder);
            debugAssert(!!handled, `${name} not found, and the catch-all block handler didn't handle it`);
        } else {
            let func = this.funcs[index];
            func(params, hash, template, inverse, builder);
        }
    }
}
const BLOCKS = new Blocks();
class Inlines {
    constructor() {
        this.names = dict();
        this.funcs = [];
    }
    add(name, func) {
        this.funcs.push(func);
        this.names[name] = this.funcs.length - 1;
    }
    addMissing(func) {
        this.missing = func;
    }
    compile(sexp, builder) {
        let value = sexp[1];
        // TODO: Fix this so that expression macros can return
        // things like components, so that {{component foo}}
        // is the same as {{(component foo)}}
        if (!Array.isArray(value)) return ['expr', value];
        let name;
        let params;
        let hash;
        if (value[0] === Ops$2.Helper) {
            name = value[1];
            params = value[2];
            hash = value[3];
        } else if (value[0] === Ops$2.Unknown) {
            name = value[1];
            params = hash = null;
        } else {
            return ['expr', value];
        }
        let index = this.names[name];
        if (index === undefined && this.missing) {
            let func = this.missing;
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else if (index !== undefined) {
            let func = this.funcs[index];
            let returned = func(name, params, hash, builder);
            return returned === false ? ['expr', value] : returned;
        } else {
            return ['expr', value];
        }
    }
}
const INLINES = new Inlines();
populateBuiltins(BLOCKS, INLINES);
function populateBuiltins(blocks = new Blocks(), inlines = new Inlines()) {
    blocks.add('if', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #if requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.test('environment');
        builder.enter(1);
        builder.jumpUnless('ELSE');
        builder.invokeStatic(unwrap(template));
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('unless', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #unless requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.test('environment');
        builder.enter(1);
        builder.jumpIf('ELSE');
        builder.invokeStatic(unwrap(template));
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('with', (params, _hash, template, inverse, builder) => {
        //        PutArgs
        //        Test(Environment)
        //        Enter(BEGIN, END)
        // BEGIN: Noop
        //        JumpUnless(ELSE)
        //        Evaluate(default)
        //        Jump(END)
        // ELSE:  Noop
        //        Evalulate(inverse)
        // END:   Noop
        //        Exit
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #with requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        expr(params[0], builder);
        builder.dup();
        builder.test('environment');
        builder.enter(2);
        builder.jumpUnless('ELSE');
        builder.invokeStatic(unwrap(template), 1);
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('each', (params, hash, template, inverse, builder) => {
        //         Enter(BEGIN, END)
        // BEGIN:  Noop
        //         PutArgs
        //         PutIterable
        //         JumpUnless(ELSE)
        //         EnterList(BEGIN2, END2)
        // ITER:   Noop
        //         NextIter(BREAK)
        // BEGIN2: Noop
        //         PushChildScope
        //         Evaluate(default)
        //         PopScope
        // END2:   Noop
        //         Exit
        //         Jump(ITER)
        // BREAK:  Noop
        //         ExitList
        //         Jump(END)
        // ELSE:   Noop
        //         Evalulate(inverse)
        // END:    Noop
        //         Exit
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        if (hash && hash[0][0] === 'key') {
            expr(hash[1][0], builder);
        } else {
            builder.primitive(null);
        }
        expr(params[0], builder);
        builder.enter(2);
        builder.putIterator();
        builder.jumpUnless('ELSE');
        builder.pushFrame();
        builder.returnTo('ITER');
        builder.dup(Register.fp, 1);
        builder.enterList('BODY');
        builder.label('ITER');
        builder.iterate('BREAK');
        builder.label('BODY');
        builder.invokeStatic(unwrap(template), 2);
        builder.pop(2);
        builder.exit();
        builder.return();
        builder.label('BREAK');
        builder.exitList();
        builder.popFrame();
        if (inverse) {
            builder.jump('EXIT');
            builder.label('ELSE');
            builder.invokeStatic(inverse);
            builder.label('EXIT');
            builder.exit();
            builder.return();
        } else {
            builder.label('ELSE');
            builder.exit();
            builder.return();
        }
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('-in-element', (params, hash, template, _inverse, builder) => {
        if (!params || params.length !== 1) {
            throw new Error(`SYNTAX ERROR: #-in-element requires a single argument`);
        }
        builder.startLabels();
        builder.pushFrame();
        builder.returnTo('END');
        if (hash && hash[0].length) {
            let keys = hash[0],
                values = hash[1];

            if (keys.length === 1 && keys[0] === 'nextSibling') {
                expr(values[0], builder);
            } else {
                throw new Error(`SYNTAX ERROR: #-in-element does not take a \`${keys[0]}\` option`);
            }
        } else {
            expr(null, builder);
        }
        expr(params[0], builder);
        builder.dup();
        builder.test('simple');
        builder.enter(3);
        builder.jumpUnless('ELSE');
        builder.pushRemoteElement();
        builder.invokeStatic(unwrap(template));
        builder.popRemoteElement();
        builder.label('ELSE');
        builder.exit();
        builder.return();
        builder.label('END');
        builder.popFrame();
        builder.stopLabels();
    });
    blocks.add('-with-dynamic-vars', (_params, hash, template, _inverse, builder) => {
        if (hash) {
            let names = hash[0],
                expressions = hash[1];

            compileList(expressions, builder);
            builder.pushDynamicScope();
            builder.bindDynamicScope(names);
            builder.invokeStatic(unwrap(template));
            builder.popDynamicScope();
        } else {
            builder.invokeStatic(unwrap(template));
        }
    });
    return { blocks, inlines };
}
function compileStatement(statement, builder) {
    STATEMENTS.compile(statement, builder);
}
function compileStatements(statements, meta, env) {
    let b = new OpcodeBuilder(env, meta);
    for (let i = 0; i < statements.length; i++) {
        compileStatement(statements[i], b);
    }
    return b;
}

class CompilableTemplate {
    constructor(statements, symbolTable) {
        this.statements = statements;
        this.symbolTable = symbolTable;
        this.compiledStatic = null;
        this.compiledDynamic = null;
    }
    compileStatic(env) {
        let compiledStatic = this.compiledStatic;

        if (!compiledStatic) {
            let builder = compileStatements(this.statements, this.symbolTable.meta, env);
            builder.finalize();
            let handle = builder.start;
            compiledStatic = this.compiledStatic = new CompiledStaticTemplate(handle);
        }
        return compiledStatic;
    }
    compileDynamic(env) {
        let compiledDynamic = this.compiledDynamic;

        if (!compiledDynamic) {
            let staticBlock = this.compileStatic(env);
            compiledDynamic = new CompiledDynamicTemplate(staticBlock.handle, this.symbolTable);
        }
        return compiledDynamic;
    }
}

var Ops$$1 = Opcodes;
class Scanner {
    constructor(block, env) {
        this.block = block;
        this.env = env;
    }
    scanEntryPoint(meta) {
        let block = this.block;
        let statements = block.statements,
            symbols = block.symbols,
            hasEval = block.hasEval;

        return new CompilableTemplate(statements, { meta, symbols, hasEval });
    }
    scanBlock(meta) {
        let block = this.block;
        let statements = block.statements;

        return new CompilableTemplate(statements, { meta, parameters: EMPTY_ARRAY });
    }
    scanLayout(meta, attrs, componentName) {
        let block = this.block;
        let statements = block.statements,
            symbols = block.symbols,
            hasEval = block.hasEval;

        let symbolTable = { meta, hasEval, symbols };
        let newStatements = [];
        let toplevel;
        let inTopLevel = false;
        for (let i = 0; i < statements.length; i++) {
            let statement = statements[i];
            if (Statements.isComponent(statement)) {
                let tagName = statement[1];
                if (!this.env.hasComponentDefinition(tagName, meta.templateMeta)) {
                    if (toplevel !== undefined) {
                        newStatements.push([Ops$$1.OpenElement, tagName]);
                    } else {
                        toplevel = tagName;
                        decorateTopLevelElement(tagName, symbols, attrs, newStatements);
                    }
                    addFallback(statement, newStatements);
                } else {
                    if (toplevel === undefined && tagName === componentName) {
                        toplevel = tagName;
                        decorateTopLevelElement(tagName, symbols, attrs, newStatements);
                        addFallback(statement, newStatements);
                    } else {
                        newStatements.push(statement);
                    }
                }
            } else {
                if (toplevel === undefined && Statements.isOpenElement(statement)) {
                    toplevel = statement[1];
                    inTopLevel = true;
                    decorateTopLevelElement(toplevel, symbols, attrs, newStatements);
                } else {
                    if (inTopLevel) {
                        if (Statements.isFlushElement(statement)) {
                            inTopLevel = false;
                        } else if (Statements.isModifier(statement)) {
                            throw Error(`Found modifier "${statement[1]}" on the top-level element of "${componentName}"\. Modifiers cannot be on the top-level element`);
                        }
                    }
                    newStatements.push(statement);
                }
            }
        }
        newStatements.push([Ops$$1.ClientSideStatement, Ops$1.DidRenderLayout]);
        return new CompilableTemplate(newStatements, symbolTable);
    }
}
function addFallback(statement, buffer) {
    let attrs = statement[2],
        block = statement[4];

    for (let i = 0; i < attrs.length; i++) {
        buffer.push(attrs[i]);
    }
    buffer.push([Ops$$1.FlushElement]);
    if (block) {
        let statements = block.statements;

        for (let i = 0; i < statements.length; i++) {
            buffer.push(statements[i]);
        }
    }
    buffer.push([Ops$$1.CloseElement]);
}
function decorateTopLevelElement(tagName, symbols, attrs, buffer) {
    let attrsSymbol = symbols.push(ATTRS_BLOCK);
    buffer.push([Ops$$1.ClientSideStatement, Ops$1.OpenComponentElement, tagName]);
    buffer.push([Ops$$1.ClientSideStatement, Ops$1.DidCreateElement]);
    buffer.push([Ops$$1.Yield, attrsSymbol, EMPTY_ARRAY]);
    buffer.push(...attrs);
}

class Constants {
    constructor() {
        // `0` means NULL
        this.references = [];
        this.strings = [];
        this.expressions = [];
        this.arrays = [];
        this.blocks = [];
        this.functions = [];
        this.others = [];
    }
    getReference(value) {
        return this.references[value - 1];
    }
    reference(value) {
        let index = this.references.length;
        this.references.push(value);
        return index + 1;
    }
    getString(value) {
        return this.strings[value - 1];
    }
    string(value) {
        let index = this.strings.length;
        this.strings.push(value);
        return index + 1;
    }
    getExpression(value) {
        return this.expressions[value - 1];
    }
    getArray(value) {
        return this.arrays[value - 1];
    }
    getNames(value) {
        let _names = [];
        let names = this.getArray(value);
        for (let i = 0; i < names.length; i++) {
            let n = names[i];
            _names[i] = this.getString(n);
        }
        return _names;
    }
    array(values) {
        let index = this.arrays.length;
        this.arrays.push(values);
        return index + 1;
    }
    getBlock(value) {
        return this.blocks[value - 1];
    }
    block(block) {
        let index = this.blocks.length;
        this.blocks.push(block);
        return index + 1;
    }
    getFunction(value) {
        return this.functions[value - 1];
    }
    function(f) {
        let index = this.functions.length;
        this.functions.push(f);
        return index + 1;
    }
    getOther(value) {
        return this.others[value - 1];
    }
    other(other) {
        let index = this.others.length;
        this.others.push(other);
        return index + 1;
    }
}

const badProtocols = ['javascript:', 'vbscript:'];
const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];
const badTagsForDataURI = ['EMBED'];
const badAttributes = ['href', 'src', 'background', 'action'];
const badAttributesForDataURI = ['src'];
function has(array, item) {
    return array.indexOf(item) !== -1;
}
function checkURI(tagName, attribute) {
    return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}
function checkDataURI(tagName, attribute) {
    if (tagName === null) return false;
    return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}
function requiresSanitization(tagName, attribute) {
    return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}
function sanitizeAttributeValue(env, element, attribute, value) {
    let tagName = null;
    if (value === null || value === undefined) {
        return value;
    }
    if (isSafeString(value)) {
        return value.toHTML();
    }
    if (!element) {
        tagName = null;
    } else {
        tagName = element.tagName.toUpperCase();
    }
    let str = normalizeTextValue(value);
    if (checkURI(tagName, attribute)) {
        let protocol = env.protocolForURL(str);
        if (has(badProtocols, protocol)) {
            return `unsafe:${str}`;
        }
    }
    if (checkDataURI(tagName, attribute)) {
        return `unsafe:${str}`;
    }
    return str;
}

/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
function normalizeProperty(element, slotName) {
    let type, normalized;
    if (slotName in element) {
        normalized = slotName;
        type = 'prop';
    } else {
        let lower = slotName.toLowerCase();
        if (lower in element) {
            type = 'prop';
            normalized = lower;
        } else {
            type = 'attr';
            normalized = slotName;
        }
    }
    if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
        type = 'attr';
    }
    return { normalized, type };
}

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
const ATTR_OVERRIDES = {
    // phantomjs < 2.0 lets you set it as a prop but won't reflect it
    // back to the attribute. button.getAttribute('type') === null
    BUTTON: { type: true, form: true },
    INPUT: {
        // Some version of IE (like IE9) actually throw an exception
        // if you set input.type = 'something-unknown'
        type: true,
        form: true,
        // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
        // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
        // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
        autocorrect: true,
        // Chrome 54.0.2840.98: 'list' in document.createElement('input') === true
        // Safari 9.1.3: 'list' in document.createElement('input') === false
        list: true
    },
    // element.form is actually a legitimate readOnly property, that is to be
    // mutated, but must be mutated by setAttribute...
    SELECT: { form: true },
    OPTION: { form: true },
    TEXTAREA: { form: true },
    LABEL: { form: true },
    FIELDSET: { form: true },
    LEGEND: { form: true },
    OBJECT: { form: true }
};
function preferAttr(tagName, propName) {
    let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
    return tag && tag[propName.toLowerCase()] || false;
}

let innerHTMLWrapper = {
    colgroup: { depth: 2, before: '<table><colgroup>', after: '</colgroup></table>' },
    table: { depth: 1, before: '<table>', after: '</table>' },
    tbody: { depth: 2, before: '<table><tbody>', after: '</tbody></table>' },
    tfoot: { depth: 2, before: '<table><tfoot>', after: '</tfoot></table>' },
    thead: { depth: 2, before: '<table><thead>', after: '</thead></table>' },
    tr: { depth: 3, before: '<table><tbody><tr>', after: '</tr></tbody></table>' }
};
// Patch:    innerHTML Fix
// Browsers: IE9
// Reason:   IE9 don't allow us to set innerHTML on col, colgroup, frameset,
//           html, style, table, tbody, tfoot, thead, title, tr.
// Fix:      Wrap the innerHTML we are about to set in its parents, apply the
//           wrapped innerHTML on a div, then move the unwrapped nodes into the
//           target position.
function domChanges(document, DOMChangesClass) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix(document)) {
        return DOMChangesClass;
    }
    let div = document.createElement('div');
    return class DOMChangesWithInnerHTMLFix extends DOMChangesClass {
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            let parentTag = parent.tagName.toLowerCase();
            let wrapper = innerHTMLWrapper[parentTag];
            if (wrapper === undefined) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            return fixInnerHTML(parent, wrapper, div, html, nextSibling);
        }
    };
}
function treeConstruction(document, DOMTreeConstructionClass) {
    if (!document) return DOMTreeConstructionClass;
    if (!shouldApplyFix(document)) {
        return DOMTreeConstructionClass;
    }
    let div = document.createElement('div');
    return class DOMTreeConstructionWithInnerHTMLFix extends DOMTreeConstructionClass {
        insertHTMLBefore(parent, referenceNode, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, referenceNode, html);
            }
            let parentTag = parent.tagName.toLowerCase();
            let wrapper = innerHTMLWrapper[parentTag];
            if (wrapper === undefined) {
                return super.insertHTMLBefore(parent, referenceNode, html);
            }
            return fixInnerHTML(parent, wrapper, div, html, referenceNode);
        }
    };
}
function fixInnerHTML(parent, wrapper, div, html, reference) {
    let wrappedHtml = wrapper.before + html + wrapper.after;
    div.innerHTML = wrappedHtml;
    let parentNode = div;
    for (let i = 0; i < wrapper.depth; i++) {
        parentNode = parentNode.childNodes[0];
    }

    var _moveNodesBefore = moveNodesBefore(parentNode, parent, reference);

    let first = _moveNodesBefore[0],
        last = _moveNodesBefore[1];

    return new ConcreteBounds(parent, first, last);
}
function shouldApplyFix(document) {
    let table = document.createElement('table');
    try {
        table.innerHTML = '<tbody></tbody>';
    } catch (e) {} finally {
        if (table.childNodes.length !== 0) {
            // It worked as expected, no fix required
            return false;
        }
    }
    return true;
}

const SVG_NAMESPACE$1 = 'http://www.w3.org/2000/svg';
// Patch:    insertAdjacentHTML on SVG Fix
// Browsers: Safari, IE, Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
//           present but throws an exception on IE and Edge. Old versions of
//           Firefox create nodes in the incorrect namespace.
// Fix:      Since IE and Edge silently fail to create SVG nodes using
//           innerHTML, and because Firefox may create nodes in the incorrect
//           namespace using innerHTML on SVG elements, an HTML-string wrapping
//           approach is used. A pre/post SVG tag is added to the string, then
//           that whole string is added to a div. The created nodes are plucked
//           out and applied to the target location on DOM.
function domChanges$1(document, DOMChangesClass, svgNamespace) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix$1(document, svgNamespace)) {
        return DOMChangesClass;
    }
    let div = document.createElement('div');
    return class DOMChangesWithSVGInnerHTMLFix extends DOMChangesClass {
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            if (parent.namespaceURI !== svgNamespace) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            return fixSVG(parent, div, html, nextSibling);
        }
    };
}
function treeConstruction$1(document, TreeConstructionClass, svgNamespace) {
    if (!document) return TreeConstructionClass;
    if (!shouldApplyFix$1(document, svgNamespace)) {
        return TreeConstructionClass;
    }
    let div = document.createElement('div');
    return class TreeConstructionWithSVGInnerHTMLFix extends TreeConstructionClass {
        insertHTMLBefore(parent, reference, html) {
            if (html === null || html === '') {
                return super.insertHTMLBefore(parent, reference, html);
            }
            if (parent.namespaceURI !== svgNamespace) {
                return super.insertHTMLBefore(parent, reference, html);
            }
            return fixSVG(parent, div, html, reference);
        }
    };
}
function fixSVG(parent, div, html, reference) {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    let wrappedHtml = '<svg>' + html + '</svg>';
    div.innerHTML = wrappedHtml;

    var _moveNodesBefore = moveNodesBefore(div.firstChild, parent, reference);

    let first = _moveNodesBefore[0],
        last = _moveNodesBefore[1];

    return new ConcreteBounds(parent, first, last);
}
function shouldApplyFix$1(document, svgNamespace) {
    let svg = document.createElementNS(svgNamespace, 'svg');
    try {
        svg['insertAdjacentHTML']('beforeend', '<circle></circle>');
    } catch (e) {
        // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
        // Safari: Will throw, insertAdjacentHTML is not present on SVG
    } finally {
        // FF: Old versions will create a node in the wrong namespace
        if (svg.childNodes.length === 1 && unwrap(svg.firstChild).namespaceURI === SVG_NAMESPACE$1) {
            // The test worked as expected, no fix required
            return false;
        }
        return true;
    }
}

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox w/o inspector open
// Reason:   These browsers will merge adjacent text nodes. For exmaple given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
//           Note that this fix must only apply to the previous text node, as
//           the base implementation of `insertHTMLBefore` already handles
//           following text nodes correctly.
function domChanges$2(document, DOMChangesClass) {
    if (!document) return DOMChangesClass;
    if (!shouldApplyFix$2(document)) {
        return DOMChangesClass;
    }
    return class DOMChangesWithTextNodeMergingFix extends DOMChangesClass {
        constructor(document) {
            super(document);
            this.uselessComment = document.createComment('');
        }
        insertHTMLBefore(parent, nextSibling, html) {
            if (html === null) {
                return super.insertHTMLBefore(parent, nextSibling, html);
            }
            let didSetUselessComment = false;
            let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;
            if (nextPrevious && nextPrevious instanceof Text) {
                didSetUselessComment = true;
                parent.insertBefore(this.uselessComment, nextSibling);
            }
            let bounds = super.insertHTMLBefore(parent, nextSibling, html);
            if (didSetUselessComment) {
                parent.removeChild(this.uselessComment);
            }
            return bounds;
        }
    };
}
function treeConstruction$2(document, TreeConstructionClass) {
    if (!document) return TreeConstructionClass;
    if (!shouldApplyFix$2(document)) {
        return TreeConstructionClass;
    }
    return class TreeConstructionWithTextNodeMergingFix extends TreeConstructionClass {
        constructor(document) {
            super(document);
            this.uselessComment = this.createComment('');
        }
        insertHTMLBefore(parent, reference, html) {
            if (html === null) {
                return super.insertHTMLBefore(parent, reference, html);
            }
            let didSetUselessComment = false;
            let nextPrevious = reference ? reference.previousSibling : parent.lastChild;
            if (nextPrevious && nextPrevious instanceof Text) {
                didSetUselessComment = true;
                parent.insertBefore(this.uselessComment, reference);
            }
            let bounds = super.insertHTMLBefore(parent, reference, html);
            if (didSetUselessComment) {
                parent.removeChild(this.uselessComment);
            }
            return bounds;
        }
    };
}
function shouldApplyFix$2(document) {
    let mergingTextDiv = document.createElement('div');
    mergingTextDiv.innerHTML = 'first';
    mergingTextDiv.insertAdjacentHTML('beforeend', 'second');
    if (mergingTextDiv.childNodes.length === 2) {
        // It worked as expected, no fix required
        return false;
    }
    return true;
}

const SVG_NAMESPACE$$1 = 'http://www.w3.org/2000/svg';
// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = { foreignObject: 1, desc: 1, title: 1 };
// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements
// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
const BLACKLIST_TABLE = Object.create(null);
["b", "big", "blockquote", "body", "br", "center", "code", "dd", "div", "dl", "dt", "em", "embed", "h1", "h2", "h3", "h4", "h5", "h6", "head", "hr", "i", "img", "li", "listing", "main", "meta", "nobr", "ol", "p", "pre", "ruby", "s", "small", "span", "strong", "strike", "sub", "sup", "table", "tt", "u", "ul", "var"].forEach(tag => BLACKLIST_TABLE[tag] = 1);
let doc = typeof document === 'undefined' ? null : document;

function moveNodesBefore(source, target, nextSibling) {
    let first = source.firstChild;
    let last = null;
    let current = first;
    while (current) {
        last = current;
        current = current.nextSibling;
        target.insertBefore(last, nextSibling);
    }
    return [first, last];
}
class DOMOperations {
    constructor(document) {
        this.document = document;
        this.setupUselessElement();
    }
    // split into seperate method so that NodeDOMTreeConstruction
    // can override it.
    setupUselessElement() {
        this.uselessElement = this.document.createElement('div');
    }
    createElement(tag, context) {
        let isElementInSVGNamespace, isHTMLIntegrationPoint;
        if (context) {
            isElementInSVGNamespace = context.namespaceURI === SVG_NAMESPACE$$1 || tag === 'svg';
            isHTMLIntegrationPoint = SVG_INTEGRATION_POINTS[context.tagName];
        } else {
            isElementInSVGNamespace = tag === 'svg';
            isHTMLIntegrationPoint = false;
        }
        if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
            // FIXME: This does not properly handle <font> with color, face, or
            // size attributes, which is also disallowed by the spec. We should fix
            // this.
            if (BLACKLIST_TABLE[tag]) {
                throw new Error(`Cannot create a ${tag} inside an SVG context`);
            }
            return this.document.createElementNS(SVG_NAMESPACE$$1, tag);
        } else {
            return this.document.createElement(tag);
        }
    }
    insertBefore(parent, node, reference) {
        parent.insertBefore(node, reference);
    }
    insertHTMLBefore(_parent, nextSibling, html) {
        return insertHTMLBefore(this.uselessElement, _parent, nextSibling, html);
    }
    createTextNode(text) {
        return this.document.createTextNode(text);
    }
    createComment(data) {
        return this.document.createComment(data);
    }
}
var DOM;
(function (DOM) {
    class TreeConstruction extends DOMOperations {
        createElementNS(namespace, tag) {
            return this.document.createElementNS(namespace, tag);
        }
        setAttribute(element, name, value, namespace) {
            if (namespace) {
                element.setAttributeNS(namespace, name, value);
            } else {
                element.setAttribute(name, value);
            }
        }
    }
    DOM.TreeConstruction = TreeConstruction;
    let appliedTreeContruction = TreeConstruction;
    appliedTreeContruction = treeConstruction$2(doc, appliedTreeContruction);
    appliedTreeContruction = treeConstruction(doc, appliedTreeContruction);
    appliedTreeContruction = treeConstruction$1(doc, appliedTreeContruction, SVG_NAMESPACE$$1);
    DOM.DOMTreeConstruction = appliedTreeContruction;
})(DOM || (DOM = {}));
class DOMChanges extends DOMOperations {
    constructor(document) {
        super(document);
        this.document = document;
        this.namespace = null;
    }
    setAttribute(element, name, value) {
        element.setAttribute(name, value);
    }
    setAttributeNS(element, namespace, name, value) {
        element.setAttributeNS(namespace, name, value);
    }
    removeAttribute(element, name) {
        element.removeAttribute(name);
    }
    removeAttributeNS(element, namespace, name) {
        element.removeAttributeNS(namespace, name);
    }
    insertNodeBefore(parent, node, reference) {
        if (isDocumentFragment(node)) {
            let firstChild = node.firstChild,
                lastChild = node.lastChild;

            this.insertBefore(parent, node, reference);
            return new ConcreteBounds(parent, firstChild, lastChild);
        } else {
            this.insertBefore(parent, node, reference);
            return new SingleNodeBounds(parent, node);
        }
    }
    insertTextBefore(parent, nextSibling, text) {
        let textNode = this.createTextNode(text);
        this.insertBefore(parent, textNode, nextSibling);
        return textNode;
    }
    insertBefore(element, node, reference) {
        element.insertBefore(node, reference);
    }
    insertAfter(element, node, reference) {
        this.insertBefore(element, node, reference.nextSibling);
    }
}
function insertHTMLBefore(_useless, _parent, _nextSibling, html) {
    // TypeScript vendored an old version of the DOM spec where `insertAdjacentHTML`
    // only exists on `HTMLElement` but not on `Element`. We actually work with the
    // newer version of the DOM API here (and monkey-patch this method in `./compat`
    // when we detect older browsers). This is a hack to work around this limitation.
    let parent = _parent;
    let useless = _useless;
    let nextSibling = _nextSibling;
    let prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last;
    if (html === null || html === '') {
        return new ConcreteBounds(parent, null, null);
    }
    if (nextSibling === null) {
        parent.insertAdjacentHTML('beforeend', html);
        last = parent.lastChild;
    } else if (nextSibling instanceof HTMLElement) {
        nextSibling.insertAdjacentHTML('beforebegin', html);
        last = nextSibling.previousSibling;
    } else {
        // Non-element nodes do not support insertAdjacentHTML, so add an
        // element and call it on that element. Then remove the element.
        //
        // This also protects Edge, IE and Firefox w/o the inspector open
        // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
        parent.insertBefore(useless, nextSibling);
        useless.insertAdjacentHTML('beforebegin', html);
        last = useless.previousSibling;
        parent.removeChild(useless);
    }
    let first = prev ? prev.nextSibling : parent.firstChild;
    return new ConcreteBounds(parent, first, last);
}
function isDocumentFragment(node) {
    return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}
let helper = DOMChanges;
helper = domChanges$2(doc, helper);
helper = domChanges(doc, helper);
helper = domChanges$1(doc, helper, SVG_NAMESPACE$$1);
var DOMChanges$1 = helper;
const DOMTreeConstruction = DOM.DOMTreeConstruction;

function defaultManagers(element, attr, _isTrusting, _namespace) {
    let tagName = element.tagName;
    let isSVG = element.namespaceURI === SVG_NAMESPACE$$1;
    if (isSVG) {
        return defaultAttributeManagers(tagName, attr);
    }

    var _normalizeProperty = normalizeProperty(element, attr);

    let type = _normalizeProperty.type,
        normalized = _normalizeProperty.normalized;

    if (type === 'attr') {
        return defaultAttributeManagers(tagName, normalized);
    } else {
        return defaultPropertyManagers(tagName, normalized);
    }
}
function defaultPropertyManagers(tagName, attr) {
    if (requiresSanitization(tagName, attr)) {
        return new SafePropertyManager(attr);
    }
    if (isUserInputValue(tagName, attr)) {
        return INPUT_VALUE_PROPERTY_MANAGER;
    }
    if (isOptionSelected(tagName, attr)) {
        return OPTION_SELECTED_MANAGER;
    }
    return new PropertyManager(attr);
}
function defaultAttributeManagers(tagName, attr) {
    if (requiresSanitization(tagName, attr)) {
        return new SafeAttributeManager(attr);
    }
    return new AttributeManager(attr);
}


class AttributeManager {
    constructor(attr) {
        this.attr = attr;
    }
    setAttribute(env, element, value, namespace) {
        let dom = env.getAppendOperations();
        let normalizedValue = normalizeAttributeValue(value);
        if (!isAttrRemovalValue(normalizedValue)) {
            dom.setAttribute(element, this.attr, normalizedValue, namespace);
        }
    }
    updateAttribute(env, element, value, namespace) {
        if (value === null || value === undefined || value === false) {
            if (namespace) {
                env.getDOM().removeAttributeNS(element, namespace, this.attr);
            } else {
                env.getDOM().removeAttribute(element, this.attr);
            }
        } else {
            this.setAttribute(env, element, value);
        }
    }
}

class PropertyManager extends AttributeManager {
    setAttribute(_env, element, value, _namespace) {
        if (!isAttrRemovalValue(value)) {
            element[this.attr] = value;
        }
    }
    removeAttribute(env, element, namespace) {
        // TODO this sucks but to preserve properties first and to meet current
        // semantics we must do this.
        let attr = this.attr;

        if (namespace) {
            env.getDOM().removeAttributeNS(element, namespace, attr);
        } else {
            env.getDOM().removeAttribute(element, attr);
        }
    }
    updateAttribute(env, element, value, namespace) {
        // ensure the property is always updated
        element[this.attr] = value;
        if (isAttrRemovalValue(value)) {
            this.removeAttribute(env, element, namespace);
        }
    }
}

function normalizeAttributeValue(value) {
    if (value === false || value === undefined || value === null) {
        return null;
    }
    if (value === true) {
        return '';
    }
    // onclick function etc in SSR
    if (typeof value === 'function') {
        return null;
    }
    return String(value);
}
function isAttrRemovalValue(value) {
    return value === null || value === undefined;
}
class SafePropertyManager extends PropertyManager {
    setAttribute(env, element, value) {
        super.setAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
    }
    updateAttribute(env, element, value) {
        super.updateAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
    }
}
function isUserInputValue(tagName, attribute) {
    return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}
class InputValuePropertyManager extends AttributeManager {
    setAttribute(_env, element, value) {
        let input = element;
        input.value = normalizeTextValue(value);
    }
    updateAttribute(_env, element, value) {
        let input = element;
        let currentValue = input.value;
        let normalizedValue = normalizeTextValue(value);
        if (currentValue !== normalizedValue) {
            input.value = normalizedValue;
        }
    }
}
const INPUT_VALUE_PROPERTY_MANAGER = new InputValuePropertyManager('value');
function isOptionSelected(tagName, attribute) {
    return tagName === 'OPTION' && attribute === 'selected';
}
class OptionSelectedManager extends PropertyManager {
    setAttribute(_env, element, value) {
        if (value !== null && value !== undefined && value !== false) {
            let option = element;
            option.selected = true;
        }
    }
    updateAttribute(_env, element, value) {
        let option = element;
        if (value) {
            option.selected = true;
        } else {
            option.selected = false;
        }
    }
}
const OPTION_SELECTED_MANAGER = new OptionSelectedManager('selected');
class SafeAttributeManager extends AttributeManager {
    setAttribute(env, element, value) {
        super.setAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
    }
    updateAttribute(env, element, value, _namespace) {
        super.updateAttribute(env, element, sanitizeAttributeValue(env, element, this.attr, value));
    }
}

class Scope {
    constructor(
    // the 0th slot is `self`
    slots, callerScope,
    // named arguments and blocks passed to a layout that uses eval
    evalScope,
    // locals in scope when the partial was invoked
    partialMap) {
        this.slots = slots;
        this.callerScope = callerScope;
        this.evalScope = evalScope;
        this.partialMap = partialMap;
    }
    static root(self, size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null).init({ self });
    }
    static sized(size = 0) {
        let refs = new Array(size + 1);
        for (let i = 0; i <= size; i++) {
            refs[i] = UNDEFINED_REFERENCE;
        }
        return new Scope(refs, null, null, null);
    }
    init({ self }) {
        this.slots[0] = self;
        return this;
    }
    getSelf() {
        return this.get(0);
    }
    getSymbol(symbol) {
        return this.get(symbol);
    }
    getBlock(symbol) {
        return this.get(symbol);
    }
    getEvalScope() {
        return this.evalScope;
    }
    getPartialMap() {
        return this.partialMap;
    }
    bind(symbol, value) {
        this.set(symbol, value);
    }
    bindSelf(self) {
        this.set(0, self);
    }
    bindSymbol(symbol, value) {
        this.set(symbol, value);
    }
    bindBlock(symbol, value) {
        this.set(symbol, value);
    }
    bindEvalScope(map) {
        this.evalScope = map;
    }
    bindPartialMap(map) {
        this.partialMap = map;
    }
    bindCallerScope(scope) {
        this.callerScope = scope;
    }
    getCallerScope() {
        return this.callerScope;
    }
    child() {
        return new Scope(this.slots.slice(), this.callerScope, this.evalScope, this.partialMap);
    }
    get(index) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        return this.slots[index];
    }
    set(index, value) {
        if (index >= this.slots.length) {
            throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
        }
        this.slots[index] = value;
    }
}
class Transaction {
    constructor() {
        this.scheduledInstallManagers = [];
        this.scheduledInstallModifiers = [];
        this.scheduledUpdateModifierManagers = [];
        this.scheduledUpdateModifiers = [];
        this.createdComponents = [];
        this.createdManagers = [];
        this.updatedComponents = [];
        this.updatedManagers = [];
        this.destructors = [];
    }
    didCreate(component, manager) {
        this.createdComponents.push(component);
        this.createdManagers.push(manager);
    }
    didUpdate(component, manager) {
        this.updatedComponents.push(component);
        this.updatedManagers.push(manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.scheduledInstallManagers.push(manager);
        this.scheduledInstallModifiers.push(modifier);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.scheduledUpdateModifierManagers.push(manager);
        this.scheduledUpdateModifiers.push(modifier);
    }
    didDestroy(d) {
        this.destructors.push(d);
    }
    commit() {
        let createdComponents = this.createdComponents,
            createdManagers = this.createdManagers;

        for (let i = 0; i < createdComponents.length; i++) {
            let component = createdComponents[i];
            let manager = createdManagers[i];
            manager.didCreate(component);
        }
        let updatedComponents = this.updatedComponents,
            updatedManagers = this.updatedManagers;

        for (let i = 0; i < updatedComponents.length; i++) {
            let component = updatedComponents[i];
            let manager = updatedManagers[i];
            manager.didUpdate(component);
        }
        let destructors = this.destructors;

        for (let i = 0; i < destructors.length; i++) {
            destructors[i].destroy();
        }
        let scheduledInstallManagers = this.scheduledInstallManagers,
            scheduledInstallModifiers = this.scheduledInstallModifiers;

        for (let i = 0; i < scheduledInstallManagers.length; i++) {
            let manager = scheduledInstallManagers[i];
            let modifier = scheduledInstallModifiers[i];
            manager.install(modifier);
        }
        let scheduledUpdateModifierManagers = this.scheduledUpdateModifierManagers,
            scheduledUpdateModifiers = this.scheduledUpdateModifiers;

        for (let i = 0; i < scheduledUpdateModifierManagers.length; i++) {
            let manager = scheduledUpdateModifierManagers[i];
            let modifier = scheduledUpdateModifiers[i];
            manager.update(modifier);
        }
    }
}
class Opcode {
    constructor(heap) {
        this.heap = heap;
        this.offset = 0;
    }
    get type() {
        return this.heap.getbyaddr(this.offset);
    }
    get op1() {
        return this.heap.getbyaddr(this.offset + 1);
    }
    get op2() {
        return this.heap.getbyaddr(this.offset + 2);
    }
    get op3() {
        return this.heap.getbyaddr(this.offset + 3);
    }
}
var TableSlotState;
(function (TableSlotState) {
    TableSlotState[TableSlotState["Allocated"] = 0] = "Allocated";
    TableSlotState[TableSlotState["Freed"] = 1] = "Freed";
    TableSlotState[TableSlotState["Purged"] = 2] = "Purged";
    TableSlotState[TableSlotState["Pointer"] = 3] = "Pointer";
})(TableSlotState || (TableSlotState = {}));
class Heap {
    constructor() {
        this.heap = [];
        this.offset = 0;
        this.handle = 0;
        /**
         * layout:
         *
         * - pointer into heap
         * - size
         * - freed (0 or 1)
         */
        this.table = [];
    }
    push(item) {
        this.heap[this.offset++] = item;
    }
    getbyaddr(address) {
        return this.heap[address];
    }
    setbyaddr(address, value) {
        this.heap[address] = value;
    }
    malloc() {
        this.table.push(this.offset, 0, 0);
        let handle = this.handle;
        this.handle += 3;
        return handle;
    }
    finishMalloc(handle) {
        let start = this.table[handle];
        let finish = this.offset;
        this.table[handle + 1] = finish - start;
    }
    size() {
        return this.offset;
    }
    // It is illegal to close over this address, as compaction
    // may move it. However, it is legal to use this address
    // multiple times between compactions.
    getaddr(handle) {
        return this.table[handle];
    }
    gethandle(address) {
        this.table.push(address, 0, TableSlotState.Pointer);
        let handle = this.handle;
        this.handle += 3;
        return handle;
    }
    sizeof(handle) {
        return -1;
    }
    free(handle) {
        this.table[handle + 2] = 1;
    }
    compact() {
        let compactedSize = 0;
        let table = this.table,
            length = this.table.length,
            heap = this.heap;

        for (let i = 0; i < length; i += 3) {
            let offset = table[i];
            let size = table[i + 1];
            let state = table[i + 2];
            if (state === TableSlotState.Purged) {
                continue;
            } else if (state === TableSlotState.Freed) {
                // transition to "already freed"
                // a good improvement would be to reuse
                // these slots
                table[i + 2] = 2;
                compactedSize += size;
            } else if (state === TableSlotState.Allocated) {
                for (let j = offset; j <= i + size; j++) {
                    heap[j - compactedSize] = heap[j];
                }
                table[i] = offset - compactedSize;
            } else if (state === TableSlotState.Pointer) {
                table[i] = offset - compactedSize;
            }
        }
        this.offset = this.offset - compactedSize;
    }
}
class Program {
    constructor() {
        this.heap = new Heap();
        this._opcode = new Opcode(this.heap);
        this.constants = new Constants();
    }
    opcode(offset) {
        this._opcode.offset = offset;
        return this._opcode;
    }
}
class Environment {
    constructor({ appendOperations, updateOperations }) {
        this._macros = null;
        this._transaction = null;
        this.program = new Program();
        this.appendOperations = appendOperations;
        this.updateOperations = updateOperations;
    }
    toConditionalReference(reference) {
        return new ConditionalReference(reference);
    }
    getAppendOperations() {
        return this.appendOperations;
    }
    getDOM() {
        return this.updateOperations;
    }
    getIdentity(object) {
        return ensureGuid(object) + '';
    }
    begin() {
        debugAssert(!this._transaction, 'a glimmer transaction was begun, but one already exists. You may have a nested transaction');
        this._transaction = new Transaction();
    }
    get transaction() {
        return expect(this._transaction, 'must be in a transaction');
    }
    didCreate(component, manager) {
        this.transaction.didCreate(component, manager);
    }
    didUpdate(component, manager) {
        this.transaction.didUpdate(component, manager);
    }
    scheduleInstallModifier(modifier, manager) {
        this.transaction.scheduleInstallModifier(modifier, manager);
    }
    scheduleUpdateModifier(modifier, manager) {
        this.transaction.scheduleUpdateModifier(modifier, manager);
    }
    didDestroy(d) {
        this.transaction.didDestroy(d);
    }
    commit() {
        let transaction = this.transaction;
        this._transaction = null;
        transaction.commit();
    }
    attributeFor(element, attr, isTrusting, namespace) {
        return defaultManagers(element, attr, isTrusting, namespace === undefined ? null : namespace);
    }
    macros() {
        let macros = this._macros;
        if (!macros) {
            this._macros = macros = this.populateBuiltins();
        }
        return macros;
    }
    populateBuiltins() {
        return populateBuiltins();
    }
}

class UpdatingVM {
    constructor(env, { alwaysRevalidate = false }) {
        this.frameStack = new Stack();
        this.env = env;
        this.constants = env.program.constants;
        this.dom = env.getDOM();
        this.alwaysRevalidate = alwaysRevalidate;
    }
    execute(opcodes, handler) {
        let frameStack = this.frameStack;

        this.try(opcodes, handler);
        while (true) {
            if (frameStack.isEmpty()) break;
            let opcode = this.frame.nextStatement();
            if (opcode === null) {
                this.frameStack.pop();
                continue;
            }
            opcode.evaluate(this);
        }
    }
    get frame() {
        return expect(this.frameStack.current, 'bug: expected a frame');
    }
    goto(op) {
        this.frame.goto(op);
    }
    try(ops, handler) {
        this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
    }
    throw() {
        this.frame.handleException();
        this.frameStack.pop();
    }
    evaluateOpcode(opcode) {
        opcode.evaluate(this);
    }
}
class BlockOpcode extends UpdatingOpcode {
    constructor(start, state, bounds$$1, children) {
        super();
        this.start = start;
        this.type = "block";
        this.next = null;
        this.prev = null;
        let env = state.env,
            scope = state.scope,
            dynamicScope = state.dynamicScope,
            stack = state.stack;

        this.children = children;
        this.env = env;
        this.scope = scope;
        this.dynamicScope = dynamicScope;
        this.stack = stack;
        this.bounds = bounds$$1;
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    evaluate(vm) {
        vm.try(this.children, null);
    }
    destroy() {
        this.bounds.destroy();
    }
    didDestroy() {
        this.env.didDestroy(this.bounds);
    }
    toJSON() {
        let details = dict();
        details["guid"] = `${this._guid}`;
        return {
            guid: this._guid,
            type: this.type,
            details,
            children: this.children.toArray().map(op => op.toJSON())
        };
    }
}
class TryOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children) {
        super(start, state, bounds$$1, children);
        this.type = "try";
        this.tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
    }
    didInitializeChildren() {
        this._tag.inner.update(combineSlice(this.children));
    }
    evaluate(vm) {
        vm.try(this.children, this);
    }
    handleException() {
        let env = this.env,
            bounds$$1 = this.bounds,
            children = this.children,
            scope = this.scope,
            dynamicScope = this.dynamicScope,
            start = this.start,
            stack = this.stack,
            prev = this.prev,
            next = this.next;

        children.clear();
        let elementStack = ElementStack.resume(env, bounds$$1, bounds$$1.reset(env));
        let vm = new VM(env, scope, dynamicScope, elementStack);
        let updating = new LinkedList();
        vm.execute(start, vm => {
            vm.stack = EvaluationStack.restore(stack);
            vm.updatingOpcodeStack.push(updating);
            vm.updateWith(this);
            vm.updatingOpcodeStack.push(children);
        });
        this.prev = prev;
        this.next = next;
    }
    toJSON() {
        let json = super.toJSON();
        let details = json["details"];
        if (!details) {
            details = json["details"] = {};
        }
        return super.toJSON();
    }
}
class ListRevalidationDelegate {
    constructor(opcode, marker) {
        this.opcode = opcode;
        this.marker = marker;
        this.didInsert = false;
        this.didDelete = false;
        this.map = opcode.map;
        this.updating = opcode['children'];
    }
    insert(key, item, memo, before) {
        let map$$1 = this.map,
            opcode = this.opcode,
            updating = this.updating;

        let nextSibling = null;
        let reference = null;
        if (before) {
            reference = map$$1[before];
            nextSibling = reference['bounds'].firstNode();
        } else {
            nextSibling = this.marker;
        }
        let vm = opcode.vmForInsertion(nextSibling);
        let tryOpcode = null;
        let start = opcode.start;

        vm.execute(start, vm => {
            map$$1[key] = tryOpcode = vm.iterate(memo, item);
            vm.updatingOpcodeStack.push(new LinkedList());
            vm.updateWith(tryOpcode);
            vm.updatingOpcodeStack.push(tryOpcode.children);
        });
        updating.insertBefore(tryOpcode, reference);
        this.didInsert = true;
    }
    retain(_key, _item, _memo) {}
    move(key, _item, _memo, before) {
        let map$$1 = this.map,
            updating = this.updating;

        let entry = map$$1[key];
        let reference = map$$1[before] || null;
        if (before) {
            move(entry, reference.firstNode());
        } else {
            move(entry, this.marker);
        }
        updating.remove(entry);
        updating.insertBefore(entry, reference);
    }
    delete(key) {
        let map$$1 = this.map;

        let opcode = map$$1[key];
        opcode.didDestroy();
        clear(opcode);
        this.updating.remove(opcode);
        delete map$$1[key];
        this.didDelete = true;
    }
    done() {
        this.opcode.didInitializeChildren(this.didInsert || this.didDelete);
    }
}
class ListBlockOpcode extends BlockOpcode {
    constructor(start, state, bounds$$1, children, artifacts) {
        super(start, state, bounds$$1, children);
        this.type = "list-block";
        this.map = dict();
        this.lastIterated = INITIAL;
        this.artifacts = artifacts;
        let _tag = this._tag = UpdatableTag.create(CONSTANT_TAG);
        this.tag = combine([artifacts.tag, _tag]);
    }
    didInitializeChildren(listDidChange = true) {
        this.lastIterated = this.artifacts.tag.value();
        if (listDidChange) {
            this._tag.inner.update(combineSlice(this.children));
        }
    }
    evaluate(vm) {
        let artifacts = this.artifacts,
            lastIterated = this.lastIterated;

        if (!artifacts.tag.validate(lastIterated)) {
            let bounds$$1 = this.bounds;
            let dom = vm.dom;

            let marker = dom.createComment('');
            dom.insertAfter(bounds$$1.parentElement(), marker, expect(bounds$$1.lastNode(), "can't insert after an empty bounds"));
            let target = new ListRevalidationDelegate(this, marker);
            let synchronizer = new IteratorSynchronizer({ target, artifacts });
            synchronizer.sync();
            this.parentElement().removeChild(marker);
        }
        // Run now-updated updating opcodes
        super.evaluate(vm);
    }
    vmForInsertion(nextSibling) {
        let env = this.env,
            scope = this.scope,
            dynamicScope = this.dynamicScope;

        let elementStack = ElementStack.forInitialRender(this.env, this.bounds.parentElement(), nextSibling);
        return new VM(env, scope, dynamicScope, elementStack);
    }
    toJSON() {
        let json = super.toJSON();
        let map$$1 = this.map;
        let inner = Object.keys(map$$1).map(key => {
            return `${JSON.stringify(key)}: ${map$$1[key]._guid}`;
        }).join(", ");
        let details = json["details"];
        if (!details) {
            details = json["details"] = {};
        }
        details["map"] = `{${inner}}`;
        return json;
    }
}
class UpdatingVMFrame {
    constructor(vm, ops, exceptionHandler) {
        this.vm = vm;
        this.ops = ops;
        this.exceptionHandler = exceptionHandler;
        this.vm = vm;
        this.ops = ops;
        this.current = ops.head();
    }
    goto(op) {
        this.current = op;
    }
    nextStatement() {
        let current = this.current,
            ops = this.ops;

        if (current) this.current = ops.nextNode(current);
        return current;
    }
    handleException() {
        if (this.exceptionHandler) {
            this.exceptionHandler.handleException();
        }
    }
}

class RenderResult {
    constructor(env, updating, bounds$$1) {
        this.env = env;
        this.updating = updating;
        this.bounds = bounds$$1;
    }
    rerender({ alwaysRevalidate = false } = { alwaysRevalidate: false }) {
        let env = this.env,
            updating = this.updating;

        let vm = new UpdatingVM(env, { alwaysRevalidate });
        vm.execute(updating, this);
    }
    parentElement() {
        return this.bounds.parentElement();
    }
    firstNode() {
        return this.bounds.firstNode();
    }
    lastNode() {
        return this.bounds.lastNode();
    }
    opcodes() {
        return this.updating;
    }
    handleException() {
        throw "this should never happen";
    }
    destroy() {
        this.bounds.destroy();
        clear(this.bounds);
    }
}

class EvaluationStack {
    constructor(stack, fp, sp) {
        this.stack = stack;
        this.fp = fp;
        this.sp = sp;
        
    }
    static empty() {
        return new this([], 0, -1);
    }
    static restore(snapshot) {
        return new this(snapshot.slice(), 0, snapshot.length - 1);
    }
    isEmpty() {
        return this.sp === -1;
    }
    push(value) {
        this.stack[++this.sp] = value;
    }
    dup(position = this.sp) {
        this.push(this.stack[position]);
    }
    pop(n = 1) {
        let top = this.stack[this.sp];
        this.sp -= n;
        return top;
    }
    peek() {
        return this.stack[this.sp];
    }
    fromBase(offset) {
        return this.stack[this.fp - offset];
    }
    fromTop(offset) {
        return this.stack[this.sp - offset];
    }
    capture(items) {
        let end = this.sp + 1;
        let start = end - items;
        return this.stack.slice(start, end);
    }
    reset() {
        this.stack.length = 0;
    }
    toArray() {
        return this.stack.slice(this.fp, this.sp + 1);
    }
}
class VM {
    constructor(env, scope, dynamicScope, elementStack) {
        this.env = env;
        this.elementStack = elementStack;
        this.dynamicScopeStack = new Stack();
        this.scopeStack = new Stack();
        this.updatingOpcodeStack = new Stack();
        this.cacheGroups = new Stack();
        this.listBlockStack = new Stack();
        this.stack = EvaluationStack.empty();
        /* Registers */
        this.pc = -1;
        this.ra = -1;
        this.s0 = null;
        this.s1 = null;
        this.t0 = null;
        this.t1 = null;
        this.env = env;
        this.heap = env.program.heap;
        this.constants = env.program.constants;
        this.elementStack = elementStack;
        this.scopeStack.push(scope);
        this.dynamicScopeStack.push(dynamicScope);
    }
    get fp() {
        return this.stack.fp;
    }
    set fp(fp) {
        this.stack.fp = fp;
    }
    get sp() {
        return this.stack.sp;
    }
    set sp(sp) {
        this.stack.sp = sp;
    }
    // Fetch a value from a register onto the stack
    fetch(register) {
        this.stack.push(this[Register[register]]);
    }
    // Load a value from the stack into a register
    load(register) {
        this[Register[register]] = this.stack.pop();
    }
    // Fetch a value from a register
    fetchValue(register) {
        return this[Register[register]];
    }
    // Load a value into a register
    loadValue(register, value) {
        this[Register[register]] = value;
    }
    // Start a new frame and save $ra and $fp on the stack
    pushFrame() {
        this.stack.push(this.ra);
        this.stack.push(this.fp);
        this.fp = this.sp - 1;
    }
    // Restore $ra, $sp and $fp
    popFrame() {
        this.sp = this.fp - 1;
        this.ra = this.stack.fromBase(0);
        this.fp = this.stack.fromBase(-1);
    }
    // Jump to an address in `program`
    goto(offset) {
        this.pc = typePos(this.pc + offset);
    }
    // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
    call(handle) {
        let pc = this.heap.getaddr(handle);
        this.ra = this.pc;
        this.pc = pc;
    }
    // Put a specific `program` address in $ra
    returnTo(offset) {
        this.ra = typePos(this.pc + offset);
    }
    // Return to the `program` address stored in $ra
    return() {
        this.pc = this.ra;
    }
    static initial(env, self, dynamicScope, elementStack, program) {
        let scope = Scope.root(self, program.symbolTable.symbols.length);
        let vm = new VM(env, scope, dynamicScope, elementStack);
        vm.pc = vm.heap.getaddr(program.handle);
        vm.updatingOpcodeStack.push(new LinkedList());
        return vm;
    }
    capture(args) {
        return {
            dynamicScope: this.dynamicScope(),
            env: this.env,
            scope: this.scope(),
            stack: this.stack.capture(args)
        };
    }
    beginCacheGroup() {
        this.cacheGroups.push(this.updating().tail());
    }
    commitCacheGroup() {
        //        JumpIfNotModified(END)
        //        (head)
        //        (....)
        //        (tail)
        //        DidModify
        // END:   Noop
        let END = new LabelOpcode("END");
        let opcodes = this.updating();
        let marker = this.cacheGroups.pop();
        let head = marker ? opcodes.nextNode(marker) : opcodes.head();
        let tail = opcodes.tail();
        let tag = combineSlice(new ListSlice(head, tail));
        let guard = new JumpIfNotModifiedOpcode(tag, END);
        opcodes.insertBefore(guard, head);
        opcodes.append(new DidModifyOpcode(guard));
        opcodes.append(END);
    }
    enter(args) {
        let updating = new LinkedList();
        let state = this.capture(args);
        let tracker = this.elements().pushUpdatableBlock();
        let tryOpcode = new TryOpcode(this.heap.gethandle(this.pc), state, tracker, updating);
        this.didEnter(tryOpcode);
    }
    iterate(memo, value) {
        let stack = this.stack;
        stack.push(value);
        stack.push(memo);
        let state = this.capture(2);
        let tracker = this.elements().pushUpdatableBlock();
        // let ip = this.ip;
        // this.ip = end + 4;
        // this.frames.push(ip);
        return new TryOpcode(this.heap.gethandle(this.pc), state, tracker, new LinkedList());
    }
    enterItem(key, opcode) {
        this.listBlock().map[key] = opcode;
        this.didEnter(opcode);
    }
    enterList(relativeStart) {
        let updating = new LinkedList();
        let state = this.capture(0);
        let tracker = this.elements().pushBlockList(updating);
        let artifacts = this.stack.peek().artifacts;
        let start = this.heap.gethandle(typePos(this.pc + relativeStart));
        let opcode = new ListBlockOpcode(start, state, tracker, updating, artifacts);
        this.listBlockStack.push(opcode);
        this.didEnter(opcode);
    }
    didEnter(opcode) {
        this.updateWith(opcode);
        this.updatingOpcodeStack.push(opcode.children);
    }
    exit() {
        this.elements().popBlock();
        this.updatingOpcodeStack.pop();
        let parent = this.updating().tail();
        parent.didInitializeChildren();
    }
    exitList() {
        this.exit();
        this.listBlockStack.pop();
    }
    updateWith(opcode) {
        this.updating().append(opcode);
    }
    listBlock() {
        return expect(this.listBlockStack.current, 'expected a list block');
    }
    updating() {
        return expect(this.updatingOpcodeStack.current, 'expected updating opcode on the updating opcode stack');
    }
    elements() {
        return this.elementStack;
    }
    scope() {
        return expect(this.scopeStack.current, 'expected scope on the scope stack');
    }
    dynamicScope() {
        return expect(this.dynamicScopeStack.current, 'expected dynamic scope on the dynamic scope stack');
    }
    pushChildScope() {
        this.scopeStack.push(this.scope().child());
    }
    pushCallerScope(childScope = false) {
        let callerScope = expect(this.scope().getCallerScope(), 'pushCallerScope is called when a caller scope is present');
        this.scopeStack.push(childScope ? callerScope.child() : callerScope);
    }
    pushDynamicScope() {
        let child = this.dynamicScope().child();
        this.dynamicScopeStack.push(child);
        return child;
    }
    pushRootScope(size, bindCaller) {
        let scope = Scope.sized(size);
        if (bindCaller) scope.bindCallerScope(this.scope());
        this.scopeStack.push(scope);
        return scope;
    }
    popScope() {
        this.scopeStack.pop();
    }
    popDynamicScope() {
        this.dynamicScopeStack.pop();
    }
    newDestroyable(d) {
        this.elements().newDestroyable(d);
    }
    /// SCOPE HELPERS
    getSelf() {
        return this.scope().getSelf();
    }
    referenceForSymbol(symbol) {
        return this.scope().getSymbol(symbol);
    }
    /// EXECUTION
    execute(start, initialize) {
        this.pc = this.heap.getaddr(start);
        if (initialize) initialize(this);
        let result;
        while (true) {
            result = this.next();
            if (result.done) break;
        }
        return result.value;
    }
    next() {
        let env = this.env,
            updatingOpcodeStack = this.updatingOpcodeStack,
            elementStack = this.elementStack;

        let opcode = this.nextStatement(env);
        let result;
        if (opcode !== null) {
            APPEND_OPCODES.evaluate(this, opcode, opcode.type);
            result = { done: false, value: null };
        } else {
            // Unload the stack
            this.stack.reset();
            result = {
                done: true,
                value: new RenderResult(env, expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'), elementStack.popBlock())
            };
        }
        return result;
    }
    nextStatement(env) {
        let pc = this.pc;

        if (pc === -1) {
            return null;
        }
        let program = env.program;
        this.pc += 4;
        return program.opcode(pc);
    }
    evaluateOpcode(opcode) {
        APPEND_OPCODES.evaluate(this, opcode, opcode.type);
    }
    bindDynamicScope(names) {
        let scope = this.dynamicScope();
        for (let i = names.length - 1; i >= 0; i--) {
            let name = this.constants.getString(names[i]);
            scope.set(name, this.stack.pop());
        }
    }
}

class TemplateIterator {
    constructor(vm) {
        this.vm = vm;
    }
    next() {
        return this.vm.next();
    }
}
let clientId = 0;
function templateFactory({ id: templateId, meta, block }) {
    let parsedBlock;
    let id = templateId || `client-${clientId++}`;
    let create = (env, envMeta) => {
        let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
        if (!parsedBlock) {
            parsedBlock = JSON.parse(block);
        }
        return new ScannableTemplate(id, newMeta, env, parsedBlock);
    };
    return { id, meta, create };
}
class ScannableTemplate {
    constructor(id, meta, env, rawBlock) {
        this.id = id;
        this.meta = meta;
        this.env = env;
        this.entryPoint = null;
        this.layout = null;
        this.partial = null;
        this.block = null;
        this.scanner = new Scanner(rawBlock, env);
        this.symbols = rawBlock.symbols;
        this.hasEval = rawBlock.hasEval;
    }
    render(self, appendTo, dynamicScope) {
        let env = this.env;

        let elementStack = ElementStack.forInitialRender(env, appendTo, null);
        let compiled = this.asEntryPoint().compileDynamic(env);
        let vm = VM.initial(env, self, dynamicScope, elementStack, compiled);
        return new TemplateIterator(vm);
    }
    asEntryPoint() {
        if (!this.entryPoint) this.entryPoint = this.scanner.scanEntryPoint(this.compilationMeta());
        return this.entryPoint;
    }
    asLayout(componentName, attrs) {
        if (!this.layout) this.layout = this.scanner.scanLayout(this.compilationMeta(), attrs || EMPTY_ARRAY, componentName);
        return this.layout;
    }
    asPartial() {
        if (!this.partial) this.partial = this.scanner.scanEntryPoint(this.compilationMeta(true));
        return this.partial;
    }
    asBlock() {
        if (!this.block) this.block = this.scanner.scanBlock(this.compilationMeta());
        return this.block;
    }
    compilationMeta(asPartial = false) {
        return { templateMeta: this.meta, symbols: this.symbols, asPartial };
    }
}

var NodeType;
(function (NodeType) {
    NodeType[NodeType["Element"] = 0] = "Element";
    NodeType[NodeType["Attribute"] = 1] = "Attribute";
    NodeType[NodeType["Text"] = 2] = "Text";
    NodeType[NodeType["CdataSection"] = 3] = "CdataSection";
    NodeType[NodeType["EntityReference"] = 4] = "EntityReference";
    NodeType[NodeType["Entity"] = 5] = "Entity";
    NodeType[NodeType["ProcessingInstruction"] = 6] = "ProcessingInstruction";
    NodeType[NodeType["Comment"] = 7] = "Comment";
    NodeType[NodeType["Document"] = 8] = "Document";
    NodeType[NodeType["DocumentType"] = 9] = "DocumentType";
    NodeType[NodeType["DocumentFragment"] = 10] = "DocumentFragment";
    NodeType[NodeType["Notation"] = 11] = "Notation";
})(NodeType || (NodeType = {}));

function EMPTY_CACHE() {}

class PathReference {
    constructor(parent, property) {
        this.cache = EMPTY_CACHE;
        this.inner = null;
        this.chains = null;
        this.lastParentValue = EMPTY_CACHE;
        this._guid = 0;
        this.tag = VOLATILE_TAG;
        this.parent = parent;
        this.property = property;
    }
    value() {
        let lastParentValue = this.lastParentValue,
            property = this.property,
            inner = this.inner;

        let parentValue = this._parentValue();
        if (parentValue === null || parentValue === undefined) {
            return this.cache = undefined;
        }
        if (lastParentValue === parentValue) {
            inner = this.inner;
        } else {
            let ReferenceType = typeof parentValue === 'object' ? Meta.for(parentValue).referenceTypeFor(property) : PropertyReference;
            inner = this.inner = new ReferenceType(parentValue, property, this);
        }
        // if (typeof parentValue === 'object') {
        //   Meta.for(parentValue).addReference(property, this);
        // }
        return this.cache = inner.value();
    }
    get(prop) {
        let chains = this._getChains();
        if (prop in chains) return chains[prop];
        return chains[prop] = new PathReference(this, prop);
    }
    label() {
        return '[reference Direct]';
    }
    _getChains() {
        if (this.chains) return this.chains;
        return this.chains = dict();
    }
    _parentValue() {
        let parent = this.parent.value();
        this.lastParentValue = parent;
        return parent;
    }
}

class RootReference {
    constructor(object) {
        this.chains = dict();
        this.tag = VOLATILE_TAG;
        this.object = object;
    }
    value() {
        return this.object;
    }
    update(object) {
        this.object = object;
        // this.notify();
    }
    get(prop) {
        let chains = this.chains;
        if (prop in chains) return chains[prop];
        return chains[prop] = new PathReference(this, prop);
    }
    chainFor(prop) {
        let chains = this.chains;
        if (prop in chains) return chains[prop];
        return null;
    }
    path(string) {
        return string.split('.').reduce((ref, part) => ref.get(part), this);
    }
    referenceFromParts(parts) {
        return parts.reduce((ref, part) => ref.get(part), this);
    }
    label() {
        return '[reference Root]';
    }
}

const NOOP_DESTROY = { destroy() {} };
class ConstPath {
    constructor(parent, _property) {
        this.tag = VOLATILE_TAG;
        this.parent = parent;
    }
    chain() {
        return NOOP_DESTROY;
    }
    notify() {}
    value() {
        return this.parent[this.property];
    }
    get(prop) {
        return new ConstPath(this.parent[this.property], prop);
    }
}
class ConstRoot {
    constructor(value) {
        this.tag = VOLATILE_TAG;
        this.inner = value;
    }
    update(inner) {
        this.inner = inner;
    }
    chain() {
        return NOOP_DESTROY;
    }
    notify() {}
    value() {
        return this.inner;
    }
    referenceFromParts(_parts) {
        throw new Error("Not implemented");
    }
    chainFor(_prop) {
        throw new Error("Not implemented");
    }
    get(prop) {
        return new ConstPath(this.inner, prop);
    }
}
class ConstMeta /*implements IMeta*/ {
    constructor(object) {
        this.object = object;
    }
    root() {
        return new ConstRoot(this.object);
    }
}
const CLASS_META = "df8be4c8-4e89-44e2-a8f9-550c8dacdca7";
const hasOwnProperty = Object.hasOwnProperty;
class Meta {
    constructor(object, { RootReferenceFactory, DefaultPathReferenceFactory }) {
        this.references = null;
        this.slots = null;
        this.referenceTypes = null;
        this.propertyMetadata = null;
        this.object = object;
        this.RootReferenceFactory = RootReferenceFactory || RootReference;
        this.DefaultPathReferenceFactory = DefaultPathReferenceFactory || PropertyReference;
    }
    static for(obj) {
        if (obj === null || obj === undefined) return new Meta(obj, {});
        if (hasOwnProperty.call(obj, '_meta') && obj._meta) return obj._meta;
        if (!Object.isExtensible(obj)) return new ConstMeta(obj);
        let MetaToUse = Meta;
        if (obj.constructor && obj.constructor[CLASS_META]) {
            let classMeta = obj.constructor[CLASS_META];
            MetaToUse = classMeta.InstanceMetaConstructor;
        } else if (obj[CLASS_META]) {
            MetaToUse = obj[CLASS_META].InstanceMetaConstructor;
        }
        return obj._meta = new MetaToUse(obj, {});
    }
    static exists(obj) {
        return typeof obj === 'object' && obj._meta;
    }
    static metadataForProperty(_key) {
        return null;
    }
    addReference(property, reference) {
        let refs = this.references = this.references || dict();
        let set = refs[property] = refs[property] || new DictSet();
        set.add(reference);
    }
    addReferenceTypeFor(property, type) {
        this.referenceTypes = this.referenceTypes || dict();
        this.referenceTypes[property] = type;
    }
    referenceTypeFor(property) {
        if (!this.referenceTypes) return PropertyReference;
        return this.referenceTypes[property] || PropertyReference;
    }
    removeReference(property, reference) {
        if (!this.references) return;
        let set = this.references[property];
        set.delete(reference);
    }
    getReferenceTypes() {
        this.referenceTypes = this.referenceTypes || dict();
        return this.referenceTypes;
    }
    referencesFor(property) {
        if (!this.references) return null;
        return this.references[property];
    }
    getSlots() {
        return this.slots = this.slots || dict();
    }
    root() {
        return this.rootCache = this.rootCache || new this.RootReferenceFactory(this.object);
    }
}

class PropertyReference {
    constructor(object, property, _outer) {
        this.tag = VOLATILE_TAG;
        this.object = object;
        this.property = property;
    }
    value() {
        return this.object[this.property];
    }
    label() {
        return '[reference Property]';
    }
}

// import { metaFor } from './meta';
// import { intern } from '@glimmer/util';
// import { metaFor } from './meta';

function isTypeSpecifier(specifier) {
    return specifier.indexOf(':') === -1;
}
class ApplicationRegistry {
    constructor(registry, resolver) {
        this._registry = registry;
        this._resolver = resolver;
    }
    register(specifier, factory, options) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.register(normalizedSpecifier, factory, options);
    }
    registration(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        return this._registry.registration(normalizedSpecifier);
    }
    unregister(specifier) {
        let normalizedSpecifier = this._toAbsoluteSpecifier(specifier);
        this._registry.unregister(normalizedSpecifier);
    }
    registerOption(specifier, option, value) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.registerOption(normalizedSpecifier, option, value);
    }
    registeredOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOption(normalizedSpecifier, option);
    }
    registeredOptions(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredOptions(normalizedSpecifier);
    }
    unregisterOption(specifier, option) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        this._registry.unregisterOption(normalizedSpecifier, option);
    }
    registerInjection(specifier, property, injection) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        let normalizedInjection = this._toAbsoluteSpecifier(injection);
        this._registry.registerInjection(normalizedSpecifier, property, normalizedInjection);
    }
    registeredInjections(specifier) {
        let normalizedSpecifier = this._toAbsoluteOrTypeSpecifier(specifier);
        return this._registry.registeredInjections(normalizedSpecifier);
    }
    _toAbsoluteSpecifier(specifier, referrer) {
        return this._resolver.identify(specifier, referrer);
    }
    _toAbsoluteOrTypeSpecifier(specifier) {
        if (isTypeSpecifier(specifier)) {
            return specifier;
        } else {
            return this._toAbsoluteSpecifier(specifier);
        }
    }
}

class DynamicScope {
    constructor(bucket = null) {
        if (bucket) {
            this.bucket = assign({}, bucket);
        } else {
            this.bucket = {};
        }
    }
    get(key) {
        return this.bucket[key];
    }
    set(key, reference) {
        return this.bucket[key] = reference;
    }
    child() {
        return new DynamicScope(this.bucket);
    }
}

class ArrayIterator {
    constructor(array, keyFor) {
        this.position = 0;
        this.array = array;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.array.length === 0;
    }
    next() {
        let position = this.position,
            array = this.array,
            keyFor = this.keyFor;

        if (position >= array.length) return null;
        let value = array[position];
        let key = keyFor(value, position);
        let memo = position;
        this.position++;
        return { key, value, memo };
    }
}
class ObjectKeysIterator {
    constructor(keys, values, keyFor) {
        this.position = 0;
        this.keys = keys;
        this.values = values;
        this.keyFor = keyFor;
    }
    isEmpty() {
        return this.keys.length === 0;
    }
    next() {
        let position = this.position,
            keys = this.keys,
            values = this.values,
            keyFor = this.keyFor;

        if (position >= keys.length) return null;
        let value = values[position];
        let memo = keys[position];
        let key = keyFor(value, memo);
        this.position++;
        return { key, value, memo };
    }
}
class EmptyIterator {
    isEmpty() {
        return true;
    }
    next() {
        throw new Error(`Cannot call next() on an empty iterator`);
    }
}
const EMPTY_ITERATOR = new EmptyIterator();
class Iterable {
    constructor(ref, keyFor) {
        this.tag = ref.tag;
        this.ref = ref;
        this.keyFor = keyFor;
    }
    iterate() {
        let ref = this.ref,
            keyFor = this.keyFor;

        let iterable = ref.value();
        if (Array.isArray(iterable)) {
            return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
        } else if (iterable === undefined || iterable === null) {
            return EMPTY_ITERATOR;
        } else if (iterable.forEach !== undefined) {
            let array = [];
            iterable.forEach(function (item) {
                array.push(item);
            });
            return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
        } else if (typeof iterable === 'object') {
            let keys = Object.keys(iterable);
            return keys.length > 0 ? new ObjectKeysIterator(keys, keys.map(key => iterable[key]), keyFor) : EMPTY_ITERATOR;
        } else {
            throw new Error(`Don't know how to {{#each ${iterable}}}`);
        }
    }
    valueReferenceFor(item) {
        return new RootReference(item.value);
    }
    updateValueReference(reference, item) {
        reference.update(item.value);
    }
    memoReferenceFor(item) {
        return new RootReference(item.memo);
    }
    updateMemoReference(reference, item) {
        reference.update(item.memo);
    }
}

function blockComponentMacro(params, hash, template, inverse, builder) {
    let definitionArgs = [params.slice(0, 1), null, null, null];
    let args = [params.slice(1), hashToArgs(hash), template, inverse];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
}
function inlineComponentMacro(_name, params, hash, builder) {
    let definitionArgs = [params.slice(0, 1), null, null, null];
    let args = [params.slice(1), hashToArgs(hash), null, null];
    builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
    return true;
}
function dynamicComponentFor(vm, args, meta) {
    let nameRef = args.positional.at(0);
    let env = vm.env;
    return new DynamicComponentReference(nameRef, env, meta);
}
class DynamicComponentReference {
    constructor(nameRef, env, meta) {
        this.nameRef = nameRef;
        this.env = env;
        this.meta = meta;
        this.tag = nameRef.tag;
    }
    value() {
        let env = this.env,
            nameRef = this.nameRef;

        let nameOrDef = nameRef.value();
        if (typeof nameOrDef === 'string') {
            return env.getComponentDefinition(nameOrDef, this.meta);
        }
        return null;
    }
    get() {
        return UNDEFINED_REFERENCE;
    }
}
function hashToArgs(hash) {
    if (hash === null) return null;
    let names = hash[0].map(key => `@${key}`);
    return [names, hash[1]];
}

function buildAction(vm, _args) {
    let componentRef = vm.getSelf();
    let args = _args.capture();
    let actionFunc = args.positional.at(0).value();
    if (typeof actionFunc !== 'function') {
        throwNoActionError(actionFunc, args.positional.at(0));
    }
    return new ConstReference(function action(...invokedArgs) {
        let curriedArgs = args.positional.value();
        // Consume the action function that was already captured above.
        curriedArgs.shift();
        curriedArgs.push(...invokedArgs);
        // Invoke the function with the component as the context, the curried
        // arguments passed to `{{action}}`, and the arguments the bound function
        // was invoked with.
        actionFunc.apply(componentRef && componentRef.value(), curriedArgs);
    });
}
function throwNoActionError(actionFunc, actionFuncReference) {
    let referenceInfo = debugInfoForReference(actionFuncReference);
    throw new Error(`You tried to create an action with the {{action}} helper, but the first argument ${referenceInfo}was ${typeof actionFunc} instead of a function.`);
}
function debugInfoForReference(reference) {
    let message = '';
    let parent;
    let property;
    if (reference === null || reference === undefined) {
        return message;
    }
    if ('parent' in reference && 'property' in reference) {
        parent = reference['parent'].value();
        property = reference['property'];
    } else if ('_parentValue' in reference && '_propertyKey' in reference) {
        parent = reference['_parentValue'];
        property = reference['_propertyKey'];
    }
    if (property !== undefined) {
        message += `('${property}' on ${debugName(parent)}) `;
    }
    return message;
}
function debugName(obj) {
    let objType = typeof obj;
    if (obj === null || obj === undefined) {
        return objType;
    } else if (objType === 'number' || objType === 'boolean') {
        return obj.toString();
    } else {
        if (obj['debugName']) {
            return obj['debugName'];
        }
        try {
            return JSON.stringify(obj);
        } catch (e) {}
        return obj.toString();
    }
}

function buildUserHelper(helperFunc) {
    return (_vm, args) => new HelperReference(helperFunc, args);
}
class SimplePathReference {
    constructor(parent, property) {
        this.tag = VOLATILE_TAG;
        this.parent = parent;
        this.property = property;
    }
    value() {
        return this.parent.value()[this.property];
    }
    get(prop) {
        return new SimplePathReference(this, prop);
    }
}
class HelperReference {
    constructor(helper, args) {
        this.tag = VOLATILE_TAG;
        this.helper = helper;
        this.args = args.capture();
    }
    value() {
        let helper = this.helper,
            args = this.args;

        return helper(args.positional.value(), args.named.value());
    }
    get(prop) {
        return new SimplePathReference(this, prop);
    }
}

class DefaultComponentDefinition extends ComponentDefinition {
    toJSON() {
        return `<default-component-definition name=${this.name}>`;
    }
}
const DEFAULT_MANAGER = 'main';
const DEFAULT_HELPERS = {
    action: buildAction
};
class Environment$1 extends Environment {
    constructor(options) {
        super({ appendOperations: options.appendOperations, updateOperations: new DOMChanges$1(options.document || document) });
        this.helpers = dict();
        this.modifiers = dict();
        this.components = dict();
        this.managers = dict();
        setOwner(this, getOwner(options));
        // TODO - required for `protocolForURL` - seek alternative approach
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor = options.document.createElement('a');
    }
    static create(options = {}) {
        options.document = options.document || self.document;
        options.appendOperations = options.appendOperations || new DOMTreeConstruction(options.document);
        return new Environment$1(options);
    }
    protocolForURL(url) {
        // TODO - investigate alternative approaches
        // e.g. see `installPlatformSpecificProtocolForURL` in Ember
        this.uselessAnchor.href = url;
        return this.uselessAnchor.protocol;
    }
    hasPartial() {
        return false;
    }
    lookupPartial() {}
    managerFor(managerId = DEFAULT_MANAGER) {
        let manager;
        manager = this.managers[managerId];
        if (!manager) {
            let app = getOwner(this);
            manager = this.managers[managerId] = getOwner(this).lookup(`component-manager:/${app.rootName}/component-managers/${managerId}`);
            if (!manager) {
                throw new Error(`No component manager found for ID ${managerId}.`);
            }
        }
        return manager;
    }
    hasComponentDefinition(name, meta) {
        return !!this.getComponentDefinition(name, meta);
    }
    getComponentDefinition(name, meta) {
        let owner = getOwner(this);
        let relSpecifier = `template:${name}`;
        let referrer = meta.specifier;
        let specifier = owner.identify(relSpecifier, referrer);
        if (specifier === undefined) {
            if (owner.identify(`component:${name}`, referrer)) {
                throw new Error(`The component '${name}' is missing a template. All components must have a template. Make sure there is a template.hbs in the component directory.`);
            } else {
                throw new Error("Could not find template for " + name);
            }
        }
        if (!this.components[specifier]) {
            return this.registerComponent(name, specifier, meta, owner);
        }
        return this.components[specifier];
    }
    registerComponent(name, templateSpecifier, meta, owner) {
        let serializedTemplate = owner.lookup('template', templateSpecifier);
        let componentSpecifier = owner.identify('component', templateSpecifier);
        let componentFactory = null;
        if (componentSpecifier) {
            componentFactory = owner.factoryFor(componentSpecifier);
        }
        let template = templateFactory(serializedTemplate).create(this);
        let manager = this.managerFor(meta.managerId);
        let definition;
        if (canCreateComponentDefinition(manager)) {
            definition = manager.createComponentDefinition(name, template, componentFactory);
        } else {
            definition = new DefaultComponentDefinition(name, manager, componentFactory);
        }
        this.components[templateSpecifier] = definition;
        return definition;
    }
    hasHelper(name, meta) {
        return !!this.lookupHelper(name, meta);
    }
    lookupHelper(name, meta) {
        if (DEFAULT_HELPERS[name]) {
            return DEFAULT_HELPERS[name];
        }
        let owner = getOwner(this);
        let relSpecifier = `helper:${name}`;
        let referrer = meta.specifier;
        let specifier = owner.identify(relSpecifier, referrer);
        if (specifier === undefined) {
            return;
        }
        if (!this.helpers[specifier]) {
            return this.registerHelper(specifier, owner);
        }
        return this.helpers[specifier];
    }
    registerHelper(specifier, owner) {
        let helperFunc = owner.lookup(specifier);
        let userHelper = buildUserHelper(helperFunc);
        this.helpers[specifier] = userHelper;
        return userHelper;
    }
    hasModifier(modifierName, blockMeta) {
        return modifierName.length === 1 && modifierName in this.modifiers;
    }
    lookupModifier(modifierName, blockMeta) {
        let modifier = this.modifiers[modifierName];
        if (!modifier) throw new Error(`Modifier for ${modifierName} not found.`);
        return modifier;
    }
    iterableFor(ref, keyPath) {
        let keyFor;
        if (!keyPath) {
            throw new Error('Must specify a key for #each');
        }
        switch (keyPath) {
            case '@index':
                keyFor = (_, index) => String(index);
                break;
            case '@primitive':
                keyFor = item => String(item);
                break;
            default:
                keyFor = item => item[keyPath];
                break;
        }
        return new Iterable(ref, keyFor);
    }
    macros() {
        let macros = super.macros();
        populateMacros(macros.blocks, macros.inlines);
        return macros;
    }
}
function populateMacros(blocks, inlines) {
    blocks.add('component', blockComponentMacro);
    inlines.add('component', inlineComponentMacro);
}
function canCreateComponentDefinition(manager) {
    return manager.createComponentDefinition !== undefined;
}

var mainTemplate = { "id": "UN61+JFU", "block": "{\"symbols\":[\"root\"],\"statements\":[[4,\"each\",[[19,0,[\"roots\"]]],[[\"key\"],[\"id\"]],{\"statements\":[[4,\"-in-element\",[[19,1,[\"parent\"]]],[[\"nextSibling\"],[[19,1,[\"nextSibling\"]]]],{\"statements\":[[1,[25,\"component\",[[19,1,[\"component\"]]],null],false]],\"parameters\":[]},null]],\"parameters\":[1]},null]],\"hasEval\":false}", "meta": { "specifier": "template:/-application/templates/main" } };

function NOOP() {}
class Application {
    constructor(options) {
        this._roots = [];
        this._rootsIndex = 0;
        this._initializers = [];
        this._initialized = false;
        this._rendering = false;
        this._rendered = false;
        this._scheduled = false;
        this._rerender = NOOP;
        this.rootName = options.rootName;
        this.resolver = options.resolver;
        this.document = options.document || window.document;
    }
    /** @hidden */
    registerInitializer(initializer) {
        this._initializers.push(initializer);
    }
    /** @hidden */
    initRegistry() {
        let registry = this._registry = new Registry();
        // Create ApplicationRegistry as a proxy to the underlying registry
        // that will only be available during `initialize`.
        let appRegistry = new ApplicationRegistry(this._registry, this.resolver);
        registry.register(`environment:/${this.rootName}/main/main`, Environment$1);
        registry.registerOption('helper', 'instantiate', false);
        registry.registerOption('template', 'instantiate', false);
        registry.register(`document:/${this.rootName}/main/main`, this.document);
        registry.registerOption('document', 'instantiate', false);
        registry.registerInjection('environment', 'document', `document:/${this.rootName}/main/main`);
        registry.registerInjection('component-manager', 'env', `environment:/${this.rootName}/main/main`);
        let initializers = this._initializers;
        for (let i = 0; i < initializers.length; i++) {
            initializers[i].initialize(appRegistry);
        }
        this._initialized = true;
    }
    /** @hidden */
    initContainer() {
        this._container = new Container(this._registry, this.resolver);
        // Inject `this` (the app) as the "owner" of every object instantiated
        // by its container.
        this._container.defaultInjections = specifier => {
            let hash = {};
            setOwner(hash, this);
            return hash;
        };
    }
    /** @hidden */
    initialize() {
        this.initRegistry();
        this.initContainer();
    }
    /** @hidden */
    boot() {
        this.initialize();
        this.env = this.lookup(`environment:/${this.rootName}/main/main`);
        this.render();
    }
    /** @hidden */
    render() {
        this.env.begin();
        let mainLayout = templateFactory(mainTemplate).create(this.env);
        let self = new RootReference({ roots: this._roots });
        let doc = this.document; // TODO FixReification
        let appendTo = doc.body;
        let dynamicScope = new DynamicScope();
        let templateIterator = mainLayout.render(self, appendTo, dynamicScope);
        let result;
        do {
            result = templateIterator.next();
        } while (!result.done);
        this.env.commit();
        let renderResult = result.value;
        this._rerender = () => {
            this.env.begin();
            renderResult.rerender();
            this.env.commit();
            this._didRender();
        };
        this._didRender();
    }
    _didRender() {
        this._rendered = true;
    }
    renderComponent(component, parent, nextSibling = null) {
        this._roots.push({ id: this._rootsIndex++, component, parent, nextSibling });
        this.scheduleRerender();
    }
    scheduleRerender() {
        if (this._scheduled || !this._rendered) return;
        this._rendering = true;
        this._scheduled = true;
        requestAnimationFrame(() => {
            this._scheduled = false;
            this._rerender();
            this._rendering = false;
        });
    }
    /**
     * Owner interface implementation
     *
     * @hidden
     */
    identify(specifier, referrer) {
        return this.resolver.identify(specifier, referrer);
    }
    /** @hidden */
    factoryFor(specifier, referrer) {
        return this._container.factoryFor(this.identify(specifier, referrer));
    }
    /** @hidden */
    lookup(specifier, referrer) {
        return this._container.lookup(this.identify(specifier, referrer));
    }
}

// TODO - use symbol

function isSpecifierStringAbsolute$1(specifier) {
    var _specifier$split = specifier.split(':');

    let type = _specifier$split[0],
        path = _specifier$split[1];

    return !!(type && path && path.indexOf('/') === 0 && path.split('/').length > 3);
}
function isSpecifierObjectAbsolute$1(specifier) {
    return specifier.rootName !== undefined && specifier.collection !== undefined && specifier.name !== undefined && specifier.type !== undefined;
}
function serializeSpecifier$1(specifier) {
    let type = specifier.type;
    let path = serializeSpecifierPath$1(specifier);
    if (path) {
        return type + ':' + path;
    } else {
        return type;
    }
}
function serializeSpecifierPath$1(specifier) {
    let path = [];
    if (specifier.rootName) {
        path.push(specifier.rootName);
    }
    if (specifier.collection) {
        path.push(specifier.collection);
    }
    if (specifier.namespace) {
        path.push(specifier.namespace);
    }
    if (specifier.name) {
        path.push(specifier.name);
    }
    if (path.length > 0) {
        let fullPath = path.join('/');
        if (isSpecifierObjectAbsolute$1(specifier)) {
            fullPath = '/' + fullPath;
        }
        return fullPath;
    }
}
function deserializeSpecifier$1(specifier) {
    let obj = {};
    if (specifier.indexOf(':') > -1) {
        var _specifier$split2 = specifier.split(':');

        let type = _specifier$split2[0],
            path = _specifier$split2[1];

        obj.type = type;
        let pathSegments;
        if (path.indexOf('/') === 0) {
            pathSegments = path.substr(1).split('/');
            obj.rootName = pathSegments.shift();
            obj.collection = pathSegments.shift();
        } else {
            pathSegments = path.split('/');
        }
        if (pathSegments.length > 0) {
            obj.name = pathSegments.pop();
            if (pathSegments.length > 0) {
                obj.namespace = pathSegments.join('/');
            }
        }
    } else {
        obj.type = specifier;
    }
    return obj;
}

function assert$1(description, test) {
    if (!test) {
        throw new Error('Assertion Failed: ' + description);
    }
}

class Resolver {
    constructor(config, registry) {
        this.config = config;
        this.registry = registry;
    }
    identify(specifier, referrer) {
        if (isSpecifierStringAbsolute$1(specifier)) {
            return specifier;
        }
        let s = deserializeSpecifier$1(specifier);
        let result;
        if (referrer) {
            let r = deserializeSpecifier$1(referrer);
            if (isSpecifierObjectAbsolute$1(r)) {
                assert$1('Specifier must not include a rootName, collection, or namespace when combined with an absolute referrer', s.rootName === undefined && s.collection === undefined && s.namespace === undefined);
                // Look locally in the referrer's namespace
                s.rootName = r.rootName;
                s.collection = r.collection;
                if (s.name) {
                    s.namespace = r.namespace ? r.namespace + '/' + r.name : r.name;
                } else {
                    s.namespace = r.namespace;
                    s.name = r.name;
                }
                if (result = this._serializeAndVerify(s)) {
                    return result;
                }
                // Look for a private collection in the referrer's namespace
                let privateCollection = this._definitiveCollection(s.type);
                if (privateCollection) {
                    s.namespace += '/-' + privateCollection;
                    if (result = this._serializeAndVerify(s)) {
                        return result;
                    }
                }
                // Because local and private resolution has failed, clear all but `name` and `type`
                // to proceed with top-level resolution
                s.rootName = s.collection = s.namespace = undefined;
            } else {
                assert$1('Referrer must either be "absolute" or include a `type` to determine the associated type', r.type);
                // Look in the definitive collection for the associated type
                s.collection = this._definitiveCollection(r.type);
                assert$1(`'${r.type}' does not have a definitive collection`, s.collection);
            }
        }
        // If the collection is unspecified, use the definitive collection for the `type`
        if (!s.collection) {
            s.collection = this._definitiveCollection(s.type);
            assert$1(`'${s.type}' does not have a definitive collection`, s.collection);
        }
        if (!s.rootName) {
            // If the root name is unspecified, try the app's `rootName` first
            s.rootName = this.config.app.rootName || 'app';
            if (result = this._serializeAndVerify(s)) {
                return result;
            }
            // Then look for an addon with a matching `rootName`
            let addonDef;
            if (s.namespace) {
                addonDef = this.config.addons && this.config.addons[s.namespace];
                s.rootName = s.namespace;
                s.namespace = undefined;
            } else {
                addonDef = this.config.addons && this.config.addons[s.name];
                s.rootName = s.name;
                s.name = 'main';
            }
        }
        if (result = this._serializeAndVerify(s)) {
            return result;
        }
    }
    retrieve(specifier) {
        return this.registry.get(specifier);
    }
    resolve(specifier, referrer) {
        let id = this.identify(specifier, referrer);
        if (id) {
            return this.retrieve(id);
        }
    }
    _definitiveCollection(type) {
        let typeDef = this.config.types[type];
        assert$1(`'${type}' is not a recognized type`, typeDef);
        return typeDef.definitiveCollection;
    }
    _serializeAndVerify(specifier) {
        let serialized = serializeSpecifier$1(specifier);
        if (this.registry.has(serialized)) {
            return serialized;
        }
    }
}

class BasicRegistry {
    constructor(entries = {}) {
        this._entries = entries;
    }
    has(specifier) {
        return specifier in this._entries;
    }
    get(specifier) {
        return this._entries[specifier];
    }
}

function tracked(...dependencies) {
    let target = dependencies[0],
        key = dependencies[1],
        descriptor = dependencies[2];

    if (typeof target === "string") {
        return function (target, key, descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, dependencies);
        };
    } else {
        if (descriptor) {
            return descriptorForTrackedComputedProperty(target, key, descriptor, []);
        } else {
            installTrackedProperty(target, key);
        }
    }
}
function descriptorForTrackedComputedProperty(target, key, descriptor, dependencies) {
    let meta = metaFor$1(target);
    meta.trackedProperties[key] = true;
    meta.trackedPropertyDependencies[key] = dependencies || [];
    return {
        enumerable: true,
        configurable: false,
        get: descriptor.get,
        set: function set() {
            metaFor$1(this).dirtyableTagFor(key).inner.dirty();
            descriptor.set.apply(this, arguments);
            propertyDidChange();
        }
    };
}
/**
  Installs a getter/setter for change tracking. The accessor
  acts just like a normal property, but it triggers the `propertyDidChange`
  hook when written to.

  Values are saved on the object using a "shadow key," or a symbol based on the
  tracked property name. Sets write the value to the shadow key, and gets read
  from it.
 */
function installTrackedProperty(target, key) {
    let value;
    let shadowKey = Symbol(key);
    let meta = metaFor$1(target);
    meta.trackedProperties[key] = true;
    if (target[key] !== undefined) {
        value = target[key];
    }
    Object.defineProperty(target, key, {
        configurable: true,
        get() {
            return this[shadowKey];
        },
        set(newValue) {
            metaFor$1(this).dirtyableTagFor(key).inner.dirty();
            this[shadowKey] = newValue;
            propertyDidChange();
        }
    });
}
/**
 * Stores bookkeeping information about tracked properties on the target object
 * and includes helper methods for manipulating and retrieving that data.
 *
 * Computed properties (i.e., tracked getters/setters) deserve some explanation.
 * A computed property is invalidated when either it is set, or one of its
 * dependencies is invalidated. Therefore, we store two tags for each computed
 * property:
 *
 * 1. The dirtyable tag that we invalidate when the setter is invoked.
 * 2. A union tag (tag combinator) of the dirtyable tag and all of the computed
 *    property's dependencies' tags, used by Glimmer to determine "does this
 *    computed property need to be recomputed?"
 */
class Meta$2 {
    constructor(parent) {
        this.tags = dict();
        this.computedPropertyTags = dict();
        this.trackedProperties = parent ? Object.create(parent.trackedProperties) : dict();
        this.trackedPropertyDependencies = parent ? Object.create(parent.trackedPropertyDependencies) : dict();
    }
    /**
     * The tag representing whether the given property should be recomputed. Used
     * by e.g. Glimmer VM to detect when a property should be re-rendered. Think
     * of this as the "public-facing" tag.
     *
     * For static tracked properties, this is a single DirtyableTag. For computed
     * properties, it is a combinator of the property's DirtyableTag as well as
     * all of its dependencies' tags.
     */
    tagFor(key) {
        let tag = this.tags[key];
        if (tag) {
            return tag;
        }
        let dependencies;
        if (dependencies = this.trackedPropertyDependencies[key]) {
            return this.tags[key] = combinatorForComputedProperties(this, key, dependencies);
        }
        return this.tags[key] = DirtyableTag.create();
    }
    /**
     * The tag used internally to invalidate when a tracked property is set. For
     * static properties, this is the same DirtyableTag returned from `tagFor`.
     * For computed properties, it is the DirtyableTag used as one of the tags in
     * the tag combinator of the CP and its dependencies.
    */
    dirtyableTagFor(key) {
        let dependencies = this.trackedPropertyDependencies[key];
        let tag;
        if (dependencies) {
            // The key is for a computed property.
            tag = this.computedPropertyTags[key];
            if (tag) {
                return tag;
            }
            return this.computedPropertyTags[key] = DirtyableTag.create();
        } else {
            // The key is for a static property.
            tag = this.tags[key];
            if (tag) {
                return tag;
            }
            return this.tags[key] = DirtyableTag.create();
        }
    }
}
function combinatorForComputedProperties(meta, key, dependencies) {
    // Start off with the tag for the CP's own dirty state.
    let tags = [meta.dirtyableTagFor(key)];
    // Next, add in all of the tags for its dependencies.
    if (dependencies && dependencies.length) {
        for (let i = 0; i < dependencies.length; i++) {
            tags.push(meta.tagFor(dependencies[i]));
        }
    }
    // Return a combinator across the CP's tags and its dependencies' tags.
    return combine(tags);
}
let META = Symbol("ember-object");
function metaFor$1(obj) {
    let meta = obj[META];
    if (meta && hasOwnProperty$1(obj, META)) {
        return meta;
    }
    return obj[META] = new Meta$2(meta);
}
let hOP = Object.prototype.hasOwnProperty;
function hasOwnProperty$1(obj, key) {
    return hOP.call(obj, key);
}
let propertyDidChange = function propertyDidChange() {};
function setPropertyDidChange(cb) {
    propertyDidChange = cb;
}
function hasTag(obj, key) {
    let meta = obj[META];
    if (!obj[META]) {
        return false;
    }
    if (!meta.trackedProperties[key]) {
        return false;
    }
    return true;
}
class UntrackedPropertyError extends Error {
    constructor(target, key, message) {
        super(message);
        this.target = target;
        this.key = key;
    }
    static for(obj, key) {
        return new UntrackedPropertyError(obj, key, `The property '${key}' on ${obj} was changed after being rendered. If you want to change a property used in a template after the component has rendered, mark the property as a tracked property with the @tracked decorator.`);
    }
}
function defaultErrorThrower(obj, key) {
    throw UntrackedPropertyError.for(obj, key);
}
function tagForProperty(obj, key, throwError = defaultErrorThrower) {
    if (typeof obj === "object" && obj) {
        if (true && !hasTag(obj, key)) {
            installDevModeErrorInterceptor(obj, key, throwError);
        }
        let meta = metaFor$1(obj);
        return meta.tagFor(key);
    } else {
        return CONSTANT_TAG;
    }
}
/**
 * In development mode only, we install an ad hoc setter on properties where a
 * tag is requested (i.e., it was used in a template) without being tracked. In
 * cases where the property is set, we raise an error.
 */
function installDevModeErrorInterceptor(obj, key, throwError) {
    let target = obj;
    let descriptor;
    // Find the descriptor for the current property. We may need to walk the
    // prototype chain to do so. If the property is undefined, we may never get a
    // descriptor here.
    let hasOwnDescriptor = true;
    while (target) {
        descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (descriptor) {
            break;
        }
        hasOwnDescriptor = false;
        target = Object.getPrototypeOf(target);
    }
    // If possible, define a property descriptor that passes through the current
    // value on reads but throws an exception on writes.
    if (descriptor) {
        if (descriptor.configurable || !hasOwnDescriptor) {
            Object.defineProperty(obj, key, {
                configurable: descriptor.configurable,
                enumerable: descriptor.enumerable,
                get() {
                    if (descriptor.get) {
                        return descriptor.get.call(this);
                    } else {
                        return descriptor.value;
                    }
                },
                set() {
                    throwError(this, key);
                }
            });
        }
    } else {
        Object.defineProperty(obj, key, {
            set() {
                throwError(this, key);
            }
        });
    }
}

class Component {
  /**
   * Constructs a new component and assigns itself the passed properties. You
   * should not construct new components yourself. Instead, Glimmer will
   * instantiate new components automatically as it renders.
   *
   * @param options
   */
  constructor(options) {
    /**
     * The element corresponding to the top-level element of the component's template.
     * You should not try to access this property until after the component's `didInsertElement()`
     * lifecycle hook is called.
     */
    this.element = null;
    /**
     * Development-mode only name of the component, useful for debugging.
     */
    this.debugName = null;
    /** @private
     * Slot on the component to save Arguments object passed to the `args` setter.
     */
    this.__args__ = null;
    Object.assign(this, options);
  }
  /**
   * Named arguments passed to the component from its parent component.
   * They can be accessed in JavaScript via `this.args.argumentName` and in the template via `@argumentName`.
   *
   * Say you have the following component, which will have two `args`, `firstName` and `lastName`:
   *
   * ```hbs
   * <my-component @firstName="Arthur" @lastName="Dent" />
   * ```
   *
   * If you needed to calculate `fullName` by combining both of them, you would do:
   *
   * ```ts
   * didInsertElement() {
   *   console.log(`Hi, my full name is ${this.args.firstName} ${this.args.lastName}`);
   * }
   * ```
   *
   * While in the template you could do:
   *
   * ```hbs
   * <p>Welcome, {{@firstName}} {{@lastName}}!</p>
   * ```
   *
   */
  get args() {
    return this.__args__;
  }
  set args(args) {
    this.__args__ = args;
    metaFor$1(this).dirtyableTagFor("args").inner.dirty();
  }
  static create(injections) {
    return new this(injections);
  }
  /**
   * Called when the component has been inserted into the DOM.
   * Override this function to do any set up that requires an element in the document body.
   */
  didInsertElement() {}
  /**
   * Called when the component has updated and rerendered itself.
   * Called only during a rerender, not during an initial render.
   */
  didUpdate() {}
  /**
   * Called before the component has been removed from the DOM.
   */
  willDestroy() {}
  destroy() {
    this.willDestroy();
  }
  toString() {
    return `${this.debugName} component`;
  }
}

class ComponentDefinition$1 extends ComponentDefinition {
    constructor(name, manager, template, componentFactory) {
        super(name, manager, componentFactory);
        this.template = template;
        this.componentFactory = componentFactory;
    }
    toJSON() {
        return { GlimmerDebug: `<component-definition name="${this.name}">` };
    }
}

class ComponentPathReference {
    get(key) {
        return PropertyReference$1.create(this, key);
    }
}
class CachedReference$1 extends ComponentPathReference {
    constructor() {
        super(...arguments);
        this._lastRevision = null;
        this._lastValue = null;
    }
    value() {
        let tag = this.tag,
            _lastRevision = this._lastRevision,
            _lastValue = this._lastValue;

        if (!_lastRevision || !tag.validate(_lastRevision)) {
            _lastValue = this._lastValue = this.compute();
            this._lastRevision = tag.value();
        }
        return _lastValue;
    }
}
class RootReference$1 extends ConstReference {
    constructor() {
        super(...arguments);
        this.children = dict();
    }
    get(propertyKey) {
        let ref = this.children[propertyKey];
        if (!ref) {
            ref = this.children[propertyKey] = new RootPropertyReference(this.inner, propertyKey);
        }
        return ref;
    }
}
class PropertyReference$1 extends CachedReference$1 {
    static create(parentReference, propertyKey) {
        if (isConst(parentReference)) {
            return new RootPropertyReference(parentReference.value(), propertyKey);
        } else {
            return new NestedPropertyReference(parentReference, propertyKey);
        }
    }
    get(key) {
        return new NestedPropertyReference(this, key);
    }
}
function buildError(obj, key) {
    let message = `The '${key}' property on the ${obj} was changed after it had been rendered. Properties that change after being rendered must be tracked. Use the @tracked decorator to mark this as a tracked property.`;
    throw new UntrackedPropertyError(obj, key, message);
}
class RootPropertyReference extends PropertyReference$1 {
    constructor(parentValue, propertyKey) {
        super();
        this._parentValue = parentValue;
        this._propertyKey = propertyKey;
        this.tag = tagForProperty(parentValue, propertyKey, buildError);
    }
    compute() {
        return this._parentValue[this._propertyKey];
    }
}
class NestedPropertyReference extends PropertyReference$1 {
    constructor(parentReference, propertyKey) {
        super();
        let parentReferenceTag = parentReference.tag;
        let parentObjectTag = UpdatableTag.create(CONSTANT_TAG);
        this._parentReference = parentReference;
        this._parentObjectTag = parentObjectTag;
        this._propertyKey = propertyKey;
        this.tag = combine([parentReferenceTag, parentObjectTag]);
    }
    compute() {
        let _parentReference = this._parentReference,
            _parentObjectTag = this._parentObjectTag,
            _propertyKey = this._propertyKey;

        let parentValue = _parentReference.value();
        _parentObjectTag.inner.update(tagForProperty(parentValue, _propertyKey));
        if (typeof parentValue === "string" && _propertyKey === "length") {
            return parentValue.length;
        }
        if (typeof parentValue === "object" && parentValue) {
            return parentValue[_propertyKey];
        } else {
            return undefined;
        }
    }
}

class ComponentStateBucket {
    constructor(definition, args, owner) {
        let componentFactory = definition.componentFactory;
        let name = definition.name;
        this.args = args;
        let injections = {
            debugName: name,
            args: this.namedArgsSnapshot()
        };
        setOwner(injections, owner);
        this.component = componentFactory.create(injections);
    }
    namedArgsSnapshot() {
        return Object.freeze(this.args.named.value());
    }
}
class LayoutCompiler {
    constructor(name, template) {
        this.template = template;
        this.name = name;
    }
    compile(builder) {
        builder.fromLayout(this.name, this.template);
    }
}
class ComponentManager {
    static create(options) {
        return new ComponentManager(options);
    }
    constructor(options) {
        this.env = options.env;
    }
    prepareArgs(definition, args) {
        return null;
    }
    create(environment, definition, volatileArgs) {
        let componentFactory = definition.componentFactory;
        if (!componentFactory) {
            return null;
        }
        let owner = getOwner(this.env);
        return new ComponentStateBucket(definition, volatileArgs.capture(), owner);
    }
    createComponentDefinition(name, template, componentFactory) {
        return new ComponentDefinition$1(name, this, template, componentFactory);
    }
    layoutFor(definition, bucket, env) {
        let template = definition.template;
        return compileLayout(new LayoutCompiler(definition.name, template), this.env);
    }
    getSelf(bucket) {
        if (!bucket) {
            return null;
        }
        return new RootReference$1(bucket.component);
    }
    didCreateElement(bucket, element) {
        if (!bucket) {
            return;
        }
        bucket.component.element = element;
    }
    didRenderLayout(bucket, bounds) {}
    didCreate(bucket) {
        bucket && bucket.component.didInsertElement();
    }
    getTag() {
        return null;
    }
    update(bucket, scope) {
        if (!bucket) {
            return;
        }
        // TODO: This should be moved to `didUpdate`, but there's currently a
        // Glimmer bug that causes it not to be called if the layout doesn't update.
        let component = bucket.component;

        component.args = bucket.namedArgsSnapshot();
        component.didUpdate();
    }
    didUpdateLayout() {}
    didUpdate(bucket) {}
    getDestructor(bucket) {
        if (!bucket) {
            return;
        }
        return bucket.component;
    }
}

/*! highlight.js v9.10.0 | BSD3 License | git.io/hljslicense */(function(factory){// Find the global object for export to both the browser and web workers.
var globalObject=typeof window==='object'&&window||typeof self==='object'&&self;// Setup highlight.js for different environments. First is Node.js or
// CommonJS.
if(typeof exports!=='undefined'){factory(exports);}else if(globalObject){// Export hljs globally even when using AMD for cases when this script
// is loaded with others that may still expect a global hljs.
globalObject.hljs=factory({});// Finally register the global hljs with AMD.
if(typeof define==='function'&&define.amd){define([],function(){return globalObject.hljs;});}}})(function(hljs){// Convenience variables for build-in objects
var ArrayProto=[],objectKeys=Object.keys;// Global internal variables used within the highlight.js library.
var languages={},aliases={};// Regular expressions used throughout the highlight.js library.
var noHighlightRe=/^(no-?highlight|plain|text)$/i,languagePrefixRe=/\blang(?:uage)?-([\w-]+)\b/i,fixMarkupRe=/((^(<[^>]+>|\t|)+|(?:\n)))/gm;var spanEndTag='</span>';// Global options used when within external APIs. This is modified when
// calling the `hljs.configure` function.
var options={classPrefix:'hljs-',tabReplace:null,useBR:false,languages:undefined};// Object map that is used to escape some common HTML characters.
var escapeRegexMap={'&':'&amp;','<':'&lt;','>':'&gt;'};/* Utility functions */function escape(value){return value.replace(/[&<>]/gm,function(character){return escapeRegexMap[character];});}function tag(node){return node.nodeName.toLowerCase();}function testRe(re,lexeme){var match=re&&re.exec(lexeme);return match&&match.index===0;}function isNotHighlighted(language){return noHighlightRe.test(language);}function blockLanguage(block){var i,match,length,_class;var classes=block.className+' ';classes+=block.parentNode?block.parentNode.className:'';// language-* takes precedence over non-prefixed class names.
match=languagePrefixRe.exec(classes);if(match){return getLanguage(match[1])?match[1]:'no-highlight';}classes=classes.split(/\s+/);for(i=0,length=classes.length;i<length;i++){_class=classes[i];if(isNotHighlighted(_class)||getLanguage(_class)){return _class;}}}function inherit(parent){// inherit(parent, override_obj, override_obj, ...)
var key;var result={};var objects=Array.prototype.slice.call(arguments,1);for(key in parent)result[key]=parent[key];objects.forEach(function(obj){for(key in obj)result[key]=obj[key];});return result;}/* Stream merging */function nodeStream(node){var result=[];(function _nodeStream(node,offset){for(var child=node.firstChild;child;child=child.nextSibling){if(child.nodeType===3)offset+=child.nodeValue.length;else if(child.nodeType===1){result.push({event:'start',offset:offset,node:child});offset=_nodeStream(child,offset);// Prevent void elements from having an end tag that would actually
// double them in the output. There are more void elements in HTML
// but we list only those realistically expected in code display.
if(!tag(child).match(/br|hr|img|input/)){result.push({event:'stop',offset:offset,node:child});}}}return offset;})(node,0);return result;}function mergeStreams(original,highlighted,value){var processed=0;var result='';var nodeStack=[];function selectStream(){if(!original.length||!highlighted.length){return original.length?original:highlighted;}if(original[0].offset!==highlighted[0].offset){return original[0].offset<highlighted[0].offset?original:highlighted;}/*
      To avoid starting the stream just before it should stop the order is
      ensured that original always starts first and closes last:

      if (event1 == 'start' && event2 == 'start')
        return original;
      if (event1 == 'start' && event2 == 'stop')
        return highlighted;
      if (event1 == 'stop' && event2 == 'start')
        return original;
      if (event1 == 'stop' && event2 == 'stop')
        return highlighted;

      ... which is collapsed to:
      */return highlighted[0].event==='start'?original:highlighted;}function open(node){function attr_str(a){return' '+a.nodeName+'="'+escape(a.value)+'"';}result+='<'+tag(node)+ArrayProto.map.call(node.attributes,attr_str).join('')+'>';}function close(node){result+='</'+tag(node)+'>';}function render(event){(event.event==='start'?open:close)(event.node);}while(original.length||highlighted.length){var stream=selectStream();result+=escape(value.substring(processed,stream[0].offset));processed=stream[0].offset;if(stream===original){/*
        On any opening or closing tag of the original markup we first close
        the entire highlighted node stack, then render the original tag along
        with all the following original tags at the same offset and then
        reopen all the tags on the highlighted stack.
        */nodeStack.reverse().forEach(close);do{render(stream.splice(0,1)[0]);stream=selectStream();}while(stream===original&&stream.length&&stream[0].offset===processed);nodeStack.reverse().forEach(open);}else{if(stream[0].event==='start'){nodeStack.push(stream[0].node);}else{nodeStack.pop();}render(stream.splice(0,1)[0]);}}return result+escape(value.substr(processed));}/* Initialization */function expand_mode(mode){if(mode.variants&&!mode.cached_variants){mode.cached_variants=mode.variants.map(function(variant){return inherit(mode,{variants:null},variant);});}return mode.cached_variants||mode.endsWithParent&&[inherit(mode)]||[mode];}function compileLanguage(language){function reStr(re){return re&&re.source||re;}function langRe(value,global){return new RegExp(reStr(value),'m'+(language.case_insensitive?'i':'')+(global?'g':''));}function compileMode(mode,parent){if(mode.compiled)return;mode.compiled=true;mode.keywords=mode.keywords||mode.beginKeywords;if(mode.keywords){var compiled_keywords={};var flatten=function flatten(className,str){if(language.case_insensitive){str=str.toLowerCase();}str.split(' ').forEach(function(kw){var pair=kw.split('|');compiled_keywords[pair[0]]=[className,pair[1]?Number(pair[1]):1];});};if(typeof mode.keywords==='string'){// string
flatten('keyword',mode.keywords);}else{objectKeys(mode.keywords).forEach(function(className){flatten(className,mode.keywords[className]);});}mode.keywords=compiled_keywords;}mode.lexemesRe=langRe(mode.lexemes||/\w+/,true);if(parent){if(mode.beginKeywords){mode.begin='\\b('+mode.beginKeywords.split(' ').join('|')+')\\b';}if(!mode.begin)mode.begin=/\B|\b/;mode.beginRe=langRe(mode.begin);if(!mode.end&&!mode.endsWithParent)mode.end=/\B|\b/;if(mode.end)mode.endRe=langRe(mode.end);mode.terminator_end=reStr(mode.end)||'';if(mode.endsWithParent&&parent.terminator_end)mode.terminator_end+=(mode.end?'|':'')+parent.terminator_end;}if(mode.illegal)mode.illegalRe=langRe(mode.illegal);if(mode.relevance==null)mode.relevance=1;if(!mode.contains){mode.contains=[];}mode.contains=Array.prototype.concat.apply([],mode.contains.map(function(c){return expand_mode(c==='self'?mode:c);}));mode.contains.forEach(function(c){compileMode(c,mode);});if(mode.starts){compileMode(mode.starts,parent);}var terminators=mode.contains.map(function(c){return c.beginKeywords?'\\.?('+c.begin+')\\.?':c.begin;}).concat([mode.terminator_end,mode.illegal]).map(reStr).filter(Boolean);mode.terminators=terminators.length?langRe(terminators.join('|'),true):{exec:function exec()/*s*/{return null;}};}compileMode(language);}/*
  Core highlighting function. Accepts a language name, or an alias, and a
  string with the code to highlight. Returns an object with the following
  properties:

  - relevance (int)
  - value (an HTML string with highlighting markup)

  */function highlight(name,value,ignore_illegals,continuation){function subMode(lexeme,mode){var i,length;for(i=0,length=mode.contains.length;i<length;i++){if(testRe(mode.contains[i].beginRe,lexeme)){return mode.contains[i];}}}function endOfMode(mode,lexeme){if(testRe(mode.endRe,lexeme)){while(mode.endsParent&&mode.parent){mode=mode.parent;}return mode;}if(mode.endsWithParent){return endOfMode(mode.parent,lexeme);}}function isIllegal(lexeme,mode){return!ignore_illegals&&testRe(mode.illegalRe,lexeme);}function keywordMatch(mode,match){var match_str=language.case_insensitive?match[0].toLowerCase():match[0];return mode.keywords.hasOwnProperty(match_str)&&mode.keywords[match_str];}function buildSpan(classname,insideSpan,leaveOpen,noPrefix){var classPrefix=noPrefix?'':options.classPrefix,openSpan='<span class="'+classPrefix,closeSpan=leaveOpen?'':spanEndTag;openSpan+=classname+'">';return openSpan+insideSpan+closeSpan;}function processKeywords(){var keyword_match,last_index,match,result;if(!top.keywords)return escape(mode_buffer);result='';last_index=0;top.lexemesRe.lastIndex=0;match=top.lexemesRe.exec(mode_buffer);while(match){result+=escape(mode_buffer.substring(last_index,match.index));keyword_match=keywordMatch(top,match);if(keyword_match){relevance+=keyword_match[1];result+=buildSpan(keyword_match[0],escape(match[0]));}else{result+=escape(match[0]);}last_index=top.lexemesRe.lastIndex;match=top.lexemesRe.exec(mode_buffer);}return result+escape(mode_buffer.substr(last_index));}function processSubLanguage(){var explicit=typeof top.subLanguage==='string';if(explicit&&!languages[top.subLanguage]){return escape(mode_buffer);}var result=explicit?highlight(top.subLanguage,mode_buffer,true,continuations[top.subLanguage]):highlightAuto(mode_buffer,top.subLanguage.length?top.subLanguage:undefined);// Counting embedded language score towards the host language may be disabled
// with zeroing the containing mode relevance. Usecase in point is Markdown that
// allows XML everywhere and makes every XML snippet to have a much larger Markdown
// score.
if(top.relevance>0){relevance+=result.relevance;}if(explicit){continuations[top.subLanguage]=result.top;}return buildSpan(result.language,result.value,false,true);}function processBuffer(){result+=top.subLanguage!=null?processSubLanguage():processKeywords();mode_buffer='';}function startNewMode(mode){result+=mode.className?buildSpan(mode.className,'',true):'';top=Object.create(mode,{parent:{value:top}});}function processLexeme(buffer,lexeme){mode_buffer+=buffer;if(lexeme==null){processBuffer();return 0;}var new_mode=subMode(lexeme,top);if(new_mode){if(new_mode.skip){mode_buffer+=lexeme;}else{if(new_mode.excludeBegin){mode_buffer+=lexeme;}processBuffer();if(!new_mode.returnBegin&&!new_mode.excludeBegin){mode_buffer=lexeme;}}startNewMode(new_mode,lexeme);return new_mode.returnBegin?0:lexeme.length;}var end_mode=endOfMode(top,lexeme);if(end_mode){var origin=top;if(origin.skip){mode_buffer+=lexeme;}else{if(!(origin.returnEnd||origin.excludeEnd)){mode_buffer+=lexeme;}processBuffer();if(origin.excludeEnd){mode_buffer=lexeme;}}do{if(top.className){result+=spanEndTag;}if(!top.skip){relevance+=top.relevance;}top=top.parent;}while(top!==end_mode.parent);if(end_mode.starts){startNewMode(end_mode.starts,'');}return origin.returnEnd?0:lexeme.length;}if(isIllegal(lexeme,top))throw new Error('Illegal lexeme "'+lexeme+'" for mode "'+(top.className||'<unnamed>')+'"');/*
      Parser should not reach this point as all types of lexemes should be caught
      earlier, but if it does due to some bug make sure it advances at least one
      character forward to prevent infinite looping.
      */mode_buffer+=lexeme;return lexeme.length||1;}var language=getLanguage(name);if(!language){throw new Error('Unknown language: "'+name+'"');}compileLanguage(language);var top=continuation||language;var continuations={};// keep continuations for sub-languages
var result='',current;for(current=top;current!==language;current=current.parent){if(current.className){result=buildSpan(current.className,'',true)+result;}}var mode_buffer='';var relevance=0;try{var match,count,index=0;while(true){top.terminators.lastIndex=index;match=top.terminators.exec(value);if(!match)break;count=processLexeme(value.substring(index,match.index),match[0]);index=match.index+count;}processLexeme(value.substr(index));for(current=top;current.parent;current=current.parent){// close dangling modes
if(current.className){result+=spanEndTag;}}return{relevance:relevance,value:result,language:name,top:top};}catch(e){if(e.message&&e.message.indexOf('Illegal')!==-1){return{relevance:0,value:escape(value)};}else{throw e;}}}/*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */function highlightAuto(text,languageSubset){languageSubset=languageSubset||options.languages||objectKeys(languages);var result={relevance:0,value:escape(text)};var second_best=result;languageSubset.filter(getLanguage).forEach(function(name){var current=highlight(name,text,false);current.language=name;if(current.relevance>second_best.relevance){second_best=current;}if(current.relevance>result.relevance){second_best=result;result=current;}});if(second_best.language){result.second_best=second_best;}return result;}/*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */function fixMarkup(value){return!(options.tabReplace||options.useBR)?value:value.replace(fixMarkupRe,function(match,p1){if(options.useBR&&match==='\n'){return'<br>';}else if(options.tabReplace){return p1.replace(/\t/g,options.tabReplace);}return'';});}function buildClassName(prevClassName,currentLang,resultLang){var language=currentLang?aliases[currentLang]:resultLang,result=[prevClassName.trim()];if(!prevClassName.match(/\bhljs\b/)){result.push('hljs');}if(prevClassName.indexOf(language)===-1){result.push(language);}return result.join(' ').trim();}/*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */function highlightBlock(block){var node,originalStream,result,resultNode,text;var language=blockLanguage(block);if(isNotHighlighted(language))return;if(options.useBR){node=document.createElementNS('http://www.w3.org/1999/xhtml','div');node.innerHTML=block.innerHTML.replace(/\n/g,'').replace(/<br[ \/]*>/g,'\n');}else{node=block;}text=node.textContent;result=language?highlight(language,text,true):highlightAuto(text);originalStream=nodeStream(node);if(originalStream.length){resultNode=document.createElementNS('http://www.w3.org/1999/xhtml','div');resultNode.innerHTML=result.value;result.value=mergeStreams(originalStream,nodeStream(resultNode),text);}result.value=fixMarkup(result.value);block.innerHTML=result.value;block.className=buildClassName(block.className,language,result.language);block.result={language:result.language,re:result.relevance};if(result.second_best){block.second_best={language:result.second_best.language,re:result.second_best.relevance};}}/*
  Updates highlight.js global options with values passed in the form of an object.
  */function configure(user_options){options=inherit(options,user_options);}/*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */function initHighlighting(){if(initHighlighting.called)return;initHighlighting.called=true;var blocks=document.querySelectorAll('pre code');ArrayProto.forEach.call(blocks,highlightBlock);}/*
  Attaches highlighting to the page load event.
  */function initHighlightingOnLoad(){addEventListener('DOMContentLoaded',initHighlighting,false);addEventListener('load',initHighlighting,false);}function registerLanguage(name,language){var lang=languages[name]=language(hljs);if(lang.aliases){lang.aliases.forEach(function(alias){aliases[alias]=name;});}}function listLanguages(){return objectKeys(languages);}function getLanguage(name){name=(name||'').toLowerCase();return languages[name]||languages[aliases[name]];}/* Interface definition */hljs.highlight=highlight;hljs.highlightAuto=highlightAuto;hljs.fixMarkup=fixMarkup;hljs.highlightBlock=highlightBlock;hljs.configure=configure;hljs.initHighlighting=initHighlighting;hljs.initHighlightingOnLoad=initHighlightingOnLoad;hljs.registerLanguage=registerLanguage;hljs.listLanguages=listLanguages;hljs.getLanguage=getLanguage;hljs.inherit=inherit;// Common regexps
hljs.IDENT_RE='[a-zA-Z]\\w*';hljs.UNDERSCORE_IDENT_RE='[a-zA-Z_]\\w*';hljs.NUMBER_RE='\\b\\d+(\\.\\d+)?';hljs.C_NUMBER_RE='(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)';// 0x..., 0..., decimal, float
hljs.BINARY_NUMBER_RE='\\b(0b[01]+)';// 0b...
hljs.RE_STARTERS_RE='!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';// Common modes
hljs.BACKSLASH_ESCAPE={begin:'\\\\[\\s\\S]',relevance:0};hljs.APOS_STRING_MODE={className:'string',begin:'\'',end:'\'',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]};hljs.QUOTE_STRING_MODE={className:'string',begin:'"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]};hljs.PHRASAL_WORDS_MODE={begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|like)\b/};hljs.COMMENT=function(begin,end,inherits){var mode=hljs.inherit({className:'comment',begin:begin,end:end,contains:[]},inherits||{});mode.contains.push(hljs.PHRASAL_WORDS_MODE);mode.contains.push({className:'doctag',begin:'(?:TODO|FIXME|NOTE|BUG|XXX):',relevance:0});return mode;};hljs.C_LINE_COMMENT_MODE=hljs.COMMENT('//','$');hljs.C_BLOCK_COMMENT_MODE=hljs.COMMENT('/\\*','\\*/');hljs.HASH_COMMENT_MODE=hljs.COMMENT('#','$');hljs.NUMBER_MODE={className:'number',begin:hljs.NUMBER_RE,relevance:0};hljs.C_NUMBER_MODE={className:'number',begin:hljs.C_NUMBER_RE,relevance:0};hljs.BINARY_NUMBER_MODE={className:'number',begin:hljs.BINARY_NUMBER_RE,relevance:0};hljs.CSS_NUMBER_MODE={className:'number',begin:hljs.NUMBER_RE+'('+'%|em|ex|ch|rem'+'|vw|vh|vmin|vmax'+'|cm|mm|in|pt|pc|px'+'|deg|grad|rad|turn'+'|s|ms'+'|Hz|kHz'+'|dpi|dpcm|dppx'+')?',relevance:0};hljs.REGEXP_MODE={className:'regexp',begin:/\//,end:/\/[gimuy]*/,illegal:/\n/,contains:[hljs.BACKSLASH_ESCAPE,{begin:/\[/,end:/\]/,relevance:0,contains:[hljs.BACKSLASH_ESCAPE]}]};hljs.TITLE_MODE={className:'title',begin:hljs.IDENT_RE,relevance:0};hljs.UNDERSCORE_TITLE_MODE={className:'title',begin:hljs.UNDERSCORE_IDENT_RE,relevance:0};hljs.METHOD_GUARD={// excludes method names from keyword processing
begin:'\\.\\s*'+hljs.UNDERSCORE_IDENT_RE,relevance:0};hljs.registerLanguage('1c',function(hljs){var IDENT_RE_RU='[a-zA-Zа-яА-Я][a-zA-Z0-9_а-яА-Я]*';var OneS_KEYWORDS='возврат дата для если и или иначе иначеесли исключение конецесли '+'конецпопытки конецпроцедуры конецфункции конеццикла константа не перейти перем '+'перечисление по пока попытка прервать продолжить процедура строка тогда фс функция цикл '+'число экспорт';var OneS_BUILT_IN='ansitooem oemtoansi ввестивидсубконто ввестидату ввестизначение '+'ввестиперечисление ввестипериод ввестиплансчетов ввестистроку ввестичисло вопрос '+'восстановитьзначение врег выбранныйплансчетов вызватьисключение датагод датамесяц '+'датачисло добавитьмесяц завершитьработусистемы заголовоксистемы записьжурналарегистрации '+'запуститьприложение зафиксироватьтранзакцию значениевстроку значениевстрокувнутр '+'значениевфайл значениеизстроки значениеизстрокивнутр значениеизфайла имякомпьютера '+'имяпользователя каталогвременныхфайлов каталогиб каталогпользователя каталогпрограммы '+'кодсимв командасистемы конгода конецпериодаби конецрассчитанногопериодаби '+'конецстандартногоинтервала конквартала конмесяца коннедели лев лог лог10 макс '+'максимальноеколичествосубконто мин монопольныйрежим названиеинтерфейса названиенабораправ '+'назначитьвид назначитьсчет найти найтипомеченныенаудаление найтиссылки началопериодаби '+'началостандартногоинтервала начатьтранзакцию начгода начквартала начмесяца начнедели '+'номерднягода номерднянедели номернеделигода нрег обработкаожидания окр описаниеошибки '+'основнойжурналрасчетов основнойплансчетов основнойязык открытьформу открытьформумодально '+'отменитьтранзакцию очиститьокносообщений периодстр полноеимяпользователя получитьвремята '+'получитьдатута получитьдокументта получитьзначенияотбора получитьпозициюта '+'получитьпустоезначение получитьта прав праводоступа предупреждение префиксавтонумерации '+'пустаястрока пустоезначение рабочаядаттьпустоезначение рабочаядата разделительстраниц '+'разделительстрок разм разобратьпозициюдокумента рассчитатьрегистрына '+'рассчитатьрегистрыпо сигнал симв символтабуляции создатьобъект сокрл сокрлп сокрп '+'сообщить состояние сохранитьзначение сред статусвозврата стрдлина стрзаменить '+'стрколичествострок стрполучитьстроку  стрчисловхождений сформироватьпозициюдокумента '+'счетпокоду текущаядата текущеевремя типзначения типзначениястр удалитьобъекты '+'установитьтана установитьтапо фиксшаблон формат цел шаблон';var DQUOTE={begin:'""'};var STR_START={className:'string',begin:'"',end:'"|$',contains:[DQUOTE]};var STR_CONT={className:'string',begin:'\\|',end:'"|$',contains:[DQUOTE]};return{case_insensitive:true,lexemes:IDENT_RE_RU,keywords:{keyword:OneS_KEYWORDS,built_in:OneS_BUILT_IN},contains:[hljs.C_LINE_COMMENT_MODE,hljs.NUMBER_MODE,STR_START,STR_CONT,{className:'function',begin:'(процедура|функция)',end:'$',lexemes:IDENT_RE_RU,keywords:'процедура функция',contains:[{begin:'экспорт',endsWithParent:true,lexemes:IDENT_RE_RU,keywords:'экспорт',contains:[hljs.C_LINE_COMMENT_MODE]},{className:'params',begin:'\\(',end:'\\)',lexemes:IDENT_RE_RU,keywords:'знач',contains:[STR_START,STR_CONT]},hljs.C_LINE_COMMENT_MODE,hljs.inherit(hljs.TITLE_MODE,{begin:IDENT_RE_RU})]},{className:'meta',begin:'#',end:'$'},{className:'number',begin:'\'\\d{2}\\.\\d{2}\\.(\\d{2}|\\d{4})\''// date
}]};});hljs.registerLanguage('abnf',function(hljs){var regexes={ruleDeclaration:"^[a-zA-Z][a-zA-Z0-9-]*",unexpectedChars:"[!@#$^&',?+~`|:]"};var keywords=["ALPHA","BIT","CHAR","CR","CRLF","CTL","DIGIT","DQUOTE","HEXDIG","HTAB","LF","LWSP","OCTET","SP","VCHAR","WSP"];var commentMode=hljs.COMMENT(";","$");var terminalBinaryMode={className:"symbol",begin:/%b[0-1]+(-[0-1]+|(\.[0-1]+)+){0,1}/};var terminalDecimalMode={className:"symbol",begin:/%d[0-9]+(-[0-9]+|(\.[0-9]+)+){0,1}/};var terminalHexadecimalMode={className:"symbol",begin:/%x[0-9A-F]+(-[0-9A-F]+|(\.[0-9A-F]+)+){0,1}/};var caseSensitivityIndicatorMode={className:"symbol",begin:/%[si]/};var ruleDeclarationMode={begin:regexes.ruleDeclaration+'\\s*=',returnBegin:true,end:/=/,relevance:0,contains:[{className:"attribute",begin:regexes.ruleDeclaration}]};return{illegal:regexes.unexpectedChars,keywords:keywords.join(" "),contains:[ruleDeclarationMode,commentMode,terminalBinaryMode,terminalDecimalMode,terminalHexadecimalMode,caseSensitivityIndicatorMode,hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE]};});hljs.registerLanguage('accesslog',function(hljs){return{contains:[// IP
{className:'number',begin:'\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b'},// Other numbers
{className:'number',begin:'\\b\\d+\\b',relevance:0},// Requests
{className:'string',begin:'"(GET|POST|HEAD|PUT|DELETE|CONNECT|OPTIONS|PATCH|TRACE)',end:'"',keywords:'GET POST HEAD PUT DELETE CONNECT OPTIONS PATCH TRACE',illegal:'\\n',relevance:10},// Dates
{className:'string',begin:/\[/,end:/\]/,illegal:'\\n'},// Strings
{className:'string',begin:'"',end:'"',illegal:'\\n'}]};});hljs.registerLanguage('actionscript',function(hljs){var IDENT_RE='[a-zA-Z_$][a-zA-Z0-9_$]*';var IDENT_FUNC_RETURN_TYPE_RE='([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)';var AS3_REST_ARG_MODE={className:'rest_arg',begin:'[.]{3}',end:IDENT_RE,relevance:10};return{aliases:['as'],keywords:{keyword:'as break case catch class const continue default delete do dynamic each '+'else extends final finally for function get if implements import in include '+'instanceof interface internal is namespace native new override package private '+'protected public return set static super switch this throw try typeof use var void '+'while with',literal:'true false null undefined'},contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.C_NUMBER_MODE,{className:'class',beginKeywords:'package',end:'{',contains:[hljs.TITLE_MODE]},{className:'class',beginKeywords:'class interface',end:'{',excludeEnd:true,contains:[{beginKeywords:'extends implements'},hljs.TITLE_MODE]},{className:'meta',beginKeywords:'import include',end:';',keywords:{'meta-keyword':'import include'}},{className:'function',beginKeywords:'function',end:'[{;]',excludeEnd:true,illegal:'\\S',contains:[hljs.TITLE_MODE,{className:'params',begin:'\\(',end:'\\)',contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,AS3_REST_ARG_MODE]},{begin:':\\s*'+IDENT_FUNC_RETURN_TYPE_RE}]},hljs.METHOD_GUARD],illegal:/#/};});hljs.registerLanguage('ada',// We try to support full Ada2012
//
// We highlight all appearances of types, keywords, literals (string, char, number, bool)
// and titles (user defined function/procedure/package)
// CSS classes are set accordingly
//
// Languages causing problems for language detection:
// xml (broken by Foo : Bar type), elm (broken by Foo : Bar type), vbscript-html (broken by body keyword)
// sql (ada default.txt has a lot of sql keywords)
function(hljs){// Regular expression for Ada numeric literals.
// stolen form the VHDL highlighter
// Decimal literal:
var INTEGER_RE='\\d(_|\\d)*';var EXPONENT_RE='[eE][-+]?'+INTEGER_RE;var DECIMAL_LITERAL_RE=INTEGER_RE+'(\\.'+INTEGER_RE+')?'+'('+EXPONENT_RE+')?';// Based literal:
var BASED_INTEGER_RE='\\w+';var BASED_LITERAL_RE=INTEGER_RE+'#'+BASED_INTEGER_RE+'(\\.'+BASED_INTEGER_RE+')?'+'#'+'('+EXPONENT_RE+')?';var NUMBER_RE='\\b('+BASED_LITERAL_RE+'|'+DECIMAL_LITERAL_RE+')';// Identifier regex
var ID_REGEX='[A-Za-z](_?[A-Za-z0-9.])*';// bad chars, only allowed in literals
var BAD_CHARS='[]{}%#\'\"';// Ada doesn't have block comments, only line comments
var COMMENTS=hljs.COMMENT('--','$');// variable declarations of the form
// Foo : Bar := Baz;
// where only Bar will be highlighted
var VAR_DECLS={// TODO: These spaces are not required by the Ada syntax
// however, I have yet to see handwritten Ada code where
// someone does not put spaces around :
begin:'\\s+:\\s+',end:'\\s*(:=|;|\\)|=>|$)',// endsWithParent: true,
// returnBegin: true,
illegal:BAD_CHARS,contains:[{// workaround to avoid highlighting
// named loops and declare blocks
beginKeywords:'loop for declare others',endsParent:true},{// properly highlight all modifiers
className:'keyword',beginKeywords:'not null constant access function procedure in out aliased exception'},{className:'type',begin:ID_REGEX,endsParent:true,relevance:0}]};return{case_insensitive:true,keywords:{keyword:'abort else new return abs elsif not reverse abstract end '+'accept entry select access exception of separate aliased exit or some '+'all others subtype and for out synchronized array function overriding '+'at tagged generic package task begin goto pragma terminate '+'body private then if procedure type case in protected constant interface '+'is raise use declare range delay limited record when delta loop rem while '+'digits renames with do mod requeue xor',literal:'True False'},contains:[COMMENTS,// strings "foobar"
{className:'string',begin:/"/,end:/"/,contains:[{begin:/""/,relevance:0}]},// characters ''
{// character literals always contain one char
className:'string',begin:/'.'/},{// number literals
className:'number',begin:NUMBER_RE,relevance:0},{// Attributes
className:'symbol',begin:"'"+ID_REGEX},{// package definition, maybe inside generic
className:'title',begin:'(\\bwith\\s+)?(\\bprivate\\s+)?\\bpackage\\s+(\\bbody\\s+)?',end:'(is|$)',keywords:'package body',excludeBegin:true,excludeEnd:true,illegal:BAD_CHARS},{// function/procedure declaration/definition
// maybe inside generic
begin:'(\\b(with|overriding)\\s+)?\\b(function|procedure)\\s+',end:'(\\bis|\\bwith|\\brenames|\\)\\s*;)',keywords:'overriding function procedure with is renames return',// we need to re-match the 'function' keyword, so that
// the title mode below matches only exactly once
returnBegin:true,contains:[COMMENTS,{// name of the function/procedure
className:'title',begin:'(\\bwith\\s+)?\\b(function|procedure)\\s+',end:'(\\(|\\s+|$)',excludeBegin:true,excludeEnd:true,illegal:BAD_CHARS},// 'self'
// // parameter types
VAR_DECLS,{// return type
className:'type',begin:'\\breturn\\s+',end:'(\\s+|;|$)',keywords:'return',excludeBegin:true,excludeEnd:true,// we are done with functions
endsParent:true,illegal:BAD_CHARS}]},{// new type declarations
// maybe inside generic
className:'type',begin:'\\b(sub)?type\\s+',end:'\\s+',keywords:'type',excludeBegin:true,illegal:BAD_CHARS},// see comment above the definition
VAR_DECLS]};});hljs.registerLanguage('apache',function(hljs){var NUMBER={className:'number',begin:'[\\$%]\\d+'};return{aliases:['apacheconf'],case_insensitive:true,contains:[hljs.HASH_COMMENT_MODE,{className:'section',begin:'</?',end:'>'},{className:'attribute',begin:/\w+/,relevance:0,// keywords aren’t needed for highlighting per se, they only boost relevance
// for a very generally defined mode (starts with a word, ends with line-end
keywords:{nomarkup:'order deny allow setenv rewriterule rewriteengine rewritecond documentroot '+'sethandler errordocument loadmodule options header listen serverroot '+'servername'},starts:{end:/$/,relevance:0,keywords:{literal:'on off all'},contains:[{className:'meta',begin:'\\s\\[',end:'\\]$'},{className:'variable',begin:'[\\$%]\\{',end:'\\}',contains:['self',NUMBER]},NUMBER,hljs.QUOTE_STRING_MODE]}}],illegal:/\S/};});hljs.registerLanguage('applescript',function(hljs){var STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:''});var PARAMS={className:'params',begin:'\\(',end:'\\)',contains:['self',hljs.C_NUMBER_MODE,STRING]};var COMMENT_MODE_1=hljs.COMMENT('--','$');var COMMENT_MODE_2=hljs.COMMENT('\\(\\*','\\*\\)',{contains:['self',COMMENT_MODE_1]//allow nesting
});var COMMENTS=[COMMENT_MODE_1,COMMENT_MODE_2,hljs.HASH_COMMENT_MODE];return{aliases:['osascript'],keywords:{keyword:'about above after against and around as at back before beginning '+'behind below beneath beside between but by considering '+'contain contains continue copy div does eighth else end equal '+'equals error every exit fifth first for fourth from front '+'get given global if ignoring in into is it its last local me '+'middle mod my ninth not of on onto or over prop property put ref '+'reference repeat returning script second set seventh since '+'sixth some tell tenth that the|0 then third through thru '+'timeout times to transaction try until where while whose with '+'without',literal:'AppleScript false linefeed return pi quote result space tab true',built_in:'alias application boolean class constant date file integer list '+'number real record string text '+'activate beep count delay launch log offset read round '+'run say summarize write '+'character characters contents day frontmost id item length '+'month name paragraph paragraphs rest reverse running time version '+'weekday word words year'},contains:[STRING,hljs.C_NUMBER_MODE,{className:'built_in',begin:'\\b(clipboard info|the clipboard|info for|list (disks|folder)|'+'mount volume|path to|(close|open for) access|(get|set) eof|'+'current date|do shell script|get volume settings|random number|'+'set volume|system attribute|system info|time to GMT|'+'(load|run|store) script|scripting components|'+'ASCII (character|number)|localized string|'+'choose (application|color|file|file name|'+'folder|from list|remote application|URL)|'+'display (alert|dialog))\\b|^\\s*return\\b'},{className:'literal',begin:'\\b(text item delimiters|current application|missing value)\\b'},{className:'keyword',begin:'\\b(apart from|aside from|instead of|out of|greater than|'+"isn't|(doesn't|does not) (equal|come before|come after|contain)|"+'(greater|less) than( or equal)?|(starts?|ends|begins?) with|'+'contained by|comes (before|after)|a (ref|reference)|POSIX file|'+'POSIX path|(date|time) string|quoted form)\\b'},{beginKeywords:'on',illegal:'[${=;\\n]',contains:[hljs.UNDERSCORE_TITLE_MODE,PARAMS]}].concat(COMMENTS),illegal:'//|->|=>|\\[\\['};});hljs.registerLanguage('cpp',function(hljs){var CPP_PRIMITIVE_TYPES={className:'keyword',begin:'\\b[a-z\\d_]*_t\\b'};var STRINGS={className:'string',variants:[{begin:'(u8?|U)?L?"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'(u8?|U)?R"',end:'"',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'\'\\\\?.',end:'\'',illegal:'.'}]};var NUMBERS={className:'number',variants:[{begin:'\\b(0b[01\']+)'},{begin:'\\b([\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)(u|U|l|L|ul|UL|f|F|b|B)'},{begin:'(-?)(\\b0[xX][a-fA-F0-9\']+|(\\b[\\d\']+(\\.[\\d\']*)?|\\.[\\d\']+)([eE][-+]?[\\d\']+)?)'}],relevance:0};var PREPROCESSOR={className:'meta',begin:/#\s*[a-z]+\b/,end:/$/,keywords:{'meta-keyword':'if else elif endif define undef warning error line '+'pragma ifdef ifndef include'},contains:[{begin:/\\\n/,relevance:0},hljs.inherit(STRINGS,{className:'meta-string'}),{className:'meta-string',begin:/<[^\n>]*>/,end:/$/,illegal:'\\n'},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};var FUNCTION_TITLE=hljs.IDENT_RE+'\\s*\\(';var CPP_KEYWORDS={keyword:'int float while private char catch import module export virtual operator sizeof '+'dynamic_cast|10 typedef const_cast|10 const struct for static_cast|10 union namespace '+'unsigned long volatile static protected bool template mutable if public friend '+'do goto auto void enum else break extern using class asm case typeid '+'short reinterpret_cast|10 default double register explicit signed typename try this '+'switch continue inline delete alignof constexpr decltype '+'noexcept static_assert thread_local restrict _Bool complex _Complex _Imaginary '+'atomic_bool atomic_char atomic_schar '+'atomic_uchar atomic_short atomic_ushort atomic_int atomic_uint atomic_long atomic_ulong atomic_llong '+'atomic_ullong new throw return',built_in:'std string cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream '+'auto_ptr deque list queue stack vector map set bitset multiset multimap unordered_set '+'unordered_map unordered_multiset unordered_multimap array shared_ptr abort abs acos '+'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp '+'fscanf isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper '+'isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow '+'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp '+'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan '+'vfprintf vprintf vsprintf endl initializer_list unique_ptr',literal:'true false nullptr NULL'};var EXPRESSION_CONTAINS=[CPP_PRIMITIVE_TYPES,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,NUMBERS,STRINGS];return{aliases:['c','cc','h','c++','h++','hpp'],keywords:CPP_KEYWORDS,illegal:'</',contains:EXPRESSION_CONTAINS.concat([PREPROCESSOR,{begin:'\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*<',end:'>',keywords:CPP_KEYWORDS,contains:['self',CPP_PRIMITIVE_TYPES]},{begin:hljs.IDENT_RE+'::',keywords:CPP_KEYWORDS},{// This mode covers expression context where we can't expect a function
// definition and shouldn't highlight anything that looks like one:
// `return some()`, `else if()`, `(x*sum(1, 2))`
variants:[{begin:/=/,end:/;/},{begin:/\(/,end:/\)/},{beginKeywords:'new throw return else',end:/;/}],keywords:CPP_KEYWORDS,contains:EXPRESSION_CONTAINS.concat([{begin:/\(/,end:/\)/,keywords:CPP_KEYWORDS,contains:EXPRESSION_CONTAINS.concat(['self']),relevance:0}]),relevance:0},{className:'function',begin:'('+hljs.IDENT_RE+'[\\*&\\s]+)+'+FUNCTION_TITLE,returnBegin:true,end:/[{;=]/,excludeEnd:true,keywords:CPP_KEYWORDS,illegal:/[^\w\s\*&]/,contains:[{begin:FUNCTION_TITLE,returnBegin:true,contains:[hljs.TITLE_MODE],relevance:0},{className:'params',begin:/\(/,end:/\)/,keywords:CPP_KEYWORDS,relevance:0,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,STRINGS,NUMBERS,CPP_PRIMITIVE_TYPES]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,PREPROCESSOR]}]),exports:{preprocessor:PREPROCESSOR,strings:STRINGS,keywords:CPP_KEYWORDS}};});hljs.registerLanguage('arduino',function(hljs){var CPP=hljs.getLanguage('cpp').exports;return{keywords:{keyword:'boolean byte word string String array '+CPP.keywords.keyword,built_in:'setup loop while catch for if do goto try switch case else '+'default break continue return '+'KeyboardController MouseController SoftwareSerial '+'EthernetServer EthernetClient LiquidCrystal '+'RobotControl GSMVoiceCall EthernetUDP EsploraTFT '+'HttpClient RobotMotor WiFiClient GSMScanner '+'FileSystem Scheduler GSMServer YunClient YunServer '+'IPAddress GSMClient GSMModem Keyboard Ethernet '+'Console GSMBand Esplora Stepper Process '+'WiFiUDP GSM_SMS Mailbox USBHost Firmata PImage '+'Client Server GSMPIN FileIO Bridge Serial '+'EEPROM Stream Mouse Audio Servo File Task '+'GPRS WiFi Wire TFT GSM SPI SD '+'runShellCommandAsynchronously analogWriteResolution '+'retrieveCallingNumber printFirmwareVersion '+'analogReadResolution sendDigitalPortPair '+'noListenOnLocalhost readJoystickButton setFirmwareVersion '+'readJoystickSwitch scrollDisplayRight getVoiceCallStatus '+'scrollDisplayLeft writeMicroseconds delayMicroseconds '+'beginTransmission getSignalStrength runAsynchronously '+'getAsynchronously listenOnLocalhost getCurrentCarrier '+'readAccelerometer messageAvailable sendDigitalPorts '+'lineFollowConfig countryNameWrite runShellCommand '+'readStringUntil rewindDirectory readTemperature '+'setClockDivider readLightSensor endTransmission '+'analogReference detachInterrupt countryNameRead '+'attachInterrupt encryptionType readBytesUntil '+'robotNameWrite readMicrophone robotNameRead cityNameWrite '+'userNameWrite readJoystickY readJoystickX mouseReleased '+'openNextFile scanNetworks noInterrupts digitalWrite '+'beginSpeaker mousePressed isActionDone mouseDragged '+'displayLogos noAutoscroll addParameter remoteNumber '+'getModifiers keyboardRead userNameRead waitContinue '+'processInput parseCommand printVersion readNetworks '+'writeMessage blinkVersion cityNameRead readMessage '+'setDataMode parsePacket isListening setBitOrder '+'beginPacket isDirectory motorsWrite drawCompass '+'digitalRead clearScreen serialEvent rightToLeft '+'setTextSize leftToRight requestFrom keyReleased '+'compassRead analogWrite interrupts WiFiServer '+'disconnect playMelody parseFloat autoscroll '+'getPINUsed setPINUsed setTimeout sendAnalog '+'readSlider analogRead beginWrite createChar '+'motorsStop keyPressed tempoWrite readButton '+'subnetMask debugPrint macAddress writeGreen '+'randomSeed attachGPRS readString sendString '+'remotePort releaseAll mouseMoved background '+'getXChange getYChange answerCall getResult '+'voiceCall endPacket constrain getSocket writeJSON '+'getButton available connected findUntil readBytes '+'exitValue readGreen writeBlue startLoop IPAddress '+'isPressed sendSysex pauseMode gatewayIP setCursor '+'getOemKey tuneWrite noDisplay loadImage switchPIN '+'onRequest onReceive changePIN playFile noBuffer '+'parseInt overflow checkPIN knobRead beginTFT '+'bitClear updateIR bitWrite position writeRGB '+'highByte writeRed setSpeed readBlue noStroke '+'remoteIP transfer shutdown hangCall beginSMS '+'endWrite attached maintain noCursor checkReg '+'checkPUK shiftOut isValid shiftIn pulseIn '+'connect println localIP pinMode getIMEI '+'display noBlink process getBand running beginSD '+'drawBMP lowByte setBand release bitRead prepare '+'pointTo readRed setMode noFill remove listen '+'stroke detach attach noTone exists buffer '+'height bitSet circle config cursor random '+'IRread setDNS endSMS getKey micros '+'millis begin print write ready flush width '+'isPIN blink clear press mkdir rmdir close '+'point yield image BSSID click delay '+'read text move peek beep rect line open '+'seek fill size turn stop home find '+'step tone sqrt RSSI SSID '+'end bit tan cos sin pow map abs max '+'min get run put',literal:'DIGITAL_MESSAGE FIRMATA_STRING ANALOG_MESSAGE '+'REPORT_DIGITAL REPORT_ANALOG INPUT_PULLUP '+'SET_PIN_MODE INTERNAL2V56 SYSTEM_RESET LED_BUILTIN '+'INTERNAL1V1 SYSEX_START INTERNAL EXTERNAL '+'DEFAULT OUTPUT INPUT HIGH LOW'},contains:[CPP.preprocessor,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE]};});hljs.registerLanguage('armasm',function(hljs){//local labels: %?[FB]?[AT]?\d{1,2}\w+
return{case_insensitive:true,aliases:['arm'],lexemes:'\\.?'+hljs.IDENT_RE,keywords:{meta://GNU preprocs
'.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .arm .thumb .code16 .code32 .force_thumb .thumb_func .ltorg '+//ARM directives
'ALIAS ALIGN ARM AREA ASSERT ATTR CN CODE CODE16 CODE32 COMMON CP DATA DCB DCD DCDU DCDO DCFD DCFDU DCI DCQ DCQU DCW DCWU DN ELIF ELSE END ENDFUNC ENDIF ENDP ENTRY EQU EXPORT EXPORTAS EXTERN FIELD FILL FUNCTION GBLA GBLL GBLS GET GLOBAL IF IMPORT INCBIN INCLUDE INFO KEEP LCLA LCLL LCLS LTORG MACRO MAP MEND MEXIT NOFP OPT PRESERVE8 PROC QN READONLY RELOC REQUIRE REQUIRE8 RLIST FN ROUT SETA SETL SETS SN SPACE SUBT THUMB THUMBX TTL WHILE WEND ',built_in:'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 '+//standard registers
'pc lr sp ip sl sb fp '+//typical regs plus backward compatibility
'a1 a2 a3 a4 v1 v2 v3 v4 v5 v6 v7 v8 f0 f1 f2 f3 f4 f5 f6 f7 '+//more regs and fp
'p0 p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 '+//coprocessor regs
'c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13 c14 c15 '+//more coproc
'q0 q1 q2 q3 q4 q5 q6 q7 q8 q9 q10 q11 q12 q13 q14 q15 '+//advanced SIMD NEON regs
//program status registers
'cpsr_c cpsr_x cpsr_s cpsr_f cpsr_cx cpsr_cxs cpsr_xs cpsr_xsf cpsr_sf cpsr_cxsf '+'spsr_c spsr_x spsr_s spsr_f spsr_cx spsr_cxs spsr_xs spsr_xsf spsr_sf spsr_cxsf '+//NEON and VFP registers
's0 s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15 '+'s16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s29 s30 s31 '+'d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14 d15 '+'d16 d17 d18 d19 d20 d21 d22 d23 d24 d25 d26 d27 d28 d29 d30 d31 '+'{PC} {VAR} {TRUE} {FALSE} {OPT} {CONFIG} {ENDIAN} {CODESIZE} {CPU} {FPU} {ARCHITECTURE} {PCSTOREOFFSET} {ARMASM_VERSION} {INTER} {ROPI} {RWPI} {SWST} {NOSWST} . @'},contains:[{className:'keyword',begin:'\\b('+//mnemonics
'adc|'+'(qd?|sh?|u[qh]?)?add(8|16)?|usada?8|(q|sh?|u[qh]?)?(as|sa)x|'+'and|adrl?|sbc|rs[bc]|asr|b[lx]?|blx|bxj|cbn?z|tb[bh]|bic|'+'bfc|bfi|[su]bfx|bkpt|cdp2?|clz|clrex|cmp|cmn|cpsi[ed]|cps|'+'setend|dbg|dmb|dsb|eor|isb|it[te]{0,3}|lsl|lsr|ror|rrx|'+'ldm(([id][ab])|f[ds])?|ldr((s|ex)?[bhd])?|movt?|mvn|mra|mar|'+'mul|[us]mull|smul[bwt][bt]|smu[as]d|smmul|smmla|'+'mla|umlaal|smlal?([wbt][bt]|d)|mls|smlsl?[ds]|smc|svc|sev|'+'mia([bt]{2}|ph)?|mrr?c2?|mcrr2?|mrs|msr|orr|orn|pkh(tb|bt)|rbit|'+'rev(16|sh)?|sel|[su]sat(16)?|nop|pop|push|rfe([id][ab])?|'+'stm([id][ab])?|str(ex)?[bhd]?|(qd?)?sub|(sh?|q|u[qh]?)?sub(8|16)|'+'[su]xt(a?h|a?b(16)?)|srs([id][ab])?|swpb?|swi|smi|tst|teq|'+'wfe|wfi|yield'+')'+'(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le|al|hs|lo)?'+//condition codes
'[sptrx]?',//legal postfixes
end:'\\s'},hljs.COMMENT('[;@]','$',{relevance:0}),hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,{className:'string',begin:'\'',end:'[^\\\\]\'',relevance:0},{className:'title',begin:'\\|',end:'\\|',illegal:'\\n',relevance:0},{className:'number',variants:[{begin:'[#$=]?0x[0-9a-f]+'},//hex
{begin:'[#$=]?0b[01]+'},//bin
{begin:'[#$=]\\d+'},//literal
{begin:'\\b\\d+'//bare number
}],relevance:0},{className:'symbol',variants:[{begin:'^[a-z_\\.\\$][a-z0-9_\\.\\$]+'},//ARM syntax
{begin:'^\\s*[a-z_\\.\\$][a-z0-9_\\.\\$]+:'},//GNU ARM syntax
{begin:'[=#]\\w+'//label reference
}],relevance:0}]};});hljs.registerLanguage('xml',function(hljs){var XML_IDENT_RE='[A-Za-z0-9\\._:-]+';var TAG_INTERNALS={endsWithParent:true,illegal:/</,relevance:0,contains:[{className:'attr',begin:XML_IDENT_RE,relevance:0},{begin:/=\s*/,relevance:0,contains:[{className:'string',endsParent:true,variants:[{begin:/"/,end:/"/},{begin:/'/,end:/'/},{begin:/[^\s"'=<>`]+/}]}]}]};return{aliases:['html','xhtml','rss','atom','xjb','xsd','xsl','plist'],case_insensitive:true,contains:[{className:'meta',begin:'<!DOCTYPE',end:'>',relevance:10,contains:[{begin:'\\[',end:'\\]'}]},hljs.COMMENT('<!--','-->',{relevance:10}),{begin:'<\\!\\[CDATA\\[',end:'\\]\\]>',relevance:10},{begin:/<\?(php)?/,end:/\?>/,subLanguage:'php',contains:[{begin:'/\\*',end:'\\*/',skip:true}]},{className:'tag',/*
        The lookahead pattern (?=...) ensures that 'begin' only matches
        '<style' as a single word, followed by a whitespace or an
        ending braket. The '$' is needed for the lexeme to be recognized
        by hljs.subMode() that tests lexemes outside the stream.
        */begin:'<style(?=\\s|>|$)',end:'>',keywords:{name:'style'},contains:[TAG_INTERNALS],starts:{end:'</style>',returnEnd:true,subLanguage:['css','xml']}},{className:'tag',// See the comment in the <style tag about the lookahead pattern
begin:'<script(?=\\s|>|$)',end:'>',keywords:{name:'script'},contains:[TAG_INTERNALS],starts:{end:'\<\/script\>',returnEnd:true,subLanguage:['actionscript','javascript','handlebars','xml']}},{className:'meta',variants:[{begin:/<\?xml/,end:/\?>/,relevance:10},{begin:/<\?\w+/,end:/\?>/}]},{className:'tag',begin:'</?',end:'/?>',contains:[{className:'name',begin:/[^\/><\s]+/,relevance:0},TAG_INTERNALS]}]};});hljs.registerLanguage('asciidoc',function(hljs){return{aliases:['adoc'],contains:[// block comment
hljs.COMMENT('^/{4,}\\n','\\n/{4,}$',// can also be done as...
//'^/{4,}$',
//'^/{4,}$',
{relevance:10}),// line comment
hljs.COMMENT('^//','$',{relevance:0}),// title
{className:'title',begin:'^\\.\\w.*$'},// example, admonition & sidebar blocks
{begin:'^[=\\*]{4,}\\n',end:'\\n^[=\\*]{4,}$',relevance:10},// headings
{className:'section',relevance:10,variants:[{begin:'^(={1,5}) .+?( \\1)?$'},{begin:'^[^\\[\\]\\n]+?\\n[=\\-~\\^\\+]{2,}$'}]},// document attributes
{className:'meta',begin:'^:.+?:',end:'\\s',excludeEnd:true,relevance:10},// block attributes
{className:'meta',begin:'^\\[.+?\\]$',relevance:0},// quoteblocks
{className:'quote',begin:'^_{4,}\\n',end:'\\n_{4,}$',relevance:10},// listing and literal blocks
{className:'code',begin:'^[\\-\\.]{4,}\\n',end:'\\n[\\-\\.]{4,}$',relevance:10},// passthrough blocks
{begin:'^\\+{4,}\\n',end:'\\n\\+{4,}$',contains:[{begin:'<',end:'>',subLanguage:'xml',relevance:0}],relevance:10},// lists (can only capture indicators)
{className:'bullet',begin:'^(\\*+|\\-+|\\.+|[^\\n]+?::)\\s+'},// admonition
{className:'symbol',begin:'^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\\s+',relevance:10},// inline strong
{className:'strong',// must not follow a word character or be followed by an asterisk or space
begin:'\\B\\*(?![\\*\\s])',end:'(\\n{2}|\\*)',// allow escaped asterisk followed by word char
contains:[{begin:'\\\\*\\w',relevance:0}]},// inline emphasis
{className:'emphasis',// must not follow a word character or be followed by a single quote or space
begin:'\\B\'(?![\'\\s])',end:'(\\n{2}|\')',// allow escaped single quote followed by word char
contains:[{begin:'\\\\\'\\w',relevance:0}],relevance:0},// inline emphasis (alt)
{className:'emphasis',// must not follow a word character or be followed by an underline or space
begin:'_(?![_\\s])',end:'(\\n{2}|_)',relevance:0},// inline smart quotes
{className:'string',variants:[{begin:"``.+?''"},{begin:"`.+?'"}]},// inline code snippets (TODO should get same treatment as strong and emphasis)
{className:'code',begin:'(`.+?`|\\+.+?\\+)',relevance:0},// indented literal block
{className:'code',begin:'^[ \\t]',end:'$',relevance:0},// horizontal rules
{begin:'^\'{3,}[ \\t]*$',relevance:10},// images and links
{begin:'(link:)?(http|https|ftp|file|irc|image:?):\\S+\\[.*?\\]',returnBegin:true,contains:[{begin:'(link|image:?):',relevance:0},{className:'link',begin:'\\w',end:'[^\\[]+',relevance:0},{className:'string',begin:'\\[',end:'\\]',excludeBegin:true,excludeEnd:true,relevance:0}],relevance:10}]};});hljs.registerLanguage('aspectj',function(hljs){var KEYWORDS='false synchronized int abstract float private char boolean static null if const '+'for true while long throw strictfp finally protected import native final return void '+'enum else extends implements break transient new catch instanceof byte super volatile case '+'assert short package default double public try this switch continue throws privileged '+'aspectOf adviceexecution proceed cflowbelow cflow initialization preinitialization '+'staticinitialization withincode target within execution getWithinTypeName handler '+'thisJoinPoint thisJoinPointStaticPart thisEnclosingJoinPointStaticPart declare parents '+'warning error soft precedence thisAspectInstance';var SHORTKEYS='get set args call';return{keywords:KEYWORDS,illegal:/<\/|#/,contains:[hljs.COMMENT('/\\*\\*','\\*/',{relevance:0,contains:[{// eat up @'s in emails to prevent them to be recognized as doctags
begin:/\w+@/,relevance:0},{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{className:'class',beginKeywords:'aspect',end:/[{;=]/,excludeEnd:true,illegal:/[:;"\[\]]/,contains:[{beginKeywords:'extends implements pertypewithin perthis pertarget percflowbelow percflow issingleton'},hljs.UNDERSCORE_TITLE_MODE,{begin:/\([^\)]*/,end:/[)]+/,keywords:KEYWORDS+' '+SHORTKEYS,excludeEnd:false}]},{className:'class',beginKeywords:'class interface',end:/[{;=]/,excludeEnd:true,relevance:0,keywords:'class interface',illegal:/[:"\[\]]/,contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},{// AspectJ Constructs
beginKeywords:'pointcut after before around throwing returning',end:/[)]/,excludeEnd:false,illegal:/["\[\]]/,contains:[{begin:hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',returnBegin:true,contains:[hljs.UNDERSCORE_TITLE_MODE]}]},{begin:/[:]/,returnBegin:true,end:/[{;]/,relevance:0,excludeEnd:false,keywords:KEYWORDS,illegal:/["\[\]]/,contains:[{begin:hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',keywords:KEYWORDS+' '+SHORTKEYS},hljs.QUOTE_STRING_MODE]},{// this prevents 'new Name(...), or throw ...' from being recognized as a function definition
beginKeywords:'new throw',relevance:0},{// the function class is a bit different for AspectJ compared to the Java language
className:'function',begin:/\w+ +\w+(\.)?\w+\s*\([^\)]*\)\s*((throws)[\w\s,]+)?[\{;]/,returnBegin:true,end:/[{;=]/,keywords:KEYWORDS,excludeEnd:true,contains:[{begin:hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',returnBegin:true,relevance:0,contains:[hljs.UNDERSCORE_TITLE_MODE]},{className:'params',begin:/\(/,end:/\)/,relevance:0,keywords:KEYWORDS,contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},hljs.C_NUMBER_MODE,{// annotation is also used in this language
className:'meta',begin:'@[A-Za-z]+'}]};});hljs.registerLanguage('autohotkey',function(hljs){var BACKTICK_ESCAPE={begin:/`[\s\S]/};return{case_insensitive:true,keywords:{keyword:'Break Continue Else Gosub If Loop Return While',literal:'A|0 true false NOT AND OR',built_in:'ComSpec Clipboard ClipboardAll ErrorLevel'},contains:[{className:'built_in',begin:'A_[a-zA-Z0-9]+'},BACKTICK_ESCAPE,hljs.inherit(hljs.QUOTE_STRING_MODE,{contains:[BACKTICK_ESCAPE]}),hljs.COMMENT(';','$',{relevance:0}),{className:'number',begin:hljs.NUMBER_RE,relevance:0},{className:'variable',// FIXME
begin:'%',end:'%',illegal:'\\n',contains:[BACKTICK_ESCAPE]},{className:'symbol',contains:[BACKTICK_ESCAPE],variants:[{begin:'^[^\\n";]+::(?!=)'},{begin:'^[^\\n";]+:(?!=)',relevance:0// zero relevance as it catches a lot of things
// followed by a single ':' in many languages
}]},{// consecutive commas, not for highlighting but just for relevance
begin:',\\s*,'}]};});hljs.registerLanguage('autoit',function(hljs){var KEYWORDS='ByRef Case Const ContinueCase ContinueLoop '+'Default Dim Do Else ElseIf EndFunc EndIf EndSelect '+'EndSwitch EndWith Enum Exit ExitLoop For Func '+'Global If In Local Next ReDim Return Select Static '+'Step Switch Then To Until Volatile WEnd While With',LITERAL='True False And Null Not Or',BUILT_IN='Abs ACos AdlibRegister AdlibUnRegister Asc AscW ASin Assign ATan AutoItSetOption AutoItWinGetTitle AutoItWinSetTitle Beep Binary BinaryLen BinaryMid BinaryToString BitAND BitNOT BitOR BitRotate BitShift BitXOR BlockInput Break Call CDTray Ceiling Chr ChrW ClipGet ClipPut ConsoleRead ConsoleWrite ConsoleWriteError ControlClick ControlCommand ControlDisable ControlEnable ControlFocus ControlGetFocus ControlGetHandle ControlGetPos ControlGetText ControlHide ControlListView ControlMove ControlSend ControlSetText ControlShow ControlTreeView Cos Dec DirCopy DirCreate DirGetSize DirMove DirRemove DllCall DllCallAddress DllCallbackFree DllCallbackGetPtr DllCallbackRegister DllClose DllOpen DllStructCreate DllStructGetData DllStructGetPtr DllStructGetSize DllStructSetData DriveGetDrive DriveGetFileSystem DriveGetLabel DriveGetSerial DriveGetType DriveMapAdd DriveMapDel DriveMapGet DriveSetLabel DriveSpaceFree DriveSpaceTotal DriveStatus EnvGet EnvSet EnvUpdate Eval Execute Exp FileChangeDir FileClose FileCopy FileCreateNTFSLink FileCreateShortcut FileDelete FileExists FileFindFirstFile FileFindNextFile FileFlush FileGetAttrib FileGetEncoding FileGetLongName FileGetPos FileGetShortcut FileGetShortName FileGetSize FileGetTime FileGetVersion FileInstall FileMove FileOpen FileOpenDialog FileRead FileReadLine FileReadToArray FileRecycle FileRecycleEmpty FileSaveDialog FileSelectFolder FileSetAttrib FileSetEnd FileSetPos FileSetTime FileWrite FileWriteLine Floor FtpSetProxy FuncName GUICreate GUICtrlCreateAvi GUICtrlCreateButton GUICtrlCreateCheckbox GUICtrlCreateCombo GUICtrlCreateContextMenu GUICtrlCreateDate GUICtrlCreateDummy GUICtrlCreateEdit GUICtrlCreateGraphic GUICtrlCreateGroup GUICtrlCreateIcon GUICtrlCreateInput GUICtrlCreateLabel GUICtrlCreateList GUICtrlCreateListView GUICtrlCreateListViewItem GUICtrlCreateMenu GUICtrlCreateMenuItem GUICtrlCreateMonthCal GUICtrlCreateObj GUICtrlCreatePic GUICtrlCreateProgress GUICtrlCreateRadio GUICtrlCreateSlider GUICtrlCreateTab GUICtrlCreateTabItem GUICtrlCreateTreeView GUICtrlCreateTreeViewItem GUICtrlCreateUpdown GUICtrlDelete GUICtrlGetHandle GUICtrlGetState GUICtrlRead GUICtrlRecvMsg GUICtrlRegisterListViewSort GUICtrlSendMsg GUICtrlSendToDummy GUICtrlSetBkColor GUICtrlSetColor GUICtrlSetCursor GUICtrlSetData GUICtrlSetDefBkColor GUICtrlSetDefColor GUICtrlSetFont GUICtrlSetGraphic GUICtrlSetImage GUICtrlSetLimit GUICtrlSetOnEvent GUICtrlSetPos GUICtrlSetResizing GUICtrlSetState GUICtrlSetStyle GUICtrlSetTip GUIDelete GUIGetCursorInfo GUIGetMsg GUIGetStyle GUIRegisterMsg GUISetAccelerators GUISetBkColor GUISetCoord GUISetCursor GUISetFont GUISetHelp GUISetIcon GUISetOnEvent GUISetState GUISetStyle GUIStartGroup GUISwitch Hex HotKeySet HttpSetProxy HttpSetUserAgent HWnd InetClose InetGet InetGetInfo InetGetSize InetRead IniDelete IniRead IniReadSection IniReadSectionNames IniRenameSection IniWrite IniWriteSection InputBox Int IsAdmin IsArray IsBinary IsBool IsDeclared IsDllStruct IsFloat IsFunc IsHWnd IsInt IsKeyword IsNumber IsObj IsPtr IsString Log MemGetStats Mod MouseClick MouseClickDrag MouseDown MouseGetCursor MouseGetPos MouseMove MouseUp MouseWheel MsgBox Number ObjCreate ObjCreateInterface ObjEvent ObjGet ObjName OnAutoItExitRegister OnAutoItExitUnRegister Ping PixelChecksum PixelGetColor PixelSearch ProcessClose ProcessExists ProcessGetStats ProcessList ProcessSetPriority ProcessWait ProcessWaitClose ProgressOff ProgressOn ProgressSet Ptr Random RegDelete RegEnumKey RegEnumVal RegRead RegWrite Round Run RunAs RunAsWait RunWait Send SendKeepActive SetError SetExtended ShellExecute ShellExecuteWait Shutdown Sin Sleep SoundPlay SoundSetWaveVolume SplashImageOn SplashOff SplashTextOn Sqrt SRandom StatusbarGetText StderrRead StdinWrite StdioClose StdoutRead String StringAddCR StringCompare StringFormat StringFromASCIIArray StringInStr StringIsAlNum StringIsAlpha StringIsASCII StringIsDigit StringIsFloat StringIsInt StringIsLower StringIsSpace StringIsUpper StringIsXDigit StringLeft StringLen StringLower StringMid StringRegExp StringRegExpReplace StringReplace StringReverse StringRight StringSplit StringStripCR StringStripWS StringToASCIIArray StringToBinary StringTrimLeft StringTrimRight StringUpper Tan TCPAccept TCPCloseSocket TCPConnect TCPListen TCPNameToIP TCPRecv TCPSend TCPShutdown, UDPShutdown TCPStartup, UDPStartup TimerDiff TimerInit ToolTip TrayCreateItem TrayCreateMenu TrayGetMsg TrayItemDelete TrayItemGetHandle TrayItemGetState TrayItemGetText TrayItemSetOnEvent TrayItemSetState TrayItemSetText TraySetClick TraySetIcon TraySetOnEvent TraySetPauseIcon TraySetState TraySetToolTip TrayTip UBound UDPBind UDPCloseSocket UDPOpen UDPRecv UDPSend VarGetType WinActivate WinActive WinClose WinExists WinFlash WinGetCaretPos WinGetClassList WinGetClientSize WinGetHandle WinGetPos WinGetProcess WinGetState WinGetText WinGetTitle WinKill WinList WinMenuSelectItem WinMinimizeAll WinMinimizeAllUndo WinMove WinSetOnTop WinSetState WinSetTitle WinSetTrans WinWait',COMMENT={variants:[hljs.COMMENT(';','$',{relevance:0}),hljs.COMMENT('#cs','#ce'),hljs.COMMENT('#comments-start','#comments-end')]},VARIABLE={begin:'\\$[A-z0-9_]+'},STRING={className:'string',variants:[{begin:/"/,end:/"/,contains:[{begin:/""/,relevance:0}]},{begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]}]},NUMBER={variants:[hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE]},PREPROCESSOR={className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'comments include include-once NoTrayIcon OnAutoItStartRegister pragma compile RequireAdmin'},contains:[{begin:/\\\n/,relevance:0},{beginKeywords:'include',keywords:{'meta-keyword':'include'},end:'$',contains:[STRING,{className:'meta-string',variants:[{begin:'<',end:'>'},{begin:/"/,end:/"/,contains:[{begin:/""/,relevance:0}]},{begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]}]}]},STRING,COMMENT]},CONSTANT={className:'symbol',// begin: '@',
// end: '$',
// keywords: 'AppDataCommonDir AppDataDir AutoItExe AutoItPID AutoItVersion AutoItX64 COM_EventObj CommonFilesDir Compiled ComputerName ComSpec CPUArch CR CRLF DesktopCommonDir DesktopDepth DesktopDir DesktopHeight DesktopRefresh DesktopWidth DocumentsCommonDir error exitCode exitMethod extended FavoritesCommonDir FavoritesDir GUI_CtrlHandle GUI_CtrlId GUI_DragFile GUI_DragId GUI_DropId GUI_WinHandle HomeDrive HomePath HomeShare HotKeyPressed HOUR IPAddress1 IPAddress2 IPAddress3 IPAddress4 KBLayout LF LocalAppDataDir LogonDNSDomain LogonDomain LogonServer MDAY MIN MON MSEC MUILang MyDocumentsDir NumParams OSArch OSBuild OSLang OSServicePack OSType OSVersion ProgramFilesDir ProgramsCommonDir ProgramsDir ScriptDir ScriptFullPath ScriptLineNumber ScriptName SEC StartMenuCommonDir StartMenuDir StartupCommonDir StartupDir SW_DISABLE SW_ENABLE SW_HIDE SW_LOCK SW_MAXIMIZE SW_MINIMIZE SW_RESTORE SW_SHOW SW_SHOWDEFAULT SW_SHOWMAXIMIZED SW_SHOWMINIMIZED SW_SHOWMINNOACTIVE SW_SHOWNA SW_SHOWNOACTIVATE SW_SHOWNORMAL SW_UNLOCK SystemDir TAB TempDir TRAY_ID TrayIconFlashing TrayIconVisible UserName UserProfileDir WDAY WindowsDir WorkingDir YDAY YEAR',
// relevance: 5
begin:'@[A-z0-9_]+'},FUNCTION={className:'function',beginKeywords:'Func',end:'$',illegal:'\\$|\\[|%',contains:[hljs.UNDERSCORE_TITLE_MODE,{className:'params',begin:'\\(',end:'\\)',contains:[VARIABLE,STRING,NUMBER]}]};return{case_insensitive:true,illegal:/\/\*/,keywords:{keyword:KEYWORDS,built_in:BUILT_IN,literal:LITERAL},contains:[COMMENT,VARIABLE,STRING,NUMBER,PREPROCESSOR,CONSTANT,FUNCTION]};});hljs.registerLanguage('avrasm',function(hljs){return{case_insensitive:true,lexemes:'\\.?'+hljs.IDENT_RE,keywords:{keyword:/* mnemonic */'adc add adiw and andi asr bclr bld brbc brbs brcc brcs break breq brge brhc brhs '+'brid brie brlo brlt brmi brne brpl brsh brtc brts brvc brvs bset bst call cbi cbr '+'clc clh cli cln clr cls clt clv clz com cp cpc cpi cpse dec eicall eijmp elpm eor '+'fmul fmuls fmulsu icall ijmp in inc jmp ld ldd ldi lds lpm lsl lsr mov movw mul '+'muls mulsu neg nop or ori out pop push rcall ret reti rjmp rol ror sbc sbr sbrc sbrs '+'sec seh sbi sbci sbic sbis sbiw sei sen ser ses set sev sez sleep spm st std sts sub '+'subi swap tst wdr',built_in:/* general purpose registers */'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 r18 r19 r20 r21 r22 '+'r23 r24 r25 r26 r27 r28 r29 r30 r31 x|0 xh xl y|0 yh yl z|0 zh zl '+/* IO Registers (ATMega128) */'ucsr1c udr1 ucsr1a ucsr1b ubrr1l ubrr1h ucsr0c ubrr0h tccr3c tccr3a tccr3b tcnt3h '+'tcnt3l ocr3ah ocr3al ocr3bh ocr3bl ocr3ch ocr3cl icr3h icr3l etimsk etifr tccr1c '+'ocr1ch ocr1cl twcr twdr twar twsr twbr osccal xmcra xmcrb eicra spmcsr spmcr portg '+'ddrg ping portf ddrf sreg sph spl xdiv rampz eicrb eimsk gimsk gicr eifr gifr timsk '+'tifr mcucr mcucsr tccr0 tcnt0 ocr0 assr tccr1a tccr1b tcnt1h tcnt1l ocr1ah ocr1al '+'ocr1bh ocr1bl icr1h icr1l tccr2 tcnt2 ocr2 ocdr wdtcr sfior eearh eearl eedr eecr '+'porta ddra pina portb ddrb pinb portc ddrc pinc portd ddrd pind spdr spsr spcr udr0 '+'ucsr0a ucsr0b ubrr0l acsr admux adcsr adch adcl porte ddre pine pinf',meta:'.byte .cseg .db .def .device .dseg .dw .endmacro .equ .eseg .exit .include .list '+'.listmac .macro .nolist .org .set'},contains:[hljs.C_BLOCK_COMMENT_MODE,hljs.COMMENT(';','$',{relevance:0}),hljs.C_NUMBER_MODE,// 0x..., decimal, float
hljs.BINARY_NUMBER_MODE,// 0b...
{className:'number',begin:'\\b(\\$[a-zA-Z0-9]+|0o[0-7]+)'// $..., 0o...
},hljs.QUOTE_STRING_MODE,{className:'string',begin:'\'',end:'[^\\\\]\'',illegal:'[^\\\\][^\']'},{className:'symbol',begin:'^[A-Za-z0-9_.$]+:'},{className:'meta',begin:'#',end:'$'},{// подстановка в «.macro»
className:'subst',begin:'@[0-9]+'}]};});hljs.registerLanguage('awk',function(hljs){var VARIABLE={className:'variable',variants:[{begin:/\$[\w\d#@][\w\d_]*/},{begin:/\$\{(.*?)}/}]};var KEYWORDS='BEGIN END if else while do for in break continue delete next nextfile function func exit|10';var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:/(u|b)?r?'''/,end:/'''/,relevance:10},{begin:/(u|b)?r?"""/,end:/"""/,relevance:10},{begin:/(u|r|ur)'/,end:/'/,relevance:10},{begin:/(u|r|ur)"/,end:/"/,relevance:10},{begin:/(b|br)'/,end:/'/},{begin:/(b|br)"/,end:/"/},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]};return{keywords:{keyword:KEYWORDS},contains:[VARIABLE,STRING,hljs.REGEXP_MODE,hljs.HASH_COMMENT_MODE,hljs.NUMBER_MODE]};});hljs.registerLanguage('axapta',function(hljs){return{keywords:'false int abstract private char boolean static null if for true '+'while long throw finally protected final return void enum else '+'break new catch byte super case short default double public try this switch '+'continue reverse firstfast firstonly forupdate nofetch sum avg minof maxof count '+'order group by asc desc index hint like dispaly edit client server ttsbegin '+'ttscommit str real date container anytype common div mod',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{className:'meta',begin:'#',end:'$'},{className:'class',beginKeywords:'class interface',end:'{',excludeEnd:true,illegal:':',contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]}]};});hljs.registerLanguage('bash',function(hljs){var VAR={className:'variable',variants:[{begin:/\$[\w\d#@][\w\d_]*/},{begin:/\$\{(.*?)}/}]};var QUOTE_STRING={className:'string',begin:/"/,end:/"/,contains:[hljs.BACKSLASH_ESCAPE,VAR,{className:'variable',begin:/\$\(/,end:/\)/,contains:[hljs.BACKSLASH_ESCAPE]}]};var APOS_STRING={className:'string',begin:/'/,end:/'/};return{aliases:['sh','zsh'],lexemes:/-?[a-z\._]+/,keywords:{keyword:'if then else elif fi for while in do done case esac function',literal:'true false',built_in:// Shell built-ins
// http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
'break cd continue eval exec exit export getopts hash pwd readonly return shift test times '+'trap umask unset '+// Bash built-ins
'alias bind builtin caller command declare echo enable help let local logout mapfile printf '+'read readarray source type typeset ulimit unalias '+// Shell modifiers
'set shopt '+// Zsh built-ins
'autoload bg bindkey bye cap chdir clone comparguments compcall compctl compdescribe compfiles '+'compgroups compquote comptags comptry compvalues dirs disable disown echotc echoti emulate '+'fc fg float functions getcap getln history integer jobs kill limit log noglob popd print '+'pushd pushln rehash sched setcap setopt stat suspend ttyctl unfunction unhash unlimit '+'unsetopt vared wait whence where which zcompile zformat zftp zle zmodload zparseopts zprof '+'zpty zregexparse zsocket zstyle ztcp',_:'-ne -eq -lt -gt -f -d -e -s -l -a'// relevance booster
},contains:[{className:'meta',begin:/^#![^\n]+sh\s*$/,relevance:10},{className:'function',begin:/\w[\w\d_]*\s*\(\s*\)\s*\{/,returnBegin:true,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:/\w[\w\d_]*/})],relevance:0},hljs.HASH_COMMENT_MODE,QUOTE_STRING,APOS_STRING,VAR]};});hljs.registerLanguage('basic',function(hljs){return{case_insensitive:true,illegal:'^\.',// Support explicitely typed variables that end with $%! or #.
lexemes:'[a-zA-Z][a-zA-Z0-9_\$\%\!\#]*',keywords:{keyword:'ABS ASC AND ATN AUTO|0 BEEP BLOAD|10 BSAVE|10 CALL CALLS CDBL CHAIN CHDIR CHR$|10 CINT CIRCLE '+'CLEAR CLOSE CLS COLOR COM COMMON CONT COS CSNG CSRLIN CVD CVI CVS DATA DATE$ '+'DEFDBL DEFINT DEFSNG DEFSTR DEF|0 SEG USR DELETE DIM DRAW EDIT END ENVIRON ENVIRON$ '+'EOF EQV ERASE ERDEV ERDEV$ ERL ERR ERROR EXP FIELD FILES FIX FOR|0 FRE GET GOSUB|10 GOTO '+'HEX$ IF|0 THEN ELSE|0 INKEY$ INP INPUT INPUT# INPUT$ INSTR IMP INT IOCTL IOCTL$ KEY ON '+'OFF LIST KILL LEFT$ LEN LET LINE LLIST LOAD LOC LOCATE LOF LOG LPRINT USING LSET '+'MERGE MID$ MKDIR MKD$ MKI$ MKS$ MOD NAME NEW NEXT NOISE NOT OCT$ ON OR PEN PLAY STRIG OPEN OPTION '+'BASE OUT PAINT PALETTE PCOPY PEEK PMAP POINT POKE POS PRINT PRINT] PSET PRESET '+'PUT RANDOMIZE READ REM RENUM RESET|0 RESTORE RESUME RETURN|0 RIGHT$ RMDIR RND RSET '+'RUN SAVE SCREEN SGN SHELL SIN SOUND SPACE$ SPC SQR STEP STICK STOP STR$ STRING$ SWAP '+'SYSTEM TAB TAN TIME$ TIMER TROFF TRON TO USR VAL VARPTR VARPTR$ VIEW WAIT WHILE '+'WEND WIDTH WINDOW WRITE XOR'},contains:[hljs.QUOTE_STRING_MODE,hljs.COMMENT('REM','$',{relevance:10}),hljs.COMMENT('\'','$',{relevance:0}),{// Match line numbers
className:'symbol',begin:'^[0-9]+\ ',relevance:10},{// Match typed numeric constants (1000, 12.34!, 1.2e5, 1.5#, 1.2D2)
className:'number',begin:'\\b([0-9]+[0-9edED\.]*[#\!]?)',relevance:0},{// Match hexadecimal numbers (&Hxxxx)
className:'number',begin:'(\&[hH][0-9a-fA-F]{1,4})'},{// Match octal numbers (&Oxxxxxx)
className:'number',begin:'(\&[oO][0-7]{1,6})'}]};});hljs.registerLanguage('bnf',function(hljs){return{contains:[// Attribute
{className:'attribute',begin:/</,end:/>/},// Specific
{begin:/::=/,starts:{end:/$/,contains:[{begin:/</,end:/>/},// Common
hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]}}]};});hljs.registerLanguage('brainfuck',function(hljs){var LITERAL={className:'literal',begin:'[\\+\\-]',relevance:0};return{aliases:['bf'],contains:[hljs.COMMENT('[^\\[\\]\\.,\\+\\-<> \r\n]','[\\[\\]\\.,\\+\\-<> \r\n]',{returnEnd:true,relevance:0}),{className:'title',begin:'[\\[\\]]',relevance:0},{className:'string',begin:'[\\.,]',relevance:0},{// this mode works as the only relevance counter
begin:/\+\+|\-\-/,returnBegin:true,contains:[LITERAL]},LITERAL]};});hljs.registerLanguage('cal',function(hljs){var KEYWORDS='div mod in and or not xor asserterror begin case do downto else end exit for if of repeat then to '+'until while with var';var LITERALS='false true';var COMMENT_MODES=[hljs.C_LINE_COMMENT_MODE,hljs.COMMENT(/\{/,/\}/,{relevance:0}),hljs.COMMENT(/\(\*/,/\*\)/,{relevance:10})];var STRING={className:'string',begin:/'/,end:/'/,contains:[{begin:/''/}]};var CHAR_STRING={className:'string',begin:/(#\d+)+/};var DATE={className:'number',begin:'\\b\\d+(\\.\\d+)?(DT|D|T)',relevance:0};var DBL_QUOTED_VARIABLE={className:'string',// not a string technically but makes sense to be highlighted in the same style
begin:'"',end:'"'};var PROCEDURE={className:'function',beginKeywords:'procedure',end:/[:;]/,keywords:'procedure|10',contains:[hljs.TITLE_MODE,{className:'params',begin:/\(/,end:/\)/,keywords:KEYWORDS,contains:[STRING,CHAR_STRING]}].concat(COMMENT_MODES)};var OBJECT={className:'class',begin:'OBJECT (Table|Form|Report|Dataport|Codeunit|XMLport|MenuSuite|Page|Query) (\\d+) ([^\\r\\n]+)',returnBegin:true,contains:[hljs.TITLE_MODE,PROCEDURE]};return{case_insensitive:true,keywords:{keyword:KEYWORDS,literal:LITERALS},illegal:/\/\*/,contains:[STRING,CHAR_STRING,DATE,DBL_QUOTED_VARIABLE,hljs.NUMBER_MODE,OBJECT,PROCEDURE]};});hljs.registerLanguage('capnproto',function(hljs){return{aliases:['capnp'],keywords:{keyword:'struct enum interface union group import using const annotation extends in of on as with from fixed',built_in:'Void Bool Int8 Int16 Int32 Int64 UInt8 UInt16 UInt32 UInt64 Float32 Float64 '+'Text Data AnyPointer AnyStruct Capability List',literal:'true false'},contains:[hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE,hljs.HASH_COMMENT_MODE,{className:'meta',begin:/@0x[\w\d]{16};/,illegal:/\n/},{className:'symbol',begin:/@\d+\b/},{className:'class',beginKeywords:'struct enum',end:/\{/,illegal:/\n/,contains:[hljs.inherit(hljs.TITLE_MODE,{starts:{endsWithParent:true,excludeEnd:true// hack: eating everything after the first title
}})]},{className:'class',beginKeywords:'interface',end:/\{/,illegal:/\n/,contains:[hljs.inherit(hljs.TITLE_MODE,{starts:{endsWithParent:true,excludeEnd:true// hack: eating everything after the first title
}})]}]};});hljs.registerLanguage('ceylon',function(hljs){// 2.3. Identifiers and keywords
var KEYWORDS='assembly module package import alias class interface object given value '+'assign void function new of extends satisfies abstracts in out return '+'break continue throw assert dynamic if else switch case for while try '+'catch finally then let this outer super is exists nonempty';// 7.4.1 Declaration Modifiers
var DECLARATION_MODIFIERS='shared abstract formal default actual variable late native deprecated'+'final sealed annotation suppressWarnings small';// 7.4.2 Documentation
var DOCUMENTATION='doc by license see throws tagged';var SUBST={className:'subst',excludeBegin:true,excludeEnd:true,begin:/``/,end:/``/,keywords:KEYWORDS,relevance:10};var EXPRESSIONS=[{// verbatim string
className:'string',begin:'"""',end:'"""',relevance:10},{// string literal or template
className:'string',begin:'"',end:'"',contains:[SUBST]},{// character literal
className:'string',begin:"'",end:"'"},{// numeric literal
className:'number',begin:'#[0-9a-fA-F_]+|\\$[01_]+|[0-9_]+(?:\\.[0-9_](?:[eE][+-]?\\d+)?)?[kMGTPmunpf]?',relevance:0}];SUBST.contains=EXPRESSIONS;return{keywords:{keyword:KEYWORDS+' '+DECLARATION_MODIFIERS,meta:DOCUMENTATION},illegal:'\\$[^01]|#[^0-9a-fA-F]',contains:[hljs.C_LINE_COMMENT_MODE,hljs.COMMENT('/\\*','\\*/',{contains:['self']}),{// compiler annotation
className:'meta',begin:'@[a-z]\\w*(?:\\:\"[^\"]*\")?'}].concat(EXPRESSIONS)};});hljs.registerLanguage('clean',function(hljs){return{aliases:['clean','icl','dcl'],keywords:{keyword:'if let in with where case of class instance otherwise '+'implementation definition system module from import qualified as '+'special code inline foreign export ccall stdcall generic derive '+'infix infixl infixr',literal:'True False'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{begin:'->|<-[|:]?|::|#!?|>>=|\\{\\||\\|\\}|:==|=:|\\.\\.|<>|`'// relevance booster
}]};});hljs.registerLanguage('clojure',function(hljs){var keywords={'builtin-name':// Clojure keywords
'def defonce cond apply if-not if-let if not not= = < > <= >= == + / * - rem '+'quot neg? pos? delay? symbol? keyword? true? false? integer? empty? coll? list? '+'set? ifn? fn? associative? sequential? sorted? counted? reversible? number? decimal? '+'class? distinct? isa? float? rational? reduced? ratio? odd? even? char? seq? vector? '+'string? map? nil? contains? zero? instance? not-every? not-any? libspec? -> ->> .. . '+'inc compare do dotimes mapcat take remove take-while drop letfn drop-last take-last '+'drop-while while intern condp case reduced cycle split-at split-with repeat replicate '+'iterate range merge zipmap declare line-seq sort comparator sort-by dorun doall nthnext '+'nthrest partition eval doseq await await-for let agent atom send send-off release-pending-sends '+'add-watch mapv filterv remove-watch agent-error restart-agent set-error-handler error-handler '+'set-error-mode! error-mode shutdown-agents quote var fn loop recur throw try monitor-enter '+'monitor-exit defmacro defn defn- macroexpand macroexpand-1 for dosync and or '+'when when-not when-let comp juxt partial sequence memoize constantly complement identity assert '+'peek pop doto proxy defstruct first rest cons defprotocol cast coll deftype defrecord last butlast '+'sigs reify second ffirst fnext nfirst nnext defmulti defmethod meta with-meta ns in-ns create-ns import '+'refer keys select-keys vals key val rseq name namespace promise into transient persistent! conj! '+'assoc! dissoc! pop! disj! use class type num float double short byte boolean bigint biginteger '+'bigdec print-method print-dup throw-if printf format load compile get-in update-in pr pr-on newline '+'flush read slurp read-line subvec with-open memfn time re-find re-groups rand-int rand mod locking '+'assert-valid-fdecl alias resolve ref deref refset swap! reset! set-validator! compare-and-set! alter-meta! '+'reset-meta! commute get-validator alter ref-set ref-history-count ref-min-history ref-max-history ensure sync io! '+'new next conj set! to-array future future-call into-array aset gen-class reduce map filter find empty '+'hash-map hash-set sorted-map sorted-map-by sorted-set sorted-set-by vec vector seq flatten reverse assoc dissoc list '+'disj get union difference intersection extend extend-type extend-protocol int nth delay count concat chunk chunk-buffer '+'chunk-append chunk-first chunk-rest max min dec unchecked-inc-int unchecked-inc unchecked-dec-inc unchecked-dec unchecked-negate '+'unchecked-add-int unchecked-add unchecked-subtract-int unchecked-subtract chunk-next chunk-cons chunked-seq? prn vary-meta '+'lazy-seq spread list* str find-keyword keyword symbol gensym force rationalize'};var SYMBOLSTART='a-zA-Z_\\-!.?+*=<>&#\'';var SYMBOL_RE='['+SYMBOLSTART+']['+SYMBOLSTART+'0-9/;:]*';var SIMPLE_NUMBER_RE='[-+]?\\d+(\\.\\d+)?';var SYMBOL={begin:SYMBOL_RE,relevance:0};var NUMBER={className:'number',begin:SIMPLE_NUMBER_RE,relevance:0};var STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null});var COMMENT=hljs.COMMENT(';','$',{relevance:0});var LITERAL={className:'literal',begin:/\b(true|false|nil)\b/};var COLLECTION={begin:'[\\[\\{]',end:'[\\]\\}]'};var HINT={className:'comment',begin:'\\^'+SYMBOL_RE};var HINT_COL=hljs.COMMENT('\\^\\{','\\}');var KEY={className:'symbol',begin:'[:]{1,2}'+SYMBOL_RE};var LIST={begin:'\\(',end:'\\)'};var BODY={endsWithParent:true,relevance:0};var NAME={keywords:keywords,lexemes:SYMBOL_RE,className:'name',begin:SYMBOL_RE,starts:BODY};var DEFAULT_CONTAINS=[LIST,STRING,HINT,HINT_COL,COMMENT,KEY,COLLECTION,NUMBER,LITERAL,SYMBOL];LIST.contains=[hljs.COMMENT('comment',''),NAME,BODY];BODY.contains=DEFAULT_CONTAINS;COLLECTION.contains=DEFAULT_CONTAINS;return{aliases:['clj'],illegal:/\S/,contains:[LIST,STRING,HINT,HINT_COL,COMMENT,KEY,COLLECTION,NUMBER,LITERAL]};});hljs.registerLanguage('clojure-repl',function(hljs){return{contains:[{className:'meta',begin:/^([\w.-]+|\s*#_)=>/,starts:{end:/$/,subLanguage:'clojure'}}]};});hljs.registerLanguage('cmake',function(hljs){return{aliases:['cmake.in'],case_insensitive:true,keywords:{keyword:'add_custom_command add_custom_target add_definitions add_dependencies '+'add_executable add_library add_subdirectory add_test aux_source_directory '+'break build_command cmake_minimum_required cmake_policy configure_file '+'create_test_sourcelist define_property else elseif enable_language enable_testing '+'endforeach endfunction endif endmacro endwhile execute_process export find_file '+'find_library find_package find_path find_program fltk_wrap_ui foreach function '+'get_cmake_property get_directory_property get_filename_component get_property '+'get_source_file_property get_target_property get_test_property if include '+'include_directories include_external_msproject include_regular_expression install '+'link_directories load_cache load_command macro mark_as_advanced message option '+'output_required_files project qt_wrap_cpp qt_wrap_ui remove_definitions return '+'separate_arguments set set_directory_properties set_property '+'set_source_files_properties set_target_properties set_tests_properties site_name '+'source_group string target_link_libraries try_compile try_run unset variable_watch '+'while build_name exec_program export_library_dependencies install_files '+'install_programs install_targets link_libraries make_directory remove subdir_depends '+'subdirs use_mangled_mesa utility_source variable_requires write_file '+'qt5_use_modules qt5_use_package qt5_wrap_cpp on off true false and or '+'equal less greater strless strgreater strequal matches'},contains:[{className:'variable',begin:'\\${',end:'}'},hljs.HASH_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE]};});hljs.registerLanguage('coffeescript',function(hljs){var KEYWORDS={keyword:// JS keywords
'in if for while finally new do return else break catch instanceof throw try this '+'switch continue typeof delete debugger super yield import export from as default await '+// Coffee keywords
'then unless until loop of by when and or is isnt not',literal:// JS literals
'true false null undefined '+// Coffee literals
'yes no on off',built_in:'npm require console print module global window document'};var JS_IDENT_RE='[A-Za-z$_][0-9A-Za-z$_]*';var SUBST={className:'subst',begin:/#\{/,end:/}/,keywords:KEYWORDS};var EXPRESSIONS=[hljs.BINARY_NUMBER_MODE,hljs.inherit(hljs.C_NUMBER_MODE,{starts:{end:'(\\s*/)?',relevance:0}}),// a number tries to eat the following slash to prevent treating it as a regexp
{className:'string',variants:[{begin:/'''/,end:/'''/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:/'/,end:/'/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:/"""/,end:/"""/,contains:[hljs.BACKSLASH_ESCAPE,SUBST]},{begin:/"/,end:/"/,contains:[hljs.BACKSLASH_ESCAPE,SUBST]}]},{className:'regexp',variants:[{begin:'///',end:'///',contains:[SUBST,hljs.HASH_COMMENT_MODE]},{begin:'//[gim]*',relevance:0},{// regex can't start with space to parse x / 2 / 3 as two divisions
// regex can't start with *, and it supports an "illegal" in the main mode
begin:/\/(?![ *])(\\\/|.)*?\/[gim]*(?=\W|$)/}]},{begin:'@'+JS_IDENT_RE// relevance booster
},{subLanguage:'javascript',excludeBegin:true,excludeEnd:true,variants:[{begin:'```',end:'```'},{begin:'`',end:'`'}]}];SUBST.contains=EXPRESSIONS;var TITLE=hljs.inherit(hljs.TITLE_MODE,{begin:JS_IDENT_RE});var PARAMS_RE='(\\(.*\\))?\\s*\\B[-=]>';var PARAMS={className:'params',begin:'\\([^\\(]',returnBegin:true,/* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */contains:[{begin:/\(/,end:/\)/,keywords:KEYWORDS,contains:['self'].concat(EXPRESSIONS)}]};return{aliases:['coffee','cson','iced'],keywords:KEYWORDS,illegal:/\/\*/,contains:EXPRESSIONS.concat([hljs.COMMENT('###','###'),hljs.HASH_COMMENT_MODE,{className:'function',begin:'^\\s*'+JS_IDENT_RE+'\\s*=\\s*'+PARAMS_RE,end:'[-=]>',returnBegin:true,contains:[TITLE,PARAMS]},{// anonymous function start
begin:/[:\(,=]\s*/,relevance:0,contains:[{className:'function',begin:PARAMS_RE,end:'[-=]>',returnBegin:true,contains:[PARAMS]}]},{className:'class',beginKeywords:'class',end:'$',illegal:/[:="\[\]]/,contains:[{beginKeywords:'extends',endsWithParent:true,illegal:/[:="\[\]]/,contains:[TITLE]},TITLE]},{begin:JS_IDENT_RE+':',end:':',returnBegin:true,returnEnd:true,relevance:0}])};});hljs.registerLanguage('coq',function(hljs){return{keywords:{keyword:'_ as at cofix else end exists exists2 fix for forall fun if IF in let '+'match mod Prop return Set then Type using where with '+'Abort About Add Admit Admitted All Arguments Assumptions Axiom Back BackTo '+'Backtrack Bind Blacklist Canonical Cd Check Class Classes Close Coercion '+'Coercions CoFixpoint CoInductive Collection Combined Compute Conjecture '+'Conjectures Constant constr Constraint Constructors Context Corollary '+'CreateHintDb Cut Declare Defined Definition Delimit Dependencies Dependent'+'Derive Drop eauto End Equality Eval Example Existential Existentials '+'Existing Export exporting Extern Extract Extraction Fact Field Fields File '+'Fixpoint Focus for From Function Functional Generalizable Global Goal Grab '+'Grammar Graph Guarded Heap Hint HintDb Hints Hypotheses Hypothesis ident '+'Identity If Immediate Implicit Import Include Inductive Infix Info Initial '+'Inline Inspect Instance Instances Intro Intros Inversion Inversion_clear '+'Language Left Lemma Let Libraries Library Load LoadPath Local Locate Ltac ML '+'Mode Module Modules Monomorphic Morphism Next NoInline Notation Obligation '+'Obligations Opaque Open Optimize Options Parameter Parameters Parametric '+'Path Paths pattern Polymorphic Preterm Print Printing Program Projections '+'Proof Proposition Pwd Qed Quit Rec Record Recursive Redirect Relation Remark '+'Remove Require Reserved Reset Resolve Restart Rewrite Right Ring Rings Save '+'Scheme Scope Scopes Script Search SearchAbout SearchHead SearchPattern '+'SearchRewrite Section Separate Set Setoid Show Solve Sorted Step Strategies '+'Strategy Structure SubClass Table Tables Tactic Term Test Theorem Time '+'Timeout Transparent Type Typeclasses Types Undelimit Undo Unfocus Unfocused '+'Unfold Universe Universes Unset Unshelve using Variable Variables Variant '+'Verbose Visibility where with',built_in:'abstract absurd admit after apply as assert assumption at auto autorewrite '+'autounfold before bottom btauto by case case_eq cbn cbv change '+'classical_left classical_right clear clearbody cofix compare compute '+'congruence constr_eq constructor contradict contradiction cut cutrewrite '+'cycle decide decompose dependent destruct destruction dintuition '+'discriminate discrR do double dtauto eapply eassumption eauto ecase '+'econstructor edestruct ediscriminate eelim eexact eexists einduction '+'einjection eleft elim elimtype enough equality erewrite eright '+'esimplify_eq esplit evar exact exactly_once exfalso exists f_equal fail '+'field field_simplify field_simplify_eq first firstorder fix fold fourier '+'functional generalize generalizing gfail give_up has_evar hnf idtac in '+'induction injection instantiate intro intro_pattern intros intuition '+'inversion inversion_clear is_evar is_var lapply lazy left lia lra move '+'native_compute nia nsatz omega once pattern pose progress proof psatz quote '+'record red refine reflexivity remember rename repeat replace revert '+'revgoals rewrite rewrite_strat right ring ring_simplify rtauto set '+'setoid_reflexivity setoid_replace setoid_rewrite setoid_symmetry '+'setoid_transitivity shelve shelve_unifiable simpl simple simplify_eq solve '+'specialize split split_Rabs split_Rmult stepl stepr subst sum swap '+'symmetry tactic tauto time timeout top transitivity trivial try tryif '+'unfold unify until using vm_compute with'},contains:[hljs.QUOTE_STRING_MODE,hljs.COMMENT('\\(\\*','\\*\\)'),hljs.C_NUMBER_MODE,{className:'type',excludeBegin:true,begin:'\\|\\s*',end:'\\w+'},{begin:/[-=]>/// relevance booster
}]};});hljs.registerLanguage('cos',function cos(hljs){var STRINGS={className:'string',variants:[{begin:'"',end:'"',contains:[{// escaped
begin:"\"\"",relevance:0}]}]};var NUMBERS={className:"number",begin:"\\b(\\d+(\\.\\d*)?|\\.\\d+)",relevance:0};var COS_KEYWORDS='property parameter class classmethod clientmethod extends as break '+'catch close continue do d|0 else elseif for goto halt hang h|0 if job '+'j|0 kill k|0 lock l|0 merge new open quit q|0 read r|0 return set s|0 '+'tcommit throw trollback try tstart use view while write w|0 xecute x|0 '+'zkill znspace zn ztrap zwrite zw zzdump zzwrite print zbreak zinsert '+'zload zprint zremove zsave zzprint mv mvcall mvcrt mvdim mvprint zquit '+'zsync ascii';// registered function - no need in them due to all functions are highlighted,
// but I'll just leave this here.
//"$bit", "$bitcount",
//"$bitfind", "$bitlogic", "$case", "$char", "$classmethod", "$classname",
//"$compile", "$data", "$decimal", "$double", "$extract", "$factor",
//"$find", "$fnumber", "$get", "$increment", "$inumber", "$isobject",
//"$isvaliddouble", "$isvalidnum", "$justify", "$length", "$list",
//"$listbuild", "$listdata", "$listfind", "$listfromstring", "$listget",
//"$listlength", "$listnext", "$listsame", "$listtostring", "$listvalid",
//"$locate", "$match", "$method", "$name", "$nconvert", "$next",
//"$normalize", "$now", "$number", "$order", "$parameter", "$piece",
//"$prefetchoff", "$prefetchon", "$property", "$qlength", "$qsubscript",
//"$query", "$random", "$replace", "$reverse", "$sconvert", "$select",
//"$sortbegin", "$sortend", "$stack", "$text", "$translate", "$view",
//"$wascii", "$wchar", "$wextract", "$wfind", "$wiswide", "$wlength",
//"$wreverse", "$xecute", "$zabs", "$zarccos", "$zarcsin", "$zarctan",
//"$zcos", "$zcot", "$zcsc", "$zdate", "$zdateh", "$zdatetime",
//"$zdatetimeh", "$zexp", "$zhex", "$zln", "$zlog", "$zpower", "$zsec",
//"$zsin", "$zsqr", "$ztan", "$ztime", "$ztimeh", "$zboolean",
//"$zconvert", "$zcrc", "$zcyc", "$zdascii", "$zdchar", "$zf",
//"$ziswide", "$zlascii", "$zlchar", "$zname", "$zposition", "$zqascii",
//"$zqchar", "$zsearch", "$zseek", "$zstrip", "$zwascii", "$zwchar",
//"$zwidth", "$zwpack", "$zwbpack", "$zwunpack", "$zwbunpack", "$zzenkaku",
//"$change", "$mv", "$mvat", "$mvfmt", "$mvfmts", "$mviconv",
//"$mviconvs", "$mvinmat", "$mvlover", "$mvoconv", "$mvoconvs", "$mvraise",
//"$mvtrans", "$mvv", "$mvname", "$zbitand", "$zbitcount", "$zbitfind",
//"$zbitget", "$zbitlen", "$zbitnot", "$zbitor", "$zbitset", "$zbitstr",
//"$zbitxor", "$zincrement", "$znext", "$zorder", "$zprevious", "$zsort",
//"device", "$ecode", "$estack", "$etrap", "$halt", "$horolog",
//"$io", "$job", "$key", "$namespace", "$principal", "$quit", "$roles",
//"$storage", "$system", "$test", "$this", "$tlevel", "$username",
//"$x", "$y", "$za", "$zb", "$zchild", "$zeof", "$zeos", "$zerror",
//"$zhorolog", "$zio", "$zjob", "$zmode", "$znspace", "$zparent", "$zpi",
//"$zpos", "$zreference", "$zstorage", "$ztimestamp", "$ztimezone",
//"$ztrap", "$zversion"
return{case_insensitive:true,aliases:["cos","cls"],keywords:COS_KEYWORDS,contains:[NUMBERS,STRINGS,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:"comment",begin:/;/,end:"$",relevance:0},{// Functions and user-defined functions: write $ztime(60*60*3), $$myFunc(10), $$^Val(1)
className:"built_in",begin:/(?:\$\$?|\.\.)\^?[a-zA-Z]+/},{// Macro command: quit $$$OK
className:"built_in",begin:/\$\$\$[a-zA-Z]+/},{// Special (global) variables: write %request.Content; Built-in classes: %Library.Integer
className:"built_in",begin:/%[a-z]+(?:\.[a-z]+)*/},{// Global variable: set ^globalName = 12 write ^globalName
className:"symbol",begin:/\^%?[a-zA-Z][\w]*/},{// Some control constructions: do ##class(Package.ClassName).Method(), ##super()
className:"keyword",begin:/##class|##super|#define|#dim/},// sub-languages: are not fully supported by hljs by 11/15/2015
// left for the future implementation.
{begin:/&sql\(/,end:/\)/,excludeBegin:true,excludeEnd:true,subLanguage:"sql"},{begin:/&(js|jscript|javascript)</,end:/>/,excludeBegin:true,excludeEnd:true,subLanguage:"javascript"},{// this brakes first and last tag, but this is the only way to embed a valid html
begin:/&html<\s*</,end:/>\s*>/,subLanguage:"xml"}]};});hljs.registerLanguage('crmsh',function(hljs){var RESOURCES='primitive rsc_template';var COMMANDS='group clone ms master location colocation order fencing_topology '+'rsc_ticket acl_target acl_group user role '+'tag xml';var PROPERTY_SETS='property rsc_defaults op_defaults';var KEYWORDS='params meta operations op rule attributes utilization';var OPERATORS='read write deny defined not_defined in_range date spec in '+'ref reference attribute type xpath version and or lt gt tag '+'lte gte eq ne \\';var TYPES='number string';var LITERALS='Master Started Slave Stopped start promote demote stop monitor true false';return{aliases:['crm','pcmk'],case_insensitive:true,keywords:{keyword:KEYWORDS+' '+OPERATORS+' '+TYPES,literal:LITERALS},contains:[hljs.HASH_COMMENT_MODE,{beginKeywords:'node',starts:{end:'\\s*([\\w_-]+:)?',starts:{className:'title',end:'\\s*[\\$\\w_][\\w_-]*'}}},{beginKeywords:RESOURCES,starts:{className:'title',end:'\\s*[\\$\\w_][\\w_-]*',starts:{end:'\\s*@?[\\w_][\\w_\\.:-]*'}}},{begin:'\\b('+COMMANDS.split(' ').join('|')+')\\s+',keywords:COMMANDS,starts:{className:'title',end:'[\\$\\w_][\\w_-]*'}},{beginKeywords:PROPERTY_SETS,starts:{className:'title',end:'\\s*([\\w_-]+:)?'}},hljs.QUOTE_STRING_MODE,{className:'meta',begin:'(ocf|systemd|service|lsb):[\\w_:-]+',relevance:0},{className:'number',begin:'\\b\\d+(\\.\\d+)?(ms|s|h|m)?',relevance:0},{className:'literal',begin:'[-]?(infinity|inf)',relevance:0},{className:'attr',begin:/([A-Za-z\$_\#][\w_-]+)=/,relevance:0},{className:'tag',begin:'</?',end:'/?>',relevance:0}]};});hljs.registerLanguage('crystal',function(hljs){var NUM_SUFFIX='(_[uif](8|16|32|64))?';var CRYSTAL_IDENT_RE='[a-zA-Z_]\\w*[!?=]?';var RE_STARTER='!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|'+'>>|>|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';var CRYSTAL_METHOD_RE='[a-zA-Z_]\\w*[!?=]?|[-+~]\\@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\][=?]?';var CRYSTAL_KEYWORDS={keyword:'abstract alias as asm begin break case class def do else elsif end ensure enum extend for fun if ifdef '+'include instance_sizeof is_a? lib macro module next of out pointerof private protected rescue responds_to? '+'return require self sizeof struct super then type typeof union unless until when while with yield '+'__DIR__ __FILE__ __LINE__',literal:'false nil true'};var SUBST={className:'subst',begin:'#{',end:'}',keywords:CRYSTAL_KEYWORDS};var EXPANSION={className:'template-variable',variants:[{begin:'\\{\\{',end:'\\}\\}'},{begin:'\\{%',end:'%\\}'}],keywords:CRYSTAL_KEYWORDS};function recursiveParen(begin,end){var contains=[{begin:begin,end:end}];contains[0].contains=contains;return contains;}var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/},{begin:/`/,end:/`/},{begin:'%w?\\(',end:'\\)',contains:recursiveParen('\\(','\\)')},{begin:'%w?\\[',end:'\\]',contains:recursiveParen('\\[','\\]')},{begin:'%w?{',end:'}',contains:recursiveParen('{','}')},{begin:'%w?<',end:'>',contains:recursiveParen('<','>')},{begin:'%w?/',end:'/'},{begin:'%w?%',end:'%'},{begin:'%w?-',end:'-'},{begin:'%w?\\|',end:'\\|'}],relevance:0};var REGEXP={begin:'('+RE_STARTER+')\\s*',contains:[{className:'regexp',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:'//[a-z]*',relevance:0},{begin:'/',end:'/[a-z]*'},{begin:'%r\\(',end:'\\)',contains:recursiveParen('\\(','\\)')},{begin:'%r\\[',end:'\\]',contains:recursiveParen('\\[','\\]')},{begin:'%r{',end:'}',contains:recursiveParen('{','}')},{begin:'%r<',end:'>',contains:recursiveParen('<','>')},{begin:'%r/',end:'/'},{begin:'%r%',end:'%'},{begin:'%r-',end:'-'},{begin:'%r\\|',end:'\\|'}]}],relevance:0};var REGEXP2={className:'regexp',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:'%r\\(',end:'\\)',contains:recursiveParen('\\(','\\)')},{begin:'%r\\[',end:'\\]',contains:recursiveParen('\\[','\\]')},{begin:'%r{',end:'}',contains:recursiveParen('{','}')},{begin:'%r<',end:'>',contains:recursiveParen('<','>')},{begin:'%r/',end:'/'},{begin:'%r%',end:'%'},{begin:'%r-',end:'-'},{begin:'%r\\|',end:'\\|'}],relevance:0};var ATTRIBUTE={className:'meta',begin:'@\\[',end:'\\]',contains:[hljs.inherit(hljs.QUOTE_STRING_MODE,{className:'meta-string'})]};var CRYSTAL_DEFAULT_CONTAINS=[EXPANSION,STRING,REGEXP,REGEXP2,ATTRIBUTE,hljs.HASH_COMMENT_MODE,{className:'class',beginKeywords:'class module struct',end:'$|;',illegal:/=/,contains:[hljs.HASH_COMMENT_MODE,hljs.inherit(hljs.TITLE_MODE,{begin:'[A-Za-z_]\\w*(::\\w+)*(\\?|\\!)?'}),{begin:'<'// relevance booster for inheritance
}]},{className:'class',beginKeywords:'lib enum union',end:'$|;',illegal:/=/,contains:[hljs.HASH_COMMENT_MODE,hljs.inherit(hljs.TITLE_MODE,{begin:'[A-Za-z_]\\w*(::\\w+)*(\\?|\\!)?'})],relevance:10},{className:'function',beginKeywords:'def',end:/\B\b/,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:CRYSTAL_METHOD_RE,endsParent:true})]},{className:'function',beginKeywords:'fun macro',end:/\B\b/,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:CRYSTAL_METHOD_RE,endsParent:true})],relevance:5},{className:'symbol',begin:hljs.UNDERSCORE_IDENT_RE+'(\\!|\\?)?:',relevance:0},{className:'symbol',begin:':',contains:[STRING,{begin:CRYSTAL_METHOD_RE}],relevance:0},{className:'number',variants:[{begin:'\\b0b([01_]*[01])'+NUM_SUFFIX},{begin:'\\b0o([0-7_]*[0-7])'+NUM_SUFFIX},{begin:'\\b0x([A-Fa-f0-9_]*[A-Fa-f0-9])'+NUM_SUFFIX},{begin:'\\b(([0-9][0-9_]*[0-9]|[0-9])(\\.[0-9_]*[0-9])?([eE][+-]?[0-9_]*[0-9])?)'+NUM_SUFFIX}],relevance:0}];SUBST.contains=CRYSTAL_DEFAULT_CONTAINS;EXPANSION.contains=CRYSTAL_DEFAULT_CONTAINS.slice(1);// without EXPANSION
return{aliases:['cr'],lexemes:CRYSTAL_IDENT_RE,keywords:CRYSTAL_KEYWORDS,contains:CRYSTAL_DEFAULT_CONTAINS};});hljs.registerLanguage('cs',function(hljs){var KEYWORDS={keyword:// Normal keywords.
'abstract as base bool break byte case catch char checked const continue decimal '+'default delegate do double else enum event explicit extern finally fixed float '+'for foreach goto if implicit in int interface internal is lock long '+'object operator out override params private protected public readonly ref sbyte '+'sealed short sizeof stackalloc static string struct switch this try typeof '+'uint ulong unchecked unsafe ushort using virtual void volatile while '+'nameof '+// Contextual keywords.
'add alias ascending async await by descending dynamic equals from get global group into join '+'let on orderby partial remove select set value var where yield',literal:'null false true'};var VERBATIM_STRING={className:'string',begin:'@"',end:'"',contains:[{begin:'""'}]};var VERBATIM_STRING_NO_LF=hljs.inherit(VERBATIM_STRING,{illegal:/\n/});var SUBST={className:'subst',begin:'{',end:'}',keywords:KEYWORDS};var SUBST_NO_LF=hljs.inherit(SUBST,{illegal:/\n/});var INTERPOLATED_STRING={className:'string',begin:/\$"/,end:'"',illegal:/\n/,contains:[{begin:'{{'},{begin:'}}'},hljs.BACKSLASH_ESCAPE,SUBST_NO_LF]};var INTERPOLATED_VERBATIM_STRING={className:'string',begin:/\$@"/,end:'"',contains:[{begin:'{{'},{begin:'}}'},{begin:'""'},SUBST]};var INTERPOLATED_VERBATIM_STRING_NO_LF=hljs.inherit(INTERPOLATED_VERBATIM_STRING,{illegal:/\n/,contains:[{begin:'{{'},{begin:'}}'},{begin:'""'},SUBST_NO_LF]});SUBST.contains=[INTERPOLATED_VERBATIM_STRING,INTERPOLATED_STRING,VERBATIM_STRING,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE];SUBST_NO_LF.contains=[INTERPOLATED_VERBATIM_STRING_NO_LF,INTERPOLATED_STRING,VERBATIM_STRING_NO_LF,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,hljs.inherit(hljs.C_BLOCK_COMMENT_MODE,{illegal:/\n/})];var STRING={variants:[INTERPOLATED_VERBATIM_STRING,INTERPOLATED_STRING,VERBATIM_STRING,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]};var TYPE_IDENT_RE=hljs.IDENT_RE+'(<'+hljs.IDENT_RE+'(\\s*,\\s*'+hljs.IDENT_RE+')*>)?(\\[\\])?';return{aliases:['csharp'],keywords:KEYWORDS,illegal:/::/,contains:[hljs.COMMENT('///','$',{returnBegin:true,contains:[{className:'doctag',variants:[{begin:'///',relevance:0},{begin:'<!--|-->'},{begin:'</?',end:'>'}]}]}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'if else elif endif define undef warning error line region endregion pragma checksum'}},STRING,hljs.C_NUMBER_MODE,{beginKeywords:'class interface',end:/[{;=]/,illegal:/[^\s:]/,contains:[hljs.TITLE_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},{beginKeywords:'namespace',end:/[{;=]/,illegal:/[^\s:]/,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:'[a-zA-Z](\\.?\\w)*'}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},{// Expression keywords prevent 'keyword Name(...)' from being
// recognized as a function definition
beginKeywords:'new return throw await',relevance:0},{className:'function',begin:'('+TYPE_IDENT_RE+'\\s+)+'+hljs.IDENT_RE+'\\s*\\(',returnBegin:true,end:/[{;=]/,excludeEnd:true,keywords:KEYWORDS,contains:[{begin:hljs.IDENT_RE+'\\s*\\(',returnBegin:true,contains:[hljs.TITLE_MODE],relevance:0},{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,keywords:KEYWORDS,relevance:0,contains:[STRING,hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]}]};});hljs.registerLanguage('csp',function(hljs){return{case_insensitive:false,lexemes:'[a-zA-Z][a-zA-Z0-9_-]*',keywords:{keyword:'base-uri child-src connect-src default-src font-src form-action'+' frame-ancestors frame-src img-src media-src object-src plugin-types'+' report-uri sandbox script-src style-src'},contains:[{className:'string',begin:"'",end:"'"},{className:'attribute',begin:'^Content',end:':',excludeEnd:true}]};});hljs.registerLanguage('css',function(hljs){var IDENT_RE='[a-zA-Z-][a-zA-Z0-9_-]*';var RULE={begin:/[A-Z\_\.\-]+\s*:/,returnBegin:true,end:';',endsWithParent:true,contains:[{className:'attribute',begin:/\S/,end:':',excludeEnd:true,starts:{endsWithParent:true,excludeEnd:true,contains:[{begin:/[\w-]+\(/,returnBegin:true,contains:[{className:'built_in',begin:/[\w-]+/},{begin:/\(/,end:/\)/,contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]}]},hljs.CSS_NUMBER_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'number',begin:'#[0-9A-Fa-f]+'},{className:'meta',begin:'!important'}]}}]};return{case_insensitive:true,illegal:/[=\/|'\$]/,contains:[hljs.C_BLOCK_COMMENT_MODE,{className:'selector-id',begin:/#[A-Za-z0-9_-]+/},{className:'selector-class',begin:/\.[A-Za-z0-9_-]+/},{className:'selector-attr',begin:/\[/,end:/\]/,illegal:'$'},{className:'selector-pseudo',begin:/:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/},{begin:'@(font-face|page)',lexemes:'[a-z-]+',keywords:'font-face page'},{begin:'@',end:'[{;]',// at_rule eating first "{" is a good thing
// because it doesn’t let it to be parsed as
// a rule set but instead drops parser into
// the default mode which is how it should be.
illegal:/:/,// break on Less variables @var: ...
contains:[{className:'keyword',begin:/\w+/},{begin:/\s/,endsWithParent:true,excludeEnd:true,relevance:0,contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.CSS_NUMBER_MODE]}]},{className:'selector-tag',begin:IDENT_RE,relevance:0},{begin:'{',end:'}',illegal:/\S/,contains:[hljs.C_BLOCK_COMMENT_MODE,RULE]}]};});hljs.registerLanguage('d',/**
 * Known issues:
 *
 * - invalid hex string literals will be recognized as a double quoted strings
 *   but 'x' at the beginning of string will not be matched
 *
 * - delimited string literals are not checked for matching end delimiter
 *   (not possible to do with js regexp)
 *
 * - content of token string is colored as a string (i.e. no keyword coloring inside a token string)
 *   also, content of token string is not validated to contain only valid D tokens
 *
 * - special token sequence rule is not strictly following D grammar (anything following #line
 *   up to the end of line is matched as special token sequence)
 */function(hljs){/**
   * Language keywords
   *
   * @type {Object}
   */var D_KEYWORDS={keyword:'abstract alias align asm assert auto body break byte case cast catch class '+'const continue debug default delete deprecated do else enum export extern final '+'finally for foreach foreach_reverse|10 goto if immutable import in inout int '+'interface invariant is lazy macro mixin module new nothrow out override package '+'pragma private protected public pure ref return scope shared static struct '+'super switch synchronized template this throw try typedef typeid typeof union '+'unittest version void volatile while with __FILE__ __LINE__ __gshared|10 '+'__thread __traits __DATE__ __EOF__ __TIME__ __TIMESTAMP__ __VENDOR__ __VERSION__',built_in:'bool cdouble cent cfloat char creal dchar delegate double dstring float function '+'idouble ifloat ireal long real short string ubyte ucent uint ulong ushort wchar '+'wstring',literal:'false null true'};/**
   * Number literal regexps
   *
   * @type {String}
   */var decimal_integer_re='(0|[1-9][\\d_]*)',decimal_integer_nosus_re='(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)',binary_integer_re='0[bB][01_]+',hexadecimal_digits_re='([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)',hexadecimal_integer_re='0[xX]'+hexadecimal_digits_re,decimal_exponent_re='([eE][+-]?'+decimal_integer_nosus_re+')',decimal_float_re='('+decimal_integer_nosus_re+'(\\.\\d*|'+decimal_exponent_re+')|'+'\\d+\\.'+decimal_integer_nosus_re+decimal_integer_nosus_re+'|'+'\\.'+decimal_integer_re+decimal_exponent_re+'?'+')',hexadecimal_float_re='(0[xX]('+hexadecimal_digits_re+'\\.'+hexadecimal_digits_re+'|'+'\\.?'+hexadecimal_digits_re+')[pP][+-]?'+decimal_integer_nosus_re+')',integer_re='('+decimal_integer_re+'|'+binary_integer_re+'|'+hexadecimal_integer_re+')',float_re='('+hexadecimal_float_re+'|'+decimal_float_re+')';/**
   * Escape sequence supported in D string and character literals
   *
   * @type {String}
   */var escape_sequence_re='\\\\('+'[\'"\\?\\\\abfnrtv]|'+// common escapes
'u[\\dA-Fa-f]{4}|'+// four hex digit unicode codepoint
'[0-7]{1,3}|'+// one to three octal digit ascii char code
'x[\\dA-Fa-f]{2}|'+// two hex digit ascii char code
'U[\\dA-Fa-f]{8}'+// eight hex digit unicode codepoint
')|'+'&[a-zA-Z\\d]{2,};';// named character entity
/**
   * D integer number literals
   *
   * @type {Object}
   */var D_INTEGER_MODE={className:'number',begin:'\\b'+integer_re+'(L|u|U|Lu|LU|uL|UL)?',relevance:0};/**
   * [D_FLOAT_MODE description]
   * @type {Object}
   */var D_FLOAT_MODE={className:'number',begin:'\\b('+float_re+'([fF]|L|i|[fF]i|Li)?|'+integer_re+'(i|[fF]i|Li)'+')',relevance:0};/**
   * D character literal
   *
   * @type {Object}
   */var D_CHARACTER_MODE={className:'string',begin:'\'('+escape_sequence_re+'|.)',end:'\'',illegal:'.'};/**
   * D string escape sequence
   *
   * @type {Object}
   */var D_ESCAPE_SEQUENCE={begin:escape_sequence_re,relevance:0};/**
   * D double quoted string literal
   *
   * @type {Object}
   */var D_STRING_MODE={className:'string',begin:'"',contains:[D_ESCAPE_SEQUENCE],end:'"[cwd]?'};/**
   * D wysiwyg and delimited string literals
   *
   * @type {Object}
   */var D_WYSIWYG_DELIMITED_STRING_MODE={className:'string',begin:'[rq]"',end:'"[cwd]?',relevance:5};/**
   * D alternate wysiwyg string literal
   *
   * @type {Object}
   */var D_ALTERNATE_WYSIWYG_STRING_MODE={className:'string',begin:'`',end:'`[cwd]?'};/**
   * D hexadecimal string literal
   *
   * @type {Object}
   */var D_HEX_STRING_MODE={className:'string',begin:'x"[\\da-fA-F\\s\\n\\r]*"[cwd]?',relevance:10};/**
   * D delimited string literal
   *
   * @type {Object}
   */var D_TOKEN_STRING_MODE={className:'string',begin:'q"\\{',end:'\\}"'};/**
   * Hashbang support
   *
   * @type {Object}
   */var D_HASHBANG_MODE={className:'meta',begin:'^#!',end:'$',relevance:5};/**
   * D special token sequence
   *
   * @type {Object}
   */var D_SPECIAL_TOKEN_SEQUENCE_MODE={className:'meta',begin:'#(line)',end:'$',relevance:5};/**
   * D attributes
   *
   * @type {Object}
   */var D_ATTRIBUTE_MODE={className:'keyword',begin:'@[a-zA-Z_][a-zA-Z_\\d]*'};/**
   * D nesting comment
   *
   * @type {Object}
   */var D_NESTING_COMMENT_MODE=hljs.COMMENT('\\/\\+','\\+\\/',{contains:['self'],relevance:10});return{lexemes:hljs.UNDERSCORE_IDENT_RE,keywords:D_KEYWORDS,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,D_NESTING_COMMENT_MODE,D_HEX_STRING_MODE,D_STRING_MODE,D_WYSIWYG_DELIMITED_STRING_MODE,D_ALTERNATE_WYSIWYG_STRING_MODE,D_TOKEN_STRING_MODE,D_FLOAT_MODE,D_INTEGER_MODE,D_CHARACTER_MODE,D_HASHBANG_MODE,D_SPECIAL_TOKEN_SEQUENCE_MODE,D_ATTRIBUTE_MODE]};});hljs.registerLanguage('markdown',function(hljs){return{aliases:['md','mkdown','mkd'],contains:[// highlight headers
{className:'section',variants:[{begin:'^#{1,6}',end:'$'},{begin:'^.+?\\n[=-]{2,}$'}]},// inline html
{begin:'<',end:'>',subLanguage:'xml',relevance:0},// lists (indicators only)
{className:'bullet',begin:'^([*+-]|(\\d+\\.))\\s+'},// strong segments
{className:'strong',begin:'[*_]{2}.+?[*_]{2}'},// emphasis segments
{className:'emphasis',variants:[{begin:'\\*.+?\\*'},{begin:'_.+?_',relevance:0}]},// blockquotes
{className:'quote',begin:'^>\\s+',end:'$'},// code snippets
{className:'code',variants:[{begin:'^```\w*\s*$',end:'^```\s*$'},{begin:'`.+?`'},{begin:'^( {4}|\t)',end:'$',relevance:0}]},// horizontal rules
{begin:'^[-\\*]{3,}',end:'$'},// using links - title and link
{begin:'\\[.+?\\][\\(\\[].*?[\\)\\]]',returnBegin:true,contains:[{className:'string',begin:'\\[',end:'\\]',excludeBegin:true,returnEnd:true,relevance:0},{className:'link',begin:'\\]\\(',end:'\\)',excludeBegin:true,excludeEnd:true},{className:'symbol',begin:'\\]\\[',end:'\\]',excludeBegin:true,excludeEnd:true}],relevance:10},{begin:/^\[[^\n]+\]:/,returnBegin:true,contains:[{className:'symbol',begin:/\[/,end:/\]/,excludeBegin:true,excludeEnd:true},{className:'link',begin:/:\s*/,end:/$/,excludeBegin:true}]}]};});hljs.registerLanguage('dart',function(hljs){var SUBST={className:'subst',begin:'\\$\\{',end:'}',keywords:'true false null this is new super'};var STRING={className:'string',variants:[{begin:'r\'\'\'',end:'\'\'\''},{begin:'r"""',end:'"""'},{begin:'r\'',end:'\'',illegal:'\\n'},{begin:'r"',end:'"',illegal:'\\n'},{begin:'\'\'\'',end:'\'\'\'',contains:[hljs.BACKSLASH_ESCAPE,SUBST]},{begin:'"""',end:'"""',contains:[hljs.BACKSLASH_ESCAPE,SUBST]},{begin:'\'',end:'\'',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE,SUBST]},{begin:'"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE,SUBST]}]};SUBST.contains=[hljs.C_NUMBER_MODE,STRING];var KEYWORDS={keyword:'assert async await break case catch class const continue default do else enum extends false final '+'finally for if in is new null rethrow return super switch sync this throw true try var void while with yield '+'abstract as dynamic export external factory get implements import library operator part set static typedef',built_in:// dart:core
'print Comparable DateTime Duration Function Iterable Iterator List Map Match Null Object Pattern RegExp Set '+'Stopwatch String StringBuffer StringSink Symbol Type Uri bool double int num '+// dart:html
'document window querySelector querySelectorAll Element ElementList'};return{keywords:KEYWORDS,contains:[STRING,hljs.COMMENT('/\\*\\*','\\*/',{subLanguage:'markdown'}),hljs.COMMENT('///','$',{subLanguage:'markdown'}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'class',beginKeywords:'class interface',end:'{',excludeEnd:true,contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},hljs.C_NUMBER_MODE,{className:'meta',begin:'@[A-Za-z]+'},{begin:'=>'// No markup, just a relevance booster
}]};});hljs.registerLanguage('delphi',function(hljs){var KEYWORDS='exports register file shl array record property for mod while set ally label uses raise not '+'stored class safecall var interface or private static exit index inherited to else stdcall '+'override shr asm far resourcestring finalization packed virtual out and protected library do '+'xorwrite goto near function end div overload object unit begin string on inline repeat until '+'destructor write message program with read initialization except default nil if case cdecl in '+'downto threadvar of try pascal const external constructor type public then implementation '+'finally published procedure absolute reintroduce operator as is abstract alias assembler '+'bitpacked break continue cppdecl cvar enumerator experimental platform deprecated '+'unimplemented dynamic export far16 forward generic helper implements interrupt iochecks '+'local name nodefault noreturn nostackframe oldfpccall otherwise saveregisters softfloat '+'specialize strict unaligned varargs ';var COMMENT_MODES=[hljs.C_LINE_COMMENT_MODE,hljs.COMMENT(/\{/,/\}/,{relevance:0}),hljs.COMMENT(/\(\*/,/\*\)/,{relevance:10})];var DIRECTIVE={className:'meta',variants:[{begin:/\{\$/,end:/\}/},{begin:/\(\*\$/,end:/\*\)/}]};var STRING={className:'string',begin:/'/,end:/'/,contains:[{begin:/''/}]};var CHAR_STRING={className:'string',begin:/(#\d+)+/};var CLASS={begin:hljs.IDENT_RE+'\\s*=\\s*class\\s*\\(',returnBegin:true,contains:[hljs.TITLE_MODE]};var FUNCTION={className:'function',beginKeywords:'function constructor destructor procedure',end:/[:;]/,keywords:'function constructor|10 destructor|10 procedure|10',contains:[hljs.TITLE_MODE,{className:'params',begin:/\(/,end:/\)/,keywords:KEYWORDS,contains:[STRING,CHAR_STRING,DIRECTIVE].concat(COMMENT_MODES)},DIRECTIVE].concat(COMMENT_MODES)};return{aliases:['dpr','dfm','pas','pascal','freepascal','lazarus','lpr','lfm'],case_insensitive:true,keywords:KEYWORDS,illegal:/"|\$[G-Zg-z]|\/\*|<\/|\|/,contains:[STRING,CHAR_STRING,hljs.NUMBER_MODE,CLASS,FUNCTION,DIRECTIVE].concat(COMMENT_MODES)};});hljs.registerLanguage('diff',function(hljs){return{aliases:['patch'],contains:[{className:'meta',relevance:10,variants:[{begin:/^@@ +\-\d+,\d+ +\+\d+,\d+ +@@$/},{begin:/^\*\*\* +\d+,\d+ +\*\*\*\*$/},{begin:/^\-\-\- +\d+,\d+ +\-\-\-\-$/}]},{className:'comment',variants:[{begin:/Index: /,end:/$/},{begin:/={3,}/,end:/$/},{begin:/^\-{3}/,end:/$/},{begin:/^\*{3} /,end:/$/},{begin:/^\+{3}/,end:/$/},{begin:/\*{5}/,end:/\*{5}$/}]},{className:'addition',begin:'^\\+',end:'$'},{className:'deletion',begin:'^\\-',end:'$'},{className:'addition',begin:'^\\!',end:'$'}]};});hljs.registerLanguage('django',function(hljs){var FILTER={begin:/\|[A-Za-z]+:?/,keywords:{name:'truncatewords removetags linebreaksbr yesno get_digit timesince random striptags '+'filesizeformat escape linebreaks length_is ljust rjust cut urlize fix_ampersands '+'title floatformat capfirst pprint divisibleby add make_list unordered_list urlencode '+'timeuntil urlizetrunc wordcount stringformat linenumbers slice date dictsort '+'dictsortreversed default_if_none pluralize lower join center default '+'truncatewords_html upper length phone2numeric wordwrap time addslashes slugify first '+'escapejs force_escape iriencode last safe safeseq truncatechars localize unlocalize '+'localtime utc timezone'},contains:[hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE]};return{aliases:['jinja'],case_insensitive:true,subLanguage:'xml',contains:[hljs.COMMENT(/\{%\s*comment\s*%}/,/\{%\s*endcomment\s*%}/),hljs.COMMENT(/\{#/,/#}/),{className:'template-tag',begin:/\{%/,end:/%}/,contains:[{className:'name',begin:/\w+/,keywords:{name:'comment endcomment load templatetag ifchanged endifchanged if endif firstof for '+'endfor ifnotequal endifnotequal widthratio extends include spaceless '+'endspaceless regroup ifequal endifequal ssi now with cycle url filter '+'endfilter debug block endblock else autoescape endautoescape csrf_token empty elif '+'endwith static trans blocktrans endblocktrans get_static_prefix get_media_prefix '+'plural get_current_language language get_available_languages '+'get_current_language_bidi get_language_info get_language_info_list localize '+'endlocalize localtime endlocaltime timezone endtimezone get_current_timezone '+'verbatim'},starts:{endsWithParent:true,keywords:'in by as',contains:[FILTER],relevance:0}}]},{className:'template-variable',begin:/\{\{/,end:/}}/,contains:[FILTER]}]};});hljs.registerLanguage('dns',function(hljs){return{aliases:['bind','zone'],keywords:{keyword:'IN A AAAA AFSDB APL CAA CDNSKEY CDS CERT CNAME DHCID DLV DNAME DNSKEY DS HIP IPSECKEY KEY KX '+'LOC MX NAPTR NS NSEC NSEC3 NSEC3PARAM PTR RRSIG RP SIG SOA SRV SSHFP TA TKEY TLSA TSIG TXT'},contains:[hljs.COMMENT(';','$',{relevance:0}),{className:'meta',begin:/^\$(TTL|GENERATE|INCLUDE|ORIGIN)\b/},// IPv6
{className:'number',begin:'((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))\\b'},// IPv4
{className:'number',begin:'((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\b'},hljs.inherit(hljs.NUMBER_MODE,{begin:/\b\d+[dhwm]?/})]};});hljs.registerLanguage('dockerfile',function(hljs){return{aliases:['docker'],case_insensitive:true,keywords:'from maintainer expose env user onbuild',contains:[hljs.HASH_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE,{beginKeywords:'run cmd entrypoint volume add copy workdir label healthcheck',starts:{end:/[^\\]\n/,subLanguage:'bash'}}],illegal:'</'};});hljs.registerLanguage('dos',function(hljs){var COMMENT=hljs.COMMENT(/^\s*@?rem\b/,/$/,{relevance:10});var LABEL={className:'symbol',begin:'^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)',relevance:0};return{aliases:['bat','cmd'],case_insensitive:true,illegal:/\/\*/,keywords:{keyword:'if else goto for in do call exit not exist errorlevel defined '+'equ neq lss leq gtr geq',built_in:'prn nul lpt3 lpt2 lpt1 con com4 com3 com2 com1 aux '+'shift cd dir echo setlocal endlocal set pause copy '+'append assoc at attrib break cacls cd chcp chdir chkdsk chkntfs cls cmd color '+'comp compact convert date dir diskcomp diskcopy doskey erase fs '+'find findstr format ftype graftabl help keyb label md mkdir mode more move path '+'pause print popd pushd promt rd recover rem rename replace restore rmdir shift'+'sort start subst time title tree type ver verify vol '+// winutils
'ping net ipconfig taskkill xcopy ren del'},contains:[{className:'variable',begin:/%%[^ ]|%[^ ]+?%|![^ ]+?!/},{className:'function',begin:LABEL.begin,end:'goto:eof',contains:[hljs.inherit(hljs.TITLE_MODE,{begin:'([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'}),COMMENT]},{className:'number',begin:'\\b\\d+',relevance:0},COMMENT]};});hljs.registerLanguage('dsconfig',function(hljs){var QUOTED_PROPERTY={className:'string',begin:/"/,end:/"/};var APOS_PROPERTY={className:'string',begin:/'/,end:/'/};var UNQUOTED_PROPERTY={className:'string',begin:'[\\w-?]+:\\w+',end:'\\W',relevance:0};var VALUELESS_PROPERTY={className:'string',begin:'\\w+-?\\w+',end:'\\W',relevance:0};return{keywords:'dsconfig',contains:[{className:'keyword',begin:'^dsconfig',end:'\\s',excludeEnd:true,relevance:10},{className:'built_in',begin:'(list|create|get|set|delete)-(\\w+)',end:'\\s',excludeEnd:true,illegal:'!@#$%^&*()',relevance:10},{className:'built_in',begin:'--(\\w+)',end:'\\s',excludeEnd:true},QUOTED_PROPERTY,APOS_PROPERTY,UNQUOTED_PROPERTY,VALUELESS_PROPERTY,hljs.HASH_COMMENT_MODE]};});hljs.registerLanguage('dts',function(hljs){var STRINGS={className:'string',variants:[hljs.inherit(hljs.QUOTE_STRING_MODE,{begin:'((u8?|U)|L)?"'}),{begin:'(u8?|U)?R"',end:'"',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'\'\\\\?.',end:'\'',illegal:'.'}]};var NUMBERS={className:'number',variants:[{begin:'\\b(\\d+(\\.\\d*)?|\\.\\d+)(u|U|l|L|ul|UL|f|F)'},{begin:hljs.C_NUMBER_RE}],relevance:0};var PREPROCESSOR={className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'if else elif endif define undef ifdef ifndef'},contains:[{begin:/\\\n/,relevance:0},{beginKeywords:'include',end:'$',keywords:{'meta-keyword':'include'},contains:[hljs.inherit(STRINGS,{className:'meta-string'}),{className:'meta-string',begin:'<',end:'>',illegal:'\\n'}]},STRINGS,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};var DTS_REFERENCE={className:'variable',begin:'\\&[a-z\\d_]*\\b'};var DTS_KEYWORD={className:'meta-keyword',begin:'/[a-z][a-z\\d-]*/'};var DTS_LABEL={className:'symbol',begin:'^\\s*[a-zA-Z_][a-zA-Z\\d_]*:'};var DTS_CELL_PROPERTY={className:'params',begin:'<',end:'>',contains:[NUMBERS,DTS_REFERENCE]};var DTS_NODE={className:'class',begin:/[a-zA-Z_][a-zA-Z\d_@]*\s{/,end:/[{;=]/,returnBegin:true,excludeEnd:true};var DTS_ROOT_NODE={className:'class',begin:'/\\s*{',end:'};',relevance:10,contains:[DTS_REFERENCE,DTS_KEYWORD,DTS_LABEL,DTS_NODE,DTS_CELL_PROPERTY,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,NUMBERS,STRINGS]};return{keywords:"",contains:[DTS_ROOT_NODE,DTS_REFERENCE,DTS_KEYWORD,DTS_LABEL,DTS_NODE,DTS_CELL_PROPERTY,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,NUMBERS,STRINGS,PREPROCESSOR,{begin:hljs.IDENT_RE+'::',keywords:""}]};});hljs.registerLanguage('dust',function(hljs){var EXPRESSION_KEYWORDS='if eq ne lt lte gt gte select default math sep';return{aliases:['dst'],case_insensitive:true,subLanguage:'xml',contains:[{className:'template-tag',begin:/\{[#\/]/,end:/\}/,illegal:/;/,contains:[{className:'name',begin:/[a-zA-Z\.-]+/,starts:{endsWithParent:true,relevance:0,contains:[hljs.QUOTE_STRING_MODE]}}]},{className:'template-variable',begin:/\{/,end:/\}/,illegal:/;/,keywords:EXPRESSION_KEYWORDS}]};});hljs.registerLanguage('ebnf',function(hljs){var commentMode=hljs.COMMENT(/\(\*/,/\*\)/);var nonTerminalMode={className:"attribute",begin:/^[ ]*[a-zA-Z][a-zA-Z-]*([\s-]+[a-zA-Z][a-zA-Z]*)*/};var specialSequenceMode={className:"meta",begin:/\?.*\?/};var ruleBodyMode={begin:/=/,end:/;/,contains:[commentMode,specialSequenceMode,// terminals
hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]};return{illegal:/\S/,contains:[commentMode,nonTerminalMode,ruleBodyMode]};});hljs.registerLanguage('elixir',function(hljs){var ELIXIR_IDENT_RE='[a-zA-Z_][a-zA-Z0-9_]*(\\!|\\?)?';var ELIXIR_METHOD_RE='[a-zA-Z_]\\w*[!?=]?|[-+~]\\@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?';var ELIXIR_KEYWORDS='and false then defined module in return redo retry end for true self when '+'next until do begin unless nil break not case cond alias while ensure or '+'include use alias fn quote';var SUBST={className:'subst',begin:'#\\{',end:'}',lexemes:ELIXIR_IDENT_RE,keywords:ELIXIR_KEYWORDS};var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/}]};var FUNCTION={className:'function',beginKeywords:'def defp defmacro',end:/\B\b/,// the mode is ended by the title
contains:[hljs.inherit(hljs.TITLE_MODE,{begin:ELIXIR_IDENT_RE,endsParent:true})]};var CLASS=hljs.inherit(FUNCTION,{className:'class',beginKeywords:'defimpl defmodule defprotocol defrecord',end:/\bdo\b|$|;/});var ELIXIR_DEFAULT_CONTAINS=[STRING,hljs.HASH_COMMENT_MODE,CLASS,FUNCTION,{className:'symbol',begin:':(?!\\s)',contains:[STRING,{begin:ELIXIR_METHOD_RE}],relevance:0},{className:'symbol',begin:ELIXIR_IDENT_RE+':',relevance:0},{className:'number',begin:'(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',relevance:0},{className:'variable',begin:'(\\$\\W)|((\\$|\\@\\@?)(\\w+))'},{begin:'->'},{// regexp container
begin:'('+hljs.RE_STARTERS_RE+')\\s*',contains:[hljs.HASH_COMMENT_MODE,{className:'regexp',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:'/',end:'/[a-z]*'},{begin:'%r\\[',end:'\\][a-z]*'}]}],relevance:0}];SUBST.contains=ELIXIR_DEFAULT_CONTAINS;return{lexemes:ELIXIR_IDENT_RE,keywords:ELIXIR_KEYWORDS,contains:ELIXIR_DEFAULT_CONTAINS};});hljs.registerLanguage('elm',function(hljs){var COMMENT={variants:[hljs.COMMENT('--','$'),hljs.COMMENT('{-','-}',{contains:['self']})]};var CONSTRUCTOR={className:'type',begin:'\\b[A-Z][\\w\']*',// TODO: other constructors (built-in, infix).
relevance:0};var LIST={begin:'\\(',end:'\\)',illegal:'"',contains:[{className:'type',begin:'\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'},COMMENT]};var RECORD={begin:'{',end:'}',contains:LIST.contains};return{keywords:'let in if then else case of where module import exposing '+'type alias as infix infixl infixr port effect command subscription',contains:[// Top-level constructions.
{beginKeywords:'port effect module',end:'exposing',keywords:'port effect module where command subscription exposing',contains:[LIST,COMMENT],illegal:'\\W\\.|;'},{begin:'import',end:'$',keywords:'import as exposing',contains:[LIST,COMMENT],illegal:'\\W\\.|;'},{begin:'type',end:'$',keywords:'type alias',contains:[CONSTRUCTOR,LIST,RECORD,COMMENT]},{beginKeywords:'infix infixl infixr',end:'$',contains:[hljs.C_NUMBER_MODE,COMMENT]},{begin:'port',end:'$',keywords:'port',contains:[COMMENT]},// Literals and names.
// TODO: characters.
hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,CONSTRUCTOR,hljs.inherit(hljs.TITLE_MODE,{begin:'^[_a-z][\\w\']*'}),COMMENT,{begin:'->|<-'// No markup, relevance booster
}]};});hljs.registerLanguage('ruby',function(hljs){var RUBY_METHOD_RE='[a-zA-Z_]\\w*[!?=]?|[-+~]\\@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?';var RUBY_KEYWORDS={keyword:'and then defined module in return redo if BEGIN retry end for self when '+'next until do begin unless END rescue else break undef not super class case '+'require yield alias while ensure elsif or include attr_reader attr_writer attr_accessor',literal:'true false nil'};var YARDOCTAG={className:'doctag',begin:'@[A-Za-z]+'};var IRB_OBJECT={begin:'#<',end:'>'};var COMMENT_MODES=[hljs.COMMENT('#','$',{contains:[YARDOCTAG]}),hljs.COMMENT('^\\=begin','^\\=end',{contains:[YARDOCTAG],relevance:10}),hljs.COMMENT('^__END__','\\n$')];var SUBST={className:'subst',begin:'#\\{',end:'}',keywords:RUBY_KEYWORDS};var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,SUBST],variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/},{begin:/`/,end:/`/},{begin:'%[qQwWx]?\\(',end:'\\)'},{begin:'%[qQwWx]?\\[',end:'\\]'},{begin:'%[qQwWx]?{',end:'}'},{begin:'%[qQwWx]?<',end:'>'},{begin:'%[qQwWx]?/',end:'/'},{begin:'%[qQwWx]?%',end:'%'},{begin:'%[qQwWx]?-',end:'-'},{begin:'%[qQwWx]?\\|',end:'\\|'},{// \B in the beginning suppresses recognition of ?-sequences where ?
// is the last character of a preceding identifier, as in: `func?4`
begin:/\B\?(\\\d{1,3}|\\x[A-Fa-f0-9]{1,2}|\\u[A-Fa-f0-9]{4}|\\?\S)\b/},{begin:/<<(-?)\w+$/,end:/^\s*\w+$/}]};var PARAMS={className:'params',begin:'\\(',end:'\\)',endsParent:true,keywords:RUBY_KEYWORDS};var RUBY_DEFAULT_CONTAINS=[STRING,IRB_OBJECT,{className:'class',beginKeywords:'class module',end:'$|;',illegal:/=/,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:'[A-Za-z_]\\w*(::\\w+)*(\\?|\\!)?'}),{begin:'<\\s*',contains:[{begin:'('+hljs.IDENT_RE+'::)?'+hljs.IDENT_RE}]}].concat(COMMENT_MODES)},{className:'function',beginKeywords:'def',end:'$|;',contains:[hljs.inherit(hljs.TITLE_MODE,{begin:RUBY_METHOD_RE}),PARAMS].concat(COMMENT_MODES)},{// swallow namespace qualifiers before symbols
begin:hljs.IDENT_RE+'::'},{className:'symbol',begin:hljs.UNDERSCORE_IDENT_RE+'(\\!|\\?)?:',relevance:0},{className:'symbol',begin:':(?!\\s)',contains:[STRING,{begin:RUBY_METHOD_RE}],relevance:0},{className:'number',begin:'(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',relevance:0},{begin:'(\\$\\W)|((\\$|\\@\\@?)(\\w+))'// variables
},{className:'params',begin:/\|/,end:/\|/,keywords:RUBY_KEYWORDS},{// regexp container
begin:'('+hljs.RE_STARTERS_RE+'|unless)\\s*',contains:[IRB_OBJECT,{className:'regexp',contains:[hljs.BACKSLASH_ESCAPE,SUBST],illegal:/\n/,variants:[{begin:'/',end:'/[a-z]*'},{begin:'%r{',end:'}[a-z]*'},{begin:'%r\\(',end:'\\)[a-z]*'},{begin:'%r!',end:'![a-z]*'},{begin:'%r\\[',end:'\\][a-z]*'}]}].concat(COMMENT_MODES),relevance:0}].concat(COMMENT_MODES);SUBST.contains=RUBY_DEFAULT_CONTAINS;PARAMS.contains=RUBY_DEFAULT_CONTAINS;var SIMPLE_PROMPT="[>?]>";var DEFAULT_PROMPT="[\\w#]+\\(\\w+\\):\\d+:\\d+>";var RVM_PROMPT="(\\w+-)?\\d+\\.\\d+\\.\\d(p\\d+)?[^>]+>";var IRB_DEFAULT=[{begin:/^\s*=>/,starts:{end:'$',contains:RUBY_DEFAULT_CONTAINS}},{className:'meta',begin:'^('+SIMPLE_PROMPT+"|"+DEFAULT_PROMPT+'|'+RVM_PROMPT+')',starts:{end:'$',contains:RUBY_DEFAULT_CONTAINS}}];return{aliases:['rb','gemspec','podspec','thor','irb'],keywords:RUBY_KEYWORDS,illegal:/\/\*/,contains:COMMENT_MODES.concat(IRB_DEFAULT).concat(RUBY_DEFAULT_CONTAINS)};});hljs.registerLanguage('erb',function(hljs){return{subLanguage:'xml',contains:[hljs.COMMENT('<%#','%>'),{begin:'<%[%=-]?',end:'[%-]?%>',subLanguage:'ruby',excludeBegin:true,excludeEnd:true}]};});hljs.registerLanguage('erlang-repl',function(hljs){return{keywords:{built_in:'spawn spawn_link self',keyword:'after and andalso|10 band begin bnot bor bsl bsr bxor case catch cond div end fun if '+'let not of or orelse|10 query receive rem try when xor'},contains:[{className:'meta',begin:'^[0-9]+> ',relevance:10},hljs.COMMENT('%','$'),{className:'number',begin:'\\b(\\d+#[a-fA-F0-9]+|\\d+(\\.\\d+)?([eE][-+]?\\d+)?)',relevance:0},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{begin:'\\?(::)?([A-Z]\\w*(::)?)+'},{begin:'->'},{begin:'ok'},{begin:'!'},{begin:'(\\b[a-z\'][a-zA-Z0-9_\']*:[a-z\'][a-zA-Z0-9_\']*)|(\\b[a-z\'][a-zA-Z0-9_\']*)',relevance:0},{begin:'[A-Z][a-zA-Z0-9_\']*',relevance:0}]};});hljs.registerLanguage('erlang',function(hljs){var BASIC_ATOM_RE='[a-z\'][a-zA-Z0-9_\']*';var FUNCTION_NAME_RE='('+BASIC_ATOM_RE+':'+BASIC_ATOM_RE+'|'+BASIC_ATOM_RE+')';var ERLANG_RESERVED={keyword:'after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if '+'let not of orelse|10 query receive rem try when xor',literal:'false true'};var COMMENT=hljs.COMMENT('%','$');var NUMBER={className:'number',begin:'\\b(\\d+#[a-fA-F0-9]+|\\d+(\\.\\d+)?([eE][-+]?\\d+)?)',relevance:0};var NAMED_FUN={begin:'fun\\s+'+BASIC_ATOM_RE+'/\\d+'};var FUNCTION_CALL={begin:FUNCTION_NAME_RE+'\\(',end:'\\)',returnBegin:true,relevance:0,contains:[{begin:FUNCTION_NAME_RE,relevance:0},{begin:'\\(',end:'\\)',endsWithParent:true,returnEnd:true,relevance:0// "contains" defined later
}]};var TUPLE={begin:'{',end:'}',relevance:0// "contains" defined later
};var VAR1={begin:'\\b_([A-Z][A-Za-z0-9_]*)?',relevance:0};var VAR2={begin:'[A-Z][a-zA-Z0-9_]*',relevance:0};var RECORD_ACCESS={begin:'#'+hljs.UNDERSCORE_IDENT_RE,relevance:0,returnBegin:true,contains:[{begin:'#'+hljs.UNDERSCORE_IDENT_RE,relevance:0},{begin:'{',end:'}',relevance:0// "contains" defined later
}]};var BLOCK_STATEMENTS={beginKeywords:'fun receive if try case',end:'end',keywords:ERLANG_RESERVED};BLOCK_STATEMENTS.contains=[COMMENT,NAMED_FUN,hljs.inherit(hljs.APOS_STRING_MODE,{className:''}),BLOCK_STATEMENTS,FUNCTION_CALL,hljs.QUOTE_STRING_MODE,NUMBER,TUPLE,VAR1,VAR2,RECORD_ACCESS];var BASIC_MODES=[COMMENT,NAMED_FUN,BLOCK_STATEMENTS,FUNCTION_CALL,hljs.QUOTE_STRING_MODE,NUMBER,TUPLE,VAR1,VAR2,RECORD_ACCESS];FUNCTION_CALL.contains[1].contains=BASIC_MODES;TUPLE.contains=BASIC_MODES;RECORD_ACCESS.contains[1].contains=BASIC_MODES;var PARAMS={className:'params',begin:'\\(',end:'\\)',contains:BASIC_MODES};return{aliases:['erl'],keywords:ERLANG_RESERVED,illegal:'(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))',contains:[{className:'function',begin:'^'+BASIC_ATOM_RE+'\\s*\\(',end:'->',returnBegin:true,illegal:'\\(|#|//|/\\*|\\\\|:|;',contains:[PARAMS,hljs.inherit(hljs.TITLE_MODE,{begin:BASIC_ATOM_RE})],starts:{end:';|\\.',keywords:ERLANG_RESERVED,contains:BASIC_MODES}},COMMENT,{begin:'^-',end:'\\.',relevance:0,excludeEnd:true,returnBegin:true,lexemes:'-'+hljs.IDENT_RE,keywords:'-module -record -undef -export -ifdef -ifndef -author -copyright -doc -vsn '+'-import -include -include_lib -compile -define -else -endif -file -behaviour '+'-behavior -spec',contains:[PARAMS]},NUMBER,hljs.QUOTE_STRING_MODE,RECORD_ACCESS,VAR1,VAR2,TUPLE,{begin:/\.$/// relevance booster
}]};});hljs.registerLanguage('excel',function(hljs){return{aliases:['xlsx','xls'],case_insensitive:true,lexemes:/[a-zA-Z][\w\.]*/,// built-in functions imported from https://web.archive.org/web/20160513042710/https://support.office.com/en-us/article/Excel-functions-alphabetical-b3944572-255d-4efb-bb96-c6d90033e188
keywords:{built_in:'ABS ACCRINT ACCRINTM ACOS ACOSH ACOT ACOTH AGGREGATE ADDRESS AMORDEGRC AMORLINC AND ARABIC AREAS ASC ASIN ASINH ATAN ATAN2 ATANH AVEDEV AVERAGE AVERAGEA AVERAGEIF AVERAGEIFS BAHTTEXT BASE BESSELI BESSELJ BESSELK BESSELY BETADIST BETA.DIST BETAINV BETA.INV BIN2DEC BIN2HEX BIN2OCT BINOMDIST BINOM.DIST BINOM.DIST.RANGE BINOM.INV BITAND BITLSHIFT BITOR BITRSHIFT BITXOR CALL CEILING CEILING.MATH CEILING.PRECISE CELL CHAR CHIDIST CHIINV CHITEST CHISQ.DIST CHISQ.DIST.RT CHISQ.INV CHISQ.INV.RT CHISQ.TEST CHOOSE CLEAN CODE COLUMN COLUMNS COMBIN COMBINA COMPLEX CONCAT CONCATENATE CONFIDENCE CONFIDENCE.NORM CONFIDENCE.T CONVERT CORREL COS COSH COT COTH COUNT COUNTA COUNTBLANK COUNTIF COUNTIFS COUPDAYBS COUPDAYS COUPDAYSNC COUPNCD COUPNUM COUPPCD COVAR COVARIANCE.P COVARIANCE.S CRITBINOM CSC CSCH CUBEKPIMEMBER CUBEMEMBER CUBEMEMBERPROPERTY CUBERANKEDMEMBER CUBESET CUBESETCOUNT CUBEVALUE CUMIPMT CUMPRINC DATE DATEDIF DATEVALUE DAVERAGE DAY DAYS DAYS360 DB DBCS DCOUNT DCOUNTA DDB DEC2BIN DEC2HEX DEC2OCT DECIMAL DEGREES DELTA DEVSQ DGET DISC DMAX DMIN DOLLAR DOLLARDE DOLLARFR DPRODUCT DSTDEV DSTDEVP DSUM DURATION DVAR DVARP EDATE EFFECT ENCODEURL EOMONTH ERF ERF.PRECISE ERFC ERFC.PRECISE ERROR.TYPE EUROCONVERT EVEN EXACT EXP EXPON.DIST EXPONDIST FACT FACTDOUBLE FALSE|0 F.DIST FDIST F.DIST.RT FILTERXML FIND FINDB F.INV F.INV.RT FINV FISHER FISHERINV FIXED FLOOR FLOOR.MATH FLOOR.PRECISE FORECAST FORECAST.ETS FORECAST.ETS.CONFINT FORECAST.ETS.SEASONALITY FORECAST.ETS.STAT FORECAST.LINEAR FORMULATEXT FREQUENCY F.TEST FTEST FV FVSCHEDULE GAMMA GAMMA.DIST GAMMADIST GAMMA.INV GAMMAINV GAMMALN GAMMALN.PRECISE GAUSS GCD GEOMEAN GESTEP GETPIVOTDATA GROWTH HARMEAN HEX2BIN HEX2DEC HEX2OCT HLOOKUP HOUR HYPERLINK HYPGEOM.DIST HYPGEOMDIST IF|0 IFERROR IFNA IFS IMABS IMAGINARY IMARGUMENT IMCONJUGATE IMCOS IMCOSH IMCOT IMCSC IMCSCH IMDIV IMEXP IMLN IMLOG10 IMLOG2 IMPOWER IMPRODUCT IMREAL IMSEC IMSECH IMSIN IMSINH IMSQRT IMSUB IMSUM IMTAN INDEX INDIRECT INFO INT INTERCEPT INTRATE IPMT IRR ISBLANK ISERR ISERROR ISEVEN ISFORMULA ISLOGICAL ISNA ISNONTEXT ISNUMBER ISODD ISREF ISTEXT ISO.CEILING ISOWEEKNUM ISPMT JIS KURT LARGE LCM LEFT LEFTB LEN LENB LINEST LN LOG LOG10 LOGEST LOGINV LOGNORM.DIST LOGNORMDIST LOGNORM.INV LOOKUP LOWER MATCH MAX MAXA MAXIFS MDETERM MDURATION MEDIAN MID MIDBs MIN MINIFS MINA MINUTE MINVERSE MIRR MMULT MOD MODE MODE.MULT MODE.SNGL MONTH MROUND MULTINOMIAL MUNIT N NA NEGBINOM.DIST NEGBINOMDIST NETWORKDAYS NETWORKDAYS.INTL NOMINAL NORM.DIST NORMDIST NORMINV NORM.INV NORM.S.DIST NORMSDIST NORM.S.INV NORMSINV NOT NOW NPER NPV NUMBERVALUE OCT2BIN OCT2DEC OCT2HEX ODD ODDFPRICE ODDFYIELD ODDLPRICE ODDLYIELD OFFSET OR PDURATION PEARSON PERCENTILE.EXC PERCENTILE.INC PERCENTILE PERCENTRANK.EXC PERCENTRANK.INC PERCENTRANK PERMUT PERMUTATIONA PHI PHONETIC PI PMT POISSON.DIST POISSON POWER PPMT PRICE PRICEDISC PRICEMAT PROB PRODUCT PROPER PV QUARTILE QUARTILE.EXC QUARTILE.INC QUOTIENT RADIANS RAND RANDBETWEEN RANK.AVG RANK.EQ RANK RATE RECEIVED REGISTER.ID REPLACE REPLACEB REPT RIGHT RIGHTB ROMAN ROUND ROUNDDOWN ROUNDUP ROW ROWS RRI RSQ RTD SEARCH SEARCHB SEC SECH SECOND SERIESSUM SHEET SHEETS SIGN SIN SINH SKEW SKEW.P SLN SLOPE SMALL SQL.REQUEST SQRT SQRTPI STANDARDIZE STDEV STDEV.P STDEV.S STDEVA STDEVP STDEVPA STEYX SUBSTITUTE SUBTOTAL SUM SUMIF SUMIFS SUMPRODUCT SUMSQ SUMX2MY2 SUMX2PY2 SUMXMY2 SWITCH SYD T TAN TANH TBILLEQ TBILLPRICE TBILLYIELD T.DIST T.DIST.2T T.DIST.RT TDIST TEXT TEXTJOIN TIME TIMEVALUE T.INV T.INV.2T TINV TODAY TRANSPOSE TREND TRIM TRIMMEAN TRUE|0 TRUNC T.TEST TTEST TYPE UNICHAR UNICODE UPPER VALUE VAR VAR.P VAR.S VARA VARP VARPA VDB VLOOKUP WEBSERVICE WEEKDAY WEEKNUM WEIBULL WEIBULL.DIST WORKDAY WORKDAY.INTL XIRR XNPV XOR YEAR YEARFRAC YIELD YIELDDISC YIELDMAT Z.TEST ZTEST'},contains:[{/* matches a beginning equal sign found in Excel formula examples */begin:/^=/,end:/[^=]/,returnEnd:true,illegal:/=/,/* only allow single equal sign at front of line */relevance:10},/* technically, there can be more than 2 letters in column names, but this prevents conflict with some keywords */{/* matches a reference to a single cell */className:'symbol',begin:/\b[A-Z]{1,2}\d+\b/,end:/[^\d]/,excludeEnd:true,relevance:0},{/* matches a reference to a range of cells */className:'symbol',begin:/[A-Z]{0,2}\d*:[A-Z]{0,2}\d*/,relevance:0},hljs.BACKSLASH_ESCAPE,hljs.QUOTE_STRING_MODE,{className:'number',begin:hljs.NUMBER_RE+'(%)?',relevance:0},/* Excel formula comments are done by putting the comment in a function call to N() */hljs.COMMENT(/\bN\(/,/\)/,{excludeBegin:true,excludeEnd:true,illegal:/\n/})]};});hljs.registerLanguage('fix',function(hljs){return{contains:[{begin:/[^\u2401\u0001]+/,end:/[\u2401\u0001]/,excludeEnd:true,returnBegin:true,returnEnd:false,contains:[{begin:/([^\u2401\u0001=]+)/,end:/=([^\u2401\u0001=]+)/,returnEnd:true,returnBegin:false,className:'attr'},{begin:/=/,end:/([\u2401\u0001])/,excludeEnd:true,excludeBegin:true,className:'string'}]}],case_insensitive:true};});hljs.registerLanguage('flix',function(hljs){var CHAR={className:'string',begin:/'(.|\\[xXuU][a-zA-Z0-9]+)'/};var STRING={className:'string',variants:[{begin:'"',end:'"'}]};var NAME={className:'title',begin:/[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/};var METHOD={className:'function',beginKeywords:'def',end:/[:={\[(\n;]/,excludeEnd:true,contains:[NAME]};return{keywords:{literal:'true false',keyword:'case class def else enum if impl import in lat rel index let match namespace switch type yield with'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,CHAR,STRING,METHOD,hljs.C_NUMBER_MODE]};});hljs.registerLanguage('fortran',function(hljs){var PARAMS={className:'params',begin:'\\(',end:'\\)'};var F_KEYWORDS={literal:'.False. .True.',keyword:'kind do while private call intrinsic where elsewhere '+'type endtype endmodule endselect endinterface end enddo endif if forall endforall only contains default return stop then '+'public subroutine|10 function program .and. .or. .not. .le. .eq. .ge. .gt. .lt. '+'goto save else use module select case '+'access blank direct exist file fmt form formatted iostat name named nextrec number opened rec recl sequential status unformatted unit '+'continue format pause cycle exit '+'c_null_char c_alert c_backspace c_form_feed flush wait decimal round iomsg '+'synchronous nopass non_overridable pass protected volatile abstract extends import '+'non_intrinsic value deferred generic final enumerator class associate bind enum '+'c_int c_short c_long c_long_long c_signed_char c_size_t c_int8_t c_int16_t c_int32_t c_int64_t c_int_least8_t c_int_least16_t '+'c_int_least32_t c_int_least64_t c_int_fast8_t c_int_fast16_t c_int_fast32_t c_int_fast64_t c_intmax_t C_intptr_t c_float c_double '+'c_long_double c_float_complex c_double_complex c_long_double_complex c_bool c_char c_null_ptr c_null_funptr '+'c_new_line c_carriage_return c_horizontal_tab c_vertical_tab iso_c_binding c_loc c_funloc c_associated  c_f_pointer '+'c_ptr c_funptr iso_fortran_env character_storage_size error_unit file_storage_size input_unit iostat_end iostat_eor '+'numeric_storage_size output_unit c_f_procpointer ieee_arithmetic ieee_support_underflow_control '+'ieee_get_underflow_mode ieee_set_underflow_mode newunit contiguous recursive '+'pad position action delim readwrite eor advance nml interface procedure namelist include sequence elemental pure '+'integer real character complex logical dimension allocatable|10 parameter '+'external implicit|10 none double precision assign intent optional pointer '+'target in out common equivalence data',built_in:'alog alog10 amax0 amax1 amin0 amin1 amod cabs ccos cexp clog csin csqrt dabs dacos dasin datan datan2 dcos dcosh ddim dexp dint '+'dlog dlog10 dmax1 dmin1 dmod dnint dsign dsin dsinh dsqrt dtan dtanh float iabs idim idint idnint ifix isign max0 max1 min0 min1 sngl '+'algama cdabs cdcos cdexp cdlog cdsin cdsqrt cqabs cqcos cqexp cqlog cqsin cqsqrt dcmplx dconjg derf derfc dfloat dgamma dimag dlgama '+'iqint qabs qacos qasin qatan qatan2 qcmplx qconjg qcos qcosh qdim qerf qerfc qexp qgamma qimag qlgama qlog qlog10 qmax1 qmin1 qmod '+'qnint qsign qsin qsinh qsqrt qtan qtanh abs acos aimag aint anint asin atan atan2 char cmplx conjg cos cosh exp ichar index int log '+'log10 max min nint sign sin sinh sqrt tan tanh print write dim lge lgt lle llt mod nullify allocate deallocate '+'adjustl adjustr all allocated any associated bit_size btest ceiling count cshift date_and_time digits dot_product '+'eoshift epsilon exponent floor fraction huge iand ibclr ibits ibset ieor ior ishft ishftc lbound len_trim matmul '+'maxexponent maxloc maxval merge minexponent minloc minval modulo mvbits nearest pack present product '+'radix random_number random_seed range repeat reshape rrspacing scale scan selected_int_kind selected_real_kind '+'set_exponent shape size spacing spread sum system_clock tiny transpose trim ubound unpack verify achar iachar transfer '+'dble entry dprod cpu_time command_argument_count get_command get_command_argument get_environment_variable is_iostat_end '+'ieee_arithmetic ieee_support_underflow_control ieee_get_underflow_mode ieee_set_underflow_mode '+'is_iostat_eor move_alloc new_line selected_char_kind same_type_as extends_type_of'+'acosh asinh atanh bessel_j0 bessel_j1 bessel_jn bessel_y0 bessel_y1 bessel_yn erf erfc erfc_scaled gamma log_gamma hypot norm2 '+'atomic_define atomic_ref execute_command_line leadz trailz storage_size merge_bits '+'bge bgt ble blt dshiftl dshiftr findloc iall iany iparity image_index lcobound ucobound maskl maskr '+'num_images parity popcnt poppar shifta shiftl shiftr this_image'};return{case_insensitive:true,aliases:['f90','f95'],keywords:F_KEYWORDS,illegal:/\/\*/,contains:[hljs.inherit(hljs.APOS_STRING_MODE,{className:'string',relevance:0}),hljs.inherit(hljs.QUOTE_STRING_MODE,{className:'string',relevance:0}),{className:'function',beginKeywords:'subroutine function program',illegal:'[${=\\n]',contains:[hljs.UNDERSCORE_TITLE_MODE,PARAMS]},hljs.COMMENT('!','$',{relevance:0}),{className:'number',begin:'(?=\\b|\\+|\\-|\\.)(?=\\.\\d|\\d)(?:\\d+)?(?:\\.?\\d*)(?:[de][+-]?\\d+)?\\b\\.?',relevance:0}]};});hljs.registerLanguage('fsharp',function(hljs){var TYPEPARAM={begin:'<',end:'>',contains:[hljs.inherit(hljs.TITLE_MODE,{begin:/'[a-zA-Z0-9_]+/})]};return{aliases:['fs'],keywords:'abstract and as assert base begin class default delegate do done '+'downcast downto elif else end exception extern false finally for '+'fun function global if in inherit inline interface internal lazy let '+'match member module mutable namespace new null of open or '+'override private public rec return sig static struct then to '+'true try type upcast use val void when while with yield',illegal:/\/\*/,contains:[{// monad builder keywords (matches before non-bang kws)
className:'keyword',begin:/\b(yield|return|let|do)!/},{className:'string',begin:'@"',end:'"',contains:[{begin:'""'}]},{className:'string',begin:'"""',end:'"""'},hljs.COMMENT('\\(\\*','\\*\\)'),{className:'class',beginKeywords:'type',end:'\\(|=|$',excludeEnd:true,contains:[hljs.UNDERSCORE_TITLE_MODE,TYPEPARAM]},{className:'meta',begin:'\\[<',end:'>\\]',relevance:10},{className:'symbol',begin:'\\B(\'[A-Za-z])\\b',contains:[hljs.BACKSLASH_ESCAPE]},hljs.C_LINE_COMMENT_MODE,hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),hljs.C_NUMBER_MODE]};});hljs.registerLanguage('gams',function(hljs){var KEYWORDS={'keyword':'abort acronym acronyms alias all and assign binary card diag display '+'else eq file files for free ge gt if integer le loop lt maximizing '+'minimizing model models ne negative no not option options or ord '+'positive prod put putpage puttl repeat sameas semicont semiint smax '+'smin solve sos1 sos2 sum system table then until using while xor yes','literal':'eps inf na','built-in':'abs arccos arcsin arctan arctan2 Beta betaReg binomial ceil centropy '+'cos cosh cvPower div div0 eDist entropy errorf execSeed exp fact '+'floor frac gamma gammaReg log logBeta logGamma log10 log2 mapVal max '+'min mod ncpCM ncpF ncpVUpow ncpVUsin normal pi poly power '+'randBinomial randLinear randTriangle round rPower sigmoid sign '+'signPower sin sinh slexp sllog10 slrec sqexp sqlog10 sqr sqrec sqrt '+'tan tanh trunc uniform uniformInt vcPower bool_and bool_eqv bool_imp '+'bool_not bool_or bool_xor ifThen rel_eq rel_ge rel_gt rel_le rel_lt '+'rel_ne gday gdow ghour gleap gmillisec gminute gmonth gsecond gyear '+'jdate jnow jstart jtime errorLevel execError gamsRelease gamsVersion '+'handleCollect handleDelete handleStatus handleSubmit heapFree '+'heapLimit heapSize jobHandle jobKill jobStatus jobTerminate '+'licenseLevel licenseStatus maxExecError sleep timeClose timeComp '+'timeElapsed timeExec timeStart'};var PARAMS={className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true};var SYMBOLS={className:'symbol',variants:[{begin:/\=[lgenxc]=/},{begin:/\$/}]};var QSTR={// One-line quoted comment string
className:'comment',variants:[{begin:'\'',end:'\''},{begin:'"',end:'"'}],illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]};var ASSIGNMENT={begin:'/',end:'/',keywords:KEYWORDS,contains:[QSTR,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,hljs.C_NUMBER_MODE]};var DESCTEXT={// Parameter/set/variable description text
begin:/[a-z][a-z0-9_]*(\([a-z0-9_, ]*\))?[ \t]+/,excludeBegin:true,end:'$',endsWithParent:true,contains:[QSTR,ASSIGNMENT,{className:'comment',begin:/([ ]*[a-z0-9&#*=?@>\\<:\-,()$\[\]_.{}!+%^]+)+/,relevance:0}]};return{aliases:['gms'],case_insensitive:true,keywords:KEYWORDS,contains:[hljs.COMMENT(/^\$ontext/,/^\$offtext/),{className:'meta',begin:'^\\$[a-z0-9]+',end:'$',returnBegin:true,contains:[{className:'meta-keyword',begin:'^\\$[a-z0-9]+'}]},hljs.COMMENT('^\\*','$'),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,// Declarations
{beginKeywords:'set sets parameter parameters variable variables '+'scalar scalars equation equations',end:';',contains:[hljs.COMMENT('^\\*','$'),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,ASSIGNMENT,DESCTEXT]},{// table environment
beginKeywords:'table',end:';',returnBegin:true,contains:[{// table header row
beginKeywords:'table',end:'$',contains:[DESCTEXT]},hljs.COMMENT('^\\*','$'),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,hljs.C_NUMBER_MODE]},// Function definitions
{className:'function',begin:/^[a-z][a-z0-9_,\-+' ()$]+\.{2}/,returnBegin:true,contains:[{// Function title
className:'title',begin:/^[a-z][a-z0-9_]+/},PARAMS,SYMBOLS]},hljs.C_NUMBER_MODE,SYMBOLS]};});hljs.registerLanguage('gauss',function(hljs){var KEYWORDS={keyword:'and bool break call callexe checkinterrupt clear clearg closeall cls comlog compile '+'continue create debug declare delete disable dlibrary dllcall do dos ed edit else '+'elseif enable end endfor endif endp endo errorlog errorlogat expr external fn '+'for format goto gosub graph if keyword let lib library line load loadarray loadexe '+'loadf loadk loadm loadp loads loadx local locate loopnextindex lprint lpwidth lshow '+'matrix msym ndpclex new not open or output outwidth plot plotsym pop prcsn print '+'printdos proc push retp return rndcon rndmod rndmult rndseed run save saveall screen '+'scroll setarray show sparse stop string struct system trace trap threadfor '+'threadendfor threadbegin threadjoin threadstat threadend until use while winprint',built_in:'abs acf aconcat aeye amax amean AmericanBinomCall AmericanBinomCall_Greeks AmericanBinomCall_ImpVol '+'AmericanBinomPut AmericanBinomPut_Greeks AmericanBinomPut_ImpVol AmericanBSCall AmericanBSCall_Greeks '+'AmericanBSCall_ImpVol AmericanBSPut AmericanBSPut_Greeks AmericanBSPut_ImpVol amin amult annotationGetDefaults '+'annotationSetBkd annotationSetFont annotationSetLineColor annotationSetLineStyle annotationSetLineThickness '+'annualTradingDays arccos arcsin areshape arrayalloc arrayindex arrayinit arraytomat asciiload asclabel astd '+'astds asum atan atan2 atranspose axmargin balance band bandchol bandcholsol bandltsol bandrv bandsolpd bar '+'base10 begwind besselj bessely beta box boxcox cdfBeta cdfBetaInv cdfBinomial cdfBinomialInv cdfBvn cdfBvn2 '+'cdfBvn2e cdfCauchy cdfCauchyInv cdfChic cdfChii cdfChinc cdfChincInv cdfExp cdfExpInv cdfFc cdfFnc cdfFncInv '+'cdfGam cdfGenPareto cdfHyperGeo cdfLaplace cdfLaplaceInv cdfLogistic cdfLogisticInv cdfmControlCreate cdfMvn '+'cdfMvn2e cdfMvnce cdfMvne cdfMvt2e cdfMvtce cdfMvte cdfN cdfN2 cdfNc cdfNegBinomial cdfNegBinomialInv cdfNi '+'cdfPoisson cdfPoissonInv cdfRayleigh cdfRayleighInv cdfTc cdfTci cdfTnc cdfTvn cdfWeibull cdfWeibullInv cdir '+'ceil ChangeDir chdir chiBarSquare chol choldn cholsol cholup chrs close code cols colsf combinate combinated '+'complex con cond conj cons ConScore contour conv convertsatostr convertstrtosa corrm corrms corrvc corrx corrxs '+'cos cosh counts countwts crossprd crout croutp csrcol csrlin csvReadM csvReadSA cumprodc cumsumc curve cvtos '+'datacreate datacreatecomplex datalist dataload dataloop dataopen datasave date datestr datestring datestrymd '+'dayinyr dayofweek dbAddDatabase dbClose dbCommit dbCreateQuery dbExecQuery dbGetConnectOptions dbGetDatabaseName '+'dbGetDriverName dbGetDrivers dbGetHostName dbGetLastErrorNum dbGetLastErrorText dbGetNumericalPrecPolicy '+'dbGetPassword dbGetPort dbGetTableHeaders dbGetTables dbGetUserName dbHasFeature dbIsDriverAvailable dbIsOpen '+'dbIsOpenError dbOpen dbQueryBindValue dbQueryClear dbQueryCols dbQueryExecPrepared dbQueryFetchAllM dbQueryFetchAllSA '+'dbQueryFetchOneM dbQueryFetchOneSA dbQueryFinish dbQueryGetBoundValue dbQueryGetBoundValues dbQueryGetField '+'dbQueryGetLastErrorNum dbQueryGetLastErrorText dbQueryGetLastInsertID dbQueryGetLastQuery dbQueryGetPosition '+'dbQueryIsActive dbQueryIsForwardOnly dbQueryIsNull dbQueryIsSelect dbQueryIsValid dbQueryPrepare dbQueryRows '+'dbQuerySeek dbQuerySeekFirst dbQuerySeekLast dbQuerySeekNext dbQuerySeekPrevious dbQuerySetForwardOnly '+'dbRemoveDatabase dbRollback dbSetConnectOptions dbSetDatabaseName dbSetHostName dbSetNumericalPrecPolicy '+'dbSetPort dbSetUserName dbTransaction DeleteFile delif delrows denseToSp denseToSpRE denToZero design det detl '+'dfft dffti diag diagrv digamma doswin DOSWinCloseall DOSWinOpen dotfeq dotfeqmt dotfge dotfgemt dotfgt dotfgtmt '+'dotfle dotflemt dotflt dotfltmt dotfne dotfnemt draw drop dsCreate dstat dstatmt dstatmtControlCreate dtdate dtday '+'dttime dttodtv dttostr dttoutc dtvnormal dtvtodt dtvtoutc dummy dummybr dummydn eig eigh eighv eigv elapsedTradingDays '+'endwind envget eof eqSolve eqSolvemt eqSolvemtControlCreate eqSolvemtOutCreate eqSolveset erf erfc erfccplx erfcplx error '+'etdays ethsec etstr EuropeanBinomCall EuropeanBinomCall_Greeks EuropeanBinomCall_ImpVol EuropeanBinomPut '+'EuropeanBinomPut_Greeks EuropeanBinomPut_ImpVol EuropeanBSCall EuropeanBSCall_Greeks EuropeanBSCall_ImpVol '+'EuropeanBSPut EuropeanBSPut_Greeks EuropeanBSPut_ImpVol exctsmpl exec execbg exp extern eye fcheckerr fclearerr feq '+'feqmt fflush fft ffti fftm fftmi fftn fge fgemt fgets fgetsa fgetsat fgetst fgt fgtmt fileinfo filesa fle flemt '+'floor flt fltmt fmod fne fnemt fonts fopen formatcv formatnv fputs fputst fseek fstrerror ftell ftocv ftos ftostrC '+'gamma gammacplx gammaii gausset gdaAppend gdaCreate gdaDStat gdaDStatMat gdaGetIndex gdaGetName gdaGetNames gdaGetOrders '+'gdaGetType gdaGetTypes gdaGetVarInfo gdaIsCplx gdaLoad gdaPack gdaRead gdaReadByIndex gdaReadSome gdaReadSparse '+'gdaReadStruct gdaReportVarInfo gdaSave gdaUpdate gdaUpdateAndPack gdaVars gdaWrite gdaWrite32 gdaWriteSome getarray '+'getdims getf getGAUSShome getmatrix getmatrix4D getname getnamef getNextTradingDay getNextWeekDay getnr getorders '+'getpath getPreviousTradingDay getPreviousWeekDay getRow getscalar3D getscalar4D getTrRow getwind glm gradcplx gradMT '+'gradMTm gradMTT gradMTTm gradp graphprt graphset hasimag header headermt hess hessMT hessMTg hessMTgw hessMTm '+'hessMTmw hessMTT hessMTTg hessMTTgw hessMTTm hessMTw hessp hist histf histp hsec imag indcv indexcat indices indices2 '+'indicesf indicesfn indnv indsav integrate1d integrateControlCreate intgrat2 intgrat3 inthp1 inthp2 inthp3 inthp4 '+'inthpControlCreate intquad1 intquad2 intquad3 intrleav intrleavsa intrsect intsimp inv invpd invswp iscplx iscplxf '+'isden isinfnanmiss ismiss key keyav keyw lag lag1 lagn lapEighb lapEighi lapEighvb lapEighvi lapgEig lapgEigh lapgEighv '+'lapgEigv lapgSchur lapgSvdcst lapgSvds lapgSvdst lapSvdcusv lapSvds lapSvdusv ldlp ldlsol linSolve listwise ln lncdfbvn '+'lncdfbvn2 lncdfmvn lncdfn lncdfn2 lncdfnc lnfact lngammacplx lnpdfmvn lnpdfmvt lnpdfn lnpdft loadd loadstruct loadwind '+'loess loessmt loessmtControlCreate log loglog logx logy lower lowmat lowmat1 ltrisol lu lusol machEpsilon make makevars '+'makewind margin matalloc matinit mattoarray maxbytes maxc maxindc maxv maxvec mbesselei mbesselei0 mbesselei1 mbesseli '+'mbesseli0 mbesseli1 meanc median mergeby mergevar minc minindc minv miss missex missrv moment momentd movingave '+'movingaveExpwgt movingaveWgt nextindex nextn nextnevn nextwind ntos null null1 numCombinations ols olsmt olsmtControlCreate '+'olsqr olsqr2 olsqrmt ones optn optnevn orth outtyp pacf packedToSp packr parse pause pdfCauchy pdfChi pdfExp pdfGenPareto '+'pdfHyperGeo pdfLaplace pdfLogistic pdfn pdfPoisson pdfRayleigh pdfWeibull pi pinv pinvmt plotAddArrow plotAddBar plotAddBox '+'plotAddHist plotAddHistF plotAddHistP plotAddPolar plotAddScatter plotAddShape plotAddTextbox plotAddTS plotAddXY plotArea '+'plotBar plotBox plotClearLayout plotContour plotCustomLayout plotGetDefaults plotHist plotHistF plotHistP plotLayout '+'plotLogLog plotLogX plotLogY plotOpenWindow plotPolar plotSave plotScatter plotSetAxesPen plotSetBar plotSetBarFill '+'plotSetBarStacked plotSetBkdColor plotSetFill plotSetGrid plotSetLegend plotSetLineColor plotSetLineStyle plotSetLineSymbol '+'plotSetLineThickness plotSetNewWindow plotSetTitle plotSetWhichYAxis plotSetXAxisShow plotSetXLabel plotSetXRange '+'plotSetXTicInterval plotSetXTicLabel plotSetYAxisShow plotSetYLabel plotSetYRange plotSetZAxisShow plotSetZLabel '+'plotSurface plotTS plotXY polar polychar polyeval polygamma polyint polymake polymat polymroot polymult polyroot '+'pqgwin previousindex princomp printfm printfmt prodc psi putarray putf putvals pvCreate pvGetIndex pvGetParNames '+'pvGetParVector pvLength pvList pvPack pvPacki pvPackm pvPackmi pvPacks pvPacksi pvPacksm pvPacksmi pvPutParVector '+'pvTest pvUnpack QNewton QNewtonmt QNewtonmtControlCreate QNewtonmtOutCreate QNewtonSet QProg QProgmt QProgmtInCreate '+'qqr qqre qqrep qr qre qrep qrsol qrtsol qtyr qtyre qtyrep quantile quantiled qyr qyre qyrep qz rank rankindx readr '+'real reclassify reclassifyCuts recode recserar recsercp recserrc rerun rescale reshape rets rev rfft rffti rfftip rfftn '+'rfftnp rfftp rndBernoulli rndBeta rndBinomial rndCauchy rndChiSquare rndCon rndCreateState rndExp rndGamma rndGeo rndGumbel '+'rndHyperGeo rndi rndKMbeta rndKMgam rndKMi rndKMn rndKMnb rndKMp rndKMu rndKMvm rndLaplace rndLCbeta rndLCgam rndLCi rndLCn '+'rndLCnb rndLCp rndLCu rndLCvm rndLogNorm rndMTu rndMVn rndMVt rndn rndnb rndNegBinomial rndp rndPoisson rndRayleigh '+'rndStateSkip rndu rndvm rndWeibull rndWishart rotater round rows rowsf rref sampleData satostrC saved saveStruct savewind '+'scale scale3d scalerr scalinfnanmiss scalmiss schtoc schur searchsourcepath seekr select selif seqa seqm setdif setdifsa '+'setvars setvwrmode setwind shell shiftr sin singleindex sinh sleep solpd sortc sortcc sortd sorthc sorthcc sortind '+'sortindc sortmc sortr sortrc spBiconjGradSol spChol spConjGradSol spCreate spDenseSubmat spDiagRvMat spEigv spEye spLDL '+'spline spLU spNumNZE spOnes spreadSheetReadM spreadSheetReadSA spreadSheetWrite spScale spSubmat spToDense spTrTDense '+'spTScalar spZeros sqpSolve sqpSolveMT sqpSolveMTControlCreate sqpSolveMTlagrangeCreate sqpSolveMToutCreate sqpSolveSet '+'sqrt statements stdc stdsc stocv stof strcombine strindx strlen strput strrindx strsect strsplit strsplitPad strtodt '+'strtof strtofcplx strtriml strtrimr strtrunc strtruncl strtruncpad strtruncr submat subscat substute subvec sumc sumr '+'surface svd svd1 svd2 svdcusv svds svdusv sysstate tab tan tanh tempname threadBegin threadEnd threadEndFor threadFor '+'threadJoin threadStat time timedt timestr timeutc title tkf2eps tkf2ps tocart todaydt toeplitz token topolar trapchk '+'trigamma trimr trunc type typecv typef union unionsa uniqindx uniqindxsa unique uniquesa upmat upmat1 upper utctodt '+'utctodtv utrisol vals varCovMS varCovXS varget vargetl varmall varmares varput varputl vartypef vcm vcms vcx vcxs '+'vec vech vecr vector vget view viewxyz vlist vnamecv volume vput vread vtypecv wait waitc walkindex where window '+'writer xlabel xlsGetSheetCount xlsGetSheetSize xlsGetSheetTypes xlsMakeRange xlsReadM xlsReadSA xlsWrite xlsWriteM '+'xlsWriteSA xpnd xtics xy xyz ylabel ytics zeros zeta zlabel ztics cdfEmpirical dot h5create h5open h5read h5readAttribute '+'h5write h5writeAttribute ldl plotAddErrorBar plotAddSurface plotCDFEmpirical plotSetColormap plotSetContourLabels '+'plotSetLegendFont plotSetTextInterpreter plotSetXTicCount plotSetYTicCount plotSetZLevels powerm strjoin strtrim sylvester',literal:'DB_AFTER_LAST_ROW DB_ALL_TABLES DB_BATCH_OPERATIONS DB_BEFORE_FIRST_ROW DB_BLOB DB_EVENT_NOTIFICATIONS '+'DB_FINISH_QUERY DB_HIGH_PRECISION DB_LAST_INSERT_ID DB_LOW_PRECISION_DOUBLE DB_LOW_PRECISION_INT32 '+'DB_LOW_PRECISION_INT64 DB_LOW_PRECISION_NUMBERS DB_MULTIPLE_RESULT_SETS DB_NAMED_PLACEHOLDERS '+'DB_POSITIONAL_PLACEHOLDERS DB_PREPARED_QUERIES DB_QUERY_SIZE DB_SIMPLE_LOCKING DB_SYSTEM_TABLES DB_TABLES '+'DB_TRANSACTIONS DB_UNICODE DB_VIEWS'};var PREPROCESSOR={className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'define definecs|10 undef ifdef ifndef iflight ifdllcall ifmac ifos2win ifunix else endif lineson linesoff srcfile srcline'},contains:[{begin:/\\\n/,relevance:0},{beginKeywords:'include',end:'$',keywords:{'meta-keyword':'include'},contains:[{className:'meta-string',begin:'"',end:'"',illegal:'\\n'}]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};var FUNCTION_TITLE=hljs.UNDERSCORE_IDENT_RE+'\\s*\\(?';var PARSE_PARAMS=[{className:'params',begin:/\(/,end:/\)/,keywords:KEYWORDS,relevance:0,contains:[hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]}];return{aliases:['gss'],case_insensitive:true,// language is case-insensitive
keywords:KEYWORDS,illegal:'(\\{[%#]|[%#]\\})',contains:[hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.COMMENT('@','@'),PREPROCESSOR,{className:'string',begin:'"',end:'"',contains:[hljs.BACKSLASH_ESCAPE]},{className:'function',beginKeywords:'proc keyword',end:';',excludeEnd:true,keywords:KEYWORDS,contains:[{begin:FUNCTION_TITLE,returnBegin:true,contains:[hljs.UNDERSCORE_TITLE_MODE],relevance:0},hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,PREPROCESSOR].concat(PARSE_PARAMS)},{className:'function',beginKeywords:'fn',end:';',excludeEnd:true,keywords:KEYWORDS,contains:[{begin:FUNCTION_TITLE+hljs.IDENT_RE+'\\)?\\s*\\=\\s*',returnBegin:true,contains:[hljs.UNDERSCORE_TITLE_MODE],relevance:0},hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE].concat(PARSE_PARAMS)},{className:'function',begin:'\\bexternal (proc|keyword|fn)\\s+',end:';',excludeEnd:true,keywords:KEYWORDS,contains:[{begin:FUNCTION_TITLE,returnBegin:true,contains:[hljs.UNDERSCORE_TITLE_MODE],relevance:0},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},{className:'function',begin:'\\bexternal (matrix|string|array|sparse matrix|struct '+hljs.IDENT_RE+')\\s+',end:';',excludeEnd:true,keywords:KEYWORDS,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]}]};});hljs.registerLanguage('gcode',function(hljs){var GCODE_IDENT_RE='[A-Z_][A-Z0-9_.]*';var GCODE_CLOSE_RE='\\%';var GCODE_KEYWORDS='IF DO WHILE ENDWHILE CALL ENDIF SUB ENDSUB GOTO REPEAT ENDREPEAT '+'EQ LT GT NE GE LE OR XOR';var GCODE_START={className:'meta',begin:'([O])([0-9]+)'};var GCODE_CODE=[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.COMMENT(/\(/,/\)/),hljs.inherit(hljs.C_NUMBER_MODE,{begin:'([-+]?([0-9]*\\.?[0-9]+\\.?))|'+hljs.C_NUMBER_RE}),hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),{className:'name',begin:'([G])([0-9]+\\.?[0-9]?)'},{className:'name',begin:'([M])([0-9]+\\.?[0-9]?)'},{className:'attr',begin:'(VC|VS|#)',end:'(\\d+)'},{className:'attr',begin:'(VZOFX|VZOFY|VZOFZ)'},{className:'built_in',begin:'(ATAN|ABS|ACOS|ASIN|SIN|COS|EXP|FIX|FUP|ROUND|LN|TAN)(\\[)',end:'([-+]?([0-9]*\\.?[0-9]+\\.?))(\\])'},{className:'symbol',variants:[{begin:'N',end:'\\d+',illegal:'\\W'}]}];return{aliases:['nc'],// Some implementations (CNC controls) of G-code are interoperable with uppercase and lowercase letters seamlessly.
// However, most prefer all uppercase and uppercase is customary.
case_insensitive:true,lexemes:GCODE_IDENT_RE,keywords:GCODE_KEYWORDS,contains:[{className:'meta',begin:GCODE_CLOSE_RE},GCODE_START].concat(GCODE_CODE)};});hljs.registerLanguage('gherkin',function(hljs){return{aliases:['feature'],keywords:'Feature Background Ability Business\ Need Scenario Scenarios Scenario\ Outline Scenario\ Template Examples Given And Then But When',contains:[{className:'symbol',begin:'\\*',relevance:0},{className:'meta',begin:'@[^@\\s]+'},{begin:'\\|',end:'\\|\\w*$',contains:[{className:'string',begin:'[^|]+'}]},{className:'variable',begin:'<',end:'>'},hljs.HASH_COMMENT_MODE,{className:'string',begin:'"""',end:'"""'},hljs.QUOTE_STRING_MODE]};});hljs.registerLanguage('glsl',function(hljs){return{keywords:{keyword:// Statements
'break continue discard do else for if return while switch case default '+// Qualifiers
'attribute binding buffer ccw centroid centroid varying coherent column_major const cw '+'depth_any depth_greater depth_less depth_unchanged early_fragment_tests equal_spacing '+'flat fractional_even_spacing fractional_odd_spacing highp in index inout invariant '+'invocations isolines layout line_strip lines lines_adjacency local_size_x local_size_y '+'local_size_z location lowp max_vertices mediump noperspective offset origin_upper_left '+'out packed patch pixel_center_integer point_mode points precise precision quads r11f_g11f_b10f '+'r16 r16_snorm r16f r16i r16ui r32f r32i r32ui r8 r8_snorm r8i r8ui readonly restrict '+'rg16 rg16_snorm rg16f rg16i rg16ui rg32f rg32i rg32ui rg8 rg8_snorm rg8i rg8ui rgb10_a2 '+'rgb10_a2ui rgba16 rgba16_snorm rgba16f rgba16i rgba16ui rgba32f rgba32i rgba32ui rgba8 '+'rgba8_snorm rgba8i rgba8ui row_major sample shared smooth std140 std430 stream triangle_strip '+'triangles triangles_adjacency uniform varying vertices volatile writeonly',type:'atomic_uint bool bvec2 bvec3 bvec4 dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 '+'dmat3x4 dmat4 dmat4x2 dmat4x3 dmat4x4 double dvec2 dvec3 dvec4 float iimage1D iimage1DArray '+'iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer'+'iimageCube iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray '+'image2DRect image3D imageBuffer imageCube imageCubeArray int isampler1D isampler1DArray '+'isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D '+'isamplerBuffer isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 mat2 mat2x2 mat2x3 '+'mat2x4 mat3 mat3x2 mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 sampler1D sampler1DArray '+'sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray sampler2DArrayShadow '+'sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow sampler3D '+'samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow '+'image1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray uimage2DRect '+'uimage3D uimageBuffer uimageCube uimageCubeArray uint usampler1D usampler1DArray '+'usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D '+'samplerBuffer usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 vec2 vec3 vec4 void',built_in:// Constants
'gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize gl_MaxClipDistances gl_MaxClipPlanes '+'gl_MaxCombinedAtomicCounterBuffers gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms '+'gl_MaxCombinedImageUnitsAndFragmentOutputs gl_MaxCombinedTextureImageUnits gl_MaxComputeAtomicCounterBuffers '+'gl_MaxComputeAtomicCounters gl_MaxComputeImageUniforms gl_MaxComputeTextureImageUnits '+'gl_MaxComputeUniformComponents gl_MaxComputeWorkGroupCount gl_MaxComputeWorkGroupSize '+'gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers gl_MaxFragmentAtomicCounters '+'gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents gl_MaxFragmentInputVectors '+'gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers '+'gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents '+'gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits '+'gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents '+'gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset '+'gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms '+'gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits '+'gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents '+'gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters '+'gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents '+'gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents '+'gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits '+'gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors '+'gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs gl_MaxVertexImageUniforms '+'gl_MaxVertexOutputComponents gl_MaxVertexOutputVectors gl_MaxVertexTextureImageUnits '+'gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset '+// Variables
'gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial '+'gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color '+'gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord '+'gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor '+'gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial '+'gl_FrontSecondaryColor gl_GlobalInvocationID gl_InstanceID gl_InvocationID gl_Layer gl_LightModel '+'gl_LightSource gl_LocalInvocationID gl_LocalInvocationIndex gl_ModelViewMatrix '+'gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose gl_ModelViewMatrixTranspose '+'gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse gl_ModelViewProjectionMatrixInverseTranspose '+'gl_ModelViewProjectionMatrixTranspose gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 '+'gl_MultiTexCoord3 gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 '+'gl_Normal gl_NormalMatrix gl_NormalScale gl_NumSamples gl_NumWorkGroups gl_ObjectPlaneQ '+'gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn gl_Point gl_PointCoord '+'gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn gl_ProjectionMatrix gl_ProjectionMatrixInverse '+'gl_ProjectionMatrixInverseTranspose gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask '+'gl_SampleMaskIn gl_SamplePosition gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter '+'gl_TexCoord gl_TextureEnvColor gl_TextureMatrix gl_TextureMatrixInverse gl_TextureMatrixInverseTranspose '+'gl_TextureMatrixTranspose gl_Vertex gl_VertexID gl_ViewportIndex gl_WorkGroupID gl_WorkGroupSize gl_in gl_out '+// Functions
'EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive abs acos acosh all any asin '+'asinh atan atanh atomicAdd atomicAnd atomicCompSwap atomicCounter atomicCounterDecrement '+'atomicCounterIncrement atomicExchange atomicMax atomicMin atomicOr atomicXor barrier '+'bitCount bitfieldExtract bitfieldInsert bitfieldReverse ceil clamp cos cosh cross '+'dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward findLSB findMSB '+'floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan '+'greaterThanEqual groupMemoryBarrier imageAtomicAdd imageAtomicAnd imageAtomicCompSwap '+'imageAtomicExchange imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad '+'imageSize imageStore imulExtended intBitsToFloat interpolateAtCentroid interpolateAtOffset '+'interpolateAtSample inverse inversesqrt isinf isnan ldexp length lessThan lessThanEqual log '+'log2 matrixCompMult max memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer '+'memoryBarrierImage memoryBarrierShared min mix mod modf noise1 noise2 noise3 noise4 '+'normalize not notEqual outerProduct packDouble2x32 packHalf2x16 packSnorm2x16 packSnorm4x8 '+'packUnorm2x16 packUnorm4x8 pow radians reflect refract round roundEven shadow1D shadow1DLod '+'shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj shadow2DProjLod sign sin sinh '+'smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture texture1D texture1DLod '+'texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj texture2DProjLod '+'texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod '+'textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset '+'textureLod textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset '+'textureProjLod textureProjLodOffset textureProjOffset textureQueryLevels textureQueryLod '+'textureSize transpose trunc uaddCarry uintBitsToFloat umulExtended unpackDouble2x32 '+'unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 unpackUnorm2x16 unpackUnorm4x8 usubBorrow',literal:'true false'},illegal:'"',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.C_NUMBER_MODE,{className:'meta',begin:'#',end:'$'}]};});hljs.registerLanguage('go',function(hljs){var GO_KEYWORDS={keyword:'break default func interface select case map struct chan else goto package switch '+'const fallthrough if range type continue for import return var go defer '+'bool byte complex64 complex128 float32 float64 int8 int16 int32 int64 string uint8 '+'uint16 uint32 uint64 int uint uintptr rune',literal:'true false iota nil',built_in:'append cap close complex copy imag len make new panic print println real recover delete'};return{aliases:['golang'],keywords:GO_KEYWORDS,illegal:'</',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'string',variants:[hljs.QUOTE_STRING_MODE,{begin:'\'',end:'[^\\\\]\''},{begin:'`',end:'`'}]},{className:'number',variants:[{begin:hljs.C_NUMBER_RE+'[dflsi]',relevance:1},hljs.C_NUMBER_MODE]},{begin:/:=/// relevance booster
},{className:'function',beginKeywords:'func',end:/\s*\{/,excludeEnd:true,contains:[hljs.TITLE_MODE,{className:'params',begin:/\(/,end:/\)/,keywords:GO_KEYWORDS,illegal:/["']/}]}]};});hljs.registerLanguage('golo',function(hljs){return{keywords:{keyword:'println readln print import module function local return let var '+'while for foreach times in case when match with break continue '+'augment augmentation each find filter reduce '+'if then else otherwise try catch finally raise throw orIfNull '+'DynamicObject|10 DynamicVariable struct Observable map set vector list array',literal:'true false null'},contains:[hljs.HASH_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{className:'meta',begin:'@[A-Za-z]+'}]};});hljs.registerLanguage('gradle',function(hljs){return{case_insensitive:true,keywords:{keyword:'task project allprojects subprojects artifacts buildscript configurations '+'dependencies repositories sourceSets description delete from into include '+'exclude source classpath destinationDir includes options sourceCompatibility '+'targetCompatibility group flatDir doLast doFirst flatten todir fromdir ant '+'def abstract break case catch continue default do else extends final finally '+'for if implements instanceof native new private protected public return static '+'switch synchronized throw throws transient try volatile while strictfp package '+'import false null super this true antlrtask checkstyle codenarc copy boolean '+'byte char class double float int interface long short void compile runTime '+'file fileTree abs any append asList asWritable call collect compareTo count '+'div dump each eachByte eachFile eachLine every find findAll flatten getAt '+'getErr getIn getOut getText grep immutable inject inspect intersect invokeMethods '+'isCase join leftShift minus multiply newInputStream newOutputStream newPrintWriter '+'newReader newWriter next plus pop power previous print println push putAt read '+'readBytes readLines reverse reverseEach round size sort splitEachLine step subMap '+'times toInteger toList tokenize upto waitForOrKill withPrintWriter withReader '+'withStream withWriter withWriterAppend write writeLine'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE,hljs.REGEXP_MODE]};});hljs.registerLanguage('groovy',function(hljs){return{keywords:{literal:'true false null',keyword:'byte short char int long boolean float double void '+// groovy specific keywords
'def as in assert trait '+// common keywords with Java
'super this abstract static volatile transient public private protected synchronized final '+'class interface enum if else for while switch case break default continue '+'throw throws try catch finally implements extends new import package return instanceof'},contains:[hljs.COMMENT('/\\*\\*','\\*/',{relevance:0,contains:[{// eat up @'s in emails to prevent them to be recognized as doctags
begin:/\w+@/,relevance:0},{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'string',begin:'"""',end:'"""'},{className:'string',begin:"'''",end:"'''"},{className:'string',begin:"\\$/",end:"/\\$",relevance:10},hljs.APOS_STRING_MODE,{className:'regexp',begin:/~?\/[^\/\n]+\//,contains:[hljs.BACKSLASH_ESCAPE]},hljs.QUOTE_STRING_MODE,{className:'meta',begin:"^#!/usr/bin/env",end:'$',illegal:'\n'},hljs.BINARY_NUMBER_MODE,{className:'class',beginKeywords:'class interface trait enum',end:'{',illegal:':',contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},hljs.C_NUMBER_MODE,{className:'meta',begin:'@[A-Za-z]+'},{// highlight map keys and named parameters as strings
className:'string',begin:/[^\?]{0}[A-Za-z0-9_$]+ *:/},{// catch middle element of the ternary operator
// to avoid highlight it as a label, named parameter, or map key
begin:/\?/,end:/\:/},{// highlight labeled statements
className:'symbol',begin:'^\\s*[A-Za-z0-9_$]+:',relevance:0}],illegal:/#|<\//};});hljs.registerLanguage('haml',// TODO support filter tags like :javascript, support inline HTML
function(hljs){return{case_insensitive:true,contains:[{className:'meta',begin:'^!!!( (5|1\\.1|Strict|Frameset|Basic|Mobile|RDFa|XML\\b.*))?$',relevance:10},// FIXME these comments should be allowed to span indented lines
hljs.COMMENT('^\\s*(!=#|=#|-#|/).*$',false,{relevance:0}),{begin:'^\\s*(-|=|!=)(?!#)',starts:{end:'\\n',subLanguage:'ruby'}},{className:'tag',begin:'^\\s*%',contains:[{className:'selector-tag',begin:'\\w+'},{className:'selector-id',begin:'#[\\w-]+'},{className:'selector-class',begin:'\\.[\\w-]+'},{begin:'{\\s*',end:'\\s*}',contains:[{begin:':\\w+\\s*=>',end:',\\s+',returnBegin:true,endsWithParent:true,contains:[{className:'attr',begin:':\\w+'},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{begin:'\\w+',relevance:0}]}]},{begin:'\\(\\s*',end:'\\s*\\)',excludeEnd:true,contains:[{begin:'\\w+\\s*=',end:'\\s+',returnBegin:true,endsWithParent:true,contains:[{className:'attr',begin:'\\w+',relevance:0},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{begin:'\\w+',relevance:0}]}]}]},{begin:'^\\s*[=~]\\s*'},{begin:'#{',starts:{end:'}',subLanguage:'ruby'}}]};});hljs.registerLanguage('handlebars',function(hljs){var BUILT_INS={'builtin-name':'each in with if else unless bindattr action collection debugger log outlet template unbound view yield'};return{aliases:['hbs','html.hbs','html.handlebars'],case_insensitive:true,subLanguage:'xml',contains:[hljs.COMMENT('{{!(--)?','(--)?}}'),{className:'template-tag',begin:/\{\{[#\/]/,end:/\}\}/,contains:[{className:'name',begin:/[a-zA-Z\.-]+/,keywords:BUILT_INS,starts:{endsWithParent:true,relevance:0,contains:[hljs.QUOTE_STRING_MODE]}}]},{className:'template-variable',begin:/\{\{/,end:/\}\}/,keywords:BUILT_INS}]};});hljs.registerLanguage('haskell',function(hljs){var COMMENT={variants:[hljs.COMMENT('--','$'),hljs.COMMENT('{-','-}',{contains:['self']})]};var PRAGMA={className:'meta',begin:'{-#',end:'#-}'};var PREPROCESSOR={className:'meta',begin:'^#',end:'$'};var CONSTRUCTOR={className:'type',begin:'\\b[A-Z][\\w\']*',// TODO: other constructors (build-in, infix).
relevance:0};var LIST={begin:'\\(',end:'\\)',illegal:'"',contains:[PRAGMA,PREPROCESSOR,{className:'type',begin:'\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'},hljs.inherit(hljs.TITLE_MODE,{begin:'[_a-z][\\w\']*'}),COMMENT]};var RECORD={begin:'{',end:'}',contains:LIST.contains};return{aliases:['hs'],keywords:'let in if then else case of where do module import hiding '+'qualified type data newtype deriving class instance as default '+'infix infixl infixr foreign export ccall stdcall cplusplus '+'jvm dotnet safe unsafe family forall mdo proc rec',contains:[// Top-level constructions.
{beginKeywords:'module',end:'where',keywords:'module where',contains:[LIST,COMMENT],illegal:'\\W\\.|;'},{begin:'\\bimport\\b',end:'$',keywords:'import qualified as hiding',contains:[LIST,COMMENT],illegal:'\\W\\.|;'},{className:'class',begin:'^(\\s*)?(class|instance)\\b',end:'where',keywords:'class family instance where',contains:[CONSTRUCTOR,LIST,COMMENT]},{className:'class',begin:'\\b(data|(new)?type)\\b',end:'$',keywords:'data family type newtype deriving',contains:[PRAGMA,CONSTRUCTOR,LIST,RECORD,COMMENT]},{beginKeywords:'default',end:'$',contains:[CONSTRUCTOR,LIST,COMMENT]},{beginKeywords:'infix infixl infixr',end:'$',contains:[hljs.C_NUMBER_MODE,COMMENT]},{begin:'\\bforeign\\b',end:'$',keywords:'foreign import export ccall stdcall cplusplus jvm '+'dotnet safe unsafe',contains:[CONSTRUCTOR,hljs.QUOTE_STRING_MODE,COMMENT]},{className:'meta',begin:'#!\\/usr\\/bin\\/env\ runhaskell',end:'$'},// "Whitespaces".
PRAGMA,PREPROCESSOR,// Literals and names.
// TODO: characters.
hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,CONSTRUCTOR,hljs.inherit(hljs.TITLE_MODE,{begin:'^[_a-z][\\w\']*'}),COMMENT,{begin:'->|<-'// No markup, relevance booster
}]};});hljs.registerLanguage('haxe',function(hljs){var IDENT_RE='[a-zA-Z_$][a-zA-Z0-9_$]*';var IDENT_FUNC_RETURN_TYPE_RE='([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)';var HAXE_BASIC_TYPES='Int Float String Bool Dynamic Void Array ';return{aliases:['hx'],keywords:{keyword:'break callback case cast catch continue default do dynamic else enum extern '+'for function here if import in inline never new override package private get set '+'public return static super switch this throw trace try typedef untyped using var while '+HAXE_BASIC_TYPES,built_in:'trace this',literal:'true false null _'},contains:[{className:'string',// interpolate-able strings
begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE,{className:'subst',// interpolation
begin:'\\$\\{',end:'\\}'},{className:'subst',// interpolation
begin:'\\$',end:'\\W}'}]},hljs.QUOTE_STRING_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.C_NUMBER_MODE,{className:'meta',// compiler meta
begin:'@:',end:'$'},{className:'meta',// compiler conditionals
begin:'#',end:'$',keywords:{'meta-keyword':'if else elseif end error'}},{className:'type',// function types
begin:':[ \t]*',end:'[^A-Za-z0-9_ \t\\->]',excludeBegin:true,excludeEnd:true,relevance:0},{className:'type',// types
begin:':[ \t]*',end:'\\W',excludeBegin:true,excludeEnd:true},{className:'type',// instantiation
begin:'new *',end:'\\W',excludeBegin:true,excludeEnd:true},{className:'class',// enums
beginKeywords:'enum',end:'\\{',contains:[hljs.TITLE_MODE]},{className:'class',// abstracts
beginKeywords:'abstract',end:'[\\{$]',contains:[{className:'type',begin:'\\(',end:'\\)',excludeBegin:true,excludeEnd:true},{className:'type',begin:'from +',end:'\\W',excludeBegin:true,excludeEnd:true},{className:'type',begin:'to +',end:'\\W',excludeBegin:true,excludeEnd:true},hljs.TITLE_MODE],keywords:{keyword:'abstract from to'}},{className:'class',// classes
begin:'\\b(class|interface) +',end:'[\\{$]',excludeEnd:true,keywords:'class interface',contains:[{className:'keyword',begin:'\\b(extends|implements) +',keywords:'extends implements',contains:[{className:'type',begin:hljs.IDENT_RE,relevance:0}]},hljs.TITLE_MODE]},{className:'function',beginKeywords:'function',end:'\\(',excludeEnd:true,illegal:'\\S',contains:[hljs.TITLE_MODE]}],illegal:/<\//};});hljs.registerLanguage('hsp',function(hljs){return{case_insensitive:true,lexemes:/[\w\._]+/,keywords:'goto gosub return break repeat loop continue wait await dim sdim foreach dimtype dup dupptr end stop newmod delmod mref run exgoto on mcall assert logmes newlab resume yield onexit onerror onkey onclick oncmd exist delete mkdir chdir dirlist bload bsave bcopy memfile if else poke wpoke lpoke getstr chdpm memexpand memcpy memset notesel noteadd notedel noteload notesave randomize noteunsel noteget split strrep setease button chgdisp exec dialog mmload mmplay mmstop mci pset pget syscolor mes print title pos circle cls font sysfont objsize picload color palcolor palette redraw width gsel gcopy gzoom gmode bmpsave hsvcolor getkey listbox chkbox combox input mesbox buffer screen bgscr mouse objsel groll line clrobj boxf objprm objmode stick grect grotate gsquare gradf objimage objskip objenable celload celdiv celput newcom querycom delcom cnvstow comres axobj winobj sendmsg comevent comevarg sarrayconv callfunc cnvwtos comevdisp libptr system hspstat hspver stat cnt err strsize looplev sublev iparam wparam lparam refstr refdval int rnd strlen length length2 length3 length4 vartype gettime peek wpeek lpeek varptr varuse noteinfo instr abs limit getease str strmid strf getpath strtrim sin cos tan atan sqrt double absf expf logf limitf powf geteasef mousex mousey mousew hwnd hinstance hdc ginfo objinfo dirinfo sysinfo thismod __hspver__ __hsp30__ __date__ __time__ __line__ __file__ _debug __hspdef__ and or xor not screen_normal screen_palette screen_hide screen_fixedsize screen_tool screen_frame gmode_gdi gmode_mem gmode_rgb0 gmode_alpha gmode_rgb0alpha gmode_add gmode_sub gmode_pixela ginfo_mx ginfo_my ginfo_act ginfo_sel ginfo_wx1 ginfo_wy1 ginfo_wx2 ginfo_wy2 ginfo_vx ginfo_vy ginfo_sizex ginfo_sizey ginfo_winx ginfo_winy ginfo_mesx ginfo_mesy ginfo_r ginfo_g ginfo_b ginfo_paluse ginfo_dispx ginfo_dispy ginfo_cx ginfo_cy ginfo_intid ginfo_newid ginfo_sx ginfo_sy objinfo_mode objinfo_bmscr objinfo_hwnd notemax notesize dir_cur dir_exe dir_win dir_sys dir_cmdline dir_desktop dir_mydoc dir_tv font_normal font_bold font_italic font_underline font_strikeout font_antialias objmode_normal objmode_guifont objmode_usefont gsquare_grad msgothic msmincho do until while wend for next _break _continue switch case default swbreak swend ddim ldim alloc m_pi rad2deg deg2rad ease_linear ease_quad_in ease_quad_out ease_quad_inout ease_cubic_in ease_cubic_out ease_cubic_inout ease_quartic_in ease_quartic_out ease_quartic_inout ease_bounce_in ease_bounce_out ease_bounce_inout ease_shake_in ease_shake_out ease_shake_inout ease_loop',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,{// multi-line string
className:'string',begin:'{"',end:'"}',contains:[hljs.BACKSLASH_ESCAPE]},hljs.COMMENT(';','$',{relevance:0}),{// pre-processor
className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'addion cfunc cmd cmpopt comfunc const defcfunc deffunc define else endif enum epack func global if ifdef ifndef include modcfunc modfunc modinit modterm module pack packopt regcmd runtime undef usecom uselib'},contains:[hljs.inherit(hljs.QUOTE_STRING_MODE,{className:'meta-string'}),hljs.NUMBER_MODE,hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},{// label
className:'symbol',begin:'^\\*(\\w+|@)'},hljs.NUMBER_MODE,hljs.C_NUMBER_MODE]};});hljs.registerLanguage('htmlbars',function(hljs){var BUILT_INS='action collection component concat debugger each each-in else get hash if input link-to loc log mut outlet partial query-params render textarea unbound unless with yield view';var ATTR_ASSIGNMENT={illegal:/\}\}/,begin:/[a-zA-Z0-9_]+=/,returnBegin:true,relevance:0,contains:[{className:'attr',begin:/[a-zA-Z0-9_]+/}]};var SUB_EXPR={illegal:/\}\}/,begin:/\)/,end:/\)/,contains:[{begin:/[a-zA-Z\.\-]+/,keywords:{built_in:BUILT_INS},starts:{endsWithParent:true,relevance:0,contains:[hljs.QUOTE_STRING_MODE]}}]};var TAG_INNARDS={endsWithParent:true,relevance:0,keywords:{keyword:'as',built_in:BUILT_INS},contains:[hljs.QUOTE_STRING_MODE,ATTR_ASSIGNMENT,hljs.NUMBER_MODE]};return{case_insensitive:true,subLanguage:'xml',contains:[hljs.COMMENT('{{!(--)?','(--)?}}'),{className:'template-tag',begin:/\{\{[#\/]/,end:/\}\}/,contains:[{className:'name',begin:/[a-zA-Z\.\-]+/,keywords:{'builtin-name':BUILT_INS},starts:TAG_INNARDS}]},{className:'template-variable',begin:/\{\{[a-zA-Z][a-zA-Z\-]+/,end:/\}\}/,keywords:{keyword:'as',built_in:BUILT_INS},contains:[hljs.QUOTE_STRING_MODE]}]};});hljs.registerLanguage('http',function(hljs){var VERSION='HTTP/[0-9\\.]+';return{aliases:['https'],illegal:'\\S',contains:[{begin:'^'+VERSION,end:'$',contains:[{className:'number',begin:'\\b\\d{3}\\b'}]},{begin:'^[A-Z]+ (.*?) '+VERSION+'$',returnBegin:true,end:'$',contains:[{className:'string',begin:' ',end:' ',excludeBegin:true,excludeEnd:true},{begin:VERSION},{className:'keyword',begin:'[A-Z]+'}]},{className:'attribute',begin:'^\\w',end:': ',excludeEnd:true,illegal:'\\n|\\s|=',starts:{end:'$',relevance:0}},{begin:'\\n\\n',starts:{subLanguage:[],endsWithParent:true}}]};});hljs.registerLanguage('hy',function(hljs){var keywords={'builtin-name':// keywords
'!= % %= & &= * ** **= *= *map '+'+ += , --build-class-- --import-- -= . / // //= '+'/= < << <<= <= = > >= >> >>= '+'@ @= ^ ^= abs accumulate all and any ap-compose '+'ap-dotimes ap-each ap-each-while ap-filter ap-first ap-if ap-last ap-map ap-map-when ap-pipe '+'ap-reduce ap-reject apply as-> ascii assert assoc bin break butlast '+'callable calling-module-name car case cdr chain chr coll? combinations compile '+'compress cond cons cons? continue count curry cut cycle dec '+'def default-method defclass defmacro defmacro-alias defmacro/g! defmain defmethod defmulti defn '+'defn-alias defnc defnr defreader defseq del delattr delete-route dict-comp dir '+'disassemble dispatch-reader-macro distinct divmod do doto drop drop-last drop-while empty? '+'end-sequence eval eval-and-compile eval-when-compile even? every? except exec filter first '+'flatten float? fn fnc fnr for for* format fraction genexpr '+'gensym get getattr global globals group-by hasattr hash hex id '+'identity if if* if-not if-python2 import in inc input instance? '+'integer integer-char? integer? interleave interpose is is-coll is-cons is-empty is-even '+'is-every is-float is-instance is-integer is-integer-char is-iterable is-iterator is-keyword is-neg is-none '+'is-not is-numeric is-odd is-pos is-string is-symbol is-zero isinstance islice issubclass '+'iter iterable? iterate iterator? keyword keyword? lambda last len let '+'lif lif-not list* list-comp locals loop macro-error macroexpand macroexpand-1 macroexpand-all '+'map max merge-with method-decorator min multi-decorator multicombinations name neg? next '+'none? nonlocal not not-in not? nth numeric? oct odd? open '+'or ord partition permutations pos? post-route postwalk pow prewalk print '+'product profile/calls profile/cpu put-route quasiquote quote raise range read read-str '+'recursive-replace reduce remove repeat repeatedly repr require rest round route '+'route-with-methods rwm second seq set-comp setattr setv some sorted string '+'string? sum switch symbol? take take-nth take-while tee try unless '+'unquote unquote-splicing vars walk when while with with* with-decorator with-gensyms '+'xi xor yield yield-from zero? zip zip-longest | |= ~'};var SYMBOLSTART='a-zA-Z_\\-!.?+*=<>&#\'';var SYMBOL_RE='['+SYMBOLSTART+']['+SYMBOLSTART+'0-9/;:]*';var SIMPLE_NUMBER_RE='[-+]?\\d+(\\.\\d+)?';var SHEBANG={className:'meta',begin:'^#!',end:'$'};var SYMBOL={begin:SYMBOL_RE,relevance:0};var NUMBER={className:'number',begin:SIMPLE_NUMBER_RE,relevance:0};var STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null});var COMMENT=hljs.COMMENT(';','$',{relevance:0});var LITERAL={className:'literal',begin:/\b([Tt]rue|[Ff]alse|nil|None)\b/};var COLLECTION={begin:'[\\[\\{]',end:'[\\]\\}]'};var HINT={className:'comment',begin:'\\^'+SYMBOL_RE};var HINT_COL=hljs.COMMENT('\\^\\{','\\}');var KEY={className:'symbol',begin:'[:]{1,2}'+SYMBOL_RE};var LIST={begin:'\\(',end:'\\)'};var BODY={endsWithParent:true,relevance:0};var NAME={keywords:keywords,lexemes:SYMBOL_RE,className:'name',begin:SYMBOL_RE,starts:BODY};var DEFAULT_CONTAINS=[LIST,STRING,HINT,HINT_COL,COMMENT,KEY,COLLECTION,NUMBER,LITERAL,SYMBOL];LIST.contains=[hljs.COMMENT('comment',''),NAME,BODY];BODY.contains=DEFAULT_CONTAINS;COLLECTION.contains=DEFAULT_CONTAINS;return{aliases:['hylang'],illegal:/\S/,contains:[SHEBANG,LIST,STRING,HINT,HINT_COL,COMMENT,KEY,COLLECTION,NUMBER,LITERAL]};});hljs.registerLanguage('inform7',function(hljs){var START_BRACKET='\\[';var END_BRACKET='\\]';return{aliases:['i7'],case_insensitive:true,keywords:{// Some keywords more or less unique to I7, for relevance.
keyword:// kind:
'thing room person man woman animal container '+'supporter backdrop door '+// characteristic:
'scenery open closed locked inside gender '+// verb:
'is are say understand '+// misc keyword:
'kind of rule'},contains:[{className:'string',begin:'"',end:'"',relevance:0,contains:[{className:'subst',begin:START_BRACKET,end:END_BRACKET}]},{className:'section',begin:/^(Volume|Book|Part|Chapter|Section|Table)\b/,end:'$'},{// Rule definition
// This is here for relevance.
begin:/^(Check|Carry out|Report|Instead of|To|Rule|When|Before|After)\b/,end:':',contains:[{//Rule name
begin:'\\(This',end:'\\)'}]},{className:'comment',begin:START_BRACKET,end:END_BRACKET,contains:['self']}]};});hljs.registerLanguage('ini',function(hljs){var STRING={className:"string",contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:"'''",end:"'''",relevance:10},{begin:'"""',end:'"""',relevance:10},{begin:'"',end:'"'},{begin:"'",end:"'"}]};return{aliases:['toml'],case_insensitive:true,illegal:/\S/,contains:[hljs.COMMENT(';','$'),hljs.HASH_COMMENT_MODE,{className:'section',begin:/^\s*\[+/,end:/\]+/},{begin:/^[a-z0-9\[\]_-]+\s*=\s*/,end:'$',returnBegin:true,contains:[{className:'attr',begin:/[a-z0-9\[\]_-]+/},{begin:/=/,endsWithParent:true,relevance:0,contains:[{className:'literal',begin:/\bon|off|true|false|yes|no\b/},{className:'variable',variants:[{begin:/\$[\w\d"][\w\d_]*/},{begin:/\$\{(.*?)}/}]},STRING,{className:'number',begin:/([\+\-]+)?[\d]+_[\d_]+/},hljs.NUMBER_MODE]}]}]};});hljs.registerLanguage('irpf90',function(hljs){var PARAMS={className:'params',begin:'\\(',end:'\\)'};var F_KEYWORDS={literal:'.False. .True.',keyword:'kind do while private call intrinsic where elsewhere '+'type endtype endmodule endselect endinterface end enddo endif if forall endforall only contains default return stop then '+'public subroutine|10 function program .and. .or. .not. .le. .eq. .ge. .gt. .lt. '+'goto save else use module select case '+'access blank direct exist file fmt form formatted iostat name named nextrec number opened rec recl sequential status unformatted unit '+'continue format pause cycle exit '+'c_null_char c_alert c_backspace c_form_feed flush wait decimal round iomsg '+'synchronous nopass non_overridable pass protected volatile abstract extends import '+'non_intrinsic value deferred generic final enumerator class associate bind enum '+'c_int c_short c_long c_long_long c_signed_char c_size_t c_int8_t c_int16_t c_int32_t c_int64_t c_int_least8_t c_int_least16_t '+'c_int_least32_t c_int_least64_t c_int_fast8_t c_int_fast16_t c_int_fast32_t c_int_fast64_t c_intmax_t C_intptr_t c_float c_double '+'c_long_double c_float_complex c_double_complex c_long_double_complex c_bool c_char c_null_ptr c_null_funptr '+'c_new_line c_carriage_return c_horizontal_tab c_vertical_tab iso_c_binding c_loc c_funloc c_associated  c_f_pointer '+'c_ptr c_funptr iso_fortran_env character_storage_size error_unit file_storage_size input_unit iostat_end iostat_eor '+'numeric_storage_size output_unit c_f_procpointer ieee_arithmetic ieee_support_underflow_control '+'ieee_get_underflow_mode ieee_set_underflow_mode newunit contiguous recursive '+'pad position action delim readwrite eor advance nml interface procedure namelist include sequence elemental pure '+'integer real character complex logical dimension allocatable|10 parameter '+'external implicit|10 none double precision assign intent optional pointer '+'target in out common equivalence data '+// IRPF90 special keywords
'begin_provider &begin_provider end_provider begin_shell end_shell begin_template end_template subst assert touch '+'soft_touch provide no_dep free irp_if irp_else irp_endif irp_write irp_read',built_in:'alog alog10 amax0 amax1 amin0 amin1 amod cabs ccos cexp clog csin csqrt dabs dacos dasin datan datan2 dcos dcosh ddim dexp dint '+'dlog dlog10 dmax1 dmin1 dmod dnint dsign dsin dsinh dsqrt dtan dtanh float iabs idim idint idnint ifix isign max0 max1 min0 min1 sngl '+'algama cdabs cdcos cdexp cdlog cdsin cdsqrt cqabs cqcos cqexp cqlog cqsin cqsqrt dcmplx dconjg derf derfc dfloat dgamma dimag dlgama '+'iqint qabs qacos qasin qatan qatan2 qcmplx qconjg qcos qcosh qdim qerf qerfc qexp qgamma qimag qlgama qlog qlog10 qmax1 qmin1 qmod '+'qnint qsign qsin qsinh qsqrt qtan qtanh abs acos aimag aint anint asin atan atan2 char cmplx conjg cos cosh exp ichar index int log '+'log10 max min nint sign sin sinh sqrt tan tanh print write dim lge lgt lle llt mod nullify allocate deallocate '+'adjustl adjustr all allocated any associated bit_size btest ceiling count cshift date_and_time digits dot_product '+'eoshift epsilon exponent floor fraction huge iand ibclr ibits ibset ieor ior ishft ishftc lbound len_trim matmul '+'maxexponent maxloc maxval merge minexponent minloc minval modulo mvbits nearest pack present product '+'radix random_number random_seed range repeat reshape rrspacing scale scan selected_int_kind selected_real_kind '+'set_exponent shape size spacing spread sum system_clock tiny transpose trim ubound unpack verify achar iachar transfer '+'dble entry dprod cpu_time command_argument_count get_command get_command_argument get_environment_variable is_iostat_end '+'ieee_arithmetic ieee_support_underflow_control ieee_get_underflow_mode ieee_set_underflow_mode '+'is_iostat_eor move_alloc new_line selected_char_kind same_type_as extends_type_of'+'acosh asinh atanh bessel_j0 bessel_j1 bessel_jn bessel_y0 bessel_y1 bessel_yn erf erfc erfc_scaled gamma log_gamma hypot norm2 '+'atomic_define atomic_ref execute_command_line leadz trailz storage_size merge_bits '+'bge bgt ble blt dshiftl dshiftr findloc iall iany iparity image_index lcobound ucobound maskl maskr '+'num_images parity popcnt poppar shifta shiftl shiftr this_image '+// IRPF90 special built_ins
'IRP_ALIGN irp_here'};return{case_insensitive:true,keywords:F_KEYWORDS,illegal:/\/\*/,contains:[hljs.inherit(hljs.APOS_STRING_MODE,{className:'string',relevance:0}),hljs.inherit(hljs.QUOTE_STRING_MODE,{className:'string',relevance:0}),{className:'function',beginKeywords:'subroutine function program',illegal:'[${=\\n]',contains:[hljs.UNDERSCORE_TITLE_MODE,PARAMS]},hljs.COMMENT('!','$',{relevance:0}),hljs.COMMENT('begin_doc','end_doc',{relevance:10}),{className:'number',begin:'(?=\\b|\\+|\\-|\\.)(?=\\.\\d|\\d)(?:\\d+)?(?:\\.?\\d*)(?:[de][+-]?\\d+)?\\b\\.?',relevance:0}]};});hljs.registerLanguage('java',function(hljs){var JAVA_IDENT_RE='[\u00C0-\u02B8a-zA-Z_$][\u00C0-\u02B8a-zA-Z_$0-9]*';var GENERIC_IDENT_RE=JAVA_IDENT_RE+'(<'+JAVA_IDENT_RE+'(\\s*,\\s*'+JAVA_IDENT_RE+')*>)?';var KEYWORDS='false synchronized int abstract float private char boolean static null if const '+'for true while long strictfp finally protected import native final void '+'enum else break transient catch instanceof byte super volatile case assert short '+'package default double public try this switch continue throws protected public private '+'module requires exports do';// https://docs.oracle.com/javase/7/docs/technotes/guides/language/underscores-literals.html
var JAVA_NUMBER_RE='\\b'+'('+'0[bB]([01]+[01_]+[01]+|[01]+)'+// 0b...
'|'+'0[xX]([a-fA-F0-9]+[a-fA-F0-9_]+[a-fA-F0-9]+|[a-fA-F0-9]+)'+// 0x...
'|'+'('+'([\\d]+[\\d_]+[\\d]+|[\\d]+)(\\.([\\d]+[\\d_]+[\\d]+|[\\d]+))?'+'|'+'\\.([\\d]+[\\d_]+[\\d]+|[\\d]+)'+')'+'([eE][-+]?\\d+)?'+// octal, decimal, float
')'+'[lLfF]?';var JAVA_NUMBER_MODE={className:'number',begin:JAVA_NUMBER_RE,relevance:0};return{aliases:['jsp'],keywords:KEYWORDS,illegal:/<\/|#/,contains:[hljs.COMMENT('/\\*\\*','\\*/',{relevance:0,contains:[{// eat up @'s in emails to prevent them to be recognized as doctags
begin:/\w+@/,relevance:0},{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{className:'class',beginKeywords:'class interface',end:/[{;=]/,excludeEnd:true,keywords:'class interface',illegal:/[:"\[\]]/,contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},{// Expression keywords prevent 'keyword Name(...)' from being
// recognized as a function definition
beginKeywords:'new throw return else',relevance:0},{className:'function',begin:'('+GENERIC_IDENT_RE+'\\s+)+'+hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',returnBegin:true,end:/[{;=]/,excludeEnd:true,keywords:KEYWORDS,contains:[{begin:hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',returnBegin:true,relevance:0,contains:[hljs.UNDERSCORE_TITLE_MODE]},{className:'params',begin:/\(/,end:/\)/,keywords:KEYWORDS,relevance:0,contains:[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]},JAVA_NUMBER_MODE,{className:'meta',begin:'@[A-Za-z]+'}]};});hljs.registerLanguage('javascript',function(hljs){var IDENT_RE='[A-Za-z$_][0-9A-Za-z$_]*';var KEYWORDS={keyword:'in of if for while finally var new function do return void else break catch '+'instanceof with throw case default try this switch continue typeof delete '+'let yield const export super debugger as async await static '+// ECMAScript 6 modules import
'import from as',literal:'true false null undefined NaN Infinity',built_in:'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent '+'encodeURI encodeURIComponent escape unescape Object Function Boolean Error '+'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError '+'TypeError URIError Number Math Date String RegExp Array Float32Array '+'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array '+'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require '+'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect '+'Promise'};var EXPRESSIONS;var NUMBER={className:'number',variants:[{begin:'\\b(0[bB][01]+)'},{begin:'\\b(0[oO][0-7]+)'},{begin:hljs.C_NUMBER_RE}],relevance:0};var SUBST={className:'subst',begin:'\\$\\{',end:'\\}',keywords:KEYWORDS,contains:[]// defined later
};var TEMPLATE_STRING={className:'string',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE,SUBST]};SUBST.contains=[hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,TEMPLATE_STRING,NUMBER,hljs.REGEXP_MODE];var PARAMS_CONTAINS=SUBST.contains.concat([hljs.C_BLOCK_COMMENT_MODE,hljs.C_LINE_COMMENT_MODE]);return{aliases:['js','jsx'],keywords:KEYWORDS,contains:[{className:'meta',relevance:10,begin:/^\s*['"]use (strict|asm)['"]/},{className:'meta',begin:/^#!/,end:/$/},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,TEMPLATE_STRING,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,NUMBER,{// object attr container
begin:/[{,]\s*/,relevance:0,contains:[{begin:IDENT_RE+'\\s*:',returnBegin:true,relevance:0,contains:[{className:'attr',begin:IDENT_RE,relevance:0}]}]},{// "value" container
begin:'('+hljs.RE_STARTERS_RE+'|\\b(case|return|throw)\\b)\\s*',keywords:'return throw case',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.REGEXP_MODE,{className:'function',begin:'(\\(.*?\\)|'+IDENT_RE+')\\s*=>',returnBegin:true,end:'\\s*=>',contains:[{className:'params',variants:[{begin:IDENT_RE},{begin:/\(\s*\)/},{begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,keywords:KEYWORDS,contains:PARAMS_CONTAINS}]}]},{// E4X / JSX
begin:/</,end:/(\/\w+|\w+\/)>/,subLanguage:'xml',contains:[{begin:/<\w+\s*\/>/,skip:true},{begin:/<\w+/,end:/(\/\w+|\w+\/)>/,skip:true,contains:[{begin:/<\w+\s*\/>/,skip:true},'self']}]}],relevance:0},{className:'function',beginKeywords:'function',end:/\{/,excludeEnd:true,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:IDENT_RE}),{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,contains:PARAMS_CONTAINS}],illegal:/\[|%/},{begin:/\$[(.]/// relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
},hljs.METHOD_GUARD,{// ES6 class
className:'class',beginKeywords:'class',end:/[{;=]/,excludeEnd:true,illegal:/[:"\[\]]/,contains:[{beginKeywords:'extends'},hljs.UNDERSCORE_TITLE_MODE]},{beginKeywords:'constructor',end:/\{/,excludeEnd:true}],illegal:/#(?!!)/};});hljs.registerLanguage('json',function(hljs){var LITERALS={literal:'true false null'};var TYPES=[hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE];var VALUE_CONTAINER={end:',',endsWithParent:true,excludeEnd:true,contains:TYPES,keywords:LITERALS};var OBJECT={begin:'{',end:'}',contains:[{className:'attr',begin:/"/,end:/"/,contains:[hljs.BACKSLASH_ESCAPE],illegal:'\\n'},hljs.inherit(VALUE_CONTAINER,{begin:/:/})],illegal:'\\S'};var ARRAY={begin:'\\[',end:'\\]',contains:[hljs.inherit(VALUE_CONTAINER)],// inherit is a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
illegal:'\\S'};TYPES.splice(TYPES.length,0,OBJECT,ARRAY);return{contains:TYPES,keywords:LITERALS,illegal:'\\S'};});hljs.registerLanguage('julia',function(hljs){// Since there are numerous special names in Julia, it is too much trouble
// to maintain them by hand. Hence these names (i.e. keywords, literals and
// built-ins) are automatically generated from Julia (v0.3.0 and v0.4.1)
// itself through following scripts for each.
var KEYWORDS={// # keyword generator
// println("in")
// for kw in Base.REPLCompletions.complete_keyword("")
//     println(kw)
// end
keyword:'in abstract baremodule begin bitstype break catch ccall const continue do else elseif end export '+'finally for function global if immutable import importall let local macro module quote return try type '+'typealias using while',// # literal generator
// println("true")
// println("false")
// for name in Base.REPLCompletions.completions("", 0)[1]
//     try
//         s = symbol(name)
//         v = eval(s)
//         if !isa(v, Function) &&
//            !isa(v, DataType) &&
//            !isa(v, IntrinsicFunction) &&
//            !issubtype(typeof(v), Tuple) &&
//            !isa(v, Union) &&
//            !isa(v, Module) &&
//            !isa(v, TypeConstructor) &&
//            !isa(v, TypeVar) &&
//            !isa(v, Colon)
//             println(name)
//         end
//     end
// end
literal:// v0.3
'true false ARGS CPU_CORES C_NULL DL_LOAD_PATH DevNull ENDIAN_BOM ENV I|0 Inf Inf16 Inf32 '+'InsertionSort JULIA_HOME LOAD_PATH MS_ASYNC MS_INVALIDATE MS_SYNC MergeSort NaN NaN16 NaN32 OS_NAME QuickSort '+'RTLD_DEEPBIND RTLD_FIRST RTLD_GLOBAL RTLD_LAZY RTLD_LOCAL RTLD_NODELETE RTLD_NOLOAD RTLD_NOW RoundDown '+'RoundFromZero RoundNearest RoundToZero RoundUp STDERR STDIN STDOUT VERSION WORD_SIZE catalan cglobal e|0 eu|0 '+'eulergamma golden im nothing pi γ π φ '+// v0.4 (diff)
'Inf64 NaN64 RoundNearestTiesAway RoundNearestTiesUp ',// # built_in generator:
// for name in Base.REPLCompletions.completions("", 0)[1]
//     try
//         v = eval(symbol(name))
//         if isa(v, DataType) || isa(v, TypeConstructor) || isa(v, TypeVar)
//             println(name)
//         end
//     end
// end
built_in:// v0.3
'ANY ASCIIString AbstractArray AbstractRNG AbstractSparseArray Any ArgumentError Array Associative Base64Pipe '+'Bidiagonal BigFloat BigInt BitArray BitMatrix BitVector Bool BoundsError Box CFILE Cchar Cdouble Cfloat Char '+'CharString Cint Clong Clonglong ClusterManager Cmd Coff_t Colon Complex Complex128 Complex32 Complex64 '+'Condition Cptrdiff_t Cshort Csize_t Cssize_t Cuchar Cuint Culong Culonglong Cushort Cwchar_t DArray DataType '+'DenseArray Diagonal Dict DimensionMismatch DirectIndexString Display DivideError DomainError EOFError '+'EachLine Enumerate ErrorException Exception Expr Factorization FileMonitor FileOffset Filter Float16 Float32 '+'Float64 FloatRange FloatingPoint Function GetfieldNode GotoNode Hermitian IO IOBuffer IOStream IPv4 IPv6 '+'InexactError Int Int128 Int16 Int32 Int64 Int8 IntSet Integer InterruptException IntrinsicFunction KeyError '+'LabelNode LambdaStaticData LineNumberNode LoadError LocalProcess MIME MathConst MemoryError MersenneTwister '+'Method MethodError MethodTable Module NTuple NewvarNode Nothing Number ObjectIdDict OrdinalRange '+'OverflowError ParseError PollingFileWatcher ProcessExitedException ProcessGroup Ptr QuoteNode Range Range1 '+'Ranges Rational RawFD Real Regex RegexMatch RemoteRef RepString RevString RopeString RoundingMode Set '+'SharedArray Signed SparseMatrixCSC StackOverflowError Stat StatStruct StepRange String SubArray SubString '+'SymTridiagonal Symbol SymbolNode Symmetric SystemError Task TextDisplay Timer TmStruct TopNode Triangular '+'Tridiagonal Type TypeConstructor TypeError TypeName TypeVar UTF16String UTF32String UTF8String UdpSocket '+'Uint Uint128 Uint16 Uint32 Uint64 Uint8 UndefRefError UndefVarError UniformScaling UnionType UnitRange '+'Unsigned Vararg VersionNumber WString WeakKeyDict WeakRef Woodbury Zip '+// v0.4 (diff)
'AbstractChannel AbstractFloat AbstractString AssertionError Base64DecodePipe Base64EncodePipe BufferStream '+'CapturedException CartesianIndex CartesianRange Channel Cintmax_t CompositeException Cstring Cuintmax_t '+'Cwstring Date DateTime Dims Enum GenSym GlobalRef HTML InitError InvalidStateException Irrational LinSpace '+'LowerTriangular NullException Nullable OutOfMemoryError Pair PartialQuickSort Pipe RandomDevice '+'ReadOnlyMemoryError ReentrantLock Ref RemoteException SegmentationFault SerializationState SimpleVector '+'TCPSocket Text Tuple UDPSocket UInt UInt128 UInt16 UInt32 UInt64 UInt8 UnicodeError Union UpperTriangular '+'Val Void WorkerConfig AbstractMatrix AbstractSparseMatrix AbstractSparseVector AbstractVecOrMat AbstractVector '+'DenseMatrix DenseVecOrMat DenseVector Matrix SharedMatrix SharedVector StridedArray StridedMatrix '+'StridedVecOrMat StridedVector VecOrMat Vector '};// ref: http://julia.readthedocs.org/en/latest/manual/variables/#allowed-variable-names
var VARIABLE_NAME_RE='[A-Za-z_\\u00A1-\\uFFFF][A-Za-z_0-9\\u00A1-\\uFFFF]*';// placeholder for recursive self-reference
var DEFAULT={lexemes:VARIABLE_NAME_RE,keywords:KEYWORDS,illegal:/<\//};var TYPE_ANNOTATION={className:'type',begin:/::/};var SUBTYPE={className:'type',begin:/<:/};// ref: http://julia.readthedocs.org/en/latest/manual/integers-and-floating-point-numbers/
var NUMBER={className:'number',// supported numeric literals:
//  * binary literal (e.g. 0x10)
//  * octal literal (e.g. 0o76543210)
//  * hexadecimal literal (e.g. 0xfedcba876543210)
//  * hexadecimal floating point literal (e.g. 0x1p0, 0x1.2p2)
//  * decimal literal (e.g. 9876543210, 100_000_000)
//  * floating pointe literal (e.g. 1.2, 1.2f, .2, 1., 1.2e10, 1.2e-10)
begin:/(\b0x[\d_]*(\.[\d_]*)?|0x\.\d[\d_]*)p[-+]?\d+|\b0[box][a-fA-F0-9][a-fA-F0-9_]*|(\b\d[\d_]*(\.[\d_]*)?|\.\d[\d_]*)([eEfF][-+]?\d+)?/,relevance:0};var CHAR={className:'string',begin:/'(.|\\[xXuU][a-zA-Z0-9]+)'/};var INTERPOLATION={className:'subst',begin:/\$\(/,end:/\)/,keywords:KEYWORDS};var INTERPOLATED_VARIABLE={className:'variable',begin:'\\$'+VARIABLE_NAME_RE};// TODO: neatly escape normal code in string literal
var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,INTERPOLATION,INTERPOLATED_VARIABLE],variants:[{begin:/\w*"""/,end:/"""\w*/,relevance:10},{begin:/\w*"/,end:/"\w*/}]};var COMMAND={className:'string',contains:[hljs.BACKSLASH_ESCAPE,INTERPOLATION,INTERPOLATED_VARIABLE],begin:'`',end:'`'};var MACROCALL={className:'meta',begin:'@'+VARIABLE_NAME_RE};var COMMENT={className:'comment',variants:[{begin:'#=',end:'=#',relevance:10},{begin:'#',end:'$'}]};DEFAULT.contains=[NUMBER,CHAR,TYPE_ANNOTATION,SUBTYPE,STRING,COMMAND,MACROCALL,COMMENT,hljs.HASH_COMMENT_MODE];INTERPOLATION.contains=DEFAULT.contains;return DEFAULT;});hljs.registerLanguage('kotlin',function(hljs){var KEYWORDS={keyword:'abstract as val var vararg get set class object open private protected public noinline '+'crossinline dynamic final enum if else do while for when throw try catch finally '+'import package is in fun override companion reified inline lateinit init'+'interface annotation data sealed internal infix operator out by constructor super '+// to be deleted soon
'trait volatile transient native default',built_in:'Byte Short Char Int Long Boolean Float Double Void Unit Nothing',literal:'true false null'};var KEYWORDS_WITH_LABEL={className:'keyword',begin:/\b(break|continue|return|this)\b/,starts:{contains:[{className:'symbol',begin:/@\w+/}]}};var LABEL={className:'symbol',begin:hljs.UNDERSCORE_IDENT_RE+'@'};// for string templates
var SUBST={className:'subst',variants:[{begin:'\\$'+hljs.UNDERSCORE_IDENT_RE},{begin:'\\${',end:'}',contains:[hljs.APOS_STRING_MODE,hljs.C_NUMBER_MODE]}]};var STRING={className:'string',variants:[{begin:'"""',end:'"""',contains:[SUBST]},// Can't use built-in modes easily, as we want to use STRING in the meta
// context as 'meta-string' and there's no syntax to remove explicitly set
// classNames in built-in modes.
{begin:'\'',end:'\'',illegal:/\n/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:'"',end:'"',illegal:/\n/,contains:[hljs.BACKSLASH_ESCAPE,SUBST]}]};var ANNOTATION_USE_SITE={className:'meta',begin:'@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*'+hljs.UNDERSCORE_IDENT_RE+')?'};var ANNOTATION={className:'meta',begin:'@'+hljs.UNDERSCORE_IDENT_RE,contains:[{begin:/\(/,end:/\)/,contains:[hljs.inherit(STRING,{className:'meta-string'})]}]};return{keywords:KEYWORDS,contains:[hljs.COMMENT('/\\*\\*','\\*/',{relevance:0,contains:[{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,KEYWORDS_WITH_LABEL,LABEL,ANNOTATION_USE_SITE,ANNOTATION,{className:'function',beginKeywords:'fun',end:'[(]|$',returnBegin:true,excludeEnd:true,keywords:KEYWORDS,illegal:/fun\s+(<.*>)?[^\s\(]+(\s+[^\s\(]+)\s*=/,relevance:5,contains:[{begin:hljs.UNDERSCORE_IDENT_RE+'\\s*\\(',returnBegin:true,relevance:0,contains:[hljs.UNDERSCORE_TITLE_MODE]},{className:'type',begin:/</,end:/>/,keywords:'reified',relevance:0},{className:'params',begin:/\(/,end:/\)/,endsParent:true,keywords:KEYWORDS,relevance:0,contains:[{begin:/:/,end:/[=,\/]/,endsWithParent:true,contains:[{className:'type',begin:hljs.UNDERSCORE_IDENT_RE},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE],relevance:0},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,ANNOTATION_USE_SITE,ANNOTATION,STRING,hljs.C_NUMBER_MODE]},hljs.C_BLOCK_COMMENT_MODE]},{className:'class',beginKeywords:'class interface trait',end:/[:\{(]|$/,// remove 'trait' when removed from KEYWORDS
excludeEnd:true,illegal:'extends implements',contains:[{beginKeywords:'public protected internal private constructor'},hljs.UNDERSCORE_TITLE_MODE,{className:'type',begin:/</,end:/>/,excludeBegin:true,excludeEnd:true,relevance:0},{className:'type',begin:/[,:]\s*/,end:/[<\(,]|$/,excludeBegin:true,returnEnd:true},ANNOTATION_USE_SITE,ANNOTATION]},STRING,{className:'meta',begin:"^#!/usr/bin/env",end:'$',illegal:'\n'},hljs.C_NUMBER_MODE]};});hljs.registerLanguage('lasso',function(hljs){var LASSO_IDENT_RE='[a-zA-Z_][\\w.]*';var LASSO_ANGLE_RE='<\\?(lasso(script)?|=)';var LASSO_CLOSE_RE='\\]|\\?>';var LASSO_KEYWORDS={literal:'true false none minimal full all void and or not '+'bw nbw ew new cn ncn lt lte gt gte eq neq rx nrx ft',built_in:'array date decimal duration integer map pair string tag xml null '+'boolean bytes keyword list locale queue set stack staticarray '+'local var variable global data self inherited currentcapture givenblock',keyword:'cache database_names database_schemanames database_tablenames '+'define_tag define_type email_batch encode_set html_comment handle '+'handle_error header if inline iterate ljax_target link '+'link_currentaction link_currentgroup link_currentrecord link_detail '+'link_firstgroup link_firstrecord link_lastgroup link_lastrecord '+'link_nextgroup link_nextrecord link_prevgroup link_prevrecord log '+'loop namespace_using output_none portal private protect records '+'referer referrer repeating resultset rows search_args '+'search_arguments select sort_args sort_arguments thread_atomic '+'value_list while abort case else fail_if fail_ifnot fail if_empty '+'if_false if_null if_true loop_abort loop_continue loop_count params '+'params_up return return_value run_children soap_definetag '+'soap_lastrequest soap_lastresponse tag_name ascending average by '+'define descending do equals frozen group handle_failure import in '+'into join let match max min on order parent protected provide public '+'require returnhome skip split_thread sum take thread to trait type '+'where with yield yieldhome'};var HTML_COMMENT=hljs.COMMENT('<!--','-->',{relevance:0});var LASSO_NOPROCESS={className:'meta',begin:'\\[noprocess\\]',starts:{end:'\\[/noprocess\\]',returnEnd:true,contains:[HTML_COMMENT]}};var LASSO_START={className:'meta',begin:'\\[/noprocess|'+LASSO_ANGLE_RE};var LASSO_DATAMEMBER={className:'symbol',begin:'\''+LASSO_IDENT_RE+'\''};var LASSO_CODE=[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.inherit(hljs.C_NUMBER_MODE,{begin:hljs.C_NUMBER_RE+'|(-?infinity|NaN)\\b'}),hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),{className:'string',begin:'`',end:'`'},{// variables
variants:[{begin:'[#$]'+LASSO_IDENT_RE},{begin:'#',end:'\\d+',illegal:'\\W'}]},{className:'type',begin:'::\\s*',end:LASSO_IDENT_RE,illegal:'\\W'},{className:'params',variants:[{begin:'-(?!infinity)'+LASSO_IDENT_RE,relevance:0},{begin:'(\\.\\.\\.)'}]},{begin:/(->|\.)\s*/,relevance:0,contains:[LASSO_DATAMEMBER]},{className:'class',beginKeywords:'define',returnEnd:true,end:'\\(|=>',contains:[hljs.inherit(hljs.TITLE_MODE,{begin:LASSO_IDENT_RE+'(=(?!>))?|[-+*/%](?!>)'})]}];return{aliases:['ls','lassoscript'],case_insensitive:true,lexemes:LASSO_IDENT_RE+'|&[lg]t;',keywords:LASSO_KEYWORDS,contains:[{className:'meta',begin:LASSO_CLOSE_RE,relevance:0,starts:{// markup
end:'\\[|'+LASSO_ANGLE_RE,returnEnd:true,relevance:0,contains:[HTML_COMMENT]}},LASSO_NOPROCESS,LASSO_START,{className:'meta',begin:'\\[no_square_brackets',starts:{end:'\\[/no_square_brackets\\]',// not implemented in the language
lexemes:LASSO_IDENT_RE+'|&[lg]t;',keywords:LASSO_KEYWORDS,contains:[{className:'meta',begin:LASSO_CLOSE_RE,relevance:0,starts:{end:'\\[noprocess\\]|'+LASSO_ANGLE_RE,returnEnd:true,contains:[HTML_COMMENT]}},LASSO_NOPROCESS,LASSO_START].concat(LASSO_CODE)}},{className:'meta',begin:'\\[',relevance:0},{className:'meta',begin:'^#!',end:'lasso9$',relevance:10}].concat(LASSO_CODE)};});hljs.registerLanguage('ldif',function(hljs){return{contains:[{className:'attribute',begin:'^dn',end:': ',excludeEnd:true,starts:{end:'$',relevance:0},relevance:10},{className:'attribute',begin:'^\\w',end:': ',excludeEnd:true,starts:{end:'$',relevance:0}},{className:'literal',begin:'^-',end:'$'},hljs.HASH_COMMENT_MODE]};});hljs.registerLanguage('leaf',function(hljs){return{contains:[{className:'function',begin:'#+'+'[A-Za-z_0-9]*'+'\\(',end:' {',returnBegin:true,excludeEnd:true,contains:[{className:'keyword',begin:'#+'},{className:'title',begin:'[A-Za-z_][A-Za-z_0-9]*'},{className:'params',begin:'\\(',end:'\\)',endsParent:true,contains:[{className:'string',begin:'"',end:'"'},{className:'variable',begin:'[A-Za-z_][A-Za-z_0-9]*'}]}]}]};});hljs.registerLanguage('less',function(hljs){var IDENT_RE='[\\w-]+';// yes, Less identifiers may begin with a digit
var INTERP_IDENT_RE='('+IDENT_RE+'|@{'+IDENT_RE+'})';/* Generic Modes */var RULES=[],VALUE=[];// forward def. for recursive modes
var STRING_MODE=function STRING_MODE(c){return{// Less strings are not multiline (also include '~' for more consistent coloring of "escaped" strings)
className:'string',begin:'~?'+c+'.*?'+c};};var IDENT_MODE=function IDENT_MODE(name,begin,relevance){return{className:name,begin:begin,relevance:relevance};};var PARENS_MODE={// used only to properly balance nested parens inside mixin call, def. arg list
begin:'\\(',end:'\\)',contains:VALUE,relevance:0};// generic Less highlighter (used almost everywhere except selectors):
VALUE.push(hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,STRING_MODE("'"),STRING_MODE('"'),hljs.CSS_NUMBER_MODE,// fixme: it does not include dot for numbers like .5em :(
{begin:'(url|data-uri)\\(',starts:{className:'string',end:'[\\)\\n]',excludeEnd:true}},IDENT_MODE('number','#[0-9A-Fa-f]+\\b'),PARENS_MODE,IDENT_MODE('variable','@@?'+IDENT_RE,10),IDENT_MODE('variable','@{'+IDENT_RE+'}'),IDENT_MODE('built_in','~?`[^`]*?`'),// inline javascript (or whatever host language) *multiline* string
{// @media features (it’s here to not duplicate things in AT_RULE_MODE with extra PARENS_MODE overriding):
className:'attribute',begin:IDENT_RE+'\\s*:',end:':',returnBegin:true,excludeEnd:true},{className:'meta',begin:'!important'});var VALUE_WITH_RULESETS=VALUE.concat({begin:'{',end:'}',contains:RULES});var MIXIN_GUARD_MODE={beginKeywords:'when',endsWithParent:true,contains:[{beginKeywords:'and not'}].concat(VALUE)// using this form to override VALUE’s 'function' match
};/* Rule-Level Modes */var RULE_MODE={begin:INTERP_IDENT_RE+'\\s*:',returnBegin:true,end:'[;}]',relevance:0,contains:[{className:'attribute',begin:INTERP_IDENT_RE,end:':',excludeEnd:true,starts:{endsWithParent:true,illegal:'[<=$]',relevance:0,contains:VALUE}}]};var AT_RULE_MODE={className:'keyword',begin:'@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b',starts:{end:'[;{}]',returnEnd:true,contains:VALUE,relevance:0}};// variable definitions and calls
var VAR_RULE_MODE={className:'variable',variants:[// using more strict pattern for higher relevance to increase chances of Less detection.
// this is *the only* Less specific statement used in most of the sources, so...
// (we’ll still often loose to the css-parser unless there's '//' comment,
// simply because 1 variable just can't beat 99 properties :)
{begin:'@'+IDENT_RE+'\\s*:',relevance:15},{begin:'@'+IDENT_RE}],starts:{end:'[;}]',returnEnd:true,contains:VALUE_WITH_RULESETS}};var SELECTOR_MODE={// first parse unambiguous selectors (i.e. those not starting with tag)
// then fall into the scary lookahead-discriminator variant.
// this mode also handles mixin definitions and calls
variants:[{begin:'[\\.#:&\\[>]',end:'[;{}]'// mixin calls end with ';'
},{begin:INTERP_IDENT_RE,end:'{'}],returnBegin:true,returnEnd:true,illegal:'[<=\'$"]',relevance:0,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,MIXIN_GUARD_MODE,IDENT_MODE('keyword','all\\b'),IDENT_MODE('variable','@{'+IDENT_RE+'}'),// otherwise it’s identified as tag
IDENT_MODE('selector-tag',INTERP_IDENT_RE+'%?',0),// '%' for more consistent coloring of @keyframes "tags"
IDENT_MODE('selector-id','#'+INTERP_IDENT_RE),IDENT_MODE('selector-class','\\.'+INTERP_IDENT_RE,0),IDENT_MODE('selector-tag','&',0),{className:'selector-attr',begin:'\\[',end:'\\]'},{className:'selector-pseudo',begin:/:(:)?[a-zA-Z0-9\_\-\+\(\)"'.]+/},{begin:'\\(',end:'\\)',contains:VALUE_WITH_RULESETS},// argument list of parametric mixins
{begin:'!important'// eat !important after mixin call or it will be colored as tag
}]};RULES.push(hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,AT_RULE_MODE,VAR_RULE_MODE,RULE_MODE,SELECTOR_MODE);return{case_insensitive:true,illegal:'[=>\'/<($"]',contains:RULES};});hljs.registerLanguage('lisp',function(hljs){var LISP_IDENT_RE='[a-zA-Z_\\-\\+\\*\\/\\<\\=\\>\\&\\#][a-zA-Z0-9_\\-\\+\\*\\/\\<\\=\\>\\&\\#!]*';var MEC_RE='\\|[^]*?\\|';var LISP_SIMPLE_NUMBER_RE='(\\-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|\\-)?\\d+)?';var SHEBANG={className:'meta',begin:'^#!',end:'$'};var LITERAL={className:'literal',begin:'\\b(t{1}|nil)\\b'};var NUMBER={className:'number',variants:[{begin:LISP_SIMPLE_NUMBER_RE,relevance:0},{begin:'#(b|B)[0-1]+(/[0-1]+)?'},{begin:'#(o|O)[0-7]+(/[0-7]+)?'},{begin:'#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?'},{begin:'#(c|C)\\('+LISP_SIMPLE_NUMBER_RE+' +'+LISP_SIMPLE_NUMBER_RE,end:'\\)'}]};var STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null});var COMMENT=hljs.COMMENT(';','$',{relevance:0});var VARIABLE={begin:'\\*',end:'\\*'};var KEYWORD={className:'symbol',begin:'[:&]'+LISP_IDENT_RE};var IDENT={begin:LISP_IDENT_RE,relevance:0};var MEC={begin:MEC_RE};var QUOTED_LIST={begin:'\\(',end:'\\)',contains:['self',LITERAL,STRING,NUMBER,IDENT]};var QUOTED={contains:[NUMBER,STRING,VARIABLE,KEYWORD,QUOTED_LIST,IDENT],variants:[{begin:'[\'`]\\(',end:'\\)'},{begin:'\\(quote ',end:'\\)',keywords:{name:'quote'}},{begin:'\''+MEC_RE}]};var QUOTED_ATOM={variants:[{begin:'\''+LISP_IDENT_RE},{begin:'#\''+LISP_IDENT_RE+'(::'+LISP_IDENT_RE+')*'}]};var LIST={begin:'\\(\\s*',end:'\\)'};var BODY={endsWithParent:true,relevance:0};LIST.contains=[{className:'name',variants:[{begin:LISP_IDENT_RE},{begin:MEC_RE}]},BODY];BODY.contains=[QUOTED,QUOTED_ATOM,LIST,LITERAL,NUMBER,STRING,COMMENT,VARIABLE,KEYWORD,MEC,IDENT];return{illegal:/\S/,contains:[NUMBER,SHEBANG,LITERAL,STRING,COMMENT,QUOTED,QUOTED_ATOM,LIST,IDENT]};});hljs.registerLanguage('livecodeserver',function(hljs){var VARIABLE={begin:'\\b[gtps][A-Z]+[A-Za-z0-9_\\-]*\\b|\\$_[A-Z]+',relevance:0};var COMMENT_MODES=[hljs.C_BLOCK_COMMENT_MODE,hljs.HASH_COMMENT_MODE,hljs.COMMENT('--','$'),hljs.COMMENT('[^:]//','$')];var TITLE1=hljs.inherit(hljs.TITLE_MODE,{variants:[{begin:'\\b_*rig[A-Z]+[A-Za-z0-9_\\-]*'},{begin:'\\b_[a-z0-9\\-]+'}]});var TITLE2=hljs.inherit(hljs.TITLE_MODE,{begin:'\\b([A-Za-z0-9_\\-]+)\\b'});return{case_insensitive:false,keywords:{keyword:'$_COOKIE $_FILES $_GET $_GET_BINARY $_GET_RAW $_POST $_POST_BINARY $_POST_RAW $_SESSION $_SERVER '+'codepoint codepoints segment segments codeunit codeunits sentence sentences trueWord trueWords paragraph '+'after byte bytes english the until http forever descending using line real8 with seventh '+'for stdout finally element word words fourth before black ninth sixth characters chars stderr '+'uInt1 uInt1s uInt2 uInt2s stdin string lines relative rel any fifth items from middle mid '+'at else of catch then third it file milliseconds seconds second secs sec int1 int1s int4 '+'int4s internet int2 int2s normal text item last long detailed effective uInt4 uInt4s repeat '+'end repeat URL in try into switch to words https token binfile each tenth as ticks tick '+'system real4 by dateItems without char character ascending eighth whole dateTime numeric short '+'first ftp integer abbreviated abbr abbrev private case while if '+'div mod wrap and or bitAnd bitNot bitOr bitXor among not in a an within '+'contains ends with begins the keys of keys',literal:'SIX TEN FORMFEED NINE ZERO NONE SPACE FOUR FALSE COLON CRLF PI COMMA ENDOFFILE EOF EIGHT FIVE '+'QUOTE EMPTY ONE TRUE RETURN CR LINEFEED RIGHT BACKSLASH NULL SEVEN TAB THREE TWO '+'six ten formfeed nine zero none space four false colon crlf pi comma endoffile eof eight five '+'quote empty one true return cr linefeed right backslash null seven tab three two '+'RIVERSION RISTATE FILE_READ_MODE FILE_WRITE_MODE FILE_WRITE_MODE DIR_WRITE_MODE FILE_READ_UMASK '+'FILE_WRITE_UMASK DIR_READ_UMASK DIR_WRITE_UMASK',built_in:'put abs acos aliasReference annuity arrayDecode arrayEncode asin atan atan2 average avg avgDev base64Decode '+'base64Encode baseConvert binaryDecode binaryEncode byteOffset byteToNum cachedURL cachedURLs charToNum '+'cipherNames codepointOffset codepointProperty codepointToNum codeunitOffset commandNames compound compress '+'constantNames cos date dateFormat decompress directories '+'diskSpace DNSServers exp exp1 exp2 exp10 extents files flushEvents folders format functionNames geometricMean global '+'globals hasMemory harmonicMean hostAddress hostAddressToName hostName hostNameToAddress isNumber ISOToMac itemOffset '+'keys len length libURLErrorData libUrlFormData libURLftpCommand libURLLastHTTPHeaders libURLLastRHHeaders '+'libUrlMultipartFormAddPart libUrlMultipartFormData libURLVersion lineOffset ln ln1 localNames log log2 log10 '+'longFilePath lower macToISO matchChunk matchText matrixMultiply max md5Digest median merge millisec '+'millisecs millisecond milliseconds min monthNames nativeCharToNum normalizeText num number numToByte numToChar '+'numToCodepoint numToNativeChar offset open openfiles openProcesses openProcessIDs openSockets '+'paragraphOffset paramCount param params peerAddress pendingMessages platform popStdDev populationStandardDeviation '+'populationVariance popVariance processID random randomBytes replaceText result revCreateXMLTree revCreateXMLTreeFromFile '+'revCurrentRecord revCurrentRecordIsFirst revCurrentRecordIsLast revDatabaseColumnCount revDatabaseColumnIsNull '+'revDatabaseColumnLengths revDatabaseColumnNames revDatabaseColumnNamed revDatabaseColumnNumbered '+'revDatabaseColumnTypes revDatabaseConnectResult revDatabaseCursors revDatabaseID revDatabaseTableNames '+'revDatabaseType revDataFromQuery revdb_closeCursor revdb_columnbynumber revdb_columncount revdb_columnisnull '+'revdb_columnlengths revdb_columnnames revdb_columntypes revdb_commit revdb_connect revdb_connections '+'revdb_connectionerr revdb_currentrecord revdb_cursorconnection revdb_cursorerr revdb_cursors revdb_dbtype '+'revdb_disconnect revdb_execute revdb_iseof revdb_isbof revdb_movefirst revdb_movelast revdb_movenext '+'revdb_moveprev revdb_query revdb_querylist revdb_recordcount revdb_rollback revdb_tablenames '+'revGetDatabaseDriverPath revNumberOfRecords revOpenDatabase revOpenDatabases revQueryDatabase '+'revQueryDatabaseBlob revQueryResult revQueryIsAtStart revQueryIsAtEnd revUnixFromMacPath revXMLAttribute '+'revXMLAttributes revXMLAttributeValues revXMLChildContents revXMLChildNames revXMLCreateTreeFromFileWithNamespaces '+'revXMLCreateTreeWithNamespaces revXMLDataFromXPathQuery revXMLEvaluateXPath revXMLFirstChild revXMLMatchingNode '+'revXMLNextSibling revXMLNodeContents revXMLNumberOfChildren revXMLParent revXMLPreviousSibling '+'revXMLRootNode revXMLRPC_CreateRequest revXMLRPC_Documents revXMLRPC_Error '+'revXMLRPC_GetHost revXMLRPC_GetMethod revXMLRPC_GetParam revXMLText revXMLRPC_Execute '+'revXMLRPC_GetParamCount revXMLRPC_GetParamNode revXMLRPC_GetParamType revXMLRPC_GetPath revXMLRPC_GetPort '+'revXMLRPC_GetProtocol revXMLRPC_GetRequest revXMLRPC_GetResponse revXMLRPC_GetSocket revXMLTree '+'revXMLTrees revXMLValidateDTD revZipDescribeItem revZipEnumerateItems revZipOpenArchives round sampVariance '+'sec secs seconds sentenceOffset sha1Digest shell shortFilePath sin specialFolderPath sqrt standardDeviation statRound '+'stdDev sum sysError systemVersion tan tempName textDecode textEncode tick ticks time to tokenOffset toLower toUpper '+'transpose truewordOffset trunc uniDecode uniEncode upper URLDecode URLEncode URLStatus uuid value variableNames '+'variance version waitDepth weekdayNames wordOffset xsltApplyStylesheet xsltApplyStylesheetFromFile xsltLoadStylesheet '+'xsltLoadStylesheetFromFile add breakpoint cancel clear local variable file word line folder directory URL close socket process '+'combine constant convert create new alias folder directory decrypt delete variable word line folder '+'directory URL dispatch divide do encrypt filter get include intersect kill libURLDownloadToFile '+'libURLFollowHttpRedirects libURLftpUpload libURLftpUploadFile libURLresetAll libUrlSetAuthCallback '+'libURLSetCustomHTTPHeaders libUrlSetExpect100 libURLSetFTPListCommand libURLSetFTPMode libURLSetFTPStopTime '+'libURLSetStatusCallback load multiply socket prepare process post seek rel relative read from process rename '+'replace require resetAll resolve revAddXMLNode revAppendXML revCloseCursor revCloseDatabase revCommitDatabase '+'revCopyFile revCopyFolder revCopyXMLNode revDeleteFolder revDeleteXMLNode revDeleteAllXMLTrees '+'revDeleteXMLTree revExecuteSQL revGoURL revInsertXMLNode revMoveFolder revMoveToFirstRecord revMoveToLastRecord '+'revMoveToNextRecord revMoveToPreviousRecord revMoveToRecord revMoveXMLNode revPutIntoXMLNode revRollBackDatabase '+'revSetDatabaseDriverPath revSetXMLAttribute revXMLRPC_AddParam revXMLRPC_DeleteAllDocuments revXMLAddDTD '+'revXMLRPC_Free revXMLRPC_FreeAll revXMLRPC_DeleteDocument revXMLRPC_DeleteParam revXMLRPC_SetHost '+'revXMLRPC_SetMethod revXMLRPC_SetPort revXMLRPC_SetProtocol revXMLRPC_SetSocket revZipAddItemWithData '+'revZipAddItemWithFile revZipAddUncompressedItemWithData revZipAddUncompressedItemWithFile revZipCancel '+'revZipCloseArchive revZipDeleteItem revZipExtractItemToFile revZipExtractItemToVariable revZipSetProgressCallback '+'revZipRenameItem revZipReplaceItemWithData revZipReplaceItemWithFile revZipOpenArchive send set sort split start stop '+'subtract union unload wait write'},contains:[VARIABLE,{className:'keyword',begin:'\\bend\\sif\\b'},{className:'function',beginKeywords:'function',end:'$',contains:[VARIABLE,TITLE2,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE,TITLE1]},{className:'function',begin:'\\bend\\s+',end:'$',keywords:'end',contains:[TITLE2,TITLE1],relevance:0},{beginKeywords:'command on',end:'$',contains:[VARIABLE,TITLE2,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE,TITLE1]},{className:'meta',variants:[{begin:'<\\?(rev|lc|livecode)',relevance:10},{begin:'<\\?'},{begin:'\\?>'}]},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE,TITLE1].concat(COMMENT_MODES),illegal:';$|^\\[|^=|&|{'};});hljs.registerLanguage('livescript',function(hljs){var KEYWORDS={keyword:// JS keywords
'in if for while finally new do return else break catch instanceof throw try this '+'switch continue typeof delete debugger case default function var with '+// LiveScript keywords
'then unless until loop of by when and or is isnt not it that otherwise from to til fallthrough super '+'case default function var void const let enum export import native '+'__hasProp __extends __slice __bind __indexOf',literal:// JS literals
'true false null undefined '+// LiveScript literals
'yes no on off it that void',built_in:'npm require console print module global window document'};var JS_IDENT_RE='[A-Za-z$_](?:\-[0-9A-Za-z$_]|[0-9A-Za-z$_])*';var TITLE=hljs.inherit(hljs.TITLE_MODE,{begin:JS_IDENT_RE});var SUBST={className:'subst',begin:/#\{/,end:/}/,keywords:KEYWORDS};var SUBST_SIMPLE={className:'subst',begin:/#[A-Za-z$_]/,end:/(?:\-[0-9A-Za-z$_]|[0-9A-Za-z$_])*/,keywords:KEYWORDS};var EXPRESSIONS=[hljs.BINARY_NUMBER_MODE,{className:'number',begin:'(\\b0[xX][a-fA-F0-9_]+)|(\\b\\d(\\d|_\\d)*(\\.(\\d(\\d|_\\d)*)?)?(_*[eE]([-+]\\d(_\\d|\\d)*)?)?[_a-z]*)',relevance:0,starts:{end:'(\\s*/)?',relevance:0// a number tries to eat the following slash to prevent treating it as a regexp
}},{className:'string',variants:[{begin:/'''/,end:/'''/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:/'/,end:/'/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:/"""/,end:/"""/,contains:[hljs.BACKSLASH_ESCAPE,SUBST,SUBST_SIMPLE]},{begin:/"/,end:/"/,contains:[hljs.BACKSLASH_ESCAPE,SUBST,SUBST_SIMPLE]},{begin:/\\/,end:/(\s|$)/,excludeEnd:true}]},{className:'regexp',variants:[{begin:'//',end:'//[gim]*',contains:[SUBST,hljs.HASH_COMMENT_MODE]},{// regex can't start with space to parse x / 2 / 3 as two divisions
// regex can't start with *, and it supports an "illegal" in the main mode
begin:/\/(?![ *])(\\\/|.)*?\/[gim]*(?=\W|$)/}]},{begin:'@'+JS_IDENT_RE},{begin:'``',end:'``',excludeBegin:true,excludeEnd:true,subLanguage:'javascript'}];SUBST.contains=EXPRESSIONS;var PARAMS={className:'params',begin:'\\(',returnBegin:true,/* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */contains:[{begin:/\(/,end:/\)/,keywords:KEYWORDS,contains:['self'].concat(EXPRESSIONS)}]};return{aliases:['ls'],keywords:KEYWORDS,illegal:/\/\*/,contains:EXPRESSIONS.concat([hljs.COMMENT('\\/\\*','\\*\\/'),hljs.HASH_COMMENT_MODE,{className:'function',contains:[TITLE,PARAMS],returnBegin:true,variants:[{begin:'('+JS_IDENT_RE+'\\s*(?:=|:=)\\s*)?(\\(.*\\))?\\s*\\B\\->\\*?',end:'\\->\\*?'},{begin:'('+JS_IDENT_RE+'\\s*(?:=|:=)\\s*)?!?(\\(.*\\))?\\s*\\B[-~]{1,2}>\\*?',end:'[-~]{1,2}>\\*?'},{begin:'('+JS_IDENT_RE+'\\s*(?:=|:=)\\s*)?(\\(.*\\))?\\s*\\B!?[-~]{1,2}>\\*?',end:'!?[-~]{1,2}>\\*?'}]},{className:'class',beginKeywords:'class',end:'$',illegal:/[:="\[\]]/,contains:[{beginKeywords:'extends',endsWithParent:true,illegal:/[:="\[\]]/,contains:[TITLE]},TITLE]},{begin:JS_IDENT_RE+':',end:':',returnBegin:true,returnEnd:true,relevance:0}])};});hljs.registerLanguage('llvm',function(hljs){var identifier='([-a-zA-Z$._][\\w\\-$.]*)';return{//lexemes: '[.%]?' + hljs.IDENT_RE,
keywords:'begin end true false declare define global '+'constant private linker_private internal '+'available_externally linkonce linkonce_odr weak '+'weak_odr appending dllimport dllexport common '+'default hidden protected extern_weak external '+'thread_local zeroinitializer undef null to tail '+'target triple datalayout volatile nuw nsw nnan '+'ninf nsz arcp fast exact inbounds align '+'addrspace section alias module asm sideeffect '+'gc dbg linker_private_weak attributes blockaddress '+'initialexec localdynamic localexec prefix unnamed_addr '+'ccc fastcc coldcc x86_stdcallcc x86_fastcallcc '+'arm_apcscc arm_aapcscc arm_aapcs_vfpcc ptx_device '+'ptx_kernel intel_ocl_bicc msp430_intrcc spir_func '+'spir_kernel x86_64_sysvcc x86_64_win64cc x86_thiscallcc '+'cc c signext zeroext inreg sret nounwind '+'noreturn noalias nocapture byval nest readnone '+'readonly inlinehint noinline alwaysinline optsize ssp '+'sspreq noredzone noimplicitfloat naked builtin cold '+'nobuiltin noduplicate nonlazybind optnone returns_twice '+'sanitize_address sanitize_memory sanitize_thread sspstrong '+'uwtable returned type opaque eq ne slt sgt '+'sle sge ult ugt ule uge oeq one olt ogt '+'ole oge ord uno ueq une x acq_rel acquire '+'alignstack atomic catch cleanup filter inteldialect '+'max min monotonic nand personality release seq_cst '+'singlethread umax umin unordered xchg add fadd '+'sub fsub mul fmul udiv sdiv fdiv urem srem '+'frem shl lshr ashr and or xor icmp fcmp '+'phi call trunc zext sext fptrunc fpext uitofp '+'sitofp fptoui fptosi inttoptr ptrtoint bitcast '+'addrspacecast select va_arg ret br switch invoke '+'unwind unreachable indirectbr landingpad resume '+'malloc alloca free load store getelementptr '+'extractelement insertelement shufflevector getresult '+'extractvalue insertvalue atomicrmw cmpxchg fence '+'argmemonly double',contains:[{className:'keyword',begin:'i\\d+'},hljs.COMMENT(';','\\n',{relevance:0}),// Double quote string
hljs.QUOTE_STRING_MODE,{className:'string',variants:[// Double-quoted string
{begin:'"',end:'[^\\\\]"'}],relevance:0},{className:'title',variants:[{begin:'@'+identifier},{begin:'@\\d+'},{begin:'!'+identifier},{begin:'!\\d+'+identifier}]},{className:'symbol',variants:[{begin:'%'+identifier},{begin:'%\\d+'},{begin:'#\\d+'}]},{className:'number',variants:[{begin:'0[xX][a-fA-F0-9]+'},{begin:'-?\\d+(?:[.]\\d+)?(?:[eE][-+]?\\d+(?:[.]\\d+)?)?'}],relevance:0}]};});hljs.registerLanguage('lsl',function(hljs){var LSL_STRING_ESCAPE_CHARS={className:'subst',begin:/\\[tn"\\]/};var LSL_STRINGS={className:'string',begin:'"',end:'"',contains:[LSL_STRING_ESCAPE_CHARS]};var LSL_NUMBERS={className:'number',begin:hljs.C_NUMBER_RE};var LSL_CONSTANTS={className:'literal',variants:[{begin:'\\b(?:PI|TWO_PI|PI_BY_TWO|DEG_TO_RAD|RAD_TO_DEG|SQRT2)\\b'},{begin:'\\b(?:XP_ERROR_(?:EXPERIENCES_DISABLED|EXPERIENCE_(?:DISABLED|SUSPENDED)|INVALID_(?:EXPERIENCE|PARAMETERS)|KEY_NOT_FOUND|MATURITY_EXCEEDED|NONE|NOT_(?:FOUND|PERMITTED(?:_LAND)?)|NO_EXPERIENCE|QUOTA_EXCEEDED|RETRY_UPDATE|STORAGE_EXCEPTION|STORE_DISABLED|THROTTLED|UNKNOWN_ERROR)|JSON_APPEND|STATUS_(?:PHYSICS|ROTATE_[XYZ]|PHANTOM|SANDBOX|BLOCK_GRAB(?:_OBJECT)?|(?:DIE|RETURN)_AT_EDGE|CAST_SHADOWS|OK|MALFORMED_PARAMS|TYPE_MISMATCH|BOUNDS_ERROR|NOT_(?:FOUND|SUPPORTED)|INTERNAL_ERROR|WHITELIST_FAILED)|AGENT(?:_(?:BY_(?:LEGACY_|USER)NAME|FLYING|ATTACHMENTS|SCRIPTED|MOUSELOOK|SITTING|ON_OBJECT|AWAY|WALKING|IN_AIR|TYPING|CROUCHING|BUSY|ALWAYS_RUN|AUTOPILOT|LIST_(?:PARCEL(?:_OWNER)?|REGION)))?|CAMERA_(?:PITCH|DISTANCE|BEHINDNESS_(?:ANGLE|LAG)|(?:FOCUS|POSITION)(?:_(?:THRESHOLD|LOCKED|LAG))?|FOCUS_OFFSET|ACTIVE)|ANIM_ON|LOOP|REVERSE|PING_PONG|SMOOTH|ROTATE|SCALE|ALL_SIDES|LINK_(?:ROOT|SET|ALL_(?:OTHERS|CHILDREN)|THIS)|ACTIVE|PASS(?:IVE|_(?:ALWAYS|IF_NOT_HANDLED|NEVER))|SCRIPTED|CONTROL_(?:FWD|BACK|(?:ROT_)?(?:LEFT|RIGHT)|UP|DOWN|(?:ML_)?LBUTTON)|PERMISSION_(?:RETURN_OBJECTS|DEBIT|OVERRIDE_ANIMATIONS|SILENT_ESTATE_MANAGEMENT|TAKE_CONTROLS|TRIGGER_ANIMATION|ATTACH|CHANGE_LINKS|(?:CONTROL|TRACK)_CAMERA|TELEPORT)|INVENTORY_(?:TEXTURE|SOUND|OBJECT|SCRIPT|LANDMARK|CLOTHING|NOTECARD|BODYPART|ANIMATION|GESTURE|ALL|NONE)|CHANGED_(?:INVENTORY|COLOR|SHAPE|SCALE|TEXTURE|LINK|ALLOWED_DROP|OWNER|REGION(?:_START)?|TELEPORT|MEDIA)|OBJECT_(?:CLICK_ACTION|HOVER_HEIGHT|LAST_OWNER_ID|(?:PHYSICS|SERVER|STREAMING)_COST|UNKNOWN_DETAIL|CHARACTER_TIME|PHANTOM|PHYSICS|TEMP_ON_REZ|NAME|DESC|POS|PRIM_(?:COUNT|EQUIVALENCE)|RETURN_(?:PARCEL(?:_OWNER)?|REGION)|REZZER_KEY|ROO?T|VELOCITY|OMEGA|OWNER|GROUP|CREATOR|ATTACHED_POINT|RENDER_WEIGHT|(?:BODY_SHAPE|PATHFINDING)_TYPE|(?:RUNNING|TOTAL)_SCRIPT_COUNT|TOTAL_INVENTORY_COUNT|SCRIPT_(?:MEMORY|TIME))|TYPE_(?:INTEGER|FLOAT|STRING|KEY|VECTOR|ROTATION|INVALID)|(?:DEBUG|PUBLIC)_CHANNEL|ATTACH_(?:AVATAR_CENTER|CHEST|HEAD|BACK|PELVIS|MOUTH|CHIN|NECK|NOSE|BELLY|[LR](?:SHOULDER|HAND|FOOT|EAR|EYE|[UL](?:ARM|LEG)|HIP)|(?:LEFT|RIGHT)_PEC|HUD_(?:CENTER_[12]|TOP_(?:RIGHT|CENTER|LEFT)|BOTTOM(?:_(?:RIGHT|LEFT))?)|[LR]HAND_RING1|TAIL_(?:BASE|TIP)|[LR]WING|FACE_(?:JAW|[LR]EAR|[LR]EYE|TOUNGE)|GROIN|HIND_[LR]FOOT)|LAND_(?:LEVEL|RAISE|LOWER|SMOOTH|NOISE|REVERT)|DATA_(?:ONLINE|NAME|BORN|SIM_(?:POS|STATUS|RATING)|PAYINFO)|PAYMENT_INFO_(?:ON_FILE|USED)|REMOTE_DATA_(?:CHANNEL|REQUEST|REPLY)|PSYS_(?:PART_(?:BF_(?:ZERO|ONE(?:_MINUS_(?:DEST_COLOR|SOURCE_(ALPHA|COLOR)))?|DEST_COLOR|SOURCE_(ALPHA|COLOR))|BLEND_FUNC_(DEST|SOURCE)|FLAGS|(?:START|END)_(?:COLOR|ALPHA|SCALE|GLOW)|MAX_AGE|(?:RIBBON|WIND|INTERP_(?:COLOR|SCALE)|BOUNCE|FOLLOW_(?:SRC|VELOCITY)|TARGET_(?:POS|LINEAR)|EMISSIVE)_MASK)|SRC_(?:MAX_AGE|PATTERN|ANGLE_(?:BEGIN|END)|BURST_(?:RATE|PART_COUNT|RADIUS|SPEED_(?:MIN|MAX))|ACCEL|TEXTURE|TARGET_KEY|OMEGA|PATTERN_(?:DROP|EXPLODE|ANGLE(?:_CONE(?:_EMPTY)?)?)))|VEHICLE_(?:REFERENCE_FRAME|TYPE_(?:NONE|SLED|CAR|BOAT|AIRPLANE|BALLOON)|(?:LINEAR|ANGULAR)_(?:FRICTION_TIMESCALE|MOTOR_DIRECTION)|LINEAR_MOTOR_OFFSET|HOVER_(?:HEIGHT|EFFICIENCY|TIMESCALE)|BUOYANCY|(?:LINEAR|ANGULAR)_(?:DEFLECTION_(?:EFFICIENCY|TIMESCALE)|MOTOR_(?:DECAY_)?TIMESCALE)|VERTICAL_ATTRACTION_(?:EFFICIENCY|TIMESCALE)|BANKING_(?:EFFICIENCY|MIX|TIMESCALE)|FLAG_(?:NO_DEFLECTION_UP|LIMIT_(?:ROLL_ONLY|MOTOR_UP)|HOVER_(?:(?:WATER|TERRAIN|UP)_ONLY|GLOBAL_HEIGHT)|MOUSELOOK_(?:STEER|BANK)|CAMERA_DECOUPLED))|PRIM_(?:ALPHA_MODE(?:_(?:BLEND|EMISSIVE|MASK|NONE))?|NORMAL|SPECULAR|TYPE(?:_(?:BOX|CYLINDER|PRISM|SPHERE|TORUS|TUBE|RING|SCULPT))?|HOLE_(?:DEFAULT|CIRCLE|SQUARE|TRIANGLE)|MATERIAL(?:_(?:STONE|METAL|GLASS|WOOD|FLESH|PLASTIC|RUBBER))?|SHINY_(?:NONE|LOW|MEDIUM|HIGH)|BUMP_(?:NONE|BRIGHT|DARK|WOOD|BARK|BRICKS|CHECKER|CONCRETE|TILE|STONE|DISKS|GRAVEL|BLOBS|SIDING|LARGETILE|STUCCO|SUCTION|WEAVE)|TEXGEN_(?:DEFAULT|PLANAR)|SCULPT_(?:TYPE_(?:SPHERE|TORUS|PLANE|CYLINDER|MASK)|FLAG_(?:MIRROR|INVERT))|PHYSICS(?:_(?:SHAPE_(?:CONVEX|NONE|PRIM|TYPE)))?|(?:POS|ROT)_LOCAL|SLICE|TEXT|FLEXIBLE|POINT_LIGHT|TEMP_ON_REZ|PHANTOM|POSITION|SIZE|ROTATION|TEXTURE|NAME|OMEGA|DESC|LINK_TARGET|COLOR|BUMP_SHINY|FULLBRIGHT|TEXGEN|GLOW|MEDIA_(?:ALT_IMAGE_ENABLE|CONTROLS|(?:CURRENT|HOME)_URL|AUTO_(?:LOOP|PLAY|SCALE|ZOOM)|FIRST_CLICK_INTERACT|(?:WIDTH|HEIGHT)_PIXELS|WHITELIST(?:_ENABLE)?|PERMS_(?:INTERACT|CONTROL)|PARAM_MAX|CONTROLS_(?:STANDARD|MINI)|PERM_(?:NONE|OWNER|GROUP|ANYONE)|MAX_(?:URL_LENGTH|WHITELIST_(?:SIZE|COUNT)|(?:WIDTH|HEIGHT)_PIXELS)))|MASK_(?:BASE|OWNER|GROUP|EVERYONE|NEXT)|PERM_(?:TRANSFER|MODIFY|COPY|MOVE|ALL)|PARCEL_(?:MEDIA_COMMAND_(?:STOP|PAUSE|PLAY|LOOP|TEXTURE|URL|TIME|AGENT|UNLOAD|AUTO_ALIGN|TYPE|SIZE|DESC|LOOP_SET)|FLAG_(?:ALLOW_(?:FLY|(?:GROUP_)?SCRIPTS|LANDMARK|TERRAFORM|DAMAGE|CREATE_(?:GROUP_)?OBJECTS)|USE_(?:ACCESS_(?:GROUP|LIST)|BAN_LIST|LAND_PASS_LIST)|LOCAL_SOUND_ONLY|RESTRICT_PUSHOBJECT|ALLOW_(?:GROUP|ALL)_OBJECT_ENTRY)|COUNT_(?:TOTAL|OWNER|GROUP|OTHER|SELECTED|TEMP)|DETAILS_(?:NAME|DESC|OWNER|GROUP|AREA|ID|SEE_AVATARS))|LIST_STAT_(?:MAX|MIN|MEAN|MEDIAN|STD_DEV|SUM(?:_SQUARES)?|NUM_COUNT|GEOMETRIC_MEAN|RANGE)|PAY_(?:HIDE|DEFAULT)|REGION_FLAG_(?:ALLOW_DAMAGE|FIXED_SUN|BLOCK_TERRAFORM|SANDBOX|DISABLE_(?:COLLISIONS|PHYSICS)|BLOCK_FLY|ALLOW_DIRECT_TELEPORT|RESTRICT_PUSHOBJECT)|HTTP_(?:METHOD|MIMETYPE|BODY_(?:MAXLENGTH|TRUNCATED)|CUSTOM_HEADER|PRAGMA_NO_CACHE|VERBOSE_THROTTLE|VERIFY_CERT)|STRING_(?:TRIM(?:_(?:HEAD|TAIL))?)|CLICK_ACTION_(?:NONE|TOUCH|SIT|BUY|PAY|OPEN(?:_MEDIA)?|PLAY|ZOOM)|TOUCH_INVALID_FACE|PROFILE_(?:NONE|SCRIPT_MEMORY)|RC_(?:DATA_FLAGS|DETECT_PHANTOM|GET_(?:LINK_NUM|NORMAL|ROOT_KEY)|MAX_HITS|REJECT_(?:TYPES|AGENTS|(?:NON)?PHYSICAL|LAND))|RCERR_(?:CAST_TIME_EXCEEDED|SIM_PERF_LOW|UNKNOWN)|ESTATE_ACCESS_(?:ALLOWED_(?:AGENT|GROUP)_(?:ADD|REMOVE)|BANNED_AGENT_(?:ADD|REMOVE))|DENSITY|FRICTION|RESTITUTION|GRAVITY_MULTIPLIER|KFM_(?:COMMAND|CMD_(?:PLAY|STOP|PAUSE)|MODE|FORWARD|LOOP|PING_PONG|REVERSE|DATA|ROTATION|TRANSLATION)|ERR_(?:GENERIC|PARCEL_PERMISSIONS|MALFORMED_PARAMS|RUNTIME_PERMISSIONS|THROTTLED)|CHARACTER_(?:CMD_(?:(?:SMOOTH_)?STOP|JUMP)|DESIRED_(?:TURN_)?SPEED|RADIUS|STAY_WITHIN_PARCEL|LENGTH|ORIENTATION|ACCOUNT_FOR_SKIPPED_FRAMES|AVOIDANCE_MODE|TYPE(?:_(?:[ABCD]|NONE))?|MAX_(?:DECEL|TURN_RADIUS|(?:ACCEL|SPEED)))|PURSUIT_(?:OFFSET|FUZZ_FACTOR|GOAL_TOLERANCE|INTERCEPT)|REQUIRE_LINE_OF_SIGHT|FORCE_DIRECT_PATH|VERTICAL|HORIZONTAL|AVOID_(?:CHARACTERS|DYNAMIC_OBSTACLES|NONE)|PU_(?:EVADE_(?:HIDDEN|SPOTTED)|FAILURE_(?:DYNAMIC_PATHFINDING_DISABLED|INVALID_(?:GOAL|START)|NO_(?:NAVMESH|VALID_DESTINATION)|OTHER|TARGET_GONE|(?:PARCEL_)?UNREACHABLE)|(?:GOAL|SLOWDOWN_DISTANCE)_REACHED)|TRAVERSAL_TYPE(?:_(?:FAST|NONE|SLOW))?|CONTENT_TYPE_(?:ATOM|FORM|HTML|JSON|LLSD|RSS|TEXT|XHTML|XML)|GCNP_(?:RADIUS|STATIC)|(?:PATROL|WANDER)_PAUSE_AT_WAYPOINTS|OPT_(?:AVATAR|CHARACTER|EXCLUSION_VOLUME|LEGACY_LINKSET|MATERIAL_VOLUME|OTHER|STATIC_OBSTACLE|WALKABLE)|SIM_STAT_PCT_CHARS_STEPPED)\\b'},{begin:'\\b(?:FALSE|TRUE)\\b'},{begin:'\\b(?:ZERO_ROTATION)\\b'},{begin:'\\b(?:EOF|JSON_(?:ARRAY|DELETE|FALSE|INVALID|NULL|NUMBER|OBJECT|STRING|TRUE)|NULL_KEY|TEXTURE_(?:BLANK|DEFAULT|MEDIA|PLYWOOD|TRANSPARENT)|URL_REQUEST_(?:GRANTED|DENIED))\\b'},{begin:'\\b(?:ZERO_VECTOR|TOUCH_INVALID_(?:TEXCOORD|VECTOR))\\b'}]};var LSL_FUNCTIONS={className:'built_in',begin:'\\b(?:ll(?:AgentInExperience|(?:Create|DataSize|Delete|KeyCount|Keys|Read|Update)KeyValue|GetExperience(?:Details|ErrorMessage)|ReturnObjectsBy(?:ID|Owner)|Json(?:2List|[GS]etValue|ValueType)|Sin|Cos|Tan|Atan2|Sqrt|Pow|Abs|Fabs|Frand|Floor|Ceil|Round|Vec(?:Mag|Norm|Dist)|Rot(?:Between|2(?:Euler|Fwd|Left|Up))|(?:Euler|Axes)2Rot|Whisper|(?:Region|Owner)?Say|Shout|Listen(?:Control|Remove)?|Sensor(?:Repeat|Remove)?|Detected(?:Name|Key|Owner|Type|Pos|Vel|Grab|Rot|Group|LinkNumber)|Die|Ground|Wind|(?:[GS]et)(?:AnimationOverride|MemoryLimit|PrimMediaParams|ParcelMusicURL|Object(?:Desc|Name)|PhysicsMaterial|Status|Scale|Color|Alpha|Texture|Pos|Rot|Force|Torque)|ResetAnimationOverride|(?:Scale|Offset|Rotate)Texture|(?:Rot)?Target(?:Remove)?|(?:Stop)?MoveToTarget|Apply(?:Rotational)?Impulse|Set(?:KeyframedMotion|ContentType|RegionPos|(?:Angular)?Velocity|Buoyancy|HoverHeight|ForceAndTorque|TimerEvent|ScriptState|Damage|TextureAnim|Sound(?:Queueing|Radius)|Vehicle(?:Type|(?:Float|Vector|Rotation)Param)|(?:Touch|Sit)?Text|Camera(?:Eye|At)Offset|PrimitiveParams|ClickAction|Link(?:Alpha|Color|PrimitiveParams(?:Fast)?|Texture(?:Anim)?|Camera|Media)|RemoteScriptAccessPin|PayPrice|LocalRot)|ScaleByFactor|Get(?:(?:Max|Min)ScaleFactor|ClosestNavPoint|StaticPath|SimStats|Env|PrimitiveParams|Link(?:PrimitiveParams|Number(?:OfSides)?|Key|Name|Media)|HTTPHeader|FreeURLs|Object(?:Details|PermMask|PrimCount)|Parcel(?:MaxPrims|Details|Prim(?:Count|Owners))|Attached(?:List)?|(?:SPMax|Free|Used)Memory|Region(?:Name|TimeDilation|FPS|Corner|AgentCount)|Root(?:Position|Rotation)|UnixTime|(?:Parcel|Region)Flags|(?:Wall|GMT)clock|SimulatorHostname|BoundingBox|GeometricCenter|Creator|NumberOf(?:Prims|NotecardLines|Sides)|Animation(?:List)?|(?:Camera|Local)(?:Pos|Rot)|Vel|Accel|Omega|Time(?:stamp|OfDay)|(?:Object|CenterOf)?Mass|MassMKS|Energy|Owner|(?:Owner)?Key|SunDirection|Texture(?:Offset|Scale|Rot)|Inventory(?:Number|Name|Key|Type|Creator|PermMask)|Permissions(?:Key)?|StartParameter|List(?:Length|EntryType)|Date|Agent(?:Size|Info|Language|List)|LandOwnerAt|NotecardLine|Script(?:Name|State))|(?:Get|Reset|GetAndReset)Time|PlaySound(?:Slave)?|LoopSound(?:Master|Slave)?|(?:Trigger|Stop|Preload)Sound|(?:(?:Get|Delete)Sub|Insert)String|To(?:Upper|Lower)|Give(?:InventoryList|Money)|RezObject|(?:Stop)?LookAt|Sleep|CollisionFilter|(?:Take|Release)Controls|DetachFromAvatar|AttachToAvatar(?:Temp)?|InstantMessage|(?:GetNext)?Email|StopHover|MinEventDelay|RotLookAt|String(?:Length|Trim)|(?:Start|Stop)Animation|TargetOmega|Request(?:Experience)?Permissions|(?:Create|Break)Link|BreakAllLinks|(?:Give|Remove)Inventory|Water|PassTouches|Request(?:Agent|Inventory)Data|TeleportAgent(?:Home|GlobalCoords)?|ModifyLand|CollisionSound|ResetScript|MessageLinked|PushObject|PassCollisions|AxisAngle2Rot|Rot2(?:Axis|Angle)|A(?:cos|sin)|AngleBetween|AllowInventoryDrop|SubStringIndex|List2(?:CSV|Integer|Json|Float|String|Key|Vector|Rot|List(?:Strided)?)|DeleteSubList|List(?:Statistics|Sort|Randomize|(?:Insert|Find|Replace)List)|EdgeOfWorld|AdjustSoundVolume|Key2Name|TriggerSoundLimited|EjectFromLand|(?:CSV|ParseString)2List|OverMyLand|SameGroup|UnSit|Ground(?:Slope|Normal|Contour)|GroundRepel|(?:Set|Remove)VehicleFlags|(?:AvatarOn)?(?:Link)?SitTarget|Script(?:Danger|Profiler)|Dialog|VolumeDetect|ResetOtherScript|RemoteLoadScriptPin|(?:Open|Close)RemoteDataChannel|SendRemoteData|RemoteDataReply|(?:Integer|String)ToBase64|XorBase64|Log(?:10)?|Base64To(?:String|Integer)|ParseStringKeepNulls|RezAtRoot|RequestSimulatorData|ForceMouselook|(?:Load|Release|(?:E|Une)scape)URL|ParcelMedia(?:CommandList|Query)|ModPow|MapDestination|(?:RemoveFrom|AddTo|Reset)Land(?:Pass|Ban)List|(?:Set|Clear)CameraParams|HTTP(?:Request|Response)|TextBox|DetectedTouch(?:UV|Face|Pos|(?:N|Bin)ormal|ST)|(?:MD5|SHA1|DumpList2)String|Request(?:Secure)?URL|Clear(?:Prim|Link)Media|(?:Link)?ParticleSystem|(?:Get|Request)(?:Username|DisplayName)|RegionSayTo|CastRay|GenerateKey|TransferLindenDollars|ManageEstateAccess|(?:Create|Delete)Character|ExecCharacterCmd|Evade|FleeFrom|NavigateTo|PatrolPoints|Pursue|UpdateCharacter|WanderWithin))\\b'};return{illegal:':',contains:[LSL_STRINGS,{className:'comment',variants:[hljs.COMMENT('//','$'),hljs.COMMENT('/\\*','\\*/')]},LSL_NUMBERS,{className:'section',variants:[{begin:'\\b(?:state|default)\\b'},{begin:'\\b(?:state_(?:entry|exit)|touch(?:_(?:start|end))?|(?:land_)?collision(?:_(?:start|end))?|timer|listen|(?:no_)?sensor|control|(?:not_)?at_(?:rot_)?target|money|email|experience_permissions(?:_denied)?|run_time_permissions|changed|attach|dataserver|moving_(?:start|end)|link_message|(?:on|object)_rez|remote_data|http_re(?:sponse|quest)|path_update|transaction_result)\\b'}]},LSL_FUNCTIONS,LSL_CONSTANTS,{className:'type',begin:'\\b(?:integer|float|string|key|vector|quaternion|rotation|list)\\b'}]};});hljs.registerLanguage('lua',function(hljs){var OPENING_LONG_BRACKET='\\[=*\\[';var CLOSING_LONG_BRACKET='\\]=*\\]';var LONG_BRACKETS={begin:OPENING_LONG_BRACKET,end:CLOSING_LONG_BRACKET,contains:['self']};var COMMENTS=[hljs.COMMENT('--(?!'+OPENING_LONG_BRACKET+')','$'),hljs.COMMENT('--'+OPENING_LONG_BRACKET,CLOSING_LONG_BRACKET,{contains:[LONG_BRACKETS],relevance:10})];return{lexemes:hljs.UNDERSCORE_IDENT_RE,keywords:{literal:"true false nil",keyword:"and break do else elseif end for goto if in local not or repeat return then until while",built_in://Metatags and globals:
'_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len '+'__gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert '+//Standard methods and properties:
'collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring'+'module next pairs pcall print rawequal rawget rawset require select setfenv'+'setmetatable tonumber tostring type unpack xpcall arg self'+//Library methods and properties (one line per library):
'coroutine resume yield status wrap create running debug getupvalue'+'debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv'+'io lines write close flush open output type read stderr stdin input stdout popen tmpfile'+'math, log, max, acos, huge, ldexp, pi, cos, tanh, pow, deg, tan, cosh, sinh, random, randomseed, frexp, ceil, floor, rad, abs, sqrt, modf, asin, min, mod, fmod, log10, atan2, exp, sin, atan'+'os, exit, setlocale, date, getenv, difftime, remove, time, clock, tmpname, rename, execute, package, preload, loadlib, loaded, loaders, cpath, config path, seeall'+'string, sub, upper, len, gfind, rep, find, match, char, dump, gmatch, reverse, byte, format, gsub, lower'+'table, setn, insert, getn, foreachi, maxn, foreach, concat, sort, remove'},contains:COMMENTS.concat([{className:'function',beginKeywords:'function',end:'\\)',contains:[hljs.inherit(hljs.TITLE_MODE,{begin:'([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'}),{className:'params',begin:'\\(',endsWithParent:true,contains:COMMENTS}].concat(COMMENTS)},hljs.C_NUMBER_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{className:'string',begin:OPENING_LONG_BRACKET,end:CLOSING_LONG_BRACKET,contains:[LONG_BRACKETS],relevance:5}])};});hljs.registerLanguage('makefile',function(hljs){var VARIABLE={className:'variable',begin:/\$\(/,end:/\)/,contains:[hljs.BACKSLASH_ESCAPE]};return{aliases:['mk','mak'],contains:[hljs.HASH_COMMENT_MODE,{begin:/^\w+\s*\W*=/,returnBegin:true,relevance:0,starts:{end:/\s*\W*=/,excludeEnd:true,starts:{end:/$/,relevance:0,contains:[VARIABLE]}}},{className:'section',begin:/^[\w]+:\s*$/},{className:'meta',begin:/^\.PHONY:/,end:/$/,keywords:{'meta-keyword':'.PHONY'},lexemes:/[\.\w]+/},{begin:/^\t+/,end:/$/,relevance:0,contains:[hljs.QUOTE_STRING_MODE,VARIABLE]}]};});hljs.registerLanguage('mathematica',function(hljs){return{aliases:['mma'],lexemes:'(\\$|\\b)'+hljs.IDENT_RE+'\\b',keywords:'AbelianGroup Abort AbortKernels AbortProtect Above Abs Absolute AbsoluteCorrelation AbsoluteCorrelationFunction AbsoluteCurrentValue AbsoluteDashing AbsoluteFileName AbsoluteOptions AbsolutePointSize AbsoluteThickness AbsoluteTime AbsoluteTiming AccountingForm Accumulate Accuracy AccuracyGoal ActionDelay ActionMenu ActionMenuBox ActionMenuBoxOptions Active ActiveItem ActiveStyle AcyclicGraphQ AddOnHelpPath AddTo AdjacencyGraph AdjacencyList AdjacencyMatrix AdjustmentBox AdjustmentBoxOptions AdjustTimeSeriesForecast AffineTransform After AiryAi AiryAiPrime AiryAiZero AiryBi AiryBiPrime AiryBiZero AlgebraicIntegerQ AlgebraicNumber AlgebraicNumberDenominator AlgebraicNumberNorm AlgebraicNumberPolynomial AlgebraicNumberTrace AlgebraicRules AlgebraicRulesData Algebraics AlgebraicUnitQ Alignment AlignmentMarker AlignmentPoint All AllowedDimensions AllowGroupClose AllowInlineCells AllowKernelInitialization AllowReverseGroupClose AllowScriptLevelChange AlphaChannel AlternatingGroup AlternativeHypothesis Alternatives AmbientLight Analytic AnchoredSearch And AndersonDarlingTest AngerJ AngleBracket AngularGauge Animate AnimationCycleOffset AnimationCycleRepetitions AnimationDirection AnimationDisplayTime AnimationRate AnimationRepetitions AnimationRunning Animator AnimatorBox AnimatorBoxOptions AnimatorElements Annotation Annuity AnnuityDue Antialiasing Antisymmetric Apart ApartSquareFree Appearance AppearanceElements AppellF1 Append AppendTo Apply ArcCos ArcCosh ArcCot ArcCoth ArcCsc ArcCsch ArcSec ArcSech ArcSin ArcSinDistribution ArcSinh ArcTan ArcTanh Arg ArgMax ArgMin ArgumentCountQ ARIMAProcess ArithmeticGeometricMean ARMAProcess ARProcess Array ArrayComponents ArrayDepth ArrayFlatten ArrayPad ArrayPlot ArrayQ ArrayReshape ArrayRules Arrays Arrow Arrow3DBox ArrowBox Arrowheads AspectRatio AspectRatioFixed Assert Assuming Assumptions AstronomicalData Asynchronous AsynchronousTaskObject AsynchronousTasks AtomQ Attributes AugmentedSymmetricPolynomial AutoAction AutoDelete AutoEvaluateEvents AutoGeneratedPackage AutoIndent AutoIndentSpacings AutoItalicWords AutoloadPath AutoMatch Automatic AutomaticImageSize AutoMultiplicationSymbol AutoNumberFormatting AutoOpenNotebooks AutoOpenPalettes AutorunSequencing AutoScaling AutoScroll AutoSpacing AutoStyleOptions AutoStyleWords Axes AxesEdge AxesLabel AxesOrigin AxesStyle Axis '+'BabyMonsterGroupB Back Background BackgroundTasksSettings Backslash Backsubstitution Backward Band BandpassFilter BandstopFilter BarabasiAlbertGraphDistribution BarChart BarChart3D BarLegend BarlowProschanImportance BarnesG BarOrigin BarSpacing BartlettHannWindow BartlettWindow BaseForm Baseline BaselinePosition BaseStyle BatesDistribution BattleLemarieWavelet Because BeckmannDistribution Beep Before Begin BeginDialogPacket BeginFrontEndInteractionPacket BeginPackage BellB BellY Below BenfordDistribution BeniniDistribution BenktanderGibratDistribution BenktanderWeibullDistribution BernoulliB BernoulliDistribution BernoulliGraphDistribution BernoulliProcess BernsteinBasis BesselFilterModel BesselI BesselJ BesselJZero BesselK BesselY BesselYZero Beta BetaBinomialDistribution BetaDistribution BetaNegativeBinomialDistribution BetaPrimeDistribution BetaRegularized BetweennessCentrality BezierCurve BezierCurve3DBox BezierCurve3DBoxOptions BezierCurveBox BezierCurveBoxOptions BezierFunction BilateralFilter Binarize BinaryFormat BinaryImageQ BinaryRead BinaryReadList BinaryWrite BinCounts BinLists Binomial BinomialDistribution BinomialProcess BinormalDistribution BiorthogonalSplineWavelet BipartiteGraphQ BirnbaumImportance BirnbaumSaundersDistribution BitAnd BitClear BitGet BitLength BitNot BitOr BitSet BitShiftLeft BitShiftRight BitXor Black BlackmanHarrisWindow BlackmanNuttallWindow BlackmanWindow Blank BlankForm BlankNullSequence BlankSequence Blend Block BlockRandom BlomqvistBeta BlomqvistBetaTest Blue Blur BodePlot BohmanWindow Bold Bookmarks Boole BooleanConsecutiveFunction BooleanConvert BooleanCountingFunction BooleanFunction BooleanGraph BooleanMaxterms BooleanMinimize BooleanMinterms Booleans BooleanTable BooleanVariables BorderDimensions BorelTannerDistribution Bottom BottomHatTransform BoundaryStyle Bounds Box BoxBaselineShift BoxData BoxDimensions Boxed Boxes BoxForm BoxFormFormatTypes BoxFrame BoxID BoxMargins BoxMatrix BoxRatios BoxRotation BoxRotationPoint BoxStyle BoxWhiskerChart Bra BracketingBar BraKet BrayCurtisDistance BreadthFirstScan Break Brown BrownForsytheTest BrownianBridgeProcess BrowserCategory BSplineBasis BSplineCurve BSplineCurve3DBox BSplineCurveBox BSplineCurveBoxOptions BSplineFunction BSplineSurface BSplineSurface3DBox BubbleChart BubbleChart3D BubbleScale BubbleSizes BulletGauge BusinessDayQ ButterflyGraph ButterworthFilterModel Button ButtonBar ButtonBox ButtonBoxOptions ButtonCell ButtonContents ButtonData ButtonEvaluator ButtonExpandable ButtonFrame ButtonFunction ButtonMargins ButtonMinHeight ButtonNote ButtonNotebook ButtonSource ButtonStyle ButtonStyleMenuListing Byte ByteCount ByteOrdering '+'C CachedValue CacheGraphics CalendarData CalendarType CallPacket CanberraDistance Cancel CancelButton CandlestickChart Cap CapForm CapitalDifferentialD CardinalBSplineBasis CarmichaelLambda Cases Cashflow Casoratian Catalan CatalanNumber Catch CauchyDistribution CauchyWindow CayleyGraph CDF CDFDeploy CDFInformation CDFWavelet Ceiling Cell CellAutoOverwrite CellBaseline CellBoundingBox CellBracketOptions CellChangeTimes CellContents CellContext CellDingbat CellDynamicExpression CellEditDuplicate CellElementsBoundingBox CellElementSpacings CellEpilog CellEvaluationDuplicate CellEvaluationFunction CellEventActions CellFrame CellFrameColor CellFrameLabelMargins CellFrameLabels CellFrameMargins CellGroup CellGroupData CellGrouping CellGroupingRules CellHorizontalScrolling CellID CellLabel CellLabelAutoDelete CellLabelMargins CellLabelPositioning CellMargins CellObject CellOpen CellPrint CellProlog Cells CellSize CellStyle CellTags CellularAutomaton CensoredDistribution Censoring Center CenterDot CentralMoment CentralMomentGeneratingFunction CForm ChampernowneNumber ChanVeseBinarize Character CharacterEncoding CharacterEncodingsPath CharacteristicFunction CharacteristicPolynomial CharacterRange Characters ChartBaseStyle ChartElementData ChartElementDataFunction ChartElementFunction ChartElements ChartLabels ChartLayout ChartLegends ChartStyle Chebyshev1FilterModel Chebyshev2FilterModel ChebyshevDistance ChebyshevT ChebyshevU Check CheckAbort CheckAll Checkbox CheckboxBar CheckboxBox CheckboxBoxOptions ChemicalData ChessboardDistance ChiDistribution ChineseRemainder ChiSquareDistribution ChoiceButtons ChoiceDialog CholeskyDecomposition Chop Circle CircleBox CircleDot CircleMinus CirclePlus CircleTimes CirculantGraph CityData Clear ClearAll ClearAttributes ClearSystemCache ClebschGordan ClickPane Clip ClipboardNotebook ClipFill ClippingStyle ClipPlanes ClipRange Clock ClockGauge ClockwiseContourIntegral Close Closed CloseKernels ClosenessCentrality Closing ClosingAutoSave ClosingEvent ClusteringComponents CMYKColor Coarse Coefficient CoefficientArrays CoefficientDomain CoefficientList CoefficientRules CoifletWavelet Collect Colon ColonForm ColorCombine ColorConvert ColorData ColorDataFunction ColorFunction ColorFunctionScaling Colorize ColorNegate ColorOutput ColorProfileData ColorQuantize ColorReplace ColorRules ColorSelectorSettings ColorSeparate ColorSetter ColorSetterBox ColorSetterBoxOptions ColorSlider ColorSpace Column ColumnAlignments ColumnBackgrounds ColumnForm ColumnLines ColumnsEqual ColumnSpacings ColumnWidths CommonDefaultFormatTypes Commonest CommonestFilter CommonUnits CommunityBoundaryStyle CommunityGraphPlot CommunityLabels CommunityRegionStyle CompatibleUnitQ CompilationOptions CompilationTarget Compile Compiled CompiledFunction Complement CompleteGraph CompleteGraphQ CompleteKaryTree CompletionsListPacket Complex Complexes ComplexExpand ComplexInfinity ComplexityFunction ComponentMeasurements '+'ComponentwiseContextMenu Compose ComposeList ComposeSeries Composition CompoundExpression CompoundPoissonDistribution CompoundPoissonProcess CompoundRenewalProcess Compress CompressedData Condition ConditionalExpression Conditioned Cone ConeBox ConfidenceLevel ConfidenceRange ConfidenceTransform ConfigurationPath Congruent Conjugate ConjugateTranspose Conjunction Connect ConnectedComponents ConnectedGraphQ ConnesWindow ConoverTest ConsoleMessage ConsoleMessagePacket ConsolePrint Constant ConstantArray Constants ConstrainedMax ConstrainedMin ContentPadding ContentsBoundingBox ContentSelectable ContentSize Context ContextMenu Contexts ContextToFilename ContextToFileName Continuation Continue ContinuedFraction ContinuedFractionK ContinuousAction ContinuousMarkovProcess ContinuousTimeModelQ ContinuousWaveletData ContinuousWaveletTransform ContourDetect ContourGraphics ContourIntegral ContourLabels ContourLines ContourPlot ContourPlot3D Contours ContourShading ContourSmoothing ContourStyle ContraharmonicMean Control ControlActive ControlAlignment ControllabilityGramian ControllabilityMatrix ControllableDecomposition ControllableModelQ ControllerDuration ControllerInformation ControllerInformationData ControllerLinking ControllerManipulate ControllerMethod ControllerPath ControllerState ControlPlacement ControlsRendering ControlType Convergents ConversionOptions ConversionRules ConvertToBitmapPacket ConvertToPostScript ConvertToPostScriptPacket Convolve ConwayGroupCo1 ConwayGroupCo2 ConwayGroupCo3 CoordinateChartData CoordinatesToolOptions CoordinateTransform CoordinateTransformData CoprimeQ Coproduct CopulaDistribution Copyable CopyDirectory CopyFile CopyTag CopyToClipboard CornerFilter CornerNeighbors Correlation CorrelationDistance CorrelationFunction CorrelationTest Cos Cosh CoshIntegral CosineDistance CosineWindow CosIntegral Cot Coth Count CounterAssignments CounterBox CounterBoxOptions CounterClockwiseContourIntegral CounterEvaluator CounterFunction CounterIncrements CounterStyle CounterStyleMenuListing CountRoots CountryData Covariance CovarianceEstimatorFunction CovarianceFunction CoxianDistribution CoxIngersollRossProcess CoxModel CoxModelFit CramerVonMisesTest CreateArchive CreateDialog CreateDirectory CreateDocument CreateIntermediateDirectories CreatePalette CreatePalettePacket CreateScheduledTask CreateTemporary CreateWindow CriticalityFailureImportance CriticalitySuccessImportance CriticalSection Cross CrossingDetect CrossMatrix Csc Csch CubeRoot Cubics Cuboid CuboidBox Cumulant CumulantGeneratingFunction Cup CupCap Curl CurlyDoubleQuote CurlyQuote CurrentImage CurrentlySpeakingPacket CurrentValue CurvatureFlowFilter CurveClosed Cyan CycleGraph CycleIndexPolynomial Cycles CyclicGroup Cyclotomic Cylinder CylinderBox CylindricalDecomposition '+'D DagumDistribution DamerauLevenshteinDistance DampingFactor Darker Dashed Dashing DataCompression DataDistribution DataRange DataReversed Date DateDelimiters DateDifference DateFunction DateList DateListLogPlot DateListPlot DatePattern DatePlus DateRange DateString DateTicksFormat DaubechiesWavelet DavisDistribution DawsonF DayCount DayCountConvention DayMatchQ DayName DayPlus DayRange DayRound DeBruijnGraph Debug DebugTag Decimal DeclareKnownSymbols DeclarePackage Decompose Decrement DedekindEta Default DefaultAxesStyle DefaultBaseStyle DefaultBoxStyle DefaultButton DefaultColor DefaultControlPlacement DefaultDuplicateCellStyle DefaultDuration DefaultElement DefaultFaceGridsStyle DefaultFieldHintStyle DefaultFont DefaultFontProperties DefaultFormatType DefaultFormatTypeForStyle DefaultFrameStyle DefaultFrameTicksStyle DefaultGridLinesStyle DefaultInlineFormatType DefaultInputFormatType DefaultLabelStyle DefaultMenuStyle DefaultNaturalLanguage DefaultNewCellStyle DefaultNewInlineCellStyle DefaultNotebook DefaultOptions DefaultOutputFormatType DefaultStyle DefaultStyleDefinitions DefaultTextFormatType DefaultTextInlineFormatType DefaultTicksStyle DefaultTooltipStyle DefaultValues Defer DefineExternal DefineInputStreamMethod DefineOutputStreamMethod Definition Degree DegreeCentrality DegreeGraphDistribution DegreeLexicographic DegreeReverseLexicographic Deinitialization Del Deletable Delete DeleteBorderComponents DeleteCases DeleteContents DeleteDirectory DeleteDuplicates DeleteFile DeleteSmallComponents DeleteWithContents DeletionWarning Delimiter DelimiterFlashTime DelimiterMatching Delimiters Denominator DensityGraphics DensityHistogram DensityPlot DependentVariables Deploy Deployed Depth DepthFirstScan Derivative DerivativeFilter DescriptorStateSpace DesignMatrix Det DGaussianWavelet DiacriticalPositioning Diagonal DiagonalMatrix Dialog DialogIndent DialogInput DialogLevel DialogNotebook DialogProlog DialogReturn DialogSymbols Diamond DiamondMatrix DiceDissimilarity DictionaryLookup DifferenceDelta DifferenceOrder DifferenceRoot DifferenceRootReduce Differences DifferentialD DifferentialRoot DifferentialRootReduce DifferentiatorFilter DigitBlock DigitBlockMinimum DigitCharacter DigitCount DigitQ DihedralGroup Dilation Dimensions DiracComb DiracDelta DirectedEdge DirectedEdges DirectedGraph DirectedGraphQ DirectedInfinity Direction Directive Directory DirectoryName DirectoryQ DirectoryStack DirichletCharacter DirichletConvolve DirichletDistribution DirichletL DirichletTransform DirichletWindow DisableConsolePrintPacket DiscreteChirpZTransform DiscreteConvolve DiscreteDelta DiscreteHadamardTransform DiscreteIndicator DiscreteLQEstimatorGains DiscreteLQRegulatorGains DiscreteLyapunovSolve DiscreteMarkovProcess DiscretePlot DiscretePlot3D DiscreteRatio DiscreteRiccatiSolve DiscreteShift DiscreteTimeModelQ DiscreteUniformDistribution DiscreteVariables DiscreteWaveletData DiscreteWaveletPacketTransform '+'DiscreteWaveletTransform Discriminant Disjunction Disk DiskBox DiskMatrix Dispatch DispersionEstimatorFunction Display DisplayAllSteps DisplayEndPacket DisplayFlushImagePacket DisplayForm DisplayFunction DisplayPacket DisplayRules DisplaySetSizePacket DisplayString DisplayTemporary DisplayWith DisplayWithRef DisplayWithVariable DistanceFunction DistanceTransform Distribute Distributed DistributedContexts DistributeDefinitions DistributionChart DistributionDomain DistributionFitTest DistributionParameterAssumptions DistributionParameterQ Dithering Div Divergence Divide DivideBy Dividers Divisible Divisors DivisorSigma DivisorSum DMSList DMSString Do DockedCells DocumentNotebook DominantColors DOSTextFormat Dot DotDashed DotEqual Dotted DoubleBracketingBar DoubleContourIntegral DoubleDownArrow DoubleLeftArrow DoubleLeftRightArrow DoubleLeftTee DoubleLongLeftArrow DoubleLongLeftRightArrow DoubleLongRightArrow DoubleRightArrow DoubleRightTee DoubleUpArrow DoubleUpDownArrow DoubleVerticalBar DoublyInfinite Down DownArrow DownArrowBar DownArrowUpArrow DownLeftRightVector DownLeftTeeVector DownLeftVector DownLeftVectorBar DownRightTeeVector DownRightVector DownRightVectorBar Downsample DownTee DownTeeArrow DownValues DragAndDrop DrawEdges DrawFrontFaces DrawHighlighted Drop DSolve Dt DualLinearProgramming DualSystemsModel DumpGet DumpSave DuplicateFreeQ Dynamic DynamicBox DynamicBoxOptions DynamicEvaluationTimeout DynamicLocation DynamicModule DynamicModuleBox DynamicModuleBoxOptions DynamicModuleParent DynamicModuleValues DynamicName DynamicNamespace DynamicReference DynamicSetting DynamicUpdating DynamicWrapper DynamicWrapperBox DynamicWrapperBoxOptions '+'E EccentricityCentrality EdgeAdd EdgeBetweennessCentrality EdgeCapacity EdgeCapForm EdgeColor EdgeConnectivity EdgeCost EdgeCount EdgeCoverQ EdgeDashing EdgeDelete EdgeDetect EdgeForm EdgeIndex EdgeJoinForm EdgeLabeling EdgeLabels EdgeLabelStyle EdgeList EdgeOpacity EdgeQ EdgeRenderingFunction EdgeRules EdgeShapeFunction EdgeStyle EdgeThickness EdgeWeight Editable EditButtonSettings EditCellTagsSettings EditDistance EffectiveInterest Eigensystem Eigenvalues EigenvectorCentrality Eigenvectors Element ElementData Eliminate EliminationOrder EllipticE EllipticExp EllipticExpPrime EllipticF EllipticFilterModel EllipticK EllipticLog EllipticNomeQ EllipticPi EllipticReducedHalfPeriods EllipticTheta EllipticThetaPrime EmitSound EmphasizeSyntaxErrors EmpiricalDistribution Empty EmptyGraphQ EnableConsolePrintPacket Enabled Encode End EndAdd EndDialogPacket EndFrontEndInteractionPacket EndOfFile EndOfLine EndOfString EndPackage EngineeringForm Enter EnterExpressionPacket EnterTextPacket Entropy EntropyFilter Environment Epilog Equal EqualColumns EqualRows EqualTilde EquatedTo Equilibrium EquirippleFilterKernel Equivalent Erf Erfc Erfi ErlangB ErlangC ErlangDistribution Erosion ErrorBox ErrorBoxOptions ErrorNorm ErrorPacket ErrorsDialogSettings EstimatedDistribution EstimatedProcess EstimatorGains EstimatorRegulator EuclideanDistance EulerE EulerGamma EulerianGraphQ EulerPhi Evaluatable Evaluate Evaluated EvaluatePacket EvaluationCell EvaluationCompletionAction EvaluationElements EvaluationMode EvaluationMonitor EvaluationNotebook EvaluationObject EvaluationOrder Evaluator EvaluatorNames EvenQ EventData EventEvaluator EventHandler EventHandlerTag EventLabels ExactBlackmanWindow ExactNumberQ ExactRootIsolation ExampleData Except ExcludedForms ExcludePods Exclusions ExclusionsStyle Exists Exit ExitDialog Exp Expand ExpandAll ExpandDenominator ExpandFileName ExpandNumerator Expectation ExpectationE ExpectedValue ExpGammaDistribution ExpIntegralE ExpIntegralEi Exponent ExponentFunction ExponentialDistribution ExponentialFamily ExponentialGeneratingFunction ExponentialMovingAverage ExponentialPowerDistribution ExponentPosition ExponentStep Export ExportAutoReplacements ExportPacket ExportString Expression ExpressionCell ExpressionPacket ExpToTrig ExtendedGCD Extension ExtentElementFunction ExtentMarkers ExtentSize ExternalCall ExternalDataCharacterEncoding Extract ExtractArchive ExtremeValueDistribution '+'FaceForm FaceGrids FaceGridsStyle Factor FactorComplete Factorial Factorial2 FactorialMoment FactorialMomentGeneratingFunction FactorialPower FactorInteger FactorList FactorSquareFree FactorSquareFreeList FactorTerms FactorTermsList Fail FailureDistribution False FARIMAProcess FEDisableConsolePrintPacket FeedbackSector FeedbackSectorStyle FeedbackType FEEnableConsolePrintPacket Fibonacci FieldHint FieldHintStyle FieldMasked FieldSize File FileBaseName FileByteCount FileDate FileExistsQ FileExtension FileFormat FileHash FileInformation FileName FileNameDepth FileNameDialogSettings FileNameDrop FileNameJoin FileNames FileNameSetter FileNameSplit FileNameTake FilePrint FileType FilledCurve FilledCurveBox Filling FillingStyle FillingTransform FilterRules FinancialBond FinancialData FinancialDerivative FinancialIndicator Find FindArgMax FindArgMin FindClique FindClusters FindCurvePath FindDistributionParameters FindDivisions FindEdgeCover FindEdgeCut FindEulerianCycle FindFaces FindFile FindFit FindGeneratingFunction FindGeoLocation FindGeometricTransform FindGraphCommunities FindGraphIsomorphism FindGraphPartition FindHamiltonianCycle FindIndependentEdgeSet FindIndependentVertexSet FindInstance FindIntegerNullVector FindKClan FindKClique FindKClub FindKPlex FindLibrary FindLinearRecurrence FindList FindMaximum FindMaximumFlow FindMaxValue FindMinimum FindMinimumCostFlow FindMinimumCut FindMinValue FindPermutation FindPostmanTour FindProcessParameters FindRoot FindSequenceFunction FindSettings FindShortestPath FindShortestTour FindThreshold FindVertexCover FindVertexCut Fine FinishDynamic FiniteAbelianGroupCount FiniteGroupCount FiniteGroupData First FirstPassageTimeDistribution FischerGroupFi22 FischerGroupFi23 FischerGroupFi24Prime FisherHypergeometricDistribution FisherRatioTest FisherZDistribution Fit FitAll FittedModel FixedPoint FixedPointList FlashSelection Flat Flatten FlattenAt FlatTopWindow FlipView Floor FlushPrintOutputPacket Fold FoldList Font FontColor FontFamily FontForm FontName FontOpacity FontPostScriptName FontProperties FontReencoding FontSize FontSlant FontSubstitutions FontTracking FontVariations FontWeight For ForAll Format FormatRules FormatType FormatTypeAutoConvert FormatValues FormBox FormBoxOptions FortranForm Forward ForwardBackward Fourier FourierCoefficient FourierCosCoefficient FourierCosSeries FourierCosTransform FourierDCT FourierDCTFilter FourierDCTMatrix FourierDST FourierDSTMatrix FourierMatrix FourierParameters FourierSequenceTransform FourierSeries FourierSinCoefficient FourierSinSeries FourierSinTransform FourierTransform FourierTrigSeries FractionalBrownianMotionProcess FractionalPart FractionBox FractionBoxOptions FractionLine Frame FrameBox FrameBoxOptions Framed FrameInset FrameLabel Frameless FrameMargins FrameStyle FrameTicks FrameTicksStyle FRatioDistribution FrechetDistribution FreeQ FrequencySamplingFilterKernel FresnelC FresnelS Friday FrobeniusNumber FrobeniusSolve '+'FromCharacterCode FromCoefficientRules FromContinuedFraction FromDate FromDigits FromDMS Front FrontEndDynamicExpression FrontEndEventActions FrontEndExecute FrontEndObject FrontEndResource FrontEndResourceString FrontEndStackSize FrontEndToken FrontEndTokenExecute FrontEndValueCache FrontEndVersion FrontFaceColor FrontFaceOpacity Full FullAxes FullDefinition FullForm FullGraphics FullOptions FullSimplify Function FunctionExpand FunctionInterpolation FunctionSpace FussellVeselyImportance '+'GaborFilter GaborMatrix GaborWavelet GainMargins GainPhaseMargins Gamma GammaDistribution GammaRegularized GapPenalty Gather GatherBy GaugeFaceElementFunction GaugeFaceStyle GaugeFrameElementFunction GaugeFrameSize GaugeFrameStyle GaugeLabels GaugeMarkers GaugeStyle GaussianFilter GaussianIntegers GaussianMatrix GaussianWindow GCD GegenbauerC General GeneralizedLinearModelFit GenerateConditions GeneratedCell GeneratedParameters GeneratingFunction Generic GenericCylindricalDecomposition GenomeData GenomeLookup GeodesicClosing GeodesicDilation GeodesicErosion GeodesicOpening GeoDestination GeodesyData GeoDirection GeoDistance GeoGridPosition GeometricBrownianMotionProcess GeometricDistribution GeometricMean GeometricMeanFilter GeometricTransformation GeometricTransformation3DBox GeometricTransformation3DBoxOptions GeometricTransformationBox GeometricTransformationBoxOptions GeoPosition GeoPositionENU GeoPositionXYZ GeoProjectionData GestureHandler GestureHandlerTag Get GetBoundingBoxSizePacket GetContext GetEnvironment GetFileName GetFrontEndOptionsDataPacket GetLinebreakInformationPacket GetMenusPacket GetPageBreakInformationPacket Glaisher GlobalClusteringCoefficient GlobalPreferences GlobalSession Glow GoldenRatio GompertzMakehamDistribution GoodmanKruskalGamma GoodmanKruskalGammaTest Goto Grad Gradient GradientFilter GradientOrientationFilter Graph GraphAssortativity GraphCenter GraphComplement GraphData GraphDensity GraphDiameter GraphDifference GraphDisjointUnion '+'GraphDistance GraphDistanceMatrix GraphElementData GraphEmbedding GraphHighlight GraphHighlightStyle GraphHub Graphics Graphics3D Graphics3DBox Graphics3DBoxOptions GraphicsArray GraphicsBaseline GraphicsBox GraphicsBoxOptions GraphicsColor GraphicsColumn GraphicsComplex GraphicsComplex3DBox GraphicsComplex3DBoxOptions GraphicsComplexBox GraphicsComplexBoxOptions GraphicsContents GraphicsData GraphicsGrid GraphicsGridBox GraphicsGroup GraphicsGroup3DBox GraphicsGroup3DBoxOptions GraphicsGroupBox GraphicsGroupBoxOptions GraphicsGrouping GraphicsHighlightColor GraphicsRow GraphicsSpacing GraphicsStyle GraphIntersection GraphLayout GraphLinkEfficiency GraphPeriphery GraphPlot GraphPlot3D GraphPower GraphPropertyDistribution GraphQ GraphRadius GraphReciprocity GraphRoot GraphStyle GraphUnion Gray GrayLevel GreatCircleDistance Greater GreaterEqual GreaterEqualLess GreaterFullEqual GreaterGreater GreaterLess GreaterSlantEqual GreaterTilde Green Grid GridBaseline GridBox GridBoxAlignment GridBoxBackground GridBoxDividers GridBoxFrame GridBoxItemSize GridBoxItemStyle GridBoxOptions GridBoxSpacings GridCreationSettings GridDefaultElement GridElementStyleOptions GridFrame GridFrameMargins GridGraph GridLines GridLinesStyle GroebnerBasis GroupActionBase GroupCentralizer GroupElementFromWord GroupElementPosition GroupElementQ GroupElements GroupElementToWord GroupGenerators GroupMultiplicationTable GroupOrbits GroupOrder GroupPageBreakWithin GroupSetwiseStabilizer GroupStabilizer GroupStabilizerChain Gudermannian GumbelDistribution '+'HaarWavelet HadamardMatrix HalfNormalDistribution HamiltonianGraphQ HammingDistance HammingWindow HankelH1 HankelH2 HankelMatrix HannPoissonWindow HannWindow HaradaNortonGroupHN HararyGraph HarmonicMean HarmonicMeanFilter HarmonicNumber Hash HashTable Haversine HazardFunction Head HeadCompose Heads HeavisideLambda HeavisidePi HeavisideTheta HeldGroupHe HeldPart HelpBrowserLookup HelpBrowserNotebook HelpBrowserSettings HermiteDecomposition HermiteH HermitianMatrixQ HessenbergDecomposition Hessian HexadecimalCharacter Hexahedron HexahedronBox HexahedronBoxOptions HiddenSurface HighlightGraph HighlightImage HighpassFilter HigmanSimsGroupHS HilbertFilter HilbertMatrix Histogram Histogram3D HistogramDistribution HistogramList HistogramTransform HistogramTransformInterpolation HitMissTransform HITSCentrality HodgeDual HoeffdingD HoeffdingDTest Hold HoldAll HoldAllComplete HoldComplete HoldFirst HoldForm HoldPattern HoldRest HolidayCalendar HomeDirectory HomePage Horizontal HorizontalForm HorizontalGauge HorizontalScrollPosition HornerForm HotellingTSquareDistribution HoytDistribution HTMLSave Hue HumpDownHump HumpEqual HurwitzLerchPhi HurwitzZeta HyperbolicDistribution HypercubeGraph HyperexponentialDistribution Hyperfactorial Hypergeometric0F1 Hypergeometric0F1Regularized Hypergeometric1F1 Hypergeometric1F1Regularized Hypergeometric2F1 Hypergeometric2F1Regularized HypergeometricDistribution HypergeometricPFQ HypergeometricPFQRegularized HypergeometricU Hyperlink HyperlinkCreationSettings Hyphenation HyphenationOptions HypoexponentialDistribution HypothesisTestData '+'I Identity IdentityMatrix If IgnoreCase Im Image Image3D Image3DSlices ImageAccumulate ImageAdd ImageAdjust ImageAlign ImageApply ImageAspectRatio ImageAssemble ImageCache ImageCacheValid ImageCapture ImageChannels ImageClip ImageColorSpace ImageCompose ImageConvolve ImageCooccurrence ImageCorners ImageCorrelate ImageCorrespondingPoints ImageCrop ImageData ImageDataPacket ImageDeconvolve ImageDemosaic ImageDifference ImageDimensions ImageDistance ImageEffect ImageFeatureTrack ImageFileApply ImageFileFilter ImageFileScan ImageFilter ImageForestingComponents ImageForwardTransformation ImageHistogram ImageKeypoints ImageLevels ImageLines ImageMargins ImageMarkers ImageMeasurements ImageMultiply ImageOffset ImagePad ImagePadding ImagePartition ImagePeriodogram ImagePerspectiveTransformation ImageQ ImageRangeCache ImageReflect ImageRegion ImageResize ImageResolution ImageRotate ImageRotated ImageScaled ImageScan ImageSize ImageSizeAction ImageSizeCache ImageSizeMultipliers ImageSizeRaw ImageSubtract ImageTake ImageTransformation ImageTrim ImageType ImageValue ImageValuePositions Implies Import ImportAutoReplacements ImportString ImprovementImportance In IncidenceGraph IncidenceList IncidenceMatrix IncludeConstantBasis IncludeFileExtension IncludePods IncludeSingularTerm Increment Indent IndentingNewlineSpacings IndentMaxFraction IndependenceTest IndependentEdgeSetQ IndependentUnit IndependentVertexSetQ Indeterminate IndexCreationOptions Indexed IndexGraph IndexTag Inequality InexactNumberQ InexactNumbers Infinity Infix Information Inherited InheritScope Initialization InitializationCell InitializationCellEvaluation InitializationCellWarning InlineCounterAssignments InlineCounterIncrements InlineRules Inner Inpaint Input InputAliases InputAssumptions InputAutoReplacements InputField InputFieldBox InputFieldBoxOptions InputForm InputGrouping InputNamePacket InputNotebook InputPacket InputSettings InputStream InputString InputStringPacket InputToBoxFormPacket Insert InsertionPointObject InsertResults Inset Inset3DBox Inset3DBoxOptions InsetBox InsetBoxOptions Install InstallService InString Integer IntegerDigits IntegerExponent IntegerLength IntegerPart IntegerPartitions IntegerQ Integers IntegerString Integral Integrate Interactive InteractiveTradingChart Interlaced Interleaving InternallyBalancedDecomposition InterpolatingFunction InterpolatingPolynomial Interpolation InterpolationOrder InterpolationPoints InterpolationPrecision Interpretation InterpretationBox InterpretationBoxOptions InterpretationFunction '+'InterpretTemplate InterquartileRange Interrupt InterruptSettings Intersection Interval IntervalIntersection IntervalMemberQ IntervalUnion Inverse InverseBetaRegularized InverseCDF InverseChiSquareDistribution InverseContinuousWaveletTransform InverseDistanceTransform InverseEllipticNomeQ InverseErf InverseErfc InverseFourier InverseFourierCosTransform InverseFourierSequenceTransform InverseFourierSinTransform InverseFourierTransform InverseFunction InverseFunctions InverseGammaDistribution InverseGammaRegularized InverseGaussianDistribution InverseGudermannian InverseHaversine InverseJacobiCD InverseJacobiCN InverseJacobiCS InverseJacobiDC InverseJacobiDN InverseJacobiDS InverseJacobiNC InverseJacobiND InverseJacobiNS InverseJacobiSC InverseJacobiSD InverseJacobiSN InverseLaplaceTransform InversePermutation InverseRadon InverseSeries InverseSurvivalFunction InverseWaveletTransform InverseWeierstrassP InverseZTransform Invisible InvisibleApplication InvisibleTimes IrreduciblePolynomialQ IsolatingInterval IsomorphicGraphQ IsotopeData Italic Item ItemBox ItemBoxOptions ItemSize ItemStyle ItoProcess '+'JaccardDissimilarity JacobiAmplitude Jacobian JacobiCD JacobiCN JacobiCS JacobiDC JacobiDN JacobiDS JacobiNC JacobiND JacobiNS JacobiP JacobiSC JacobiSD JacobiSN JacobiSymbol JacobiZeta JankoGroupJ1 JankoGroupJ2 JankoGroupJ3 JankoGroupJ4 JarqueBeraALMTest JohnsonDistribution Join Joined JoinedCurve JoinedCurveBox JoinForm JordanDecomposition JordanModelDecomposition '+'K KagiChart KaiserBesselWindow KaiserWindow KalmanEstimator KalmanFilter KarhunenLoeveDecomposition KaryTree KatzCentrality KCoreComponents KDistribution KelvinBei KelvinBer KelvinKei KelvinKer KendallTau KendallTauTest KernelExecute KernelMixtureDistribution KernelObject Kernels Ket Khinchin KirchhoffGraph KirchhoffMatrix KleinInvariantJ KnightTourGraph KnotData KnownUnitQ KolmogorovSmirnovTest KroneckerDelta KroneckerModelDecomposition KroneckerProduct KroneckerSymbol KuiperTest KumaraswamyDistribution Kurtosis KuwaharaFilter '+'Label Labeled LabeledSlider LabelingFunction LabelStyle LaguerreL LambdaComponents LambertW LanczosWindow LandauDistribution Language LanguageCategory LaplaceDistribution LaplaceTransform Laplacian LaplacianFilter LaplacianGaussianFilter Large Larger Last Latitude LatitudeLongitude LatticeData LatticeReduce Launch LaunchKernels LayeredGraphPlot LayerSizeFunction LayoutInformation LCM LeafCount LeapYearQ LeastSquares LeastSquaresFilterKernel Left LeftArrow LeftArrowBar LeftArrowRightArrow LeftDownTeeVector LeftDownVector LeftDownVectorBar LeftRightArrow LeftRightVector LeftTee LeftTeeArrow LeftTeeVector LeftTriangle LeftTriangleBar LeftTriangleEqual LeftUpDownVector LeftUpTeeVector LeftUpVector LeftUpVectorBar LeftVector LeftVectorBar LegendAppearance Legended LegendFunction LegendLabel LegendLayout LegendMargins LegendMarkers LegendMarkerSize LegendreP LegendreQ LegendreType Length LengthWhile LerchPhi Less LessEqual LessEqualGreater LessFullEqual LessGreater LessLess LessSlantEqual LessTilde LetterCharacter LetterQ Level LeveneTest LeviCivitaTensor LevyDistribution Lexicographic LibraryFunction LibraryFunctionError LibraryFunctionInformation LibraryFunctionLoad LibraryFunctionUnload LibraryLoad LibraryUnload LicenseID LiftingFilterData LiftingWaveletTransform LightBlue LightBrown LightCyan Lighter LightGray LightGreen Lighting LightingAngle LightMagenta LightOrange LightPink LightPurple LightRed LightSources LightYellow Likelihood Limit LimitsPositioning LimitsPositioningTokens LindleyDistribution Line Line3DBox LinearFilter LinearFractionalTransform LinearModelFit LinearOffsetFunction LinearProgramming LinearRecurrence LinearSolve LinearSolveFunction LineBox LineBreak LinebreakAdjustments LineBreakChart LineBreakWithin LineColor LineForm LineGraph LineIndent LineIndentMaxFraction LineIntegralConvolutionPlot LineIntegralConvolutionScale LineLegend LineOpacity LineSpacing LineWrapParts LinkActivate LinkClose LinkConnect LinkConnectedQ LinkCreate LinkError LinkFlush LinkFunction LinkHost LinkInterrupt LinkLaunch LinkMode LinkObject LinkOpen LinkOptions LinkPatterns LinkProtocol LinkRead LinkReadHeld LinkReadyQ Links LinkWrite LinkWriteHeld LiouvilleLambda List Listable ListAnimate ListContourPlot ListContourPlot3D ListConvolve ListCorrelate ListCurvePathPlot ListDeconvolve ListDensityPlot Listen ListFourierSequenceTransform ListInterpolation ListLineIntegralConvolutionPlot ListLinePlot ListLogLinearPlot ListLogLogPlot ListLogPlot ListPicker ListPickerBox ListPickerBoxBackground ListPickerBoxOptions ListPlay ListPlot ListPlot3D ListPointPlot3D ListPolarPlot ListQ ListStreamDensityPlot ListStreamPlot ListSurfacePlot3D ListVectorDensityPlot ListVectorPlot ListVectorPlot3D ListZTransform Literal LiteralSearch LocalClusteringCoefficient LocalizeVariables LocationEquivalenceTest LocationTest Locator LocatorAutoCreate LocatorBox LocatorBoxOptions LocatorCentering LocatorPane LocatorPaneBox LocatorPaneBoxOptions '+'LocatorRegion Locked Log Log10 Log2 LogBarnesG LogGamma LogGammaDistribution LogicalExpand LogIntegral LogisticDistribution LogitModelFit LogLikelihood LogLinearPlot LogLogisticDistribution LogLogPlot LogMultinormalDistribution LogNormalDistribution LogPlot LogRankTest LogSeriesDistribution LongEqual Longest LongestAscendingSequence LongestCommonSequence LongestCommonSequencePositions LongestCommonSubsequence LongestCommonSubsequencePositions LongestMatch LongForm Longitude LongLeftArrow LongLeftRightArrow LongRightArrow Loopback LoopFreeGraphQ LowerCaseQ LowerLeftArrow LowerRightArrow LowerTriangularize LowpassFilter LQEstimatorGains LQGRegulator LQOutputRegulatorGains LQRegulatorGains LUBackSubstitution LucasL LuccioSamiComponents LUDecomposition LyapunovSolve LyonsGroupLy '+'MachineID MachineName MachineNumberQ MachinePrecision MacintoshSystemPageSetup Magenta Magnification Magnify MainSolve MaintainDynamicCaches Majority MakeBoxes MakeExpression MakeRules MangoldtLambda ManhattanDistance Manipulate Manipulator MannWhitneyTest MantissaExponent Manual Map MapAll MapAt MapIndexed MAProcess MapThread MarcumQ MardiaCombinedTest MardiaKurtosisTest MardiaSkewnessTest MarginalDistribution MarkovProcessProperties Masking MatchingDissimilarity MatchLocalNameQ MatchLocalNames MatchQ Material MathematicaNotation MathieuC MathieuCharacteristicA MathieuCharacteristicB MathieuCharacteristicExponent MathieuCPrime MathieuGroupM11 MathieuGroupM12 MathieuGroupM22 MathieuGroupM23 MathieuGroupM24 MathieuS MathieuSPrime MathMLForm MathMLText Matrices MatrixExp MatrixForm MatrixFunction MatrixLog MatrixPlot MatrixPower MatrixQ MatrixRank Max MaxBend MaxDetect MaxExtraBandwidths MaxExtraConditions MaxFeatures MaxFilter Maximize MaxIterations MaxMemoryUsed MaxMixtureKernels MaxPlotPoints MaxPoints MaxRecursion MaxStableDistribution MaxStepFraction MaxSteps MaxStepSize MaxValue MaxwellDistribution McLaughlinGroupMcL Mean MeanClusteringCoefficient MeanDegreeConnectivity MeanDeviation MeanFilter MeanGraphDistance MeanNeighborDegree MeanShift MeanShiftFilter Median MedianDeviation MedianFilter Medium MeijerG MeixnerDistribution MemberQ MemoryConstrained MemoryInUse Menu MenuAppearance MenuCommandKey MenuEvaluator MenuItem MenuPacket MenuSortingValue MenuStyle MenuView MergeDifferences Mesh MeshFunctions MeshRange MeshShading MeshStyle Message MessageDialog MessageList MessageName MessageOptions MessagePacket Messages MessagesNotebook MetaCharacters MetaInformation Method MethodOptions MexicanHatWavelet MeyerWavelet Min MinDetect MinFilter MinimalPolynomial MinimalStateSpaceModel Minimize Minors MinRecursion MinSize MinStableDistribution Minus MinusPlus MinValue Missing MissingDataMethod MittagLefflerE MixedRadix MixedRadixQuantity MixtureDistribution Mod Modal Mode Modular ModularLambda Module Modulus MoebiusMu Moment Momentary MomentConvert MomentEvaluate MomentGeneratingFunction Monday Monitor MonomialList MonomialOrder MonsterGroupM MorletWavelet MorphologicalBinarize MorphologicalBranchPoints MorphologicalComponents MorphologicalEulerNumber MorphologicalGraph MorphologicalPerimeter MorphologicalTransform Most MouseAnnotation MouseAppearance MouseAppearanceTag MouseButtons Mouseover MousePointerNote MousePosition MovingAverage MovingMedian MoyalDistribution MultiedgeStyle MultilaunchWarning MultiLetterItalics MultiLetterStyle MultilineFunction Multinomial MultinomialDistribution MultinormalDistribution MultiplicativeOrder Multiplicity Multiselection MultivariateHypergeometricDistribution MultivariatePoissonDistribution MultivariateTDistribution '+'N NakagamiDistribution NameQ Names NamespaceBox Nand NArgMax NArgMin NBernoulliB NCache NDSolve NDSolveValue Nearest NearestFunction NeedCurrentFrontEndPackagePacket NeedCurrentFrontEndSymbolsPacket NeedlemanWunschSimilarity Needs Negative NegativeBinomialDistribution NegativeMultinomialDistribution NeighborhoodGraph Nest NestedGreaterGreater NestedLessLess NestedScriptRules NestList NestWhile NestWhileList NevilleThetaC NevilleThetaD NevilleThetaN NevilleThetaS NewPrimitiveStyle NExpectation Next NextPrime NHoldAll NHoldFirst NHoldRest NicholsGridLines NicholsPlot NIntegrate NMaximize NMaxValue NMinimize NMinValue NominalVariables NonAssociative NoncentralBetaDistribution NoncentralChiSquareDistribution NoncentralFRatioDistribution NoncentralStudentTDistribution NonCommutativeMultiply NonConstants None NonlinearModelFit NonlocalMeansFilter NonNegative NonPositive Nor NorlundB Norm Normal NormalDistribution NormalGrouping Normalize NormalizedSquaredEuclideanDistance NormalsFunction NormFunction Not NotCongruent NotCupCap NotDoubleVerticalBar Notebook NotebookApply NotebookAutoSave NotebookClose NotebookConvertSettings NotebookCreate NotebookCreateReturnObject NotebookDefault NotebookDelete NotebookDirectory NotebookDynamicExpression NotebookEvaluate NotebookEventActions NotebookFileName NotebookFind NotebookFindReturnObject NotebookGet NotebookGetLayoutInformationPacket NotebookGetMisspellingsPacket NotebookInformation NotebookInterfaceObject NotebookLocate NotebookObject NotebookOpen NotebookOpenReturnObject NotebookPath NotebookPrint NotebookPut NotebookPutReturnObject NotebookRead NotebookResetGeneratedCells Notebooks NotebookSave NotebookSaveAs NotebookSelection NotebookSetupLayoutInformationPacket NotebooksMenu NotebookWrite NotElement NotEqualTilde NotExists NotGreater NotGreaterEqual NotGreaterFullEqual NotGreaterGreater NotGreaterLess NotGreaterSlantEqual NotGreaterTilde NotHumpDownHump NotHumpEqual NotLeftTriangle NotLeftTriangleBar NotLeftTriangleEqual NotLess NotLessEqual NotLessFullEqual NotLessGreater NotLessLess NotLessSlantEqual NotLessTilde NotNestedGreaterGreater NotNestedLessLess NotPrecedes NotPrecedesEqual NotPrecedesSlantEqual NotPrecedesTilde NotReverseElement NotRightTriangle NotRightTriangleBar NotRightTriangleEqual NotSquareSubset NotSquareSubsetEqual NotSquareSuperset NotSquareSupersetEqual NotSubset NotSubsetEqual NotSucceeds NotSucceedsEqual NotSucceedsSlantEqual NotSucceedsTilde NotSuperset NotSupersetEqual NotTilde NotTildeEqual NotTildeFullEqual NotTildeTilde NotVerticalBar NProbability NProduct NProductFactors NRoots NSolve NSum NSumTerms Null NullRecords NullSpace NullWords Number NumberFieldClassNumber NumberFieldDiscriminant NumberFieldFundamentalUnits NumberFieldIntegralBasis NumberFieldNormRepresentatives NumberFieldRegulator NumberFieldRootsOfUnity NumberFieldSignature NumberForm NumberFormat NumberMarks NumberMultiplier NumberPadding NumberPoint NumberQ NumberSeparator '+'NumberSigns NumberString Numerator NumericFunction NumericQ NuttallWindow NValues NyquistGridLines NyquistPlot '+'O ObservabilityGramian ObservabilityMatrix ObservableDecomposition ObservableModelQ OddQ Off Offset OLEData On ONanGroupON OneIdentity Opacity Open OpenAppend Opener OpenerBox OpenerBoxOptions OpenerView OpenFunctionInspectorPacket Opening OpenRead OpenSpecialOptions OpenTemporary OpenWrite Operate OperatingSystem OptimumFlowData Optional OptionInspectorSettings OptionQ Options OptionsPacket OptionsPattern OptionValue OptionValueBox OptionValueBoxOptions Or Orange Order OrderDistribution OrderedQ Ordering Orderless OrnsteinUhlenbeckProcess Orthogonalize Out Outer OutputAutoOverwrite OutputControllabilityMatrix OutputControllableModelQ OutputForm OutputFormData OutputGrouping OutputMathEditExpression OutputNamePacket OutputResponse OutputSizeLimit OutputStream Over OverBar OverDot Overflow OverHat Overlaps Overlay OverlayBox OverlayBoxOptions Overscript OverscriptBox OverscriptBoxOptions OverTilde OverVector OwenT OwnValues '+'PackingMethod PaddedForm Padding PadeApproximant PadLeft PadRight PageBreakAbove PageBreakBelow PageBreakWithin PageFooterLines PageFooters PageHeaderLines PageHeaders PageHeight PageRankCentrality PageWidth PairedBarChart PairedHistogram PairedSmoothHistogram PairedTTest PairedZTest PaletteNotebook PalettePath Pane PaneBox PaneBoxOptions Panel PanelBox PanelBoxOptions Paneled PaneSelector PaneSelectorBox PaneSelectorBoxOptions PaperWidth ParabolicCylinderD ParagraphIndent ParagraphSpacing ParallelArray ParallelCombine ParallelDo ParallelEvaluate Parallelization Parallelize ParallelMap ParallelNeeds ParallelProduct ParallelSubmit ParallelSum ParallelTable ParallelTry Parameter ParameterEstimator ParameterMixtureDistribution ParameterVariables ParametricFunction ParametricNDSolve ParametricNDSolveValue ParametricPlot ParametricPlot3D ParentConnect ParentDirectory ParentForm Parenthesize ParentList ParetoDistribution Part PartialCorrelationFunction PartialD ParticleData Partition PartitionsP PartitionsQ ParzenWindow PascalDistribution PassEventsDown PassEventsUp Paste PasteBoxFormInlineCells PasteButton Path PathGraph PathGraphQ Pattern PatternSequence PatternTest PauliMatrix PaulWavelet Pause PausedTime PDF PearsonChiSquareTest PearsonCorrelationTest PearsonDistribution PerformanceGoal PeriodicInterpolation Periodogram PeriodogramArray PermutationCycles PermutationCyclesQ PermutationGroup PermutationLength PermutationList PermutationListQ PermutationMax PermutationMin PermutationOrder PermutationPower PermutationProduct PermutationReplace Permutations PermutationSupport Permute PeronaMalikFilter Perpendicular PERTDistribution PetersenGraph PhaseMargins Pi Pick PIDData PIDDerivativeFilter PIDFeedforward PIDTune Piecewise PiecewiseExpand PieChart PieChart3D PillaiTrace PillaiTraceTest Pink Pivoting PixelConstrained PixelValue PixelValuePositions Placed Placeholder PlaceholderReplace Plain PlanarGraphQ Play PlayRange Plot Plot3D Plot3Matrix PlotDivision PlotJoined PlotLabel PlotLayout PlotLegends PlotMarkers PlotPoints PlotRange PlotRangeClipping PlotRangePadding PlotRegion PlotStyle Plus PlusMinus Pochhammer PodStates PodWidth Point Point3DBox PointBox PointFigureChart PointForm PointLegend PointSize PoissonConsulDistribution PoissonDistribution PoissonProcess PoissonWindow PolarAxes PolarAxesOrigin PolarGridLines PolarPlot PolarTicks PoleZeroMarkers PolyaAeppliDistribution PolyGamma Polygon Polygon3DBox Polygon3DBoxOptions PolygonBox PolygonBoxOptions PolygonHoleScale PolygonIntersections PolygonScale PolyhedronData PolyLog PolynomialExtendedGCD PolynomialForm PolynomialGCD PolynomialLCM PolynomialMod PolynomialQ PolynomialQuotient PolynomialQuotientRemainder PolynomialReduce PolynomialRemainder Polynomials PopupMenu PopupMenuBox PopupMenuBoxOptions PopupView PopupWindow Position Positive PositiveDefiniteMatrixQ PossibleZeroQ Postfix PostScript Power PowerDistribution PowerExpand PowerMod PowerModList '+'PowerSpectralDensity PowersRepresentations PowerSymmetricPolynomial Precedence PrecedenceForm Precedes PrecedesEqual PrecedesSlantEqual PrecedesTilde Precision PrecisionGoal PreDecrement PredictionRoot PreemptProtect PreferencesPath Prefix PreIncrement Prepend PrependTo PreserveImageOptions Previous PriceGraphDistribution PrimaryPlaceholder Prime PrimeNu PrimeOmega PrimePi PrimePowerQ PrimeQ Primes PrimeZetaP PrimitiveRoot PrincipalComponents PrincipalValue Print PrintAction PrintForm PrintingCopies PrintingOptions PrintingPageRange PrintingStartingPageNumber PrintingStyleEnvironment PrintPrecision PrintTemporary Prism PrismBox PrismBoxOptions PrivateCellOptions PrivateEvaluationOptions PrivateFontOptions PrivateFrontEndOptions PrivateNotebookOptions PrivatePaths Probability ProbabilityDistribution ProbabilityPlot ProbabilityPr ProbabilityScalePlot ProbitModelFit ProcessEstimator ProcessParameterAssumptions ProcessParameterQ ProcessStateDomain ProcessTimeDomain Product ProductDistribution ProductLog ProgressIndicator ProgressIndicatorBox ProgressIndicatorBoxOptions Projection Prolog PromptForm Properties Property PropertyList PropertyValue Proportion Proportional Protect Protected ProteinData Pruning PseudoInverse Purple Put PutAppend Pyramid PyramidBox PyramidBoxOptions '+'QBinomial QFactorial QGamma QHypergeometricPFQ QPochhammer QPolyGamma QRDecomposition QuadraticIrrationalQ Quantile QuantilePlot Quantity QuantityForm QuantityMagnitude QuantityQ QuantityUnit Quartics QuartileDeviation Quartiles QuartileSkewness QueueingNetworkProcess QueueingProcess QueueProperties Quiet Quit Quotient QuotientRemainder '+'RadialityCentrality RadicalBox RadicalBoxOptions RadioButton RadioButtonBar RadioButtonBox RadioButtonBoxOptions Radon RamanujanTau RamanujanTauL RamanujanTauTheta RamanujanTauZ Random RandomChoice RandomComplex RandomFunction RandomGraph RandomImage RandomInteger RandomPermutation RandomPrime RandomReal RandomSample RandomSeed RandomVariate RandomWalkProcess Range RangeFilter RangeSpecification RankedMax RankedMin Raster Raster3D Raster3DBox Raster3DBoxOptions RasterArray RasterBox RasterBoxOptions Rasterize RasterSize Rational RationalFunctions Rationalize Rationals Ratios Raw RawArray RawBoxes RawData RawMedium RayleighDistribution Re Read ReadList ReadProtected Real RealBlockDiagonalForm RealDigits RealExponent Reals Reap Record RecordLists RecordSeparators Rectangle RectangleBox RectangleBoxOptions RectangleChart RectangleChart3D RecurrenceFilter RecurrenceTable RecurringDigitsForm Red Reduce RefBox ReferenceLineStyle ReferenceMarkers ReferenceMarkerStyle Refine ReflectionMatrix ReflectionTransform Refresh RefreshRate RegionBinarize RegionFunction RegionPlot RegionPlot3D RegularExpression Regularization Reinstall Release ReleaseHold ReliabilityDistribution ReliefImage ReliefPlot Remove RemoveAlphaChannel RemoveAsynchronousTask Removed RemoveInputStreamMethod RemoveOutputStreamMethod RemoveProperty RemoveScheduledTask RenameDirectory RenameFile RenderAll RenderingOptions RenewalProcess RenkoChart Repeated RepeatedNull RepeatedString Replace ReplaceAll ReplaceHeldPart ReplaceImageValue ReplaceList ReplacePart ReplacePixelValue ReplaceRepeated Resampling Rescale RescalingTransform ResetDirectory ResetMenusPacket ResetScheduledTask Residue Resolve Rest Resultant ResumePacket Return ReturnExpressionPacket ReturnInputFormPacket ReturnPacket ReturnTextPacket Reverse ReverseBiorthogonalSplineWavelet ReverseElement ReverseEquilibrium ReverseGraph ReverseUpEquilibrium RevolutionAxis RevolutionPlot3D RGBColor RiccatiSolve RiceDistribution RidgeFilter RiemannR RiemannSiegelTheta RiemannSiegelZ Riffle Right RightArrow RightArrowBar RightArrowLeftArrow RightCosetRepresentative RightDownTeeVector RightDownVector RightDownVectorBar RightTee RightTeeArrow RightTeeVector RightTriangle RightTriangleBar RightTriangleEqual RightUpDownVector RightUpTeeVector RightUpVector RightUpVectorBar RightVector RightVectorBar RiskAchievementImportance RiskReductionImportance RogersTanimotoDissimilarity Root RootApproximant RootIntervals RootLocusPlot RootMeanSquare RootOfUnityQ RootReduce Roots RootSum Rotate RotateLabel RotateLeft RotateRight RotationAction RotationBox RotationBoxOptions RotationMatrix RotationTransform Round RoundImplies RoundingRadius Row RowAlignments RowBackgrounds RowBox RowHeights RowLines RowMinHeight RowReduce RowsEqual RowSpacings RSolve RudvalisGroupRu Rule RuleCondition RuleDelayed RuleForm RulerUnits Run RunScheduledTask RunThrough RuntimeAttributes RuntimeOptions RussellRaoDissimilarity '+'SameQ SameTest SampleDepth SampledSoundFunction SampledSoundList SampleRate SamplingPeriod SARIMAProcess SARMAProcess SatisfiabilityCount SatisfiabilityInstances SatisfiableQ Saturday Save Saveable SaveAutoDelete SaveDefinitions SawtoothWave Scale Scaled ScaleDivisions ScaledMousePosition ScaleOrigin ScalePadding ScaleRanges ScaleRangeStyle ScalingFunctions ScalingMatrix ScalingTransform Scan ScheduledTaskActiveQ ScheduledTaskData ScheduledTaskObject ScheduledTasks SchurDecomposition ScientificForm ScreenRectangle ScreenStyleEnvironment ScriptBaselineShifts ScriptLevel ScriptMinSize ScriptRules ScriptSizeMultipliers Scrollbars ScrollingOptions ScrollPosition Sec Sech SechDistribution SectionGrouping SectorChart SectorChart3D SectorOrigin SectorSpacing SeedRandom Select Selectable SelectComponents SelectedCells SelectedNotebook Selection SelectionAnimate SelectionCell SelectionCellCreateCell SelectionCellDefaultStyle SelectionCellParentStyle SelectionCreateCell SelectionDebuggerTag SelectionDuplicateCell SelectionEvaluate SelectionEvaluateCreateCell SelectionMove SelectionPlaceholder SelectionSetStyle SelectWithContents SelfLoops SelfLoopStyle SemialgebraicComponentInstances SendMail Sequence SequenceAlignment SequenceForm SequenceHold SequenceLimit Series SeriesCoefficient SeriesData SessionTime Set SetAccuracy SetAlphaChannel SetAttributes Setbacks SetBoxFormNamesPacket SetDelayed SetDirectory SetEnvironment SetEvaluationNotebook SetFileDate SetFileLoadingContext SetNotebookStatusLine SetOptions SetOptionsPacket SetPrecision SetProperty SetSelectedNotebook SetSharedFunction SetSharedVariable SetSpeechParametersPacket SetStreamPosition SetSystemOptions Setter SetterBar SetterBox SetterBoxOptions Setting SetValue Shading Shallow ShannonWavelet ShapiroWilkTest Share Sharpen ShearingMatrix ShearingTransform ShenCastanMatrix Short ShortDownArrow Shortest ShortestMatch ShortestPathFunction ShortLeftArrow ShortRightArrow ShortUpArrow Show ShowAutoStyles ShowCellBracket ShowCellLabel ShowCellTags ShowClosedCellArea ShowContents ShowControls ShowCursorTracker ShowGroupOpenCloseIcon ShowGroupOpener ShowInvisibleCharacters ShowPageBreaks ShowPredictiveInterface ShowSelection ShowShortBoxForm ShowSpecialCharacters ShowStringCharacters ShowSyntaxStyles ShrinkingDelay ShrinkWrapBoundingBox SiegelTheta SiegelTukeyTest Sign Signature SignedRankTest SignificanceLevel SignPadding SignTest SimilarityRules SimpleGraph SimpleGraphQ Simplify Sin Sinc SinghMaddalaDistribution SingleEvaluation SingleLetterItalics SingleLetterStyle SingularValueDecomposition SingularValueList SingularValuePlot SingularValues Sinh SinhIntegral SinIntegral SixJSymbol Skeleton SkeletonTransform SkellamDistribution Skewness SkewNormalDistribution Skip SliceDistribution Slider Slider2D Slider2DBox Slider2DBoxOptions SliderBox SliderBoxOptions SlideView Slot SlotSequence Small SmallCircle Smaller SmithDelayCompensator SmithWatermanSimilarity '+'SmoothDensityHistogram SmoothHistogram SmoothHistogram3D SmoothKernelDistribution SocialMediaData Socket SokalSneathDissimilarity Solve SolveAlways SolveDelayed Sort SortBy Sound SoundAndGraphics SoundNote SoundVolume Sow Space SpaceForm Spacer Spacings Span SpanAdjustments SpanCharacterRounding SpanFromAbove SpanFromBoth SpanFromLeft SpanLineThickness SpanMaxSize SpanMinSize SpanningCharacters SpanSymmetric SparseArray SpatialGraphDistribution Speak SpeakTextPacket SpearmanRankTest SpearmanRho Spectrogram SpectrogramArray Specularity SpellingCorrection SpellingDictionaries SpellingDictionariesPath SpellingOptions SpellingSuggestionsPacket Sphere SphereBox SphericalBesselJ SphericalBesselY SphericalHankelH1 SphericalHankelH2 SphericalHarmonicY SphericalPlot3D SphericalRegion SpheroidalEigenvalue SpheroidalJoiningFactor SpheroidalPS SpheroidalPSPrime SpheroidalQS SpheroidalQSPrime SpheroidalRadialFactor SpheroidalS1 SpheroidalS1Prime SpheroidalS2 SpheroidalS2Prime Splice SplicedDistribution SplineClosed SplineDegree SplineKnots SplineWeights Split SplitBy SpokenString Sqrt SqrtBox SqrtBoxOptions Square SquaredEuclideanDistance SquareFreeQ SquareIntersection SquaresR SquareSubset SquareSubsetEqual SquareSuperset SquareSupersetEqual SquareUnion SquareWave StabilityMargins StabilityMarginsStyle StableDistribution Stack StackBegin StackComplete StackInhibit StandardDeviation StandardDeviationFilter StandardForm Standardize StandbyDistribution Star StarGraph StartAsynchronousTask StartingStepSize StartOfLine StartOfString StartScheduledTask StartupSound StateDimensions StateFeedbackGains StateOutputEstimator StateResponse StateSpaceModel StateSpaceRealization StateSpaceTransform StationaryDistribution StationaryWaveletPacketTransform StationaryWaveletTransform StatusArea StatusCentrality StepMonitor StieltjesGamma StirlingS1 StirlingS2 StopAsynchronousTask StopScheduledTask StrataVariables StratonovichProcess StreamColorFunction StreamColorFunctionScaling StreamDensityPlot StreamPlot StreamPoints StreamPosition Streams StreamScale StreamStyle String StringBreak StringByteCount StringCases StringCount StringDrop StringExpression StringForm StringFormat StringFreeQ StringInsert StringJoin StringLength StringMatchQ StringPosition StringQ StringReplace StringReplaceList StringReplacePart StringReverse StringRotateLeft StringRotateRight StringSkeleton StringSplit StringTake StringToStream StringTrim StripBoxes StripOnInput StripWrapperBoxes StrokeForm StructuralImportance StructuredArray StructuredSelection StruveH StruveL Stub StudentTDistribution Style StyleBox StyleBoxAutoDelete StyleBoxOptions StyleData StyleDefinitions StyleForm StyleKeyMapping StyleMenuListing StyleNameDialogSettings StyleNames StylePrint StyleSheetPath Subfactorial Subgraph SubMinus SubPlus SubresultantPolynomialRemainders '+'SubresultantPolynomials Subresultants Subscript SubscriptBox SubscriptBoxOptions Subscripted Subset SubsetEqual Subsets SubStar Subsuperscript SubsuperscriptBox SubsuperscriptBoxOptions Subtract SubtractFrom SubValues Succeeds SucceedsEqual SucceedsSlantEqual SucceedsTilde SuchThat Sum SumConvergence Sunday SuperDagger SuperMinus SuperPlus Superscript SuperscriptBox SuperscriptBoxOptions Superset SupersetEqual SuperStar Surd SurdForm SurfaceColor SurfaceGraphics SurvivalDistribution SurvivalFunction SurvivalModel SurvivalModelFit SuspendPacket SuzukiDistribution SuzukiGroupSuz SwatchLegend Switch Symbol SymbolName SymletWavelet Symmetric SymmetricGroup SymmetricMatrixQ SymmetricPolynomial SymmetricReduction Symmetrize SymmetrizedArray SymmetrizedArrayRules SymmetrizedDependentComponents SymmetrizedIndependentComponents SymmetrizedReplacePart SynchronousInitialization SynchronousUpdating Syntax SyntaxForm SyntaxInformation SyntaxLength SyntaxPacket SyntaxQ SystemDialogInput SystemException SystemHelpPath SystemInformation SystemInformationData SystemOpen SystemOptions SystemsModelDelay SystemsModelDelayApproximate SystemsModelDelete SystemsModelDimensions SystemsModelExtract SystemsModelFeedbackConnect SystemsModelLabels SystemsModelOrder SystemsModelParallelConnect SystemsModelSeriesConnect SystemsModelStateFeedbackConnect SystemStub '+'Tab TabFilling Table TableAlignments TableDepth TableDirections TableForm TableHeadings TableSpacing TableView TableViewBox TabSpacings TabView TabViewBox TabViewBoxOptions TagBox TagBoxNote TagBoxOptions TaggingRules TagSet TagSetDelayed TagStyle TagUnset Take TakeWhile Tally Tan Tanh TargetFunctions TargetUnits TautologyQ TelegraphProcess TemplateBox TemplateBoxOptions TemplateSlotSequence TemporalData Temporary TemporaryVariable TensorContract TensorDimensions TensorExpand TensorProduct TensorQ TensorRank TensorReduce TensorSymmetry TensorTranspose TensorWedge Tetrahedron TetrahedronBox TetrahedronBoxOptions TeXForm TeXSave Text Text3DBox Text3DBoxOptions TextAlignment TextBand TextBoundingBox TextBox TextCell TextClipboardType TextData TextForm TextJustification TextLine TextPacket TextParagraph TextRecognize TextRendering TextStyle Texture TextureCoordinateFunction TextureCoordinateScaling Therefore ThermometerGauge Thick Thickness Thin Thinning ThisLink ThompsonGroupTh Thread ThreeJSymbol Threshold Through Throw Thumbnail Thursday Ticks TicksStyle Tilde TildeEqual TildeFullEqual TildeTilde TimeConstrained TimeConstraint Times TimesBy TimeSeriesForecast TimeSeriesInvertibility TimeUsed TimeValue TimeZone Timing Tiny TitleGrouping TitsGroupT ToBoxes ToCharacterCode ToColor ToContinuousTimeModel ToDate ToDiscreteTimeModel ToeplitzMatrix ToExpression ToFileName Together Toggle ToggleFalse Toggler TogglerBar TogglerBox TogglerBoxOptions ToHeldExpression ToInvertibleTimeSeries TokenWords Tolerance ToLowerCase ToNumberField TooBig Tooltip TooltipBox TooltipBoxOptions TooltipDelay TooltipStyle Top TopHatTransform TopologicalSort ToRadicals ToRules ToString Total TotalHeight TotalVariationFilter TotalWidth TouchscreenAutoZoom TouchscreenControlPlacement ToUpperCase Tr Trace TraceAbove TraceAction TraceBackward TraceDepth TraceDialog TraceForward TraceInternal TraceLevel TraceOff TraceOn TraceOriginal TracePrint TraceScan TrackedSymbols TradingChart TraditionalForm TraditionalFunctionNotation TraditionalNotation TraditionalOrder TransferFunctionCancel TransferFunctionExpand TransferFunctionFactor TransferFunctionModel TransferFunctionPoles TransferFunctionTransform TransferFunctionZeros TransformationFunction TransformationFunctions TransformationMatrix TransformedDistribution TransformedField Translate TranslationTransform TransparentColor Transpose TreeForm TreeGraph TreeGraphQ TreePlot TrendStyle TriangleWave TriangularDistribution Trig TrigExpand TrigFactor TrigFactorList Trigger TrigReduce TrigToExp TrimmedMean True TrueQ TruncatedDistribution TsallisQExponentialDistribution TsallisQGaussianDistribution TTest Tube TubeBezierCurveBox TubeBezierCurveBoxOptions TubeBox TubeBSplineCurveBox TubeBSplineCurveBoxOptions Tuesday TukeyLambdaDistribution TukeyWindow Tuples TuranGraph TuringMachine '+'Transparent '+'UnateQ Uncompress Undefined UnderBar Underflow Underlined Underoverscript UnderoverscriptBox UnderoverscriptBoxOptions Underscript UnderscriptBox UnderscriptBoxOptions UndirectedEdge UndirectedGraph UndirectedGraphQ UndocumentedTestFEParserPacket UndocumentedTestGetSelectionPacket Unequal Unevaluated UniformDistribution UniformGraphDistribution UniformSumDistribution Uninstall Union UnionPlus Unique UnitBox UnitConvert UnitDimensions Unitize UnitRootTest UnitSimplify UnitStep UnitTriangle UnitVector Unprotect UnsameQ UnsavedVariables Unset UnsetShared UntrackedVariables Up UpArrow UpArrowBar UpArrowDownArrow Update UpdateDynamicObjects UpdateDynamicObjectsSynchronous UpdateInterval UpDownArrow UpEquilibrium UpperCaseQ UpperLeftArrow UpperRightArrow UpperTriangularize Upsample UpSet UpSetDelayed UpTee UpTeeArrow UpValues URL URLFetch URLFetchAsynchronous URLSave URLSaveAsynchronous UseGraphicsRange Using UsingFrontEnd '+'V2Get ValidationLength Value ValueBox ValueBoxOptions ValueForm ValueQ ValuesData Variables Variance VarianceEquivalenceTest VarianceEstimatorFunction VarianceGammaDistribution VarianceTest VectorAngle VectorColorFunction VectorColorFunctionScaling VectorDensityPlot VectorGlyphData VectorPlot VectorPlot3D VectorPoints VectorQ Vectors VectorScale VectorStyle Vee Verbatim Verbose VerboseConvertToPostScriptPacket VerifyConvergence VerifySolutions VerifyTestAssumptions Version VersionNumber VertexAdd VertexCapacity VertexColors VertexComponent VertexConnectivity VertexCoordinateRules VertexCoordinates VertexCorrelationSimilarity VertexCosineSimilarity VertexCount VertexCoverQ VertexDataCoordinates VertexDegree VertexDelete VertexDiceSimilarity VertexEccentricity VertexInComponent VertexInDegree VertexIndex VertexJaccardSimilarity VertexLabeling VertexLabels VertexLabelStyle VertexList VertexNormals VertexOutComponent VertexOutDegree VertexQ VertexRenderingFunction VertexReplace VertexShape VertexShapeFunction VertexSize VertexStyle VertexTextureCoordinates VertexWeight Vertical VerticalBar VerticalForm VerticalGauge VerticalSeparator VerticalSlider VerticalTilde ViewAngle ViewCenter ViewMatrix ViewPoint ViewPointSelectorSettings ViewPort ViewRange ViewVector ViewVertical VirtualGroupData Visible VisibleCell VoigtDistribution VonMisesDistribution '+'WaitAll WaitAsynchronousTask WaitNext WaitUntil WakebyDistribution WalleniusHypergeometricDistribution WaringYuleDistribution WatershedComponents WatsonUSquareTest WattsStrogatzGraphDistribution WaveletBestBasis WaveletFilterCoefficients WaveletImagePlot WaveletListPlot WaveletMapIndexed WaveletMatrixPlot WaveletPhi WaveletPsi WaveletScale WaveletScalogram WaveletThreshold WeaklyConnectedComponents WeaklyConnectedGraphQ WeakStationarity WeatherData WeberE Wedge Wednesday WeibullDistribution WeierstrassHalfPeriods WeierstrassInvariants WeierstrassP WeierstrassPPrime WeierstrassSigma WeierstrassZeta WeightedAdjacencyGraph WeightedAdjacencyMatrix WeightedData WeightedGraphQ Weights WelchWindow WheelGraph WhenEvent Which While White Whitespace WhitespaceCharacter WhittakerM WhittakerW WienerFilter WienerProcess WignerD WignerSemicircleDistribution WilksW WilksWTest WindowClickSelect WindowElements WindowFloating WindowFrame WindowFrameElements WindowMargins WindowMovable WindowOpacity WindowSelected WindowSize WindowStatusArea WindowTitle WindowToolbars WindowWidth With WolframAlpha WolframAlphaDate WolframAlphaQuantity WolframAlphaResult Word WordBoundary WordCharacter WordData WordSearch WordSeparators WorkingPrecision Write WriteString Wronskian '+'XMLElement XMLObject Xnor Xor '+'Yellow YuleDissimilarity '+'ZernikeR ZeroSymmetric ZeroTest ZeroWidthTimes Zeta ZetaZero ZipfDistribution ZTest ZTransform '+'$Aborted $ActivationGroupID $ActivationKey $ActivationUserRegistered $AddOnsDirectory $AssertFunction $Assumptions $AsynchronousTask $BaseDirectory $BatchInput $BatchOutput $BoxForms $ByteOrdering $Canceled $CharacterEncoding $CharacterEncodings $CommandLine $CompilationTarget $ConditionHold $ConfiguredKernels $Context $ContextPath $ControlActiveSetting $CreationDate $CurrentLink $DateStringFormat $DefaultFont $DefaultFrontEnd $DefaultImagingDevice $DefaultPath $Display $DisplayFunction $DistributedContexts $DynamicEvaluation $Echo $Epilog $ExportFormats $Failed $FinancialDataSource $FormatType $FrontEnd $FrontEndSession $GeoLocation $HistoryLength $HomeDirectory $HTTPCookies $IgnoreEOF $ImagingDevices $ImportFormats $InitialDirectory $Input $InputFileName $InputStreamMethods $Inspector $InstallationDate $InstallationDirectory $InterfaceEnvironment $IterationLimit $KernelCount $KernelID $Language $LaunchDirectory $LibraryPath $LicenseExpirationDate $LicenseID $LicenseProcesses $LicenseServer $LicenseSubprocesses $LicenseType $Line $Linked $LinkSupported $LoadedFiles $MachineAddresses $MachineDomain $MachineDomains $MachineEpsilon $MachineID $MachineName $MachinePrecision $MachineType $MaxExtraPrecision $MaxLicenseProcesses $MaxLicenseSubprocesses $MaxMachineNumber $MaxNumber $MaxPiecewiseCases $MaxPrecision $MaxRootDegree $MessageGroups $MessageList $MessagePrePrint $Messages $MinMachineNumber $MinNumber $MinorReleaseNumber $MinPrecision $ModuleNumber $NetworkLicense $NewMessage $NewSymbol $Notebooks $NumberMarks $Off $OperatingSystem $Output $OutputForms $OutputSizeLimit $OutputStreamMethods $Packages $ParentLink $ParentProcessID $PasswordFile $PatchLevelID $Path $PathnameSeparator $PerformanceGoal $PipeSupported $Post $Pre $PreferencesDirectory $PrePrint $PreRead $PrintForms $PrintLiteral $ProcessID $ProcessorCount $ProcessorType $ProductInformation $ProgramName $RandomState $RecursionLimit $ReleaseNumber $RootDirectory $ScheduledTask $ScriptCommandLine $SessionID $SetParentLink $SharedFunctions $SharedVariables $SoundDisplay $SoundDisplayFunction $SuppressInputFormHeads $SynchronousEvaluation $SyntaxHandler $System $SystemCharacterEncoding $SystemID $SystemWordLength $TemporaryDirectory $TemporaryPrefix $TextStyle $TimedOut $TimeUnit $TimeZone $TopDirectory $TraceOff $TraceOn $TracePattern $TracePostAction $TracePreAction $Urgent $UserAddOnsDirectory $UserBaseDirectory $UserDocumentsDirectory $UserName $Version $VersionNumber',contains:[{className:'comment',begin:/\(\*/,end:/\*\)/},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{begin:/\{/,end:/\}/,illegal:/:/}]};});hljs.registerLanguage('matlab',function(hljs){var COMMON_CONTAINS=[hljs.C_NUMBER_MODE,{className:'string',begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE,{begin:'\'\''}]}];var TRANSPOSE={relevance:0,contains:[{begin:/'['\.]*/}]};return{keywords:{keyword:'break case catch classdef continue else elseif end enumerated events for function '+'global if methods otherwise parfor persistent properties return spmd switch try while',built_in:'sin sind sinh asin asind asinh cos cosd cosh acos acosd acosh tan tand tanh atan '+'atand atan2 atanh sec secd sech asec asecd asech csc cscd csch acsc acscd acsch cot '+'cotd coth acot acotd acoth hypot exp expm1 log log1p log10 log2 pow2 realpow reallog '+'realsqrt sqrt nthroot nextpow2 abs angle complex conj imag real unwrap isreal '+'cplxpair fix floor ceil round mod rem sign airy besselj bessely besselh besseli '+'besselk beta betainc betaln ellipj ellipke erf erfc erfcx erfinv expint gamma '+'gammainc gammaln psi legendre cross dot factor isprime primes gcd lcm rat rats perms '+'nchoosek factorial cart2sph cart2pol pol2cart sph2cart hsv2rgb rgb2hsv zeros ones '+'eye repmat rand randn linspace logspace freqspace meshgrid accumarray size length '+'ndims numel disp isempty isequal isequalwithequalnans cat reshape diag blkdiag tril '+'triu fliplr flipud flipdim rot90 find sub2ind ind2sub bsxfun ndgrid permute ipermute '+'shiftdim circshift squeeze isscalar isvector ans eps realmax realmin pi i inf nan '+'isnan isinf isfinite j why compan gallery hadamard hankel hilb invhilb magic pascal '+'rosser toeplitz vander wilkinson'},illegal:'(//|"|#|/\\*|\\s+/\\w+)',contains:[{className:'function',beginKeywords:'function',end:'$',contains:[hljs.UNDERSCORE_TITLE_MODE,{className:'params',variants:[{begin:'\\(',end:'\\)'},{begin:'\\[',end:'\\]'}]}]},{begin:/[a-zA-Z_][a-zA-Z_0-9]*'['\.]*/,returnBegin:true,relevance:0,contains:[{begin:/[a-zA-Z_][a-zA-Z_0-9]*/,relevance:0},TRANSPOSE.contains[0]]},{begin:'\\[',end:'\\]',contains:COMMON_CONTAINS,relevance:0,starts:TRANSPOSE},{begin:'\\{',end:/}/,contains:COMMON_CONTAINS,relevance:0,starts:TRANSPOSE},{// transpose operators at the end of a function call
begin:/\)/,relevance:0,starts:TRANSPOSE},hljs.COMMENT('^\\s*\\%\\{\\s*$','^\\s*\\%\\}\\s*$'),hljs.COMMENT('\\%','$')].concat(COMMON_CONTAINS)};});hljs.registerLanguage('maxima',function(hljs){var KEYWORDS='if then else elseif for thru do while unless step in and or not';var LITERALS='true false unknown inf minf ind und %e %i %pi %phi %gamma';var BUILTIN_FUNCTIONS=' abasep abs absint absolute_real_time acos acosh acot acoth acsc acsch activate'+' addcol add_edge add_edges addmatrices addrow add_vertex add_vertices adjacency_matrix'+' adjoin adjoint af agd airy airy_ai airy_bi airy_dai airy_dbi algsys alg_type'+' alias allroots alphacharp alphanumericp amortization %and annuity_fv'+' annuity_pv antid antidiff AntiDifference append appendfile apply apply1 apply2'+' applyb1 apropos args arit_amortization arithmetic arithsum array arrayapply'+' arrayinfo arraymake arraysetapply ascii asec asech asin asinh askinteger'+' asksign assoc assoc_legendre_p assoc_legendre_q assume assume_external_byte_order'+' asympa at atan atan2 atanh atensimp atom atvalue augcoefmatrix augmented_lagrangian_method'+' av average_degree backtrace bars barsplot barsplot_description base64 base64_decode'+' bashindices batch batchload bc2 bdvac belln benefit_cost bern bernpoly bernstein_approx'+' bernstein_expand bernstein_poly bessel bessel_i bessel_j bessel_k bessel_simplify'+' bessel_y beta beta_incomplete beta_incomplete_generalized beta_incomplete_regularized'+' bezout bfallroots bffac bf_find_root bf_fmin_cobyla bfhzeta bfloat bfloatp'+' bfpsi bfpsi0 bfzeta biconnected_components bimetric binomial bipartition'+' block blockmatrixp bode_gain bode_phase bothcoef box boxplot boxplot_description'+' break bug_report build_info|10 buildq build_sample burn cabs canform canten'+' cardinality carg cartan cartesian_product catch cauchy_matrix cbffac cdf_bernoulli'+' cdf_beta cdf_binomial cdf_cauchy cdf_chi2 cdf_continuous_uniform cdf_discrete_uniform'+' cdf_exp cdf_f cdf_gamma cdf_general_finite_discrete cdf_geometric cdf_gumbel'+' cdf_hypergeometric cdf_laplace cdf_logistic cdf_lognormal cdf_negative_binomial'+' cdf_noncentral_chi2 cdf_noncentral_student_t cdf_normal cdf_pareto cdf_poisson'+' cdf_rank_sum cdf_rayleigh cdf_signed_rank cdf_student_t cdf_weibull cdisplay'+' ceiling central_moment cequal cequalignore cf cfdisrep cfexpand cgeodesic'+' cgreaterp cgreaterpignore changename changevar chaosgame charat charfun charfun2'+' charlist charp charpoly chdir chebyshev_t chebyshev_u checkdiv check_overlaps'+' chinese cholesky christof chromatic_index chromatic_number cint circulant_graph'+' clear_edge_weight clear_rules clear_vertex_label clebsch_gordan clebsch_graph'+' clessp clesspignore close closefile cmetric coeff coefmatrix cograd col collapse'+' collectterms columnop columnspace columnswap columnvector combination combine'+' comp2pui compare compfile compile compile_file complement_graph complete_bipartite_graph'+' complete_graph complex_number_p components compose_functions concan concat'+' conjugate conmetderiv connected_components connect_vertices cons constant'+' constantp constituent constvalue cont2part content continuous_freq contortion'+' contour_plot contract contract_edge contragrad contrib_ode convert coord'+' copy copy_file copy_graph copylist copymatrix cor cos cosh cot coth cov cov1'+' covdiff covect covers crc24sum create_graph create_list csc csch csetup cspline'+' ctaylor ct_coordsys ctransform ctranspose cube_graph cuboctahedron_graph'+' cunlisp cv cycle_digraph cycle_graph cylindrical days360 dblint deactivate'+' declare declare_constvalue declare_dimensions declare_fundamental_dimensions'+' declare_fundamental_units declare_qty declare_translated declare_unit_conversion'+' declare_units declare_weights decsym defcon define define_alt_display define_variable'+' defint defmatch defrule defstruct deftaylor degree_sequence del delete deleten'+' delta demo demoivre denom depends derivdegree derivlist describe desolve'+' determinant dfloat dgauss_a dgauss_b dgeev dgemm dgeqrf dgesv dgesvd diag'+' diagmatrix diag_matrix diagmatrixp diameter diff digitcharp dimacs_export'+' dimacs_import dimension dimensionless dimensions dimensions_as_list direct'+' directory discrete_freq disjoin disjointp disolate disp dispcon dispform'+' dispfun dispJordan display disprule dispterms distrib divide divisors divsum'+' dkummer_m dkummer_u dlange dodecahedron_graph dotproduct dotsimp dpart'+' draw draw2d draw3d drawdf draw_file draw_graph dscalar echelon edge_coloring'+' edge_connectivity edges eigens_by_jacobi eigenvalues eigenvectors eighth'+' einstein eivals eivects elapsed_real_time elapsed_run_time ele2comp ele2polynome'+' ele2pui elem elementp elevation_grid elim elim_allbut eliminate eliminate_using'+' ellipse elliptic_e elliptic_ec elliptic_eu elliptic_f elliptic_kc elliptic_pi'+' ematrix empty_graph emptyp endcons entermatrix entertensor entier equal equalp'+' equiv_classes erf erfc erf_generalized erfi errcatch error errormsg errors'+' euler ev eval_string evenp every evolution evolution2d evundiff example exp'+' expand expandwrt expandwrt_factored expint expintegral_chi expintegral_ci'+' expintegral_e expintegral_e1 expintegral_ei expintegral_e_simplify expintegral_li'+' expintegral_shi expintegral_si explicit explose exponentialize express expt'+' exsec extdiff extract_linear_equations extremal_subset ezgcd %f f90 facsum'+' factcomb factor factorfacsum factorial factorout factorsum facts fast_central_elements'+' fast_linsolve fasttimes featurep fernfale fft fib fibtophi fifth filename_merge'+' file_search file_type fillarray findde find_root find_root_abs find_root_error'+' find_root_rel first fix flatten flength float floatnump floor flower_snark'+' flush flush1deriv flushd flushnd flush_output fmin_cobyla forget fortran'+' fourcos fourexpand fourier fourier_elim fourint fourintcos fourintsin foursimp'+' foursin fourth fposition frame_bracket freeof freshline fresnel_c fresnel_s'+' from_adjacency_matrix frucht_graph full_listify fullmap fullmapl fullratsimp'+' fullratsubst fullsetify funcsolve fundamental_dimensions fundamental_units'+' fundef funmake funp fv g0 g1 gamma gamma_greek gamma_incomplete gamma_incomplete_generalized'+' gamma_incomplete_regularized gauss gauss_a gauss_b gaussprob gcd gcdex gcdivide'+' gcfac gcfactor gd generalized_lambert_w genfact gen_laguerre genmatrix gensym'+' geo_amortization geo_annuity_fv geo_annuity_pv geomap geometric geometric_mean'+' geosum get getcurrentdirectory get_edge_weight getenv get_lu_factors get_output_stream_string'+' get_pixel get_plot_option get_tex_environment get_tex_environment_default'+' get_vertex_label gfactor gfactorsum ggf girth global_variances gn gnuplot_close'+' gnuplot_replot gnuplot_reset gnuplot_restart gnuplot_start go Gosper GosperSum'+' gr2d gr3d gradef gramschmidt graph6_decode graph6_encode graph6_export graph6_import'+' graph_center graph_charpoly graph_eigenvalues graph_flow graph_order graph_periphery'+' graph_product graph_size graph_union great_rhombicosidodecahedron_graph great_rhombicuboctahedron_graph'+' grid_graph grind grobner_basis grotzch_graph hamilton_cycle hamilton_path'+' hankel hankel_1 hankel_2 harmonic harmonic_mean hav heawood_graph hermite'+' hessian hgfred hilbertmap hilbert_matrix hipow histogram histogram_description'+' hodge horner hypergeometric i0 i1 %ibes ic1 ic2 ic_convert ichr1 ichr2 icosahedron_graph'+' icosidodecahedron_graph icurvature ident identfor identity idiff idim idummy'+' ieqn %if ifactors iframes ifs igcdex igeodesic_coords ilt image imagpart'+' imetric implicit implicit_derivative implicit_plot indexed_tensor indices'+' induced_subgraph inferencep inference_result infix info_display init_atensor'+' init_ctensor in_neighbors innerproduct inpart inprod inrt integerp integer_partitions'+' integrate intersect intersection intervalp intopois intosum invariant1 invariant2'+' inverse_fft inverse_jacobi_cd inverse_jacobi_cn inverse_jacobi_cs inverse_jacobi_dc'+' inverse_jacobi_dn inverse_jacobi_ds inverse_jacobi_nc inverse_jacobi_nd inverse_jacobi_ns'+' inverse_jacobi_sc inverse_jacobi_sd inverse_jacobi_sn invert invert_by_adjoint'+' invert_by_lu inv_mod irr is is_biconnected is_bipartite is_connected is_digraph'+' is_edge_in_graph is_graph is_graph_or_digraph ishow is_isomorphic isolate'+' isomorphism is_planar isqrt isreal_p is_sconnected is_tree is_vertex_in_graph'+' items_inference %j j0 j1 jacobi jacobian jacobi_cd jacobi_cn jacobi_cs jacobi_dc'+' jacobi_dn jacobi_ds jacobi_nc jacobi_nd jacobi_ns jacobi_p jacobi_sc jacobi_sd'+' jacobi_sn JF jn join jordan julia julia_set julia_sin %k kdels kdelta kill'+' killcontext kostka kron_delta kronecker_product kummer_m kummer_u kurtosis'+' kurtosis_bernoulli kurtosis_beta kurtosis_binomial kurtosis_chi2 kurtosis_continuous_uniform'+' kurtosis_discrete_uniform kurtosis_exp kurtosis_f kurtosis_gamma kurtosis_general_finite_discrete'+' kurtosis_geometric kurtosis_gumbel kurtosis_hypergeometric kurtosis_laplace'+' kurtosis_logistic kurtosis_lognormal kurtosis_negative_binomial kurtosis_noncentral_chi2'+' kurtosis_noncentral_student_t kurtosis_normal kurtosis_pareto kurtosis_poisson'+' kurtosis_rayleigh kurtosis_student_t kurtosis_weibull label labels lagrange'+' laguerre lambda lambert_w laplace laplacian_matrix last lbfgs lc2kdt lcharp'+' lc_l lcm lc_u ldefint ldisp ldisplay legendre_p legendre_q leinstein length'+' let letrules letsimp levi_civita lfreeof lgtreillis lhs li liediff limit'+' Lindstedt linear linearinterpol linear_program linear_regression line_graph'+' linsolve listarray list_correlations listify list_matrix_entries list_nc_monomials'+' listoftens listofvars listp lmax lmin load loadfile local locate_matrix_entry'+' log logcontract log_gamma lopow lorentz_gauge lowercasep lpart lratsubst'+' lreduce lriemann lsquares_estimates lsquares_estimates_approximate lsquares_estimates_exact'+' lsquares_mse lsquares_residual_mse lsquares_residuals lsum ltreillis lu_backsub'+' lucas lu_factor %m macroexpand macroexpand1 make_array makebox makefact makegamma'+' make_graph make_level_picture makelist makeOrders make_poly_continent make_poly_country'+' make_polygon make_random_state make_rgb_picture makeset make_string_input_stream'+' make_string_output_stream make_transform mandelbrot mandelbrot_set map mapatom'+' maplist matchdeclare matchfix mat_cond mat_fullunblocker mat_function mathml_display'+' mat_norm matrix matrixmap matrixp matrix_size mattrace mat_trace mat_unblocker'+' max max_clique max_degree max_flow maximize_lp max_independent_set max_matching'+' maybe md5sum mean mean_bernoulli mean_beta mean_binomial mean_chi2 mean_continuous_uniform'+' mean_deviation mean_discrete_uniform mean_exp mean_f mean_gamma mean_general_finite_discrete'+' mean_geometric mean_gumbel mean_hypergeometric mean_laplace mean_logistic'+' mean_lognormal mean_negative_binomial mean_noncentral_chi2 mean_noncentral_student_t'+' mean_normal mean_pareto mean_poisson mean_rayleigh mean_student_t mean_weibull'+' median median_deviation member mesh metricexpandall mgf1_sha1 min min_degree'+' min_edge_cut minfactorial minimalPoly minimize_lp minimum_spanning_tree minor'+' minpack_lsquares minpack_solve min_vertex_cover min_vertex_cut mkdir mnewton'+' mod mode_declare mode_identity ModeMatrix moebius mon2schur mono monomial_dimensions'+' multibernstein_poly multi_display_for_texinfo multi_elem multinomial multinomial_coeff'+' multi_orbit multiplot_mode multi_pui multsym multthru mycielski_graph nary'+' natural_unit nc_degree ncexpt ncharpoly negative_picture neighbors new newcontext'+' newdet new_graph newline newton new_variable next_prime nicedummies niceindices'+' ninth nofix nonarray noncentral_moment nonmetricity nonnegintegerp nonscalarp'+' nonzeroandfreeof notequal nounify nptetrad npv nroots nterms ntermst'+' nthroot nullity nullspace num numbered_boundaries numberp number_to_octets'+' num_distinct_partitions numerval numfactor num_partitions nusum nzeta nzetai'+' nzetar octets_to_number octets_to_oid odd_girth oddp ode2 ode_check odelin'+' oid_to_octets op opena opena_binary openr openr_binary openw openw_binary'+' operatorp opsubst optimize %or orbit orbits ordergreat ordergreatp orderless'+' orderlessp orthogonal_complement orthopoly_recur orthopoly_weight outermap'+' out_neighbors outofpois pade parabolic_cylinder_d parametric parametric_surface'+' parg parGosper parse_string parse_timedate part part2cont partfrac partition'+' partition_set partpol path_digraph path_graph pathname_directory pathname_name'+' pathname_type pdf_bernoulli pdf_beta pdf_binomial pdf_cauchy pdf_chi2 pdf_continuous_uniform'+' pdf_discrete_uniform pdf_exp pdf_f pdf_gamma pdf_general_finite_discrete'+' pdf_geometric pdf_gumbel pdf_hypergeometric pdf_laplace pdf_logistic pdf_lognormal'+' pdf_negative_binomial pdf_noncentral_chi2 pdf_noncentral_student_t pdf_normal'+' pdf_pareto pdf_poisson pdf_rank_sum pdf_rayleigh pdf_signed_rank pdf_student_t'+' pdf_weibull pearson_skewness permanent permut permutation permutations petersen_graph'+' petrov pickapart picture_equalp picturep piechart piechart_description planar_embedding'+' playback plog plot2d plot3d plotdf ploteq plsquares pochhammer points poisdiff'+' poisexpt poisint poismap poisplus poissimp poissubst poistimes poistrim polar'+' polarform polartorect polar_to_xy poly_add poly_buchberger poly_buchberger_criterion'+' poly_colon_ideal poly_content polydecomp poly_depends_p poly_elimination_ideal'+' poly_exact_divide poly_expand poly_expt poly_gcd polygon poly_grobner poly_grobner_equal'+' poly_grobner_member poly_grobner_subsetp poly_ideal_intersection poly_ideal_polysaturation'+' poly_ideal_polysaturation1 poly_ideal_saturation poly_ideal_saturation1 poly_lcm'+' poly_minimization polymod poly_multiply polynome2ele polynomialp poly_normal_form'+' poly_normalize poly_normalize_list poly_polysaturation_extension poly_primitive_part'+' poly_pseudo_divide poly_reduced_grobner poly_reduction poly_saturation_extension'+' poly_s_polynomial poly_subtract polytocompanion pop postfix potential power_mod'+' powerseries powerset prefix prev_prime primep primes principal_components'+' print printf printfile print_graph printpois printprops prodrac product properties'+' propvars psi psubst ptriangularize pui pui2comp pui2ele pui2polynome pui_direct'+' puireduc push put pv qput qrange qty quad_control quad_qag quad_qagi quad_qagp'+' quad_qags quad_qawc quad_qawf quad_qawo quad_qaws quadrilateral quantile'+' quantile_bernoulli quantile_beta quantile_binomial quantile_cauchy quantile_chi2'+' quantile_continuous_uniform quantile_discrete_uniform quantile_exp quantile_f'+' quantile_gamma quantile_general_finite_discrete quantile_geometric quantile_gumbel'+' quantile_hypergeometric quantile_laplace quantile_logistic quantile_lognormal'+' quantile_negative_binomial quantile_noncentral_chi2 quantile_noncentral_student_t'+' quantile_normal quantile_pareto quantile_poisson quantile_rayleigh quantile_student_t'+' quantile_weibull quartile_skewness quit qunit quotient racah_v racah_w radcan'+' radius random random_bernoulli random_beta random_binomial random_bipartite_graph'+' random_cauchy random_chi2 random_continuous_uniform random_digraph random_discrete_uniform'+' random_exp random_f random_gamma random_general_finite_discrete random_geometric'+' random_graph random_graph1 random_gumbel random_hypergeometric random_laplace'+' random_logistic random_lognormal random_negative_binomial random_network'+' random_noncentral_chi2 random_noncentral_student_t random_normal random_pareto'+' random_permutation random_poisson random_rayleigh random_regular_graph random_student_t'+' random_tournament random_tree random_weibull range rank rat ratcoef ratdenom'+' ratdiff ratdisrep ratexpand ratinterpol rational rationalize ratnumer ratnump'+' ratp ratsimp ratsubst ratvars ratweight read read_array read_binary_array'+' read_binary_list read_binary_matrix readbyte readchar read_hashed_array readline'+' read_list read_matrix read_nested_list readonly read_xpm real_imagpart_to_conjugate'+' realpart realroots rearray rectangle rectform rectform_log_if_constant recttopolar'+' rediff reduce_consts reduce_order region region_boundaries region_boundaries_plus'+' rem remainder remarray rembox remcomps remcon remcoord remfun remfunction'+' remlet remove remove_constvalue remove_dimensions remove_edge remove_fundamental_dimensions'+' remove_fundamental_units remove_plot_option remove_vertex rempart remrule'+' remsym remvalue rename rename_file reset reset_displays residue resolvante'+' resolvante_alternee1 resolvante_bipartite resolvante_diedrale resolvante_klein'+' resolvante_klein3 resolvante_produit_sym resolvante_unitaire resolvante_vierer'+' rest resultant return reveal reverse revert revert2 rgb2level rhs ricci riemann'+' rinvariant risch rk rmdir rncombine romberg room rootscontract round row'+' rowop rowswap rreduce run_testsuite %s save saving scalarp scaled_bessel_i'+' scaled_bessel_i0 scaled_bessel_i1 scalefactors scanmap scatterplot scatterplot_description'+' scene schur2comp sconcat scopy scsimp scurvature sdowncase sec sech second'+' sequal sequalignore set_alt_display setdifference set_draw_defaults set_edge_weight'+' setelmx setequalp setify setp set_partitions set_plot_option set_prompt set_random_state'+' set_tex_environment set_tex_environment_default setunits setup_autoload set_up_dot_simplifications'+' set_vertex_label seventh sexplode sf sha1sum sha256sum shortest_path shortest_weighted_path'+' show showcomps showratvars sierpinskiale sierpinskimap sign signum similaritytransform'+' simp_inequality simplify_sum simplode simpmetderiv simtran sin sinh sinsert'+' sinvertcase sixth skewness skewness_bernoulli skewness_beta skewness_binomial'+' skewness_chi2 skewness_continuous_uniform skewness_discrete_uniform skewness_exp'+' skewness_f skewness_gamma skewness_general_finite_discrete skewness_geometric'+' skewness_gumbel skewness_hypergeometric skewness_laplace skewness_logistic'+' skewness_lognormal skewness_negative_binomial skewness_noncentral_chi2 skewness_noncentral_student_t'+' skewness_normal skewness_pareto skewness_poisson skewness_rayleigh skewness_student_t'+' skewness_weibull slength smake small_rhombicosidodecahedron_graph small_rhombicuboctahedron_graph'+' smax smin smismatch snowmap snub_cube_graph snub_dodecahedron_graph solve'+' solve_rec solve_rec_rat some somrac sort sparse6_decode sparse6_encode sparse6_export'+' sparse6_import specint spherical spherical_bessel_j spherical_bessel_y spherical_hankel1'+' spherical_hankel2 spherical_harmonic spherical_to_xyz splice split sposition'+' sprint sqfr sqrt sqrtdenest sremove sremovefirst sreverse ssearch ssort sstatus'+' ssubst ssubstfirst staircase standardize standardize_inverse_trig starplot'+' starplot_description status std std1 std_bernoulli std_beta std_binomial'+' std_chi2 std_continuous_uniform std_discrete_uniform std_exp std_f std_gamma'+' std_general_finite_discrete std_geometric std_gumbel std_hypergeometric std_laplace'+' std_logistic std_lognormal std_negative_binomial std_noncentral_chi2 std_noncentral_student_t'+' std_normal std_pareto std_poisson std_rayleigh std_student_t std_weibull'+' stemplot stirling stirling1 stirling2 strim striml strimr string stringout'+' stringp strong_components struve_h struve_l sublis sublist sublist_indices'+' submatrix subsample subset subsetp subst substinpart subst_parallel substpart'+' substring subvar subvarp sum sumcontract summand_to_rec supcase supcontext'+' symbolp symmdifference symmetricp system take_channel take_inference tan'+' tanh taylor taylorinfo taylorp taylor_simplifier taytorat tcl_output tcontract'+' tellrat tellsimp tellsimpafter tentex tenth test_mean test_means_difference'+' test_normality test_proportion test_proportions_difference test_rank_sum'+' test_sign test_signed_rank test_variance test_variance_ratio tex tex1 tex_display'+' texput %th third throw time timedate timer timer_info tldefint tlimit todd_coxeter'+' toeplitz tokens to_lisp topological_sort to_poly to_poly_solve totaldisrep'+' totalfourier totient tpartpol trace tracematrix trace_options transform_sample'+' translate translate_file transpose treefale tree_reduce treillis treinat'+' triangle triangularize trigexpand trigrat trigreduce trigsimp trunc truncate'+' truncated_cube_graph truncated_dodecahedron_graph truncated_icosahedron_graph'+' truncated_tetrahedron_graph tr_warnings_get tube tutte_graph ueivects uforget'+' ultraspherical underlying_graph undiff union unique uniteigenvectors unitp'+' units unit_step unitvector unorder unsum untellrat untimer'+' untrace uppercasep uricci uriemann uvect vandermonde_matrix var var1 var_bernoulli'+' var_beta var_binomial var_chi2 var_continuous_uniform var_discrete_uniform'+' var_exp var_f var_gamma var_general_finite_discrete var_geometric var_gumbel'+' var_hypergeometric var_laplace var_logistic var_lognormal var_negative_binomial'+' var_noncentral_chi2 var_noncentral_student_t var_normal var_pareto var_poisson'+' var_rayleigh var_student_t var_weibull vector vectorpotential vectorsimp'+' verbify vers vertex_coloring vertex_connectivity vertex_degree vertex_distance'+' vertex_eccentricity vertex_in_degree vertex_out_degree vertices vertices_to_cycle'+' vertices_to_path %w weyl wheel_graph wiener_index wigner_3j wigner_6j'+' wigner_9j with_stdout write_binary_data writebyte write_data writefile wronskian'+' xreduce xthru %y Zeilberger zeroequiv zerofor zeromatrix zeromatrixp zeta'+' zgeev zheev zlange zn_add_table zn_carmichael_lambda zn_characteristic_factors'+' zn_determinant zn_factor_generators zn_invert_by_lu zn_log zn_mult_table'+' absboxchar activecontexts adapt_depth additive adim aform algebraic'+' algepsilon algexact aliases allbut all_dotsimp_denoms allocation allsym alphabetic'+' animation antisymmetric arrays askexp assume_pos assume_pos_pred assumescalar'+' asymbol atomgrad atrig1 axes axis_3d axis_bottom axis_left axis_right axis_top'+' azimuth background background_color backsubst berlefact bernstein_explicit'+' besselexpand beta_args_sum_to_integer beta_expand bftorat bftrunc bindtest'+' border boundaries_array box boxchar breakup %c capping cauchysum cbrange'+' cbtics center cflength cframe_flag cnonmet_flag color color_bar color_bar_tics'+' colorbox columns commutative complex cone context contexts contour contour_levels'+' cosnpiflag ctaypov ctaypt ctayswitch ctayvar ct_coords ctorsion_flag ctrgsimp'+' cube current_let_rule_package cylinder data_file_name debugmode decreasing'+' default_let_rule_package delay dependencies derivabbrev derivsubst detout'+' diagmetric diff dim dimensions dispflag display2d|10 display_format_internal'+' distribute_over doallmxops domain domxexpt domxmxops domxnctimes dontfactor'+' doscmxops doscmxplus dot0nscsimp dot0simp dot1simp dotassoc dotconstrules'+' dotdistrib dotexptsimp dotident dotscrules draw_graph_program draw_realpart'+' edge_color edge_coloring edge_partition edge_type edge_width %edispflag'+' elevation %emode endphi endtheta engineering_format_floats enhanced3d %enumer'+' epsilon_lp erfflag erf_representation errormsg error_size error_syms error_type'+' %e_to_numlog eval even evenfun evflag evfun ev_point expandwrt_denom expintexpand'+' expintrep expon expop exptdispflag exptisolate exptsubst facexpand facsum_combine'+' factlim factorflag factorial_expand factors_only fb feature features'+' file_name file_output_append file_search_demo file_search_lisp file_search_maxima|10'+' file_search_tests file_search_usage file_type_lisp file_type_maxima|10 fill_color'+' fill_density filled_func fixed_vertices flipflag float2bf font font_size'+' fortindent fortspaces fpprec fpprintprec functions gamma_expand gammalim'+' gdet genindex gensumnum GGFCFMAX GGFINFINITY globalsolve gnuplot_command'+' gnuplot_curve_styles gnuplot_curve_titles gnuplot_default_term_command gnuplot_dumb_term_command'+' gnuplot_file_args gnuplot_file_name gnuplot_out_file gnuplot_pdf_term_command'+' gnuplot_pm3d gnuplot_png_term_command gnuplot_postamble gnuplot_preamble'+' gnuplot_ps_term_command gnuplot_svg_term_command gnuplot_term gnuplot_view_args'+' Gosper_in_Zeilberger gradefs grid grid2d grind halfangles head_angle head_both'+' head_length head_type height hypergeometric_representation %iargs ibase'+' icc1 icc2 icounter idummyx ieqnprint ifb ifc1 ifc2 ifg ifgi ifr iframe_bracket_form'+' ifri igeowedge_flag ikt1 ikt2 imaginary inchar increasing infeval'+' infinity inflag infolists inm inmc1 inmc2 intanalysis integer integervalued'+' integrate_use_rootsof integration_constant integration_constant_counter interpolate_color'+' intfaclim ip_grid ip_grid_in irrational isolate_wrt_times iterations itr'+' julia_parameter %k1 %k2 keepfloat key key_pos kinvariant kt label label_alignment'+' label_orientation labels lassociative lbfgs_ncorrections lbfgs_nfeval_max'+' leftjust legend letrat let_rule_packages lfg lg lhospitallim limsubst linear'+' linear_solver linechar linel|10 linenum line_type linewidth line_width linsolve_params'+' linsolvewarn lispdisp listarith listconstvars listdummyvars lmxchar load_pathname'+' loadprint logabs logarc logcb logconcoeffp logexpand lognegint logsimp logx'+' logx_secondary logy logy_secondary logz lriem m1pbranch macroexpansion macros'+' mainvar manual_demo maperror mapprint matrix_element_add matrix_element_mult'+' matrix_element_transpose maxapplydepth maxapplyheight maxima_tempdir|10 maxima_userdir|10'+' maxnegex MAX_ORD maxposex maxpsifracdenom maxpsifracnum maxpsinegint maxpsiposint'+' maxtayorder mesh_lines_color method mod_big_prime mode_check_errorp'+' mode_checkp mode_check_warnp mod_test mod_threshold modular_linear_solver'+' modulus multiplicative multiplicities myoptions nary negdistrib negsumdispflag'+' newline newtonepsilon newtonmaxiter nextlayerfactor niceindicespref nm nmc'+' noeval nolabels nonegative_lp noninteger nonscalar noun noundisp nouns np'+' npi nticks ntrig numer numer_pbranch obase odd oddfun opacity opproperties'+' opsubst optimprefix optionset orientation origin orthopoly_returns_intervals'+' outative outchar packagefile palette partswitch pdf_file pfeformat phiresolution'+' %piargs piece pivot_count_sx pivot_max_sx plot_format plot_options plot_realpart'+' png_file pochhammer_max_index points pointsize point_size points_joined point_type'+' poislim poisson poly_coefficient_ring poly_elimination_order polyfactor poly_grobner_algorithm'+' poly_grobner_debug poly_monomial_order poly_primary_elimination_order poly_return_term_list'+' poly_secondary_elimination_order poly_top_reduction_only posfun position'+' powerdisp pred prederror primep_number_of_tests product_use_gamma program'+' programmode promote_float_to_bigfloat prompt proportional_axes props psexpand'+' ps_file radexpand radius radsubstflag rassociative ratalgdenom ratchristof'+' ratdenomdivide rateinstein ratepsilon ratfac rational ratmx ratprint ratriemann'+' ratsimpexpons ratvarswitch ratweights ratweyl ratwtlvl real realonly redraw'+' refcheck resolution restart resultant ric riem rmxchar %rnum_list rombergabs'+' rombergit rombergmin rombergtol rootsconmode rootsepsilon run_viewer same_xy'+' same_xyz savedef savefactors scalar scalarmatrixp scale scale_lp setcheck'+' setcheckbreak setval show_edge_color show_edges show_edge_type show_edge_width'+' show_id show_label showtime show_vertex_color show_vertex_size show_vertex_type'+' show_vertices show_weight simp simplified_output simplify_products simpproduct'+' simpsum sinnpiflag solvedecomposes solveexplicit solvefactors solvenullwarn'+' solveradcan solvetrigwarn space sparse sphere spring_embedding_depth sqrtdispflag'+' stardisp startphi starttheta stats_numer stringdisp structures style sublis_apply_lambda'+' subnumsimp sumexpand sumsplitfact surface surface_hide svg_file symmetric'+' tab taylordepth taylor_logexpand taylor_order_coefficients taylor_truncate_polynomials'+' tensorkill terminal testsuite_files thetaresolution timer_devalue title tlimswitch'+' tr track transcompile transform transform_xy translate_fast_arrays transparent'+' transrun tr_array_as_ref tr_bound_function_applyp tr_file_tty_messagesp tr_float_can_branch_complex'+' tr_function_call_default trigexpandplus trigexpandtimes triginverses trigsign'+' trivial_solutions tr_numer tr_optimize_max_loop tr_semicompile tr_state_vars'+' tr_warn_bad_function_calls tr_warn_fexpr tr_warn_meval tr_warn_mode'+' tr_warn_undeclared tr_warn_undefined_variable tstep ttyoff tube_extremes'+' ufg ug %unitexpand unit_vectors uric uriem use_fast_arrays user_preamble'+' usersetunits values vect_cross verbose vertex_color vertex_coloring vertex_partition'+' vertex_size vertex_type view warnings weyl width windowname windowtitle wired_surface'+' wireframe xaxis xaxis_color xaxis_secondary xaxis_type xaxis_width xlabel'+' xlabel_secondary xlength xrange xrange_secondary xtics xtics_axis xtics_rotate'+' xtics_rotate_secondary xtics_secondary xtics_secondary_axis xu_grid x_voxel'+' xy_file xyplane xy_scale yaxis yaxis_color yaxis_secondary yaxis_type yaxis_width'+' ylabel ylabel_secondary ylength yrange yrange_secondary ytics ytics_axis'+' ytics_rotate ytics_rotate_secondary ytics_secondary ytics_secondary_axis'+' yv_grid y_voxel yx_ratio zaxis zaxis_color zaxis_type zaxis_width zeroa zerob'+' zerobern zeta%pi zlabel zlabel_rotate zlength zmin zn_primroot_limit zn_primroot_pretest';var SYMBOLS='_ __ %|0 %%|0';return{lexemes:'[A-Za-z_%][0-9A-Za-z_%]*',keywords:{keyword:KEYWORDS,literal:LITERALS,built_in:BUILTIN_FUNCTIONS,symbol:SYMBOLS},contains:[{className:'comment',begin:'/\\*',end:'\\*/',contains:['self']},hljs.QUOTE_STRING_MODE,{className:'number',relevance:0,variants:[{// float number w/ exponent
// hmm, I wonder if we ought to include other exponent markers?
begin:'\\b(\\d+|\\d+\\.|\\.\\d+|\\d+\\.\\d+)[Ee][-+]?\\d+\\b'},{// bigfloat number
begin:'\\b(\\d+|\\d+\\.|\\.\\d+|\\d+\\.\\d+)[Bb][-+]?\\d+\\b',relevance:10},{// float number w/out exponent
// Doesn't seem to recognize floats which start with '.'
begin:'\\b(\\.\\d+|\\d+\\.\\d+)\\b'},{// integer in base up to 36
// Doesn't seem to recognize integers which end with '.'
begin:'\\b(\\d+|0[0-9A-Za-z]+)\\.?\\b'}]}],illegal:/@/};});hljs.registerLanguage('mel',function(hljs){return{keywords:'int float string vector matrix if else switch case default while do for in break '+'continue global proc return about abs addAttr addAttributeEditorNodeHelp addDynamic '+'addNewShelfTab addPP addPanelCategory addPrefixToName advanceToNextDrivenKey '+'affectedNet affects aimConstraint air alias aliasAttr align alignCtx alignCurve '+'alignSurface allViewFit ambientLight angle angleBetween animCone animCurveEditor '+'animDisplay animView annotate appendStringArray applicationName applyAttrPreset '+'applyTake arcLenDimContext arcLengthDimension arclen arrayMapper art3dPaintCtx '+'artAttrCtx artAttrPaintVertexCtx artAttrSkinPaintCtx artAttrTool artBuildPaintMenu '+'artFluidAttrCtx artPuttyCtx artSelectCtx artSetPaintCtx artUserPaintCtx assignCommand '+'assignInputDevice assignViewportFactories attachCurve attachDeviceAttr attachSurface '+'attrColorSliderGrp attrCompatibility attrControlGrp attrEnumOptionMenu '+'attrEnumOptionMenuGrp attrFieldGrp attrFieldSliderGrp attrNavigationControlGrp '+'attrPresetEditWin attributeExists attributeInfo attributeMenu attributeQuery '+'autoKeyframe autoPlace bakeClip bakeFluidShading bakePartialHistory bakeResults '+'bakeSimulation basename basenameEx batchRender bessel bevel bevelPlus binMembership '+'bindSkin blend2 blendShape blendShapeEditor blendShapePanel blendTwoAttr blindDataType '+'boneLattice boundary boxDollyCtx boxZoomCtx bufferCurve buildBookmarkMenu '+'buildKeyframeMenu button buttonManip CBG cacheFile cacheFileCombine cacheFileMerge '+'cacheFileTrack camera cameraView canCreateManip canvas capitalizeString catch '+'catchQuiet ceil changeSubdivComponentDisplayLevel changeSubdivRegion channelBox '+'character characterMap characterOutlineEditor characterize chdir checkBox checkBoxGrp '+'checkDefaultRenderGlobals choice circle circularFillet clamp clear clearCache clip '+'clipEditor clipEditorCurrentTimeCtx clipSchedule clipSchedulerOutliner clipTrimBefore '+'closeCurve closeSurface cluster cmdFileOutput cmdScrollFieldExecuter '+'cmdScrollFieldReporter cmdShell coarsenSubdivSelectionList collision color '+'colorAtPoint colorEditor colorIndex colorIndexSliderGrp colorSliderButtonGrp '+'colorSliderGrp columnLayout commandEcho commandLine commandPort compactHairSystem '+'componentEditor compositingInterop computePolysetVolume condition cone confirmDialog '+'connectAttr connectControl connectDynamic connectJoint connectionInfo constrain '+'constrainValue constructionHistory container containsMultibyte contextInfo control '+'convertFromOldLayers convertIffToPsd convertLightmap convertSolidTx convertTessellation '+'convertUnit copyArray copyFlexor copyKey copySkinWeights cos cpButton cpCache '+'cpClothSet cpCollision cpConstraint cpConvClothToMesh cpForces cpGetSolverAttr cpPanel '+'cpProperty cpRigidCollisionFilter cpSeam cpSetEdit cpSetSolverAttr cpSolver '+'cpSolverTypes cpTool cpUpdateClothUVs createDisplayLayer createDrawCtx createEditor '+'createLayeredPsdFile createMotionField createNewShelf createNode createRenderLayer '+'createSubdivRegion cross crossProduct ctxAbort ctxCompletion ctxEditMode ctxTraverse '+'currentCtx currentTime currentTimeCtx currentUnit curve curveAddPtCtx '+'curveCVCtx curveEPCtx curveEditorCtx curveIntersect curveMoveEPCtx curveOnSurface '+'curveSketchCtx cutKey cycleCheck cylinder dagPose date defaultLightListCheckBox '+'defaultNavigation defineDataServer defineVirtualDevice deformer deg_to_rad delete '+'deleteAttr deleteShadingGroupsAndMaterials deleteShelfTab deleteUI deleteUnusedBrushes '+'delrandstr detachCurve detachDeviceAttr detachSurface deviceEditor devicePanel dgInfo '+'dgdirty dgeval dgtimer dimWhen directKeyCtx directionalLight dirmap dirname disable '+'disconnectAttr disconnectJoint diskCache displacementToPoly displayAffected '+'displayColor displayCull displayLevelOfDetail displayPref displayRGBColor '+'displaySmoothness displayStats displayString displaySurface distanceDimContext '+'distanceDimension doBlur dolly dollyCtx dopeSheetEditor dot dotProduct '+'doubleProfileBirailSurface drag dragAttrContext draggerContext dropoffLocator '+'duplicate duplicateCurve duplicateSurface dynCache dynControl dynExport dynExpression '+'dynGlobals dynPaintEditor dynParticleCtx dynPref dynRelEdPanel dynRelEditor '+'dynamicLoad editAttrLimits editDisplayLayerGlobals editDisplayLayerMembers '+'editRenderLayerAdjustment editRenderLayerGlobals editRenderLayerMembers editor '+'editorTemplate effector emit emitter enableDevice encodeString endString endsWith env '+'equivalent equivalentTol erf error eval evalDeferred evalEcho event '+'exactWorldBoundingBox exclusiveLightCheckBox exec executeForEachObject exists exp '+'expression expressionEditorListen extendCurve extendSurface extrude fcheck fclose feof '+'fflush fgetline fgetword file fileBrowserDialog fileDialog fileExtension fileInfo '+'filetest filletCurve filter filterCurve filterExpand filterStudioImport '+'findAllIntersections findAnimCurves findKeyframe findMenuItem findRelatedSkinCluster '+'finder firstParentOf fitBspline flexor floatEq floatField floatFieldGrp floatScrollBar '+'floatSlider floatSlider2 floatSliderButtonGrp floatSliderGrp floor flow fluidCacheInfo '+'fluidEmitter fluidVoxelInfo flushUndo fmod fontDialog fopen formLayout format fprint '+'frameLayout fread freeFormFillet frewind fromNativePath fwrite gamma gauss '+'geometryConstraint getApplicationVersionAsFloat getAttr getClassification '+'getDefaultBrush getFileList getFluidAttr getInputDeviceRange getMayaPanelTypes '+'getModifiers getPanel getParticleAttr getPluginResource getenv getpid glRender '+'glRenderEditor globalStitch gmatch goal gotoBindPose grabColor gradientControl '+'gradientControlNoAttr graphDollyCtx graphSelectContext graphTrackCtx gravity grid '+'gridLayout group groupObjectsByName HfAddAttractorToAS HfAssignAS HfBuildEqualMap '+'HfBuildFurFiles HfBuildFurImages HfCancelAFR HfConnectASToHF HfCreateAttractor '+'HfDeleteAS HfEditAS HfPerformCreateAS HfRemoveAttractorFromAS HfSelectAttached '+'HfSelectAttractors HfUnAssignAS hardenPointCurve hardware hardwareRenderPanel '+'headsUpDisplay headsUpMessage help helpLine hermite hide hilite hitTest hotBox hotkey '+'hotkeyCheck hsv_to_rgb hudButton hudSlider hudSliderButton hwReflectionMap hwRender '+'hwRenderLoad hyperGraph hyperPanel hyperShade hypot iconTextButton iconTextCheckBox '+'iconTextRadioButton iconTextRadioCollection iconTextScrollList iconTextStaticLabel '+'ikHandle ikHandleCtx ikHandleDisplayScale ikSolver ikSplineHandleCtx ikSystem '+'ikSystemInfo ikfkDisplayMethod illustratorCurves image imfPlugins inheritTransform '+'insertJoint insertJointCtx insertKeyCtx insertKnotCurve insertKnotSurface instance '+'instanceable instancer intField intFieldGrp intScrollBar intSlider intSliderGrp '+'interToUI internalVar intersect iprEngine isAnimCurve isConnected isDirty isParentOf '+'isSameObject isTrue isValidObjectName isValidString isValidUiName isolateSelect '+'itemFilter itemFilterAttr itemFilterRender itemFilterType joint jointCluster jointCtx '+'jointDisplayScale jointLattice keyTangent keyframe keyframeOutliner '+'keyframeRegionCurrentTimeCtx keyframeRegionDirectKeyCtx keyframeRegionDollyCtx '+'keyframeRegionInsertKeyCtx keyframeRegionMoveKeyCtx keyframeRegionScaleKeyCtx '+'keyframeRegionSelectKeyCtx keyframeRegionSetKeyCtx keyframeRegionTrackCtx '+'keyframeStats lassoContext lattice latticeDeformKeyCtx launch launchImageEditor '+'layerButton layeredShaderPort layeredTexturePort layout layoutDialog lightList '+'lightListEditor lightListPanel lightlink lineIntersection linearPrecision linstep '+'listAnimatable listAttr listCameras listConnections listDeviceAttachments listHistory '+'listInputDeviceAxes listInputDeviceButtons listInputDevices listMenuAnnotation '+'listNodeTypes listPanelCategories listRelatives listSets listTransforms '+'listUnselected listerEditor loadFluid loadNewShelf loadPlugin '+'loadPluginLanguageResources loadPrefObjects localizedPanelLabel lockNode loft log '+'longNameOf lookThru ls lsThroughFilter lsType lsUI Mayatomr mag makeIdentity makeLive '+'makePaintable makeRoll makeSingleSurface makeTubeOn makebot manipMoveContext '+'manipMoveLimitsCtx manipOptions manipRotateContext manipRotateLimitsCtx '+'manipScaleContext manipScaleLimitsCtx marker match max memory menu menuBarLayout '+'menuEditor menuItem menuItemToShelf menuSet menuSetPref messageLine min minimizeApp '+'mirrorJoint modelCurrentTimeCtx modelEditor modelPanel mouse movIn movOut move '+'moveIKtoFK moveKeyCtx moveVertexAlongDirection multiProfileBirailSurface mute '+'nParticle nameCommand nameField namespace namespaceInfo newPanelItems newton nodeCast '+'nodeIconButton nodeOutliner nodePreset nodeType noise nonLinear normalConstraint '+'normalize nurbsBoolean nurbsCopyUVSet nurbsCube nurbsEditUV nurbsPlane nurbsSelect '+'nurbsSquare nurbsToPoly nurbsToPolygonsPref nurbsToSubdiv nurbsToSubdivPref '+'nurbsUVSet nurbsViewDirectionVector objExists objectCenter objectLayer objectType '+'objectTypeUI obsoleteProc oceanNurbsPreviewPlane offsetCurve offsetCurveOnSurface '+'offsetSurface openGLExtension openMayaPref optionMenu optionMenuGrp optionVar orbit '+'orbitCtx orientConstraint outlinerEditor outlinerPanel overrideModifier '+'paintEffectsDisplay pairBlend palettePort paneLayout panel panelConfiguration '+'panelHistory paramDimContext paramDimension paramLocator parent parentConstraint '+'particle particleExists particleInstancer particleRenderInfo partition pasteKey '+'pathAnimation pause pclose percent performanceOptions pfxstrokes pickWalk picture '+'pixelMove planarSrf plane play playbackOptions playblast plugAttr plugNode pluginInfo '+'pluginResourceUtil pointConstraint pointCurveConstraint pointLight pointMatrixMult '+'pointOnCurve pointOnSurface pointPosition poleVectorConstraint polyAppend '+'polyAppendFacetCtx polyAppendVertex polyAutoProjection polyAverageNormal '+'polyAverageVertex polyBevel polyBlendColor polyBlindData polyBoolOp polyBridgeEdge '+'polyCacheMonitor polyCheck polyChipOff polyClipboard polyCloseBorder polyCollapseEdge '+'polyCollapseFacet polyColorBlindData polyColorDel polyColorPerVertex polyColorSet '+'polyCompare polyCone polyCopyUV polyCrease polyCreaseCtx polyCreateFacet '+'polyCreateFacetCtx polyCube polyCut polyCutCtx polyCylinder polyCylindricalProjection '+'polyDelEdge polyDelFacet polyDelVertex polyDuplicateAndConnect polyDuplicateEdge '+'polyEditUV polyEditUVShell polyEvaluate polyExtrudeEdge polyExtrudeFacet '+'polyExtrudeVertex polyFlipEdge polyFlipUV polyForceUV polyGeoSampler polyHelix '+'polyInfo polyInstallAction polyLayoutUV polyListComponentConversion polyMapCut '+'polyMapDel polyMapSew polyMapSewMove polyMergeEdge polyMergeEdgeCtx polyMergeFacet '+'polyMergeFacetCtx polyMergeUV polyMergeVertex polyMirrorFace polyMoveEdge '+'polyMoveFacet polyMoveFacetUV polyMoveUV polyMoveVertex polyNormal polyNormalPerVertex '+'polyNormalizeUV polyOptUvs polyOptions polyOutput polyPipe polyPlanarProjection '+'polyPlane polyPlatonicSolid polyPoke polyPrimitive polyPrism polyProjection '+'polyPyramid polyQuad polyQueryBlindData polyReduce polySelect polySelectConstraint '+'polySelectConstraintMonitor polySelectCtx polySelectEditCtx polySeparate '+'polySetToFaceNormal polySewEdge polyShortestPathCtx polySmooth polySoftEdge '+'polySphere polySphericalProjection polySplit polySplitCtx polySplitEdge polySplitRing '+'polySplitVertex polyStraightenUVBorder polySubdivideEdge polySubdivideFacet '+'polyToSubdiv polyTorus polyTransfer polyTriangulate polyUVSet polyUnite polyWedgeFace '+'popen popupMenu pose pow preloadRefEd print progressBar progressWindow projFileViewer '+'projectCurve projectTangent projectionContext projectionManip promptDialog propModCtx '+'propMove psdChannelOutliner psdEditTextureFile psdExport psdTextureFile putenv pwd '+'python querySubdiv quit rad_to_deg radial radioButton radioButtonGrp radioCollection '+'radioMenuItemCollection rampColorPort rand randomizeFollicles randstate rangeControl '+'readTake rebuildCurve rebuildSurface recordAttr recordDevice redo reference '+'referenceEdit referenceQuery refineSubdivSelectionList refresh refreshAE '+'registerPluginResource rehash reloadImage removeJoint removeMultiInstance '+'removePanelCategory rename renameAttr renameSelectionList renameUI render '+'renderGlobalsNode renderInfo renderLayerButton renderLayerParent '+'renderLayerPostProcess renderLayerUnparent renderManip renderPartition '+'renderQualityNode renderSettings renderThumbnailUpdate renderWindowEditor '+'renderWindowSelectContext renderer reorder reorderDeformers requires reroot '+'resampleFluid resetAE resetPfxToPolyCamera resetTool resolutionNode retarget '+'reverseCurve reverseSurface revolve rgb_to_hsv rigidBody rigidSolver roll rollCtx '+'rootOf rot rotate rotationInterpolation roundConstantRadius rowColumnLayout rowLayout '+'runTimeCommand runup sampleImage saveAllShelves saveAttrPreset saveFluid saveImage '+'saveInitialState saveMenu savePrefObjects savePrefs saveShelf saveToolSettings scale '+'scaleBrushBrightness scaleComponents scaleConstraint scaleKey scaleKeyCtx sceneEditor '+'sceneUIReplacement scmh scriptCtx scriptEditorInfo scriptJob scriptNode scriptTable '+'scriptToShelf scriptedPanel scriptedPanelType scrollField scrollLayout sculpt '+'searchPathArray seed selLoadSettings select selectContext selectCurveCV selectKey '+'selectKeyCtx selectKeyframeRegionCtx selectMode selectPref selectPriority selectType '+'selectedNodes selectionConnection separator setAttr setAttrEnumResource '+'setAttrMapping setAttrNiceNameResource setConstraintRestPosition '+'setDefaultShadingGroup setDrivenKeyframe setDynamic setEditCtx setEditor setFluidAttr '+'setFocus setInfinity setInputDeviceMapping setKeyCtx setKeyPath setKeyframe '+'setKeyframeBlendshapeTargetWts setMenuMode setNodeNiceNameResource setNodeTypeFlag '+'setParent setParticleAttr setPfxToPolyCamera setPluginResource setProject '+'setStampDensity setStartupMessage setState setToolTo setUITemplate setXformManip sets '+'shadingConnection shadingGeometryRelCtx shadingLightRelCtx shadingNetworkCompare '+'shadingNode shapeCompare shelfButton shelfLayout shelfTabLayout shellField '+'shortNameOf showHelp showHidden showManipCtx showSelectionInTitle '+'showShadingGroupAttrEditor showWindow sign simplify sin singleProfileBirailSurface '+'size sizeBytes skinCluster skinPercent smoothCurve smoothTangentSurface smoothstep '+'snap2to2 snapKey snapMode snapTogetherCtx snapshot soft softMod softModCtx sort sound '+'soundControl source spaceLocator sphere sphrand spotLight spotLightPreviewPort '+'spreadSheetEditor spring sqrt squareSurface srtContext stackTrace startString '+'startsWith stitchAndExplodeShell stitchSurface stitchSurfacePoints strcmp '+'stringArrayCatenate stringArrayContains stringArrayCount stringArrayInsertAtIndex '+'stringArrayIntersector stringArrayRemove stringArrayRemoveAtIndex '+'stringArrayRemoveDuplicates stringArrayRemoveExact stringArrayToString '+'stringToStringArray strip stripPrefixFromName stroke subdAutoProjection '+'subdCleanTopology subdCollapse subdDuplicateAndConnect subdEditUV '+'subdListComponentConversion subdMapCut subdMapSewMove subdMatchTopology subdMirror '+'subdToBlind subdToPoly subdTransferUVsToCache subdiv subdivCrease '+'subdivDisplaySmoothness substitute substituteAllString substituteGeometry substring '+'surface surfaceSampler surfaceShaderList swatchDisplayPort switchTable symbolButton '+'symbolCheckBox sysFile system tabLayout tan tangentConstraint texLatticeDeformContext '+'texManipContext texMoveContext texMoveUVShellContext texRotateContext texScaleContext '+'texSelectContext texSelectShortestPathCtx texSmudgeUVContext texWinToolCtx text '+'textCurves textField textFieldButtonGrp textFieldGrp textManip textScrollList '+'textToShelf textureDisplacePlane textureHairColor texturePlacementContext '+'textureWindow threadCount threePointArcCtx timeControl timePort timerX toNativePath '+'toggle toggleAxis toggleWindowVisibility tokenize tokenizeList tolerance tolower '+'toolButton toolCollection toolDropped toolHasOptions toolPropertyWindow torus toupper '+'trace track trackCtx transferAttributes transformCompare transformLimits translator '+'trim trunc truncateFluidCache truncateHairCache tumble tumbleCtx turbulence '+'twoPointArcCtx uiRes uiTemplate unassignInputDevice undo undoInfo ungroup uniform unit '+'unloadPlugin untangleUV untitledFileName untrim upAxis updateAE userCtx uvLink '+'uvSnapshot validateShelfName vectorize view2dToolCtx viewCamera viewClipPlane '+'viewFit viewHeadOn viewLookAt viewManip viewPlace viewSet visor volumeAxis vortex '+'waitCursor warning webBrowser webBrowserPrefs whatIs window windowPref wire '+'wireContext workspace wrinkle wrinkleContext writeTake xbmLangPathList xform',illegal:'</',contains:[hljs.C_NUMBER_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{className:'string',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE]},{// eats variables
begin:'[\\$\\%\\@](\\^\\w\\b|#\\w+|[^\\s\\w{]|{\\w+}|\\w+)'},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};});hljs.registerLanguage('mercury',function(hljs){var KEYWORDS={keyword:'module use_module import_module include_module end_module initialise '+'mutable initialize finalize finalise interface implementation pred '+'mode func type inst solver any_pred any_func is semidet det nondet '+'multi erroneous failure cc_nondet cc_multi typeclass instance where '+'pragma promise external trace atomic or_else require_complete_switch '+'require_det require_semidet require_multi require_nondet '+'require_cc_multi require_cc_nondet require_erroneous require_failure',meta:// pragma
'inline no_inline type_spec source_file fact_table obsolete memo '+'loop_check minimal_model terminates does_not_terminate '+'check_termination promise_equivalent_clauses '+// preprocessor
'foreign_proc foreign_decl foreign_code foreign_type '+'foreign_import_module foreign_export_enum foreign_export '+'foreign_enum may_call_mercury will_not_call_mercury thread_safe '+'not_thread_safe maybe_thread_safe promise_pure promise_semipure '+'tabled_for_io local untrailed trailed attach_to_io_state '+'can_pass_as_mercury_type stable will_not_throw_exception '+'may_modify_trail will_not_modify_trail may_duplicate '+'may_not_duplicate affects_liveness does_not_affect_liveness '+'doesnt_affect_liveness no_sharing unknown_sharing sharing',built_in:'some all not if then else true fail false try catch catch_any '+'semidet_true semidet_false semidet_fail impure_true impure semipure'};var COMMENT=hljs.COMMENT('%','$');var NUMCODE={className:'number',begin:"0'.\\|0[box][0-9a-fA-F]*"};var ATOM=hljs.inherit(hljs.APOS_STRING_MODE,{relevance:0});var STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{relevance:0});var STRING_FMT={className:'subst',begin:'\\\\[abfnrtv]\\|\\\\x[0-9a-fA-F]*\\\\\\|%[-+# *.0-9]*[dioxXucsfeEgGp]',relevance:0};STRING.contains.push(STRING_FMT);var IMPLICATION={className:'built_in',variants:[{begin:'<=>'},{begin:'<=',relevance:0},{begin:'=>',relevance:0},{begin:'/\\\\'},{begin:'\\\\/'}]};var HEAD_BODY_CONJUNCTION={className:'built_in',variants:[{begin:':-\\|-->'},{begin:'=',relevance:0}]};return{aliases:['m','moo'],keywords:KEYWORDS,contains:[IMPLICATION,HEAD_BODY_CONJUNCTION,COMMENT,hljs.C_BLOCK_COMMENT_MODE,NUMCODE,hljs.NUMBER_MODE,ATOM,STRING,{begin:/:-/// relevance booster
}]};});hljs.registerLanguage('mipsasm',function(hljs){//local labels: %?[FB]?[AT]?\d{1,2}\w+
return{case_insensitive:true,aliases:['mips'],lexemes:'\\.?'+hljs.IDENT_RE,keywords:{meta://GNU preprocs
'.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .ltorg ',built_in:'$0 $1 $2 $3 $4 $5 $6 $7 $8 $9 $10 $11 $12 $13 $14 $15 '+// integer registers
'$16 $17 $18 $19 $20 $21 $22 $23 $24 $25 $26 $27 $28 $29 $30 $31 '+// integer registers
'zero at v0 v1 a0 a1 a2 a3 a4 a5 a6 a7 '+// integer register aliases
't0 t1 t2 t3 t4 t5 t6 t7 t8 t9 s0 s1 s2 s3 s4 s5 s6 s7 s8 '+// integer register aliases
'k0 k1 gp sp fp ra '+// integer register aliases
'$f0 $f1 $f2 $f2 $f4 $f5 $f6 $f7 $f8 $f9 $f10 $f11 $f12 $f13 $f14 $f15 '+// floating-point registers
'$f16 $f17 $f18 $f19 $f20 $f21 $f22 $f23 $f24 $f25 $f26 $f27 $f28 $f29 $f30 $f31 '+// floating-point registers
'Context Random EntryLo0 EntryLo1 Context PageMask Wired EntryHi '+// Coprocessor 0 registers
'HWREna BadVAddr Count Compare SR IntCtl SRSCtl SRSMap Cause EPC PRId '+// Coprocessor 0 registers
'EBase Config Config1 Config2 Config3 LLAddr Debug DEPC DESAVE CacheErr '+// Coprocessor 0 registers
'ECC ErrorEPC TagLo DataLo TagHi DataHi WatchLo WatchHi PerfCtl PerfCnt '// Coprocessor 0 registers
},contains:[{className:'keyword',begin:'\\b('+//mnemonics
// 32-bit integer instructions
'addi?u?|andi?|b(al)?|beql?|bgez(al)?l?|bgtzl?|blezl?|bltz(al)?l?|'+'bnel?|cl[oz]|divu?|ext|ins|j(al)?|jalr(\.hb)?|jr(\.hb)?|lbu?|lhu?|'+'ll|lui|lw[lr]?|maddu?|mfhi|mflo|movn|movz|move|msubu?|mthi|mtlo|mul|'+'multu?|nop|nor|ori?|rotrv?|sb|sc|se[bh]|sh|sllv?|slti?u?|srav?|'+'srlv?|subu?|sw[lr]?|xori?|wsbh|'+// floating-point instructions
'abs\.[sd]|add\.[sd]|alnv.ps|bc1[ft]l?|'+'c\.(s?f|un|u?eq|[ou]lt|[ou]le|ngle?|seq|l[et]|ng[et])\.[sd]|'+'(ceil|floor|round|trunc)\.[lw]\.[sd]|cfc1|cvt\.d\.[lsw]|'+'cvt\.l\.[dsw]|cvt\.ps\.s|cvt\.s\.[dlw]|cvt\.s\.p[lu]|cvt\.w\.[dls]|'+'div\.[ds]|ldx?c1|luxc1|lwx?c1|madd\.[sd]|mfc1|mov[fntz]?\.[ds]|'+'msub\.[sd]|mth?c1|mul\.[ds]|neg\.[ds]|nmadd\.[ds]|nmsub\.[ds]|'+'p[lu][lu]\.ps|recip\.fmt|r?sqrt\.[ds]|sdx?c1|sub\.[ds]|suxc1|'+'swx?c1|'+// system control instructions
'break|cache|d?eret|[de]i|ehb|mfc0|mtc0|pause|prefx?|rdhwr|'+'rdpgpr|sdbbp|ssnop|synci?|syscall|teqi?|tgei?u?|tlb(p|r|w[ir])|'+'tlti?u?|tnei?|wait|wrpgpr'+')',end:'\\s'},hljs.COMMENT('[;#]','$'),hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,{className:'string',begin:'\'',end:'[^\\\\]\'',relevance:0},{className:'title',begin:'\\|',end:'\\|',illegal:'\\n',relevance:0},{className:'number',variants:[{begin:'0x[0-9a-f]+'},//hex
{begin:'\\b-?\\d+'//bare number
}],relevance:0},{className:'symbol',variants:[{begin:'^\\s*[a-z_\\.\\$][a-z0-9_\\.\\$]+:'},//GNU MIPS syntax
{begin:'^\\s*[0-9]+:'},// numbered local labels
{begin:'[0-9]+[bf]'// number local label reference (backwards, forwards)
}],relevance:0}],illegal:'\/'};});hljs.registerLanguage('mizar',function(hljs){return{keywords:'environ vocabularies notations constructors definitions '+'registrations theorems schemes requirements begin end definition '+'registration cluster existence pred func defpred deffunc theorem '+'proof let take assume then thus hence ex for st holds consider '+'reconsider such that and in provided of as from be being by means '+'equals implies iff redefine define now not or attr is mode '+'suppose per cases set thesis contradiction scheme reserve struct '+'correctness compatibility coherence symmetry assymetry '+'reflexivity irreflexivity connectedness uniqueness commutativity '+'idempotence involutiveness projectivity',contains:[hljs.COMMENT('::','$')]};});hljs.registerLanguage('perl',function(hljs){var PERL_KEYWORDS='getpwent getservent quotemeta msgrcv scalar kill dbmclose undef lc '+'ma syswrite tr send umask sysopen shmwrite vec qx utime local oct semctl localtime '+'readpipe do return format read sprintf dbmopen pop getpgrp not getpwnam rewinddir qq'+'fileno qw endprotoent wait sethostent bless s|0 opendir continue each sleep endgrent '+'shutdown dump chomp connect getsockname die socketpair close flock exists index shmget'+'sub for endpwent redo lstat msgctl setpgrp abs exit select print ref gethostbyaddr '+'unshift fcntl syscall goto getnetbyaddr join gmtime symlink semget splice x|0 '+'getpeername recv log setsockopt cos last reverse gethostbyname getgrnam study formline '+'endhostent times chop length gethostent getnetent pack getprotoent getservbyname rand '+'mkdir pos chmod y|0 substr endnetent printf next open msgsnd readdir use unlink '+'getsockopt getpriority rindex wantarray hex system getservbyport endservent int chr '+'untie rmdir prototype tell listen fork shmread ucfirst setprotoent else sysseek link '+'getgrgid shmctl waitpid unpack getnetbyname reset chdir grep split require caller '+'lcfirst until warn while values shift telldir getpwuid my getprotobynumber delete and '+'sort uc defined srand accept package seekdir getprotobyname semop our rename seek if q|0 '+'chroot sysread setpwent no crypt getc chown sqrt write setnetent setpriority foreach '+'tie sin msgget map stat getlogin unless elsif truncate exec keys glob tied closedir'+'ioctl socket readlink eval xor readline binmode setservent eof ord bind alarm pipe '+'atan2 getgrent exp time push setgrent gt lt or ne m|0 break given say state when';var SUBST={className:'subst',begin:'[$@]\\{',end:'\\}',keywords:PERL_KEYWORDS};var METHOD={begin:'->{',end:'}'// contains defined later
};var VAR={variants:[{begin:/\$\d/},{begin:/[\$%@](\^\w\b|#\w+(::\w+)*|{\w+}|\w+(::\w*)*)/},{begin:/[\$%@][^\s\w{]/,relevance:0}]};var STRING_CONTAINS=[hljs.BACKSLASH_ESCAPE,SUBST,VAR];var PERL_DEFAULT_CONTAINS=[VAR,hljs.HASH_COMMENT_MODE,hljs.COMMENT('^\\=\\w','\\=cut',{endsWithParent:true}),METHOD,{className:'string',contains:STRING_CONTAINS,variants:[{begin:'q[qwxr]?\\s*\\(',end:'\\)',relevance:5},{begin:'q[qwxr]?\\s*\\[',end:'\\]',relevance:5},{begin:'q[qwxr]?\\s*\\{',end:'\\}',relevance:5},{begin:'q[qwxr]?\\s*\\|',end:'\\|',relevance:5},{begin:'q[qwxr]?\\s*\\<',end:'\\>',relevance:5},{begin:'qw\\s+q',end:'q',relevance:5},{begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'"',end:'"'},{begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'{\\w+}',contains:[],relevance:0},{begin:'\-?\\w+\\s*\\=\\>',contains:[],relevance:0}]},{className:'number',begin:'(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',relevance:0},{// regexp container
begin:'(\\/\\/|'+hljs.RE_STARTERS_RE+'|\\b(split|return|print|reverse|grep)\\b)\\s*',keywords:'split return print reverse grep',relevance:0,contains:[hljs.HASH_COMMENT_MODE,{className:'regexp',begin:'(s|tr|y)/(\\\\.|[^/])*/(\\\\.|[^/])*/[a-z]*',relevance:10},{className:'regexp',begin:'(m|qr)?/',end:'/[a-z]*',contains:[hljs.BACKSLASH_ESCAPE],relevance:0// allows empty "//" which is a common comment delimiter in other languages
}]},{className:'function',beginKeywords:'sub',end:'(\\s*\\(.*?\\))?[;{]',excludeEnd:true,relevance:5,contains:[hljs.TITLE_MODE]},{begin:'-\\w\\b',relevance:0},{begin:"^__DATA__$",end:"^__END__$",subLanguage:'mojolicious',contains:[{begin:"^@@.*",end:"$",className:"comment"}]}];SUBST.contains=PERL_DEFAULT_CONTAINS;METHOD.contains=PERL_DEFAULT_CONTAINS;return{aliases:['pl','pm'],lexemes:/[\w\.]+/,keywords:PERL_KEYWORDS,contains:PERL_DEFAULT_CONTAINS};});hljs.registerLanguage('mojolicious',function(hljs){return{subLanguage:'xml',contains:[{className:'meta',begin:'^__(END|DATA)__$'},// mojolicious line
{begin:"^\\s*%{1,2}={0,2}",end:'$',subLanguage:'perl'},// mojolicious block
{begin:"<%{1,2}={0,2}",end:"={0,1}%>",subLanguage:'perl',excludeBegin:true,excludeEnd:true}]};});hljs.registerLanguage('monkey',function(hljs){var NUMBER={className:'number',relevance:0,variants:[{begin:'[$][a-fA-F0-9]+'},hljs.NUMBER_MODE]};return{case_insensitive:true,keywords:{keyword:'public private property continue exit extern new try catch '+'eachin not abstract final select case default const local global field '+'end if then else elseif endif while wend repeat until forever for '+'to step next return module inline throw import',built_in:'DebugLog DebugStop Error Print ACos ACosr ASin ASinr ATan ATan2 ATan2r ATanr Abs Abs Ceil '+'Clamp Clamp Cos Cosr Exp Floor Log Max Max Min Min Pow Sgn Sgn Sin Sinr Sqrt Tan Tanr Seed PI HALFPI TWOPI',literal:'true false null and or shl shr mod'},illegal:/\/\*/,contains:[hljs.COMMENT('#rem','#end'),hljs.COMMENT("'",'$',{relevance:0}),{className:'function',beginKeywords:'function method',end:'[(=:]|$',illegal:/\n/,contains:[hljs.UNDERSCORE_TITLE_MODE]},{className:'class',beginKeywords:'class interface',end:'$',contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},{className:'built_in',begin:'\\b(self|super)\\b'},{className:'meta',begin:'\\s*#',end:'$',keywords:{'meta-keyword':'if else elseif endif end then'}},{className:'meta',begin:'^\\s*strict\\b'},{beginKeywords:'alias',end:'=',contains:[hljs.UNDERSCORE_TITLE_MODE]},hljs.QUOTE_STRING_MODE,NUMBER]};});hljs.registerLanguage('moonscript',function(hljs){var KEYWORDS={keyword:// Moonscript keywords
'if then not for in while do return else elseif break continue switch and or '+'unless when class extends super local import export from using',literal:'true false nil',built_in:'_G _VERSION assert collectgarbage dofile error getfenv getmetatable ipairs load '+'loadfile loadstring module next pairs pcall print rawequal rawget rawset require '+'select setfenv setmetatable tonumber tostring type unpack xpcall coroutine debug '+'io math os package string table'};var JS_IDENT_RE='[A-Za-z$_][0-9A-Za-z$_]*';var SUBST={className:'subst',begin:/#\{/,end:/}/,keywords:KEYWORDS};var EXPRESSIONS=[hljs.inherit(hljs.C_NUMBER_MODE,{starts:{end:'(\\s*/)?',relevance:0}}),// a number tries to eat the following slash to prevent treating it as a regexp
{className:'string',variants:[{begin:/'/,end:/'/,contains:[hljs.BACKSLASH_ESCAPE]},{begin:/"/,end:/"/,contains:[hljs.BACKSLASH_ESCAPE,SUBST]}]},{className:'built_in',begin:'@__'+hljs.IDENT_RE},{begin:'@'+hljs.IDENT_RE// relevance booster on par with CoffeeScript
},{begin:hljs.IDENT_RE+'\\\\'+hljs.IDENT_RE// inst\method
}];SUBST.contains=EXPRESSIONS;var TITLE=hljs.inherit(hljs.TITLE_MODE,{begin:JS_IDENT_RE});var PARAMS_RE='(\\(.*\\))?\\s*\\B[-=]>';var PARAMS={className:'params',begin:'\\([^\\(]',returnBegin:true,/* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */contains:[{begin:/\(/,end:/\)/,keywords:KEYWORDS,contains:['self'].concat(EXPRESSIONS)}]};return{aliases:['moon'],keywords:KEYWORDS,illegal:/\/\*/,contains:EXPRESSIONS.concat([hljs.COMMENT('--','$'),{className:'function',// function: -> =>
begin:'^\\s*'+JS_IDENT_RE+'\\s*=\\s*'+PARAMS_RE,end:'[-=]>',returnBegin:true,contains:[TITLE,PARAMS]},{begin:/[\(,:=]\s*/,// anonymous function start
relevance:0,contains:[{className:'function',begin:PARAMS_RE,end:'[-=]>',returnBegin:true,contains:[PARAMS]}]},{className:'class',beginKeywords:'class',end:'$',illegal:/[:="\[\]]/,contains:[{beginKeywords:'extends',endsWithParent:true,illegal:/[:="\[\]]/,contains:[TITLE]},TITLE]},{className:'name',// table
begin:JS_IDENT_RE+':',end:':',returnBegin:true,returnEnd:true,relevance:0}])};});hljs.registerLanguage('n1ql',function(hljs){return{case_insensitive:true,contains:[{beginKeywords:'build create index delete drop explain infer|10 insert merge prepare select update upsert|10',end:/;/,endsWithParent:true,keywords:{// Taken from http://developer.couchbase.com/documentation/server/current/n1ql/n1ql-language-reference/reservedwords.html
keyword:'all alter analyze and any array as asc begin between binary boolean break bucket build by call '+'case cast cluster collate collection commit connect continue correlate cover create database '+'dataset datastore declare decrement delete derived desc describe distinct do drop each element '+'else end every except exclude execute exists explain fetch first flatten for force from '+'function grant group gsi having if ignore ilike in include increment index infer inline inner '+'insert intersect into is join key keys keyspace known last left let letting like limit lsm map '+'mapping matched materialized merge minus namespace nest not number object offset on '+'option or order outer over parse partition password path pool prepare primary private privilege '+'procedure public raw realm reduce rename return returning revoke right role rollback satisfies '+'schema select self semi set show some start statistics string system then to transaction trigger '+'truncate under union unique unknown unnest unset update upsert use user using validate value '+'valued values via view when where while with within work xor',// Taken from http://developer.couchbase.com/documentation/server/4.5/n1ql/n1ql-language-reference/literals.html
literal:'true false null missing|5',// Taken from http://developer.couchbase.com/documentation/server/4.5/n1ql/n1ql-language-reference/functions.html
built_in:'array_agg array_append array_concat array_contains array_count array_distinct array_ifnull array_length '+'array_max array_min array_position array_prepend array_put array_range array_remove array_repeat array_replace '+'array_reverse array_sort array_sum avg count max min sum greatest least ifmissing ifmissingornull ifnull '+'missingif nullif ifinf ifnan ifnanorinf naninf neginfif posinfif clock_millis clock_str date_add_millis '+'date_add_str date_diff_millis date_diff_str date_part_millis date_part_str date_trunc_millis date_trunc_str '+'duration_to_str millis str_to_millis millis_to_str millis_to_utc millis_to_zone_name now_millis now_str '+'str_to_duration str_to_utc str_to_zone_name decode_json encode_json encoded_size poly_length base64 base64_encode '+'base64_decode meta uuid abs acos asin atan atan2 ceil cos degrees e exp ln log floor pi power radians random '+'round sign sin sqrt tan trunc object_length object_names object_pairs object_inner_pairs object_values '+'object_inner_values object_add object_put object_remove object_unwrap regexp_contains regexp_like regexp_position '+'regexp_replace contains initcap length lower ltrim position repeat replace rtrim split substr title trim upper '+'isarray isatom isboolean isnumber isobject isstring type toarray toatom toboolean tonumber toobject tostring'},contains:[{className:'string',begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE],relevance:0},{className:'string',begin:'"',end:'"',contains:[hljs.BACKSLASH_ESCAPE],relevance:0},{className:'symbol',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE],relevance:2},hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE]},hljs.C_BLOCK_COMMENT_MODE]};});hljs.registerLanguage('nginx',function(hljs){var VAR={className:'variable',variants:[{begin:/\$\d+/},{begin:/\$\{/,end:/}/},{begin:'[\\$\\@]'+hljs.UNDERSCORE_IDENT_RE}]};var DEFAULT={endsWithParent:true,lexemes:'[a-z/_]+',keywords:{literal:'on off yes no true false none blocked debug info notice warn error crit '+'select break last permanent redirect kqueue rtsig epoll poll /dev/poll'},relevance:0,illegal:'=>',contains:[hljs.HASH_COMMENT_MODE,{className:'string',contains:[hljs.BACKSLASH_ESCAPE,VAR],variants:[{begin:/"/,end:/"/},{begin:/'/,end:/'/}]},// this swallows entire URLs to avoid detecting numbers within
{begin:'([a-z]+):/',end:'\\s',endsWithParent:true,excludeEnd:true,contains:[VAR]},{className:'regexp',contains:[hljs.BACKSLASH_ESCAPE,VAR],variants:[{begin:"\\s\\^",end:"\\s|{|;",returnEnd:true},// regexp locations (~, ~*)
{begin:"~\\*?\\s+",end:"\\s|{|;",returnEnd:true},// *.example.com
{begin:"\\*(\\.[a-z\\-]+)+"},// sub.example.*
{begin:"([a-z\\-]+\\.)+\\*"}]},// IP
{className:'number',begin:'\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b'},// units
{className:'number',begin:'\\b\\d+[kKmMgGdshdwy]*\\b',relevance:0},VAR]};return{aliases:['nginxconf'],contains:[hljs.HASH_COMMENT_MODE,{begin:hljs.UNDERSCORE_IDENT_RE+'\\s+{',returnBegin:true,end:'{',contains:[{className:'section',begin:hljs.UNDERSCORE_IDENT_RE}],relevance:0},{begin:hljs.UNDERSCORE_IDENT_RE+'\\s',end:';|{',returnBegin:true,contains:[{className:'attribute',begin:hljs.UNDERSCORE_IDENT_RE,starts:DEFAULT}],relevance:0}],illegal:'[^\\s\\}]'};});hljs.registerLanguage('nimrod',function(hljs){return{aliases:['nim'],keywords:{keyword:'addr and as asm bind block break case cast const continue converter '+'discard distinct div do elif else end enum except export finally '+'for from generic if import in include interface is isnot iterator '+'let macro method mixin mod nil not notin object of or out proc ptr '+'raise ref return shl shr static template try tuple type using var '+'when while with without xor yield',literal:'shared guarded stdin stdout stderr result true false',built_in:'int int8 int16 int32 int64 uint uint8 uint16 uint32 uint64 float '+'float32 float64 bool char string cstring pointer expr stmt void '+'auto any range array openarray varargs seq set clong culong cchar '+'cschar cshort cint csize clonglong cfloat cdouble clongdouble '+'cuchar cushort cuint culonglong cstringarray semistatic'},contains:[{className:'meta',// Actually pragma
begin:/{\./,end:/\.}/,relevance:10},{className:'string',begin:/[a-zA-Z]\w*"/,end:/"/,contains:[{begin:/""/}]},{className:'string',begin:/([a-zA-Z]\w*)?"""/,end:/"""/},hljs.QUOTE_STRING_MODE,{className:'type',begin:/\b[A-Z]\w+\b/,relevance:0},{className:'number',relevance:0,variants:[{begin:/\b(0[xX][0-9a-fA-F][_0-9a-fA-F]*)('?[iIuU](8|16|32|64))?/},{begin:/\b(0o[0-7][_0-7]*)('?[iIuUfF](8|16|32|64))?/},{begin:/\b(0(b|B)[01][_01]*)('?[iIuUfF](8|16|32|64))?/},{begin:/\b(\d[_\d]*)('?[iIuUfF](8|16|32|64))?/}]},hljs.HASH_COMMENT_MODE]};});hljs.registerLanguage('nix',function(hljs){var NIX_KEYWORDS={keyword:'rec with let in inherit assert if else then',literal:'true false or and null',built_in:'import abort baseNameOf dirOf isNull builtins map removeAttrs throw '+'toString derivation'};var ANTIQUOTE={className:'subst',begin:/\$\{/,end:/}/,keywords:NIX_KEYWORDS};var ATTRS={begin:/[a-zA-Z0-9-_]+(\s*=)/,returnBegin:true,relevance:0,contains:[{className:'attr',begin:/\S+/}]};var STRING={className:'string',contains:[ANTIQUOTE],variants:[{begin:"''",end:"''"},{begin:'"',end:'"'}]};var EXPRESSIONS=[hljs.NUMBER_MODE,hljs.HASH_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,STRING,ATTRS];ANTIQUOTE.contains=EXPRESSIONS;return{aliases:["nixos"],keywords:NIX_KEYWORDS,contains:EXPRESSIONS};});hljs.registerLanguage('nsis',function(hljs){var CONSTANTS={className:'variable',begin:/\$(ADMINTOOLS|APPDATA|CDBURN_AREA|CMDLINE|COMMONFILES32|COMMONFILES64|COMMONFILES|COOKIES|DESKTOP|DOCUMENTS|EXEDIR|EXEFILE|EXEPATH|FAVORITES|FONTS|HISTORY|HWNDPARENT|INSTDIR|INTERNET_CACHE|LANGUAGE|LOCALAPPDATA|MUSIC|NETHOOD|OUTDIR|PICTURES|PLUGINSDIR|PRINTHOOD|PROFILE|PROGRAMFILES32|PROGRAMFILES64|PROGRAMFILES|QUICKLAUNCH|RECENT|RESOURCES_LOCALIZED|RESOURCES|SENDTO|SMPROGRAMS|SMSTARTUP|STARTMENU|SYSDIR|TEMP|TEMPLATES|VIDEOS|WINDIR)/};var DEFINES={// ${defines}
className:'variable',begin:/\$+{[\w\.:-]+}/};var VARIABLES={// $variables
className:'variable',begin:/\$+\w+/,illegal:/\(\){}/};var LANGUAGES={// $(language_strings)
className:'variable',begin:/\$+\([\w\^\.:-]+\)/};var PARAMETERS={// command parameters
className:'params',begin:'(ARCHIVE|FILE_ATTRIBUTE_ARCHIVE|FILE_ATTRIBUTE_NORMAL|FILE_ATTRIBUTE_OFFLINE|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM|FILE_ATTRIBUTE_TEMPORARY|HKCR|HKCU|HKDD|HKEY_CLASSES_ROOT|HKEY_CURRENT_CONFIG|HKEY_CURRENT_USER|HKEY_DYN_DATA|HKEY_LOCAL_MACHINE|HKEY_PERFORMANCE_DATA|HKEY_USERS|HKLM|HKPD|HKU|IDABORT|IDCANCEL|IDIGNORE|IDNO|IDOK|IDRETRY|IDYES|MB_ABORTRETRYIGNORE|MB_DEFBUTTON1|MB_DEFBUTTON2|MB_DEFBUTTON3|MB_DEFBUTTON4|MB_ICONEXCLAMATION|MB_ICONINFORMATION|MB_ICONQUESTION|MB_ICONSTOP|MB_OK|MB_OKCANCEL|MB_RETRYCANCEL|MB_RIGHT|MB_RTLREADING|MB_SETFOREGROUND|MB_TOPMOST|MB_USERICON|MB_YESNO|NORMAL|OFFLINE|READONLY|SHCTX|SHELL_CONTEXT|SYSTEM|TEMPORARY)'};var COMPILER={// !compiler_flags
className:'keyword',begin:/\!(addincludedir|addplugindir|appendfile|cd|define|delfile|echo|else|endif|error|execute|finalize|getdllversionsystem|ifdef|ifmacrodef|ifmacrondef|ifndef|if|include|insertmacro|macroend|macro|makensis|packhdr|searchparse|searchreplace|tempfile|undef|verbose|warning)/};var METACHARS={// $\n, $\r, $\t, $$
className:'subst',begin:/\$(\\[nrt]|\$)/};var PLUGINS={// plug::ins
className:'class',begin:/\w+\:\:\w+/};var STRING={className:'string',variants:[{begin:'"',end:'"'},{begin:'\'',end:'\''},{begin:'`',end:'`'}],illegal:/\n/,contains:[METACHARS,CONSTANTS,DEFINES,VARIABLES,LANGUAGES]};return{case_insensitive:false,keywords:{keyword:'Abort AddBrandingImage AddSize AllowRootDirInstall AllowSkipFiles AutoCloseWindow BGFont BGGradient BrandingText BringToFront Call CallInstDLL Caption ChangeUI CheckBitmap ClearErrors CompletedText ComponentText CopyFiles CRCCheck CreateDirectory CreateFont CreateShortCut Delete DeleteINISec DeleteINIStr DeleteRegKey DeleteRegValue DetailPrint DetailsButtonText DirText DirVar DirVerify EnableWindow EnumRegKey EnumRegValue Exch Exec ExecShell ExecWait ExpandEnvStrings File FileBufSize FileClose FileErrorText FileOpen FileRead FileReadByte FileReadUTF16LE FileReadWord FileSeek FileWrite FileWriteByte FileWriteUTF16LE FileWriteWord FindClose FindFirst FindNext FindWindow FlushINI FunctionEnd GetCurInstType GetCurrentAddress GetDlgItem GetDLLVersion GetDLLVersionLocal GetErrorLevel GetFileTime GetFileTimeLocal GetFullPathName GetFunctionAddress GetInstDirError GetLabelAddress GetTempFileName Goto HideWindow Icon IfAbort IfErrors IfFileExists IfRebootFlag IfSilent InitPluginsDir InstallButtonText InstallColors InstallDir InstallDirRegKey InstProgressFlags InstType InstTypeGetText InstTypeSetText IntCmp IntCmpU IntFmt IntOp IsWindow LangString LicenseBkColor LicenseData LicenseForceSelection LicenseLangString LicenseText LoadLanguageFile LockWindow LogSet LogText ManifestDPIAware ManifestSupportedOS MessageBox MiscButtonText Name Nop OutFile Page PageCallbacks PageExEnd Pop Push Quit ReadEnvStr ReadINIStr ReadRegDWORD ReadRegStr Reboot RegDLL Rename RequestExecutionLevel ReserveFile Return RMDir SearchPath SectionEnd SectionGetFlags SectionGetInstTypes SectionGetSize SectionGetText SectionGroupEnd SectionIn SectionSetFlags SectionSetInstTypes SectionSetSize SectionSetText SendMessage SetAutoClose SetBrandingImage SetCompress SetCompressor SetCompressorDictSize SetCtlColors SetCurInstType SetDatablockOptimize SetDateSave SetDetailsPrint SetDetailsView SetErrorLevel SetErrors SetFileAttributes SetFont SetOutPath SetOverwrite SetRebootFlag SetRegView SetShellVarContext SetSilent ShowInstDetails ShowUninstDetails ShowWindow SilentInstall SilentUnInstall Sleep SpaceTexts StrCmp StrCmpS StrCpy StrLen SubCaption Unicode UninstallButtonText UninstallCaption UninstallIcon UninstallSubCaption UninstallText UninstPage UnRegDLL Var VIAddVersionKey VIFileVersion VIProductVersion WindowIcon WriteINIStr WriteRegBin WriteRegDWORD WriteRegExpandStr WriteRegStr WriteUninstaller XPStyle',literal:'admin all auto both bottom bzip2 colored components current custom directory false force hide highest ifdiff ifnewer instfiles lastused leave left license listonly lzma nevershow none normal notset off on open print right show silent silentlog smooth textonly top true try un.components un.custom un.directory un.instfiles un.license uninstConfirm user Win10 Win7 Win8 WinVista zlib'},contains:[hljs.HASH_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.COMMENT(';','$',{relevance:0}),{className:'function',beginKeywords:'Function PageEx Section SectionGroup',end:'$'},STRING,COMPILER,DEFINES,VARIABLES,LANGUAGES,PARAMETERS,PLUGINS,hljs.NUMBER_MODE]};});hljs.registerLanguage('objectivec',function(hljs){var API_CLASS={className:'built_in',begin:'\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+'};var OBJC_KEYWORDS={keyword:'int float while char export sizeof typedef const struct for union '+'unsigned long volatile static bool mutable if do return goto void '+'enum else break extern asm case short default double register explicit '+'signed typename this switch continue wchar_t inline readonly assign '+'readwrite self @synchronized id typeof '+'nonatomic super unichar IBOutlet IBAction strong weak copy '+'in out inout bycopy byref oneway __strong __weak __block __autoreleasing '+'@private @protected @public @try @property @end @throw @catch @finally '+'@autoreleasepool @synthesize @dynamic @selector @optional @required '+'@encode @package @import @defs @compatibility_alias '+'__bridge __bridge_transfer __bridge_retained __bridge_retain '+'__covariant __contravariant __kindof '+'_Nonnull _Nullable _Null_unspecified '+'__FUNCTION__ __PRETTY_FUNCTION__ __attribute__ '+'getter setter retain unsafe_unretained '+'nonnull nullable null_unspecified null_resettable class instancetype '+'NS_DESIGNATED_INITIALIZER NS_UNAVAILABLE NS_REQUIRES_SUPER '+'NS_RETURNS_INNER_POINTER NS_INLINE NS_AVAILABLE NS_DEPRECATED '+'NS_ENUM NS_OPTIONS NS_SWIFT_UNAVAILABLE '+'NS_ASSUME_NONNULL_BEGIN NS_ASSUME_NONNULL_END '+'NS_REFINED_FOR_SWIFT NS_SWIFT_NAME NS_SWIFT_NOTHROW '+'NS_DURING NS_HANDLER NS_ENDHANDLER NS_VALUERETURN NS_VOIDRETURN',literal:'false true FALSE TRUE nil YES NO NULL',built_in:'BOOL dispatch_once_t dispatch_queue_t dispatch_sync dispatch_async dispatch_once'};var LEXEMES=/[a-zA-Z@][a-zA-Z0-9_]*/;var CLASS_KEYWORDS='@interface @class @protocol @implementation';return{aliases:['mm','objc','obj-c'],keywords:OBJC_KEYWORDS,lexemes:LEXEMES,illegal:'</',contains:[API_CLASS,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.C_NUMBER_MODE,hljs.QUOTE_STRING_MODE,{className:'string',variants:[{begin:'@"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'\'',end:'[^\\\\]\'',illegal:'[^\\\\][^\']'}]},{className:'meta',begin:'#',end:'$',contains:[{className:'meta-string',variants:[{begin:'\"',end:'\"'},{begin:'<',end:'>'}]}]},{className:'class',begin:'('+CLASS_KEYWORDS.split(' ').join('|')+')\\b',end:'({|$)',excludeEnd:true,keywords:CLASS_KEYWORDS,lexemes:LEXEMES,contains:[hljs.UNDERSCORE_TITLE_MODE]},{begin:'\\.'+hljs.UNDERSCORE_IDENT_RE,relevance:0}]};});hljs.registerLanguage('ocaml',function(hljs){/* missing support for heredoc-like string (OCaml 4.0.2+) */return{aliases:['ml'],keywords:{keyword:'and as assert asr begin class constraint do done downto else end '+'exception external for fun function functor if in include '+'inherit! inherit initializer land lazy let lor lsl lsr lxor match method!|10 method '+'mod module mutable new object of open! open or private rec sig struct '+'then to try type val! val virtual when while with '+/* camlp4 */'parser value',built_in:/* built-in types */'array bool bytes char exn|5 float int int32 int64 list lazy_t|5 nativeint|5 string unit '+/* (some) types in Pervasives */'in_channel out_channel ref',literal:'true false'},illegal:/\/\/|>>/,lexemes:'[a-z_]\\w*!?',contains:[{className:'literal',begin:'\\[(\\|\\|)?\\]|\\(\\)',relevance:0},hljs.COMMENT('\\(\\*','\\*\\)',{contains:['self']}),{/* type variable */className:'symbol',begin:'\'[A-Za-z_](?!\')[\\w\']*'/* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */},{/* polymorphic variant */className:'type',begin:'`[A-Z][\\w\']*'},{/* module or constructor */className:'type',begin:'\\b[A-Z][\\w\']*',relevance:0},{/* don't color identifiers, but safely catch all identifiers with '*/begin:'[a-z_]\\w*\'[\\w\']*',relevance:0},hljs.inherit(hljs.APOS_STRING_MODE,{className:'string',relevance:0}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),{className:'number',begin:'\\b(0[xX][a-fA-F0-9_]+[Lln]?|'+'0[oO][0-7_]+[Lln]?|'+'0[bB][01_]+[Lln]?|'+'[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',relevance:0},{begin:/[-=]>/// relevance booster
}]};});hljs.registerLanguage('openscad',function(hljs){var SPECIAL_VARS={className:'keyword',begin:'\\$(f[asn]|t|vp[rtd]|children)'},LITERALS={className:'literal',begin:'false|true|PI|undef'},NUMBERS={className:'number',begin:'\\b\\d+(\\.\\d+)?(e-?\\d+)?',//adds 1e5, 1e-10
relevance:0},STRING=hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),PREPRO={className:'meta',keywords:{'meta-keyword':'include use'},begin:'include|use <',end:'>'},PARAMS={className:'params',begin:'\\(',end:'\\)',contains:['self',NUMBERS,STRING,SPECIAL_VARS,LITERALS]},MODIFIERS={begin:'[*!#%]',relevance:0},FUNCTIONS={className:'function',beginKeywords:'module function',end:'\\=|\\{',contains:[PARAMS,hljs.UNDERSCORE_TITLE_MODE]};return{aliases:['scad'],keywords:{keyword:'function module include use for intersection_for if else \\%',literal:'false true PI undef',built_in:'circle square polygon text sphere cube cylinder polyhedron translate rotate scale resize mirror multmatrix color offset hull minkowski union difference intersection abs sign sin cos tan acos asin atan atan2 floor round ceil ln log pow sqrt exp rands min max concat lookup str chr search version version_num norm cross parent_module echo import import_dxf dxf_linear_extrude linear_extrude rotate_extrude surface projection render children dxf_cross dxf_dim let assign'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,NUMBERS,PREPRO,STRING,SPECIAL_VARS,MODIFIERS,FUNCTIONS]};});hljs.registerLanguage('oxygene',function(hljs){var OXYGENE_KEYWORDS='abstract add and array as asc aspect assembly async begin break block by case class concat const copy constructor continue '+'create default delegate desc distinct div do downto dynamic each else empty end ensure enum equals event except exit extension external false '+'final finalize finalizer finally flags for forward from function future global group has if implementation implements implies in index inherited '+'inline interface into invariants is iterator join locked locking loop matching method mod module namespace nested new nil not notify nullable of '+'old on operator or order out override parallel params partial pinned private procedure property protected public queryable raise read readonly '+'record reintroduce remove repeat require result reverse sealed select self sequence set shl shr skip static step soft take then to true try tuple '+'type union unit unsafe until uses using var virtual raises volatile where while with write xor yield await mapped deprecated stdcall cdecl pascal '+'register safecall overload library platform reference packed strict published autoreleasepool selector strong weak unretained';var CURLY_COMMENT=hljs.COMMENT('{','}',{relevance:0});var PAREN_COMMENT=hljs.COMMENT('\\(\\*','\\*\\)',{relevance:10});var STRING={className:'string',begin:'\'',end:'\'',contains:[{begin:'\'\''}]};var CHAR_STRING={className:'string',begin:'(#\\d+)+'};var FUNCTION={className:'function',beginKeywords:'function constructor destructor procedure method',end:'[:;]',keywords:'function constructor|10 destructor|10 procedure|10 method|10',contains:[hljs.TITLE_MODE,{className:'params',begin:'\\(',end:'\\)',keywords:OXYGENE_KEYWORDS,contains:[STRING,CHAR_STRING]},CURLY_COMMENT,PAREN_COMMENT]};return{case_insensitive:true,lexemes:/\.?\w+/,keywords:OXYGENE_KEYWORDS,illegal:'("|\\$[G-Zg-z]|\\/\\*|</|=>|->)',contains:[CURLY_COMMENT,PAREN_COMMENT,hljs.C_LINE_COMMENT_MODE,STRING,CHAR_STRING,hljs.NUMBER_MODE,FUNCTION,{className:'class',begin:'=\\bclass\\b',end:'end;',keywords:OXYGENE_KEYWORDS,contains:[STRING,CHAR_STRING,CURLY_COMMENT,PAREN_COMMENT,hljs.C_LINE_COMMENT_MODE,FUNCTION]}]};});hljs.registerLanguage('parser3',function(hljs){var CURLY_SUBCOMMENT=hljs.COMMENT('{','}',{contains:['self']});return{subLanguage:'xml',relevance:0,contains:[hljs.COMMENT('^#','$'),hljs.COMMENT('\\^rem{','}',{relevance:10,contains:[CURLY_SUBCOMMENT]}),{className:'meta',begin:'^@(?:BASE|USE|CLASS|OPTIONS)$',relevance:10},{className:'title',begin:'@[\\w\\-]+\\[[\\w^;\\-]*\\](?:\\[[\\w^;\\-]*\\])?(?:.*)$'},{className:'variable',begin:'\\$\\{?[\\w\\-\\.\\:]+\\}?'},{className:'keyword',begin:'\\^[\\w\\-\\.\\:]+'},{className:'number',begin:'\\^#[0-9a-fA-F]+'},hljs.C_NUMBER_MODE]};});hljs.registerLanguage('pf',function(hljs){var MACRO={className:'variable',begin:/\$[\w\d#@][\w\d_]*/};var TABLE={className:'variable',begin:/<(?!\/)/,end:/>/};var QUOTE_STRING={className:'string',begin:/"/,end:/"/};return{aliases:['pf.conf'],lexemes:/[a-z0-9_<>-]+/,keywords:{built_in:/* block match pass are "actions" in pf.conf(5), the rest are
                 * lexically similar top-level commands.
                 */'block match pass load anchor|5 antispoof|10 set table',keyword:'in out log quick on rdomain inet inet6 proto from port os to route'+'allow-opts divert-packet divert-reply divert-to flags group icmp-type'+'icmp6-type label once probability recieved-on rtable prio queue'+'tos tag tagged user keep fragment for os drop'+'af-to|10 binat-to|10 nat-to|10 rdr-to|10 bitmask least-stats random round-robin'+'source-hash static-port'+'dup-to reply-to route-to'+'parent bandwidth default min max qlimit'+'block-policy debug fingerprints hostid limit loginterface optimization'+'reassemble ruleset-optimization basic none profile skip state-defaults'+'state-policy timeout'+'const counters persist'+'no modulate synproxy state|5 floating if-bound no-sync pflow|10 sloppy'+'source-track global rule max-src-nodes max-src-states max-src-conn'+'max-src-conn-rate overload flush'+'scrub|5 max-mss min-ttl no-df|10 random-id',literal:'all any no-route self urpf-failed egress|5 unknown'},contains:[hljs.HASH_COMMENT_MODE,hljs.NUMBER_MODE,hljs.QUOTE_STRING_MODE,MACRO,TABLE]};});hljs.registerLanguage('php',function(hljs){var VARIABLE={begin:'\\$+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*'};var PREPROCESSOR={className:'meta',begin:/<\?(php)?|\?>/};var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,PREPROCESSOR],variants:[{begin:'b"',end:'"'},{begin:'b\'',end:'\''},hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null})]};var NUMBER={variants:[hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE]};return{aliases:['php3','php4','php5','php6'],case_insensitive:true,keywords:'and include_once list abstract global private echo interface as static endswitch '+'array null if endwhile or const for endforeach self var while isset public '+'protected exit foreach throw elseif include __FILE__ empty require_once do xor '+'return parent clone use __CLASS__ __LINE__ else break print eval new '+'catch __METHOD__ case exception default die require __FUNCTION__ '+'enddeclare final try switch continue endfor endif declare unset true false '+'trait goto instanceof insteadof __DIR__ __NAMESPACE__ '+'yield finally',contains:[hljs.HASH_COMMENT_MODE,hljs.COMMENT('//','$',{contains:[PREPROCESSOR]}),hljs.COMMENT('/\\*','\\*/',{contains:[{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.COMMENT('__halt_compiler.+?;',false,{endsWithParent:true,keywords:'__halt_compiler',lexemes:hljs.UNDERSCORE_IDENT_RE}),{className:'string',begin:/<<<['"]?\w+['"]?$/,end:/^\w+;?$/,contains:[hljs.BACKSLASH_ESCAPE,{className:'subst',variants:[{begin:/\$\w+/},{begin:/\{\$/,end:/\}/}]}]},PREPROCESSOR,{className:'keyword',begin:/\$this\b/},VARIABLE,{// swallow composed identifiers to avoid parsing them as keywords
begin:/(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/},{className:'function',beginKeywords:'function',end:/[;{]/,excludeEnd:true,illegal:'\\$|\\[|%',contains:[hljs.UNDERSCORE_TITLE_MODE,{className:'params',begin:'\\(',end:'\\)',contains:['self',VARIABLE,hljs.C_BLOCK_COMMENT_MODE,STRING,NUMBER]}]},{className:'class',beginKeywords:'class interface',end:'{',excludeEnd:true,illegal:/[:\(\$"]/,contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},{beginKeywords:'namespace',end:';',illegal:/[\.']/,contains:[hljs.UNDERSCORE_TITLE_MODE]},{beginKeywords:'use',end:';',contains:[hljs.UNDERSCORE_TITLE_MODE]},{begin:'=>'// No markup, just a relevance booster
},STRING,NUMBER]};});hljs.registerLanguage('pony',function(hljs){var KEYWORDS={keyword:'actor addressof and as be break class compile_error compile_intrinsic'+'consume continue delegate digestof do else elseif embed end error'+'for fun if ifdef in interface is isnt lambda let match new not object'+'or primitive recover repeat return struct then trait try type until '+'use var where while with xor',meta:'iso val tag trn box ref',literal:'this false true'};var TRIPLE_QUOTE_STRING_MODE={className:'string',begin:'"""',end:'"""',relevance:10};var QUOTE_STRING_MODE={className:'string',begin:'"',end:'"',contains:[hljs.BACKSLASH_ESCAPE]};var SINGLE_QUOTE_CHAR_MODE={className:'string',begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE],relevance:0};var TYPE_NAME={className:'type',begin:'\\b_?[A-Z][\\w]*',relevance:0};var PRIMED_NAME={begin:hljs.IDENT_RE+'\'',relevance:0};var CLASS={className:'class',beginKeywords:'class actor',end:'$',contains:[hljs.TITLE_MODE,hljs.C_LINE_COMMENT_MODE]};var FUNCTION={className:'function',beginKeywords:'new fun',end:'=>',contains:[hljs.TITLE_MODE,{begin:/\(/,end:/\)/,contains:[TYPE_NAME,PRIMED_NAME,hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE]},{begin:/:/,endsWithParent:true,contains:[TYPE_NAME]},hljs.C_LINE_COMMENT_MODE]};return{keywords:KEYWORDS,contains:[CLASS,FUNCTION,TYPE_NAME,TRIPLE_QUOTE_STRING_MODE,QUOTE_STRING_MODE,SINGLE_QUOTE_CHAR_MODE,PRIMED_NAME,hljs.C_NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};});hljs.registerLanguage('powershell',function(hljs){var BACKTICK_ESCAPE={begin:'`[\\s\\S]',relevance:0};var VAR={className:'variable',variants:[{begin:/\$[\w\d][\w\d_:]*/}]};var LITERAL={className:'literal',begin:/\$(null|true|false)\b/};var QUOTE_STRING={className:'string',variants:[{begin:/"/,end:/"/},{begin:/@"/,end:/^"@/}],contains:[BACKTICK_ESCAPE,VAR,{className:'variable',begin:/\$[A-z]/,end:/[^A-z]/}]};var APOS_STRING={className:'string',variants:[{begin:/'/,end:/'/},{begin:/@'/,end:/^'@/}]};var PS_HELPTAGS={className:'doctag',variants:[/* no paramater help tags */{begin:/\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/},/* one parameter help tags */{begin:/\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/}]};var PS_COMMENT=hljs.inherit(hljs.COMMENT(null,null),{variants:[/* single-line comment */{begin:/#/,end:/$/},/* multi-line comment */{begin:/<#/,end:/#>/}],contains:[PS_HELPTAGS]});return{aliases:['ps'],lexemes:/-?[A-z\.\-]+/,case_insensitive:true,keywords:{keyword:'if else foreach return function do while until elseif begin for trap data dynamicparam end break throw param continue finally in switch exit filter try process catch',built_in:'Add-Computer Add-Content Add-History Add-JobTrigger Add-Member Add-PSSnapin Add-Type Checkpoint-Computer Clear-Content Clear-EventLog Clear-History Clear-Host Clear-Item Clear-ItemProperty Clear-Variable Compare-Object Complete-Transaction Connect-PSSession Connect-WSMan Convert-Path ConvertFrom-Csv ConvertFrom-Json ConvertFrom-SecureString ConvertFrom-StringData ConvertTo-Csv ConvertTo-Html ConvertTo-Json ConvertTo-SecureString ConvertTo-Xml Copy-Item Copy-ItemProperty Debug-Process Disable-ComputerRestore Disable-JobTrigger Disable-PSBreakpoint Disable-PSRemoting Disable-PSSessionConfiguration Disable-WSManCredSSP Disconnect-PSSession Disconnect-WSMan Disable-ScheduledJob Enable-ComputerRestore Enable-JobTrigger Enable-PSBreakpoint Enable-PSRemoting Enable-PSSessionConfiguration Enable-ScheduledJob Enable-WSManCredSSP Enter-PSSession Exit-PSSession Export-Alias Export-Clixml Export-Console Export-Counter Export-Csv Export-FormatData Export-ModuleMember Export-PSSession ForEach-Object Format-Custom Format-List Format-Table Format-Wide Get-Acl Get-Alias Get-AuthenticodeSignature Get-ChildItem Get-Command Get-ComputerRestorePoint Get-Content Get-ControlPanelItem Get-Counter Get-Credential Get-Culture Get-Date Get-Event Get-EventLog Get-EventSubscriber Get-ExecutionPolicy Get-FormatData Get-Host Get-HotFix Get-Help Get-History Get-IseSnippet Get-Item Get-ItemProperty Get-Job Get-JobTrigger Get-Location Get-Member Get-Module Get-PfxCertificate Get-Process Get-PSBreakpoint Get-PSCallStack Get-PSDrive Get-PSProvider Get-PSSession Get-PSSessionConfiguration Get-PSSnapin Get-Random Get-ScheduledJob Get-ScheduledJobOption Get-Service Get-TraceSource Get-Transaction Get-TypeData Get-UICulture Get-Unique Get-Variable Get-Verb Get-WinEvent Get-WmiObject Get-WSManCredSSP Get-WSManInstance Group-Object Import-Alias Import-Clixml Import-Counter Import-Csv Import-IseSnippet Import-LocalizedData Import-PSSession Import-Module Invoke-AsWorkflow Invoke-Command Invoke-Expression Invoke-History Invoke-Item Invoke-RestMethod Invoke-WebRequest Invoke-WmiMethod Invoke-WSManAction Join-Path Limit-EventLog Measure-Command Measure-Object Move-Item Move-ItemProperty New-Alias New-Event New-EventLog New-IseSnippet New-Item New-ItemProperty New-JobTrigger New-Object New-Module New-ModuleManifest New-PSDrive New-PSSession New-PSSessionConfigurationFile New-PSSessionOption New-PSTransportOption New-PSWorkflowExecutionOption New-PSWorkflowSession New-ScheduledJobOption New-Service New-TimeSpan New-Variable New-WebServiceProxy New-WinEvent New-WSManInstance New-WSManSessionOption Out-Default Out-File Out-GridView Out-Host Out-Null Out-Printer Out-String Pop-Location Push-Location Read-Host Receive-Job Register-EngineEvent Register-ObjectEvent Register-PSSessionConfiguration Register-ScheduledJob Register-WmiEvent Remove-Computer Remove-Event Remove-EventLog Remove-Item Remove-ItemProperty Remove-Job Remove-JobTrigger Remove-Module Remove-PSBreakpoint Remove-PSDrive Remove-PSSession Remove-PSSnapin Remove-TypeData Remove-Variable Remove-WmiObject Remove-WSManInstance Rename-Computer Rename-Item Rename-ItemProperty Reset-ComputerMachinePassword Resolve-Path Restart-Computer Restart-Service Restore-Computer Resume-Job Resume-Service Save-Help Select-Object Select-String Select-Xml Send-MailMessage Set-Acl Set-Alias Set-AuthenticodeSignature Set-Content Set-Date Set-ExecutionPolicy Set-Item Set-ItemProperty Set-JobTrigger Set-Location Set-PSBreakpoint Set-PSDebug Set-PSSessionConfiguration Set-ScheduledJob Set-ScheduledJobOption Set-Service Set-StrictMode Set-TraceSource Set-Variable Set-WmiInstance Set-WSManInstance Set-WSManQuickConfig Show-Command Show-ControlPanelItem Show-EventLog Sort-Object Split-Path Start-Job Start-Process Start-Service Start-Sleep Start-Transaction Start-Transcript Stop-Computer Stop-Job Stop-Process Stop-Service Stop-Transcript Suspend-Job Suspend-Service Tee-Object Test-ComputerSecureChannel Test-Connection Test-ModuleManifest Test-Path Test-PSSessionConfigurationFile Trace-Command Unblock-File Undo-Transaction Unregister-Event Unregister-PSSessionConfiguration Unregister-ScheduledJob Update-FormatData Update-Help Update-List Update-TypeData Use-Transaction Wait-Event Wait-Job Wait-Process Where-Object Write-Debug Write-Error Write-EventLog Write-Host Write-Output Write-Progress Write-Verbose Write-Warning Add-MDTPersistentDrive Disable-MDTMonitorService Enable-MDTMonitorService Get-MDTDeploymentShareStatistics Get-MDTMonitorData Get-MDTOperatingSystemCatalog Get-MDTPersistentDrive Import-MDTApplication Import-MDTDriver Import-MDTOperatingSystem Import-MDTPackage Import-MDTTaskSequence New-MDTDatabase Remove-MDTMonitorData Remove-MDTPersistentDrive Restore-MDTPersistentDrive Set-MDTMonitorData Test-MDTDeploymentShare Test-MDTMonitorData Update-MDTDatabaseSchema Update-MDTDeploymentShare Update-MDTLinkedDS Update-MDTMedia Update-MDTMedia Add-VamtProductKey Export-VamtData Find-VamtManagedMachine Get-VamtConfirmationId Get-VamtProduct Get-VamtProductKey Import-VamtData Initialize-VamtData Install-VamtConfirmationId Install-VamtProductActivation Install-VamtProductKey Update-VamtProduct',nomarkup:'-ne -eq -lt -gt -ge -le -not -like -notlike -match -notmatch -contains -notcontains -in -notin -replace'},contains:[BACKTICK_ESCAPE,hljs.NUMBER_MODE,QUOTE_STRING,APOS_STRING,LITERAL,VAR,PS_COMMENT]};});hljs.registerLanguage('processing',function(hljs){return{keywords:{keyword:'BufferedReader PVector PFont PImage PGraphics HashMap boolean byte char color '+'double float int long String Array FloatDict FloatList IntDict IntList JSONArray JSONObject '+'Object StringDict StringList Table TableRow XML '+// Java keywords
'false synchronized int abstract float private char boolean static null if const '+'for true while long throw strictfp finally protected import native final return void '+'enum else break transient new catch instanceof byte super volatile case assert short '+'package default double public try this switch continue throws protected public private',literal:'P2D P3D HALF_PI PI QUARTER_PI TAU TWO_PI',title:'setup draw',built_in:'displayHeight displayWidth mouseY mouseX mousePressed pmouseX pmouseY key '+'keyCode pixels focused frameCount frameRate height width '+'size createGraphics beginDraw createShape loadShape PShape arc ellipse line point '+'quad rect triangle bezier bezierDetail bezierPoint bezierTangent curve curveDetail curvePoint '+'curveTangent curveTightness shape shapeMode beginContour beginShape bezierVertex curveVertex '+'endContour endShape quadraticVertex vertex ellipseMode noSmooth rectMode smooth strokeCap '+'strokeJoin strokeWeight mouseClicked mouseDragged mouseMoved mousePressed mouseReleased '+'mouseWheel keyPressed keyPressedkeyReleased keyTyped print println save saveFrame day hour '+'millis minute month second year background clear colorMode fill noFill noStroke stroke alpha '+'blue brightness color green hue lerpColor red saturation modelX modelY modelZ screenX screenY '+'screenZ ambient emissive shininess specular add createImage beginCamera camera endCamera frustum '+'ortho perspective printCamera printProjection cursor frameRate noCursor exit loop noLoop popStyle '+'pushStyle redraw binary boolean byte char float hex int str unbinary unhex join match matchAll nf '+'nfc nfp nfs split splitTokens trim append arrayCopy concat expand reverse shorten sort splice subset '+'box sphere sphereDetail createInput createReader loadBytes loadJSONArray loadJSONObject loadStrings '+'loadTable loadXML open parseXML saveTable selectFolder selectInput beginRaw beginRecord createOutput '+'createWriter endRaw endRecord PrintWritersaveBytes saveJSONArray saveJSONObject saveStream saveStrings '+'saveXML selectOutput popMatrix printMatrix pushMatrix resetMatrix rotate rotateX rotateY rotateZ scale '+'shearX shearY translate ambientLight directionalLight lightFalloff lights lightSpecular noLights normal '+'pointLight spotLight image imageMode loadImage noTint requestImage tint texture textureMode textureWrap '+'blend copy filter get loadPixels set updatePixels blendMode loadShader PShaderresetShader shader createFont '+'loadFont text textFont textAlign textLeading textMode textSize textWidth textAscent textDescent abs ceil '+'constrain dist exp floor lerp log mag map max min norm pow round sq sqrt acos asin atan atan2 cos degrees '+'radians sin tan noise noiseDetail noiseSeed random randomGaussian randomSeed'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE]};});hljs.registerLanguage('profile',function(hljs){return{contains:[hljs.C_NUMBER_MODE,{begin:'[a-zA-Z_][\\da-zA-Z_]+\\.[\\da-zA-Z_]{1,3}',end:':',excludeEnd:true},{begin:'(ncalls|tottime|cumtime)',end:'$',keywords:'ncalls tottime|10 cumtime|10 filename',relevance:10},{begin:'function calls',end:'$',contains:[hljs.C_NUMBER_MODE],relevance:10},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{className:'string',begin:'\\(',end:'\\)$',excludeBegin:true,excludeEnd:true,relevance:0}]};});hljs.registerLanguage('prolog',function(hljs){var ATOM={begin:/[a-z][A-Za-z0-9_]*/,relevance:0};var VAR={className:'symbol',variants:[{begin:/[A-Z][a-zA-Z0-9_]*/},{begin:/_[A-Za-z0-9_]*/}],relevance:0};var PARENTED={begin:/\(/,end:/\)/,relevance:0};var LIST={begin:/\[/,end:/\]/};var LINE_COMMENT={className:'comment',begin:/%/,end:/$/,contains:[hljs.PHRASAL_WORDS_MODE]};var BACKTICK_STRING={className:'string',begin:/`/,end:/`/,contains:[hljs.BACKSLASH_ESCAPE]};var CHAR_CODE={className:'string',// 0'a etc.
begin:/0\'(\\\'|.)/};var SPACE_CODE={className:'string',begin:/0\'\\s/// 0'\s
};var PRED_OP={// relevance booster
begin:/:-/};var inner=[ATOM,VAR,PARENTED,PRED_OP,LIST,LINE_COMMENT,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,BACKTICK_STRING,CHAR_CODE,SPACE_CODE,hljs.C_NUMBER_MODE];PARENTED.contains=inner;LIST.contains=inner;return{contains:inner.concat([{begin:/\.$/// relevance booster
}])};});hljs.registerLanguage('protobuf',function(hljs){return{keywords:{keyword:'package import option optional required repeated group',built_in:'double float int32 int64 uint32 uint64 sint32 sint64 '+'fixed32 fixed64 sfixed32 sfixed64 bool string bytes',literal:'true false'},contains:[hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,{className:'class',beginKeywords:'message enum service',end:/\{/,illegal:/\n/,contains:[hljs.inherit(hljs.TITLE_MODE,{starts:{endsWithParent:true,excludeEnd:true// hack: eating everything after the first title
}})]},{className:'function',beginKeywords:'rpc',end:/;/,excludeEnd:true,keywords:'rpc returns'},{begin:/^\s*[A-Z_]+/,end:/\s*=/,excludeEnd:true}]};});hljs.registerLanguage('puppet',function(hljs){var PUPPET_KEYWORDS={keyword:/* language keywords */'and case default else elsif false if in import enherits node or true undef unless main settings $string ',literal:/* metaparameters */'alias audit before loglevel noop require subscribe tag '+/* normal attributes */'owner ensure group mode name|0 changes context force incl lens load_path onlyif provider returns root show_diff type_check '+'en_address ip_address realname command environment hour monute month monthday special target weekday '+'creates cwd ogoutput refresh refreshonly tries try_sleep umask backup checksum content ctime force ignore '+'links mtime purge recurse recurselimit replace selinux_ignore_defaults selrange selrole seltype seluser source '+'souirce_permissions sourceselect validate_cmd validate_replacement allowdupe attribute_membership auth_membership forcelocal gid '+'ia_load_module members system host_aliases ip allowed_trunk_vlans description device_url duplex encapsulation etherchannel '+'native_vlan speed principals allow_root auth_class auth_type authenticate_user k_of_n mechanisms rule session_owner shared options '+'device fstype enable hasrestart directory present absent link atboot blockdevice device dump pass remounts poller_tag use '+'message withpath adminfile allow_virtual allowcdrom category configfiles flavor install_options instance package_settings platform '+'responsefile status uninstall_options vendor unless_system_user unless_uid binary control flags hasstatus manifest pattern restart running '+'start stop allowdupe auths expiry gid groups home iterations key_membership keys managehome membership password password_max_age '+'password_min_age profile_membership profiles project purge_ssh_keys role_membership roles salt shell uid baseurl cost descr enabled '+'enablegroups exclude failovermethod gpgcheck gpgkey http_caching include includepkgs keepalive metadata_expire metalink mirrorlist '+'priority protect proxy proxy_password proxy_username repo_gpgcheck s3_enabled skip_if_unavailable sslcacert sslclientcert sslclientkey '+'sslverify mounted',built_in:/* core facts */'architecture augeasversion blockdevices boardmanufacturer boardproductname boardserialnumber cfkey dhcp_servers '+'domain ec2_ ec2_userdata facterversion filesystems ldom fqdn gid hardwareisa hardwaremodel hostname id|0 interfaces '+'ipaddress ipaddress_ ipaddress6 ipaddress6_ iphostnumber is_virtual kernel kernelmajversion kernelrelease kernelversion '+'kernelrelease kernelversion lsbdistcodename lsbdistdescription lsbdistid lsbdistrelease lsbmajdistrelease lsbminordistrelease '+'lsbrelease macaddress macaddress_ macosx_buildversion macosx_productname macosx_productversion macosx_productverson_major '+'macosx_productversion_minor manufacturer memoryfree memorysize netmask metmask_ network_ operatingsystem operatingsystemmajrelease '+'operatingsystemrelease osfamily partitions path physicalprocessorcount processor processorcount productname ps puppetversion '+'rubysitedir rubyversion selinux selinux_config_mode selinux_config_policy selinux_current_mode selinux_current_mode selinux_enforced '+'selinux_policyversion serialnumber sp_ sshdsakey sshecdsakey sshrsakey swapencrypted swapfree swapsize timezone type uniqueid uptime '+'uptime_days uptime_hours uptime_seconds uuid virtual vlans xendomains zfs_version zonenae zones zpool_version'};var COMMENT=hljs.COMMENT('#','$');var IDENT_RE='([A-Za-z_]|::)(\\w|::)*';var TITLE=hljs.inherit(hljs.TITLE_MODE,{begin:IDENT_RE});var VARIABLE={className:'variable',begin:'\\$'+IDENT_RE};var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE,VARIABLE],variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/}]};return{aliases:['pp'],contains:[COMMENT,VARIABLE,STRING,{beginKeywords:'class',end:'\\{|;',illegal:/=/,contains:[TITLE,COMMENT]},{beginKeywords:'define',end:/\{/,contains:[{className:'section',begin:hljs.IDENT_RE,endsParent:true}]},{begin:hljs.IDENT_RE+'\\s+\\{',returnBegin:true,end:/\S/,contains:[{className:'keyword',begin:hljs.IDENT_RE},{begin:/\{/,end:/\}/,keywords:PUPPET_KEYWORDS,relevance:0,contains:[STRING,COMMENT,{begin:'[a-zA-Z_]+\\s*=>',returnBegin:true,end:'=>',contains:[{className:'attr',begin:hljs.IDENT_RE}]},{className:'number',begin:'(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',relevance:0},VARIABLE]}],relevance:0}]};});hljs.registerLanguage('purebasic',// Base deafult colors in PB IDE: background: #FFFFDF; foreground: #000000;
function(hljs){var STRINGS={// PB IDE color: #0080FF (Azure Radiance)
className:'string',begin:'(~)?"',end:'"',illegal:'\\n'};var CONSTANTS={// PB IDE color: #924B72 (Cannon Pink)
//  "#" + a letter or underscore + letters, digits or underscores + (optional) "$"
className:'symbol',begin:'#[a-zA-Z_]\\w*\\$?'};return{aliases:['pb','pbi'],keywords:// PB IDE color: #006666 (Blue Stone) + Bold
// The following keywords list was taken and adapted from GuShH's PureBasic language file for GeSHi...
'And As Break CallDebugger Case CompilerCase CompilerDefault CompilerElse CompilerEndIf CompilerEndSelect '+'CompilerError CompilerIf CompilerSelect Continue Data DataSection EndDataSection Debug DebugLevel '+'Default Define Dim DisableASM DisableDebugger DisableExplicit Else ElseIf EnableASM '+'EnableDebugger EnableExplicit End EndEnumeration EndIf EndImport EndInterface EndMacro EndProcedure '+'EndSelect EndStructure EndStructureUnion EndWith Enumeration Extends FakeReturn For Next ForEach '+'ForEver Global Gosub Goto If Import ImportC IncludeBinary IncludeFile IncludePath Interface Macro '+'NewList Not Or ProcedureReturn Protected Prototype '+'PrototypeC Read ReDim Repeat Until Restore Return Select Shared Static Step Structure StructureUnion '+'Swap To Wend While With XIncludeFile XOr '+'Procedure ProcedureC ProcedureCDLL ProcedureDLL Declare DeclareC DeclareCDLL DeclareDLL',contains:[// COMMENTS | PB IDE color: #00AAAA (Persian Green)
hljs.COMMENT(';','$',{relevance:0}),{// PROCEDURES DEFINITIONS
className:'function',begin:'\\b(Procedure|Declare)(C|CDLL|DLL)?\\b',end:'\\(',excludeEnd:true,returnBegin:true,contains:[{// PROCEDURE KEYWORDS | PB IDE color: #006666 (Blue Stone) + Bold
className:'keyword',begin:'(Procedure|Declare)(C|CDLL|DLL)?',excludeEnd:true},{// PROCEDURE RETURN TYPE SETTING | PB IDE color: #000000 (Black)
className:'type',begin:'\\.\\w*'// end: ' ',
},hljs.UNDERSCORE_TITLE_MODE// PROCEDURE NAME | PB IDE color: #006666 (Blue Stone)
]},STRINGS,CONSTANTS]};});hljs.registerLanguage('python',function(hljs){var KEYWORDS={keyword:'and elif is global as in if from raise for except finally print import pass return '+'exec else break not with class assert yield try while continue del or def lambda '+'async await nonlocal|10 None True False',built_in:'Ellipsis NotImplemented'};var PROMPT={className:'meta',begin:/^(>>>|\.\.\.) /};var SUBST={className:'subst',begin:/\{/,end:/\}/,keywords:KEYWORDS,illegal:/#/};var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:/(u|b)?r?'''/,end:/'''/,contains:[PROMPT],relevance:10},{begin:/(u|b)?r?"""/,end:/"""/,contains:[PROMPT],relevance:10},{begin:/(fr|rf|f)'''/,end:/'''/,contains:[PROMPT,SUBST]},{begin:/(fr|rf|f)"""/,end:/"""/,contains:[PROMPT,SUBST]},{begin:/(u|r|ur)'/,end:/'/,relevance:10},{begin:/(u|r|ur)"/,end:/"/,relevance:10},{begin:/(b|br)'/,end:/'/},{begin:/(b|br)"/,end:/"/},{begin:/(fr|rf|f)'/,end:/'/,contains:[SUBST]},{begin:/(fr|rf|f)"/,end:/"/,contains:[SUBST]},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]};var NUMBER={className:'number',relevance:0,variants:[{begin:hljs.BINARY_NUMBER_RE+'[lLjJ]?'},{begin:'\\b(0o[0-7]+)[lLjJ]?'},{begin:hljs.C_NUMBER_RE+'[lLjJ]?'}]};var PARAMS={className:'params',begin:/\(/,end:/\)/,contains:['self',PROMPT,NUMBER,STRING]};SUBST.contains=[STRING,NUMBER,PROMPT];return{aliases:['py','gyp'],keywords:KEYWORDS,illegal:/(<\/|->|\?)|=>/,contains:[PROMPT,NUMBER,STRING,hljs.HASH_COMMENT_MODE,{variants:[{className:'function',beginKeywords:'def'},{className:'class',beginKeywords:'class'}],end:/:/,illegal:/[${=;\n,]/,contains:[hljs.UNDERSCORE_TITLE_MODE,PARAMS,{begin:/->/,endsWithParent:true,keywords:'None'}]},{className:'meta',begin:/^[\t ]*@/,end:/$/},{begin:/\b(print|exec)\(/// don’t highlight keywords-turned-functions in Python 3
}]};});hljs.registerLanguage('q',function(hljs){var Q_KEYWORDS={keyword:'do while select delete by update from',literal:'0b 1b',built_in:'neg not null string reciprocal floor ceiling signum mod xbar xlog and or each scan over prior mmu lsq inv md5 ltime gtime count first var dev med cov cor all any rand sums prds mins maxs fills deltas ratios avgs differ prev next rank reverse iasc idesc asc desc msum mcount mavg mdev xrank mmin mmax xprev rotate distinct group where flip type key til get value attr cut set upsert raze union inter except cross sv vs sublist enlist read0 read1 hopen hclose hdel hsym hcount peach system ltrim rtrim trim lower upper ssr view tables views cols xcols keys xkey xcol xasc xdesc fkeys meta lj aj aj0 ij pj asof uj ww wj wj1 fby xgroup ungroup ej save load rsave rload show csv parse eval min max avg wavg wsum sin cos tan sum',type:'`float `double int `timestamp `timespan `datetime `time `boolean `symbol `char `byte `short `long `real `month `date `minute `second `guid'};return{aliases:['k','kdb'],keywords:Q_KEYWORDS,lexemes:/(`?)[A-Za-z0-9_]+\b/,contains:[hljs.C_LINE_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE]};});hljs.registerLanguage('qml',function(hljs){var KEYWORDS={keyword:'in of on if for while finally var new function do return void else break catch '+'instanceof with throw case default try this switch continue typeof delete '+'let yield const export super debugger as async await import',literal:'true false null undefined NaN Infinity',built_in:'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent '+'encodeURI encodeURIComponent escape unescape Object Function Boolean Error '+'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError '+'TypeError URIError Number Math Date String RegExp Array Float32Array '+'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array '+'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require '+'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect '+'Behavior bool color coordinate date double enumeration font geocircle georectangle '+'geoshape int list matrix4x4 parent point quaternion real rect '+'size string url var variant vector2d vector3d vector4d'+'Promise'};var QML_IDENT_RE='[a-zA-Z_][a-zA-Z0-9\\._]*';// Isolate property statements. Ends at a :, =, ;, ,, a comment or end of line.
// Use property class.
var PROPERTY={className:'keyword',begin:'\\bproperty\\b',starts:{className:'string',end:'(:|=|;|,|//|/\\*|$)',returnEnd:true}};// Isolate signal statements. Ends at a ) a comment or end of line.
// Use property class.
var SIGNAL={className:'keyword',begin:'\\bsignal\\b',starts:{className:'string',end:'(\\(|:|=|;|,|//|/\\*|$)',returnEnd:true}};// id: is special in QML. When we see id: we want to mark the id: as attribute and
// emphasize the token following.
var ID_ID={className:'attribute',begin:'\\bid\\s*:',starts:{className:'string',end:QML_IDENT_RE,returnEnd:false}};// Find QML object attribute. An attribute is a QML identifier followed by :.
// Unfortunately it's hard to know where it ends, as it may contain scalars,
// objects, object definitions, or javascript. The true end is either when the parent
// ends or the next attribute is detected.
var QML_ATTRIBUTE={begin:QML_IDENT_RE+'\\s*:',returnBegin:true,contains:[{className:'attribute',begin:QML_IDENT_RE,end:'\\s*:',excludeEnd:true,relevance:0}],relevance:0};// Find QML object. A QML object is a QML identifier followed by { and ends at the matching }.
// All we really care about is finding IDENT followed by { and just mark up the IDENT and ignore the {.
var QML_OBJECT={begin:QML_IDENT_RE+'\\s*{',end:'{',returnBegin:true,relevance:0,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:QML_IDENT_RE})]};return{aliases:['qt'],case_insensitive:false,keywords:KEYWORDS,contains:[{className:'meta',begin:/^\s*['"]use (strict|asm)['"]/},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{// template string
className:'string',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE,{className:'subst',begin:'\\$\\{',end:'\\}'}]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'number',variants:[{begin:'\\b(0[bB][01]+)'},{begin:'\\b(0[oO][0-7]+)'},{begin:hljs.C_NUMBER_RE}],relevance:0},{// "value" container
begin:'('+hljs.RE_STARTERS_RE+'|\\b(case|return|throw)\\b)\\s*',keywords:'return throw case',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.REGEXP_MODE,{// E4X / JSX
begin:/</,end:/>\s*[);\]]/,relevance:0,subLanguage:'xml'}],relevance:0},SIGNAL,PROPERTY,{className:'function',beginKeywords:'function',end:/\{/,excludeEnd:true,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:/[A-Za-z$_][0-9A-Za-z$_]*/}),{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]}],illegal:/\[|%/},{begin:'\\.'+hljs.IDENT_RE,relevance:0// hack: prevents detection of keywords after dots
},ID_ID,QML_ATTRIBUTE,QML_OBJECT],illegal:/#/};});hljs.registerLanguage('r',function(hljs){var IDENT_RE='([a-zA-Z]|\\.[a-zA-Z.])[a-zA-Z0-9._]*';return{contains:[hljs.HASH_COMMENT_MODE,{begin:IDENT_RE,lexemes:IDENT_RE,keywords:{keyword:'function if in break next repeat else for return switch while try tryCatch '+'stop warning require library attach detach source setMethod setGeneric '+'setGroupGeneric setClass ...',literal:'NULL NA TRUE FALSE T F Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 '+'NA_complex_|10'},relevance:0},{// hex value
className:'number',begin:"0[xX][0-9a-fA-F]+[Li]?\\b",relevance:0},{// explicit integer
className:'number',begin:"\\d+(?:[eE][+\\-]?\\d*)?L\\b",relevance:0},{// number with trailing decimal
className:'number',begin:"\\d+\\.(?!\\d)(?:i\\b)?",relevance:0},{// number
className:'number',begin:"\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d*)?i?\\b",relevance:0},{// number with leading decimal
className:'number',begin:"\\.\\d+(?:[eE][+\\-]?\\d*)?i?\\b",relevance:0},{// escaped identifier
begin:'`',end:'`',relevance:0},{className:'string',contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:'"',end:'"'},{begin:"'",end:"'"}]}]};});hljs.registerLanguage('rib',function(hljs){return{keywords:'ArchiveRecord AreaLightSource Atmosphere Attribute AttributeBegin AttributeEnd Basis '+'Begin Blobby Bound Clipping ClippingPlane Color ColorSamples ConcatTransform Cone '+'CoordinateSystem CoordSysTransform CropWindow Curves Cylinder DepthOfField Detail '+'DetailRange Disk Displacement Display End ErrorHandler Exposure Exterior Format '+'FrameAspectRatio FrameBegin FrameEnd GeneralPolygon GeometricApproximation Geometry '+'Hider Hyperboloid Identity Illuminate Imager Interior LightSource '+'MakeCubeFaceEnvironment MakeLatLongEnvironment MakeShadow MakeTexture Matte '+'MotionBegin MotionEnd NuPatch ObjectBegin ObjectEnd ObjectInstance Opacity Option '+'Orientation Paraboloid Patch PatchMesh Perspective PixelFilter PixelSamples '+'PixelVariance Points PointsGeneralPolygons PointsPolygons Polygon Procedural Projection '+'Quantize ReadArchive RelativeDetail ReverseOrientation Rotate Scale ScreenWindow '+'ShadingInterpolation ShadingRate Shutter Sides Skew SolidBegin SolidEnd Sphere '+'SubdivisionMesh Surface TextureCoordinates Torus Transform TransformBegin TransformEnd '+'TransformPoints Translate TrimCurve WorldBegin WorldEnd',illegal:'</',contains:[hljs.HASH_COMMENT_MODE,hljs.C_NUMBER_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE]};});hljs.registerLanguage('roboconf',function(hljs){var IDENTIFIER='[a-zA-Z-_][^\\n{]+\\{';var PROPERTY={className:'attribute',begin:/[a-zA-Z-_]+/,end:/\s*:/,excludeEnd:true,starts:{end:';',relevance:0,contains:[{className:'variable',begin:/\.[a-zA-Z-_]+/},{className:'keyword',begin:/\(optional\)/}]}};return{aliases:['graph','instances'],case_insensitive:true,keywords:'import',contains:[// Facet sections
{begin:'^facet '+IDENTIFIER,end:'}',keywords:'facet',contains:[PROPERTY,hljs.HASH_COMMENT_MODE]},// Instance sections
{begin:'^\\s*instance of '+IDENTIFIER,end:'}',keywords:'name count channels instance-data instance-state instance of',illegal:/\S/,contains:['self',PROPERTY,hljs.HASH_COMMENT_MODE]},// Component sections
{begin:'^'+IDENTIFIER,end:'}',contains:[PROPERTY,hljs.HASH_COMMENT_MODE]},// Comments
hljs.HASH_COMMENT_MODE]};});hljs.registerLanguage('rsl',function(hljs){return{keywords:{keyword:'float color point normal vector matrix while for if do return else break extern continue',built_in:'abs acos ambient area asin atan atmosphere attribute calculatenormal ceil cellnoise '+'clamp comp concat cos degrees depth Deriv diffuse distance Du Dv environment exp '+'faceforward filterstep floor format fresnel incident length lightsource log match '+'max min mod noise normalize ntransform opposite option phong pnoise pow printf '+'ptlined radians random reflect refract renderinfo round setcomp setxcomp setycomp '+'setzcomp shadow sign sin smoothstep specular specularbrdf spline sqrt step tan '+'texture textureinfo trace transform vtransform xcomp ycomp zcomp'},illegal:'</',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,hljs.C_NUMBER_MODE,{className:'meta',begin:'#',end:'$'},{className:'class',beginKeywords:'surface displacement light volume imager',end:'\\('},{beginKeywords:'illuminate illuminance gather',end:'\\('}]};});hljs.registerLanguage('ruleslanguage',function(hljs){return{keywords:{keyword:'BILL_PERIOD BILL_START BILL_STOP RS_EFFECTIVE_START RS_EFFECTIVE_STOP RS_JURIS_CODE RS_OPCO_CODE '+'INTDADDATTRIBUTE|5 INTDADDVMSG|5 INTDBLOCKOP|5 INTDBLOCKOPNA|5 INTDCLOSE|5 INTDCOUNT|5 '+'INTDCOUNTSTATUSCODE|5 INTDCREATEMASK|5 INTDCREATEDAYMASK|5 INTDCREATEFACTORMASK|5 '+'INTDCREATEHANDLE|5 INTDCREATEOVERRIDEDAYMASK|5 INTDCREATEOVERRIDEMASK|5 '+'INTDCREATESTATUSCODEMASK|5 INTDCREATETOUPERIOD|5 INTDDELETE|5 INTDDIPTEST|5 INTDEXPORT|5 '+'INTDGETERRORCODE|5 INTDGETERRORMESSAGE|5 INTDISEQUAL|5 INTDJOIN|5 INTDLOAD|5 INTDLOADACTUALCUT|5 '+'INTDLOADDATES|5 INTDLOADHIST|5 INTDLOADLIST|5 INTDLOADLISTDATES|5 INTDLOADLISTENERGY|5 '+'INTDLOADLISTHIST|5 INTDLOADRELATEDCHANNEL|5 INTDLOADSP|5 INTDLOADSTAGING|5 INTDLOADUOM|5 '+'INTDLOADUOMDATES|5 INTDLOADUOMHIST|5 INTDLOADVERSION|5 INTDOPEN|5 INTDREADFIRST|5 INTDREADNEXT|5 '+'INTDRECCOUNT|5 INTDRELEASE|5 INTDREPLACE|5 INTDROLLAVG|5 INTDROLLPEAK|5 INTDSCALAROP|5 INTDSCALE|5 '+'INTDSETATTRIBUTE|5 INTDSETDSTPARTICIPANT|5 INTDSETSTRING|5 INTDSETVALUE|5 INTDSETVALUESTATUS|5 '+'INTDSHIFTSTARTTIME|5 INTDSMOOTH|5 INTDSORT|5 INTDSPIKETEST|5 INTDSUBSET|5 INTDTOU|5 '+'INTDTOURELEASE|5 INTDTOUVALUE|5 INTDUPDATESTATS|5 INTDVALUE|5 STDEV INTDDELETEEX|5 '+'INTDLOADEXACTUAL|5 INTDLOADEXCUT|5 INTDLOADEXDATES|5 INTDLOADEX|5 INTDLOADEXRELATEDCHANNEL|5 '+'INTDSAVEEX|5 MVLOAD|5 MVLOADACCT|5 MVLOADACCTDATES|5 MVLOADACCTHIST|5 MVLOADDATES|5 MVLOADHIST|5 '+'MVLOADLIST|5 MVLOADLISTDATES|5 MVLOADLISTHIST|5 IF FOR NEXT DONE SELECT END CALL ABORT CLEAR CHANNEL FACTOR LIST NUMBER '+'OVERRIDE SET WEEK DISTRIBUTIONNODE ELSE WHEN THEN OTHERWISE IENUM CSV INCLUDE LEAVE RIDER SAVE DELETE '+'NOVALUE SECTION WARN SAVE_UPDATE DETERMINANT LABEL REPORT REVENUE EACH '+'IN FROM TOTAL CHARGE BLOCK AND OR CSV_FILE RATE_CODE AUXILIARY_DEMAND '+'UIDACCOUNT RS BILL_PERIOD_SELECT HOURS_PER_MONTH INTD_ERROR_STOP SEASON_SCHEDULE_NAME '+'ACCOUNTFACTOR ARRAYUPPERBOUND CALLSTOREDPROC GETADOCONNECTION GETCONNECT GETDATASOURCE '+'GETQUALIFIER GETUSERID HASVALUE LISTCOUNT LISTOP LISTUPDATE LISTVALUE PRORATEFACTOR RSPRORATE '+'SETBINPATH SETDBMONITOR WQ_OPEN BILLINGHOURS DATE DATEFROMFLOAT DATETIMEFROMSTRING '+'DATETIMETOSTRING DATETOFLOAT DAY DAYDIFF DAYNAME DBDATETIME HOUR MINUTE MONTH MONTHDIFF '+'MONTHHOURS MONTHNAME ROUNDDATE SAMEWEEKDAYLASTYEAR SECOND WEEKDAY WEEKDIFF YEAR YEARDAY '+'YEARSTR COMPSUM HISTCOUNT HISTMAX HISTMIN HISTMINNZ HISTVALUE MAXNRANGE MAXRANGE MINRANGE '+'COMPIKVA COMPKVA COMPKVARFROMKQKW COMPLF IDATTR FLAG LF2KW LF2KWH MAXKW POWERFACTOR '+'READING2USAGE AVGSEASON MAXSEASON MONTHLYMERGE SEASONVALUE SUMSEASON ACCTREADDATES '+'ACCTTABLELOAD CONFIGADD CONFIGGET CREATEOBJECT CREATEREPORT EMAILCLIENT EXPBLKMDMUSAGE '+'EXPMDMUSAGE EXPORT_USAGE FACTORINEFFECT GETUSERSPECIFIEDSTOP INEFFECT ISHOLIDAY RUNRATE '+'SAVE_PROFILE SETREPORTTITLE USEREXIT WATFORRUNRATE TO TABLE ACOS ASIN ATAN ATAN2 BITAND CEIL '+'COS COSECANT COSH COTANGENT DIVQUOT DIVREM EXP FABS FLOOR FMOD FREPM FREXPN LOG LOG10 MAX MAXN '+'MIN MINNZ MODF POW ROUND ROUND2VALUE ROUNDINT SECANT SIN SINH SQROOT TAN TANH FLOAT2STRING '+'FLOAT2STRINGNC INSTR LEFT LEN LTRIM MID RIGHT RTRIM STRING STRINGNC TOLOWER TOUPPER TRIM '+'NUMDAYS READ_DATE STAGING',built_in:'IDENTIFIER OPTIONS XML_ELEMENT XML_OP XML_ELEMENT_OF DOMDOCCREATE DOMDOCLOADFILE DOMDOCLOADXML '+'DOMDOCSAVEFILE DOMDOCGETROOT DOMDOCADDPI DOMNODEGETNAME DOMNODEGETTYPE DOMNODEGETVALUE DOMNODEGETCHILDCT '+'DOMNODEGETFIRSTCHILD DOMNODEGETSIBLING DOMNODECREATECHILDELEMENT DOMNODESETATTRIBUTE '+'DOMNODEGETCHILDELEMENTCT DOMNODEGETFIRSTCHILDELEMENT DOMNODEGETSIBLINGELEMENT DOMNODEGETATTRIBUTECT '+'DOMNODEGETATTRIBUTEI DOMNODEGETATTRIBUTEBYNAME DOMNODEGETBYNAME'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{className:'literal',variants:[{begin:'#\\s+[a-zA-Z\\ \\.]*',relevance:0},// looks like #-comment
{begin:'#[a-zA-Z\\ \\.]+'}]}]};});hljs.registerLanguage('rust',function(hljs){var NUM_SUFFIX='([ui](8|16|32|64|128|size)|f(32|64))\?';var KEYWORDS='alignof as be box break const continue crate do else enum extern '+'false fn for if impl in let loop match mod mut offsetof once priv '+'proc pub pure ref return self Self sizeof static struct super trait true '+'type typeof unsafe unsized use virtual while where yield move default';var BUILTINS=// functions
'drop '+// types
'i8 i16 i32 i64 i128 isize '+'u8 u16 u32 u64 u128 usize '+'f32 f64 '+'str char bool '+'Box Option Result String Vec '+// traits
'Copy Send Sized Sync Drop Fn FnMut FnOnce ToOwned Clone Debug '+'PartialEq PartialOrd Eq Ord AsRef AsMut Into From Default Iterator '+'Extend IntoIterator DoubleEndedIterator ExactSizeIterator '+'SliceConcatExt ToString '+// macros
'assert! assert_eq! bitflags! bytes! cfg! col! concat! concat_idents! '+'debug_assert! debug_assert_eq! env! panic! file! format! format_args! '+'include_bin! include_str! line! local_data_key! module_path! '+'option_env! print! println! select! stringify! try! unimplemented! '+'unreachable! vec! write! writeln! macro_rules! assert_ne! debug_assert_ne!';return{aliases:['rs'],keywords:{keyword:KEYWORDS,literal:'true false Some None Ok Err',built_in:BUILTINS},lexemes:hljs.IDENT_RE+'!?',illegal:'</',contains:[hljs.C_LINE_COMMENT_MODE,hljs.COMMENT('/\\*','\\*/',{contains:['self']}),hljs.inherit(hljs.QUOTE_STRING_MODE,{begin:/b?"/,illegal:null}),{className:'string',variants:[{begin:/r(#*)".*?"\1(?!#)/},{begin:/b?'\\?(x\w{2}|u\w{4}|U\w{8}|.)'/}]},{className:'symbol',begin:/'[a-zA-Z_][a-zA-Z0-9_]*/},{className:'number',variants:[{begin:'\\b0b([01_]+)'+NUM_SUFFIX},{begin:'\\b0o([0-7_]+)'+NUM_SUFFIX},{begin:'\\b0x([A-Fa-f0-9_]+)'+NUM_SUFFIX},{begin:'\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)'+NUM_SUFFIX}],relevance:0},{className:'function',beginKeywords:'fn',end:'(\\(|<)',excludeEnd:true,contains:[hljs.UNDERSCORE_TITLE_MODE]},{className:'meta',begin:'#\\!?\\[',end:'\\]',contains:[{className:'meta-string',begin:/"/,end:/"/}]},{className:'class',beginKeywords:'type',end:';',contains:[hljs.inherit(hljs.UNDERSCORE_TITLE_MODE,{endsParent:true})],illegal:'\\S'},{className:'class',beginKeywords:'trait enum struct union',end:'{',contains:[hljs.inherit(hljs.UNDERSCORE_TITLE_MODE,{endsParent:true})],illegal:'[\\w\\d]'},{begin:hljs.IDENT_RE+'::',keywords:{built_in:BUILTINS}},{begin:'->'}]};});hljs.registerLanguage('scala',function(hljs){var ANNOTATION={className:'meta',begin:'@[A-Za-z]+'};// used in strings for escaping/interpolation/substitution
var SUBST={className:'subst',variants:[{begin:'\\$[A-Za-z0-9_]+'},{begin:'\\${',end:'}'}]};var STRING={className:'string',variants:[{begin:'"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE]},{begin:'"""',end:'"""',relevance:10},{begin:'[a-z]+"',end:'"',illegal:'\\n',contains:[hljs.BACKSLASH_ESCAPE,SUBST]},{className:'string',begin:'[a-z]+"""',end:'"""',contains:[SUBST],relevance:10}]};var SYMBOL={className:'symbol',begin:'\'\\w[\\w\\d_]*(?!\')'};var TYPE={className:'type',begin:'\\b[A-Z][A-Za-z0-9_]*',relevance:0};var NAME={className:'title',begin:/[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,relevance:0};var CLASS={className:'class',beginKeywords:'class object trait type',end:/[:={\[\n;]/,excludeEnd:true,contains:[{beginKeywords:'extends with',relevance:10},{begin:/\[/,end:/\]/,excludeBegin:true,excludeEnd:true,relevance:0,contains:[TYPE]},{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,relevance:0,contains:[TYPE]},NAME]};var METHOD={className:'function',beginKeywords:'def',end:/[:={\[(\n;]/,excludeEnd:true,contains:[NAME]};return{keywords:{literal:'true false null',keyword:'type yield lazy override def with val var sealed abstract private trait object if forSome for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,STRING,SYMBOL,TYPE,METHOD,CLASS,hljs.C_NUMBER_MODE,ANNOTATION]};});hljs.registerLanguage('scheme',function(hljs){var SCHEME_IDENT_RE='[^\\(\\)\\[\\]\\{\\}",\'`;#|\\\\\\s]+';var SCHEME_SIMPLE_NUMBER_RE='(\\-|\\+)?\\d+([./]\\d+)?';var SCHEME_COMPLEX_NUMBER_RE=SCHEME_SIMPLE_NUMBER_RE+'[+\\-]'+SCHEME_SIMPLE_NUMBER_RE+'i';var BUILTINS={'builtin-name':'case-lambda call/cc class define-class exit-handler field import '+'inherit init-field interface let*-values let-values let/ec mixin '+'opt-lambda override protect provide public rename require '+'require-for-syntax syntax syntax-case syntax-error unit/sig unless '+'when with-syntax and begin call-with-current-continuation '+'call-with-input-file call-with-output-file case cond define '+'define-syntax delay do dynamic-wind else for-each if lambda let let* '+'let-syntax letrec letrec-syntax map or syntax-rules \' * + , ,@ - ... / '+'; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan '+'boolean? caar cadr call-with-input-file call-with-output-file '+'call-with-values car cdddar cddddr cdr ceiling char->integer '+'char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? '+'char-downcase char-lower-case? char-numeric? char-ready? char-upcase '+'char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? '+'char? close-input-port close-output-port complex? cons cos '+'current-input-port current-output-port denominator display eof-object? '+'eq? equal? eqv? eval even? exact->inexact exact? exp expt floor '+'force gcd imag-part inexact->exact inexact? input-port? integer->char '+'integer? interaction-environment lcm length list list->string '+'list->vector list-ref list-tail list? load log magnitude make-polar '+'make-rectangular make-string make-vector max member memq memv min '+'modulo negative? newline not null-environment null? number->string '+'number? numerator odd? open-input-file open-output-file output-port? '+'pair? peek-char port? positive? procedure? quasiquote quote quotient '+'rational? rationalize read read-char real-part real? remainder reverse '+'round scheme-report-environment set! set-car! set-cdr! sin sqrt string '+'string->list string->number string->symbol string-append string-ci<=? '+'string-ci<? string-ci=? string-ci>=? string-ci>? string-copy '+'string-fill! string-length string-ref string-set! string<=? string<? '+'string=? string>=? string>? string? substring symbol->string symbol? '+'tan transcript-off transcript-on truncate values vector '+'vector->list vector-fill! vector-length vector-ref vector-set! '+'with-input-from-file with-output-to-file write write-char zero?'};var SHEBANG={className:'meta',begin:'^#!',end:'$'};var LITERAL={className:'literal',begin:'(#t|#f|#\\\\'+SCHEME_IDENT_RE+'|#\\\\.)'};var NUMBER={className:'number',variants:[{begin:SCHEME_SIMPLE_NUMBER_RE,relevance:0},{begin:SCHEME_COMPLEX_NUMBER_RE,relevance:0},{begin:'#b[0-1]+(/[0-1]+)?'},{begin:'#o[0-7]+(/[0-7]+)?'},{begin:'#x[0-9a-f]+(/[0-9a-f]+)?'}]};var STRING=hljs.QUOTE_STRING_MODE;var REGULAR_EXPRESSION={className:'regexp',begin:'#[pr]x"',end:'[^\\\\]"'};var COMMENT_MODES=[hljs.COMMENT(';','$',{relevance:0}),hljs.COMMENT('#\\|','\\|#')];var IDENT={begin:SCHEME_IDENT_RE,relevance:0};var QUOTED_IDENT={className:'symbol',begin:'\''+SCHEME_IDENT_RE};var BODY={endsWithParent:true,relevance:0};var QUOTED_LIST={variants:[{begin:/'/},{begin:'`'}],contains:[{begin:'\\(',end:'\\)',contains:['self',LITERAL,STRING,NUMBER,IDENT,QUOTED_IDENT]}]};var NAME={className:'name',begin:SCHEME_IDENT_RE,lexemes:SCHEME_IDENT_RE,keywords:BUILTINS};var LAMBDA={begin:/lambda/,endsWithParent:true,returnBegin:true,contains:[NAME,{begin:/\(/,end:/\)/,endsParent:true,contains:[IDENT]}]};var LIST={variants:[{begin:'\\(',end:'\\)'},{begin:'\\[',end:'\\]'}],contains:[LAMBDA,NAME,BODY]};BODY.contains=[LITERAL,NUMBER,STRING,IDENT,QUOTED_IDENT,QUOTED_LIST,LIST].concat(COMMENT_MODES);return{illegal:/\S/,contains:[SHEBANG,NUMBER,STRING,QUOTED_IDENT,QUOTED_LIST,LIST].concat(COMMENT_MODES)};});hljs.registerLanguage('scilab',function(hljs){var COMMON_CONTAINS=[hljs.C_NUMBER_MODE,{className:'string',begin:'\'|\"',end:'\'|\"',contains:[hljs.BACKSLASH_ESCAPE,{begin:'\'\''}]}];return{aliases:['sci'],lexemes:/%?\w+/,keywords:{keyword:'abort break case clear catch continue do elseif else endfunction end for function '+'global if pause return resume select try then while',literal:'%f %F %t %T %pi %eps %inf %nan %e %i %z %s',built_in:// Scilab has more than 2000 functions. Just list the most commons
'abs and acos asin atan ceil cd chdir clearglobal cosh cos cumprod deff disp error '+'exec execstr exists exp eye gettext floor fprintf fread fsolve imag isdef isempty '+'isinfisnan isvector lasterror length load linspace list listfiles log10 log2 log '+'max min msprintf mclose mopen ones or pathconvert poly printf prod pwd rand real '+'round sinh sin size gsort sprintf sqrt strcat strcmps tring sum system tanh tan '+'type typename warning zeros matrix'},illegal:'("|#|/\\*|\\s+/\\w+)',contains:[{className:'function',beginKeywords:'function',end:'$',contains:[hljs.UNDERSCORE_TITLE_MODE,{className:'params',begin:'\\(',end:'\\)'}]},{begin:'[a-zA-Z_][a-zA-Z_0-9]*(\'+[\\.\']*|[\\.\']+)',end:'',relevance:0},{begin:'\\[',end:'\\]\'*[\\.\']*',relevance:0,contains:COMMON_CONTAINS},hljs.COMMENT('//','$')].concat(COMMON_CONTAINS)};});hljs.registerLanguage('scss',function(hljs){var IDENT_RE='[a-zA-Z-][a-zA-Z0-9_-]*';var VARIABLE={className:'variable',begin:'(\\$'+IDENT_RE+')\\b'};var HEXCOLOR={className:'number',begin:'#[0-9A-Fa-f]+'};var DEF_INTERNALS={className:'attribute',begin:'[A-Z\\_\\.\\-]+',end:':',excludeEnd:true,illegal:'[^\\s]',starts:{endsWithParent:true,excludeEnd:true,contains:[HEXCOLOR,hljs.CSS_NUMBER_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'meta',begin:'!important'}]}};return{case_insensitive:true,illegal:'[=/|\']',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'selector-id',begin:'\\#[A-Za-z0-9_-]+',relevance:0},{className:'selector-class',begin:'\\.[A-Za-z0-9_-]+',relevance:0},{className:'selector-attr',begin:'\\[',end:'\\]',illegal:'$'},{className:'selector-tag',// begin: IDENT_RE, end: '[,|\\s]'
begin:'\\b(a|abbr|acronym|address|area|article|aside|audio|b|base|big|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|command|datalist|dd|del|details|dfn|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|frame|frameset|(h[1-6])|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|map|mark|meta|meter|nav|noframes|noscript|object|ol|optgroup|option|output|p|param|pre|progress|q|rp|rt|ruby|samp|script|section|select|small|span|strike|strong|style|sub|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|tt|ul|var|video)\\b',relevance:0},{begin:':(visited|valid|root|right|required|read-write|read-only|out-range|optional|only-of-type|only-child|nth-of-type|nth-last-of-type|nth-last-child|nth-child|not|link|left|last-of-type|last-child|lang|invalid|indeterminate|in-range|hover|focus|first-of-type|first-line|first-letter|first-child|first|enabled|empty|disabled|default|checked|before|after|active)'},{begin:'::(after|before|choices|first-letter|first-line|repeat-index|repeat-item|selection|value)'},VARIABLE,{className:'attribute',begin:'\\b(z-index|word-wrap|word-spacing|word-break|width|widows|white-space|visibility|vertical-align|unicode-bidi|transition-timing-function|transition-property|transition-duration|transition-delay|transition|transform-style|transform-origin|transform|top|text-underline-position|text-transform|text-shadow|text-rendering|text-overflow|text-indent|text-decoration-style|text-decoration-line|text-decoration-color|text-decoration|text-align-last|text-align|tab-size|table-layout|right|resize|quotes|position|pointer-events|perspective-origin|perspective|page-break-inside|page-break-before|page-break-after|padding-top|padding-right|padding-left|padding-bottom|padding|overflow-y|overflow-x|overflow-wrap|overflow|outline-width|outline-style|outline-offset|outline-color|outline|orphans|order|opacity|object-position|object-fit|normal|none|nav-up|nav-right|nav-left|nav-index|nav-down|min-width|min-height|max-width|max-height|mask|marks|margin-top|margin-right|margin-left|margin-bottom|margin|list-style-type|list-style-position|list-style-image|list-style|line-height|letter-spacing|left|justify-content|initial|inherit|ime-mode|image-orientation|image-resolution|image-rendering|icon|hyphens|height|font-weight|font-variant-ligatures|font-variant|font-style|font-stretch|font-size-adjust|font-size|font-language-override|font-kerning|font-feature-settings|font-family|font|float|flex-wrap|flex-shrink|flex-grow|flex-flow|flex-direction|flex-basis|flex|filter|empty-cells|display|direction|cursor|counter-reset|counter-increment|content|column-width|column-span|column-rule-width|column-rule-style|column-rule-color|column-rule|column-gap|column-fill|column-count|columns|color|clip-path|clip|clear|caption-side|break-inside|break-before|break-after|box-sizing|box-shadow|box-decoration-break|bottom|border-width|border-top-width|border-top-style|border-top-right-radius|border-top-left-radius|border-top-color|border-top|border-style|border-spacing|border-right-width|border-right-style|border-right-color|border-right|border-radius|border-left-width|border-left-style|border-left-color|border-left|border-image-width|border-image-source|border-image-slice|border-image-repeat|border-image-outset|border-image|border-color|border-collapse|border-bottom-width|border-bottom-style|border-bottom-right-radius|border-bottom-left-radius|border-bottom-color|border-bottom|border|background-size|background-repeat|background-position|background-origin|background-image|background-color|background-clip|background-attachment|background-blend-mode|background|backface-visibility|auto|animation-timing-function|animation-play-state|animation-name|animation-iteration-count|animation-fill-mode|animation-duration|animation-direction|animation-delay|animation|align-self|align-items|align-content)\\b',illegal:'[^\\s]'},{begin:'\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'},{begin:':',end:';',contains:[VARIABLE,HEXCOLOR,hljs.CSS_NUMBER_MODE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,{className:'meta',begin:'!important'}]},{begin:'@',end:'[{;]',keywords:'mixin include extend for if else each while charset import debug media page content font-face namespace warn',contains:[VARIABLE,hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,HEXCOLOR,hljs.CSS_NUMBER_MODE,{begin:'\\s[A-Za-z0-9_.-]+',relevance:0}]}]};});hljs.registerLanguage('smali',function(hljs){var smali_instr_low_prio=['add','and','cmp','cmpg','cmpl','const','div','double','float','goto','if','int','long','move','mul','neg','new','nop','not','or','rem','return','shl','shr','sput','sub','throw','ushr','xor'];var smali_instr_high_prio=['aget','aput','array','check','execute','fill','filled','goto/16','goto/32','iget','instance','invoke','iput','monitor','packed','sget','sparse'];var smali_keywords=['transient','constructor','abstract','final','synthetic','public','private','protected','static','bridge','system'];return{aliases:['smali'],contains:[{className:'string',begin:'"',end:'"',relevance:0},hljs.COMMENT('#','$',{relevance:0}),{className:'keyword',variants:[{begin:'\\s*\\.end\\s[a-zA-Z0-9]*'},{begin:'^[ ]*\\.[a-zA-Z]*',relevance:0},{begin:'\\s:[a-zA-Z_0-9]*',relevance:0},{begin:'\\s('+smali_keywords.join('|')+')'}]},{className:'built_in',variants:[{begin:'\\s('+smali_instr_low_prio.join('|')+')\\s'},{begin:'\\s('+smali_instr_low_prio.join('|')+')((\\-|/)[a-zA-Z0-9]+)+\\s',relevance:10},{begin:'\\s('+smali_instr_high_prio.join('|')+')((\\-|/)[a-zA-Z0-9]+)*\\s',relevance:10}]},{className:'class',begin:'L[^\(;:\n]*;',relevance:0},{begin:'[vp][0-9]+'}]};});hljs.registerLanguage('smalltalk',function(hljs){var VAR_IDENT_RE='[a-z][a-zA-Z0-9_]*';var CHAR={className:'string',begin:'\\$.{1}'};var SYMBOL={className:'symbol',begin:'#'+hljs.UNDERSCORE_IDENT_RE};return{aliases:['st'],keywords:'self super nil true false thisContext',// only 6
contains:[hljs.COMMENT('"','"'),hljs.APOS_STRING_MODE,{className:'type',begin:'\\b[A-Z][A-Za-z0-9_]*',relevance:0},{begin:VAR_IDENT_RE+':',relevance:0},hljs.C_NUMBER_MODE,SYMBOL,CHAR,{// This looks more complicated than needed to avoid combinatorial
// explosion under V8. It effectively means `| var1 var2 ... |` with
// whitespace adjacent to `|` being optional.
begin:'\\|[ ]*'+VAR_IDENT_RE+'([ ]+'+VAR_IDENT_RE+')*[ ]*\\|',returnBegin:true,end:/\|/,illegal:/\S/,contains:[{begin:'(\\|[ ]*)?'+VAR_IDENT_RE}]},{begin:'\\#\\(',end:'\\)',contains:[hljs.APOS_STRING_MODE,CHAR,hljs.C_NUMBER_MODE,SYMBOL]}]};});hljs.registerLanguage('sml',function(hljs){return{aliases:['ml'],keywords:{keyword:/* according to Definition of Standard ML 97  */'abstype and andalso as case datatype do else end eqtype '+'exception fn fun functor handle if in include infix infixr '+'let local nonfix of op open orelse raise rec sharing sig '+'signature struct structure then type val with withtype where while',built_in:/* built-in types according to basis library */'array bool char exn int list option order real ref string substring vector unit word',literal:'true false NONE SOME LESS EQUAL GREATER nil'},illegal:/\/\/|>>/,lexemes:'[a-z_]\\w*!?',contains:[{className:'literal',begin:/\[(\|\|)?\]|\(\)/,relevance:0},hljs.COMMENT('\\(\\*','\\*\\)',{contains:['self']}),{/* type variable */className:'symbol',begin:'\'[A-Za-z_](?!\')[\\w\']*'/* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */},{/* polymorphic variant */className:'type',begin:'`[A-Z][\\w\']*'},{/* module or constructor */className:'type',begin:'\\b[A-Z][\\w\']*',relevance:0},{/* don't color identifiers, but safely catch all identifiers with '*/begin:'[a-z_]\\w*\'[\\w\']*'},hljs.inherit(hljs.APOS_STRING_MODE,{className:'string',relevance:0}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),{className:'number',begin:'\\b(0[xX][a-fA-F0-9_]+[Lln]?|'+'0[oO][0-7_]+[Lln]?|'+'0[bB][01_]+[Lln]?|'+'[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',relevance:0},{begin:/[-=]>/// relevance booster
}]};});hljs.registerLanguage('sqf',function(hljs){var CPP=hljs.getLanguage('cpp').exports;// In SQF, a variable start with _
var VARIABLE={className:'variable',begin:/\b_+[a-zA-Z_]\w*/};// In SQF, a function should fit myTag_fnc_myFunction pattern
// https://community.bistudio.com/wiki/Functions_Library_(Arma_3)#Adding_a_Function
var FUNCTION={className:'title',begin:/[a-zA-Z][a-zA-Z0-9]+_fnc_\w*/};// In SQF strings, quotes matching the start are escaped by adding a consecutive.
// Example of single escaped quotes: " "" " and  ' '' '.
var STRINGS={className:'string',variants:[{begin:'"',end:'"',contains:[{begin:'""',relevance:0}]},{begin:'\'',end:'\'',contains:[{begin:'\'\'',relevance:0}]}]};return{aliases:['sqf'],case_insensitive:true,keywords:{keyword:'case catch default do else exit exitWith for forEach from if '+'switch then throw to try waitUntil while with',built_in:'abs accTime acos action actionIDs actionKeys actionKeysImages actionKeysNames '+'actionKeysNamesArray actionName actionParams activateAddons activatedAddons activateKey '+'add3DENConnection add3DENEventHandler add3DENLayer addAction addBackpack addBackpackCargo '+'addBackpackCargoGlobal addBackpackGlobal addCamShake addCuratorAddons addCuratorCameraArea '+'addCuratorEditableObjects addCuratorEditingArea addCuratorPoints addEditorObject addEventHandler '+'addGoggles addGroupIcon addHandgunItem addHeadgear addItem addItemCargo addItemCargoGlobal '+'addItemPool addItemToBackpack addItemToUniform addItemToVest addLiveStats addMagazine '+'addMagazineAmmoCargo addMagazineCargo addMagazineCargoGlobal addMagazineGlobal addMagazinePool '+'addMagazines addMagazineTurret addMenu addMenuItem addMissionEventHandler addMPEventHandler '+'addMusicEventHandler addOwnedMine addPlayerScores addPrimaryWeaponItem '+'addPublicVariableEventHandler addRating addResources addScore addScoreSide addSecondaryWeaponItem '+'addSwitchableUnit addTeamMember addToRemainsCollector addUniform addVehicle addVest addWaypoint '+'addWeapon addWeaponCargo addWeaponCargoGlobal addWeaponGlobal addWeaponItem addWeaponPool '+'addWeaponTurret agent agents AGLToASL aimedAtTarget aimPos airDensityRTD airportSide '+'AISFinishHeal alive all3DENEntities allControls allCurators allCutLayers allDead allDeadMen '+'allDisplays allGroups allMapMarkers allMines allMissionObjects allow3DMode allowCrewInImmobile '+'allowCuratorLogicIgnoreAreas allowDamage allowDammage allowFileOperations allowFleeing allowGetIn '+'allowSprint allPlayers allSites allTurrets allUnits allUnitsUAV allVariables ammo and animate '+'animateDoor animateSource animationNames animationPhase animationSourcePhase animationState '+'append apply armoryPoints arrayIntersect asin ASLToAGL ASLToATL assert assignAsCargo '+'assignAsCargoIndex assignAsCommander assignAsDriver assignAsGunner assignAsTurret assignCurator '+'assignedCargo assignedCommander assignedDriver assignedGunner assignedItems assignedTarget '+'assignedTeam assignedVehicle assignedVehicleRole assignItem assignTeam assignToAirport atan atan2 '+'atg ATLToASL attachedObject attachedObjects attachedTo attachObject attachTo attackEnabled '+'backpack backpackCargo backpackContainer backpackItems backpackMagazines backpackSpaceFor '+'behaviour benchmark binocular blufor boundingBox boundingBoxReal boundingCenter breakOut breakTo '+'briefingName buildingExit buildingPos buttonAction buttonSetAction cadetMode call callExtension '+'camCommand camCommit camCommitPrepared camCommitted camConstuctionSetParams camCreate camDestroy '+'cameraEffect cameraEffectEnableHUD cameraInterest cameraOn cameraView campaignConfigFile '+'camPreload camPreloaded camPrepareBank camPrepareDir camPrepareDive camPrepareFocus camPrepareFov '+'camPrepareFovRange camPreparePos camPrepareRelPos camPrepareTarget camSetBank camSetDir '+'camSetDive camSetFocus camSetFov camSetFovRange camSetPos camSetRelPos camSetTarget camTarget '+'camUseNVG canAdd canAddItemToBackpack canAddItemToUniform canAddItemToVest '+'cancelSimpleTaskDestination canFire canMove canSlingLoad canStand canSuspend canUnloadInCombat '+'canVehicleCargo captive captiveNum cbChecked cbSetChecked ceil channelEnabled cheatsEnabled '+'checkAIFeature checkVisibility civilian className clearAllItemsFromBackpack clearBackpackCargo '+'clearBackpackCargoGlobal clearGroupIcons clearItemCargo clearItemCargoGlobal clearItemPool '+'clearMagazineCargo clearMagazineCargoGlobal clearMagazinePool clearOverlay clearRadio '+'clearWeaponCargo clearWeaponCargoGlobal clearWeaponPool clientOwner closeDialog closeDisplay '+'closeOverlay collapseObjectTree collect3DENHistory combatMode commandArtilleryFire commandChat '+'commander commandFire commandFollow commandFSM commandGetOut commandingMenu commandMove '+'commandRadio commandStop commandSuppressiveFire commandTarget commandWatch comment commitOverlay '+'compile compileFinal completedFSM composeText configClasses configFile configHierarchy configName '+'configNull configProperties configSourceAddonList configSourceMod configSourceModList '+'connectTerminalToUAV controlNull controlsGroupCtrl copyFromClipboard copyToClipboard '+'copyWaypoints cos count countEnemy countFriendly countSide countType countUnknown '+'create3DENComposition create3DENEntity createAgent createCenter createDialog createDiaryLink '+'createDiaryRecord createDiarySubject createDisplay createGearDialog createGroup '+'createGuardedPoint createLocation createMarker createMarkerLocal createMenu createMine '+'createMissionDisplay createMPCampaignDisplay createSimpleObject createSimpleTask createSite '+'createSoundSource createTask createTeam createTrigger createUnit createVehicle createVehicleCrew '+'createVehicleLocal crew ctrlActivate ctrlAddEventHandler ctrlAngle ctrlAutoScrollDelay '+'ctrlAutoScrollRewind ctrlAutoScrollSpeed ctrlChecked ctrlClassName ctrlCommit ctrlCommitted '+'ctrlCreate ctrlDelete ctrlEnable ctrlEnabled ctrlFade ctrlHTMLLoaded ctrlIDC ctrlIDD '+'ctrlMapAnimAdd ctrlMapAnimClear ctrlMapAnimCommit ctrlMapAnimDone ctrlMapCursor ctrlMapMouseOver '+'ctrlMapScale ctrlMapScreenToWorld ctrlMapWorldToScreen ctrlModel ctrlModelDirAndUp ctrlModelScale '+'ctrlParent ctrlParentControlsGroup ctrlPosition ctrlRemoveAllEventHandlers ctrlRemoveEventHandler '+'ctrlScale ctrlSetActiveColor ctrlSetAngle ctrlSetAutoScrollDelay ctrlSetAutoScrollRewind '+'ctrlSetAutoScrollSpeed ctrlSetBackgroundColor ctrlSetChecked ctrlSetEventHandler ctrlSetFade '+'ctrlSetFocus ctrlSetFont ctrlSetFontH1 ctrlSetFontH1B ctrlSetFontH2 ctrlSetFontH2B ctrlSetFontH3 '+'ctrlSetFontH3B ctrlSetFontH4 ctrlSetFontH4B ctrlSetFontH5 ctrlSetFontH5B ctrlSetFontH6 '+'ctrlSetFontH6B ctrlSetFontHeight ctrlSetFontHeightH1 ctrlSetFontHeightH2 ctrlSetFontHeightH3 '+'ctrlSetFontHeightH4 ctrlSetFontHeightH5 ctrlSetFontHeightH6 ctrlSetFontHeightSecondary '+'ctrlSetFontP ctrlSetFontPB ctrlSetFontSecondary ctrlSetForegroundColor ctrlSetModel '+'ctrlSetModelDirAndUp ctrlSetModelScale ctrlSetPosition ctrlSetScale ctrlSetStructuredText '+'ctrlSetText ctrlSetTextColor ctrlSetTooltip ctrlSetTooltipColorBox ctrlSetTooltipColorShade '+'ctrlSetTooltipColorText ctrlShow ctrlShown ctrlText ctrlTextHeight ctrlType ctrlVisible '+'curatorAddons curatorCamera curatorCameraArea curatorCameraAreaCeiling curatorCoef '+'curatorEditableObjects curatorEditingArea curatorEditingAreaType curatorMouseOver curatorPoints '+'curatorRegisteredObjects curatorSelected curatorWaypointCost current3DENOperation currentChannel '+'currentCommand currentMagazine currentMagazineDetail currentMagazineDetailTurret '+'currentMagazineTurret currentMuzzle currentNamespace currentTask currentTasks currentThrowable '+'currentVisionMode currentWaypoint currentWeapon currentWeaponMode currentWeaponTurret '+'currentZeroing cursorObject cursorTarget customChat customRadio cutFadeOut cutObj cutRsc cutText '+'damage date dateToNumber daytime deActivateKey debriefingText debugFSM debugLog deg '+'delete3DENEntities deleteAt deleteCenter deleteCollection deleteEditorObject deleteGroup '+'deleteIdentity deleteLocation deleteMarker deleteMarkerLocal deleteRange deleteResources '+'deleteSite deleteStatus deleteTeam deleteVehicle deleteVehicleCrew deleteWaypoint detach '+'detectedMines diag_activeMissionFSMs diag_activeScripts diag_activeSQFScripts '+'diag_activeSQSScripts diag_captureFrame diag_captureSlowFrame diag_codePerformance diag_drawMode '+'diag_enable diag_enabled diag_fps diag_fpsMin diag_frameNo diag_list diag_log diag_logSlowFrame '+'diag_mergeConfigFile diag_recordTurretLimits diag_tickTime diag_toggle dialog diarySubjectExists '+'didJIP didJIPOwner difficulty difficultyEnabled difficultyEnabledRTD difficultyOption direction '+'directSay disableAI disableCollisionWith disableConversation disableDebriefingStats '+'disableNVGEquipment disableRemoteSensors disableSerialization disableTIEquipment '+'disableUAVConnectability disableUserInput displayAddEventHandler displayCtrl displayNull '+'displayParent displayRemoveAllEventHandlers displayRemoveEventHandler displaySetEventHandler '+'dissolveTeam distance distance2D distanceSqr distributionRegion do3DENAction doArtilleryFire '+'doFire doFollow doFSM doGetOut doMove doorPhase doStop doSuppressiveFire doTarget doWatch '+'drawArrow drawEllipse drawIcon drawIcon3D drawLine drawLine3D drawLink drawLocation drawPolygon '+'drawRectangle driver drop east echo edit3DENMissionAttributes editObject editorSetEventHandler '+'effectiveCommander emptyPositions enableAI enableAIFeature enableAimPrecision enableAttack '+'enableAudioFeature enableCamShake enableCaustics enableChannel enableCollisionWith enableCopilot '+'enableDebriefingStats enableDiagLegend enableEndDialog enableEngineArtillery enableEnvironment '+'enableFatigue enableGunLights enableIRLasers enableMimics enablePersonTurret enableRadio '+'enableReload enableRopeAttach enableSatNormalOnDetail enableSaving enableSentences '+'enableSimulation enableSimulationGlobal enableStamina enableTeamSwitch enableUAVConnectability '+'enableUAVWaypoints enableVehicleCargo endLoadingScreen endMission engineOn enginesIsOnRTD '+'enginesRpmRTD enginesTorqueRTD entities estimatedEndServerTime estimatedTimeLeft '+'evalObjectArgument everyBackpack everyContainer exec execEditorScript execFSM execVM exp '+'expectedDestination exportJIPMessages eyeDirection eyePos face faction fadeMusic fadeRadio '+'fadeSound fadeSpeech failMission fillWeaponsFromPool find findCover findDisplay findEditorObject '+'findEmptyPosition findEmptyPositionReady findNearestEnemy finishMissionInit finite fire '+'fireAtTarget firstBackpack flag flagOwner flagSide flagTexture fleeing floor flyInHeight '+'flyInHeightASL fog fogForecast fogParams forceAddUniform forcedMap forceEnd forceMap forceRespawn '+'forceSpeed forceWalk forceWeaponFire forceWeatherChange forEachMember forEachMemberAgent '+'forEachMemberTeam format formation formationDirection formationLeader formationMembers '+'formationPosition formationTask formatText formLeader freeLook fromEditor fuel fullCrew '+'gearIDCAmmoCount gearSlotAmmoCount gearSlotData get3DENActionState get3DENAttribute get3DENCamera '+'get3DENConnections get3DENEntity get3DENEntityID get3DENGrid get3DENIconsVisible '+'get3DENLayerEntities get3DENLinesVisible get3DENMissionAttribute get3DENMouseOver get3DENSelected '+'getAimingCoef getAllHitPointsDamage getAllOwnedMines getAmmoCargo getAnimAimPrecision '+'getAnimSpeedCoef getArray getArtilleryAmmo getArtilleryComputerSettings getArtilleryETA '+'getAssignedCuratorLogic getAssignedCuratorUnit getBackpackCargo getBleedingRemaining '+'getBurningValue getCameraViewDirection getCargoIndex getCenterOfMass getClientState '+'getClientStateNumber getConnectedUAV getCustomAimingCoef getDammage getDescription getDir '+'getDirVisual getDLCs getEditorCamera getEditorMode getEditorObjectScope getElevationOffset '+'getFatigue getFriend getFSMVariable getFuelCargo getGroupIcon getGroupIconParams getGroupIcons '+'getHideFrom getHit getHitIndex getHitPointDamage getItemCargo getMagazineCargo getMarkerColor '+'getMarkerPos getMarkerSize getMarkerType getMass getMissionConfig getMissionConfigValue '+'getMissionDLCs getMissionLayerEntities getModelInfo getMousePosition getNumber getObjectArgument '+'getObjectChildren getObjectDLC getObjectMaterials getObjectProxy getObjectTextures getObjectType '+'getObjectViewDistance getOxygenRemaining getPersonUsedDLCs getPilotCameraDirection '+'getPilotCameraPosition getPilotCameraRotation getPilotCameraTarget getPlayerChannel '+'getPlayerScores getPlayerUID getPos getPosASL getPosASLVisual getPosASLW getPosATL '+'getPosATLVisual getPosVisual getPosWorld getRelDir getRelPos getRemoteSensorsDisabled '+'getRepairCargo getResolution getShadowDistance getShotParents getSlingLoad getSpeed getStamina '+'getStatValue getSuppression getTerrainHeightASL getText getUnitLoadout getUnitTrait getVariable '+'getVehicleCargo getWeaponCargo getWeaponSway getWPPos glanceAt globalChat globalRadio goggles '+'goto group groupChat groupFromNetId groupIconSelectable groupIconsVisible groupId groupOwner '+'groupRadio groupSelectedUnits groupSelectUnit grpNull gunner gusts halt handgunItems '+'handgunMagazine handgunWeapon handsHit hasInterface hasPilotCamera hasWeapon hcAllGroups '+'hcGroupParams hcLeader hcRemoveAllGroups hcRemoveGroup hcSelected hcSelectGroup hcSetGroup '+'hcShowBar hcShownBar headgear hideBody hideObject hideObjectGlobal hideSelection hint hintC '+'hintCadet hintSilent hmd hostMission htmlLoad HUDMovementLevels humidity image importAllGroups '+'importance in inArea inAreaArray incapacitatedState independent inflame inflamed '+'inGameUISetEventHandler inheritsFrom initAmbientLife inPolygon inputAction inRangeOfArtillery '+'insertEditorObject intersect is3DEN is3DENMultiplayer isAbleToBreathe isAgent isArray '+'isAutoHoverOn isAutonomous isAutotest isBleeding isBurning isClass isCollisionLightOn '+'isCopilotEnabled isDedicated isDLCAvailable isEngineOn isEqualTo isEqualType isEqualTypeAll '+'isEqualTypeAny isEqualTypeArray isEqualTypeParams isFilePatchingEnabled isFlashlightOn '+'isFlatEmpty isForcedWalk isFormationLeader isHidden isInRemainsCollector '+'isInstructorFigureEnabled isIRLaserOn isKeyActive isKindOf isLightOn isLocalized isManualFire '+'isMarkedForCollection isMultiplayer isMultiplayerSolo isNil isNull isNumber isObjectHidden '+'isObjectRTD isOnRoad isPipEnabled isPlayer isRealTime isRemoteExecuted isRemoteExecutedJIP '+'isServer isShowing3DIcons isSprintAllowed isStaminaEnabled isSteamMission '+'isStreamFriendlyUIEnabled isText isTouchingGround isTurnedOut isTutHintsEnabled isUAVConnectable '+'isUAVConnected isUniformAllowed isVehicleCargo isWalking isWeaponDeployed isWeaponRested '+'itemCargo items itemsWithMagazines join joinAs joinAsSilent joinSilent joinString kbAddDatabase '+'kbAddDatabaseTargets kbAddTopic kbHasTopic kbReact kbRemoveTopic kbTell kbWasSaid keyImage '+'keyName knowsAbout land landAt landResult language laserTarget lbAdd lbClear lbColor lbCurSel '+'lbData lbDelete lbIsSelected lbPicture lbSelection lbSetColor lbSetCurSel lbSetData lbSetPicture '+'lbSetPictureColor lbSetPictureColorDisabled lbSetPictureColorSelected lbSetSelectColor '+'lbSetSelectColorRight lbSetSelected lbSetTooltip lbSetValue lbSize lbSort lbSortByValue lbText '+'lbValue leader leaderboardDeInit leaderboardGetRows leaderboardInit leaveVehicle libraryCredits '+'libraryDisclaimers lifeState lightAttachObject lightDetachObject lightIsOn lightnings limitSpeed '+'linearConversion lineBreak lineIntersects lineIntersectsObjs lineIntersectsSurfaces '+'lineIntersectsWith linkItem list listObjects ln lnbAddArray lnbAddColumn lnbAddRow lnbClear '+'lnbColor lnbCurSelRow lnbData lnbDeleteColumn lnbDeleteRow lnbGetColumnsPosition lnbPicture '+'lnbSetColor lnbSetColumnsPos lnbSetCurSelRow lnbSetData lnbSetPicture lnbSetText lnbSetValue '+'lnbSize lnbText lnbValue load loadAbs loadBackpack loadFile loadGame loadIdentity loadMagazine '+'loadOverlay loadStatus loadUniform loadVest local localize locationNull locationPosition lock '+'lockCameraTo lockCargo lockDriver locked lockedCargo lockedDriver lockedTurret lockIdentity '+'lockTurret lockWP log logEntities logNetwork logNetworkTerminate lookAt lookAtPos magazineCargo '+'magazines magazinesAllTurrets magazinesAmmo magazinesAmmoCargo magazinesAmmoFull magazinesDetail '+'magazinesDetailBackpack magazinesDetailUniform magazinesDetailVest magazinesTurret '+'magazineTurretAmmo mapAnimAdd mapAnimClear mapAnimCommit mapAnimDone mapCenterOnCamera '+'mapGridPosition markAsFinishedOnSteam markerAlpha markerBrush markerColor markerDir markerPos '+'markerShape markerSize markerText markerType max members menuAction menuAdd menuChecked menuClear '+'menuCollapse menuData menuDelete menuEnable menuEnabled menuExpand menuHover menuPicture '+'menuSetAction menuSetCheck menuSetData menuSetPicture menuSetValue menuShortcut menuShortcutText '+'menuSize menuSort menuText menuURL menuValue min mineActive mineDetectedBy missionConfigFile '+'missionDifficulty missionName missionNamespace missionStart missionVersion mod modelToWorld '+'modelToWorldVisual modParams moonIntensity moonPhase morale move move3DENCamera moveInAny '+'moveInCargo moveInCommander moveInDriver moveInGunner moveInTurret moveObjectToEnd moveOut '+'moveTime moveTo moveToCompleted moveToFailed musicVolume name nameSound nearEntities '+'nearestBuilding nearestLocation nearestLocations nearestLocationWithDubbing nearestObject '+'nearestObjects nearestTerrainObjects nearObjects nearObjectsReady nearRoads nearSupplies '+'nearTargets needReload netId netObjNull newOverlay nextMenuItemIndex nextWeatherChange nMenuItems '+'not numberToDate objectCurators objectFromNetId objectParent objNull objStatus onBriefingGroup '+'onBriefingNotes onBriefingPlan onBriefingTeamSwitch onCommandModeChanged onDoubleClick '+'onEachFrame onGroupIconClick onGroupIconOverEnter onGroupIconOverLeave onHCGroupSelectionChanged '+'onMapSingleClick onPlayerConnected onPlayerDisconnected onPreloadFinished onPreloadStarted '+'onShowNewObject onTeamSwitch openCuratorInterface openDLCPage openMap openYoutubeVideo opfor or '+'orderGetIn overcast overcastForecast owner param params parseNumber parseText parsingNamespace '+'particlesQuality pi pickWeaponPool pitch pixelGrid pixelGridBase pixelGridNoUIScale pixelH pixelW '+'playableSlotsNumber playableUnits playAction playActionNow player playerRespawnTime playerSide '+'playersNumber playGesture playMission playMove playMoveNow playMusic playScriptedMission '+'playSound playSound3D position positionCameraToWorld posScreenToWorld posWorldToScreen '+'ppEffectAdjust ppEffectCommit ppEffectCommitted ppEffectCreate ppEffectDestroy ppEffectEnable '+'ppEffectEnabled ppEffectForceInNVG precision preloadCamera preloadObject preloadSound '+'preloadTitleObj preloadTitleRsc preprocessFile preprocessFileLineNumbers primaryWeapon '+'primaryWeaponItems primaryWeaponMagazine priority private processDiaryLink productVersion '+'profileName profileNamespace profileNameSteam progressLoadingScreen progressPosition '+'progressSetPosition publicVariable publicVariableClient publicVariableServer pushBack '+'pushBackUnique putWeaponPool queryItemsPool queryMagazinePool queryWeaponPool rad radioChannelAdd '+'radioChannelCreate radioChannelRemove radioChannelSetCallSign radioChannelSetLabel radioVolume '+'rain rainbow random rank rankId rating rectangular registeredTasks registerTask reload '+'reloadEnabled remoteControl remoteExec remoteExecCall remove3DENConnection remove3DENEventHandler '+'remove3DENLayer removeAction removeAll3DENEventHandlers removeAllActions removeAllAssignedItems '+'removeAllContainers removeAllCuratorAddons removeAllCuratorCameraAreas '+'removeAllCuratorEditingAreas removeAllEventHandlers removeAllHandgunItems removeAllItems '+'removeAllItemsWithMagazines removeAllMissionEventHandlers removeAllMPEventHandlers '+'removeAllMusicEventHandlers removeAllOwnedMines removeAllPrimaryWeaponItems removeAllWeapons '+'removeBackpack removeBackpackGlobal removeCuratorAddons removeCuratorCameraArea '+'removeCuratorEditableObjects removeCuratorEditingArea removeDrawIcon removeDrawLinks '+'removeEventHandler removeFromRemainsCollector removeGoggles removeGroupIcon removeHandgunItem '+'removeHeadgear removeItem removeItemFromBackpack removeItemFromUniform removeItemFromVest '+'removeItems removeMagazine removeMagazineGlobal removeMagazines removeMagazinesTurret '+'removeMagazineTurret removeMenuItem removeMissionEventHandler removeMPEventHandler '+'removeMusicEventHandler removeOwnedMine removePrimaryWeaponItem removeSecondaryWeaponItem '+'removeSimpleTask removeSwitchableUnit removeTeamMember removeUniform removeVest removeWeapon '+'removeWeaponGlobal removeWeaponTurret requiredVersion resetCamShake resetSubgroupDirection '+'resistance resize resources respawnVehicle restartEditorCamera reveal revealMine reverse '+'reversedMouseY roadAt roadsConnectedTo roleDescription ropeAttachedObjects ropeAttachedTo '+'ropeAttachEnabled ropeAttachTo ropeCreate ropeCut ropeDestroy ropeDetach ropeEndPosition '+'ropeLength ropes ropeUnwind ropeUnwound rotorsForcesRTD rotorsRpmRTD round runInitScript '+'safeZoneH safeZoneW safeZoneWAbs safeZoneX safeZoneXAbs safeZoneY save3DENInventory saveGame '+'saveIdentity saveJoysticks saveOverlay saveProfileNamespace saveStatus saveVar savingEnabled say '+'say2D say3D scopeName score scoreSide screenshot screenToWorld scriptDone scriptName scriptNull '+'scudState secondaryWeapon secondaryWeaponItems secondaryWeaponMagazine select selectBestPlaces '+'selectDiarySubject selectedEditorObjects selectEditorObject selectionNames selectionPosition '+'selectLeader selectMax selectMin selectNoPlayer selectPlayer selectRandom selectWeapon '+'selectWeaponTurret sendAUMessage sendSimpleCommand sendTask sendTaskResult sendUDPMessage '+'serverCommand serverCommandAvailable serverCommandExecutable serverName serverTime set '+'set3DENAttribute set3DENAttributes set3DENGrid set3DENIconsVisible set3DENLayer '+'set3DENLinesVisible set3DENMissionAttributes set3DENModelsVisible set3DENObjectType '+'set3DENSelected setAccTime setAirportSide setAmmo setAmmoCargo setAnimSpeedCoef setAperture '+'setApertureNew setArmoryPoints setAttributes setAutonomous setBehaviour setBleedingRemaining '+'setCameraInterest setCamShakeDefParams setCamShakeParams setCamUseTi setCaptive setCenterOfMass '+'setCollisionLight setCombatMode setCompassOscillation setCuratorCameraAreaCeiling setCuratorCoef '+'setCuratorEditingAreaType setCuratorWaypointCost setCurrentChannel setCurrentTask '+'setCurrentWaypoint setCustomAimCoef setDamage setDammage setDate setDebriefingText '+'setDefaultCamera setDestination setDetailMapBlendPars setDir setDirection setDrawIcon '+'setDropInterval setEditorMode setEditorObjectScope setEffectCondition setFace setFaceAnimation '+'setFatigue setFlagOwner setFlagSide setFlagTexture setFog setFormation setFormationTask '+'setFormDir setFriend setFromEditor setFSMVariable setFuel setFuelCargo setGroupIcon '+'setGroupIconParams setGroupIconsSelectable setGroupIconsVisible setGroupId setGroupIdGlobal '+'setGroupOwner setGusts setHideBehind setHit setHitIndex setHitPointDamage setHorizonParallaxCoef '+'setHUDMovementLevels setIdentity setImportance setLeader setLightAmbient setLightAttenuation '+'setLightBrightness setLightColor setLightDayLight setLightFlareMaxDistance setLightFlareSize '+'setLightIntensity setLightnings setLightUseFlare setLocalWindParams setMagazineTurretAmmo '+'setMarkerAlpha setMarkerAlphaLocal setMarkerBrush setMarkerBrushLocal setMarkerColor '+'setMarkerColorLocal setMarkerDir setMarkerDirLocal setMarkerPos setMarkerPosLocal setMarkerShape '+'setMarkerShapeLocal setMarkerSize setMarkerSizeLocal setMarkerText setMarkerTextLocal '+'setMarkerType setMarkerTypeLocal setMass setMimic setMousePosition setMusicEffect '+'setMusicEventHandler setName setNameSound setObjectArguments setObjectMaterial '+'setObjectMaterialGlobal setObjectProxy setObjectTexture setObjectTextureGlobal '+'setObjectViewDistance setOvercast setOwner setOxygenRemaining setParticleCircle setParticleClass '+'setParticleFire setParticleParams setParticleRandom setPilotCameraDirection '+'setPilotCameraRotation setPilotCameraTarget setPilotLight setPiPEffect setPitch setPlayable '+'setPlayerRespawnTime setPos setPosASL setPosASL2 setPosASLW setPosATL setPosition setPosWorld '+'setRadioMsg setRain setRainbow setRandomLip setRank setRectangular setRepairCargo '+'setShadowDistance setShotParents setSide setSimpleTaskAlwaysVisible setSimpleTaskCustomData '+'setSimpleTaskDescription setSimpleTaskDestination setSimpleTaskTarget setSimpleTaskType '+'setSimulWeatherLayers setSize setSkill setSlingLoad setSoundEffect setSpeaker setSpeech '+'setSpeedMode setStamina setStaminaScheme setStatValue setSuppression setSystemOfUnits '+'setTargetAge setTaskResult setTaskState setTerrainGrid setText setTimeMultiplier setTitleEffect '+'setTriggerActivation setTriggerArea setTriggerStatements setTriggerText setTriggerTimeout '+'setTriggerType setType setUnconscious setUnitAbility setUnitLoadout setUnitPos setUnitPosWeak '+'setUnitRank setUnitRecoilCoefficient setUnitTrait setUnloadInCombat setUserActionText setVariable '+'setVectorDir setVectorDirAndUp setVectorUp setVehicleAmmo setVehicleAmmoDef setVehicleArmor '+'setVehicleCargo setVehicleId setVehicleLock setVehiclePosition setVehicleTiPars setVehicleVarName '+'setVelocity setVelocityTransformation setViewDistance setVisibleIfTreeCollapsed setWaves '+'setWaypointBehaviour setWaypointCombatMode setWaypointCompletionRadius setWaypointDescription '+'setWaypointForceBehaviour setWaypointFormation setWaypointHousePosition setWaypointLoiterRadius '+'setWaypointLoiterType setWaypointName setWaypointPosition setWaypointScript setWaypointSpeed '+'setWaypointStatements setWaypointTimeout setWaypointType setWaypointVisible '+'setWeaponReloadingTime setWind setWindDir setWindForce setWindStr setWPPos show3DIcons showChat '+'showCinemaBorder showCommandingMenu showCompass showCuratorCompass showGPS showHUD showLegend '+'showMap shownArtilleryComputer shownChat shownCompass shownCuratorCompass showNewEditorObject '+'shownGPS shownHUD shownMap shownPad shownRadio shownScoretable shownUAVFeed shownWarrant '+'shownWatch showPad showRadio showScoretable showSubtitles showUAVFeed showWarrant showWatch '+'showWaypoint showWaypoints side sideAmbientLife sideChat sideEmpty sideEnemy sideFriendly '+'sideLogic sideRadio sideUnknown simpleTasks simulationEnabled simulCloudDensity '+'simulCloudOcclusion simulInClouds simulWeatherSync sin size sizeOf skill skillFinal skipTime '+'sleep sliderPosition sliderRange sliderSetPosition sliderSetRange sliderSetSpeed sliderSpeed '+'slingLoadAssistantShown soldierMagazines someAmmo sort soundVolume spawn speaker speed speedMode '+'splitString sqrt squadParams stance startLoadingScreen step stop stopEngineRTD stopped str '+'sunOrMoon supportInfo suppressFor surfaceIsWater surfaceNormal surfaceType swimInDepth '+'switchableUnits switchAction switchCamera switchGesture switchLight switchMove '+'synchronizedObjects synchronizedTriggers synchronizedWaypoints synchronizeObjectsAdd '+'synchronizeObjectsRemove synchronizeTrigger synchronizeWaypoint systemChat systemOfUnits tan '+'targetKnowledge targetsAggregate targetsQuery taskAlwaysVisible taskChildren taskCompleted '+'taskCustomData taskDescription taskDestination taskHint taskMarkerOffset taskNull taskParent '+'taskResult taskState taskType teamMember teamMemberNull teamName teams teamSwitch '+'teamSwitchEnabled teamType terminate terrainIntersect terrainIntersectASL text textLog '+'textLogFormat tg time timeMultiplier titleCut titleFadeOut titleObj titleRsc titleText toArray '+'toFixed toLower toString toUpper triggerActivated triggerActivation triggerArea '+'triggerAttachedVehicle triggerAttachObject triggerAttachVehicle triggerStatements triggerText '+'triggerTimeout triggerTimeoutCurrent triggerType turretLocal turretOwner turretUnit tvAdd tvClear '+'tvCollapse tvCount tvCurSel tvData tvDelete tvExpand tvPicture tvSetCurSel tvSetData tvSetPicture '+'tvSetPictureColor tvSetPictureColorDisabled tvSetPictureColorSelected tvSetPictureRight '+'tvSetPictureRightColor tvSetPictureRightColorDisabled tvSetPictureRightColorSelected tvSetText '+'tvSetTooltip tvSetValue tvSort tvSortByValue tvText tvTooltip tvValue type typeName typeOf '+'UAVControl uiNamespace uiSleep unassignCurator unassignItem unassignTeam unassignVehicle '+'underwater uniform uniformContainer uniformItems uniformMagazines unitAddons unitAimPosition '+'unitAimPositionVisual unitBackpack unitIsUAV unitPos unitReady unitRecoilCoefficient units '+'unitsBelowHeight unlinkItem unlockAchievement unregisterTask updateDrawIcon updateMenuItem '+'updateObjectTree useAISteeringComponent useAudioTimeForMoves vectorAdd vectorCos '+'vectorCrossProduct vectorDiff vectorDir vectorDirVisual vectorDistance vectorDistanceSqr '+'vectorDotProduct vectorFromTo vectorMagnitude vectorMagnitudeSqr vectorMultiply vectorNormalized '+'vectorUp vectorUpVisual vehicle vehicleCargoEnabled vehicleChat vehicleRadio vehicles '+'vehicleVarName velocity velocityModelSpace verifySignature vest vestContainer vestItems '+'vestMagazines viewDistance visibleCompass visibleGPS visibleMap visiblePosition '+'visiblePositionASL visibleScoretable visibleWatch waves waypointAttachedObject '+'waypointAttachedVehicle waypointAttachObject waypointAttachVehicle waypointBehaviour '+'waypointCombatMode waypointCompletionRadius waypointDescription waypointForceBehaviour '+'waypointFormation waypointHousePosition waypointLoiterRadius waypointLoiterType waypointName '+'waypointPosition waypoints waypointScript waypointsEnabledUAV waypointShow waypointSpeed '+'waypointStatements waypointTimeout waypointTimeoutCurrent waypointType waypointVisible '+'weaponAccessories weaponAccessoriesCargo weaponCargo weaponDirection weaponInertia weaponLowered '+'weapons weaponsItems weaponsItemsCargo weaponState weaponsTurret weightRTD west WFSideText wind',literal:'true false nil'},contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.NUMBER_MODE,VARIABLE,FUNCTION,STRINGS,CPP.preprocessor],illegal:/#/};});hljs.registerLanguage('sql',function(hljs){var COMMENT_MODE=hljs.COMMENT('--','$');return{case_insensitive:true,illegal:/[<>{}*#]/,contains:[{beginKeywords:'begin end start commit rollback savepoint lock alter create drop rename call '+'delete do handler insert load replace select truncate update set show pragma grant '+'merge describe use explain help declare prepare execute deallocate release '+'unlock purge reset change stop analyze cache flush optimize repair kill '+'install uninstall checksum restore check backup revoke comment',end:/;/,endsWithParent:true,lexemes:/[\w\.]+/,keywords:{keyword:'abort abs absolute acc acce accep accept access accessed accessible account acos action activate add '+'addtime admin administer advanced advise aes_decrypt aes_encrypt after agent aggregate ali alia alias '+'allocate allow alter always analyze ancillary and any anydata anydataset anyschema anytype apply '+'archive archived archivelog are as asc ascii asin assembly assertion associate asynchronous at atan '+'atn2 attr attri attrib attribu attribut attribute attributes audit authenticated authentication authid '+'authors auto autoallocate autodblink autoextend automatic availability avg backup badfile basicfile '+'before begin beginning benchmark between bfile bfile_base big bigfile bin binary_double binary_float '+'binlog bit_and bit_count bit_length bit_or bit_xor bitmap blob_base block blocksize body both bound '+'buffer_cache buffer_pool build bulk by byte byteordermark bytes cache caching call calling cancel '+'capacity cascade cascaded case cast catalog category ceil ceiling chain change changed char_base '+'char_length character_length characters characterset charindex charset charsetform charsetid check '+'checksum checksum_agg child choose chr chunk class cleanup clear client clob clob_base clone close '+'cluster_id cluster_probability cluster_set clustering coalesce coercibility col collate collation '+'collect colu colum column column_value columns columns_updated comment commit compact compatibility '+'compiled complete composite_limit compound compress compute concat concat_ws concurrent confirm conn '+'connec connect connect_by_iscycle connect_by_isleaf connect_by_root connect_time connection '+'consider consistent constant constraint constraints constructor container content contents context '+'contributors controlfile conv convert convert_tz corr corr_k corr_s corresponding corruption cos cost '+'count count_big counted covar_pop covar_samp cpu_per_call cpu_per_session crc32 create creation '+'critical cross cube cume_dist curdate current current_date current_time current_timestamp current_user '+'cursor curtime customdatum cycle data database databases datafile datafiles datalength date_add '+'date_cache date_format date_sub dateadd datediff datefromparts datename datepart datetime2fromparts '+'day day_to_second dayname dayofmonth dayofweek dayofyear days db_role_change dbtimezone ddl deallocate '+'declare decode decompose decrement decrypt deduplicate def defa defau defaul default defaults '+'deferred defi defin define degrees delayed delegate delete delete_all delimited demand dense_rank '+'depth dequeue des_decrypt des_encrypt des_key_file desc descr descri describ describe descriptor '+'deterministic diagnostics difference dimension direct_load directory disable disable_all '+'disallow disassociate discardfile disconnect diskgroup distinct distinctrow distribute distributed div '+'do document domain dotnet double downgrade drop dumpfile duplicate duration each edition editionable '+'editions element ellipsis else elsif elt empty enable enable_all enclosed encode encoding encrypt '+'end end-exec endian enforced engine engines enqueue enterprise entityescaping eomonth error errors '+'escaped evalname evaluate event eventdata events except exception exceptions exchange exclude excluding '+'execu execut execute exempt exists exit exp expire explain export export_set extended extent external '+'external_1 external_2 externally extract failed failed_login_attempts failover failure far fast '+'feature_set feature_value fetch field fields file file_name_convert filesystem_like_logging final '+'finish first first_value fixed flash_cache flashback floor flush following follows for forall force '+'form forma format found found_rows freelist freelists freepools fresh from from_base64 from_days '+'ftp full function general generated get get_format get_lock getdate getutcdate global global_name '+'globally go goto grant grants greatest group group_concat group_id grouping grouping_id groups '+'gtid_subtract guarantee guard handler hash hashkeys having hea head headi headin heading heap help hex '+'hierarchy high high_priority hosts hour http id ident_current ident_incr ident_seed identified '+'identity idle_time if ifnull ignore iif ilike ilm immediate import in include including increment '+'index indexes indexing indextype indicator indices inet6_aton inet6_ntoa inet_aton inet_ntoa infile '+'initial initialized initially initrans inmemory inner innodb input insert install instance instantiable '+'instr interface interleaved intersect into invalidate invisible is is_free_lock is_ipv4 is_ipv4_compat '+'is_not is_not_null is_used_lock isdate isnull isolation iterate java join json json_exists '+'keep keep_duplicates key keys kill language large last last_day last_insert_id last_value lax lcase '+'lead leading least leaves left len lenght length less level levels library like like2 like4 likec limit '+'lines link list listagg little ln load load_file lob lobs local localtime localtimestamp locate '+'locator lock locked log log10 log2 logfile logfiles logging logical logical_reads_per_call '+'logoff logon logs long loop low low_priority lower lpad lrtrim ltrim main make_set makedate maketime '+'managed management manual map mapping mask master master_pos_wait match matched materialized max '+'maxextents maximize maxinstances maxlen maxlogfiles maxloghistory maxlogmembers maxsize maxtrans '+'md5 measures median medium member memcompress memory merge microsecond mid migration min minextents '+'minimum mining minus minute minvalue missing mod mode model modification modify module monitoring month '+'months mount move movement multiset mutex name name_const names nan national native natural nav nchar '+'nclob nested never new newline next nextval no no_write_to_binlog noarchivelog noaudit nobadfile '+'nocheck nocompress nocopy nocycle nodelay nodiscardfile noentityescaping noguarantee nokeep nologfile '+'nomapping nomaxvalue nominimize nominvalue nomonitoring none noneditionable nonschema noorder '+'nopr nopro noprom nopromp noprompt norely noresetlogs noreverse normal norowdependencies noschemacheck '+'noswitch not nothing notice notrim novalidate now nowait nth_value nullif nulls num numb numbe '+'nvarchar nvarchar2 object ocicoll ocidate ocidatetime ociduration ociinterval ociloblocator ocinumber '+'ociref ocirefcursor ocirowid ocistring ocitype oct octet_length of off offline offset oid oidindex old '+'on online only opaque open operations operator optimal optimize option optionally or oracle oracle_date '+'oradata ord ordaudio orddicom orddoc order ordimage ordinality ordvideo organization orlany orlvary '+'out outer outfile outline output over overflow overriding package pad parallel parallel_enable '+'parameters parent parse partial partition partitions pascal passing password password_grace_time '+'password_lock_time password_reuse_max password_reuse_time password_verify_function patch path patindex '+'pctincrease pctthreshold pctused pctversion percent percent_rank percentile_cont percentile_disc '+'performance period period_add period_diff permanent physical pi pipe pipelined pivot pluggable plugin '+'policy position post_transaction pow power pragma prebuilt precedes preceding precision prediction '+'prediction_cost prediction_details prediction_probability prediction_set prepare present preserve '+'prior priority private private_sga privileges procedural procedure procedure_analyze processlist '+'profiles project prompt protection public publishingservername purge quarter query quick quiesce quota '+'quotename radians raise rand range rank raw read reads readsize rebuild record records '+'recover recovery recursive recycle redo reduced ref reference referenced references referencing refresh '+'regexp_like register regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy '+'reject rekey relational relative relaylog release release_lock relies_on relocate rely rem remainder rename '+'repair repeat replace replicate replication required reset resetlogs resize resource respect restore '+'restricted result result_cache resumable resume retention return returning returns reuse reverse revoke '+'right rlike role roles rollback rolling rollup round row row_count rowdependencies rowid rownum rows '+'rtrim rules safe salt sample save savepoint sb1 sb2 sb4 scan schema schemacheck scn scope scroll '+'sdo_georaster sdo_topo_geometry search sec_to_time second section securefile security seed segment select '+'self sequence sequential serializable server servererror session session_user sessions_per_user set '+'sets settings sha sha1 sha2 share shared shared_pool short show shrink shutdown si_averagecolor '+'si_colorhistogram si_featurelist si_positionalcolor si_stillimage si_texture siblings sid sign sin '+'size size_t sizes skip slave sleep smalldatetimefromparts smallfile snapshot some soname sort soundex '+'source space sparse spfile split sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows '+'sql_small_result sql_variant_property sqlcode sqldata sqlerror sqlname sqlstate sqrt square standalone '+'standby start starting startup statement static statistics stats_binomial_test stats_crosstab '+'stats_ks_test stats_mode stats_mw_test stats_one_way_anova stats_t_test_ stats_t_test_indep '+'stats_t_test_one stats_t_test_paired stats_wsr_test status std stddev stddev_pop stddev_samp stdev '+'stop storage store stored str str_to_date straight_join strcmp strict string struct stuff style subdate '+'subpartition subpartitions substitutable substr substring subtime subtring_index subtype success sum '+'suspend switch switchoffset switchover sync synchronous synonym sys sys_xmlagg sysasm sysaux sysdate '+'sysdatetimeoffset sysdba sysoper system system_user sysutcdatetime table tables tablespace tan tdo '+'template temporary terminated tertiary_weights test than then thread through tier ties time time_format '+'time_zone timediff timefromparts timeout timestamp timestampadd timestampdiff timezone_abbr '+'timezone_minute timezone_region to to_base64 to_date to_days to_seconds todatetimeoffset trace tracking '+'transaction transactional translate translation treat trigger trigger_nestlevel triggers trim truncate '+'try_cast try_convert try_parse type ub1 ub2 ub4 ucase unarchived unbounded uncompress '+'under undo unhex unicode uniform uninstall union unique unix_timestamp unknown unlimited unlock unpivot '+'unrecoverable unsafe unsigned until untrusted unusable unused update updated upgrade upped upper upsert '+'url urowid usable usage use use_stored_outlines user user_data user_resources users using utc_date '+'utc_timestamp uuid uuid_short validate validate_password_strength validation valist value values var '+'var_samp varcharc vari varia variab variabl variable variables variance varp varraw varrawc varray '+'verify version versions view virtual visible void wait wallet warning warnings week weekday weekofyear '+'wellformed when whene whenev wheneve whenever where while whitespace with within without work wrapped '+'xdb xml xmlagg xmlattributes xmlcast xmlcolattval xmlelement xmlexists xmlforest xmlindex xmlnamespaces '+'xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltype xor year year_to_month years yearweek',literal:'true false null',built_in:'array bigint binary bit blob boolean char character date dec decimal float int int8 integer interval number '+'numeric real record serial serial8 smallint text varchar varying void'},contains:[{className:'string',begin:'\'',end:'\'',contains:[hljs.BACKSLASH_ESCAPE,{begin:'\'\''}]},{className:'string',begin:'"',end:'"',contains:[hljs.BACKSLASH_ESCAPE,{begin:'""'}]},{className:'string',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE]},hljs.C_NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE,COMMENT_MODE]},hljs.C_BLOCK_COMMENT_MODE,COMMENT_MODE]};});hljs.registerLanguage('stan',function(hljs){return{contains:[hljs.HASH_COMMENT_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{begin:hljs.UNDERSCORE_IDENT_RE,lexemes:hljs.UNDERSCORE_IDENT_RE,keywords:{// Stan's keywords
name:'for in while repeat until if then else',// Stan's probablity distributions (less beta and gamma, as commonly
// used for parameter names). So far, _log and _rng variants are not
// included
symbol:'bernoulli bernoulli_logit binomial binomial_logit '+'beta_binomial hypergeometric categorical categorical_logit '+'ordered_logistic neg_binomial neg_binomial_2 '+'neg_binomial_2_log poisson poisson_log multinomial normal '+'exp_mod_normal skew_normal student_t cauchy double_exponential '+'logistic gumbel lognormal chi_square inv_chi_square '+'scaled_inv_chi_square exponential inv_gamma weibull frechet '+'rayleigh wiener pareto pareto_type_2 von_mises uniform '+'multi_normal multi_normal_prec multi_normal_cholesky multi_gp '+'multi_gp_cholesky multi_student_t gaussian_dlm_obs dirichlet '+'lkj_corr lkj_corr_cholesky wishart inv_wishart',// Stan's data types
'selector-tag':'int real vector simplex unit_vector ordered positive_ordered '+'row_vector matrix cholesky_factor_corr cholesky_factor_cov '+'corr_matrix cov_matrix',// Stan's model blocks
title:'functions model data parameters quantities transformed '+'generated',literal:'true false'},relevance:0},// The below is all taken from the R language definition
{// hex value
className:'number',begin:"0[xX][0-9a-fA-F]+[Li]?\\b",relevance:0},{// hex value
className:'number',begin:"0[xX][0-9a-fA-F]+[Li]?\\b",relevance:0},{// explicit integer
className:'number',begin:"\\d+(?:[eE][+\\-]?\\d*)?L\\b",relevance:0},{// number with trailing decimal
className:'number',begin:"\\d+\\.(?!\\d)(?:i\\b)?",relevance:0},{// number
className:'number',begin:"\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d*)?i?\\b",relevance:0},{// number with leading decimal
className:'number',begin:"\\.\\d+(?:[eE][+\\-]?\\d*)?i?\\b",relevance:0}]};});hljs.registerLanguage('stata',function(hljs){return{aliases:['do','ado'],case_insensitive:true,keywords:'if else in foreach for forv forva forval forvalu forvalue forvalues by bys bysort xi quietly qui capture about ac ac_7 acprplot acprplot_7 adjust ado adopath adoupdate alpha ameans an ano anov anova anova_estat anova_terms anovadef aorder ap app appe appen append arch arch_dr arch_estat arch_p archlm areg areg_p args arima arima_dr arima_estat arima_p as asmprobit asmprobit_estat asmprobit_lf asmprobit_mfx__dlg asmprobit_p ass asse asser assert avplot avplot_7 avplots avplots_7 bcskew0 bgodfrey binreg bip0_lf biplot bipp_lf bipr_lf bipr_p biprobit bitest bitesti bitowt blogit bmemsize boot bootsamp bootstrap bootstrap_8 boxco_l boxco_p boxcox boxcox_6 boxcox_p bprobit br break brier bro brow brows browse brr brrstat bs bs_7 bsampl_w bsample bsample_7 bsqreg bstat bstat_7 bstat_8 bstrap bstrap_7 ca ca_estat ca_p cabiplot camat canon canon_8 canon_8_p canon_estat canon_p cap caprojection capt captu captur capture cat cc cchart cchart_7 cci cd censobs_table centile cf char chdir checkdlgfiles checkestimationsample checkhlpfiles checksum chelp ci cii cl class classutil clear cli clis clist clo clog clog_lf clog_p clogi clogi_sw clogit clogit_lf clogit_p clogitp clogl_sw cloglog clonevar clslistarray cluster cluster_measures cluster_stop cluster_tree cluster_tree_8 clustermat cmdlog cnr cnre cnreg cnreg_p cnreg_sw cnsreg codebook collaps4 collapse colormult_nb colormult_nw compare compress conf confi confir confirm conren cons const constr constra constrai constrain constraint continue contract copy copyright copysource cor corc corr corr2data corr_anti corr_kmo corr_smc corre correl correla correlat correlate corrgram cou coun count cox cox_p cox_sw coxbase coxhaz coxvar cprplot cprplot_7 crc cret cretu cretur creturn cross cs cscript cscript_log csi ct ct_is ctset ctst_5 ctst_st cttost cumsp cumsp_7 cumul cusum cusum_7 cutil d|0 datasig datasign datasigna datasignat datasignatu datasignatur datasignature datetof db dbeta de dec deco decod decode deff des desc descr descri describ describe destring dfbeta dfgls dfuller di di_g dir dirstats dis discard disp disp_res disp_s displ displa display distinct do doe doed doedi doedit dotplot dotplot_7 dprobit drawnorm drop ds ds_util dstdize duplicates durbina dwstat dydx e|0 ed edi edit egen eivreg emdef en enc enco encod encode eq erase ereg ereg_lf ereg_p ereg_sw ereghet ereghet_glf ereghet_glf_sh ereghet_gp ereghet_ilf ereghet_ilf_sh ereghet_ip eret eretu eretur ereturn err erro error est est_cfexist est_cfname est_clickable est_expand est_hold est_table est_unhold est_unholdok estat estat_default estat_summ estat_vce_only esti estimates etodow etof etomdy ex exi exit expand expandcl fac fact facto factor factor_estat factor_p factor_pca_rotated factor_rotate factormat fcast fcast_compute fcast_graph fdades fdadesc fdadescr fdadescri fdadescrib fdadescribe fdasav fdasave fdause fh_st file open file read file close file filefilter fillin find_hlp_file findfile findit findit_7 fit fl fli flis flist for5_0 form forma format fpredict frac_154 frac_adj frac_chk frac_cox frac_ddp frac_dis frac_dv frac_in frac_mun frac_pp frac_pq frac_pv frac_wgt frac_xo fracgen fracplot fracplot_7 fracpoly fracpred fron_ex fron_hn fron_p fron_tn fron_tn2 frontier ftodate ftoe ftomdy ftowdate g|0 gamhet_glf gamhet_gp gamhet_ilf gamhet_ip gamma gamma_d2 gamma_p gamma_sw gammahet gdi_hexagon gdi_spokes ge gen gene gener genera generat generate genrank genstd genvmean gettoken gl gladder gladder_7 glim_l01 glim_l02 glim_l03 glim_l04 glim_l05 glim_l06 glim_l07 glim_l08 glim_l09 glim_l10 glim_l11 glim_l12 glim_lf glim_mu glim_nw1 glim_nw2 glim_nw3 glim_p glim_v1 glim_v2 glim_v3 glim_v4 glim_v5 glim_v6 glim_v7 glm glm_6 glm_p glm_sw glmpred glo glob globa global glogit glogit_8 glogit_p gmeans gnbre_lf gnbreg gnbreg_5 gnbreg_p gomp_lf gompe_sw gomper_p gompertz gompertzhet gomphet_glf gomphet_glf_sh gomphet_gp gomphet_ilf gomphet_ilf_sh gomphet_ip gphdot gphpen gphprint gprefs gprobi_p gprobit gprobit_8 gr gr7 gr_copy gr_current gr_db gr_describe gr_dir gr_draw gr_draw_replay gr_drop gr_edit gr_editviewopts gr_example gr_example2 gr_export gr_print gr_qscheme gr_query gr_read gr_rename gr_replay gr_save gr_set gr_setscheme gr_table gr_undo gr_use graph graph7 grebar greigen greigen_7 greigen_8 grmeanby grmeanby_7 gs_fileinfo gs_filetype gs_graphinfo gs_stat gsort gwood h|0 hadimvo hareg hausman haver he heck_d2 heckma_p heckman heckp_lf heckpr_p heckprob hel help hereg hetpr_lf hetpr_p hetprob hettest hexdump hilite hist hist_7 histogram hlogit hlu hmeans hotel hotelling hprobit hreg hsearch icd9 icd9_ff icd9p iis impute imtest inbase include inf infi infil infile infix inp inpu input ins insheet insp inspe inspec inspect integ inten intreg intreg_7 intreg_p intrg2_ll intrg_ll intrg_ll2 ipolate iqreg ir irf irf_create irfm iri is_svy is_svysum isid istdize ivprob_1_lf ivprob_lf ivprobit ivprobit_p ivreg ivreg_footnote ivtob_1_lf ivtob_lf ivtobit ivtobit_p jackknife jacknife jknife jknife_6 jknife_8 jkstat joinby kalarma1 kap kap_3 kapmeier kappa kapwgt kdensity kdensity_7 keep ksm ksmirnov ktau kwallis l|0 la lab labe label labelbook ladder levels levelsof leverage lfit lfit_p li lincom line linktest lis list lloghet_glf lloghet_glf_sh lloghet_gp lloghet_ilf lloghet_ilf_sh lloghet_ip llogi_sw llogis_p llogist llogistic llogistichet lnorm_lf lnorm_sw lnorma_p lnormal lnormalhet lnormhet_glf lnormhet_glf_sh lnormhet_gp lnormhet_ilf lnormhet_ilf_sh lnormhet_ip lnskew0 loadingplot loc loca local log logi logis_lf logistic logistic_p logit logit_estat logit_p loglogs logrank loneway lookfor lookup lowess lowess_7 lpredict lrecomp lroc lroc_7 lrtest ls lsens lsens_7 lsens_x lstat ltable ltable_7 ltriang lv lvr2plot lvr2plot_7 m|0 ma mac macr macro makecns man manova manova_estat manova_p manovatest mantel mark markin markout marksample mat mat_capp mat_order mat_put_rr mat_rapp mata mata_clear mata_describe mata_drop mata_matdescribe mata_matsave mata_matuse mata_memory mata_mlib mata_mosave mata_rename mata_which matalabel matcproc matlist matname matr matri matrix matrix_input__dlg matstrik mcc mcci md0_ md1_ md1debug_ md2_ md2debug_ mds mds_estat mds_p mdsconfig mdslong mdsmat mdsshepard mdytoe mdytof me_derd mean means median memory memsize meqparse mer merg merge mfp mfx mhelp mhodds minbound mixed_ll mixed_ll_reparm mkassert mkdir mkmat mkspline ml ml_5 ml_adjs ml_bhhhs ml_c_d ml_check ml_clear ml_cnt ml_debug ml_defd ml_e0 ml_e0_bfgs ml_e0_cycle ml_e0_dfp ml_e0i ml_e1 ml_e1_bfgs ml_e1_bhhh ml_e1_cycle ml_e1_dfp ml_e2 ml_e2_cycle ml_ebfg0 ml_ebfr0 ml_ebfr1 ml_ebh0q ml_ebhh0 ml_ebhr0 ml_ebr0i ml_ecr0i ml_edfp0 ml_edfr0 ml_edfr1 ml_edr0i ml_eds ml_eer0i ml_egr0i ml_elf ml_elf_bfgs ml_elf_bhhh ml_elf_cycle ml_elf_dfp ml_elfi ml_elfs ml_enr0i ml_enrr0 ml_erdu0 ml_erdu0_bfgs ml_erdu0_bhhh ml_erdu0_bhhhq ml_erdu0_cycle ml_erdu0_dfp ml_erdu0_nrbfgs ml_exde ml_footnote ml_geqnr ml_grad0 ml_graph ml_hbhhh ml_hd0 ml_hold ml_init ml_inv ml_log ml_max ml_mlout ml_mlout_8 ml_model ml_nb0 ml_opt ml_p ml_plot ml_query ml_rdgrd ml_repor ml_s_e ml_score ml_searc ml_technique ml_unhold mleval mlf_ mlmatbysum mlmatsum mlog mlogi mlogit mlogit_footnote mlogit_p mlopts mlsum mlvecsum mnl0_ mor more mov move mprobit mprobit_lf mprobit_p mrdu0_ mrdu1_ mvdecode mvencode mvreg mvreg_estat n|0 nbreg nbreg_al nbreg_lf nbreg_p nbreg_sw nestreg net newey newey_7 newey_p news nl nl_7 nl_9 nl_9_p nl_p nl_p_7 nlcom nlcom_p nlexp2 nlexp2_7 nlexp2a nlexp2a_7 nlexp3 nlexp3_7 nlgom3 nlgom3_7 nlgom4 nlgom4_7 nlinit nllog3 nllog3_7 nllog4 nllog4_7 nlog_rd nlogit nlogit_p nlogitgen nlogittree nlpred no nobreak noi nois noisi noisil noisily note notes notes_dlg nptrend numlabel numlist odbc old_ver olo olog ologi ologi_sw ologit ologit_p ologitp on one onew onewa oneway op_colnm op_comp op_diff op_inv op_str opr opro oprob oprob_sw oprobi oprobi_p oprobit oprobitp opts_exclusive order orthog orthpoly ou out outf outfi outfil outfile outs outsh outshe outshee outsheet ovtest pac pac_7 palette parse parse_dissim pause pca pca_8 pca_display pca_estat pca_p pca_rotate pcamat pchart pchart_7 pchi pchi_7 pcorr pctile pentium pergram pergram_7 permute permute_8 personal peto_st pkcollapse pkcross pkequiv pkexamine pkexamine_7 pkshape pksumm pksumm_7 pl plo plot plugin pnorm pnorm_7 poisgof poiss_lf poiss_sw poisso_p poisson poisson_estat post postclose postfile postutil pperron pr prais prais_e prais_e2 prais_p predict predictnl preserve print pro prob probi probit probit_estat probit_p proc_time procoverlay procrustes procrustes_estat procrustes_p profiler prog progr progra program prop proportion prtest prtesti pwcorr pwd q\\s qby qbys qchi qchi_7 qladder qladder_7 qnorm qnorm_7 qqplot qqplot_7 qreg qreg_c qreg_p qreg_sw qu quadchk quantile quantile_7 que quer query range ranksum ratio rchart rchart_7 rcof recast reclink recode reg reg3 reg3_p regdw regr regre regre_p2 regres regres_p regress regress_estat regriv_p remap ren rena renam rename renpfix repeat replace report reshape restore ret retu retur return rm rmdir robvar roccomp roccomp_7 roccomp_8 rocf_lf rocfit rocfit_8 rocgold rocplot rocplot_7 roctab roctab_7 rolling rologit rologit_p rot rota rotat rotate rotatemat rreg rreg_p ru run runtest rvfplot rvfplot_7 rvpplot rvpplot_7 sa safesum sample sampsi sav save savedresults saveold sc sca scal scala scalar scatter scm_mine sco scob_lf scob_p scobi_sw scobit scor score scoreplot scoreplot_help scree screeplot screeplot_help sdtest sdtesti se search separate seperate serrbar serrbar_7 serset set set_defaults sfrancia sh she shel shell shewhart shewhart_7 signestimationsample signrank signtest simul simul_7 simulate simulate_8 sktest sleep slogit slogit_d2 slogit_p smooth snapspan so sor sort spearman spikeplot spikeplot_7 spikeplt spline_x split sqreg sqreg_p sret sretu sretur sreturn ssc st st_ct st_hc st_hcd st_hcd_sh st_is st_issys st_note st_promo st_set st_show st_smpl st_subid stack statsby statsby_8 stbase stci stci_7 stcox stcox_estat stcox_fr stcox_fr_ll stcox_p stcox_sw stcoxkm stcoxkm_7 stcstat stcurv stcurve stcurve_7 stdes stem stepwise stereg stfill stgen stir stjoin stmc stmh stphplot stphplot_7 stphtest stphtest_7 stptime strate strate_7 streg streg_sw streset sts sts_7 stset stsplit stsum sttocc sttoct stvary stweib su suest suest_8 sum summ summa summar summari summariz summarize sunflower sureg survcurv survsum svar svar_p svmat svy svy_disp svy_dreg svy_est svy_est_7 svy_estat svy_get svy_gnbreg_p svy_head svy_header svy_heckman_p svy_heckprob_p svy_intreg_p svy_ivreg_p svy_logistic_p svy_logit_p svy_mlogit_p svy_nbreg_p svy_ologit_p svy_oprobit_p svy_poisson_p svy_probit_p svy_regress_p svy_sub svy_sub_7 svy_x svy_x_7 svy_x_p svydes svydes_8 svygen svygnbreg svyheckman svyheckprob svyintreg svyintreg_7 svyintrg svyivreg svylc svylog_p svylogit svymarkout svymarkout_8 svymean svymlog svymlogit svynbreg svyolog svyologit svyoprob svyoprobit svyopts svypois svypois_7 svypoisson svyprobit svyprobt svyprop svyprop_7 svyratio svyreg svyreg_p svyregress svyset svyset_7 svyset_8 svytab svytab_7 svytest svytotal sw sw_8 swcnreg swcox swereg swilk swlogis swlogit swologit swoprbt swpois swprobit swqreg swtobit swweib symmetry symmi symplot symplot_7 syntax sysdescribe sysdir sysuse szroeter ta tab tab1 tab2 tab_or tabd tabdi tabdis tabdisp tabi table tabodds tabodds_7 tabstat tabu tabul tabula tabulat tabulate te tempfile tempname tempvar tes test testnl testparm teststd tetrachoric time_it timer tis tob tobi tobit tobit_p tobit_sw token tokeni tokeniz tokenize tostring total translate translator transmap treat_ll treatr_p treatreg trim trnb_cons trnb_mean trpoiss_d2 trunc_ll truncr_p truncreg tsappend tset tsfill tsline tsline_ex tsreport tsrevar tsrline tsset tssmooth tsunab ttest ttesti tut_chk tut_wait tutorial tw tware_st two twoway twoway__fpfit_serset twoway__function_gen twoway__histogram_gen twoway__ipoint_serset twoway__ipoints_serset twoway__kdensity_gen twoway__lfit_serset twoway__normgen_gen twoway__pci_serset twoway__qfit_serset twoway__scatteri_serset twoway__sunflower_gen twoway_ksm_serset ty typ type typeof u|0 unab unabbrev unabcmd update us use uselabel var var_mkcompanion var_p varbasic varfcast vargranger varirf varirf_add varirf_cgraph varirf_create varirf_ctable varirf_describe varirf_dir varirf_drop varirf_erase varirf_graph varirf_ograph varirf_rename varirf_set varirf_table varlist varlmar varnorm varsoc varstable varstable_w varstable_w2 varwle vce vec vec_fevd vec_mkphi vec_p vec_p_w vecirf_create veclmar veclmar_w vecnorm vecnorm_w vecrank vecstable verinst vers versi versio version view viewsource vif vwls wdatetof webdescribe webseek webuse weib1_lf weib2_lf weib_lf weib_lf0 weibhet_glf weibhet_glf_sh weibhet_glfa weibhet_glfa_sh weibhet_gp weibhet_ilf weibhet_ilf_sh weibhet_ilfa weibhet_ilfa_sh weibhet_ip weibu_sw weibul_p weibull weibull_c weibull_s weibullhet wh whelp whi which whil while wilc_st wilcoxon win wind windo window winexec wntestb wntestb_7 wntestq xchart xchart_7 xcorr xcorr_7 xi xi_6 xmlsav xmlsave xmluse xpose xsh xshe xshel xshell xt_iis xt_tis xtab_p xtabond xtbin_p xtclog xtcloglog xtcloglog_8 xtcloglog_d2 xtcloglog_pa_p xtcloglog_re_p xtcnt_p xtcorr xtdata xtdes xtfront_p xtfrontier xtgee xtgee_elink xtgee_estat xtgee_makeivar xtgee_p xtgee_plink xtgls xtgls_p xthaus xthausman xtht_p xthtaylor xtile xtint_p xtintreg xtintreg_8 xtintreg_d2 xtintreg_p xtivp_1 xtivp_2 xtivreg xtline xtline_ex xtlogit xtlogit_8 xtlogit_d2 xtlogit_fe_p xtlogit_pa_p xtlogit_re_p xtmixed xtmixed_estat xtmixed_p xtnb_fe xtnb_lf xtnbreg xtnbreg_pa_p xtnbreg_refe_p xtpcse xtpcse_p xtpois xtpoisson xtpoisson_d2 xtpoisson_pa_p xtpoisson_refe_p xtpred xtprobit xtprobit_8 xtprobit_d2 xtprobit_re_p xtps_fe xtps_lf xtps_ren xtps_ren_8 xtrar_p xtrc xtrc_p xtrchh xtrefe_p xtreg xtreg_be xtreg_fe xtreg_ml xtreg_pa_p xtreg_re xtregar xtrere_p xtset xtsf_ll xtsf_llti xtsum xttab xttest0 xttobit xttobit_8 xttobit_p xttrans yx yxview__barlike_draw yxview_area_draw yxview_bar_draw yxview_dot_draw yxview_dropline_draw yxview_function_draw yxview_iarrow_draw yxview_ilabels_draw yxview_normal_draw yxview_pcarrow_draw yxview_pcbarrow_draw yxview_pccapsym_draw yxview_pcscatter_draw yxview_pcspike_draw yxview_rarea_draw yxview_rbar_draw yxview_rbarm_draw yxview_rcap_draw yxview_rcapsym_draw yxview_rconnected_draw yxview_rline_draw yxview_rscatter_draw yxview_rspike_draw yxview_spike_draw yxview_sunflower_draw zap_s zinb zinb_llf zinb_plf zip zip_llf zip_p zip_plf zt_ct_5 zt_hc_5 zt_hcd_5 zt_is_5 zt_iss_5 zt_sho_5 zt_smp_5 ztbase_5 ztcox_5 ztdes_5 ztereg_5 ztfill_5 ztgen_5 ztir_5 ztjoin_5 ztnb ztnb_p ztp ztp_p zts_5 ztset_5 ztspli_5 ztsum_5 zttoct_5 ztvary_5 ztweib_5',contains:[{className:'symbol',begin:/`[a-zA-Z0-9_]+'/},{className:'variable',begin:/\$\{?[a-zA-Z0-9_]+\}?/},{className:'string',variants:[{begin:'`"[^\r\n]*?"\''},{begin:'"[^\r\n"]*"'}]},{className:'built_in',variants:[{begin:'\\b(abs|acos|asin|atan|atan2|atanh|ceil|cloglog|comb|cos|digamma|exp|floor|invcloglog|invlogit|ln|lnfact|lnfactorial|lngamma|log|log10|max|min|mod|reldif|round|sign|sin|sqrt|sum|tan|tanh|trigamma|trunc|betaden|Binomial|binorm|binormal|chi2|chi2tail|dgammapda|dgammapdada|dgammapdadx|dgammapdx|dgammapdxdx|F|Fden|Ftail|gammaden|gammap|ibeta|invbinomial|invchi2|invchi2tail|invF|invFtail|invgammap|invibeta|invnchi2|invnFtail|invnibeta|invnorm|invnormal|invttail|nbetaden|nchi2|nFden|nFtail|nibeta|norm|normal|normalden|normd|npnchi2|tden|ttail|uniform|abbrev|char|index|indexnot|length|lower|ltrim|match|plural|proper|real|regexm|regexr|regexs|reverse|rtrim|string|strlen|strlower|strltrim|strmatch|strofreal|strpos|strproper|strreverse|strrtrim|strtrim|strupper|subinstr|subinword|substr|trim|upper|word|wordcount|_caller|autocode|byteorder|chop|clip|cond|e|epsdouble|epsfloat|group|inlist|inrange|irecode|matrix|maxbyte|maxdouble|maxfloat|maxint|maxlong|mi|minbyte|mindouble|minfloat|minint|minlong|missing|r|recode|replay|return|s|scalar|d|date|day|dow|doy|halfyear|mdy|month|quarter|week|year|d|daily|dofd|dofh|dofm|dofq|dofw|dofy|h|halfyearly|hofd|m|mofd|monthly|q|qofd|quarterly|tin|twithin|w|weekly|wofd|y|yearly|yh|ym|yofd|yq|yw|cholesky|colnumb|colsof|corr|det|diag|diag0cnt|el|get|hadamard|I|inv|invsym|issym|issymmetric|J|matmissing|matuniform|mreldif|nullmat|rownumb|rowsof|sweep|syminv|trace|vec|vecdiag)(?=\\(|$)'}]},hljs.COMMENT('^[ \t]*\\*.*$',false),hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]};});hljs.registerLanguage('step21',function(hljs){var STEP21_IDENT_RE='[A-Z_][A-Z0-9_.]*';var STEP21_KEYWORDS={keyword:'HEADER ENDSEC DATA'};var STEP21_START={className:'meta',begin:'ISO-10303-21;',relevance:10};var STEP21_CLOSE={className:'meta',begin:'END-ISO-10303-21;',relevance:10};return{aliases:['p21','step','stp'],case_insensitive:true,// STEP 21 is case insensitive in theory, in practice all non-comments are capitalized.
lexemes:STEP21_IDENT_RE,keywords:STEP21_KEYWORDS,contains:[STEP21_START,STEP21_CLOSE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.COMMENT('/\\*\\*!','\\*/'),hljs.C_NUMBER_MODE,hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null}),{className:'string',begin:"'",end:"'"},{className:'symbol',variants:[{begin:'#',end:'\\d+',illegal:'\\W'}]}]};});hljs.registerLanguage('stylus',function(hljs){var VARIABLE={className:'variable',begin:'\\$'+hljs.IDENT_RE};var HEX_COLOR={className:'number',begin:'#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})'};var AT_KEYWORDS=['charset','css','debug','extend','font-face','for','import','include','media','mixin','page','warn','while'];var PSEUDO_SELECTORS=['after','before','first-letter','first-line','active','first-child','focus','hover','lang','link','visited'];var TAGS=['a','abbr','address','article','aside','audio','b','blockquote','body','button','canvas','caption','cite','code','dd','del','details','dfn','div','dl','dt','em','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','header','hgroup','html','i','iframe','img','input','ins','kbd','label','legend','li','mark','menu','nav','object','ol','p','q','quote','samp','section','span','strong','summary','sup','table','tbody','td','textarea','tfoot','th','thead','time','tr','ul','var','video'];var TAG_END='[\\.\\s\\n\\[\\:,]';var ATTRIBUTES=['align-content','align-items','align-self','animation','animation-delay','animation-direction','animation-duration','animation-fill-mode','animation-iteration-count','animation-name','animation-play-state','animation-timing-function','auto','backface-visibility','background','background-attachment','background-clip','background-color','background-image','background-origin','background-position','background-repeat','background-size','border','border-bottom','border-bottom-color','border-bottom-left-radius','border-bottom-right-radius','border-bottom-style','border-bottom-width','border-collapse','border-color','border-image','border-image-outset','border-image-repeat','border-image-slice','border-image-source','border-image-width','border-left','border-left-color','border-left-style','border-left-width','border-radius','border-right','border-right-color','border-right-style','border-right-width','border-spacing','border-style','border-top','border-top-color','border-top-left-radius','border-top-right-radius','border-top-style','border-top-width','border-width','bottom','box-decoration-break','box-shadow','box-sizing','break-after','break-before','break-inside','caption-side','clear','clip','clip-path','color','column-count','column-fill','column-gap','column-rule','column-rule-color','column-rule-style','column-rule-width','column-span','column-width','columns','content','counter-increment','counter-reset','cursor','direction','display','empty-cells','filter','flex','flex-basis','flex-direction','flex-flow','flex-grow','flex-shrink','flex-wrap','float','font','font-family','font-feature-settings','font-kerning','font-language-override','font-size','font-size-adjust','font-stretch','font-style','font-variant','font-variant-ligatures','font-weight','height','hyphens','icon','image-orientation','image-rendering','image-resolution','ime-mode','inherit','initial','justify-content','left','letter-spacing','line-height','list-style','list-style-image','list-style-position','list-style-type','margin','margin-bottom','margin-left','margin-right','margin-top','marks','mask','max-height','max-width','min-height','min-width','nav-down','nav-index','nav-left','nav-right','nav-up','none','normal','object-fit','object-position','opacity','order','orphans','outline','outline-color','outline-offset','outline-style','outline-width','overflow','overflow-wrap','overflow-x','overflow-y','padding','padding-bottom','padding-left','padding-right','padding-top','page-break-after','page-break-before','page-break-inside','perspective','perspective-origin','pointer-events','position','quotes','resize','right','tab-size','table-layout','text-align','text-align-last','text-decoration','text-decoration-color','text-decoration-line','text-decoration-style','text-indent','text-overflow','text-rendering','text-shadow','text-transform','text-underline-position','top','transform','transform-origin','transform-style','transition','transition-delay','transition-duration','transition-property','transition-timing-function','unicode-bidi','vertical-align','visibility','white-space','widows','width','word-break','word-spacing','word-wrap','z-index'];// illegals
var ILLEGAL=['\\?','(\\bReturn\\b)',// monkey
'(\\bEnd\\b)',// monkey
'(\\bend\\b)',// vbscript
'(\\bdef\\b)',// gradle
';',// a whole lot of languages
'#\\s',// markdown
'\\*\\s',// markdown
'===\\s',// markdown
'\\|','%'];return{aliases:['styl'],case_insensitive:false,keywords:'if else for in',illegal:'('+ILLEGAL.join('|')+')',contains:[// strings
hljs.QUOTE_STRING_MODE,hljs.APOS_STRING_MODE,// comments
hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,// hex colors
HEX_COLOR,// class tag
{begin:'\\.[a-zA-Z][a-zA-Z0-9_-]*'+TAG_END,returnBegin:true,contains:[{className:'selector-class',begin:'\\.[a-zA-Z][a-zA-Z0-9_-]*'}]},// id tag
{begin:'\\#[a-zA-Z][a-zA-Z0-9_-]*'+TAG_END,returnBegin:true,contains:[{className:'selector-id',begin:'\\#[a-zA-Z][a-zA-Z0-9_-]*'}]},// tags
{begin:'\\b('+TAGS.join('|')+')'+TAG_END,returnBegin:true,contains:[{className:'selector-tag',begin:'\\b[a-zA-Z][a-zA-Z0-9_-]*'}]},// psuedo selectors
{begin:'&?:?:\\b('+PSEUDO_SELECTORS.join('|')+')'+TAG_END},// @ keywords
{begin:'\@('+AT_KEYWORDS.join('|')+')\\b'},// variables
VARIABLE,// dimension
hljs.CSS_NUMBER_MODE,// number
hljs.NUMBER_MODE,// functions
//  - only from beginning of line + whitespace
{className:'function',begin:'^[a-zA-Z][a-zA-Z0-9_\-]*\\(.*\\)',illegal:'[\\n]',returnBegin:true,contains:[{className:'title',begin:'\\b[a-zA-Z][a-zA-Z0-9_\-]*'},{className:'params',begin:/\(/,end:/\)/,contains:[HEX_COLOR,VARIABLE,hljs.APOS_STRING_MODE,hljs.CSS_NUMBER_MODE,hljs.NUMBER_MODE,hljs.QUOTE_STRING_MODE]}]},// attributes
//  - only from beginning of line + whitespace
//  - must have whitespace after it
{className:'attribute',begin:'\\b('+ATTRIBUTES.reverse().join('|')+')\\b',starts:{// value container
end:/;|$/,contains:[HEX_COLOR,VARIABLE,hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.CSS_NUMBER_MODE,hljs.NUMBER_MODE,hljs.C_BLOCK_COMMENT_MODE],illegal:/\./,relevance:0}}]};});hljs.registerLanguage('subunit',function(hljs){var DETAILS={className:'string',begin:'\\[\n(multipart)?',end:'\\]\n'};var TIME={className:'string',begin:'\\d{4}-\\d{2}-\\d{2}(\\s+)\\d{2}:\\d{2}:\\d{2}\.\\d+Z'};var PROGRESSVALUE={className:'string',begin:'(\\+|-)\\d+'};var KEYWORDS={className:'keyword',relevance:10,variants:[{begin:'^(test|testing|success|successful|failure|error|skip|xfail|uxsuccess)(:?)\\s+(test)?'},{begin:'^progress(:?)(\\s+)?(pop|push)?'},{begin:'^tags:'},{begin:'^time:'}]};return{case_insensitive:true,contains:[DETAILS,TIME,PROGRESSVALUE,KEYWORDS]};});hljs.registerLanguage('swift',function(hljs){var SWIFT_KEYWORDS={keyword:'__COLUMN__ __FILE__ __FUNCTION__ __LINE__ as as! as? associativity '+'break case catch class continue convenience default defer deinit didSet do '+'dynamic dynamicType else enum extension fallthrough false final for func '+'get guard if import in indirect infix init inout internal is lazy left let '+'mutating nil none nonmutating operator optional override postfix precedence '+'prefix private protocol Protocol public repeat required rethrows return '+'right self Self set static struct subscript super switch throw throws true '+'try try! try? Type typealias unowned var weak where while willSet',literal:'true false nil',built_in:'abs advance alignof alignofValue anyGenerator assert assertionFailure '+'bridgeFromObjectiveC bridgeFromObjectiveCUnconditional bridgeToObjectiveC '+'bridgeToObjectiveCUnconditional c contains count countElements countLeadingZeros '+'debugPrint debugPrintln distance dropFirst dropLast dump encodeBitsAsWords '+'enumerate equal fatalError filter find getBridgedObjectiveCType getVaList '+'indices insertionSort isBridgedToObjectiveC isBridgedVerbatimToObjectiveC '+'isUniquelyReferenced isUniquelyReferencedNonObjC join lazy lexicographicalCompare '+'map max maxElement min minElement numericCast overlaps partition posix '+'precondition preconditionFailure print println quickSort readLine reduce reflect '+'reinterpretCast reverse roundUpToAlignment sizeof sizeofValue sort split '+'startsWith stride strideof strideofValue swap toString transcode '+'underestimateCount unsafeAddressOf unsafeBitCast unsafeDowncast unsafeUnwrap '+'unsafeReflect withExtendedLifetime withObjectAtPlusZero withUnsafePointer '+'withUnsafePointerToObject withUnsafeMutablePointer withUnsafeMutablePointers '+'withUnsafePointer withUnsafePointers withVaList zip'};var TYPE={className:'type',begin:'\\b[A-Z][\\w\u00C0-\u02B8\']*',relevance:0};var BLOCK_COMMENT=hljs.COMMENT('/\\*','\\*/',{contains:['self']});var SUBST={className:'subst',begin:/\\\(/,end:'\\)',keywords:SWIFT_KEYWORDS,contains:[]// assigned later
};var NUMBERS={className:'number',begin:'\\b([\\d_]+(\\.[\\deE_]+)?|0x[a-fA-F0-9_]+(\\.[a-fA-F0-9p_]+)?|0b[01_]+|0o[0-7_]+)\\b',relevance:0};var QUOTE_STRING_MODE=hljs.inherit(hljs.QUOTE_STRING_MODE,{contains:[SUBST,hljs.BACKSLASH_ESCAPE]});SUBST.contains=[NUMBERS];return{keywords:SWIFT_KEYWORDS,contains:[QUOTE_STRING_MODE,hljs.C_LINE_COMMENT_MODE,BLOCK_COMMENT,TYPE,NUMBERS,{className:'function',beginKeywords:'func',end:'{',excludeEnd:true,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:/[A-Za-z$_][0-9A-Za-z$_]*/}),{begin:/</,end:/>/},{className:'params',begin:/\(/,end:/\)/,endsParent:true,keywords:SWIFT_KEYWORDS,contains:['self',NUMBERS,QUOTE_STRING_MODE,hljs.C_BLOCK_COMMENT_MODE,{begin:':'// relevance booster
}],illegal:/["']/}],illegal:/\[|%/},{className:'class',beginKeywords:'struct protocol class extension enum',keywords:SWIFT_KEYWORDS,end:'\\{',excludeEnd:true,contains:[hljs.inherit(hljs.TITLE_MODE,{begin:/[A-Za-z$_][\u00C0-\u02B80-9A-Za-z$_]*/})]},{className:'meta',// @attributes
begin:'(@warn_unused_result|@exported|@lazy|@noescape|'+'@NSCopying|@NSManaged|@objc|@convention|@required|'+'@noreturn|@IBAction|@IBDesignable|@IBInspectable|@IBOutlet|'+'@infix|@prefix|@postfix|@autoclosure|@testable|@available|'+'@nonobjc|@NSApplicationMain|@UIApplicationMain)'},{beginKeywords:'import',end:/$/,contains:[hljs.C_LINE_COMMENT_MODE,BLOCK_COMMENT]}]};});hljs.registerLanguage('taggerscript',function(hljs){var COMMENT={className:'comment',begin:/\$noop\(/,end:/\)/,contains:[{begin:/\(/,end:/\)/,contains:['self',{begin:/\\./}]}],relevance:10};var FUNCTION={className:'keyword',begin:/\$(?!noop)[a-zA-Z][_a-zA-Z0-9]*/,end:/\(/,excludeEnd:true};var VARIABLE={className:'variable',begin:/%[_a-zA-Z0-9:]*/,end:'%'};var ESCAPE_SEQUENCE={className:'symbol',begin:/\\./};return{contains:[COMMENT,FUNCTION,VARIABLE,ESCAPE_SEQUENCE]};});hljs.registerLanguage('yaml',function(hljs){var LITERALS='true false yes no null';var keyPrefix='^[ \\-]*';var keyName='[a-zA-Z_][\\w\\-]*';var KEY={className:'attr',variants:[{begin:keyPrefix+keyName+":"},{begin:keyPrefix+'"'+keyName+'"'+":"},{begin:keyPrefix+"'"+keyName+"'"+":"}]};var TEMPLATE_VARIABLES={className:'template-variable',variants:[{begin:'\{\{',end:'\}\}'},// jinja templates Ansible
{begin:'%\{',end:'\}'// Ruby i18n
}]};var STRING={className:'string',relevance:0,variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/},{begin:/\S+/}],contains:[hljs.BACKSLASH_ESCAPE,TEMPLATE_VARIABLES]};return{case_insensitive:true,aliases:['yml','YAML','yaml'],contains:[KEY,{className:'meta',begin:'^---\s*$',relevance:10},{// multi line string
className:'string',begin:'[\\|>] *$',returnEnd:true,contains:STRING.contains,// very simple termination: next hash key
end:KEY.variants[0].begin},{// Ruby/Rails erb
begin:'<%[%=-]?',end:'[%-]?%>',subLanguage:'ruby',excludeBegin:true,excludeEnd:true,relevance:0},{// data type
className:'type',begin:'!!'+hljs.UNDERSCORE_IDENT_RE},{// fragment id &ref
className:'meta',begin:'&'+hljs.UNDERSCORE_IDENT_RE+'$'},{// fragment reference *ref
className:'meta',begin:'\\*'+hljs.UNDERSCORE_IDENT_RE+'$'},{// array listing
className:'bullet',begin:'^ *-',relevance:0},hljs.HASH_COMMENT_MODE,{beginKeywords:LITERALS,keywords:{literal:LITERALS}},hljs.C_NUMBER_MODE,STRING]};});hljs.registerLanguage('tap',function(hljs){return{case_insensitive:true,contains:[hljs.HASH_COMMENT_MODE,// version of format and total amount of testcases
{className:'meta',variants:[{begin:'^TAP version (\\d+)$'},{begin:'^1\\.\\.(\\d+)$'}]},// YAML block
{begin:'(\s+)?---$',end:'\\.\\.\\.$',subLanguage:'yaml',relevance:0},// testcase number
{className:'number',begin:' (\\d+) '},// testcase status and description
{className:'symbol',variants:[{begin:'^ok'},{begin:'^not ok'}]}]};});hljs.registerLanguage('tcl',function(hljs){return{aliases:['tk'],keywords:'after append apply array auto_execok auto_import auto_load auto_mkindex '+'auto_mkindex_old auto_qualify auto_reset bgerror binary break catch cd chan clock '+'close concat continue dde dict encoding eof error eval exec exit expr fblocked '+'fconfigure fcopy file fileevent filename flush for foreach format gets glob global '+'history http if incr info interp join lappend|10 lassign|10 lindex|10 linsert|10 list '+'llength|10 load lrange|10 lrepeat|10 lreplace|10 lreverse|10 lsearch|10 lset|10 lsort|10 '+'mathfunc mathop memory msgcat namespace open package parray pid pkg::create pkg_mkIndex '+'platform platform::shell proc puts pwd read refchan regexp registry regsub|10 rename '+'return safe scan seek set socket source split string subst switch tcl_endOfWord '+'tcl_findLibrary tcl_startOfNextWord tcl_startOfPreviousWord tcl_wordBreakAfter '+'tcl_wordBreakBefore tcltest tclvars tell time tm trace unknown unload unset update '+'uplevel upvar variable vwait while',contains:[hljs.COMMENT(';[ \\t]*#','$'),hljs.COMMENT('^[ \\t]*#','$'),{beginKeywords:'proc',end:'[\\{]',excludeEnd:true,contains:[{className:'title',begin:'[ \\t\\n\\r]+(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',end:'[ \\t\\n\\r]',endsWithParent:true,excludeEnd:true}]},{excludeEnd:true,variants:[{begin:'\\$(\\{)?(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*\\(([a-zA-Z0-9_])*\\)',end:'[^a-zA-Z0-9_\\}\\$]'},{begin:'\\$(\\{)?(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',end:'(\\))?[^a-zA-Z0-9_\\}\\$]'}]},{className:'string',contains:[hljs.BACKSLASH_ESCAPE],variants:[hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null})]},{className:'number',variants:[hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE]}]};});hljs.registerLanguage('tex',function(hljs){var COMMAND={className:'tag',begin:/\\/,relevance:0,contains:[{className:'name',variants:[{begin:/[a-zA-Zа-яА-я]+[*]?/},{begin:/[^a-zA-Zа-яА-я0-9]/}],starts:{endsWithParent:true,relevance:0,contains:[{className:'string',// because it looks like attributes in HTML tags
variants:[{begin:/\[/,end:/\]/},{begin:/\{/,end:/\}/}]},{begin:/\s*=\s*/,endsWithParent:true,relevance:0,contains:[{className:'number',begin:/-?\d*\.?\d+(pt|pc|mm|cm|in|dd|cc|ex|em)?/}]}]}}]};return{contains:[COMMAND,{className:'formula',contains:[COMMAND],relevance:0,variants:[{begin:/\$\$/,end:/\$\$/},{begin:/\$/,end:/\$/}]},hljs.COMMENT('%','$',{relevance:0})]};});hljs.registerLanguage('thrift',function(hljs){var BUILT_IN_TYPES='bool byte i16 i32 i64 double string binary';return{keywords:{keyword:'namespace const typedef struct enum service exception void oneway set list map required optional',built_in:BUILT_IN_TYPES,literal:'true false'},contains:[hljs.QUOTE_STRING_MODE,hljs.NUMBER_MODE,hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'class',beginKeywords:'struct enum service exception',end:/\{/,illegal:/\n/,contains:[hljs.inherit(hljs.TITLE_MODE,{starts:{endsWithParent:true,excludeEnd:true// hack: eating everything after the first title
}})]},{begin:'\\b(set|list|map)\\s*<',end:'>',keywords:BUILT_IN_TYPES,contains:['self']}]};});hljs.registerLanguage('tp',function(hljs){var TPID={className:'number',begin:'[1-9][0-9]*',/* no leading zeros */relevance:0};var TPLABEL={className:'symbol',begin:':[^\\]]+'};var TPDATA={className:'built_in',begin:'(AR|P|PAYLOAD|PR|R|SR|RSR|LBL|VR|UALM|MESSAGE|UTOOL|UFRAME|TIMER|\
    TIMER_OVERFLOW|JOINT_MAX_SPEED|RESUME_PROG|DIAG_REC)\\[',end:'\\]',contains:['self',TPID,TPLABEL]};var TPIO={className:'built_in',begin:'(AI|AO|DI|DO|F|RI|RO|UI|UO|GI|GO|SI|SO)\\[',end:'\\]',contains:['self',TPID,hljs.QUOTE_STRING_MODE,/* for pos section at bottom */TPLABEL]};return{keywords:{keyword:'ABORT ACC ADJUST AND AP_LD BREAK CALL CNT COL CONDITION CONFIG DA DB '+'DIV DETECT ELSE END ENDFOR ERR_NUM ERROR_PROG FINE FOR GP GUARD INC '+'IF JMP LINEAR_MAX_SPEED LOCK MOD MONITOR OFFSET Offset OR OVERRIDE '+'PAUSE PREG PTH RT_LD RUN SELECT SKIP Skip TA TB TO TOOL_OFFSET '+'Tool_Offset UF UT UFRAME_NUM UTOOL_NUM UNLOCK WAIT X Y Z W P R STRLEN '+'SUBSTR FINDSTR VOFFSET PROG ATTR MN POS',literal:'ON OFF max_speed LPOS JPOS ENABLE DISABLE START STOP RESET'},contains:[TPDATA,TPIO,{className:'keyword',begin:'/(PROG|ATTR|MN|POS|END)\\b'},{/* this is for cases like ,CALL */className:'keyword',begin:'(CALL|RUN|POINT_LOGIC|LBL)\\b'},{/* this is for cases like CNT100 where the default lexemes do not
         * separate the keyword and the number */className:'keyword',begin:'\\b(ACC|CNT|Skip|Offset|PSPD|RT_LD|AP_LD|Tool_Offset)'},{/* to catch numbers that do not have a word boundary on the left */className:'number',begin:'\\d+(sec|msec|mm/sec|cm/min|inch/min|deg/sec|mm|in|cm)?\\b',relevance:0},hljs.COMMENT('//','[;$]'),hljs.COMMENT('!','[;$]'),hljs.COMMENT('--eg:','$'),hljs.QUOTE_STRING_MODE,{className:'string',begin:'\'',end:'\''},hljs.C_NUMBER_MODE,{className:'variable',begin:'\\$[A-Za-z0-9_]+'}]};});hljs.registerLanguage('twig',function(hljs){var PARAMS={className:'params',begin:'\\(',end:'\\)'};var FUNCTION_NAMES='attribute block constant cycle date dump include '+'max min parent random range source template_from_string';var FUNCTIONS={beginKeywords:FUNCTION_NAMES,keywords:{name:FUNCTION_NAMES},relevance:0,contains:[PARAMS]};var FILTER={begin:/\|[A-Za-z_]+:?/,keywords:'abs batch capitalize convert_encoding date date_modify default '+'escape first format join json_encode keys last length lower '+'merge nl2br number_format raw replace reverse round slice sort split '+'striptags title trim upper url_encode',contains:[FUNCTIONS]};var TAGS='autoescape block do embed extends filter flush for '+'if import include macro sandbox set spaceless use verbatim';TAGS=TAGS+' '+TAGS.split(' ').map(function(t){return'end'+t;}).join(' ');return{aliases:['craftcms'],case_insensitive:true,subLanguage:'xml',contains:[hljs.COMMENT(/\{#/,/#}/),{className:'template-tag',begin:/\{%/,end:/%}/,contains:[{className:'name',begin:/\w+/,keywords:TAGS,starts:{endsWithParent:true,contains:[FILTER,FUNCTIONS],relevance:0}}]},{className:'template-variable',begin:/\{\{/,end:/}}/,contains:['self',FILTER,FUNCTIONS]}]};});hljs.registerLanguage('typescript',function(hljs){var KEYWORDS={keyword:'in if for while finally var new function do return void else break catch '+'instanceof with throw case default try this switch continue typeof delete '+'let yield const class public private protected get set super '+'static implements enum export import declare type namespace abstract '+'as from extends async await',literal:'true false null undefined NaN Infinity',built_in:'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent '+'encodeURI encodeURIComponent escape unescape Object Function Boolean Error '+'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError '+'TypeError URIError Number Math Date String RegExp Array Float32Array '+'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array '+'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require '+'module console window document any number boolean string void Promise'};return{aliases:['ts'],keywords:KEYWORDS,contains:[{className:'meta',begin:/^\s*['"]use strict['"]/},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,{// template string
className:'string',begin:'`',end:'`',contains:[hljs.BACKSLASH_ESCAPE,{className:'subst',begin:'\\$\\{',end:'\\}'}]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'number',variants:[{begin:'\\b(0[bB][01]+)'},{begin:'\\b(0[oO][0-7]+)'},{begin:hljs.C_NUMBER_RE}],relevance:0},{// "value" container
begin:'('+hljs.RE_STARTERS_RE+'|\\b(case|return|throw)\\b)\\s*',keywords:'return throw case',contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,hljs.REGEXP_MODE,{className:'function',begin:'(\\(.*?\\)|'+hljs.IDENT_RE+')\\s*=>',returnBegin:true,end:'\\s*=>',contains:[{className:'params',variants:[{begin:hljs.IDENT_RE},{begin:/\(\s*\)/},{begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,keywords:KEYWORDS,contains:['self',hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE]}]}]}],relevance:0},{className:'function',begin:'function',end:/[\{;]/,excludeEnd:true,keywords:KEYWORDS,contains:['self',hljs.inherit(hljs.TITLE_MODE,{begin:/[A-Za-z$_][0-9A-Za-z$_]*/}),{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,keywords:KEYWORDS,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE],illegal:/["'\(]/}],illegal:/%/,relevance:0// () => {} is more typical in TypeScript
},{beginKeywords:'constructor',end:/\{/,excludeEnd:true,contains:['self',{className:'params',begin:/\(/,end:/\)/,excludeBegin:true,excludeEnd:true,keywords:KEYWORDS,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE],illegal:/["'\(]/}]},{// prevent references like module.id from being higlighted as module definitions
begin:/module\./,keywords:{built_in:'module'},relevance:0},{beginKeywords:'module',end:/\{/,excludeEnd:true},{beginKeywords:'interface',end:/\{/,excludeEnd:true,keywords:'interface extends'},{begin:/\$[(.]/// relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
},{begin:'\\.'+hljs.IDENT_RE,relevance:0// hack: prevents detection of keywords after dots
},{className:'meta',begin:'@[A-Za-z]+'}]};});hljs.registerLanguage('vala',function(hljs){return{keywords:{keyword:// Value types
'char uchar unichar int uint long ulong short ushort int8 int16 int32 int64 uint8 '+'uint16 uint32 uint64 float double bool struct enum string void '+// Reference types
'weak unowned owned '+// Modifiers
'async signal static abstract interface override virtual delegate '+// Control Structures
'if while do for foreach else switch case break default return try catch '+// Visibility
'public private protected internal '+// Other
'using new this get set const stdout stdin stderr var',built_in:'DBus GLib CCode Gee Object Gtk Posix',literal:'false true null'},contains:[{className:'class',beginKeywords:'class interface namespace',end:'{',excludeEnd:true,illegal:'[^,:\\n\\s\\.]',contains:[hljs.UNDERSCORE_TITLE_MODE]},hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,{className:'string',begin:'"""',end:'"""',relevance:5},hljs.APOS_STRING_MODE,hljs.QUOTE_STRING_MODE,hljs.C_NUMBER_MODE,{className:'meta',begin:'^#',end:'$',relevance:2}]};});hljs.registerLanguage('vbnet',function(hljs){return{aliases:['vb'],case_insensitive:true,keywords:{keyword:'addhandler addressof alias and andalso aggregate ansi as assembly auto binary by byref byval '+/* a-b */'call case catch class compare const continue custom declare default delegate dim distinct do '+/* c-d */'each equals else elseif end enum erase error event exit explicit finally for friend from function '+/* e-f */'get global goto group handles if implements imports in inherits interface into is isfalse isnot istrue '+/* g-i */'join key let lib like loop me mid mod module mustinherit mustoverride mybase myclass '+/* j-m */'namespace narrowing new next not notinheritable notoverridable '+/* n */'of off on operator option optional or order orelse overloads overridable overrides '+/* o */'paramarray partial preserve private property protected public '+/* p */'raiseevent readonly redim rem removehandler resume return '+/* r */'select set shadows shared skip static step stop structure strict sub synclock '+/* s */'take text then throw to try unicode until using when where while widening with withevents writeonly xor',/* t-x */built_in:'boolean byte cbool cbyte cchar cdate cdec cdbl char cint clng cobj csbyte cshort csng cstr ctype '+/* b-c */'date decimal directcast double gettype getxmlnamespace iif integer long object '+/* d-o */'sbyte short single string trycast typeof uinteger ulong ushort',/* s-u */literal:'true false nothing'},illegal:'//|{|}|endif|gosub|variant|wend',/* reserved deprecated keywords */contains:[hljs.inherit(hljs.QUOTE_STRING_MODE,{contains:[{begin:'""'}]}),hljs.COMMENT('\'','$',{returnBegin:true,contains:[{className:'doctag',begin:'\'\'\'|<!--|-->',contains:[hljs.PHRASAL_WORDS_MODE]},{className:'doctag',begin:'</?',end:'>',contains:[hljs.PHRASAL_WORDS_MODE]}]}),hljs.C_NUMBER_MODE,{className:'meta',begin:'#',end:'$',keywords:{'meta-keyword':'if else elseif end region externalsource'}}]};});hljs.registerLanguage('vbscript',function(hljs){return{aliases:['vbs'],case_insensitive:true,keywords:{keyword:'call class const dim do loop erase execute executeglobal exit for each next function '+'if then else on error option explicit new private property let get public randomize '+'redim rem select case set stop sub while wend with end to elseif is or xor and not '+'class_initialize class_terminate default preserve in me byval byref step resume goto',built_in:'lcase month vartype instrrev ubound setlocale getobject rgb getref string '+'weekdayname rnd dateadd monthname now day minute isarray cbool round formatcurrency '+'conversions csng timevalue second year space abs clng timeserial fixs len asc '+'isempty maths dateserial atn timer isobject filter weekday datevalue ccur isdate '+'instr datediff formatdatetime replace isnull right sgn array snumeric log cdbl hex '+'chr lbound msgbox ucase getlocale cos cdate cbyte rtrim join hour oct typename trim '+'strcomp int createobject loadpicture tan formatnumber mid scriptenginebuildversion '+'scriptengine split scriptengineminorversion cint sin datepart ltrim sqr '+'scriptenginemajorversion time derived eval date formatpercent exp inputbox left ascw '+'chrw regexp server response request cstr err',literal:'true false null nothing empty'},illegal:'//',contains:[hljs.inherit(hljs.QUOTE_STRING_MODE,{contains:[{begin:'""'}]}),hljs.COMMENT(/'/,/$/,{relevance:0}),hljs.C_NUMBER_MODE]};});hljs.registerLanguage('vbscript-html',function(hljs){return{subLanguage:'xml',contains:[{begin:'<%',end:'%>',subLanguage:'vbscript'}]};});hljs.registerLanguage('verilog',function(hljs){var SV_KEYWORDS={keyword:'accept_on alias always always_comb always_ff always_latch and assert assign '+'assume automatic before begin bind bins binsof bit break buf|0 bufif0 bufif1 '+'byte case casex casez cell chandle checker class clocking cmos config const '+'constraint context continue cover covergroup coverpoint cross deassign default '+'defparam design disable dist do edge else end endcase endchecker endclass '+'endclocking endconfig endfunction endgenerate endgroup endinterface endmodule '+'endpackage endprimitive endprogram endproperty endspecify endsequence endtable '+'endtask enum event eventually expect export extends extern final first_match for '+'force foreach forever fork forkjoin function generate|5 genvar global highz0 highz1 '+'if iff ifnone ignore_bins illegal_bins implements implies import incdir include '+'initial inout input inside instance int integer interconnect interface intersect '+'join join_any join_none large let liblist library local localparam logic longint '+'macromodule matches medium modport module nand negedge nettype new nexttime nmos '+'nor noshowcancelled not notif0 notif1 or output package packed parameter pmos '+'posedge primitive priority program property protected pull0 pull1 pulldown pullup '+'pulsestyle_ondetect pulsestyle_onevent pure rand randc randcase randsequence rcmos '+'real realtime ref reg reject_on release repeat restrict return rnmos rpmos rtran '+'rtranif0 rtranif1 s_always s_eventually s_nexttime s_until s_until_with scalared '+'sequence shortint shortreal showcancelled signed small soft solve specify specparam '+'static string strong strong0 strong1 struct super supply0 supply1 sync_accept_on '+'sync_reject_on table tagged task this throughout time timeprecision timeunit tran '+'tranif0 tranif1 tri tri0 tri1 triand trior trireg type typedef union unique unique0 '+'unsigned until until_with untyped use uwire var vectored virtual void wait wait_order '+'wand weak weak0 weak1 while wildcard wire with within wor xnor xor',literal:'null',built_in:'$finish $stop $exit $fatal $error $warning $info $realtime $time $printtimescale '+'$bitstoreal $bitstoshortreal $itor $signed $cast $bits $stime $timeformat '+'$realtobits $shortrealtobits $rtoi $unsigned $asserton $assertkill $assertpasson '+'$assertfailon $assertnonvacuouson $assertoff $assertcontrol $assertpassoff '+'$assertfailoff $assertvacuousoff $isunbounded $sampled $fell $changed $past_gclk '+'$fell_gclk $changed_gclk $rising_gclk $steady_gclk $coverage_control '+'$coverage_get $coverage_save $set_coverage_db_name $rose $stable $past '+'$rose_gclk $stable_gclk $future_gclk $falling_gclk $changing_gclk $display '+'$coverage_get_max $coverage_merge $get_coverage $load_coverage_db $typename '+'$unpacked_dimensions $left $low $increment $clog2 $ln $log10 $exp $sqrt $pow '+'$floor $ceil $sin $cos $tan $countbits $onehot $isunknown $fatal $warning '+'$dimensions $right $high $size $asin $acos $atan $atan2 $hypot $sinh $cosh '+'$tanh $asinh $acosh $atanh $countones $onehot0 $error $info $random '+'$dist_chi_square $dist_erlang $dist_exponential $dist_normal $dist_poisson '+'$dist_t $dist_uniform $q_initialize $q_remove $q_exam $async$and$array '+'$async$nand$array $async$or$array $async$nor$array $sync$and$array '+'$sync$nand$array $sync$or$array $sync$nor$array $q_add $q_full $psprintf '+'$async$and$plane $async$nand$plane $async$or$plane $async$nor$plane '+'$sync$and$plane $sync$nand$plane $sync$or$plane $sync$nor$plane $system '+'$display $displayb $displayh $displayo $strobe $strobeb $strobeh $strobeo '+'$write $readmemb $readmemh $writememh $value$plusargs '+'$dumpvars $dumpon $dumplimit $dumpports $dumpportson $dumpportslimit '+'$writeb $writeh $writeo $monitor $monitorb $monitorh $monitoro $writememb '+'$dumpfile $dumpoff $dumpall $dumpflush $dumpportsoff $dumpportsall '+'$dumpportsflush $fclose $fdisplay $fdisplayb $fdisplayh $fdisplayo '+'$fstrobe $fstrobeb $fstrobeh $fstrobeo $swrite $swriteb $swriteh '+'$swriteo $fscanf $fread $fseek $fflush $feof $fopen $fwrite $fwriteb '+'$fwriteh $fwriteo $fmonitor $fmonitorb $fmonitorh $fmonitoro $sformat '+'$sformatf $fgetc $ungetc $fgets $sscanf $rewind $ftell $ferror'};return{aliases:['v','sv','svh'],case_insensitive:false,keywords:SV_KEYWORDS,lexemes:/[\w\$]+/,contains:[hljs.C_BLOCK_COMMENT_MODE,hljs.C_LINE_COMMENT_MODE,hljs.QUOTE_STRING_MODE,{className:'number',contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:'\\b((\\d+\'(b|h|o|d|B|H|O|D))[0-9xzXZa-fA-F_]+)'},{begin:'\\B((\'(b|h|o|d|B|H|O|D))[0-9xzXZa-fA-F_]+)'},{begin:'\\b([0-9_])+',relevance:0}]},/* parameters to instances */{className:'variable',variants:[{begin:'#\\((?!parameter).+\\)'},{begin:'\\.\\w+',relevance:0}]},{className:'meta',begin:'`',end:'$',keywords:{'meta-keyword':'define __FILE__ '+'__LINE__ begin_keywords celldefine default_nettype define '+'else elsif end_keywords endcelldefine endif ifdef ifndef '+'include line nounconnected_drive pragma resetall timescale '+'unconnected_drive undef undefineall'},relevance:0}]};// return
});hljs.registerLanguage('vhdl',function(hljs){// Regular expression for VHDL numeric literals.
// Decimal literal:
var INTEGER_RE='\\d(_|\\d)*';var EXPONENT_RE='[eE][-+]?'+INTEGER_RE;var DECIMAL_LITERAL_RE=INTEGER_RE+'(\\.'+INTEGER_RE+')?'+'('+EXPONENT_RE+')?';// Based literal:
var BASED_INTEGER_RE='\\w+';var BASED_LITERAL_RE=INTEGER_RE+'#'+BASED_INTEGER_RE+'(\\.'+BASED_INTEGER_RE+')?'+'#'+'('+EXPONENT_RE+')?';var NUMBER_RE='\\b('+BASED_LITERAL_RE+'|'+DECIMAL_LITERAL_RE+')';return{case_insensitive:true,keywords:{keyword:'abs access after alias all and architecture array assert assume assume_guarantee attribute '+'begin block body buffer bus case component configuration constant context cover disconnect '+'downto default else elsif end entity exit fairness file for force function generate '+'generic group guarded if impure in inertial inout is label library linkage literal '+'loop map mod nand new next nor not null of on open or others out package port '+'postponed procedure process property protected pure range record register reject '+'release rem report restrict restrict_guarantee return rol ror select sequence '+'severity shared signal sla sll sra srl strong subtype then to transport type '+'unaffected units until use variable vmode vprop vunit wait when while with xnor xor',built_in:'boolean bit character '+'integer time delay_length natural positive '+'string bit_vector file_open_kind file_open_status '+'std_logic std_logic_vector unsigned signed boolean_vector integer_vector '+'std_ulogic std_ulogic_vector unresolved_unsigned u_unsigned unresolved_signed u_signed'+'real_vector time_vector',literal:'false true note warning error failure '+// severity_level
'line text side width'// textio
},illegal:'{',contains:[hljs.C_BLOCK_COMMENT_MODE,// VHDL-2008 block commenting.
hljs.COMMENT('--','$'),hljs.QUOTE_STRING_MODE,{className:'number',begin:NUMBER_RE,relevance:0},{className:'string',begin:'\'(U|X|0|1|Z|W|L|H|-)\'',contains:[hljs.BACKSLASH_ESCAPE]},{className:'symbol',begin:'\'[A-Za-z](_?[A-Za-z0-9])*',contains:[hljs.BACKSLASH_ESCAPE]}]};});hljs.registerLanguage('vim',function(hljs){return{lexemes:/[!#@\w]+/,keywords:{keyword:// express version except: ! & * < = > !! # @ @@
'N|0 P|0 X|0 a|0 ab abc abo al am an|0 ar arga argd arge argdo argg argl argu as au aug aun b|0 bN ba bad bd be bel bf bl bm bn bo bp br brea breaka breakd breakl bro bufdo buffers bun bw c|0 cN cNf ca cabc caddb cad caddf cal cat cb cc ccl cd ce cex cf cfir cgetb cgete cg changes chd che checkt cl cla clo cm cmapc cme cn cnew cnf cno cnorea cnoreme co col colo com comc comp con conf cope '+'cp cpf cq cr cs cst cu cuna cunme cw delm deb debugg delc delf dif diffg diffo diffp diffpu diffs diffthis dig di dl dell dj dli do doautoa dp dr ds dsp e|0 ea ec echoe echoh echom echon el elsei em en endfo endf endt endw ene ex exe exi exu f|0 files filet fin fina fini fir fix fo foldc foldd folddoc foldo for fu go gr grepa gu gv ha helpf helpg helpt hi hid his ia iabc if ij il im imapc '+'ime ino inorea inoreme int is isp iu iuna iunme j|0 ju k|0 keepa kee keepj lN lNf l|0 lad laddb laddf la lan lat lb lc lch lcl lcs le lefta let lex lf lfir lgetb lgete lg lgr lgrepa lh ll lla lli lmak lm lmapc lne lnew lnf ln loadk lo loc lockv lol lope lp lpf lr ls lt lu lua luad luaf lv lvimgrepa lw m|0 ma mak map mapc marks mat me menut mes mk mks mksp mkv mkvie mod mz mzf nbc nb nbs new nm nmapc nme nn nnoreme noa no noh norea noreme norm nu nun nunme ol o|0 om omapc ome on ono onoreme opt ou ounme ow p|0 '+'profd prof pro promptr pc ped pe perld po popu pp pre prev ps pt ptN ptf ptj ptl ptn ptp ptr pts pu pw py3 python3 py3d py3f py pyd pyf quita qa rec red redi redr redraws reg res ret retu rew ri rightb rub rubyd rubyf rund ru rv sN san sa sal sav sb sbN sba sbf sbl sbm sbn sbp sbr scrip scripte scs se setf setg setl sf sfir sh sim sig sil sl sla sm smap smapc sme sn sni sno snor snoreme sor '+'so spelld spe spelli spellr spellu spellw sp spr sre st sta startg startr star stopi stj sts sun sunm sunme sus sv sw sy synti sync tN tabN tabc tabdo tabe tabf tabfir tabl tabm tabnew '+'tabn tabo tabp tabr tabs tab ta tags tc tcld tclf te tf th tj tl tm tn to tp tr try ts tu u|0 undoj undol una unh unl unlo unm unme uns up ve verb vert vim vimgrepa vi viu vie vm vmapc vme vne vn vnoreme vs vu vunme windo w|0 wN wa wh wi winc winp wn wp wq wqa ws wu wv x|0 xa xmapc xm xme xn xnoreme xu xunme y|0 z|0 ~ '+// full version
'Next Print append abbreviate abclear aboveleft all amenu anoremenu args argadd argdelete argedit argglobal arglocal argument ascii autocmd augroup aunmenu buffer bNext ball badd bdelete behave belowright bfirst blast bmodified bnext botright bprevious brewind break breakadd breakdel breaklist browse bunload '+'bwipeout change cNext cNfile cabbrev cabclear caddbuffer caddexpr caddfile call catch cbuffer cclose center cexpr cfile cfirst cgetbuffer cgetexpr cgetfile chdir checkpath checktime clist clast close cmap cmapclear cmenu cnext cnewer cnfile cnoremap cnoreabbrev cnoremenu copy colder colorscheme command comclear compiler continue confirm copen cprevious cpfile cquit crewind cscope cstag cunmap '+'cunabbrev cunmenu cwindow delete delmarks debug debuggreedy delcommand delfunction diffupdate diffget diffoff diffpatch diffput diffsplit digraphs display deletel djump dlist doautocmd doautoall deletep drop dsearch dsplit edit earlier echo echoerr echohl echomsg else elseif emenu endif endfor '+'endfunction endtry endwhile enew execute exit exusage file filetype find finally finish first fixdel fold foldclose folddoopen folddoclosed foldopen function global goto grep grepadd gui gvim hardcopy help helpfind helpgrep helptags highlight hide history insert iabbrev iabclear ijump ilist imap '+'imapclear imenu inoremap inoreabbrev inoremenu intro isearch isplit iunmap iunabbrev iunmenu join jumps keepalt keepmarks keepjumps lNext lNfile list laddexpr laddbuffer laddfile last language later lbuffer lcd lchdir lclose lcscope left leftabove lexpr lfile lfirst lgetbuffer lgetexpr lgetfile lgrep lgrepadd lhelpgrep llast llist lmake lmap lmapclear lnext lnewer lnfile lnoremap loadkeymap loadview '+'lockmarks lockvar lolder lopen lprevious lpfile lrewind ltag lunmap luado luafile lvimgrep lvimgrepadd lwindow move mark make mapclear match menu menutranslate messages mkexrc mksession mkspell mkvimrc mkview mode mzscheme mzfile nbclose nbkey nbsart next nmap nmapclear nmenu nnoremap '+'nnoremenu noautocmd noremap nohlsearch noreabbrev noremenu normal number nunmap nunmenu oldfiles open omap omapclear omenu only onoremap onoremenu options ounmap ounmenu ownsyntax print profdel profile promptfind promptrepl pclose pedit perl perldo pop popup ppop preserve previous psearch ptag ptNext '+'ptfirst ptjump ptlast ptnext ptprevious ptrewind ptselect put pwd py3do py3file python pydo pyfile quit quitall qall read recover redo redir redraw redrawstatus registers resize retab return rewind right rightbelow ruby rubydo rubyfile rundo runtime rviminfo substitute sNext sandbox sargument sall saveas sbuffer sbNext sball sbfirst sblast sbmodified sbnext sbprevious sbrewind scriptnames scriptencoding '+'scscope set setfiletype setglobal setlocal sfind sfirst shell simalt sign silent sleep slast smagic smapclear smenu snext sniff snomagic snoremap snoremenu sort source spelldump spellgood spellinfo spellrepall spellundo spellwrong split sprevious srewind stop stag startgreplace startreplace '+'startinsert stopinsert stjump stselect sunhide sunmap sunmenu suspend sview swapname syntax syntime syncbind tNext tabNext tabclose tabedit tabfind tabfirst tablast tabmove tabnext tabonly tabprevious tabrewind tag tcl tcldo tclfile tearoff tfirst throw tjump tlast tmenu tnext topleft tprevious '+'trewind tselect tunmenu undo undojoin undolist unabbreviate unhide unlet unlockvar unmap unmenu unsilent update vglobal version verbose vertical vimgrep vimgrepadd visual viusage view vmap vmapclear vmenu vnew '+'vnoremap vnoremenu vsplit vunmap vunmenu write wNext wall while winsize wincmd winpos wnext wprevious wqall wsverb wundo wviminfo xit xall xmapclear xmap xmenu xnoremap xnoremenu xunmap xunmenu yank',built_in://built in func
'synIDtrans atan2 range matcharg did_filetype asin feedkeys xor argv '+'complete_check add getwinposx getqflist getwinposy screencol '+'clearmatches empty extend getcmdpos mzeval garbagecollect setreg '+'ceil sqrt diff_hlID inputsecret get getfperm getpid filewritable '+'shiftwidth max sinh isdirectory synID system inputrestore winline '+'atan visualmode inputlist tabpagewinnr round getregtype mapcheck '+'hasmapto histdel argidx findfile sha256 exists toupper getcmdline '+'taglist string getmatches bufnr strftime winwidth bufexists '+'strtrans tabpagebuflist setcmdpos remote_read printf setloclist '+'getpos getline bufwinnr float2nr len getcmdtype diff_filler luaeval '+'resolve libcallnr foldclosedend reverse filter has_key bufname '+'str2float strlen setline getcharmod setbufvar index searchpos '+'shellescape undofile foldclosed setqflist buflisted strchars str2nr '+'virtcol floor remove undotree remote_expr winheight gettabwinvar '+'reltime cursor tabpagenr finddir localtime acos getloclist search '+'tanh matchend rename gettabvar strdisplaywidth type abs py3eval '+'setwinvar tolower wildmenumode log10 spellsuggest bufloaded '+'synconcealed nextnonblank server2client complete settabwinvar '+'executable input wincol setmatches getftype hlID inputsave '+'searchpair or screenrow line settabvar histadd deepcopy strpart '+'remote_peek and eval getftime submatch screenchar winsaveview '+'matchadd mkdir screenattr getfontname libcall reltimestr getfsize '+'winnr invert pow getbufline byte2line soundfold repeat fnameescape '+'tagfiles sin strwidth spellbadword trunc maparg log lispindent '+'hostname setpos globpath remote_foreground getchar synIDattr '+'fnamemodify cscope_connection stridx winbufnr indent min '+'complete_add nr2char searchpairpos inputdialog values matchlist '+'items hlexists strridx browsedir expand fmod pathshorten line2byte '+'argc count getwinvar glob foldtextresult getreg foreground cosh '+'matchdelete has char2nr simplify histget searchdecl iconv '+'winrestcmd pumvisible writefile foldlevel haslocaldir keys cos '+'matchstr foldtext histnr tan tempname getcwd byteidx getbufvar '+'islocked escape eventhandler remote_send serverlist winrestview '+'synstack pyeval prevnonblank readfile cindent filereadable changenr '+'exp'},illegal:/;/,contains:[hljs.NUMBER_MODE,hljs.APOS_STRING_MODE,/*
      A double quote can start either a string or a line comment. Strings are
      ended before the end of a line by another double quote and can contain
      escaped double-quotes and post-escaped line breaks.

      Also, any double quote at the beginning of a line is a comment but we
      don't handle that properly at the moment: any double quote inside will
      turn them into a string. Handling it properly will require a smarter
      parser.
      */{className:'string',begin:/"(\\"|\n\\|[^"\n])*"/},hljs.COMMENT('"','$'),{className:'variable',begin:/[bwtglsav]:[\w\d_]*/},{className:'function',beginKeywords:'function function!',end:'$',relevance:0,contains:[hljs.TITLE_MODE,{className:'params',begin:'\\(',end:'\\)'}]},{className:'symbol',begin:/<[\w-]+>/}]};});hljs.registerLanguage('x86asm',function(hljs){return{case_insensitive:true,lexemes:'[.%]?'+hljs.IDENT_RE,keywords:{keyword:'lock rep repe repz repne repnz xaquire xrelease bnd nobnd '+'aaa aad aam aas adc add and arpl bb0_reset bb1_reset bound bsf bsr bswap bt btc btr bts call cbw cdq cdqe clc cld cli clts cmc cmp cmpsb cmpsd cmpsq cmpsw cmpxchg cmpxchg486 cmpxchg8b cmpxchg16b cpuid cpu_read cpu_write cqo cwd cwde daa das dec div dmint emms enter equ f2xm1 fabs fadd faddp fbld fbstp fchs fclex fcmovb fcmovbe fcmove fcmovnb fcmovnbe fcmovne fcmovnu fcmovu fcom fcomi fcomip fcomp fcompp fcos fdecstp fdisi fdiv fdivp fdivr fdivrp femms feni ffree ffreep fiadd ficom ficomp fidiv fidivr fild fimul fincstp finit fist fistp fisttp fisub fisubr fld fld1 fldcw fldenv fldl2e fldl2t fldlg2 fldln2 fldpi fldz fmul fmulp fnclex fndisi fneni fninit fnop fnsave fnstcw fnstenv fnstsw fpatan fprem fprem1 fptan frndint frstor fsave fscale fsetpm fsin fsincos fsqrt fst fstcw fstenv fstp fstsw fsub fsubp fsubr fsubrp ftst fucom fucomi fucomip fucomp fucompp fxam fxch fxtract fyl2x fyl2xp1 hlt ibts icebp idiv imul in inc incbin insb insd insw int int01 int1 int03 int3 into invd invpcid invlpg invlpga iret iretd iretq iretw jcxz jecxz jrcxz jmp jmpe lahf lar lds lea leave les lfence lfs lgdt lgs lidt lldt lmsw loadall loadall286 lodsb lodsd lodsq lodsw loop loope loopne loopnz loopz lsl lss ltr mfence monitor mov movd movq movsb movsd movsq movsw movsx movsxd movzx mul mwait neg nop not or out outsb outsd outsw packssdw packsswb packuswb paddb paddd paddsb paddsiw paddsw paddusb paddusw paddw pand pandn pause paveb pavgusb pcmpeqb pcmpeqd pcmpeqw pcmpgtb pcmpgtd pcmpgtw pdistib pf2id pfacc pfadd pfcmpeq pfcmpge pfcmpgt pfmax pfmin pfmul pfrcp pfrcpit1 pfrcpit2 pfrsqit1 pfrsqrt pfsub pfsubr pi2fd pmachriw pmaddwd pmagw pmulhriw pmulhrwa pmulhrwc pmulhw pmullw pmvgezb pmvlzb pmvnzb pmvzb pop popa popad popaw popf popfd popfq popfw por prefetch prefetchw pslld psllq psllw psrad psraw psrld psrlq psrlw psubb psubd psubsb psubsiw psubsw psubusb psubusw psubw punpckhbw punpckhdq punpckhwd punpcklbw punpckldq punpcklwd push pusha pushad pushaw pushf pushfd pushfq pushfw pxor rcl rcr rdshr rdmsr rdpmc rdtsc rdtscp ret retf retn rol ror rdm rsdc rsldt rsm rsts sahf sal salc sar sbb scasb scasd scasq scasw sfence sgdt shl shld shr shrd sidt sldt skinit smi smint smintold smsw stc std sti stosb stosd stosq stosw str sub svdc svldt svts swapgs syscall sysenter sysexit sysret test ud0 ud1 ud2b ud2 ud2a umov verr verw fwait wbinvd wrshr wrmsr xadd xbts xchg xlatb xlat xor cmove cmovz cmovne cmovnz cmova cmovnbe cmovae cmovnb cmovb cmovnae cmovbe cmovna cmovg cmovnle cmovge cmovnl cmovl cmovnge cmovle cmovng cmovc cmovnc cmovo cmovno cmovs cmovns cmovp cmovpe cmovnp cmovpo je jz jne jnz ja jnbe jae jnb jb jnae jbe jna jg jnle jge jnl jl jnge jle jng jc jnc jo jno js jns jpo jnp jpe jp sete setz setne setnz seta setnbe setae setnb setnc setb setnae setcset setbe setna setg setnle setge setnl setl setnge setle setng sets setns seto setno setpe setp setpo setnp addps addss andnps andps cmpeqps cmpeqss cmpleps cmpless cmpltps cmpltss cmpneqps cmpneqss cmpnleps cmpnless cmpnltps cmpnltss cmpordps cmpordss cmpunordps cmpunordss cmpps cmpss comiss cvtpi2ps cvtps2pi cvtsi2ss cvtss2si cvttps2pi cvttss2si divps divss ldmxcsr maxps maxss minps minss movaps movhps movlhps movlps movhlps movmskps movntps movss movups mulps mulss orps rcpps rcpss rsqrtps rsqrtss shufps sqrtps sqrtss stmxcsr subps subss ucomiss unpckhps unpcklps xorps fxrstor fxrstor64 fxsave fxsave64 xgetbv xsetbv xsave xsave64 xsaveopt xsaveopt64 xrstor xrstor64 prefetchnta prefetcht0 prefetcht1 prefetcht2 maskmovq movntq pavgb pavgw pextrw pinsrw pmaxsw pmaxub pminsw pminub pmovmskb pmulhuw psadbw pshufw pf2iw pfnacc pfpnacc pi2fw pswapd maskmovdqu clflush movntdq movnti movntpd movdqa movdqu movdq2q movq2dq paddq pmuludq pshufd pshufhw pshuflw pslldq psrldq psubq punpckhqdq punpcklqdq addpd addsd andnpd andpd cmpeqpd cmpeqsd cmplepd cmplesd cmpltpd cmpltsd cmpneqpd cmpneqsd cmpnlepd cmpnlesd cmpnltpd cmpnltsd cmpordpd cmpordsd cmpunordpd cmpunordsd cmppd comisd cvtdq2pd cvtdq2ps cvtpd2dq cvtpd2pi cvtpd2ps cvtpi2pd cvtps2dq cvtps2pd cvtsd2si cvtsd2ss cvtsi2sd cvtss2sd cvttpd2pi cvttpd2dq cvttps2dq cvttsd2si divpd divsd maxpd maxsd minpd minsd movapd movhpd movlpd movmskpd movupd mulpd mulsd orpd shufpd sqrtpd sqrtsd subpd subsd ucomisd unpckhpd unpcklpd xorpd addsubpd addsubps haddpd haddps hsubpd hsubps lddqu movddup movshdup movsldup clgi stgi vmcall vmclear vmfunc vmlaunch vmload vmmcall vmptrld vmptrst vmread vmresume vmrun vmsave vmwrite vmxoff vmxon invept invvpid pabsb pabsw pabsd palignr phaddw phaddd phaddsw phsubw phsubd phsubsw pmaddubsw pmulhrsw pshufb psignb psignw psignd extrq insertq movntsd movntss lzcnt blendpd blendps blendvpd blendvps dppd dpps extractps insertps movntdqa mpsadbw packusdw pblendvb pblendw pcmpeqq pextrb pextrd pextrq phminposuw pinsrb pinsrd pinsrq pmaxsb pmaxsd pmaxud pmaxuw pminsb pminsd pminud pminuw pmovsxbw pmovsxbd pmovsxbq pmovsxwd pmovsxwq pmovsxdq pmovzxbw pmovzxbd pmovzxbq pmovzxwd pmovzxwq pmovzxdq pmuldq pmulld ptest roundpd roundps roundsd roundss crc32 pcmpestri pcmpestrm pcmpistri pcmpistrm pcmpgtq popcnt getsec pfrcpv pfrsqrtv movbe aesenc aesenclast aesdec aesdeclast aesimc aeskeygenassist vaesenc vaesenclast vaesdec vaesdeclast vaesimc vaeskeygenassist vaddpd vaddps vaddsd vaddss vaddsubpd vaddsubps vandpd vandps vandnpd vandnps vblendpd vblendps vblendvpd vblendvps vbroadcastss vbroadcastsd vbroadcastf128 vcmpeq_ospd vcmpeqpd vcmplt_ospd vcmpltpd vcmple_ospd vcmplepd vcmpunord_qpd vcmpunordpd vcmpneq_uqpd vcmpneqpd vcmpnlt_uspd vcmpnltpd vcmpnle_uspd vcmpnlepd vcmpord_qpd vcmpordpd vcmpeq_uqpd vcmpnge_uspd vcmpngepd vcmpngt_uspd vcmpngtpd vcmpfalse_oqpd vcmpfalsepd vcmpneq_oqpd vcmpge_ospd vcmpgepd vcmpgt_ospd vcmpgtpd vcmptrue_uqpd vcmptruepd vcmplt_oqpd vcmple_oqpd vcmpunord_spd vcmpneq_uspd vcmpnlt_uqpd vcmpnle_uqpd vcmpord_spd vcmpeq_uspd vcmpnge_uqpd vcmpngt_uqpd vcmpfalse_ospd vcmpneq_ospd vcmpge_oqpd vcmpgt_oqpd vcmptrue_uspd vcmppd vcmpeq_osps vcmpeqps vcmplt_osps vcmpltps vcmple_osps vcmpleps vcmpunord_qps vcmpunordps vcmpneq_uqps vcmpneqps vcmpnlt_usps vcmpnltps vcmpnle_usps vcmpnleps vcmpord_qps vcmpordps vcmpeq_uqps vcmpnge_usps vcmpngeps vcmpngt_usps vcmpngtps vcmpfalse_oqps vcmpfalseps vcmpneq_oqps vcmpge_osps vcmpgeps vcmpgt_osps vcmpgtps vcmptrue_uqps vcmptrueps vcmplt_oqps vcmple_oqps vcmpunord_sps vcmpneq_usps vcmpnlt_uqps vcmpnle_uqps vcmpord_sps vcmpeq_usps vcmpnge_uqps vcmpngt_uqps vcmpfalse_osps vcmpneq_osps vcmpge_oqps vcmpgt_oqps vcmptrue_usps vcmpps vcmpeq_ossd vcmpeqsd vcmplt_ossd vcmpltsd vcmple_ossd vcmplesd vcmpunord_qsd vcmpunordsd vcmpneq_uqsd vcmpneqsd vcmpnlt_ussd vcmpnltsd vcmpnle_ussd vcmpnlesd vcmpord_qsd vcmpordsd vcmpeq_uqsd vcmpnge_ussd vcmpngesd vcmpngt_ussd vcmpngtsd vcmpfalse_oqsd vcmpfalsesd vcmpneq_oqsd vcmpge_ossd vcmpgesd vcmpgt_ossd vcmpgtsd vcmptrue_uqsd vcmptruesd vcmplt_oqsd vcmple_oqsd vcmpunord_ssd vcmpneq_ussd vcmpnlt_uqsd vcmpnle_uqsd vcmpord_ssd vcmpeq_ussd vcmpnge_uqsd vcmpngt_uqsd vcmpfalse_ossd vcmpneq_ossd vcmpge_oqsd vcmpgt_oqsd vcmptrue_ussd vcmpsd vcmpeq_osss vcmpeqss vcmplt_osss vcmpltss vcmple_osss vcmpless vcmpunord_qss vcmpunordss vcmpneq_uqss vcmpneqss vcmpnlt_usss vcmpnltss vcmpnle_usss vcmpnless vcmpord_qss vcmpordss vcmpeq_uqss vcmpnge_usss vcmpngess vcmpngt_usss vcmpngtss vcmpfalse_oqss vcmpfalsess vcmpneq_oqss vcmpge_osss vcmpgess vcmpgt_osss vcmpgtss vcmptrue_uqss vcmptruess vcmplt_oqss vcmple_oqss vcmpunord_sss vcmpneq_usss vcmpnlt_uqss vcmpnle_uqss vcmpord_sss vcmpeq_usss vcmpnge_uqss vcmpngt_uqss vcmpfalse_osss vcmpneq_osss vcmpge_oqss vcmpgt_oqss vcmptrue_usss vcmpss vcomisd vcomiss vcvtdq2pd vcvtdq2ps vcvtpd2dq vcvtpd2ps vcvtps2dq vcvtps2pd vcvtsd2si vcvtsd2ss vcvtsi2sd vcvtsi2ss vcvtss2sd vcvtss2si vcvttpd2dq vcvttps2dq vcvttsd2si vcvttss2si vdivpd vdivps vdivsd vdivss vdppd vdpps vextractf128 vextractps vhaddpd vhaddps vhsubpd vhsubps vinsertf128 vinsertps vlddqu vldqqu vldmxcsr vmaskmovdqu vmaskmovps vmaskmovpd vmaxpd vmaxps vmaxsd vmaxss vminpd vminps vminsd vminss vmovapd vmovaps vmovd vmovq vmovddup vmovdqa vmovqqa vmovdqu vmovqqu vmovhlps vmovhpd vmovhps vmovlhps vmovlpd vmovlps vmovmskpd vmovmskps vmovntdq vmovntqq vmovntdqa vmovntpd vmovntps vmovsd vmovshdup vmovsldup vmovss vmovupd vmovups vmpsadbw vmulpd vmulps vmulsd vmulss vorpd vorps vpabsb vpabsw vpabsd vpacksswb vpackssdw vpackuswb vpackusdw vpaddb vpaddw vpaddd vpaddq vpaddsb vpaddsw vpaddusb vpaddusw vpalignr vpand vpandn vpavgb vpavgw vpblendvb vpblendw vpcmpestri vpcmpestrm vpcmpistri vpcmpistrm vpcmpeqb vpcmpeqw vpcmpeqd vpcmpeqq vpcmpgtb vpcmpgtw vpcmpgtd vpcmpgtq vpermilpd vpermilps vperm2f128 vpextrb vpextrw vpextrd vpextrq vphaddw vphaddd vphaddsw vphminposuw vphsubw vphsubd vphsubsw vpinsrb vpinsrw vpinsrd vpinsrq vpmaddwd vpmaddubsw vpmaxsb vpmaxsw vpmaxsd vpmaxub vpmaxuw vpmaxud vpminsb vpminsw vpminsd vpminub vpminuw vpminud vpmovmskb vpmovsxbw vpmovsxbd vpmovsxbq vpmovsxwd vpmovsxwq vpmovsxdq vpmovzxbw vpmovzxbd vpmovzxbq vpmovzxwd vpmovzxwq vpmovzxdq vpmulhuw vpmulhrsw vpmulhw vpmullw vpmulld vpmuludq vpmuldq vpor vpsadbw vpshufb vpshufd vpshufhw vpshuflw vpsignb vpsignw vpsignd vpslldq vpsrldq vpsllw vpslld vpsllq vpsraw vpsrad vpsrlw vpsrld vpsrlq vptest vpsubb vpsubw vpsubd vpsubq vpsubsb vpsubsw vpsubusb vpsubusw vpunpckhbw vpunpckhwd vpunpckhdq vpunpckhqdq vpunpcklbw vpunpcklwd vpunpckldq vpunpcklqdq vpxor vrcpps vrcpss vrsqrtps vrsqrtss vroundpd vroundps vroundsd vroundss vshufpd vshufps vsqrtpd vsqrtps vsqrtsd vsqrtss vstmxcsr vsubpd vsubps vsubsd vsubss vtestps vtestpd vucomisd vucomiss vunpckhpd vunpckhps vunpcklpd vunpcklps vxorpd vxorps vzeroall vzeroupper pclmullqlqdq pclmulhqlqdq pclmullqhqdq pclmulhqhqdq pclmulqdq vpclmullqlqdq vpclmulhqlqdq vpclmullqhqdq vpclmulhqhqdq vpclmulqdq vfmadd132ps vfmadd132pd vfmadd312ps vfmadd312pd vfmadd213ps vfmadd213pd vfmadd123ps vfmadd123pd vfmadd231ps vfmadd231pd vfmadd321ps vfmadd321pd vfmaddsub132ps vfmaddsub132pd vfmaddsub312ps vfmaddsub312pd vfmaddsub213ps vfmaddsub213pd vfmaddsub123ps vfmaddsub123pd vfmaddsub231ps vfmaddsub231pd vfmaddsub321ps vfmaddsub321pd vfmsub132ps vfmsub132pd vfmsub312ps vfmsub312pd vfmsub213ps vfmsub213pd vfmsub123ps vfmsub123pd vfmsub231ps vfmsub231pd vfmsub321ps vfmsub321pd vfmsubadd132ps vfmsubadd132pd vfmsubadd312ps vfmsubadd312pd vfmsubadd213ps vfmsubadd213pd vfmsubadd123ps vfmsubadd123pd vfmsubadd231ps vfmsubadd231pd vfmsubadd321ps vfmsubadd321pd vfnmadd132ps vfnmadd132pd vfnmadd312ps vfnmadd312pd vfnmadd213ps vfnmadd213pd vfnmadd123ps vfnmadd123pd vfnmadd231ps vfnmadd231pd vfnmadd321ps vfnmadd321pd vfnmsub132ps vfnmsub132pd vfnmsub312ps vfnmsub312pd vfnmsub213ps vfnmsub213pd vfnmsub123ps vfnmsub123pd vfnmsub231ps vfnmsub231pd vfnmsub321ps vfnmsub321pd vfmadd132ss vfmadd132sd vfmadd312ss vfmadd312sd vfmadd213ss vfmadd213sd vfmadd123ss vfmadd123sd vfmadd231ss vfmadd231sd vfmadd321ss vfmadd321sd vfmsub132ss vfmsub132sd vfmsub312ss vfmsub312sd vfmsub213ss vfmsub213sd vfmsub123ss vfmsub123sd vfmsub231ss vfmsub231sd vfmsub321ss vfmsub321sd vfnmadd132ss vfnmadd132sd vfnmadd312ss vfnmadd312sd vfnmadd213ss vfnmadd213sd vfnmadd123ss vfnmadd123sd vfnmadd231ss vfnmadd231sd vfnmadd321ss vfnmadd321sd vfnmsub132ss vfnmsub132sd vfnmsub312ss vfnmsub312sd vfnmsub213ss vfnmsub213sd vfnmsub123ss vfnmsub123sd vfnmsub231ss vfnmsub231sd vfnmsub321ss vfnmsub321sd rdfsbase rdgsbase rdrand wrfsbase wrgsbase vcvtph2ps vcvtps2ph adcx adox rdseed clac stac xstore xcryptecb xcryptcbc xcryptctr xcryptcfb xcryptofb montmul xsha1 xsha256 llwpcb slwpcb lwpval lwpins vfmaddpd vfmaddps vfmaddsd vfmaddss vfmaddsubpd vfmaddsubps vfmsubaddpd vfmsubaddps vfmsubpd vfmsubps vfmsubsd vfmsubss vfnmaddpd vfnmaddps vfnmaddsd vfnmaddss vfnmsubpd vfnmsubps vfnmsubsd vfnmsubss vfrczpd vfrczps vfrczsd vfrczss vpcmov vpcomb vpcomd vpcomq vpcomub vpcomud vpcomuq vpcomuw vpcomw vphaddbd vphaddbq vphaddbw vphadddq vphaddubd vphaddubq vphaddubw vphaddudq vphadduwd vphadduwq vphaddwd vphaddwq vphsubbw vphsubdq vphsubwd vpmacsdd vpmacsdqh vpmacsdql vpmacssdd vpmacssdqh vpmacssdql vpmacsswd vpmacssww vpmacswd vpmacsww vpmadcsswd vpmadcswd vpperm vprotb vprotd vprotq vprotw vpshab vpshad vpshaq vpshaw vpshlb vpshld vpshlq vpshlw vbroadcasti128 vpblendd vpbroadcastb vpbroadcastw vpbroadcastd vpbroadcastq vpermd vpermpd vpermps vpermq vperm2i128 vextracti128 vinserti128 vpmaskmovd vpmaskmovq vpsllvd vpsllvq vpsravd vpsrlvd vpsrlvq vgatherdpd vgatherqpd vgatherdps vgatherqps vpgatherdd vpgatherqd vpgatherdq vpgatherqq xabort xbegin xend xtest andn bextr blci blcic blsi blsic blcfill blsfill blcmsk blsmsk blsr blcs bzhi mulx pdep pext rorx sarx shlx shrx tzcnt tzmsk t1mskc valignd valignq vblendmpd vblendmps vbroadcastf32x4 vbroadcastf64x4 vbroadcasti32x4 vbroadcasti64x4 vcompresspd vcompressps vcvtpd2udq vcvtps2udq vcvtsd2usi vcvtss2usi vcvttpd2udq vcvttps2udq vcvttsd2usi vcvttss2usi vcvtudq2pd vcvtudq2ps vcvtusi2sd vcvtusi2ss vexpandpd vexpandps vextractf32x4 vextractf64x4 vextracti32x4 vextracti64x4 vfixupimmpd vfixupimmps vfixupimmsd vfixupimmss vgetexppd vgetexpps vgetexpsd vgetexpss vgetmantpd vgetmantps vgetmantsd vgetmantss vinsertf32x4 vinsertf64x4 vinserti32x4 vinserti64x4 vmovdqa32 vmovdqa64 vmovdqu32 vmovdqu64 vpabsq vpandd vpandnd vpandnq vpandq vpblendmd vpblendmq vpcmpltd vpcmpled vpcmpneqd vpcmpnltd vpcmpnled vpcmpd vpcmpltq vpcmpleq vpcmpneqq vpcmpnltq vpcmpnleq vpcmpq vpcmpequd vpcmpltud vpcmpleud vpcmpnequd vpcmpnltud vpcmpnleud vpcmpud vpcmpequq vpcmpltuq vpcmpleuq vpcmpnequq vpcmpnltuq vpcmpnleuq vpcmpuq vpcompressd vpcompressq vpermi2d vpermi2pd vpermi2ps vpermi2q vpermt2d vpermt2pd vpermt2ps vpermt2q vpexpandd vpexpandq vpmaxsq vpmaxuq vpminsq vpminuq vpmovdb vpmovdw vpmovqb vpmovqd vpmovqw vpmovsdb vpmovsdw vpmovsqb vpmovsqd vpmovsqw vpmovusdb vpmovusdw vpmovusqb vpmovusqd vpmovusqw vpord vporq vprold vprolq vprolvd vprolvq vprord vprorq vprorvd vprorvq vpscatterdd vpscatterdq vpscatterqd vpscatterqq vpsraq vpsravq vpternlogd vpternlogq vptestmd vptestmq vptestnmd vptestnmq vpxord vpxorq vrcp14pd vrcp14ps vrcp14sd vrcp14ss vrndscalepd vrndscaleps vrndscalesd vrndscaless vrsqrt14pd vrsqrt14ps vrsqrt14sd vrsqrt14ss vscalefpd vscalefps vscalefsd vscalefss vscatterdpd vscatterdps vscatterqpd vscatterqps vshuff32x4 vshuff64x2 vshufi32x4 vshufi64x2 kandnw kandw kmovw knotw kortestw korw kshiftlw kshiftrw kunpckbw kxnorw kxorw vpbroadcastmb2q vpbroadcastmw2d vpconflictd vpconflictq vplzcntd vplzcntq vexp2pd vexp2ps vrcp28pd vrcp28ps vrcp28sd vrcp28ss vrsqrt28pd vrsqrt28ps vrsqrt28sd vrsqrt28ss vgatherpf0dpd vgatherpf0dps vgatherpf0qpd vgatherpf0qps vgatherpf1dpd vgatherpf1dps vgatherpf1qpd vgatherpf1qps vscatterpf0dpd vscatterpf0dps vscatterpf0qpd vscatterpf0qps vscatterpf1dpd vscatterpf1dps vscatterpf1qpd vscatterpf1qps prefetchwt1 bndmk bndcl bndcu bndcn bndmov bndldx bndstx sha1rnds4 sha1nexte sha1msg1 sha1msg2 sha256rnds2 sha256msg1 sha256msg2 hint_nop0 hint_nop1 hint_nop2 hint_nop3 hint_nop4 hint_nop5 hint_nop6 hint_nop7 hint_nop8 hint_nop9 hint_nop10 hint_nop11 hint_nop12 hint_nop13 hint_nop14 hint_nop15 hint_nop16 hint_nop17 hint_nop18 hint_nop19 hint_nop20 hint_nop21 hint_nop22 hint_nop23 hint_nop24 hint_nop25 hint_nop26 hint_nop27 hint_nop28 hint_nop29 hint_nop30 hint_nop31 hint_nop32 hint_nop33 hint_nop34 hint_nop35 hint_nop36 hint_nop37 hint_nop38 hint_nop39 hint_nop40 hint_nop41 hint_nop42 hint_nop43 hint_nop44 hint_nop45 hint_nop46 hint_nop47 hint_nop48 hint_nop49 hint_nop50 hint_nop51 hint_nop52 hint_nop53 hint_nop54 hint_nop55 hint_nop56 hint_nop57 hint_nop58 hint_nop59 hint_nop60 hint_nop61 hint_nop62 hint_nop63',built_in:// Instruction pointer
'ip eip rip '+// 8-bit registers
'al ah bl bh cl ch dl dh sil dil bpl spl r8b r9b r10b r11b r12b r13b r14b r15b '+// 16-bit registers
'ax bx cx dx si di bp sp r8w r9w r10w r11w r12w r13w r14w r15w '+// 32-bit registers
'eax ebx ecx edx esi edi ebp esp eip r8d r9d r10d r11d r12d r13d r14d r15d '+// 64-bit registers
'rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 '+// Segment registers
'cs ds es fs gs ss '+// Floating point stack registers
'st st0 st1 st2 st3 st4 st5 st6 st7 '+// MMX Registers
'mm0 mm1 mm2 mm3 mm4 mm5 mm6 mm7 '+// SSE registers
'xmm0  xmm1  xmm2  xmm3  xmm4  xmm5  xmm6  xmm7  xmm8  xmm9 xmm10  xmm11 xmm12 xmm13 xmm14 xmm15 '+'xmm16 xmm17 xmm18 xmm19 xmm20 xmm21 xmm22 xmm23 xmm24 xmm25 xmm26 xmm27 xmm28 xmm29 xmm30 xmm31 '+// AVX registers
'ymm0  ymm1  ymm2  ymm3  ymm4  ymm5  ymm6  ymm7  ymm8  ymm9 ymm10  ymm11 ymm12 ymm13 ymm14 ymm15 '+'ymm16 ymm17 ymm18 ymm19 ymm20 ymm21 ymm22 ymm23 ymm24 ymm25 ymm26 ymm27 ymm28 ymm29 ymm30 ymm31 '+// AVX-512F registers
'zmm0  zmm1  zmm2  zmm3  zmm4  zmm5  zmm6  zmm7  zmm8  zmm9 zmm10  zmm11 zmm12 zmm13 zmm14 zmm15 '+'zmm16 zmm17 zmm18 zmm19 zmm20 zmm21 zmm22 zmm23 zmm24 zmm25 zmm26 zmm27 zmm28 zmm29 zmm30 zmm31 '+// AVX-512F mask registers
'k0 k1 k2 k3 k4 k5 k6 k7 '+// Bound (MPX) register
'bnd0 bnd1 bnd2 bnd3 '+// Special register
'cr0 cr1 cr2 cr3 cr4 cr8 dr0 dr1 dr2 dr3 dr8 tr3 tr4 tr5 tr6 tr7 '+// NASM altreg package
'r0 r1 r2 r3 r4 r5 r6 r7 r0b r1b r2b r3b r4b r5b r6b r7b '+'r0w r1w r2w r3w r4w r5w r6w r7w r0d r1d r2d r3d r4d r5d r6d r7d '+'r0h r1h r2h r3h '+'r0l r1l r2l r3l r4l r5l r6l r7l r8l r9l r10l r11l r12l r13l r14l r15l '+'db dw dd dq dt ddq do dy dz '+'resb resw resd resq rest resdq reso resy resz '+'incbin equ times '+'byte word dword qword nosplit rel abs seg wrt strict near far a32 ptr',meta:'%define %xdefine %+ %undef %defstr %deftok %assign %strcat %strlen %substr %rotate %elif %else %endif '+'%if %ifmacro %ifctx %ifidn %ifidni %ifid %ifnum %ifstr %iftoken %ifempty %ifenv %error %warning %fatal %rep '+'%endrep %include %push %pop %repl %pathsearch %depend %use %arg %stacksize %local %line %comment %endcomment '+'.nolist '+'__FILE__ __LINE__ __SECT__  __BITS__ __OUTPUT_FORMAT__ __DATE__ __TIME__ __DATE_NUM__ __TIME_NUM__ '+'__UTC_DATE__ __UTC_TIME__ __UTC_DATE_NUM__ __UTC_TIME_NUM__  __PASS__ struc endstruc istruc at iend '+'align alignb sectalign daz nodaz up down zero default option assume public '+'bits use16 use32 use64 default section segment absolute extern global common cpu float '+'__utf16__ __utf16le__ __utf16be__ __utf32__ __utf32le__ __utf32be__ '+'__float8__ __float16__ __float32__ __float64__ __float80m__ __float80e__ __float128l__ __float128h__ '+'__Infinity__ __QNaN__ __SNaN__ Inf NaN QNaN SNaN float8 float16 float32 float64 float80m float80e '+'float128l float128h __FLOAT_DAZ__ __FLOAT_ROUND__ __FLOAT__'},contains:[hljs.COMMENT(';','$',{relevance:0}),{className:'number',variants:[// Float number and x87 BCD
{begin:'\\b(?:([0-9][0-9_]*)?\\.[0-9_]*(?:[eE][+-]?[0-9_]+)?|'+'(0[Xx])?[0-9][0-9_]*\\.?[0-9_]*(?:[pP](?:[+-]?[0-9_]+)?)?)\\b',relevance:0},// Hex number in $
{begin:'\\$[0-9][0-9A-Fa-f]*',relevance:0},// Number in H,D,T,Q,O,B,Y suffix
{begin:'\\b(?:[0-9A-Fa-f][0-9A-Fa-f_]*[Hh]|[0-9][0-9_]*[DdTt]?|[0-7][0-7_]*[QqOo]|[0-1][0-1_]*[BbYy])\\b'},// Number in X,D,T,Q,O,B,Y prefix
{begin:'\\b(?:0[Xx][0-9A-Fa-f_]+|0[DdTt][0-9_]+|0[QqOo][0-7_]+|0[BbYy][0-1_]+)\\b'}]},// Double quote string
hljs.QUOTE_STRING_MODE,{className:'string',variants:[// Single-quoted string
{begin:'\'',end:'[^\\\\]\''},// Backquoted string
{begin:'`',end:'[^\\\\]`'}],relevance:0},{className:'symbol',variants:[// Global label and local label
{begin:'^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)'},// Macro-local label
{begin:'^\\s*%%[A-Za-z0-9_$#@~.?]*:'}],relevance:0},// Macro parameter
{className:'subst',begin:'%[0-9]+',relevance:0},// Macro parameter
{className:'subst',begin:'%!\S+',relevance:0},{className:'meta',begin:/^\s*\.[\w_-]+/}]};});hljs.registerLanguage('xl',function(hljs){var BUILTIN_MODULES='ObjectLoader Animate MovieCredits Slides Filters Shading Materials LensFlare Mapping VLCAudioVideo '+'StereoDecoder PointCloud NetworkAccess RemoteControl RegExp ChromaKey Snowfall NodeJS Speech Charts';var XL_KEYWORDS={keyword:'if then else do while until for loop import with is as where when by data constant '+'integer real text name boolean symbol infix prefix postfix block tree',literal:'true false nil',built_in:'in mod rem and or xor not abs sign floor ceil sqrt sin cos tan asin '+'acos atan exp expm1 log log2 log10 log1p pi at text_length text_range '+'text_find text_replace contains page slide basic_slide title_slide '+'title subtitle fade_in fade_out fade_at clear_color color line_color '+'line_width texture_wrap texture_transform texture scale_?x scale_?y '+'scale_?z? translate_?x translate_?y translate_?z? rotate_?x rotate_?y '+'rotate_?z? rectangle circle ellipse sphere path line_to move_to '+'quad_to curve_to theme background contents locally time mouse_?x '+'mouse_?y mouse_buttons '+BUILTIN_MODULES};var DOUBLE_QUOTE_TEXT={className:'string',begin:'"',end:'"',illegal:'\\n'};var SINGLE_QUOTE_TEXT={className:'string',begin:'\'',end:'\'',illegal:'\\n'};var LONG_TEXT={className:'string',begin:'<<',end:'>>'};var BASED_NUMBER={className:'number',begin:'[0-9]+#[0-9A-Z_]+(\\.[0-9-A-Z_]+)?#?([Ee][+-]?[0-9]+)?'};var IMPORT={beginKeywords:'import',end:'$',keywords:XL_KEYWORDS,contains:[DOUBLE_QUOTE_TEXT]};var FUNCTION_DEFINITION={className:'function',begin:/[a-z][^\n]*->/,returnBegin:true,end:/->/,contains:[hljs.inherit(hljs.TITLE_MODE,{starts:{endsWithParent:true,keywords:XL_KEYWORDS}})]};return{aliases:['tao'],lexemes:/[a-zA-Z][a-zA-Z0-9_?]*/,keywords:XL_KEYWORDS,contains:[hljs.C_LINE_COMMENT_MODE,hljs.C_BLOCK_COMMENT_MODE,DOUBLE_QUOTE_TEXT,SINGLE_QUOTE_TEXT,LONG_TEXT,FUNCTION_DEFINITION,IMPORT,BASED_NUMBER,hljs.NUMBER_MODE]};});hljs.registerLanguage('xquery',function(hljs){var KEYWORDS='for let if while then else return where group by xquery encoding version'+'module namespace boundary-space preserve strip default collation base-uri ordering'+'copy-namespaces order declare import schema namespace function option in allowing empty'+'at tumbling window sliding window start when only end when previous next stable ascending'+'descending empty greatest least some every satisfies switch case typeswitch try catch and'+'or to union intersect instance of treat as castable cast map array delete insert into'+'replace value rename copy modify update';var LITERAL='false true xs:string xs:integer element item xs:date xs:datetime xs:float xs:double xs:decimal QName xs:anyURI xs:long xs:int xs:short xs:byte attribute';var VAR={begin:/\$[a-zA-Z0-9\-]+/};var NUMBER={className:'number',begin:'(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',relevance:0};var STRING={className:'string',variants:[{begin:/"/,end:/"/,contains:[{begin:/""/,relevance:0}]},{begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]}]};var ANNOTATION={className:'meta',begin:'%\\w+'};var COMMENT={className:'comment',begin:'\\(:',end:':\\)',relevance:10,contains:[{className:'doctag',begin:'@\\w+'}]};var METHOD={begin:'{',end:'}'};var CONTAINS=[VAR,STRING,NUMBER,COMMENT,ANNOTATION,METHOD];METHOD.contains=CONTAINS;return{aliases:['xpath','xq'],case_insensitive:false,lexemes:/[a-zA-Z\$][a-zA-Z0-9_:\-]*/,illegal:/(proc)|(abstract)|(extends)|(until)|(#)/,keywords:{keyword:KEYWORDS,literal:LITERAL},contains:CONTAINS};});hljs.registerLanguage('zephir',function(hljs){var STRING={className:'string',contains:[hljs.BACKSLASH_ESCAPE],variants:[{begin:'b"',end:'"'},{begin:'b\'',end:'\''},hljs.inherit(hljs.APOS_STRING_MODE,{illegal:null}),hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal:null})]};var NUMBER={variants:[hljs.BINARY_NUMBER_MODE,hljs.C_NUMBER_MODE]};return{aliases:['zep'],case_insensitive:true,keywords:'and include_once list abstract global private echo interface as static endswitch '+'array null if endwhile or const for endforeach self var let while isset public '+'protected exit foreach throw elseif include __FILE__ empty require_once do xor '+'return parent clone use __CLASS__ __LINE__ else break print eval new '+'catch __METHOD__ case exception default die require __FUNCTION__ '+'enddeclare final try switch continue endfor endif declare unset true false '+'trait goto instanceof insteadof __DIR__ __NAMESPACE__ '+'yield finally int uint long ulong char uchar double float bool boolean string'+'likely unlikely',contains:[hljs.C_LINE_COMMENT_MODE,hljs.HASH_COMMENT_MODE,hljs.COMMENT('/\\*','\\*/',{contains:[{className:'doctag',begin:'@[A-Za-z]+'}]}),hljs.COMMENT('__halt_compiler.+?;',false,{endsWithParent:true,keywords:'__halt_compiler',lexemes:hljs.UNDERSCORE_IDENT_RE}),{className:'string',begin:'<<<[\'"]?\\w+[\'"]?$',end:'^\\w+;',contains:[hljs.BACKSLASH_ESCAPE]},{// swallow composed identifiers to avoid parsing them as keywords
begin:/(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/},{className:'function',beginKeywords:'function',end:/[;{]/,excludeEnd:true,illegal:'\\$|\\[|%',contains:[hljs.UNDERSCORE_TITLE_MODE,{className:'params',begin:'\\(',end:'\\)',contains:['self',hljs.C_BLOCK_COMMENT_MODE,STRING,NUMBER]}]},{className:'class',beginKeywords:'class interface',end:'{',excludeEnd:true,illegal:/[:\(\$"]/,contains:[{beginKeywords:'extends implements'},hljs.UNDERSCORE_TITLE_MODE]},{beginKeywords:'namespace',end:';',illegal:/[\.']/,contains:[hljs.UNDERSCORE_TITLE_MODE]},{beginKeywords:'use',end:';',contains:[hljs.UNDERSCORE_TITLE_MODE]},{begin:'=>'// No markup, just a relevance booster
},STRING,NUMBER]};});return hljs;});

var __decorate = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class ResponseTab {
    constructor() {
        this.active = true;
    }
}
__decorate([tracked], ResponseTab.prototype, "active", void 0);
class SchemasTab {
    constructor() {
        this.active = false;
    }
}
__decorate([tracked], SchemasTab.prototype, "active", void 0);
class Tabs {
    constructor() {
        this.content = {
            response: new ResponseTab(),
            schemas: new SchemasTab()
        };
    }
    swap(tabId) {
        Object.keys(this.content).forEach(key => {
            this.content[key].active = false;
        });
        this.content[tabId].active = true;
    }
}
__decorate([tracked], Tabs.prototype, "content", void 0);
class EndpointRoute extends Component {
    constructor(attributes) {
        super(attributes);
        this.fetchParams = {};
        this.tabs = new Tabs();
        this.args.context.endpointComponent = this;
    }
    updateParams(name, e) {
        this.fetchParams[name] = e.target.value;
    }
    updateIdParam(e) {
        this.idParam = e.target.value;
    }
    changeCurrentPayload(e) {
        this.selectedPayloadName = e.target.value;
    }
    get currentPayload() {
        if (this.selectedPayloadName) {
            return this.payloads.find(p => {
                return p.name === this.selectedPayloadName;
            });
        } else {
            return this.payloads[0];
        }
    }
    switchTab(tabId, e) {
        e.preventDefault();
        this.tabs.swap(tabId);
    }
    presentFetchParams() {
        let newParams = {};
        Object.keys(this.fetchParams).forEach(key => {
            if (this.fetchParams[key]) {
                newParams[key] = this.fetchParams[key];
            }
        });
        return newParams;
    }
    pathParams() {
        if (this.idParam && this.idParam != '') {
            return `/${this.idParam}`;
        } else {
            return '';
        }
    }
    get isReadOperation() {
        return this.args.params.id.indexOf('-get') > -1;
    }
    get isCreateAction() {
        return this.args.params.id.indexOf('-post') > -1;
    }
    get isUpdateAction() {
        return this.args.params.id.indexOf('-put') > -1;
    }
    get fetchMethod() {
        if (this.isReadOperation) {
            return 'GET';
        } else if (this.isCreateAction) {
            return 'POST';
        } else if (this.isUpdateAction) {
            return 'PUT';
        } else {
            return 'DELETE';
        }
    }
    fetch() {
        let url = window['CONFIG']['basePath'];
        url += this.model.path.split('/{')[0];
        url += this.pathParams();
        if (this.isReadOperation) {
            this.doRead(url).then(responseJSON => {
                this.onApiResponse(responseJSON);
            });
        } else {
            this.doWrite(url).then(responseJSON => {
                this.onApiResponse(responseJSON);
            });
        }
    }
    onApiResponse(responseJSON) {
        let html = $(`<pre class="highlight"><code class="json hljs">${responseJSON}</code></pre>`);
        $('#api-response').html(html);
        $('pre.highlight code').each(function (i, block) {
            undefined(block);
        });
    }
    doRead(url) {
        let paramString = window['$'].param(this.presentFetchParams());
        url = `${url}?${paramString}`;
        return fetch(url).then(response => {
            return response.json().then(json => {
                return JSON.stringify(json, null, 2);
            });
        });
    }
    doWrite(url) {
        let opts = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };
        if (this.fetchParams['payload']) {
            let json = JSON.parse(this.fetchParams['payload']);
            json = JSON.stringify(json);
            opts['body'] = json;
        }
        opts['method'] = this.fetchMethod;
        return fetch(url, opts).then(response => {
            return response.json().then(json => {
                return JSON.stringify(json, null, 2);
            });
        });
    }
    get payloads() {
        let arr = [];
        this.model.config.tags.forEach(t => {
            if (t.startsWith('payload')) {
                let payloadName = t.split('payload-')[1];
                let payload = this.args.swagger.definitions[payloadName];
                payload = Object.assign({ name: payloadName }, payload);
                arr.push(payload);
            }
        });
        return arr;
    }
    get model() {
        return this.args.swagger.endpoints.find(e => {
            return e.id === this.args.params.id;
        });
    }
}
__decorate([tracked], EndpointRoute.prototype, "fetchParams", void 0);
__decorate([tracked], EndpointRoute.prototype, "selectedPayloadName", void 0);
__decorate([tracked], EndpointRoute.prototype, "idParam", void 0);
__decorate([tracked], EndpointRoute.prototype, "tabs", void 0);
__decorate([tracked('selectedPayloadName')], EndpointRoute.prototype, "currentPayload", null);
__decorate([tracked('args')], EndpointRoute.prototype, "isReadOperation", null);
__decorate([tracked('args')], EndpointRoute.prototype, "isCreateAction", null);
__decorate([tracked('args')], EndpointRoute.prototype, "isUpdateAction", null);
__decorate([tracked('args')], EndpointRoute.prototype, "fetchMethod", null);
__decorate([tracked('model')], EndpointRoute.prototype, "payloads", null);
__decorate([tracked('args')], EndpointRoute.prototype, "model", null);

var __ui_components_endpoint_route_template__ = { "id": "dh+oaMVU", "block": "{\"symbols\":[\"prop\",\"payload\",\"param\",\"@isReady\"],\"statements\":[[6,\"div\"],[9,\"class\",\"col-md-4\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"endpoint\"],[7],[0,\"\\n\"],[4,\"if\",[[19,4,[]]],null,{\"statements\":[[0,\"      \"],[6,\"h2\"],[7],[1,[20,[\"model\",\"label\"]],false],[8],[0,\"\\n\\n      \"],[6,\"p\"],[7],[1,[20,[\"model\",\"config\",\"description\"]],true],[8],[0,\"\\n\\n      \"],[6,\"button\"],[10,\"onclick\",[25,\"action\",[[19,0,[\"fetch\"]]],null],null],[9,\"class\",\"btn btn-primary\"],[9,\"type\",\"button\"],[7],[0,\"Try It Out\"],[8],[0,\"\\n\\n      \"],[6,\"div\"],[9,\"class\",\"parameters\"],[7],[0,\"\\n        \"],[6,\"h4\"],[7],[0,\"Parameters\"],[8],[0,\"\\n\\n\"],[4,\"each\",[[19,0,[\"model\",\"config\",\"parameters\"]]],[[\"key\"],[\"@index\"]],{\"statements\":[[0,\"          \"],[6,\"div\"],[9,\"class\",\"parameter\"],[7],[0,\"\\n            \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n              \"],[6,\"label\"],[7],[1,[19,3,[\"name\"]],false],[8],[0,\"\\n            \"],[8],[0,\"\\n\\n            \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n\"],[4,\"if\",[[25,\"eq\",[[19,3,[\"name\"]],\"id\"],null]],null,{\"statements\":[[0,\"                \"],[6,\"input\"],[10,\"oninput\",[25,\"action\",[[19,0,[\"updateIdParam\"]]],null],null],[10,\"value\",[18,\"idParam\"],null],[9,\"class\",\"col-md-6\"],[9,\"type\",\"text\"],[7],[8],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[4,\"if\",[[25,\"eq\",[[19,3,[\"name\"]],\"payload\"],null]],null,{\"statements\":[[0,\"                  \"],[6,\"textarea\"],[10,\"oninput\",[25,\"action\",[[19,0,[\"updateParams\"]],[19,3,[\"name\"]]],null],null],[9,\"class\",\"col-md-6\"],[9,\"type\",\"text\"],[7],[8],[0,\"\\n                  \"],[6,\"small\"],[7],[0,\"Paste JSON here, or - better yet - use \"],[6,\"a\"],[9,\"target\",\"_blank\"],[9,\"href\",\"https://www.getpostman.com\"],[7],[0,\"Postman\"],[8],[8],[0,\"\\n\"]],\"parameters\":[]},{\"statements\":[[0,\"                  \"],[6,\"input\"],[10,\"oninput\",[25,\"action\",[[19,0,[\"updateParams\"]],[19,3,[\"name\"]]],null],null],[9,\"class\",\"col-md-6\"],[9,\"type\",\"text\"],[7],[8],[0,\"\\n\"]],\"parameters\":[]}]],\"parameters\":[]}],[0,\"            \"],[8],[0,\"\\n\\n            \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n              \"],[6,\"small\"],[7],[1,[19,3,[\"description\"]],true],[8],[0,\"\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n\"]],\"parameters\":[3]},null],[0,\"      \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\\n\"],[6,\"div\"],[9,\"class\",\"col-md-5\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"right-sidebar language-json highlighter-rouge\"],[7],[0,\"\\n    \"],[6,\"ul\"],[9,\"class\",\"nav nav-tabs\"],[7],[0,\"\\n      \"],[6,\"li\"],[7],[6,\"a\"],[10,\"onclick\",[25,\"action\",[[19,0,[\"switchTab\"]],\"response\"],null],null],[10,\"class\",[25,\"if\",[[19,0,[\"tabs\",\"response\",\"active\"]],\"active\"],null],null],[9,\"href\",\"#\"],[7],[0,\"API Response\"],[8],[8],[0,\"\\n      \"],[6,\"li\"],[7],[6,\"a\"],[10,\"onclick\",[25,\"action\",[[19,0,[\"switchTab\"]],\"schemas\"],null],null],[10,\"class\",[25,\"if\",[[19,0,[\"tabs\",\"schemas\",\"active\"]],\"active\"],null],null],[9,\"href\",\"#\"],[7],[0,\"Schemas\"],[8],[8],[0,\"\\n    \"],[8],[0,\"\\n\\n\"],[4,\"if\",[[19,4,[]]],null,{\"statements\":[[0,\"      \"],[6,\"div\"],[9,\"class\",\"tab-content\"],[7],[0,\"\\n        \"],[6,\"div\"],[9,\"class\",\"tab-pane\"],[9,\"class\",\"active\"],[9,\"id\",\"api-response\"],[7],[0,\"\\n          \"],[6,\"pre\"],[9,\"class\",\"highlight\"],[7],[0,\"\\n            \"],[6,\"code\"],[9,\"class\",\"json hljs\"],[7],[0,\"\\n            Click \\\"Try it Out\\\" to view API response here\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n\\n        \"],[6,\"div\"],[9,\"class\",\"tab-pane\"],[9,\"id\",\"schemas\"],[7],[0,\"\\n          \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n            \"],[6,\"div\"],[9,\"class\",\"form-group\"],[7],[0,\"\\n              \"],[6,\"select\"],[9,\"class\",\"payload-select form-control\"],[10,\"onchange\",[25,\"action\",[[19,0,[\"changeCurrentPayload\"]]],null],null],[7],[0,\"\\n\"],[4,\"each\",[[19,0,[\"payloads\"]]],[[\"key\"],[\"@index\"]],{\"statements\":[[0,\"                  \"],[6,\"option\"],[10,\"selected\",[25,\"eq\",[[19,0,[\"currentPayload\",\"name\"]],[19,2,[\"name\"]]],null],null],[10,\"value\",[19,2,[\"name\"]],null],[7],[1,[19,2,[\"name\"]],false],[8],[0,\"\\n\"]],\"parameters\":[2]},null],[0,\"              \"],[8],[0,\"\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n\\n\"],[4,\"if\",[[19,0,[\"currentPayload\"]]],null,{\"statements\":[[0,\"            \"],[6,\"h3\"],[7],[1,[20,[\"currentPayload\",\"name\"]],false],[8],[0,\"\\n            \"],[6,\"ul\"],[9,\"class\",\"attributes\"],[7],[0,\"\\n\"],[4,\"each\",[[25,\"props\",[[19,0,[\"currentPayload\",\"properties\"]]],null]],[[\"key\"],[\"@index\"]],{\"statements\":[[0,\"                \"],[6,\"li\"],[9,\"class\",\"attribute\"],[7],[0,\"\\n                  \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n                    \"],[6,\"label\"],[7],[0,\"\\n                      \"],[1,[19,1,[\"key\"]],false],[0,\"\\n                      \"],[5,\"type-check\",[],[[\"@type\"],[[19,1,[\"value\",\"type\"]]]],{\"statements\":[],\"parameters\":[]}],[0,\"\\n                    \"],[8],[0,\"\\n                  \"],[8],[0,\"\\n                  \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n                    \"],[6,\"small\"],[7],[1,[19,1,[\"value\",\"description\"]],false],[8],[0,\"\\n                  \"],[8],[0,\"\\n                \"],[8],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"            \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/jsonapi-swagger-ui/components/endpoint-route" } };

function eq([left, right]) {
    return left === right;
}

function _if([test, truthy, falsy]) {
    return test ? truthy : falsy;
}

class IndexRoute extends Component {}

var __ui_components_index_route_template__ = { "id": "x84cIsRK", "block": "{\"symbols\":[\"@swagger\"],\"statements\":[[6,\"h1\"],[7],[0,\"Welcome to the \"],[1,[19,1,[\"info\",\"title\"]],false],[0,\" API!\"],[8],[0,\"\\n\\n\"],[6,\"div\"],[9,\"class\",\"col-md-9\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"introduction\"],[7],[0,\"\\n    \"],[6,\"p\"],[7],[0,\"\\n      This API adheres to the open-source \"],[6,\"a\"],[9,\"target\",\"_blank\"],[9,\"href\",\"http://jsonapi.org\"],[7],[0,\"JSONAPI Specification\"],[8],[0,\". If you're unfamiliar with JSONAPI, start there!\\n    \"],[8],[0,\"\\n\\n    \"],[6,\"p\"],[7],[0,\"\\n      Because the specification is verbose, we've omitted the cruft. Instead, Resource Schemas detail the relevant attributes, types, and descriptions.\\n      At the top of each endpoint's documentation, you'll see the schemas relevant to that endpoint (ie, possible sideloads and sideposts).\\n    \"],[8],[0,\"\\n\\n    \"],[6,\"p\"],[7],[0,\"\\n      If you need a token to access this API, use something like \"],[6,\"a\"],[9,\"target\",\"_blank\"],[9,\"href\",\"http://www.requestly.in\"],[7],[0,\"Requestly\"],[8],[0,\" to modify your headers each request. This way you can access endpoints directly through your browser.\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\\n  \"],[6,\"div\"],[9,\"class\",\"description\"],[7],[0,\"\\n    \"],[6,\"h2\"],[7],[0,\"API Details\"],[8],[0,\"\\n    \"],[1,[19,1,[\"info\",\"description\"]],true],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/jsonapi-swagger-ui/components/index-route" } };

var createObject = Object.create;
function createMap() {
    var map = createObject(null);
    map["__"] = undefined;
    delete map["__"];
    return map;
}

var Target = function Target(path, matcher, delegate) {
    this.path = path;
    this.matcher = matcher;
    this.delegate = delegate;
};
Target.prototype.to = function to(target, callback) {
    var delegate = this.delegate;
    if (delegate && delegate.willAddRoute) {
        target = delegate.willAddRoute(this.matcher.target, target);
    }
    this.matcher.add(this.path, target);
    if (callback) {
        if (callback.length === 0) {
            throw new Error("You must have an argument in the function passed to `to`");
        }
        this.matcher.addChild(this.path, target, callback, this.delegate);
    }
};
var Matcher = function Matcher(target) {
    this.routes = createMap();
    this.children = createMap();
    this.target = target;
};
Matcher.prototype.add = function add(path, target) {
    this.routes[path] = target;
};
Matcher.prototype.addChild = function addChild(path, target, callback, delegate) {
    var matcher = new Matcher(target);
    this.children[path] = matcher;
    var match = generateMatch(path, matcher, delegate);
    if (delegate && delegate.contextEntered) {
        delegate.contextEntered(target, match);
    }
    callback(match);
};
function generateMatch(startingPath, matcher, delegate) {
    function match(path, callback) {
        var fullPath = startingPath + path;
        if (callback) {
            callback(generateMatch(fullPath, matcher, delegate));
        } else {
            return new Target(fullPath, matcher, delegate);
        }
    }

    return match;
}
function addRoute(routeArray, path, handler) {
    var len = 0;
    for (var i = 0; i < routeArray.length; i++) {
        len += routeArray[i].path.length;
    }
    path = path.substr(len);
    var route = { path: path, handler: handler };
    routeArray.push(route);
}
function eachRoute(baseRoute, matcher, callback, binding) {
    var routes = matcher.routes;
    var paths = Object.keys(routes);
    for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        var routeArray = baseRoute.slice();
        addRoute(routeArray, path, routes[path]);
        var nested = matcher.children[path];
        if (nested) {
            eachRoute(routeArray, nested, callback, binding);
        } else {
            callback.call(binding, routeArray);
        }
    }
}
var map$1 = function map(callback, addRouteCallback) {
    var matcher = new Matcher();
    callback(generateMatch("", matcher, this.delegate));
    eachRoute([], matcher, function (routes) {
        if (addRouteCallback) {
            addRouteCallback(this, routes);
        } else {
            this.add(routes);
        }
    }, this);
};

// Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
// values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
// chars are "/" and "%".
// Safe to call multiple times on the same path.
// Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
function normalizePath(path) {
    return path.split("/").map(normalizeSegment).join("/");
}
// We want to ensure the characters "%" and "/" remain in percent-encoded
// form when normalizing paths, so replace them with their encoded form after
// decoding the rest of the path
var SEGMENT_RESERVED_CHARS = /%|\//g;
function normalizeSegment(segment) {
    if (segment.length < 3 || segment.indexOf("%") === -1) {
        return segment;
    }
    return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
}
// We do not want to encode these characters when generating dynamic path segments
// See https://tools.ietf.org/html/rfc3986#section-3.3
// sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
// others allowed by RFC 3986: ":", "@"
//
// First encode the entire path segment, then decode any of the encoded special chars.
//
// The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
// so the possible encoded chars are:
// ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].
var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;
function encodePathSegment(str) {
    return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
}

var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
var isArray = Array.isArray;
var hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function getParam(params, key) {
    if (typeof params !== "object" || params === null) {
        throw new Error("You must pass an object as the second argument to `generate`.");
    }
    if (!hasOwnProperty$2.call(params, key)) {
        throw new Error("You must provide param `" + key + "` to `generate`.");
    }
    var value = params[key];
    var str = typeof value === "string" ? value : "" + value;
    if (str.length === 0) {
        throw new Error("You must provide a param `" + key + "`.");
    }
    return str;
}
var eachChar = [];
eachChar[0 /* Static */] = function (segment, currentState) {
    var state = currentState;
    var value = segment.value;
    for (var i = 0; i < value.length; i++) {
        var ch = value.charCodeAt(i);
        state = state.put(ch, false, false);
    }
    return state;
};
eachChar[1 /* Dynamic */] = function (_, currentState) {
    return currentState.put(47 /* SLASH */, true, true);
};
eachChar[2 /* Star */] = function (_, currentState) {
    return currentState.put(-1 /* ANY */, false, true);
};
eachChar[4 /* Epsilon */] = function (_, currentState) {
    return currentState;
};
var regex = [];
regex[0 /* Static */] = function (segment) {
    return segment.value.replace(escapeRegex, "\\$1");
};
regex[1 /* Dynamic */] = function () {
    return "([^/]+)";
};
regex[2 /* Star */] = function () {
    return "(.+)";
};
regex[4 /* Epsilon */] = function () {
    return "";
};
var generate = [];
generate[0 /* Static */] = function (segment) {
    return segment.value;
};
generate[1 /* Dynamic */] = function (segment, params) {
    var value = getParam(params, segment.value);
    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        return encodePathSegment(value);
    } else {
        return value;
    }
};
generate[2 /* Star */] = function (segment, params) {
    return getParam(params, segment.value);
};
generate[4 /* Epsilon */] = function () {
    return "";
};
var EmptyObject$1 = Object.freeze({});
var EmptyArray = Object.freeze([]);
// The `names` will be populated with the paramter name for each dynamic/star
// segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
// segment, indicating whether it should be decoded during recognition.
function parse(segments, route, types) {
    // normalize route as not starting with a "/". Recognition will
    // also normalize.
    if (route.length > 0 && route.charCodeAt(0) === 47 /* SLASH */) {
            route = route.substr(1);
        }
    var parts = route.split("/");
    var names = undefined;
    var shouldDecodes = undefined;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var flags = 0;
        var type = 0;
        if (part === "") {
            type = 4 /* Epsilon */;
        } else if (part.charCodeAt(0) === 58 /* COLON */) {
                type = 1 /* Dynamic */;
            } else if (part.charCodeAt(0) === 42 /* STAR */) {
                type = 2 /* Star */;
            } else {
            type = 0 /* Static */;
        }
        flags = 2 << type;
        if (flags & 12 /* Named */) {
                part = part.slice(1);
                names = names || [];
                names.push(part);
                shouldDecodes = shouldDecodes || [];
                shouldDecodes.push((flags & 4 /* Decoded */) !== 0);
            }
        if (flags & 14 /* Counted */) {
                types[type]++;
            }
        segments.push({
            type: type,
            value: normalizeSegment(part)
        });
    }
    return {
        names: names || EmptyArray,
        shouldDecodes: shouldDecodes || EmptyArray
    };
}
function isEqualCharSpec(spec, char, negate) {
    return spec.char === char && spec.negate === negate;
}
// A State has a character specification and (`charSpec`) and a list of possible
// subsequent states (`nextStates`).
//
// If a State is an accepting state, it will also have several additional
// properties:
//
// * `regex`: A regular expression that is used to extract parameters from paths
//   that reached this accepting state.
// * `handlers`: Information on how to convert the list of captures into calls
//   to registered handlers with the specified parameters
// * `types`: How many static, dynamic or star segments in this route. Used to
//   decide which route to use if multiple registered routes match a path.
//
// Currently, State is implemented naively by looping over `nextStates` and
// comparing a character specification against a character. A more efficient
// implementation would use a hash of keys pointing at one or more next states.
var State = function State(states, id, char, negate, repeat) {
    this.states = states;
    this.id = id;
    this.char = char;
    this.negate = negate;
    this.nextStates = repeat ? id : null;
    this.pattern = "";
    this._regex = undefined;
    this.handlers = undefined;
    this.types = undefined;
};
State.prototype.regex = function regex$1() {
    if (!this._regex) {
        this._regex = new RegExp(this.pattern);
    }
    return this._regex;
};
State.prototype.get = function get(char, negate) {
    var this$1 = this;

    var nextStates = this.nextStates;
    if (nextStates === null) {
        return;
    }
    if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
            var child = this$1.states[nextStates[i]];
            if (isEqualCharSpec(child, char, negate)) {
                return child;
            }
        }
    } else {
        var child$1 = this.states[nextStates];
        if (isEqualCharSpec(child$1, char, negate)) {
            return child$1;
        }
    }
};
State.prototype.put = function put(char, negate, repeat) {
    var state;
    // If the character specification already exists in a child of the current
    // state, just return that state.
    if (state = this.get(char, negate)) {
        return state;
    }
    // Make a new state for the character spec
    var states = this.states;
    state = new State(states, states.length, char, negate, repeat);
    states[states.length] = state;
    // Insert the new state as a child of the current state
    if (this.nextStates == null) {
        this.nextStates = state.id;
    } else if (isArray(this.nextStates)) {
        this.nextStates.push(state.id);
    } else {
        this.nextStates = [this.nextStates, state.id];
    }
    // Return the new state
    return state;
};
// Find a list of child states matching the next character
State.prototype.match = function match(ch) {
    var this$1 = this;

    var nextStates = this.nextStates;
    if (!nextStates) {
        return [];
    }
    var returned = [];
    if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
            var child = this$1.states[nextStates[i]];
            if (isMatch(child, ch)) {
                returned.push(child);
            }
        }
    } else {
        var child$1 = this.states[nextStates];
        if (isMatch(child$1, ch)) {
            returned.push(child$1);
        }
    }
    return returned;
};
function isMatch(spec, char) {
    return spec.negate ? spec.char !== char && spec.char !== -1 /* ANY */ : spec.char === char || spec.char === -1 /* ANY */;
}
// This is a somewhat naive strategy, but should work in a lot of cases
// A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
//
// This strategy generally prefers more static and less dynamic matching.
// Specifically, it
//
//  * prefers fewer stars to more, then
//  * prefers using stars for less of the match to more, then
//  * prefers fewer dynamic segments to more, then
//  * prefers more static segments to more
function sortSolutions(states) {
    return states.sort(function (a, b) {
        var ref = a.types || [0, 0, 0];
        var astatics = ref[0];
        var adynamics = ref[1];
        var astars = ref[2];
        var ref$1 = b.types || [0, 0, 0];
        var bstatics = ref$1[0];
        var bdynamics = ref$1[1];
        var bstars = ref$1[2];
        if (astars !== bstars) {
            return astars - bstars;
        }
        if (astars) {
            if (astatics !== bstatics) {
                return bstatics - astatics;
            }
            if (adynamics !== bdynamics) {
                return bdynamics - adynamics;
            }
        }
        if (adynamics !== bdynamics) {
            return adynamics - bdynamics;
        }
        if (astatics !== bstatics) {
            return bstatics - astatics;
        }
        return 0;
    });
}
function recognizeChar(states, ch) {
    var nextStates = [];
    for (var i = 0, l = states.length; i < l; i++) {
        var state = states[i];
        nextStates = nextStates.concat(state.match(ch));
    }
    return nextStates;
}
var RecognizeResults = function RecognizeResults(queryParams) {
    this.length = 0;
    this.queryParams = queryParams || {};
};

RecognizeResults.prototype.splice = Array.prototype.splice;
RecognizeResults.prototype.slice = Array.prototype.slice;
RecognizeResults.prototype.push = Array.prototype.push;
function findHandler(state, originalPath, queryParams) {
    var handlers = state.handlers;
    var regex = state.regex();
    if (!regex || !handlers) {
        throw new Error("state not initialized");
    }
    var captures = originalPath.match(regex);
    var currentCapture = 1;
    var result = new RecognizeResults(queryParams);
    result.length = handlers.length;
    for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var names = handler.names;
        var shouldDecodes = handler.shouldDecodes;
        var params = EmptyObject$1;
        var isDynamic = false;
        if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
            for (var j = 0; j < names.length; j++) {
                isDynamic = true;
                var name = names[j];
                var capture = captures && captures[currentCapture++];
                if (params === EmptyObject$1) {
                    params = {};
                }
                if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
                    params[name] = capture && decodeURIComponent(capture);
                } else {
                    params[name] = capture;
                }
            }
        }
        result[i] = {
            handler: handler.handler,
            params: params,
            isDynamic: isDynamic
        };
    }
    return result;
}
function decodeQueryParamPart(part) {
    // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
    part = part.replace(/\+/gm, "%20");
    var result;
    try {
        result = decodeURIComponent(part);
    } catch (error) {
        result = "";
    }
    return result;
}
var RouteRecognizer = function RouteRecognizer() {
    this.names = createMap();
    var states = [];
    var state = new State(states, 0, -1 /* ANY */, true, false);
    states[0] = state;
    this.states = states;
    this.rootState = state;
};
RouteRecognizer.prototype.add = function add(routes, options) {
    var currentState = this.rootState;
    var pattern = "^";
    var types = [0, 0, 0];
    var handlers = new Array(routes.length);
    var allSegments = [];
    var isEmpty = true;
    var j = 0;
    for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var ref = parse(allSegments, route.path, types);
        var names = ref.names;
        var shouldDecodes = ref.shouldDecodes;
        // preserve j so it points to the start of newly added segments
        for (; j < allSegments.length; j++) {
            var segment = allSegments[j];
            if (segment.type === 4 /* Epsilon */) {
                    continue;
                }
            isEmpty = false;
            // Add a "/" for the new segment
            currentState = currentState.put(47 /* SLASH */, false, false);
            pattern += "/";
            // Add a representation of the segment to the NFA and regex
            currentState = eachChar[segment.type](segment, currentState);
            pattern += regex[segment.type](segment);
        }
        handlers[i] = {
            handler: route.handler,
            names: names,
            shouldDecodes: shouldDecodes
        };
    }
    if (isEmpty) {
        currentState = currentState.put(47 /* SLASH */, false, false);
        pattern += "/";
    }
    currentState.handlers = handlers;
    currentState.pattern = pattern + "$";
    currentState.types = types;
    var name;
    if (typeof options === "object" && options !== null && options.as) {
        name = options.as;
    }
    if (name) {
        // if (this.names[name]) {
        //   throw new Error("You may not add a duplicate route named `" + name + "`.");
        // }
        this.names[name] = {
            segments: allSegments,
            handlers: handlers
        };
    }
};
RouteRecognizer.prototype.handlersFor = function handlersFor(name) {
    var route = this.names[name];
    if (!route) {
        throw new Error("There is no route named " + name);
    }
    var result = new Array(route.handlers.length);
    for (var i = 0; i < route.handlers.length; i++) {
        var handler = route.handlers[i];
        result[i] = handler;
    }
    return result;
};
RouteRecognizer.prototype.hasRoute = function hasRoute(name) {
    return !!this.names[name];
};
RouteRecognizer.prototype.generate = function generate$1(name, params) {
    var route = this.names[name];
    var output = "";
    if (!route) {
        throw new Error("There is no route named " + name);
    }
    var segments = route.segments;
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment.type === 4 /* Epsilon */) {
                continue;
            }
        output += "/";
        output += generate[segment.type](segment, params);
    }
    if (output.charAt(0) !== "/") {
        output = "/" + output;
    }
    if (params && params.queryParams) {
        output += this.generateQueryString(params.queryParams);
    }
    return output;
};
RouteRecognizer.prototype.generateQueryString = function generateQueryString(params) {
    var pairs = [];
    var keys = Object.keys(params);
    keys.sort();
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = params[key];
        if (value == null) {
            continue;
        }
        var pair = encodeURIComponent(key);
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
                pairs.push(arrayPair);
            }
        } else {
            pair += "=" + encodeURIComponent(value);
            pairs.push(pair);
        }
    }
    if (pairs.length === 0) {
        return "";
    }
    return "?" + pairs.join("&");
};
RouteRecognizer.prototype.parseQueryString = function parseQueryString(queryString) {
    var pairs = queryString.split("&");
    var queryParams = {};
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("="),
            key = decodeQueryParamPart(pair[0]),
            keyLength = key.length,
            isArray = false,
            value = void 0;
        if (pair.length === 1) {
            value = "true";
        } else {
            // Handle arrays
            if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
                isArray = true;
                key = key.slice(0, keyLength - 2);
                if (!queryParams[key]) {
                    queryParams[key] = [];
                }
            }
            value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
        }
        if (isArray) {
            queryParams[key].push(value);
        } else {
            queryParams[key] = value;
        }
    }
    return queryParams;
};
RouteRecognizer.prototype.recognize = function recognize(path) {
    var results;
    var states = [this.rootState];
    var queryParams = {};
    var isSlashDropped = false;
    var hashStart = path.indexOf("#");
    if (hashStart !== -1) {
        path = path.substr(0, hashStart);
    }
    var queryStart = path.indexOf("?");
    if (queryStart !== -1) {
        var queryString = path.substr(queryStart + 1, path.length);
        path = path.substr(0, queryStart);
        queryParams = this.parseQueryString(queryString);
    }
    if (path.charAt(0) !== "/") {
        path = "/" + path;
    }
    var originalPath = path;
    if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        path = normalizePath(path);
    } else {
        path = decodeURI(path);
        originalPath = decodeURI(originalPath);
    }
    var pathLen = path.length;
    if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
        path = path.substr(0, pathLen - 1);
        originalPath = originalPath.substr(0, originalPath.length - 1);
        isSlashDropped = true;
    }
    for (var i = 0; i < path.length; i++) {
        states = recognizeChar(states, path.charCodeAt(i));
        if (!states.length) {
            break;
        }
    }
    var solutions = [];
    for (var i$1 = 0; i$1 < states.length; i$1++) {
        if (states[i$1].handlers) {
            solutions.push(states[i$1]);
        }
    }
    states = sortSolutions(solutions);
    var state = solutions[0];
    if (state && state.handlers) {
        // if a trailing slash was dropped and a star segment is the last segment
        // specified, put the trailing slash back
        if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
            originalPath = originalPath + "/";
        }
        results = findHandler(state, originalPath, queryParams);
    }
    return results;
};
RouteRecognizer.VERSION = "0.3.3";
// Set to false to opt-out of encoding and decoding path segments.
// See https://github.com/tildeio/route-recognizer/pull/55
RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
RouteRecognizer.Normalizer = {
    normalizeSegment: normalizeSegment, normalizePath: normalizePath, encodePathSegment: encodePathSegment
};
RouteRecognizer.prototype.map = map$1;



//# sourceMappingURL=route-recognizer.es.js.map

let router = new RouteRecognizer();
router.map(function (match) {
    match('/').to('index-route');
    match('/endpoints/:id').to('endpoint-route');
});
function getHash(location) {
    let href = location.href;
    let hashIndex = href.indexOf('#');
    if (hashIndex === -1) {
        return '/';
    } else {
        return href.substr(hashIndex + 1);
    }
}
let changeCallback;
let lastPath;
function _hashchangeHandler() {
    let path = getHash(window.location);
    if (path === lastPath) {
        return;
    }
    lastPath = path;
    let matches = router.recognize(path);
    changeCallback(matches[0].handler, matches[0].params);
}
function onChange(callback) {
    changeCallback = callback;
    _hashchangeHandler(); // kick it off the first time
    window.addEventListener('hashchange', _hashchangeHandler);
}

var __decorate$1 = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class JsonapiSwaggerUi extends Component {
    constructor(options) {
        super(options);
        this.params = {};
        this.swagger = {};
        this.id = 'employee';
        this.routeIsChanging = false;
        let url = `${window['CONFIG'].basePath}/swagger.json`;
        fetch(url).then(response => {
            response.json().then(json => {
                this.swagger = this._buildSwagger(json);
            });
        });
        onChange((componentName, params) => {
            this.params = params;
            this.currentRouteComponent = componentName;
            this.routeIsChanging = true;
            let doRouteChange = () => {
                this.routeIsChanging = false;
            };
            setTimeout(doRouteChange, 1);
        });
    }
    get isReady() {
        return !!this.swagger['info'];
    }
    _buildSwagger(json) {
        json.models = [];
        json.endpoints = [];
        Object.keys(json.paths).forEach(pathName => {
            let pathConfig = json.paths[pathName];
            Object.keys(pathConfig).forEach(methodName => {
                let methodConfig = pathConfig[methodName];
                let id = `${pathName.replace(/\//g, '-')}-${methodName}`;
                json.endpoints.push({
                    id: id,
                    path: pathName,
                    label: `${pathName}#${methodName}`,
                    config: methodConfig
                });
            });
        });
        Object.keys(json.definitions).forEach(defName => {
            let config = json.definitions[defName];
            json.models.push({
                id: defName,
                label: defName,
                properties: config.properties
            });
        });
        return json;
    }
}
__decorate$1([tracked], JsonapiSwaggerUi.prototype, "currentRouteComponent", void 0);
__decorate$1([tracked], JsonapiSwaggerUi.prototype, "params", void 0);
__decorate$1([tracked], JsonapiSwaggerUi.prototype, "swagger", void 0);
__decorate$1([tracked], JsonapiSwaggerUi.prototype, "id", void 0);
__decorate$1([tracked], JsonapiSwaggerUi.prototype, "routeIsChanging", void 0);
__decorate$1([tracked('swagger')], JsonapiSwaggerUi.prototype, "isReady", null);

var __ui_components_jsonapi_swagger_ui_template__ = { "id": "LI8ddkWn", "block": "{\"symbols\":[\"endpoint\"],\"statements\":[[6,\"main\"],[9,\"class\",\"page-content\"],[9,\"aria-label\",\"Content\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"wrapper\"],[7],[0,\"\\n    \"],[5,\"nav-header\",[],[[\"@swagger\"],[[18,\"swagger\"]]],{\"statements\":[],\"parameters\":[]}],[0,\"\\n\\n    \"],[6,\"div\"],[9,\"class\",\"container-fluid\"],[7],[0,\"\\n      \"],[6,\"div\"],[9,\"class\",\"row\"],[7],[0,\"\\n\\n        \"],[6,\"div\"],[9,\"class\",\"col-md-3 alpha\"],[7],[0,\"\\n          \"],[6,\"div\"],[9,\"class\",\"sidebar-nav-fixed left-sidebar\"],[7],[0,\"\\n            \"],[6,\"div\"],[9,\"class\",\"well\"],[7],[0,\"\\n              \"],[6,\"ul\"],[9,\"class\",\"nav endpoints\"],[7],[0,\"\\n                \"],[6,\"li\"],[9,\"class\",\"nav-header\"],[7],[0,\"API Reference\"],[8],[0,\"\\n\"],[4,\"each\",[[19,0,[\"swagger\",\"endpoints\"]]],[[\"key\"],[\"@index\"]],{\"statements\":[[0,\"                  \"],[6,\"li\"],[7],[0,\"\\n                    \"],[6,\"a\"],[10,\"href\",[26,[\"#/endpoints/\",[19,1,[\"id\"]]]]],[7],[1,[19,1,[\"label\"]],false],[8],[0,\"\\n                  \"],[8],[0,\"\\n\"]],\"parameters\":[1]},null],[0,\"              \"],[8],[0,\"\\n            \"],[8],[0,\"\\n          \"],[8],[0,\"\\n        \"],[8],[0,\"\\n\\n\"],[4,\"unless\",[[19,0,[\"routeIsChanging\"]]],null,{\"statements\":[[0,\"          \"],[1,[25,\"component\",[[19,0,[\"currentRouteComponent\"]]],[[\"context\",\"isReady\",\"swagger\",\"params\"],[[19,0,[]],[19,0,[\"isReady\"]],[19,0,[\"swagger\"]],[19,0,[\"params\"]]]]],false],[0,\"\\n\"]],\"parameters\":[]},null],[0,\"      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/jsonapi-swagger-ui/components/jsonapi-swagger-ui" } };

var __decorate$2 = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class NavHeader extends Component {
    constructor(attributes) {
        super(attributes);
        this.githubURL = window['CONFIG'].githubURL;
    }
    get title() {
        return this.args.swagger.info.title;
    }
}
__decorate$2([tracked('args')], NavHeader.prototype, "title", null);

var __ui_components_nav_header_template__ = { "id": "75vDVPqU", "block": "{\"symbols\":[\"@swagger\"],\"statements\":[[6,\"header\"],[9,\"class\",\"navbar navbar-inverse normal\"],[9,\"role\",\"banner\"],[7],[0,\"\\n  \"],[6,\"div\"],[9,\"class\",\"container-fluid\"],[7],[0,\"\\n    \"],[6,\"div\"],[9,\"class\",\"navbar-header\"],[7],[0,\"\\n      \"],[6,\"a\"],[9,\"href\",\"#/\"],[9,\"class\",\"navbar-brand\"],[7],[1,[19,1,[\"info\",\"title\"]],false],[8],[0,\"\\n    \"],[8],[0,\"\\n    \"],[6,\"nav\"],[9,\"class\",\"collapse navbar-collapse bs-navbar-collapse\"],[9,\"role\",\"navigation\"],[7],[0,\"\\n      \"],[6,\"ul\"],[9,\"class\",\"nav navbar-nav\"],[7],[0,\"\\n      \"],[8],[0,\"\\n      \"],[6,\"ul\"],[9,\"class\",\"nav navbar-nav navbar-right visible-md visible-lg\"],[7],[0,\"\\n        \"],[6,\"li\"],[7],[0,\"\\n          \"],[6,\"a\"],[10,\"href\",[18,\"githubURL\"],null],[9,\"class\",\"button\"],[7],[0,\"Fork on Github\"],[8],[0,\"\\n        \"],[8],[0,\"\\n      \"],[8],[0,\"\\n    \"],[8],[0,\"\\n  \"],[8],[0,\"\\n\"],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/jsonapi-swagger-ui/components/nav-header" } };

function props(params) {
    let obj = params[0];
    let arr = [];
    Object.keys(obj).forEach(key => {
        arr.push({ key, value: obj[key] });
    });
    return arr;
}

var __decorate$3 = undefined && undefined.__decorate || function (decorators, target, key, desc) {
    var c = arguments.length,
        r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc,
        d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
class TypeCheck extends Component {
    constructor() {
        super(...arguments);
        this.mapping = {
            string: 'label-success',
            integer: 'label-primary',
            float: 'label-info',
            boolean: 'label-danger'
        };
    }
    get labelClass() {
        return this.mapping[this.args.type];
    }
}
__decorate$3([tracked('args')], TypeCheck.prototype, "labelClass", null);

var __ui_components_type_check_template__ = { "id": "wNy8BFEa", "block": "{\"symbols\":[\"@type\"],\"statements\":[[6,\"span\"],[10,\"class\",[26,[\"label \",[18,\"labelClass\"]]]],[7],[1,[19,1,[]],false],[8],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "specifier": "template:/jsonapi-swagger-ui/components/type-check" } };

var moduleMap = { 'component:/jsonapi-swagger-ui/components/endpoint-route': EndpointRoute, 'template:/jsonapi-swagger-ui/components/endpoint-route': __ui_components_endpoint_route_template__, 'helper:/jsonapi-swagger-ui/components/eq': eq, 'helper:/jsonapi-swagger-ui/components/if': _if, 'component:/jsonapi-swagger-ui/components/index-route': IndexRoute, 'template:/jsonapi-swagger-ui/components/index-route': __ui_components_index_route_template__, 'component:/jsonapi-swagger-ui/components/jsonapi-swagger-ui': JsonapiSwaggerUi, 'template:/jsonapi-swagger-ui/components/jsonapi-swagger-ui': __ui_components_jsonapi_swagger_ui_template__, 'component:/jsonapi-swagger-ui/components/nav-header': NavHeader, 'template:/jsonapi-swagger-ui/components/nav-header': __ui_components_nav_header_template__, 'helper:/jsonapi-swagger-ui/components/props': props, 'component:/jsonapi-swagger-ui/components/type-check': TypeCheck, 'template:/jsonapi-swagger-ui/components/type-check': __ui_components_type_check_template__ };

var resolverConfiguration = { "app": { "name": "jsonapi-swagger-ui", "rootName": "jsonapi-swagger-ui" }, "types": { "application": { "definitiveCollection": "main" }, "component": { "definitiveCollection": "components" }, "component-test": { "unresolvable": true }, "helper": { "definitiveCollection": "components" }, "helper-test": { "unresolvable": true }, "renderer": { "definitiveCollection": "main" }, "template": { "definitiveCollection": "components" } }, "collections": { "main": { "types": ["application", "renderer"] }, "components": { "group": "ui", "types": ["component", "component-test", "template", "helper", "helper-test"], "defaultType": "component", "privateCollections": ["utils"] }, "styles": { "group": "ui", "unresolvable": true }, "utils": { "unresolvable": true } } };

class App extends Application {
    constructor() {
        let moduleRegistry = new BasicRegistry(moduleMap);
        let resolver = new Resolver(resolverConfiguration, moduleRegistry);
        super({
            rootName: resolverConfiguration.app.rootName,
            resolver
        });
    }
}

const app = new App();
const containerElement = document.getElementById('app');
setPropertyDidChange(() => {
    app.scheduleRerender();
});
app.registerInitializer({
    initialize(registry) {
        registry.register(`component-manager:/${app.rootName}/component-managers/main`, ComponentManager);
    }
});
app.renderComponent('jsonapi-swagger-ui', containerElement, null);
app.boot();

})));

//# sourceMappingURL=app.js.map
