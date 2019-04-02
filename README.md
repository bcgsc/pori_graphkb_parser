# Knowledgebase Parser

- [About](#about)
- [Getting Started](#getting-started)


## About

The Knowledgebase parser is a node module for parsing variant notation and producing strings from
parsed notation.

## Getting Started

Import the package

```
const kbp = require('knowledgebase-parser');
```

To use the variant parser methods simply pass a string into

```
> const parsedResult = kbp.variant.parse('FEATURE:p.G12D');
VariantNotation(....)
```
Which returns a variant notation object. This can be turned back into a string

```
> parsedResult.toString();
'FEATURE:p.G12D'
```

or a JSON
```
> parsedResult.toJSON()
```

If the notation is improperly formatted, the parse function will raise a parsing error

```
try {
   const parsedResult = kbp.variant.parse('FEATUREp.G12D');
} catch (err) {
    if (err instanceof kbp.error.ParsingError) {
        console.log('Error in parsing the notation');
    }
}
```

See [notation](doc/notation.md) for information regarding the notation syntax.


