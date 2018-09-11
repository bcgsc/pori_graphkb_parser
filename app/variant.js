

/** @module app/variant */
const {ParsingError} = require('./error');
const {
    parsePosition, breakRepr, CDS_PATT, PROTEIN_PATT, CYTOBAND_PATT
} = require('./position');

const EVENT_SUBTYPE = {
    INS: 'insertion',
    DEL: 'deletion',
    SUB: 'substitution',
    INV: 'inversion',
    INDEL: 'indel',
    GAIN: 'copy gain',
    LOSS: 'copy loss',
    TRANS: 'translocation',
    ITRANS: 'inverted translocation',
    EXT: 'extension',
    FS: 'frameshift',
    FUSION: 'fusion',
    DUP: 'duplication',
    ME: 'methylation',
    AC: 'acetylation',
    UB: 'ubiquitination',
    SPL: 'splice-site',
    MUT: 'mutation'
};


const NOTATION_TO_SUBTYPE = {};
const SUBTYPE_TO_NOTATION = {};
for (const [notation, subtype] of [
    ['fs', EVENT_SUBTYPE.FS],
    ['>', EVENT_SUBTYPE.SUB],
    ['delins', EVENT_SUBTYPE.INDEL],
    ['inv', EVENT_SUBTYPE.INV],
    ['ext', EVENT_SUBTYPE.EXT],
    ['del', EVENT_SUBTYPE.DEL],
    ['dup', EVENT_SUBTYPE.DUP],
    ['ins', EVENT_SUBTYPE.INS],
    ['copygain', EVENT_SUBTYPE.GAIN],
    ['copyloss', EVENT_SUBTYPE.LOSS],
    ['trans', EVENT_SUBTYPE.TRANS],
    ['itrans', EVENT_SUBTYPE.ITRANS],
    ['spl', EVENT_SUBTYPE.SPL],
    ['fusion', EVENT_SUBTYPE.FUSION],
    ['mut', EVENT_SUBTYPE.MUT]
]) {
    NOTATION_TO_SUBTYPE[notation] = subtype;
    SUBTYPE_TO_NOTATION[subtype] = notation;
}


class VariantNotation {
    /**
     * @param {Object} opt options
     */
    constructor(opt) {
        if (opt.untemplatedSeq !== undefined) {
            this.untemplatedSeq = opt.untemplatedSeq;
        }
        if (opt.untemplatedSeqSize !== undefined) {
            this.untemplatedSeqSize = opt.untemplatedSeqSize;
        } else if (this.untemplatedSeq !== undefined && this.untemplatedSeq !== null) {
            this.untemplatedSeqSize = this.untemplatedSeq.length;
        }
        this.type = opt.type;
        this.break1Start = opt.break1Start;
        this.reference1 = opt.reference1;
        this.multiFeature = opt.multiFeature || opt.reference2 || false;
        for (let optAttr of [
            'break1End',
            'break2Start',
            'break2End',
            'reference2',
            'truncation',
            'refSeq',
            'prefix'
        ]) {
            if (opt[optAttr] !== undefined) {
                this[optAttr] = opt[optAttr];
            }
        }
        this.break1Repr = breakRepr(this.prefix, this.break1Start, this.break1End, this.multiFeature);
        if (this.break2Start) {
            this.break2Repr = breakRepr(this.prefix, this.break2Start, this.break2End, this.multiFeature);
        }
    }
    toJSON() {
        const json = {}
        for (let [attr, value] of Object.entries(this)) {
            if (value !== undefined && attr !== 'prefix') {
                json[attr] = value;
            }
        }
        return json;
    }
    toString() {
        if (this.multiFeature) {
            // multi-feature notation
            let result = `(${this.reference1},${this.reference2}):${
                SUBTYPE_TO_NOTATION[this.type]
            }(${this.break1Repr},${this.break2Repr})`;
            if (this.untemplatedSeq !== undefined) {
                result = `${result}${this.untemplatedSeq}`;
            } else if (this.untemplatedSeqSize !== undefined) {
                result = `${result}${this.untemplatedSeqSize}`;
            }
            return result;
        } else {
            // continuous notation
            let result = [`${this.reference1}:${this.prefix}.`];
            let pos = this.break1Repr.slice(2);
            if (this.break2Repr) {
                pos = `${pos}_${this.break2Repr.slice(2)}`;
            }
            result.push(pos)
            if (this.type === EVENT_SUBTYPE.EXT
                || this.type === EVENT_SUBTYPE.FS
                || this.type === EVENT_SUBTYPE.SUB && this.prefix === 'p'
            ) {
                if (this.untemplatedSeq !== undefined) {
                    result.push(this.untemplatedSeq);
                }
            }
            if (this.type !== EVENT_SUBTYPE.SUB) {
                if (this.type === EVENT_SUBTYPE.INDEL && this.refSeq !== undefined) {
                    result.push(`del${this.refSeq}ins`);
                } else {
                    result.push(SUBTYPE_TO_NOTATION[this.type]);
                }
                if (this.truncation && this.truncation !== 1) {
                    result.push(`*${this.truncation}`);
                }

                if (this.refSeq
                    && [EVENT_SUBTYPE.DUP, EVENT_SUBTYPE.DEL, EVENT_SUBTYPE.INV].includes(this.type)
                ) {
                    result.push(this.refSeq);
                }
                if ((this.untemplatedSeq || this.untemplatedSeqSize)
                    && [EVENT_SUBTYPE.INS, EVENT_SUBTYPE.INDEL].includes(this.type)
                ) {
                    result.push(this.untemplatedSeq || this.untemplatedSeqSize);
                }
            } else if (this.prefix !== 'p') {
                result.push(`${this.refSeq}${SUBTYPE_TO_NOTATION[this.type]}${this.untemplatedSeq}`);
            }
            return result.join('');
        }
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
    const expectedPrefix = ['g', 'c', 'e', 'y', 'p', 'i'];
    if (!expectedPrefix.includes(prefix)) {
        throw new ParsingError({
            message: `'${prefix}' is not an accepted prefix`,
            expected: expectedPrefix,
            input: string,
            violatedAttr: 'prefix'
        });
    }
    if (string.length < 2 || string[1] !== '.') {
        throw new ParsingError({
            message: 'Missing \'.\' separator after prefix',
            input: string,
            violatedAttr: 'punctuation'
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
const parse = (string) => {
    if (!string || string.length < 4) {
        throw new ParsingError({
            message: 'Too short. Must be a minimum of four characters',
            input: string
        });
    }
    let split = string.split(':');
    if (split.length > 2) {
        throw new ParsingError({message: 'Variant notation must contain a single colon', input: string, violatedAttr: 'punctuation'});
    } else if (split.length === 1) {
        throw new ParsingError({message: 'Feature name not specified. Feature name is required', violatedAttr: 'reference1'})
    }
    let result = {};
    const [featureString, variantString] = split;
    if (variantString.includes(',') || (featureString && (featureString.startsWith('(') || featureString.endsWith(')') || featureString.includes(',')))) {
        // multi-feature notation
        if (featureString) {
            if (featureString && !featureString.includes(',')) {
                throw new ParsingError({
                    message: 'Multi-feature notation must contain two reference features separated by a comma',
                    parsed: {featureString, variantString},
                    input: string,
                    violatedAttr: 'reference2'
                });
            } else if (!featureString.startsWith('(')) {
                throw new ParsingError({
                    message: 'Missing opening parentheses surrounding the reference features',
                    parsed: {featureString, variantString},
                    input: string,
                    violatedAttr: 'punctuation'
                });
            } else if (!featureString.endsWith(')')) {
                throw new ParsingError({
                    message: 'Missing closing parentheses surrounding the reference features',
                    parsed: {featureString, variantString},
                    input: string,
                    violatedAttr: 'punctuation'
                });
            }
            const features = featureString.slice(1, featureString.length - 1).split(',');
            if (features.length > 2) {
                throw new ParsingError({
                    message: 'May only specify two features. Found more than a single comma',
                    parsed: {featureString, variantString},
                    input: string
                });
            }
            [result.reference1, result.reference2] = features;
        }
        try {
            const variant = parseMultiFeature(variantString);
            result = Object.assign(result, variant);
        } catch (err) {
            err.content.parsed = Object.assign({variantString}, result);
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
            err.content.parsed = Object.assign({variantString}, result);
            throw err;
        }
    }
    return new VariantNotation(result);
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
    const parsed = {multiFeature: true};

    if (string.indexOf('(') < 0) {
        throw new ParsingError({message: 'Missing opening parentheses', input: string, violatedAttr: 'punctuation'});
    }
    parsed.type = string.slice(0, string.indexOf('('));
    if (parsed.type.length === 0) {
        throw new ParsingError({
            message: 'Variant type was not specified. It is expected to immediately follow the coordinate prefix',
            parsed,
            input: string,
            violatedAttr: 'type'
        });
    }
    if (!NOTATION_TO_SUBTYPE[parsed.type]) {
        throw new ParsingError({message: 'Variant type not recognized', parsed, input: string, violatedAttr: 'type'});
    }
    if (!['fusion', 'trans', 'itrans'].includes(parsed.type)) {
        throw new ParsingError({
            message: `Continuous notation is preferred over multi-feature notation for ${parsed.type} variant types`,
            parsed,
            input: string
        });
    }
    parsed.type = NOTATION_TO_SUBTYPE[parsed.type];
    if (string.indexOf(')') < 0) {
        throw new ParsingError({message: 'Missing closing parentheses', parsed, input: string, violatedAttr: 'punctuation'});
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
            violatedAttr: 'punctuation'
        });
    } else if (positions.length < 2) {
        throw new ParsingError({
            message: 'Missing comma separator between breakpoints/ranges',
            parsed,
            input: string,
            violatedAttr: 'punctuation'
        });
    }
    let prefix;
    try {
        prefix = getPrefix(positions[0]);
        positions[0] = positions[0].slice(2);
        if (positions[0].includes('_')) {
            const splitPos = positions[0].indexOf('_');
            parsed.break1Start = parsePosition(prefix, positions[0].slice(0, splitPos));
            parsed.break1End = parsePosition(prefix, positions[0].slice(splitPos + 1));
        } else {
            parsed.break1Start = parsePosition(prefix, positions[0]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string,
            parsed,
            subParserError: err,
            violatedAttr: 'break1'
        });
    }
    try {
        prefix = getPrefix(positions[1]);
        positions[1] = positions[1].slice(2);
        if (positions[1].includes('_')) {
            const splitPos = positions[1].indexOf('_');
            parsed.break2Start = parsePosition(prefix, positions[1].slice(0, splitPos));
            parsed.break2End = parsePosition(prefix, positions[1].slice(splitPos + 1));
        } else {
            parsed.break2Start = parsePosition(prefix, positions[1]);
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string,
            parsed,
            subParserError: err,
            violatedAttr: 'break2'
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
            case 'y': { pattern = CYTOBAND_PATT; break; }
            case 'c': { pattern = CDS_PATT; break; }
            case 'p': { pattern = PROTEIN_PATT; break; }
            default: { pattern = /\d+/; }
        }
        const match = new RegExp(`^(${pattern.source})`).exec(string);
        if (!match) {
            throw new ParsingError('Failed to parse the initial position');
        }
        [result.input] = match;
        result.start = result.input.slice(0);
    }
    result.start = parsePosition(prefix, result.start);
    if (result.end) {
        result.end = parsePosition(prefix, result.end);
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
    const result = {prefix};
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
        if (match[1]) {
            result.refSeq = match[1];
        }
        if (parseInt(match[2], 10)) {
            result.untemplatedSeqSize = parseInt(match[2], 10);
        } else if (match[2] && match[2] !== '?') {
            result.untemplatedSeq = match[2];
        }
    } else if (match = /^(del|inv|ins|dup)([A-Z?*]+|\d+)?$/i.exec(tail)) { // deletion
        result.type = match[1];
        if (parseInt(match[2], 10)) {
            if (result.type === 'ins' || result.type === 'dup') {
                result.untemplatedSeqSize = parseInt(match[2], 10);
            }
        } else if (match[2] && match[2] !== '?') {
            if (result.type === 'dup') {
                result.untemplatedSeq = match[2];
                result.refSeq = match[2];
            } else if (result.type === 'ins') {
                result.untemplatedSeq = match[2];
            } else {
                result.refSeq = match[2];
            }
        }
    } else if (match = /^[A-Z?*](\^[A-Z?*])*$/i.exec(tail) || tail.length === 0) {
        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation does not use ">" for a substitution',
                violatedAttr: 'break1'
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
                violatedAttr: 'type'
            });
        } else if (prefix === 'e') {
            throw new ParsingError({
                message: 'Cannot defined substitutions at the exon coordinate level',
                violatedAttr: 'type'
            });
        }
        result.type = '>';
        [, result.refSeq, result.untemplatedSeq] = match;
    } else if (match = /^([A-Z?*])?fs((\*)(\d+)?)?$/i.exec(tail)) {
        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation can notate frameshift variants',
                violatedAttr: 'type'
            });
        }
        result.type = 'fs';
        if (match[1] !== undefined && match[1] !== '?') {
            result.untemplatedSeq = match[1];
        }
        if (match[3] !== undefined) {
            if (match[4] === undefined) {
                result.truncation = match[1] === '*'
                    ? 1
                    : null;
            } else {
                result.truncation = parseInt(match[4], 10);
                if (match[1] === '*' && result.truncation !== 1) {
                    throw new ParsingError({
                        message: 'invalid framshift specifies a non-immeadiate truncation which conflicts with the terminating alt seqeuence',
                        violatedAttr: 'truncation'
                    });
                }
            }
        } else if (match[1] === '*') {
            result.truncation = 1;
        }
        if (result.break2Start !== undefined) {
            throw new ParsingError({
                message: 'frameshifts cannot span a range',
                violatedAttr: 'break2'
            });
        }
    } else if (tail.toLowerCase() === 'spl') {
        result.type = 'spl';
    } else {
        result.type = tail;
    }
    if (!NOTATION_TO_SUBTYPE[result.type]) {
        throw new ParsingError({
            message: `unsupported event type: '${result.type}'`,
            violatedAttr: 'type'
        });
    }
    result.type = NOTATION_TO_SUBTYPE[result.type];
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
                violatedAttr: 'refSeq'
            });
        } else if (result.untemplatedSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements at the cytoband level',
                violatedAttr: 'untemplatedSeq'
            });
        } else if (![
            EVENT_SUBTYPE.DUP,
            EVENT_SUBTYPE.DEL,
            EVENT_SUBTYPE.GAIN,
            EVENT_SUBTYPE.LOSS,
            EVENT_SUBTYPE.INV
        ].includes(result.type)) {
            throw new ParsingError({
                message: 'Invalid type for cytoband level event notation',
                parsed: result,
                violatedAttr: 'type'
            });
        }
    }
    // special case refSeq protein substitutions
    if (prefix === 'p' && !result.break1End && !result.break2Start && !result.break2End && result.break1Start.refAA) {
        result.refSeq = result.break1Start.refAA;
    }
    return result;
};


module.exports = {
    parse, NOTATION_TO_SUBTYPE, EVENT_SUBTYPE, VariantNotation
};
