/* eslint-env jest */
/**
 * Self-contained Jest mock for react-native-reanimated 4.
 *
 * The package's own mock imports the real entry point, which under Jest loads
 * the JS fallback module and throws ("setCSSEventHandler is not available in
 * JSReanimated"). This mock covers the API surface the app uses without
 * touching native code: shared values are plain objects, animations resolve to
 * their target immediately, layout presets are chainable no-ops.
 */
const React = require('react');
const RN = require('react-native');

const NOOP = () => {};
const IDENTITY = value => value;

const Easing = new Proxy(
  {
    linear: IDENTITY,
    ease: IDENTITY,
    quad: IDENTITY,
    cubic: IDENTITY,
    sin: IDENTITY,
    circle: IDENTITY,
    exp: IDENTITY,
    poly: () => IDENTITY,
    elastic: () => IDENTITY,
    back: () => IDENTITY,
    bounce: IDENTITY,
    bezier: () => IDENTITY,
    bezierFn: () => IDENTITY,
    steps: () => IDENTITY,
    in: () => IDENTITY,
    out: () => IDENTITY,
    inOut: () => IDENTITY,
  },
  { get: (target, key) => (key in target ? target[key] : IDENTITY) },
);

const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' };
const Extrapolation = {
  EXTEND: 'extend',
  CLAMP: 'clamp',
  IDENTITY: 'identity',
};
const KeyboardState = {
  UNKNOWN: 0,
  OPENING: 1,
  OPEN: 2,
  CLOSING: 3,
  CLOSED: 4,
};
const SensorType = {
  ACCELEROMETER: 1,
  GYROSCOPE: 2,
  GRAVITY: 3,
  MAGNETIC_FIELD: 4,
  ROTATION: 5,
};
const ReanimatedLogLevel = { warn: 1, error: 2 };

function makeMutable(initial) {
  return {
    value: initial,
    get() {
      return this.value;
    },
    set(next) {
      this.value = typeof next === 'function' ? next(this.value) : next;
    },
    addListener: NOOP,
    removeListener: NOOP,
    modify(fn) {
      this.value = fn ? fn(this.value) : this.value;
    },
  };
}

const resolve = (value, callback) => {
  if (typeof callback === 'function') callback(true);
  return value;
};

class LayoutAnimationMock {
  static duration() {
    return new LayoutAnimationMock();
  }
  static delay() {
    return new LayoutAnimationMock();
  }
  static springify() {
    return new LayoutAnimationMock();
  }
  static easing() {
    return new LayoutAnimationMock();
  }
  static withCallback() {
    return new LayoutAnimationMock();
  }
  static withInitialValues() {
    return new LayoutAnimationMock();
  }
  static reduceMotion() {
    return new LayoutAnimationMock();
  }
  static randomDelay() {
    return new LayoutAnimationMock();
  }
  static build() {
    return () => ({ initialValues: {}, animations: {} });
  }
}
for (const method of [
  'duration',
  'delay',
  'springify',
  'easing',
  'withCallback',
  'withInitialValues',
  'reduceMotion',
  'randomDelay',
  'damping',
  'stiffness',
  'mass',
  'overshootClamping',
  'restDisplacementThreshold',
  'restSpeedThreshold',
  'dampingRatio',
  'rotate',
  'stepsX',
  'stepsY',
]) {
  LayoutAnimationMock.prototype[method] = function chain() {
    return this;
  };
  if (!LayoutAnimationMock[method])
    LayoutAnimationMock[method] = () => new LayoutAnimationMock();
}
LayoutAnimationMock.prototype.build = () => () => ({
  initialValues: {},
  animations: {},
});

const presets = {};
for (const name of [
  'FadeIn',
  'FadeInRight',
  'FadeInLeft',
  'FadeInUp',
  'FadeInDown',
  'FadeOut',
  'FadeOutRight',
  'FadeOutLeft',
  'FadeOutUp',
  'FadeOutDown',
  'SlideInRight',
  'SlideInLeft',
  'SlideInUp',
  'SlideInDown',
  'SlideOutRight',
  'SlideOutLeft',
  'SlideOutUp',
  'SlideOutDown',
  'ZoomIn',
  'ZoomInRotate',
  'ZoomInLeft',
  'ZoomInRight',
  'ZoomInUp',
  'ZoomInDown',
  'ZoomInEasyUp',
  'ZoomInEasyDown',
  'ZoomOut',
  'ZoomOutRotate',
  'ZoomOutLeft',
  'ZoomOutRight',
  'ZoomOutUp',
  'ZoomOutDown',
  'ZoomOutEasyUp',
  'ZoomOutEasyDown',
  'StretchInX',
  'StretchInY',
  'StretchOutX',
  'StretchOutY',
  'BounceIn',
  'BounceInDown',
  'BounceInUp',
  'BounceInLeft',
  'BounceInRight',
  'BounceOut',
  'BounceOutDown',
  'BounceOutUp',
  'BounceOutLeft',
  'BounceOutRight',
  'FlipInXUp',
  'FlipInYLeft',
  'FlipInXDown',
  'FlipInYRight',
  'FlipInEasyX',
  'FlipInEasyY',
  'FlipOutXUp',
  'FlipOutYLeft',
  'FlipOutXDown',
  'FlipOutYRight',
  'FlipOutEasyX',
  'FlipOutEasyY',
  'LightSpeedInRight',
  'LightSpeedInLeft',
  'LightSpeedOutRight',
  'LightSpeedOutLeft',
  'PinwheelIn',
  'PinwheelOut',
  'RotateInDownLeft',
  'RotateInDownRight',
  'RotateInUpLeft',
  'RotateInUpRight',
  'RotateOutDownLeft',
  'RotateOutDownRight',
  'RotateOutUpLeft',
  'RotateOutUpRight',
  'RollInLeft',
  'RollInRight',
  'RollOutLeft',
  'RollOutRight',
  'Layout',
  'LinearTransition',
  'FadingTransition',
  'SequencedTransition',
  'JumpingTransition',
  'CurvedTransition',
  'EntryExitTransition',
]) {
  presets[name] = LayoutAnimationMock;
}

class Keyframe {
  duration() {
    return this;
  }
  delay() {
    return this;
  }
  withCallback() {
    return this;
  }
  reduceMotion() {
    return this;
  }
}

function interpolate(value, input, output) {
  if (!Array.isArray(input) || !Array.isArray(output) || input.length < 2)
    return value;
  const first = input[0];
  const last = input[input.length - 1];
  if (value <= first) return output[0];
  if (value >= last) return output[output.length - 1];
  for (let index = 1; index < input.length; index += 1) {
    if (value <= input[index]) {
      const span = input[index] - input[index - 1] || 1;
      const ratio = (value - input[index - 1]) / span;
      return output[index - 1] + ratio * (output[index] - output[index - 1]);
    }
  }
  return output[output.length - 1];
}

const createAnimatedComponent = Component => Component;

const Animated = {
  View: RN.View,
  Text: RN.Text,
  Image: RN.Image,
  ScrollView: RN.ScrollView,
  FlatList: RN.FlatList,
  createAnimatedComponent,
  addWhitelistedNativeProps: NOOP,
  addWhitelistedUIProps: NOOP,
};

const api = {
  ...presets,
  Easing,
  ReduceMotion,
  Extrapolation,
  KeyboardState,
  SensorType,
  ReanimatedLogLevel,
  Keyframe,
  makeMutable,
  createAnimatedComponent,
  useSharedValue: initial => React.useRef(makeMutable(initial)).current,
  useDerivedValue: fn => ({ value: typeof fn === 'function' ? fn() : fn }),
  useAnimatedStyle: fn => (typeof fn === 'function' ? fn() : {}),
  useAnimatedProps: fn => (typeof fn === 'function' ? fn() : {}),
  useAnimatedReaction: NOOP,
  useAnimatedRef: () => React.useRef(null),
  useAnimatedScrollHandler: handler =>
    handler && typeof handler === 'object'
      ? handler.onScroll ?? NOOP
      : handler ?? NOOP,
  useAnimatedGestureHandler: handler => handler,
  useAnimatedKeyboard: () => ({
    height: makeMutable(0),
    state: makeMutable(KeyboardState.CLOSED),
  }),
  useAnimatedSensor: () => ({
    sensor: makeMutable({ x: 0, y: 0, z: 0 }),
    unregister: NOOP,
    isAvailable: false,
  }),
  useFrameCallback: () => ({ setActive: NOOP, isActive: false, callbackId: 0 }),
  useReducedMotion: () => false,
  useScrollViewOffset: () => makeMutable(0),
  useEvent: handler => handler,
  useHandler: () => ({
    context: {},
    doDependenciesDiffer: false,
    useWeb: false,
  }),
  useWorkletCallback: fn => fn,
  useAnimatedGestureHandlerWorklet: handler => handler,
  withTiming: (value, _config, callback) => resolve(value, callback),
  withSpring: (value, _config, callback) => resolve(value, callback),
  withDecay: (_config, callback) => resolve(0, callback),
  withDelay: (_delay, animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  withRepeat: animation => animation,
  withClamp: (_config, animation) => animation,
  cancelAnimation: NOOP,
  runOnJS: fn => fn,
  runOnUI: fn => fn,
  runOnRuntime: (_runtime, fn) => fn,
  executeOnUIRuntimeSync: fn => fn,
  createWorkletRuntime: () => ({}),
  interpolate,
  interpolateColor: (_value, _input, output) =>
    Array.isArray(output) ? output[0] : output,
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  measure: () => null,
  scrollTo: NOOP,
  setNativeProps: NOOP,
  dispatchCommand: NOOP,
  getRelativeCoords: () => ({ x: 0, y: 0 }),
  isSharedValue: value =>
    Boolean(value) && typeof value === 'object' && 'value' in value,
  isConfigured: () => true,
  isReanimated3: () => true,
  enableLayoutAnimations: NOOP,
  configureReanimatedLogger: NOOP,
  processColor: RN.processColor,
  convertToRGBA: () => [0, 0, 0, 1],
  setUpTests: NOOP,
  getAnimatedStyle: style => style,
  withReanimatedTimer: fn => fn(),
  advanceAnimationByTime: NOOP,
  advanceAnimationByFrame: NOOP,
  Animated,
};

Object.assign(Animated, api);

module.exports = { ...api, default: Animated, __esModule: true };
