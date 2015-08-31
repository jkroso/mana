const {RootCursor} = require('cursor')
const assert = require('assert')

const tmp = document.createElement('div')
const NODE = Symbol('node')

class Node {
  remove() {
    this.dom.parentNode.removeChild(this.dom)
  }
  replace(next) {
    const parent = this.dom.parentElement
    // In case toDOM() results in this.dom being assigned a new parentNode
    // This can happen when re-using parts of the virtual DOM between renders
    parent.replaceChild(tmp, this.dom)
    parent.replaceChild(next.toDOM(), tmp)
    return next
  }
}

class Text extends Node {
  constructor(text) {
    super()
    this.dom = null
    this.text = String(text)
  }
  toDOM() {
    return this.dom = document.createTextNode(this.text)
  }
  update(next) {
    if (next.constructor != Text) return this.replace(next)
    if (this.text != next.text) this.dom.nodeValue = next.text
    next.dom = this.dom
    return next
  }
}

class Element extends Node {
  constructor(tagName, params, children, events) {
    super()
    this.dom = null
    this.tagName = tagName
    this.params = params || {}
    this.children = children || []
    this.events = events || {}
  }

  /**
   * Merge raw params onto this.params and this.events
   *
   * @param {Object} params
   */

  mergeParams(parameters) {
    var params = this.params
    for (var key in parameters) {
      var value = parameters[key]
      if (typeof value == 'function' && /^on\w+$/.test(key)) {
        this.listen(key.substring(2).toLowerCase(), value)
      } else if (key == 'class') {
        if (typeof value == 'string') {
          params.className = value
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
   * @param  {String} type
   */

  notify(type, event) {
    var fn = this.events[type]
    fn && fn.call(this, event, this)
  }

  /**
   * Invoke an event on this node and all its parents
   *
   * @param  {String} type
   * @param  {event} [event]
   */

  emit(type, event) {
    var el = this.dom
    var node = this
    while (node) {
      node.notify(type, event)
      if (event && event.cancelBubble) break
      el = el.parentNode
      if (el == null) break
      node = el[NODE]
    }
  }

  /**
   * Add an event listener to this elements `type` event
   *
   * @param  {String}   type
   * @param  {Function} fn
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
   * Create a native DOM node from a virtual node
   * @return {DOMElement}
   */

  toDOM() {
    var dom = typeof createElement[this.tagName] == 'function'
      ? createElement[this.tagName](this.tagName)
      : document.createElement(this.tagName)
    adoptNewDOMElement(this, dom)
    return dom
  }

  update(next) {
    if (this === next) return next
    if (this.constructor != next.constructor) return this.replace(next)
    if (this.tagName != next.tagName) return this.replace(next)
    this.updateParams(next.params)
    this.updateChildren(next.children)
    this.updateEvents(next.events)
    linkNodes(this.dom, next)
    return next
  }

  updateParams(b) {
    const a = this.params
    const dom = this.dom
    for (var key in a) {
      if (key in b) {
        if (a[key] != b[key]) setAttribute(dom, key, b[key])
      } else if (key == 'className') {
        dom.className = '' /*browser bug workaround*/
      } else {
        dom.removeAttribute(key)
      }
    }

    for (var key in b) {
      key in a || setAttribute(dom, key, b[key])
    }
  }

  updateChildren(bChildren) {
    const {children,dom} = this
    var l = children.length

    // remove redundant nodes
    while (l > bChildren.length) children[--l].remove()

    // mutate existing nodes
    for (var i = 0; i < l; i++) {
      children[i].update(bChildren[i])
    }

    // append extras
    while (l < bChildren.length) {
      var child = bChildren[l++]
      dom.appendChild(child.toDOM())
      notifyMount(child)
    }
  }

  /**
   * Bind listeners for non-bubbling DOM events
   */

  updateEvents(events) {
    if (events.mouseleave) this.dom.onmouseleave = notify
    if (events.mouseenter) this.dom.onmouseenter = notify
  }

  remove() {
    notifyUnmount(this)
    super.remove()
  }

  replace(next) {
    notifyUnmount(this)
    super.replace(next)
    notifyMount(next)
    return next
  }

  mount(el) {
    adoptNewDOMElement(this, el)
    notifyMount(this)
  }
}

const notify = e => e.target[NODE].notify(e.type, e)

const adoptNewDOMElement = (node, dom) => {
  linkNodes(dom, node)
  var attrs = node.params
  for (var key in attrs) setAttribute(dom, key, attrs[key])
  node.children.forEach(child => dom.appendChild(child.toDOM()))
  node.updateEvents(node.events)
}

const notifyDepthFirst = event => function recur(node){
  if (!node.children) return
  node.children.forEach(recur)
  node.notify(event, node)
}

const notifyUnmount = notifyDepthFirst('unmount')
const notifyMount = notifyDepthFirst('mount')

const linkNodes = (el, o) => (o.dom = el, el[NODE] = o)

const createSVG = tag => document.createElementNS('http://www.w3.org/2000/svg', tag)

const createElement = {
  svg() {
    var el = createSVG('svg')
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
  "textRendering", "unicodeBidi", "visibility", "wordSpacing", "writingMode", "viewBox"
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

/**
 * The runtime component of JSX
 *
 * @param  {String|Function} Type
 * @param  {Object} params
 * @param  {[Node]} ...children
 * @return {Element}
 */

const JSX = (Type, params, ...children) => {
  children = children.reduce(toNodes, [])
  if (typeof Type == 'function') {
    if (!(params && params.cursor) && Type.query) {
      params = params || {}
      params.cursor = parseCursor(Type.query)
    }
    return Type(params, children)
  } else {
    return new Element(Type, {}, children).mergeParams(params)
  }
}

const toNodes = (nodes, val) => {
  if (val == null) return nodes
  if (Array.isArray(val)) nodes.push(...val.reduce(toNodes, []))
  else if (typeof val != 'object') nodes.push(new Text(val))
  else nodes.push(val)
  return nodes
}

// the RootCursor of the App currently being rendered
var cursor = null

const parseCursor = path => cursor.getIn(...path.split('/').filter(Boolean))

/**
 * An element which automatically re-renders its children
 * when its state changes. It also wraps `state` in a cursor to
 * make it easy for components to notify it when they manipulate the
 * `state`
 *
 * @param {Any} state
 * @param {Function} render
 * @return {<div class='app'/>}
 */

class App extends Element {
  constructor(state, render) {
    super('div', {className: 'app'}, [])
    this.listen('mount', this.onMount)
    this.listen('unmount', this.onUnMount)
    this.isRendering = true
    this.redrawScheduled = false
    this.cursor = state instanceof RootCursor ? state : new RootCursor(state)

    this.redraw = () => {
      this.redrawScheduled = false
      this.isRendering = true
      cursor = this.cursor // for the JSX function
      const children = toArray(render(this.cursor))
      cursor = null
      this.updateChildren(children)
      this.children = children
      this.isRendering = false
    }

    this.cursor.addListener(() => {
      assert(!this.isRendering, 'redraw requested while rendering')
      if (this.redrawScheduled) return
      this.redrawScheduled = true
      requestAnimationFrame(this.redraw)
    })

    this.children = toArray(render(cursor = this.cursor))
    cursor = null
    this.isRendering = false
  }

  mountIn(container) {
    container.appendChild(this.toDOM())
    notifyMount(this)
  }

  onMount({dom}) {
    events.forEach(event => dom.addEventListener(event, dispatchEvent, true))
  }

  onUnMount({dom}) {
    events.forEach(event => dom.removeEventListener(event, dispatchEvent, true))
  }
}

const toArray = v => Array.isArray(v) ? v : [v]

const events = [
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
]

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
    if (node) node.notify(type, e)
    if (event.cancelBubble) break
    target = target.parentNode
  }
}

export {Text,Element,App,Node,JSX,NODE}
