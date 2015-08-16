const {JSX,NODE,Element} = require('..')

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

it('JSX', () => {
  assert(eql(<img/>, JSX('img')))
  assert(eql(<h1>a</h1>, JSX('h1', null, 'a')))
  assert(eql(<h1><a href="#">a</a></h1>,
             JSX('h1', null, JSX('a', {href:"#"}, 'a'))))
  assert(eql(<ul>{['a', 'b', 'c']}</ul>,
             JSX('ul', null, 'a', 'b', 'c')))
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
