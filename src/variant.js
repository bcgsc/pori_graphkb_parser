const { ParsingError, InputValidationError } = require('./error');
const {
    createPosition, createBreakRepr, convertPositionToJson, parsePosition,
} = require('./position');
const {
    NOTATION_TO_TYPES,
    TYPES_TO_NOTATION,
    NONSENSE,
    TRUNCATING_FS,
} = require('./constants');
const { parseContinuous, getPrefix } = require('./continuous');

const POSITION_ATTRS = ['break1Start', 'break1End', 'break2Start', 'break2End'];


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


const createVariantNotation = ({
    requireFeatures = false,
    reference1,
    reference2,
    untemplatedSeq: untemplatedSeqIn,
    untemplatedSeqSize: untemplatedSeqSizeIn,
    type: typeIn,
    refSeq,
    prefix,
    multiFeature: multiFeatureIn,
    truncation,
    notationType,
    break1Start: break1StartIn,
    break1End: break1EndIn,
    break2Start: break2StartIn,
    break2End: break2EndIn,
}) => {
    if (!break1StartIn) {
        throw new InputValidationError({
            message: 'break1Start is a required attribute',
            violatedAttr: 'break1Start',
        });
    }
    const noFeatures = Boolean(
        !requireFeatures
        && !reference1
        && !reference2,
    );
    const multiFeature = Boolean(multiFeatureIn || reference2);

    const type = ontologyTermRepr(typeIn);
    const untemplatedSeq = !isNullOrUndefined(untemplatedSeqIn)
        ? untemplatedSeqIn.toUpperCase()
        : untemplatedSeqIn;
    let untemplatedSeqSize;

    // default to the same length as the input seq size if not otherwise specified
    if (untemplatedSeqSizeIn !== undefined) {
        untemplatedSeqSize = untemplatedSeqSizeIn;
    } else if (!isNullOrUndefined(untemplatedSeq)) {
        untemplatedSeqSize = untemplatedSeq.length;
    }

    if (TYPES_TO_NOTATION[type] === undefined) {
        throw new InputValidationError({
            message: `invalid type ${type}`,
            violatedAttr: 'type',
        });
    }

    // cast positions
    const formatPosition = (input) => {
        if (input !== null && input !== undefined) {
            return createPosition(prefix, input);
        }
        return input;
    };

    const break1Start = formatPosition(break1StartIn);
    const break1End = formatPosition(break1EndIn);
    const break2Start = formatPosition(break2StartIn);
    const break2End = formatPosition(break2EndIn);

    const break1Repr = createBreakRepr(break1Start, break1End, multiFeature);
    let break2Repr;

    if (break2Start) {
        if ([
            NOTATION_TO_TYPES['>'],
            NONSENSE,
            TRUNCATING_FS,
            NOTATION_TO_TYPES.ext,
            NOTATION_TO_TYPES.fs,
            NOTATION_TO_TYPES.spl,
        ].includes(type)) {
            throw new ParsingError({
                message: `${type} variants cannot be a range`,
                violatedAttr: 'break2',
            });
        }
        break2Repr = createBreakRepr(break2Start, break2End, multiFeature);
    }

    if (type === NOTATION_TO_TYPES.ins) {
        if (!break2Start && break1Start.prefix !== 'e') {
            throw new InputValidationError({
                message: 'Insertion events must be specified with a range',
                violatedAttr: 'type',
            });
        }
    }

    return {
        reference1: ontologyTermRepr(reference1),
        reference2: ontologyTermRepr(reference2),
        refSeq: !isNullOrUndefined(refSeq)
            ? refSeq.toUpperCase()
            : refSeq,
        truncation,
        multiFeature,
        type,
        break1Start,
        break1End,
        break1Repr,
        break2End,
        break2Start,
        break2Repr,
        untemplatedSeq,
        untemplatedSeqSize,
        noFeatures,
        notationType,
    };
};


const jsonifyVariant = (variant) => {
    const json = {};
    const IGNORE = ['prefix', 'multiFeature', 'noFeatures', 'notationType'];

    for (const [attr, value] of Object.entries(variant)) {
        if (value !== undefined && !IGNORE.includes(attr)) {
            if (POSITION_ATTRS.includes(attr)) {
                json[attr] = convertPositionToJson(variant[attr]);
            } else {
                json[attr] = variant[attr];
            }
        }
    }
    return json;
};

const stringifyVariant = (variant) => {
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

    if (notationType === 'mis' && untemplatedSeq && break1Repr.startsWith('p.')) {
        result.push(untemplatedSeq);
    } else if (notationType !== '>') {
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
};


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
    // const parsed = { multiFeature: true };

    if (string.indexOf('(') < 0) {
        throw new ParsingError({ message: 'Missing opening parentheses', input: string, violatedAttr: 'punctuation' });
    }
    let variantType = string.slice(0, string.indexOf('('));

    if (variantType.length === 0) {
        throw new ParsingError({
            message: 'Variant type was not specified. It is expected to immediately follow the coordinate prefix',
            parsed: { type: variantType },
            input: string,
            violatedAttr: 'type',
        });
    }
    if (!NOTATION_TO_TYPES[variantType]) {
        throw new ParsingError({
            message: `Variant type (${variantType}) not recognized`, parsed: { type: variantType }, input: string, violatedAttr: 'type',
        });
    }
    if (!['fusion', 'trans', 'itrans'].includes(variantType)) {
        throw new ParsingError({
            message: `Continuous notation is preferred over multi-feature notation for ${variantType} variant types`,
            parsed: { type: variantType },
            input: string,
        });
    }
    variantType = NOTATION_TO_TYPES[variantType];

    if (string.indexOf(')') < 0) {
        throw new ParsingError({
            message: 'Missing closing parentheses', parsed: { type: variantType }, input: string, violatedAttr: 'punctuation',
        });
    }
    const rawUntemplatedSeq = string.slice(string.indexOf(')') + 1);
    let untemplatedSeq,
        untemplatedSeqSize;

    if (rawUntemplatedSeq.length > 0) {
        if (parseInt(rawUntemplatedSeq, 10)) {
            untemplatedSeqSize = parseInt(rawUntemplatedSeq, 10);
        } else {
            untemplatedSeq = rawUntemplatedSeq;
            untemplatedSeqSize = rawUntemplatedSeq.length;
        }
    }
    const positions = string.slice(string.indexOf('(') + 1, string.indexOf(')')).split(',');

    if (positions.length > 2) {
        throw new ParsingError({
            message: 'Single comma expected to split breakpoints/ranges',
            parsed: { type: variantType, untemplatedSeq, untemplatedSeqSize },
            input: string,
            violatedAttr: 'punctuation',
        });
    } else if (positions.length < 2) {
        throw new ParsingError({
            message: 'Missing comma separator between breakpoints/ranges',
            parsed: { type: variantType, untemplatedSeq, untemplatedSeqSize },
            input: string,
            violatedAttr: 'punctuation',
        });
    }
    let prefix,
        break1Start,
        break1End,
        break2Start,
        break2End;

    try {
        prefix = getPrefix(positions[0]);
        positions[0] = positions[0].slice(2);

        if (positions[0].includes('_')) {
            const splitPos = positions[0].indexOf('_');
            break1Start = parsePosition(prefix, positions[0].slice(0, splitPos));
            break1End = parsePosition(prefix, positions[0].slice(splitPos + 1));
        } else {
            break1Start = parsePosition(prefix, positions[0]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string,
            parsed: {
                type: variantType, break1Start, break1End, break2Start, break2End, untemplatedSeqSize, untemplatedSeq,
            },
            subParserError: err,
            violatedAttr: 'break1',
        });
    }

    try {
        prefix = getPrefix(positions[1]);
        positions[1] = positions[1].slice(2);

        if (positions[1].includes('_')) {
            const splitPos = positions[1].indexOf('_');
            break2Start = parsePosition(prefix, positions[1].slice(0, splitPos));
            break2End = parsePosition(prefix, positions[1].slice(splitPos + 1));
        } else {
            break2Start = parsePosition(prefix, positions[1]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string,
            parsed: {
                type: variantType, break1Start, break1End, break2Start, break2End, untemplatedSeqSize, untemplatedSeq,
            },
            subParserError: err,
            violatedAttr: 'break2',
        });
    }
    return {
        type: variantType, break1Start, break1End, break2Start, break2End, untemplatedSeqSize, untemplatedSeq, prefix,
    };
};

/**
 * Parse variant shorthand. Checks and validates notation
 *
 * @param {string} string the variant to be parsed
 *
 * @returns {object} the parsed content
 */
const parseVariant = (string, requireFeatures = true) => {
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
    return createVariantNotation({ ...result, requireFeatures });
};


module.exports = {
    parseVariant, jsonifyVariant, stringifyVariant, stripParentheses, createVariantNotation,
};
