# Mana

A virtual DOM based framework which combines all the best ideas I know to enable me to create the prettiest GUI code possible right now using JavaScript

- No components; no need
- No private state; its weird
- Mount/UnMount hooks; to integrate with legacy code that nobody wants to rewrite, like google maps. Also because HACKS
- Extensible; haha na not really, I tried though
- Designed for the global state + cursors architecture; But will adopt the reified query style ASAP
- Renders onto an element, instead of into
- Supports JSX syntax

## Installation

`npm install --save jkroso/mana`

then in your app:

```js
const {JSX} = require('mana')
```

## API

```js
const UI = <body><h1>Hello</h1></body>
UI.mount(document.body)
const NextUI = <body><h1>Mana</h1></body>
UI.update(NextUI)
```

see the [TodoMVC implementation](//github.com/jsiom/todomvc) for a better example
