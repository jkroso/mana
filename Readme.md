# Mana

See the [design wiki](https://www.notion.so/FvxeqQWVRJeop) if you have questions about mana's implementation or would like to share ideas.

Mana is a virtual DOM based library which combines all the best ideas I know to enable me to create the prettiest GUI code possible right now using JavaScript

- Designed for the global state + cursors architecture
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
import {JSX,App} from 'mana'
```

## API

```js
new App(state, cursor => {
  return <input value={cursor.value}
                placeholder='Enter value here'
                onChange={e => cursor.value = e.target.value}/>
}).mountIn(document.body)
```

## Examples

##### [TodoMVC](//github.com/jsiom/todomvc)

IMHO TodoMVC doesn't ask enough of it's implementors be really useful. But it's a nice place to start. It'll show you how easy mana makes the easy stuff.

##### [mana-map](//github.com/jkroso/mana-map)

Demonstrates subclassing a "div" element and using lifecycle hooks to integrate with google maps. This could just as easily of been a subclass of `ProxyNode` but by subclassing `Element` instead I was able to hook into more specific parts of the `update()` method. Namely `updateParams()` and `updateChildren()`. Which makes a slightly more readable and slightly more efficient.

##### [mana-async](//github.com/jkroso/mana-async)

Demonstrates how local state is necessary sometimes and how the abstract class `Component` can make it easy to do cleanly

##### [mana-text-input](//github.com/jsiom/text-input)

Demonstrates how to write a configurable component. Anyone who uses this can add their own classNames, event handlers, etc.. just by specifying them as they would normally. And it will not overwrite the ones used internally by the component. And all text-input does internally to support this is `.mergeParams(params)`
