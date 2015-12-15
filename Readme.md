# Mana

See the [design wiki](https://www.notion.so/FvxeqQWVRJeop) if you have questions about mana's implementation or would like to share ideas.

Mana is a virtual DOM based library which combines all the best ideas I know to enable me to create the prettiest GUI code possible right now using JavaScript

- Designed for the global state + cursors architecture
- Also supports components with local state
- Mount/UnMount hooks; to integrate with legacy code that nobody wants to rewrite, like google maps. Also because HACKS
- Extensible; haha na not really, I tried though. To implement a new type you only need to support the interface of a standard node you don't actually need to sub-type it or anything like that. The basic interface is:
  - `x.toDOM()` → native DOM node
  - `x.toString()` → an HTML string
  - `x.update(y::Node, dom::DOM)` → mutates `dom` so that `dom ≈ y.toDOM()`
  - `x.children` → an `Array` of child nodes
  - `x.listen(event::String, fn::Function)` → registers `fn` to be invoked when `x.notify(event)` is called
  - `x.notify(event::String, ...)` → invokes `event` listeners on `x`
- Supports JSX syntax

## Installation

`npm install --save jkroso/mana`

then in your app:

```js
const {JSX,App} = require('mana')
```

## API

```js
new App(state, cursor => {
  return <input value={cursor.value}
                placeholder='Enter value here'
                onChange={e => cursor.value = e.target.value}/>
}).mountIn(document.body)
```

see the [TodoMVC implementation](//github.com/jsiom/todomvc) for a better example
