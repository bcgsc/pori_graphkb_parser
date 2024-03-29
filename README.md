# GraphKB Parser

[![codecov](https://codecov.io/gh/bcgsc/pori_graphkb_parser/branch/master/graph/badge.svg?token=D3IG5YL6JT)](https://codecov.io/gh/bcgsc/pori_graphkb_parser) ![build](https://github.com/bcgsc/pori_graphkb_parser/workflows/build/badge.svg?branch=master) [![npm version](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-parser.svg)](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-parser) ![node versions](https://img.shields.io/badge/node-12%20%7C%2014%20%7C%2016-blue)

This repository is part of the [platform for oncogenomic reporting and interpretation](https://github.com/bcgsc/pori).

- [About](#about)
- [Getting Started](#getting-started)

## About

The GraphKB parser is a node module for parsing variant notation and producing strings from
parsed notation.

## Getting Started

Import the package (Or try it out online with [RunKit](https://runkit.com/creisle/6083062ff39ff0001b93ea6f))

```js
const {parseVariant, stringifyVariant, jsonifyVariant} = require('@bcgsc-pori/graphkb-parser');
```

To use the variant parser methods simply pass a string into

```js
> const parsedResult = parseVariant('FEATURE:p.G12D');
{
    'prefix': 'p',
    ...
}
```

Which returns a variant notation object. This can be turned back into a string

```js
> stringifyVariant(parsedResult);
'FEATURE:p.G12D'
```

or a JSON (removes extra attributes used by parse methods)

```js
> jsonifyVariant(parsedResult)
```

If the notation is improperly formatted, the parse function will raise a parsing error

```js
try {
   const parsedResult = parseVariant('FEATUREp.G12D');
} catch (err) {
    if (err instanceof kbp.error.ParsingError) {
        console.log('Error in parsing the notation');
    }
}
```

See [notation](doc/notation.md) for information regarding the notation syntax.
