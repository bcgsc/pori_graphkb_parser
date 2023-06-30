import { InputValidationError, ParsingError } from './error';
import {
    AnyPosition,
    convertPositionToJson,
    createBreakRepr,
    createPosition,
    parsePosition,
} from './position';
import {
    NOTATION_TO_TYPES,
    TYPES_TO_NOTATION,
    NONSENSE,
    TRUNCATING_FS,
    Prefix,
} from './constants';
import { parseContinuous, getPrefix } from './continuous';

const POSITION_ATTRS = ['break1Start', 'break1End', 'break2Start', 'break2End'];

type OntologyTerm = {
    name?: string;
    sourceId?: string;
    sourceIdVersion?: string;
    displayName?: string;
};

const ontologyTermRepr = (term: OntologyTerm | string): string => {
    if (typeof term !== 'string') {
        return term.displayName || term.sourceId || term.name || '';
    }
    return term;
};

const stripParentheses = (breakRepr: string): string => {
    const match = /^([a-z])\.\((.+)\)$/.exec(breakRepr);

    if (match) {
        return `${match[1]}.${match[2]}`;
    }
    return breakRepr;
};

interface VariantNotation {
    reference1: OntologyTerm | string;
    reference2: OntologyTerm | string;
    untemplatedSeq?: string | null;
    untemplatedSeqSize?: number;
    type: OntologyTerm | string;
    refSeq?: string | null;
    prefix: Prefix | null;
    multiFeature: boolean;
    truncation?: number | null;
    notationType?: string;
    break1Start: AnyPosition;
    break1End?: AnyPosition;
    break2Start?: AnyPosition;
    break2End?: AnyPosition;
    break1Repr: string;
    break2Repr?: string;
    noFeatures?: boolean;
}

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
}: {
    requireFeatures?: boolean;
    reference1: string | OntologyTerm;
    reference2: string | OntologyTerm;
    untemplatedSeq?: string | null;
    untemplatedSeqSize?: number | null;
    type: string;
    refSeq?: string | null;
    prefix: Prefix | null;
    multiFeature?: boolean;
    truncation?: number;
    notationType?: string;
    break1Start: AnyPosition;
    break1End?: AnyPosition;
    break2Start?: AnyPosition;
    break2End?: AnyPosition;
}): VariantNotation => {
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
    const untemplatedSeq = untemplatedSeqIn !== undefined && untemplatedSeqIn !== null
        ? untemplatedSeqIn.toUpperCase()
        : untemplatedSeqIn;
    let untemplatedSeqSize;

    // default to the same length as the input seq size if not otherwise specified
    if (untemplatedSeqSizeIn !== undefined) {
        untemplatedSeqSize = untemplatedSeqSizeIn;
    } else if (untemplatedSeq !== undefined && untemplatedSeq !== null) {
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
            let breakPrefix;
            if (typeof input.prefix !== 'undefined') {
                breakPrefix = input.prefix;
            } else {
                breakPrefix = prefix;
            }
            return createPosition(breakPrefix, input);
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
        reference1: reference1 && ontologyTermRepr(reference1),
        reference2: reference2 && ontologyTermRepr(reference2),
        refSeq: refSeq !== undefined && refSeq !== null
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
        prefix,
    };
};

const jsonifyVariant = (variant: VariantNotation): { [key: string]: string } => {
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

const stringifyVariant = (variant: VariantNotation, newFusion = false): string => {
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
        type,
    } = variant;
    let { notationType } = variant;

    if (notationType === undefined) {
        const variantType = ontologyTermRepr(type);
        notationType = TYPES_TO_NOTATION[variantType] || variantType.replace(/\s+/, '-');
    }

    const isMultiRef = multiFeature || (reference2 && (reference1 !== reference2));

    if (isMultiRef) {
        if (!break2Repr) {
            throw new InputValidationError('Multi-feature notation requires break2Repr');
        }
        // new fusion nomenclature notation
        if (newFusion) {
            let insertedSequence = '';

            if (untemplatedSeq !== undefined && untemplatedSeq !== null) {
                insertedSequence = `${untemplatedSeq}::`;
            }

            if (noFeatures) {
                return `${break1Repr}::${insertedSequence}${break2Repr}`;
            }

            return `${reference1}:${break1Repr}::${insertedSequence}${reference2}:${break2Repr}`;
        }

        // multi-feature notation (incl. legacy fusion notation)
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
    const result: string[] = [];

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
                result.push(`${truncation}`);
            } else {
                result.push(`*${truncation}`);
            }
        }

        if (refSeq && ['dup', 'del', 'inv'].includes(notationType)) {
            result.push(refSeq);
        }
        if ((untemplatedSeq || untemplatedSeqSize) && ['ins', 'delins'].includes(notationType)) {
            result.push(`${untemplatedSeq || untemplatedSeqSize}`);
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
const parseMultiFeature = (string: string): {
    type: string,
    break1Start: AnyPosition,
    break1End?: AnyPosition,
    break2Start?: AnyPosition,
    break2End?: AnyPosition,
    untemplatedSeqSize?: number | null,
    untemplatedSeq?: string | null,
    prefix: Prefix | null,
} => {
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
    let break1Prefix,
        break2Prefix,
        break1Start,
        break1End,
        break2Start,
        break2End;

    try {
        break1Prefix = getPrefix(positions[0]);
        positions[0] = positions[0].slice(2);

        if (positions[0].includes('_')) {
            const splitPos = positions[0].indexOf('_');
            break1Start = parsePosition(break1Prefix, positions[0].slice(0, splitPos));
            break1End = parsePosition(break1Prefix, positions[0].slice(splitPos + 1));
        } else {
            break1Start = parsePosition(break1Prefix, positions[0]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string,
            parsed: {
                type: variantType,
                break1Start,
                break1End,
                break2Start,
                break2End,
                untemplatedSeqSize,
                untemplatedSeq,
            },
            subParserError: err,
            violatedAttr: 'break1',
        });
    }

    try {
        break2Prefix = getPrefix(positions[1]);
        positions[1] = positions[1].slice(2);

        if (positions[1].includes('_')) {
            const splitPos = positions[1].indexOf('_');
            break2Start = parsePosition(break2Prefix, positions[1].slice(0, splitPos));
            break2End = parsePosition(break2Prefix, positions[1].slice(splitPos + 1));
        } else {
            break2Start = parsePosition(break2Prefix, positions[1]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string,
            parsed: {
                type: variantType,
                break1Start,
                break1End,
                break2Start,
                break2End,
                untemplatedSeqSize,
                untemplatedSeq,
            },
            subParserError: err,
            violatedAttr: 'break2',
        });
    }

    // prefix
    let prefix;

    if (break1Prefix === break2Prefix) {
        // Since each fusion part have it's own prefix, a prefix at the variant
        // level is only given if they are the same
        prefix = break1Prefix;
    }

    return {
        type: variantType,
        break1Start,
        break1End,
        break2Start,
        break2End,
        untemplatedSeqSize,
        untemplatedSeq,
        prefix: prefix || null,
    };
};

/**
 * Parse one side of a fusion variant using the new nomenclature (KBDEV-974)
 *
 * @param {string} string is one of the fusion part (one side) to be parsed
 * @param {boolean} requireFeatures
 *
 * @returns {VariantNotation} the parsed content
 */
const parseFusionPart = (string, requireFeatures) => {
    // Come from a multi-feature variant
    const multiFeature = true;

    // Feature vs Variant strings
    const stringSplit = string.split(':');

    if (stringSplit.length > 2) {
        throw new ParsingError({
            message: 'Variant notation must contain a single colon',
            input: string,
            violatedAttr: 'punctuation',
        });
    } else if (stringSplit.length === 1) {
        if (!requireFeatures) {
            stringSplit.unshift('');
        } else {
            throw new ParsingError({
                message: 'Feature name not specified. Feature name is required',
                violatedAttr: 'reference1',
            });
        }
    }
    const [featureString, variantString] = stringSplit;

    // References
    let reference1 = '';

    if (featureString) {
        reference1 = featureString;
    }

    // Prefix
    const prefix = getPrefix(variantString);

    // Range of positions
    const positions = variantString.slice(prefix.length + 1).split('_');

    if (positions.length !== 2) {
        throw new ParsingError({
            message: 'Fusion notation must be a range of positions',
            input: string,
        });
    }

    // Returns a partial variant notation for that variant's part
    return {
        reference1,
        reference2: '',
        type: NOTATION_TO_TYPES.fusion,
        multiFeature,
        prefix,
        break1Start: parsePosition(prefix, positions[0]),
        break1End: parsePosition(prefix, positions[1]),
    };
};

/**
 * Parse a fusion variant using the new HGVS nomenclature (KBDEV-974)
 *
 * @param {string} string is a fusion variant using the new nomenclature
 * @param {boolean} requireFeatures, if set to false, allows string without feature
 *
 * @returns {VariantNotation} the parsed content
 */
const parseFusion = (string, requireFeatures = true) => {
    const parts = string.split('::');

    if (parts.length > 3) {
        throw new ParsingError({
            message: 'Fusion variant using new nomenclature must contain 1 or 2 double-colon',
            input: string,
            violatedAttr: 'punctuation',
        });
    }

    let untemplatedSeq,
        untemplatedSeqSize;

    // Special case with a sequence insertion between the 2 fusion parts
    if (parts.length === 3) {
        const [, insertion] = parts;

        // When implemented, sequence insertion need to be in RNA
        // if following HGVS standards restricting fusion to 'r' prefix
        if (!/^[ACGU]+$/.test(insertion.toUpperCase())) {
            throw new ParsingError({
                message: 'Insertion sequence of fusion variant should be given in ribonucleotides',
                input: string,
                violatedAttr: 'alphabet',
            });
        }
        untemplatedSeq = insertion.toUpperCase();
        untemplatedSeqSize = insertion.length;
    }

    // Standard 2-parts fusion - Parsing individual parts
    const t1 = parseFusionPart(parts[0], requireFeatures);
    const t2 = parseFusionPart(parts[parts.length-1], requireFeatures); // skip middle part if one

    // Prefix
    let prefix;

    if (t1.prefix === t2.prefix) {
        // Since each fusion part have it's own prefix, a prefix at the variant
        // level is only given if they are the same
        prefix = t1.prefix;
    }

    try {
        return createVariantNotation({
            ...t1,
            prefix: prefix || null,
            requireFeatures,
            reference2: t2.reference1,
            break2Start: t2.break1Start,
            break2End: t2.break1End,
            untemplatedSeq,
            untemplatedSeqSize,
        });
    } catch (err: any) {
        if (err.content) {
            err.content.parsed = {
                string,
                reference1: t1.reference1,
                reference2: t2.reference1,
            };
        }
        throw err;
    }
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
    // New fusion nomenclature handling (KBDEV-974)
    if (string.split('::').length > 1) {
        return parseFusion(string, requireFeatures);
    }
    // Feature vs Variant strings
    const split = string.split(':');

    if (split.length > 2) {
        throw new ParsingError({ message: 'Apart from new fusion nomenclature, variant notation must contain a single colon', input: string, violatedAttr: 'punctuation' });
    } else if (split.length === 1) {
        if (!requireFeatures) {
            split.unshift(null);
        } else {
            throw new ParsingError({ message: 'Feature name not specified. Feature name is required', violatedAttr: 'reference1' });
        }
    }
    let reference1,
        reference2;
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
            [reference1, reference2] = features;
        }

        try {
            return createVariantNotation({
                ...parseMultiFeature(variantString),
                requireFeatures,
                reference1,
                reference2,
            });
        } catch (err: any) {
            if (err.content) {
                err.content.parsed = { variantString, reference1, reference2 };
            }
            throw err;
        }
    } else {
        // continuous notation
        if (featureString) {
            reference1 = featureString;
        }

        try {
            return createVariantNotation({
                ...parseContinuous(variantString),
                requireFeatures,
                reference1,
                reference2,
            });
        } catch (err: any) {
            if (err.content) {
                err.content.parsed = { variantString, reference1, reference2 };
            }
            throw err;
        }
    }
};

export {
    parseVariant, jsonifyVariant, stringifyVariant, stripParentheses, createVariantNotation,
};
