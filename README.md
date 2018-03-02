# Universal certifier SDK module

* [Install](#install)

## Install

```
$ npm install universal-certifier
```

### Promises and Callbacks support

All methods support promises and callbacks.:

```javascript
var it = uc.getAccessToken ();

it.then (
    function (accessToken) {
        console.log (accessToken);
    },
    function (error) {
        console.log (error);
    });
```
is the same as:

```javascript
uc.getAccessToken(function (err, accessToken){
    if (err) {
        console.log (err);
    } else {
        console.log (accessToken);
    }
});
```

In order to use callbacks, simply pass a function as the last parameter.

## Configuration



```javascript
var UC = require ("universal-certifier");

var uc = new UC ("CLIENT_ID", "CLIENT_SECRET");
```

### Certifications

TODO