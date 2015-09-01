const {JSX,NODE,Text,Element,App} = require('..')
const event = require('dom-event')

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

  it('mountIn', () => {
    app.mountIn(document.body)
    assert(app.dom.parentNode == document.body)
    assert(app.dom.outerHTML == '<div class="app"><div class="name">jkroso</div></div>')
  })

  it('event dispatcher', () => {
    app.dom.firstChild.dispatchEvent(event('click'))
    assert(app.dom.parentNode == null)
  })
})

describe('JSX', () => {
  it('create elements', () => {
    assert(eql(<img/>, JSX('img')))
    assert(eql(<h1>a</h1>, JSX('h1', null, 'a')))
    assert(eql(<h1><a href="#">a</a></h1>,
               JSX('h1', null, JSX('a', {href:"#"}, 'a'))))
    assert(eql(<ul>{['a', 'b', 'c']}</ul>,
               JSX('ul', null, 'a', 'b', 'c')))
  })

  it('Component defined queries', () => {
    const Component = ({cursor}) => <span>{cursor.value}</span>
    Component.query = '/some-path'
    const app = new App(new Map([['some-path', 1]]), () => <Component/>)
    assert(eql(app.children[0], <span>1</span>))
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
      let a = <a/>
      let div = <div>{a}{a}{a}</div>
      let dom = div.toDOM()
      assert(dom.children[0][NODE] === div.children[0])
      assert(dom.children[1][NODE] === div.children[1])
      assert(dom.children[2][NODE] === div.children[2])
    })
    it('emit()')
  })
})
