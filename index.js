const call = Function.call
const NODE = Symbol('node')

class Node {
  remove() {
    this.dom.parentNode.removeChild(this.dom)
  }
  replace(next) {
    this.dom.parentElement.replaceChild(next.toDOM(), this.dom)
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
    this.dom = document.createTextNode(this.text)
    this.dom[NODE] = this
    return this.dom
  }
  update(next) {
    if (easyUpdate(this, next)) return next
    if (this.text != next.text) this.dom.nodeValue = next.text
    linkNodes(this.dom, next)
    return next
  }
}

class Element extends Node {
  constructor(tagName, params=null, children=[]) {
    super()
    this.dom = null
    this.tagName = tagName
    this.params = {}
    this.children = children
    this.events = {}
    this.mergeParams(params)
  }

  /**
   * Merge raw params onto this.params and this.events
   *
   * @param {Object} params
   */

  mergeParams(parameters){
    var params = this.params
    for (var key in parameters) {
      var value = parameters[key]
      if (typeof value == 'function' && /^on\w+$/.test(key)) {
        this.listen(key.substring(2).toLowerCase(), value)
      } else if (key == 'class') {
        for (key in value) if (value[key]) {
          params.className = params.className
            ? params.className + ' ' + key
            : key
        }
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

  emit(type) {
    var fn = this.events[type]
    if (fn == null) return
    arguments[0] = this
    call.apply(fn, arguments)
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
            previous.call(this, event)
            next.call(this, event)
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
    if (easyUpdate(this, next)) return next
    if (this.tagName != next.tagName) return this.replace(next)
    updateAttributes(this.params, next.params, this.dom)
    updateChildren(this, next)
    linkNodes(this.dom, next)
    return next
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

const adoptNewDOMElement = (node, dom) => {
  linkNodes(dom, node)
  var attrs = node.params
  for (var key in attrs) setAttribute(dom, key, attrs[key])
  node.children.forEach(child => dom.appendChild(child.toDOM()))
}

const notifyUnmount = node => {
  if (!node.children) return
  node.children.forEach(notifyUnmount)
  node.emit('unmount', node.dom)
}

const notifyMount = node => {
  if (!node.children) return
  node.children.forEach(notifyMount)
  node.emit('mount', node.dom)
}

const easyUpdate = (a, b) => {
  if (a === b) { /*no change*/ }
  else if (b == null) a.remove()
  else if (a.constructor != b.constructor) a.replace(b)
  else return false
  return true
}

const linkNodes = (el, o) => (o.dom = el, el[NODE] = o)

const updateAttributes = (a, b, dom) => {
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

const updateChildren = (a, b) => {
  var l = a.children.length

  // remove redundant nodes
  while (l > b.children.length) a.children[--l].remove()

  // mutate existing nodes
  for (var i = 0; i < l; i++) {
    a.children[i].update(b.children[i])
  }

  // append extras
  while (l < b.children.length) {
    var child = b.children[l++]
    a.dom.appendChild(child.toDOM())
    notifyMount(child)
  }
}

const createSVG = (tag) =>
  document.createElementNS('http://www.w3.org/2000/svg', tag)

const createElement = {
  svg() {
    var el = createSVG('svg')
    el.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    el.setAttribute('version', '1.1')
    el.setAttribute('height', '100%')
    el.setAttribute('width', '100%')
    return el
  },
  path() {
    var el = createSVG('path')
    el.setAttribute('stroke', 'black')
    el.setAttribute('fill', 'none')
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
  "textRendering", "unicodeBidi", "visibility", "wordSpacing", "writingMode"
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
  } else if (key == 'className' && typeof el.className == 'string') {
    el.className = value // chrome bug
  } else if (key in attrWhiteList) {
    if (typeof value == 'boolean') el[key] = value
    else el.setAttribute(key, value)
  }
}

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
    return Type(params, children)
  } else {
    return new Element(Type, params, children)
  }
}

const toNodes = (nodes, val) => {
  if (val == null) return nodes
  if (Array.isArray(val)) nodes.push(...val.reduce(toNodes, []))
  else if (typeof val != 'object') nodes.push(new Text(val))
  else nodes.push(val)
  return nodes
}

export {Text,Element,Node,JSX,NODE}
