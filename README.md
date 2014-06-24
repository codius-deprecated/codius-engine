The engine to run contracts

## IPC Messaging Format

### Contract -> Sandbox

API call with callback
```js
{
  "type": "api",
  "module": "http",
  "method": "get",
  "data": "http://some.url",
  "callback": 4
}
```

Process finished message?

### Sandbox -> Contract

API callback
```js
{
  "type": "callback",
  "callback": 4,
  "error": null,
  "result": "some stringified result"
}
```

Event listener triggered
```js
{
  "type": "event",
  "handler": "eventHandlerName",
  "data": "data passed in on event"
}
```

Unprompted message? (e.g. the contract client triggering a contract to run)
- how to reference a specific contract?
- how do you validate they have permissions to send it a message?
