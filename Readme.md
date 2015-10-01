# Mana

See the [design wiki](https://www.notion.so/FvxeqQWVRJeop) if you have questions about mana's implementation or would like to share ideas.

Mana is a virtual DOM based framework which combines all the best ideas I know to enable me to create the prettiest GUI code possible right now using JavaScript

- No components; no need
- No private state; its weird
- Mount/UnMount hooks; to integrate with legacy code that nobody wants to rewrite, like google maps. Also because HACKS
- Extensible; haha na not really, I tried though
- Designed for the global state + cursors architecture (Experimental)
- Can render onto an element, instead of into; for more control
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
