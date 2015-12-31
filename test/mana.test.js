import {JSX,NODE,Text,Element,App} from '..'
import {spy} from 'simple-spy'
import event from 'dom-event'
import assert from 'assert'

const eql = (a,b) => a.toDOM().outerHTML == b.toDOM().outerHTML

describe('Element', () => {
  let el = new Element('input').mergeParams({
    onClick: it,
    class: {a:true,b:false,c:true},
    type: 'text'
  })

  it('mergeParams()', () => {
    assert(el.events.click == it)
    assert(el.params.className == 'a c')
    assert(el.params.type == 'text')
  })

  it('toDOM()', () => {
    var dom = el.toDOM()
    assert(dom.className == 'a c')
    assert(dom.type == 'text')
  })
})

describe('App', () => {
  const app = new App({user:'jkroso'}, cursor => {
    return new Element('div',
                       {className: 'name'},
                       [new Text(cursor.value.user)],
                       {click: () => app.remove()})
  })
  const dom = app.mountIn(document.body)

  it('mountIn', () => {
    assert(dom.outerHTML == '<div class="name">jkroso</div>')
  })

  it('event dispatcher', () => {
    dom.dispatchEvent(event('click'))
    assert(dom.parentNode == null)
  })
})

describe('JSX', () => {
  it('create elements', () => {
    assert(eql(<img/>, JSX('img')))
    assert(eql(<h1>a</h1>, JSX('h1', null, ['a'])))
    assert(eql(<h1><a href="#">a</a></h1>,
               JSX('h1', null, [JSX('a', {href:"#"}, ['a'])])))
    assert(eql(<ul>{['a', 'b', 'c']}</ul>,
               JSX('ul', null, ['a', 'b', 'c'])))
  })
})

describe('toString()', () => {
  it('no children', () => {
    assert(<div class='a'/> == '<div class="a"></div>')
  })

  it('with children', () => {
    assert(<div class='traffic-light'>
             <div style='color:red;'/>
             <div style='color:orange;'/>
             <div style='color:green;'/>
           </div>
       == '<div class="traffic-light">'
        +   '<div style="color:red;"></div>'
        +   '<div style="color:orange;"></div>'
        +   '<div style="color:green;"></div>'
        + '</div>')
  })

  it('self closing', () => {
    assert(<img src='a'/> == '<img src="a"/>')
  })
})

describe('Problem areas', () => {
  describe('element reuse', () => {
    it('multiple DOM elements pointing to a single node', () => {
      let node = <a/>
      let UI = <div>{node}{node}{node}</div>
      let dom = UI.toDOM()
      assert(dom.children[0][NODE] === UI.children[0])
      assert(dom.children[1][NODE] === UI.children[1])
      assert(dom.children[2][NODE] === UI.children[2])
    })

    it('one instance accross updates', () => {
      let node = <a/>
      let UI1 = <div><b>text</b>{node}</div>
      let UI2 = <div><b>{node}</b>text</div>
      let dom = UI1.toDOM()
      UI1.update(UI2, dom)
      assert(dom.outerHTML == UI2)
    })

    it('multiple instances across updates', () => {
      let node = <a/>
      let UI1 = <div>{node}{node}</div>
      let UI2 = <div><b/>{node}</div>
      let dom = UI1.toDOM()
      UI1.update(UI2, dom)
      assert(dom.outerHTML == UI2)
    })
  })

  describe('lifecycle hooks', () => {
    it('popping from the front of a list', () => {
      class N extends Element {
        constructor(params) {
          super('div', params)
        }
        onUnMount = spy(() => null)
      }
      let UI1 = <div><N id="1"/><N id="2"/></div>
      let UI2 = <div><N id="2"/></div>
      let dom = UI1.toDOM()
      UI1.update(UI2, dom)
      assert(UI1.children[0].onUnMount.callCount == 1)
    })
  })
})
