const { ParsingError, InputValidationError } = require('./error');
const _position = require('./position');
const {
    NOTATION_TO_TYPES,
    TYPES_TO_NOTATION,
    NONSENSE,
    TRUNCATING_FS,
} = require('./constants');
const { parseContinuous, getPrefix } = require('./continuous');


const ontologyTermRepr = (term) => {
    if (term) {
        return term.displayName || term.sourceId || term.name || term;
    }
    return term;
};


const stripParentheses = (breakRepr) => {
    const match = /^([a-z])\.\((.+)\)$/.exec(breakRepr);

    if (match) {
        return `${match[1]}.${match[2]}`;
    }
    return breakRepr;
};


const isNullOrUndefined = thing => thing === undefined || thing === null;


class VariantNotation {
    /**
     * @param {Object} opt options
     * @param {Position} opt.break1Start the start of the first breakpoint range
     * @param {?Position} opt.break1End the end of the first breakpoint range
     * @param {?Position} opt.break2Start the start of the second breakpoint range
     * @param {?Position} opt.break2End the end of the second breakpoint range
     * @param {?string} opt.untemplatedSeq untemplated sequence
     * @param {?Number} opt.untemplatedSeqSize the length of the untemplatedSeq
     * @param {string} opt.reference1 the first reference feature name
     * @param {?string} opt.reference2 the second reference feature name
     * @param {boolean} [opt.multiFeature=false] flag to indicate this should be a multiple feature variant
     * @param {?Number} opt.truncation the new position of the next closest terminating AA
     * @param {string} opt.type the event type
     * @param {boolean} opt.requireFeatures flag to allow variant notation with features (reference1/2)
     * @param {string} opt.notationType
     */
    constructor(opt) {
        const {
            requireFeatures = false,
            reference1,
            reference2,
            untemplatedSeq,
            untemplatedSeqSize,
            type,
            refSeq,
            prefix,
            multiFeature,
            truncation,
            notationType,
        } = opt;
        this.notationType = notationType;
        this.noFeatures = Boolean(
            !requireFeatures
            && !reference1
            && !reference2,
        );
        this.prefix = prefix;
        this.reference1 = ontologyTermRepr(reference1);
        this.reference2 = ontologyTermRepr(reference2);
        this.multiFeature = Boolean(multiFeature || reference2);

        this.type = ontologyTermRepr(type);
        this.untemplatedSeq = !isNullOrUndefined(untemplatedSeq)
            ? untemplatedSeq.toUpperCase()
            : untemplatedSeq;

        this.refSeq = !isNullOrUndefined(refSeq)
            ? refSeq.toUpperCase()
            : refSeq;

        this.truncation = truncation;

        // default to the same length as the input seq size if not otherwise specified
        if (untemplatedSeqSize !== undefined) {
            this.untemplatedSeqSize = untemplatedSeqSize;
        } else if (!isNullOrUndefined(this.untemplatedSeq)) {
            this.untemplatedSeqSize = this.untemplatedSeq.length;
        }
        this.type = ontologyTermRepr(type);

        if (TYPES_TO_NOTATION[this.type] === undefined) {
            throw new InputValidationError({
                message: `invalid type ${this.type}`,
                violatedAttr: 'type',
            });
        }

        // cast positions
        const defaultPosClass = _position[_position.PREFIX_CLASS[this.prefix]];

        this.break1Start = opt.break1Start;

        for (const breakAttr of ['break1Start', 'break1End', 'break2Start', 'break2End']) {
            if (opt[breakAttr] && !(opt[breakAttr] instanceof _position.Position)) {
                let PosCls = defaultPosClass;

                if (opt[breakAttr]['@class']) {
                    PosCls = _position[opt[breakAttr]['@class']];
                } else if (opt[breakAttr].prefix) {
                    PosCls = _position[_position.PREFIX_CLASS[opt[breakAttr].prefix]];
                }
                this[breakAttr] = new PosCls(opt[breakAttr]);
            } else {
                this[breakAttr] = opt[breakAttr];
            }
        }

        if (!(this.break1Start instanceof _position.Position)) {
            throw new InputValidationError({
                message: 'break1Start is a required attribute',
                violatedAttr: 'break1Start',
            });
        }

        this.break1Repr = _position.breakRepr(this.break1Start, this.break1End, this.multiFeature);

        if (this.break2Start) {
            if ([
                NOTATION_TO_TYPES['>'],
                NONSENSE,
                TRUNCATING_FS,
                NOTATION_TO_TYPES.ext,
                NOTATION_TO_TYPES.fs,
                NOTATION_TO_TYPES.spl,
            ].includes(this.type)) {
                throw new ParsingError({
                    message: `${this.type} variants cannot be a range`,
                    violatedAttr: 'break2',
                });
            }
            this.break2Repr = _position.breakRepr(this.break2Start, this.break2End, this.multiFeature);
        }

        if (this.type === NOTATION_TO_TYPES.ins) {
            if (!this.break2Start && this.break1Start.prefix !== _position.ExonicPosition.prefix) {
                throw new InputValidationError({
                    message: 'Insertion events must be specified with a range',
                    violatedAttr: 'type',
                });
            }
        }
    }

    toJSON() {
        const json = {};
        const IGNORE = ['prefix', 'multiFeature', 'noFeatures', 'notationType'];

        for (const [attr, value] of Object.entries(this)) {
            if (value !== undefined && !IGNORE.includes(attr)) {
                if (value instanceof _position.Position) {
                    json[attr] = value.toJSON();
                } else {
                    json[attr] = value;
                }
            }
        }
        return json;
    }

    toString() {
        return this.constructor.toString(this);
    }

    static toString(variant) {
        const {
            multiFeature,
            noFeatures,
            reference1,
            reference2,
            break1Repr,
            break2Repr,
            untemplatedSeq,
            untemplatedSeqSize,
            truncation,
            refSeq,
        } = variant;
        let { notationType } = variant;

        if (notationType === undefined) {
            const variantType = (variant.type.name || variant.type);
            notationType = TYPES_TO_NOTATION[variantType] || variantType.replace(/\s+/, '-');
        }

        const isMultiRef = multiFeature || (reference2 && (reference1 !== reference2));


        if (isMultiRef) {
            // multi-feature notation
            let result = noFeatures
                ? ''
                : `(${reference1},${reference2}):`;
            result = `${result}${notationType}(${stripParentheses(break1Repr)},${stripParentheses(break2Repr)})`;

            if (untemplatedSeq !== undefined) {
                result = `${result}${untemplatedSeq}`;
            } else if (untemplatedSeqSize !== undefined) {
                result = `${result}${untemplatedSeqSize}`;
            }
            return result;
        }
        // continuous notation
        const result = [];

        if (!noFeatures && !noFeatures) {
            result.push(`${reference1}:`);
        }
        result.push(break1Repr);

        if (break2Repr) {
            result.push(`_${break2Repr.slice(2)}`);
        }
        if (
            ['ext', 'fs'].includes(notationType)
            || (notationType === '>' && break1Repr.startsWith('p.'))
        ) {
            if (untemplatedSeq) {
                result.push(untemplatedSeq);
            }
        }
        if (notationType !== '>') {
            if (notationType === 'delins') {
                result.push(`del${refSeq || ''}ins`);
            } else {
                result.push(notationType);
            }
            if (truncation && truncation !== 1) {
                if (truncation < 0) {
                    result.push(truncation);
                } else {
                    result.push(`*${truncation}`);
                }
            }

            if (refSeq && ['dup', 'del', 'inv'].includes(notationType)) {
                result.push(refSeq);
            }
            if ((untemplatedSeq || untemplatedSeqSize) && ['ins', 'delins'].includes(notationType)) {
                result.push(untemplatedSeq || untemplatedSeqSize);
            }
        } else if (!break1Repr.startsWith('p.')) {
            result.push(`${refSeq || '?'}${notationType}${untemplatedSeq || '?'}`);
        }
        return result.join('');
    }
}


/**
 * Given a string representing a multi-feature variant. Parse and checks the format returning
 * meaningful error messages.
 *
 * @param {string} string the string to be parsed
 *
 * @returns {object} the parsed variant information
 *
 * @example
 * > parseMultiFeature('e.fusion(1,10)');
 * {type: 'fusion', prefix: 'e', break1Start: {'@class': 'ExonicPosition', pos: 1}, break1Repr: 'e.1', break2Start: {'@class': 'ExonicPosition', pos: 10}, break2Repr: 'e.10}
 */
const parseMultiFeature = (string) => {
    if (string.length < 6) {
        throw new ParsingError(`Too short. Multi-feature notation must be a minimum of six characters: ${string}`);
    }
    const parsed = { multiFeature: true };

    if (string.indexOf('(') < 0) {
        throw new ParsingError({ message: 'Missing opening parentheses', input: string, violatedAttr: 'punctuation' });
    }
    parsed.type = string.slice(0, string.indexOf('('));

    if (parsed.type.length === 0) {
        throw new ParsingError({
            message: 'Variant type was not specified. It is expected to immediately follow the coordinate prefix',
            parsed,
            input: string,
            violatedAttr: 'type',
        });
    }
    if (!NOTATION_TO_TYPES[parsed.type]) {
        throw new ParsingError({
            message: `Variant type (${parsed.type}) not recognized`, parsed, input: string, violatedAttr: 'type',
        });
    }
    if (!['fusion', 'trans', 'itrans'].includes(parsed.type)) {
        throw new ParsingError({
            message: `Continuous notation is preferred over multi-feature notation for ${parsed.type} variant types`,
            parsed,
            input: string,
        });
    }
    parsed.type = NOTATION_TO_TYPES[parsed.type];

    if (string.indexOf(')') < 0) {
        throw new ParsingError({
            message: 'Missing closing parentheses', parsed, input: string, violatedAttr: 'punctuation',
        });
    }
    const untemplatedSeq = string.slice(string.indexOf(')') + 1);

    if (untemplatedSeq.length > 0) {
        if (parseInt(untemplatedSeq, 10)) {
            parsed.untemplatedSeqSize = parseInt(untemplatedSeq, 10);
        } else {
            parsed.untemplatedSeq = untemplatedSeq;
            parsed.untemplatedSeqSize = untemplatedSeq.length;
        }
    }
    const positions = string.slice(string.indexOf('(') + 1, string.indexOf(')')).split(',');

    if (positions.length > 2) {
        throw new ParsingError({
            message: 'Single comma expected to split breakpoints/ranges',
            parsed,
            input: string,
            violatedAttr: 'punctuation',
        });
    } else if (positions.length < 2) {
        throw new ParsingError({
            message: 'Missing comma separator between breakpoints/ranges',
            parsed,
            input: string,
            violatedAttr: 'punctuation',
        });
    }
    let prefix;

    try {
        prefix = getPrefix(positions[0]);
        positions[0] = positions[0].slice(2);

        if (positions[0].includes('_')) {
            const splitPos = positions[0].indexOf('_');
            parsed.break1Start = _position.parsePosition(prefix, positions[0].slice(0, splitPos));
            parsed.break1End = _position.parsePosition(prefix, positions[0].slice(splitPos + 1));
        } else {
            parsed.break1Start = _position.parsePosition(prefix, positions[0]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string,
            parsed,
            subParserError: err,
            violatedAttr: 'break1',
        });
    }

    try {
        prefix = getPrefix(positions[1]);
        positions[1] = positions[1].slice(2);

        if (positions[1].includes('_')) {
            const splitPos = positions[1].indexOf('_');
            parsed.break2Start = _position.parsePosition(prefix, positions[1].slice(0, splitPos));
            parsed.break2End = _position.parsePosition(prefix, positions[1].slice(splitPos + 1));
        } else {
            parsed.break2Start = _position.parsePosition(prefix, positions[1]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string,
            parsed,
            subParserError: err,
            violatedAttr: 'break2',
        });
    }
    return parsed;
};

/**
 * Parse variant shorthand. Checks and validates notation
 *
 * @param {string} string the variant to be parsed
 *
 * @returns {object} the parsed content
 */
const parse = (string, requireFeatures = true) => {
    if (!string || string.length < 4) {
        throw new ParsingError({
            message: 'Too short. Must be a minimum of four characters',
            input: string,
        });
    }
    const split = string.split(':');

    if (split.length > 2) {
        throw new ParsingError({ message: 'Variant notation must contain a single colon', input: string, violatedAttr: 'punctuation' });
    } else if (split.length === 1) {
        if (!requireFeatures) {
            split.unshift(null);
        } else {
            throw new ParsingError({ message: 'Feature name not specified. Feature name is required', violatedAttr: 'reference1' });
        }
    }
    let result = {};
    const [featureString, variantString] = split;

    if (variantString.includes(',') || (
        featureString && (
            featureString.startsWith('(')
            || featureString.endsWith(')')
            || featureString.includes(',')
        ))
    ) {
        // multi-feature notation
        if (featureString) {
            if (featureString && !featureString.includes(',')) {
                throw new ParsingError({
                    message: 'Multi-feature notation must contain two reference features separated by a comma',
                    parsed: { featureString, variantString },
                    input: string,
                    violatedAttr: 'reference2',
                });
            } else if (!featureString.startsWith('(')) {
                throw new ParsingError({
                    message: 'Missing opening parentheses surrounding the reference features',
                    parsed: { featureString, variantString },
                    input: string,
                    violatedAttr: 'punctuation',
                });
            } else if (!featureString.endsWith(')')) {
                throw new ParsingError({
                    message: 'Missing closing parentheses surrounding the reference features',
                    parsed: { featureString, variantString },
                    input: string,
                    violatedAttr: 'punctuation',
                });
            }
            const features = featureString.slice(1, featureString.length - 1).split(',');

            if (features.length > 2) {
                throw new ParsingError({
                    message: 'May only specify two features. Found more than a single comma',
                    parsed: { featureString, variantString },
                    input: string,
                });
            }
            [result.reference1, result.reference2] = features;
        }

        try {
            const variant = parseMultiFeature(variantString);
            result = Object.assign(result, variant);
        } catch (err) {
            err.content.parsed = Object.assign({ variantString }, result);
            throw err;
        }
    } else {
        // continuous notation
        if (featureString) {
            result.reference1 = featureString;
        }

        try {
            const variant = parseContinuous(variantString);
            Object.assign(result, variant);
        } catch (err) {
            if (err.content) {
                err.content.parsed = Object.assign({ variantString }, result);
            }
            throw err;
        }
    }
    return new VariantNotation({ ...result, requireFeatures });
};


module.exports = {
    parse, VariantNotation, stripParentheses,
};
