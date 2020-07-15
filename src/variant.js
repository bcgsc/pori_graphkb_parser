

/** @module app/variant */
const { ParsingError, InputValidationError } = require('./error');
const _position = require('./position');
const {
    AA_CODES,
    AA_PATTERN,
    NOTATION_TO_TYPES,
    TYPES_TO_NOTATION,
} = require('./constants');


const ontologyTermRepr = (term) => {
    if (term) {
        return term.displayName || term.sourceId || term.name || term;
    }
    return term;
};

/**
 * Covert some sequence of 3-letter amino acids to single letter version
 *
 * @example
 * convert3to1('ArgLysLeu')
 * 'RKL'
 */
const convert3to1 = (notation) => {
    if (notation.length % 3 !== 0) {
        throw new ParsingError(`Cannot convert to single letter AA notation. The input (${notation}) is not in 3-letter form`);
    }
    const result = [];

    for (let i = 0; i < notation.length; i += 3) {
        const code = notation.slice(i, i + 3).toLowerCase();
        result.push(AA_CODES[code]);
    }
    return result.join('');
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
        } = opt;
        this.noFeatures = Boolean(
            !requireFeatures
            && !reference1
            && !reference2,
        );
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

        if (truncation !== undefined) {
            if (![NOTATION_TO_TYPES.fs, NOTATION_TO_TYPES.ext, NOTATION_TO_TYPES.spl].includes(this.type)) {
                throw new InputValidationError({
                    message: `truncation cannot be specified with this event type (${this.type})`,
                    violatedAttr: 'type',
                });
            }
            if (truncation !== null) {
                if (Number.isNaN(Number(truncation))) {
                    throw new InputValidationError({
                        message: 'truncation must be a number',
                        violatedAttr: 'truncation',
                    });
                }
                this.truncation = Number(truncation);
            }
        }

        // default to the same length as the input seq size if not otherwise specified
        if (untemplatedSeqSize !== undefined) {
            this.untemplatedSeqSize = untemplatedSeqSize;

            if (Number.isNaN(Number(this.untemplatedSeqSize))) {
                throw new InputValidationError({
                    message: `untemplatedSeqSize must be a number not ${this.untemplatedSeqSize}`,
                    violatedAttr: 'untemplatedSeqSize',
                });
            }
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
        let defaultPosClass;

        if (prefix) {
            this.prefix = prefix;

            if (this.prefix && _position.PREFIX_CLASS[this.prefix] === undefined) {
                throw new InputValidationError({
                    message: `unrecognized prefix: ${this.prefix}`,
                    violatedAttr: 'prefix',
                });
            }
            defaultPosClass = _position[_position.PREFIX_CLASS[this.prefix]];
        }
        this.break1Start = opt.break1Start;

        for (const breakAttr of ['break1Start', 'break1End', 'break2Start', 'break2End']) {
            if (opt[breakAttr] && !(opt[breakAttr] instanceof _position.Position)) {
                let PosCls = defaultPosClass;

                if (opt[breakAttr]['@class']) {
                    PosCls = _position[opt[breakAttr]['@class']];
                } else if (opt[breakAttr].prefix) {
                    PosCls = _position[_position.PREFIX_CLASS[opt[breakAttr].prefix]];
                }
                if (!PosCls) {
                    throw new InputValidationError({
                        message: 'Could not determine the type of position',
                        violatedAttr: breakAttr,
                    });
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

        this.break1Repr = _position.breakRepr(this.break1Start.prefix, this.break1Start, this.break1End, this.multiFeature);

        if (this.break2Start) {
            if ([
                NOTATION_TO_TYPES['>'],
                NOTATION_TO_TYPES.ext,
                NOTATION_TO_TYPES.fs,
                NOTATION_TO_TYPES.spl,
            ].includes(this.type)) {
                throw new ParsingError({
                    message: `${this.type} variants cannot be a range`,
                    violatedAttr: 'break2',
                });
            }
            this.break2Repr = _position.breakRepr(this.break2Start.prefix, this.break2Start, this.break2End, this.multiFeature);
        }

        if (this.type === NOTATION_TO_TYPES.ins) {
            if (!this.break2Start && this.break1Start.prefix !== 'e') {
                throw new InputValidationError({
                    message: 'Insertion events must be specified with a range',
                    violatedAttr: 'type',
                });
            }
        }
    }

    toJSON() {
        const json = {};
        const IGNORE = ['prefix', 'multiFeature', 'noFeatures'];

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
        let type = variant.type.name || variant.type;

        if (NOTATION_TO_TYPES[type] && !TYPES_TO_NOTATION[type]) {
            type = NOTATION_TO_TYPES[type];
        }

        let notationType = TYPES_TO_NOTATION[type];

        if (!notationType) {
            notationType = type.replace(/\s+/, '-'); // default to type without whitespace
        }

        if (multiFeature || (reference2 && (reference1 !== reference2))) {
            // multi-feature notation
            let result = noFeatures || noFeatures
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
        if (type === NOTATION_TO_TYPES.ext
                || type === NOTATION_TO_TYPES.fs
                || (type === NOTATION_TO_TYPES['>'] && break1Repr.startsWith('p.'))
        ) {
            if (untemplatedSeq) {
                result.push(untemplatedSeq);
            }
        }
        if (type !== NOTATION_TO_TYPES['>']) {
            if (type === NOTATION_TO_TYPES.delins) {
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

            if (refSeq
                && [NOTATION_TO_TYPES.dup, NOTATION_TO_TYPES.del, NOTATION_TO_TYPES.inv].includes(type)
            ) {
                result.push(refSeq);
            }
            if ((untemplatedSeq || untemplatedSeqSize)
                    && [NOTATION_TO_TYPES.ins, NOTATION_TO_TYPES.delins].includes(type)
            ) {
                result.push(untemplatedSeq || untemplatedSeqSize);
            }
        } else if (!break1Repr.startsWith('p.')) {
            result.push(`${refSeq || '?'}${notationType}${untemplatedSeq || '?'}`);
        }
        return result.join('');
    }
}


/**
 * Given a string, check that it contains a valid prefix
 *
 * @param {string} string
 *
 * @returns {string} the prefix
 *
 * @example
 * > getPrefix('p.1234')
 * 'p'
 */
const getPrefix = (string) => {
    const [prefix] = string;
    const expectedPrefix = Object.keys(_position.PREFIX_CLASS);

    if (!expectedPrefix.includes(prefix)) {
        throw new ParsingError({
            message: `'${prefix}' is not an accepted prefix`,
            expected: expectedPrefix,
            input: string,
            violatedAttr: 'prefix',
        });
    }
    if (string.length < 2 || string[1] !== '.') {
        throw new ParsingError({
            message: 'Missing \'.\' separator after prefix',
            input: string,
            violatedAttr: 'punctuation',
        });
    }
    return prefix;
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

    if (variantString.includes(',') || (featureString && (featureString.startsWith('(') || featureString.endsWith(')') || featureString.includes(',')))) {
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
            err.content.parsed = Object.assign({ variantString }, result);
            throw err;
        }
    }
    return new VariantNotation({ ...result, requireFeatures });
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
 * Given an input string, assume it starts with a position range.
 * Extract and return the position range
 * @param {string} string
 */
const extractPositions = (prefix, string) => {
    const result = {};

    if (string.startsWith('(')) {
        // expect the first breakpoint to be a range of two positions
        if (string.indexOf(')') < 0) {
            throw new ParsingError('Expected a range of positions. Missing the closing parenthesis');
        }
        if (string.indexOf('_') < 0) {
            throw new ParsingError('Positions within a range must be separated by an underscore. Missing underscore');
        }
        result.input = string.slice(0, string.indexOf(')') + 1);
        result.start = string.slice(1, string.indexOf('_'));
        result.end = string.slice(string.indexOf('_') + 1, string.indexOf(')'));
    } else {
        let pattern;

        switch (prefix) {
            case 'y': { pattern = _position.CYTOBAND_PATT; break; }

            case 'c': { pattern = _position.CDS_PATT; break; }

            case 'p': { pattern = _position.PROTEIN_PATT; break; }

            default: { pattern = /\d+/; }
        }
        const match = new RegExp(`^(${pattern.source})`, 'i').exec(string);

        if (!match) {
            throw new ParsingError('Failed to parse the initial position');
        }
        [result.input] = match;
        result.start = result.input.slice(0);
    }
    result.start = _position.parsePosition(prefix, result.start);

    if (result.end) {
        result.end = _position.parsePosition(prefix, result.end);
    }
    return result;
};


/**
 * Given a string representing a continuous variant, parses and checks the content
 *
 * @param {string} string the variant to be parsed
 *
 * @returns {object} the parsed content
 *
 * @example
 * > parseContinuous('p.G12D')
 * {type: 'substitution', prefix: 'p', break1Start: {'@class': 'ProteinPosition', pos: 12, refAA: 'G'}, untemplatedSeq: 'D'}
 */
const parseContinuous = (inputString) => {
    let string = inputString.slice(0);

    if (string.length < 3) {
        throw new ParsingError(`Too short. Must be a minimum of three characters: ${string}`);
    }

    const prefix = getPrefix(string);
    const result = { prefix };
    string = string.slice(prefix.length + 1);
    // get the first position
    let break1;

    try {
        break1 = extractPositions(prefix, string);
    } catch (err) {
        err.content.violatedAttr = 'break1';
        throw err;
    }
    string = string.slice(break1.input.length);
    result.break1Start = break1.start;

    if (break1.end) {
        result.break1End = break1.end;
    }
    let break2;

    if (string.startsWith('_')) {
        // expect a range. Extract more positions
        string = string.slice(1);

        try {
            break2 = extractPositions(prefix, string);
        } catch (err) {
            err.content.violatedAttr = 'break2';
            throw err;
        }
        result.break2Start = break2.start;

        if (break2.end) {
            result.break2End = break2.end;
        }
        string = string.slice(break2.input.length);
    }

    const tail = string;
    let match;

    if (match = /^del([A-Z?*]+)?ins([A-Z?*]+|\d+)?$/i.exec(tail)) { // indel
        result.type = 'delins';
        const [, refSeq, altSeq] = match;

        if (refSeq) {
            result.refSeq = refSeq;
        }
        if (parseInt(altSeq, 10)) {
            result.untemplatedSeqSize = parseInt(altSeq, 10);
        } else if (altSeq && altSeq !== '?') {
            result.untemplatedSeq = altSeq;
        }
    } else if (match = /^(del|inv|ins|dup)([A-Z?*]+|\d+)?$/i.exec(tail)) { // deletion
        let altSeq;
        [, result.type, altSeq] = match;

        if (parseInt(altSeq, 10)) {
            if (result.type === 'ins' || result.type === 'dup') {
                result.untemplatedSeqSize = parseInt(altSeq, 10);
            }
        } else if (altSeq && altSeq !== '?') {
            if (result.type === 'dup') {
                result.untemplatedSeq = altSeq;
                result.refSeq = altSeq;
            } else if (result.type === 'ins') {
                result.untemplatedSeq = altSeq;
            } else {
                result.refSeq = altSeq;
            }
        }
    } else if (match = new RegExp(`^(${AA_PATTERN})(\\^(${AA_PATTERN}))*$`, 'i').exec(tail) || tail.length === 0) {
        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation does not use ">" for a substitution',
                violatedAttr: 'break1',
            });
        }
        result.type = '>';

        if (tail.length > 0 && tail !== '?') {
            result.untemplatedSeq = tail;
        }
    } else if (match = /^([A-Z?])>([A-Z?](\^[A-Z?])*)$/i.exec(tail)) {
        if (prefix === 'p') {
            throw new ParsingError({
                message: 'protein notation does not use ">" for a substitution',
                violatedAttr: 'type',
            });
        } else if (prefix === 'e') {
            throw new ParsingError({
                message: 'Cannot define substitutions at the exon coordinate level',
                violatedAttr: 'type',
            });
        }
        result.type = '>';
        [, result.refSeq, result.untemplatedSeq] = match;
    } else if (match = new RegExp(`^(${AA_PATTERN})?(fs|ext)((\\*|-|Ter)(\\d+|\\?)?)?$`, 'i').exec(tail)) {
        const [, alt, type,, stop, truncation] = match;

        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation can notate frameshift variants',
                violatedAttr: 'type',
            });
        }
        result.type = type.toLowerCase();

        if (alt !== undefined && alt !== '?') {
            result.untemplatedSeq = alt;
        }
        if (truncation === '?') {
            result.truncation = null;
        } else if (truncation !== undefined) {
            result.truncation = parseInt(truncation, 10);

            if (stop === '-') {
                result.truncation *= -1;
            }

            if (alt === '*' && result.truncation !== 1) {
                throw new ParsingError({
                    message: 'invalid framshift specifies a non-immeadiate truncation which conflicts with the terminating alt seqeuence',
                    violatedAttr: 'truncation',
                });
            }
        } else if (alt === '*') {
            result.truncation = 1;
        } else if (stop) {
            // specified trunction at some unknown position
            result.truncation = null;
        }
        if (result.break2Start !== undefined) {
            throw new ParsingError({
                message: 'frameshifts cannot span a range',
                violatedAttr: 'break2',
            });
        }
    } else if (tail.toLowerCase() === 'spl') {
        result.type = 'spl';
    } else {
        result.type = tail;
    }
    if (!NOTATION_TO_TYPES[result.type]) {
        throw new ParsingError({
            message: `unsupported event type: '${result.type}'`,
            violatedAttr: 'type',
        });
    }
    result.type = NOTATION_TO_TYPES[result.type];

    if (result.untemplatedSeq && result.untemplatedSeqSize === undefined && result.untemplatedSeq !== '') {
        const altSeqs = result.untemplatedSeq.split('^');
        result.untemplatedSeqSize = altSeqs[0].length;

        for (const alt of altSeqs) {
            if (alt.length !== result.untemplatedSeqSize) {
                delete result.untemplatedSeqSize;
                break;
            }
        }
    }
    // check for innapropriate types
    if (prefix === 'y') {
        if (result.refSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements at the cytoband level',
                violatedAttr: 'refSeq',
            });
        } else if (result.untemplatedSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements at the cytoband level',
                violatedAttr: 'untemplatedSeq',
            });
        } else if (![
            NOTATION_TO_TYPES.dup,
            NOTATION_TO_TYPES.del,
            NOTATION_TO_TYPES.copygain,
            NOTATION_TO_TYPES.copyloss,
            NOTATION_TO_TYPES.inv,
        ].includes(result.type)) {
            throw new ParsingError({
                message: `Invalid type (${result.type}) for cytoband level event notation`,
                parsed: result,
                violatedAttr: 'type',
            });
        }
    }

    if (prefix === 'p') {
        // special case refSeq protein substitutions
        if (!result.break1End && !result.break2Start && !result.break2End && result.break1Start.refAA) {
            result.refSeq = result.break1Start.longRefAA || result.break1Start.refAA;
        }
        // covert to 1AA code? check if any of the positions were converted
        const convert = [result.break1Start, result.break1End, result.break2Start, result.break2End].some(x => x && x.longRefAA);

        if (convert) {
            if (result.untemplatedSeq) {
                result.untemplatedSeq = convert3to1(result.untemplatedSeq);
            }
            if (result.refSeq) {
                result.refSeq = convert3to1(result.refSeq);
            }
        }
    }
    return result;
};


module.exports = {
    parse, VariantNotation, stripParentheses,
};
