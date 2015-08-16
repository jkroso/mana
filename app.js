const {RootCursor} = require('cursor')
const domready = require('domready')
const assert = require('assert')
const {NODE,JSX} = require('./')
const Atom = require('cell')

/**
 * Initialize an app and mount it at `location`
 *
 * @param {Any} state
 * @param {Function} render
 * @param {DomElement} location
 */

class App {
  constructor(state, render, location) {
    this.isRendering = false
    this.redrawScheduled = false
    this.atom = state instanceof Atom ? state : new Atom(state)
    this.cursor = new RootCursor(this.atom)
    this.UI = render(this.cursor)

    this.redraw = () => {
      this.redrawScheduled = false
      this.isRendering = true
      this.UI = this.UI.update(render(this.cursor))
      this.isRendering = false
      this.onRedraw()
    }

    this.atom.addListener(() => {
      assert(!this.isRendering, 'redraw requested while rendering')
      if (this.redrawScheduled) return
      this.redrawScheduled = true
      requestAnimationFrame(this.redraw)
    })

    // wait for document.body to be defined
    domready(() => this.UI.mount(location || document.body))
  }

  // Overwrite if you want to save the state or something
  onRedraw(){}
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
    if (node) node.notify(type, e)
    if (event.cancelBubble) break
    target = target.parentNode
  }
}

;[
  'click',
  'mousedown',
  'mouseup',
  'dblclick',
  'mousedown',
  'mouseup',
  'mouseover',
  'mousemove',
  'mouseout',
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
  'resize',
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

export {App,JSX}
