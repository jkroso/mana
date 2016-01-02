import escapeHTML from 'escape-html'
import Cursor from '@jkroso/cursor'
import equals from 'equals'

export const NODE = Symbol('node')

export class Node {
  remove(dom) {
    this.runLifeCycleMethod('onUnMount', dom)
    dom.parentNode.removeChild(dom)
  }
  replace(next, dom) {
    this.runLifeCycleMethod('onUnMount', dom)
    const nextDOM = next.toDOM()
    dom.parentElement.replaceChild(nextDOM, dom)
    next.runLifeCycleMethod('onMount', nextDOM)
    return nextDOM
  }
  runLifeCycleMethod(dom){
    if (this[name]) this[name](dom)
  }
}

export class Text extends Node {
  constructor(text) {
    super()
    this.text = String(text)
  }
  toDOM() {
    const dom = document.createTextNode(this.text)
    dom[NODE] = this
    return dom
  }
  update(next, dom) {
    if (next.constructor != Text) return this.replace(next, dom)
    if (this.text != next.text) dom.nodeValue = next.text
    return dom
  }
  toString() {
    return this.text
  }
}

export class Element extends Node {
  constructor(tagName, params, children, events) {
    super()
    this.tagName = tagName
    this.params = params || {}
    this.children = children || []
    this.events = events || {}
  }

  /**
   * Run onMount/onUnMount and forward the message to all children
   *
   * @param  {String} name method to Run
   * @param  {DOM} dom
   * @api private
   */

  runLifeCycleMethod(name, dom) {
    const {children} = this
    for (let i = 0, len = children.length; i < len; i++) {
      children[i].runLifeCycleMethod(name, dom.childNodes[i])
    }
    if (this[name]) this[name](dom)
  }

  /**
  * Merge raw params onto a copy of this
  *
  * @param {Object} params
  * @api public
  */

  assoc(params) {
    const clone = Object.create(this)
    clone.params = Object.create(this.params)
    clone.events = Object.create(this.events)
    return clone.mergeParams(params)
  }

  mergeParams(parameters) {
    const params = this.params
    for (var key in parameters) {
      var value = parameters[key]
      if (typeof value == 'function' && /^on\w+$/.test(key)) {
        this.listen(key.substring(2).toLowerCase(), value)
      } else if (key == 'class' || key == 'className') {
        if (typeof value == 'string') {
          params.className = params.className
            ? params.className + ' ' + value
            : value
          continue
        }
        for (key in value) if (value[key]) {
          params.className = params.className
            ? params.className + ' ' + key
            : key
        }
      } else if (key == 'style' && typeof value == 'string') {
        params.style = parseCSSText(value)
      } else {
        params[key] = value
      }
    }
    return this
  }

  /**
   * Invoke this elements event[type] listener
   *
   * @param  {String} type
   * @api public
   */

  notify(type, data, dom) {
    const fn = this.events[type]
    fn && fn(data, this, dom)
  }

  /**
   * Add an event listener to this elements `type` event
   *
   * @param  {String}   type
   * @param  {Function} fn
   * @api private
   */

  listen(type, fn) {
    this.events[type] = this.events[type]
      ? ((previous, next) => {
          return function(event){
            previous.apply(this, arguments)
            if (event.cancelBubble) return
            next.apply(this, arguments)
          }
        })(this.events[type], fn)
      : fn
  }

  /**
   * Invoke an event on this node and all its parents
   *
   * @param  {String} type
   * @param  {event} [event]
   * @api public
   */

  emit(type, dom, event) {
    var node = this
    while (node) {
      node.notify(type, event, dom)
      if (event && event.cancelBubble) break
      dom = dom.parentNode
      if (dom == null) break
      node = dom[NODE]
    }
  }

  /**
   * Create a native DOM node from a virtual node
   *
   * @return {DOMElement}
   * @api public
   */

  toDOM() {
    const dom = typeof createElement[this.tagName] == 'function'
      ? createElement[this.tagName](this.tagName)
      : document.createElement(this.tagName)
    adoptNewDOMElement(this, dom)
    return dom
  }

  update(next, dom) {
    if (this === next) return next
    if (this.constructor != next.constructor) return this.replace(next, dom)
    if (this.tagName != next.tagName) return this.replace(next, dom)
    this.updateParams(next.params, dom)
    this.updateChildren(next.children, dom)
    this.updateEvents(next.events, dom)
    dom[NODE] = next
    return dom
  }

  updateParams(b, dom) {
    const a = this.params
    for (var key in a) {
      if (key in b) continue
      if (key == 'className') dom.className = '' // browser bug workaround
      else dom.removeAttribute(key)
    }

    for (var key in b) {
      if (a[key] != b[key]) setAttribute(dom, key, b[key])
    }
  }

  updateChildren(bChildren, dom) {
    const {children} = this
    var l = children.length
    var dc = dom.childNodes

    // remove redundant nodes
    while (l > bChildren.length) children[--l].remove(dc[l])

    // mutate existing nodes
    for (var i = 0; i < l; i++) {
      children[i].update(bChildren[i], dc[i])
    }

    // append extras
    while (l < bChildren.length) {
      const child = bChildren[l++]
      const cdom = child.toDOM()
      dom.appendChild(cdom)
      child.runLifeCycleMethod('onMount', cdom)
    }
  }

  /**
   * Bind listeners for non-bubbling DOM events
   */

  updateEvents(events, dom) {
    if (events.mouseleave) dom.onmouseleave = notify
    if (events.mouseenter) dom.onmouseenter = notify
  }

  mount(el) {
    adoptNewDOMElement(this, el)
    this.runLifeCycleMethod('onMount', el)
  }

  mountIn(container) {
    const dom = this.toDOM()
    container.appendChild(dom)
    this.runLifeCycleMethod('onMount', dom)
    return dom
  }

  toString() {
    var html = '<' + this.tagName
    for (var key in this.params) {
      if (key in attrWhiteList) {
        var value = this.params[key]
        if (key == 'className') key = 'class'
        if (key == 'style') value = serializeStyle(value)
        html += ` ${key}="${escapeHTML(value)}"`
      }
    }
    if (self_closing.has(this.tagName)) return html + '/>'
    return this.children.reduce(add, html + '>') + `</${this.tagName}>`
  }
}

/**
 * An abstract class for components which augment Elements or other
 * ProxyNode's rather being a direct representation of a DOM node
 */

class ProxyNode extends Node {
  call() {
    return this.node ? this.node : this.node = this.toNode()
  }
  toDOM() {
    return this.call().toDOM()
  }
  remove(dom) {
    if (this.onUnMount) this.onUnMount(dom)
    return this.call().remove(dom)
  }
  replace(next, dom) {
    if (this.onUnMount) this.onUnMount(dom)
    dom = this.call().replace(next, dom)
    if (next.onMount) next.onMount(dom)
    return dom
  }
  notify(type, dom) {
    this.call().notify(type, this.node, dom)
  }
  assoc(params) {
    this.node = this.call().assoc(params)
    return this
  }
  mount(el) {
    adoptNewDOMElement(this.call(), el)
    this.runLifeCycleMethod('onMount', el)
  }
  mountIn(container) {
    const dom = this.toDOM()
    container.appendChild(dom)
    this.runLifeCycleMethod('onMount', dom)
    return dom
  }
  runLifeCycleMethod(name, dom) {
    this.call().runLifeCycleMethod(name, dom)
    if (this[name]) this[name](dom)
  }
}

/**
 * Thunks provide an efficient form of memoiziation
 */

export class Thunk extends ProxyNode {
  constructor(...args) {
    super()
    this.arguments = args
    this.node = null
  }
  toNode() {
    return this.render(...this.arguments)
  }
  update(next, dom) {
    if (!(next instanceof Thunk)) return this.replace(next, dom)
    if (!this.isEqual(next)) return this.node.update(next.call(), dom)
    next.node = this.node
    return dom
  }
  isEqual(next) {
    return equals(this.arguments, next.arguments)
  }
}

/**
 * An abstract class for components which want to be able re-render all
 * instances of themselves in place. The only required extension is toNode()
 */

class SelfRerendering extends ProxyNode {
  constructor() {
    super()
    this.redrawScheduled = false
    this.paths = []
    this.redraw = () => {
      this.redrawScheduled = false
      const next = this.toNode()
      const paths = this.paths
      for (var i = 0, len = paths.length; i < len; i++) {
        this.node.update(next, getDOM(paths[i]))
      }
      this.node = next
    }
  }
  requestRedraw() {
    if (this.redrawScheduled) return
    this.redrawScheduled = true
    requestAnimationFrame(this.redraw)
  }
  // default hooks are inlined here so subclasses don't have to call
  // super.onMount etc..
  runLifeCycleMethod(name, dom) {
    if (name == 'onMount') {
      this.paths.push(domPath(dom))
    } else {
      const path = domPath(dom)
      const i = this.paths.findIndex(p => equals(p, path))
      if (i >= 0) this.paths.splice(i, 1)
    }
    super.runLifeCycleMethod(name, dom)
  }
}

export const STATE = Symbol('state')

/**
 * Components provide local state
 */

export class Component extends SelfRerendering {
  constructor(params, children) {
    super()
    this[STATE] = undefined
    this.arguments = [params, children]
  }
  get state() {
    return this[STATE]
  }
  set state(value) {
    this[STATE] = value
    this.requestRedraw()
  }
  toNode() {
    return this.render(this.arguments[0], this.arguments[1], this.state)
  }
  update(next, dom) {
    if (next instanceof Component) {
      if (next[STATE] === undefined) next[STATE] = this[STATE]
      next.paths = this.paths
      return this.node.update(next.call(), dom)
    }
    return this.replace(next, dom)
  }
}

/**
 * Designed to be the top level rendering loop manager. Just pass it
 * some data and a function mapping that data to your UI. It wraps your
 * data in a `Cursor` so it can tell when your data changes
 *
 * @param {Any} state
 * @param {Function} render
 * @return {Any}
 */

export class App extends SelfRerendering {
  constructor(state, render) {
    super()
    this.cursor = state instanceof Cursor ? state : new Cursor(state)
    this.listener = () => this.requestRedraw()
    this.render = render
  }
  toNode() {
    return this.render(this.cursor)
  }
  onMount() {
    this.cursor.addListener(this.listener)
  }
  onUnMount() {
    this.cursor.removeListener(this.listener)
  }
  remove() {
    for (const path of this.paths) {
      super.remove(getDOM(path))
    }
  }
}

const domPath = dom => {
  const indices = []
  while (true) {
    indices.push(indexOf(dom))
    if (dom.parentNode === document.body) break
    dom = dom.parentNode
  }
  return indices
}

const indexOf = dom => {
  var i = 0
  while (dom.previousSibling) {
    dom = dom.previousSibling
    i += 1
  }
  return i
}

const getDOM = path => {
  var node = document.body
  var i = path.length
  while (i--) node = node.childNodes[path[i]]
  return node
}

const add = (a, b) => a + b

const notify = e => e.target[NODE].notify(e.type, e, e.target)

const adoptNewDOMElement = (node, dom) => {
  dom[NODE] = node
  const attrs = node.params
  for (const key in attrs) {
    setAttribute(dom, key, attrs[key])
  }
  node.children.forEach(child => dom.appendChild(child.toDOM()))
  node.updateEvents(node.events, dom)
}

const createSVG = tag => document.createElementNS('http://www.w3.org/2000/svg', tag)

const createElement = {
  svg() {
    const el = createSVG('svg')
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    el.setAttribute('version', '1.1')
    el.setAttribute('height', '100%')
    el.setAttribute('width', '100%')
    return el
  }
}

createElement.polyline =
createElement.ellipse =
createElement.polygon =
createElement.circle =
createElement.text =
createElement.line =
createElement.rect =
createElement.path =
createElement.g = createSVG

const self_closing = new Set([
  'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
])

// Hmm this is getting a bit long
const attrWhiteList = [
  'align', 'alt', 'bgcolor', 'border', 'char', 'charoff', 'charset', 'cite', 'compact', 'disabled',
  'height', 'href', 'hspace', 'longdesc', 'name', 'size', 'src', 'target', 'type', 'valign',
  'value', 'vspace', 'width', 'abbr', 'axis', 'colspan', 'nowrap', 'rowspan', 'scope', 'label',
  'readonly', 'cols', 'rows', 'accept', 'span', 'accept-charset', 'action', 'enctype', 'method',
  'checked', 'maxlength', 'for', 'start', 'selected', 'multiple', 'cellpadding', 'cellspacing',
  'frame', 'rules', 'summary', 'headers', 'autofocus', 'id', "className", "placeholder",
  "accentHeight", "accumulate", "additive", "alphabetic", "amplitude", "arabicForm", "ascent",
  "attributeName", "attributeType", "azimuth", "baseFrequency", "baseProfile", "bbox", "begin",
  "bias", "by", "calcMode", "capHeight", "clipPathUnits", "contentScriptType", "contentStyleType",
  "cx", "cy", "d", "descent", "diffuseConstant", "divisor", "dur", "dx", "dy", "edgeMode",
  "elevation", "end", "exponent", "externalResourcesRequired", "fill", "filterRes", "filterUnits",
  "fontFamily", "fontSize", "fontStretch", "fontStyle", "format", "from", "fx", "fy", "g1", "g2",
  "glyphame", "glyphRef", "gradientTransform", "gradientUnits", "hanging", "horizAdvX",
  "horizOriginX", "horizOriginY", "ideographic", "in", "in2", "intercept", "k", "k1", "k2", "k3",
  "k4", "kernelMatrix", "kernelUnitLength", "keyPoints", "keySplines", "keyTimes", "lang",
  "lengthAdjust", "limitingConeAngle", "local", "markerHeight", "markerUnits", "markerWidth",
  "maskContentUnits", "maskUnits", "mathematical", "max", "media", "method", "min", "mode",
  "numOctaves", "offset", "operator", "order", "orient", "orientation", "origin",
  "overlinePosition", "overlineThickness", "panose1", "path", "pathLength", "patternContentUnits",
  "patternTransform", "patternUnits", "points", "pointsAtX", "pointsAtY", "pointsAtZ",
  "preserveAlpha", "preserveAspectRatio", "primitiveUnits", "r", "radius", "refX", "refY",
  "renderingIntent", "repeatCount", "repeatDur", "requiredExtensions", "requiredFeatures",
  "restart", "result", "rotate", "rx", "ry", "scale", "seed", "slope", "spacing",
  "specularConstant", "specularExponent", "spreadMethod", "startOffset", "stdDeviation", "stemh",
  "stemv", "stitchTiles", "strikethroughPosition", "strikethroughThickness", "string", "style",
  "surfaceScale", "systemLanguage", "tableValues", "target", "targetX", "targetY", "textLength",
  "title", "to", "transform", "type", "u1", "u2", "underlinePosition", "underlineThickness",
  "unicode", "unicodeRange", "unitsPerEm", "vAlphabetic", "vHanging", "vIdeographic",
  "vMathematical", "values", "version", "vertAdvY", "vertOriginX", "vertOriginY", "viewBox",
  "viewTarget", "widths", "x", "xHeight", "x1", "x2", "xChannelSelector", "xlink", "xml", "y", "y1",
  "y2", "yChannelSelector", "z", "zoomAndPan", "alignmentBaseline", "baselineShift", "clipPath",
  "clipRule", "clip", "colorInterpolationFilters", "colorInterpolation", "colorProfile",
  "colorRendering", "color", "direction", "display", "dominantBaseline", "enableBackground",
  "fillOpacity", "fillRule", "filter", "floodColor", "floodOpacity", "fontSizeAdjust",
  "fontVariant", "fontWeight", "glyphOrientationHorizontal", "glyphOrientationVertical",
  "imageRendering", "kerning", "letterSpacing", "lightingColor", "markerEnd", "markerMid",
  "markerStart", "mask", "opacity", "overflow", "pointerEvents", "shapeRendering", "stopColor",
  "stopOpacity", "strokeDasharray", "strokeDashoffset", "strokeLinecap", "strokeLinejoin",
  "strokeMiterlimit", "strokeOpacity", "strokeWidth", "stroke", "textAnchor", "textDecoration",
  "textRendering", "unicodeBidi", "visibility", "wordSpacing", "writingMode", "viewBox",
  "contentEditable"
].reduce((o,k) => {o[k] = true; return o}, {})

/**
 * Set an attribute on `el`
 *
 * @param {Node} el
 * @param {String} key
 * @param {Any} value
 */

const setAttribute = (el, key, value) => {
  if (key == 'style') {
    for (key in value) el.style[key] = value[key]
  } else if (key == 'isfocused') {
    // Since HTML doesn't specify an isfocused attribute we fake it
    if (value) setTimeout(() => el.focus())
  } else if (key == 'value') {
    // often value has already updated itself
    if (el.value != value) el.value = value
  } else if (key == 'className') {
    if (typeof el.className == 'string') el.className = value // chrome bug
    else el.classList.add(...value.split(' ')) // chrome SVG bug
  } else if (key in attrWhiteList) {
    if (typeof value == 'boolean') el[key] = value
    else el.setAttribute(key, value)
  }
}

const parseCSSText = css =>
  css.split(';').reduce((object, pair) => {
    if (!pair) return object // last pair
    const [key,value] = pair.split(':')
    object[key.trim()] = value.trim()
    return object
  }, {})

const serializeStyle = style => {
  var css = ''
  for (var key in style) css += `${key}:${style[key]};`
  return css
}

/**
 * The runtime component of JSX
 *
 * @param  {String|Class|Function|Object} type
 * @param  {Object} [params]
 * @param  {[Element]} [children]
 * @return {Element}
 */

export const JSX = (type, params, children) => {
  if (children) children = children.reduce(toNodes, [])
  switch (typeof type) {
    case 'string': // built in type
      return new Element(type, {}, children).mergeParams(params)
    case 'function': // invoke a class/function
      return type.prototype instanceof Node
        ? new type(params, children)
        : type(params, children)
    case 'object': // alter an existing instance
      return params ? type.assoc(params) : type
    default:
      throw new TypeError
  }
}

const toNodes = (nodes, val) => {
  if (val == null) return nodes
  if (Array.isArray(val)) nodes.push(...val.reduce(toNodes, []))
  else if (typeof val != 'object') nodes.push(new Text(val))
  else nodes.push(val)
  return nodes
}

/**
 * Hack so we know when its been called
 */

function stopPropagation() {
  this.cancelBubble = true
}

const dispatchEvent = e => {
  e.stopPropagation = stopPropagation
  var {target,type} = e
  while (target) {
    var node = target[NODE]
    if (node) node.notify(type, e, target)
    if (event.cancelBubble) break
    target = target.parentNode
  }
}

if (typeof window != 'undefined') [
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseover',
  'mouseout',
  'mousemove',
  'dragstart',
  'drag',
  'dragenter',
  'dragleave',
  'dragover',
  'drop',
  'dragend',
  'keydown',
  'keypress',
  'keyup',
  'scroll',
  'select',
  'change',
  'submit',
  'reset',
  'focus',
  'blur',
  'focusin',
  'focusout'
].forEach(event => window.addEventListener(event, dispatchEvent, true))
