const { ParsingError, InputValidationError } = require('./error');
const _position = require('./position');
const {
    AA_CODES,
    AA_PATTERN,
    NOTATION_TO_TYPES,
    NONSENSE,
    TRUNCATING_FS,
} = require('./constants');


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
 * Covert some sequence of 3-letter amino acids to single letter version
 *
 * @example
 * convert3to1('ArgLysLeu')
 * 'RKL'
 */
const convert3to1 = (notation) => {
    if (notation === '=') {
        // = does not have a 3-letter AA equivalent
        return '=';
    }
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
            case _position.CytobandPosition.prefix: {
                pattern = _position.CYTOBAND_PATT;
                break;
            }

            case _position.RnaPosition.prefix:
            case _position.NonCdsPosition.prefix:

            case _position.CdsPosition.prefix: { // eslint-disable-line no-fallthrough
                pattern = _position.CDS_PATT;
                break;
            }

            case _position.ProteinPosition.prefix: {
                pattern = _position.PROTEIN_PATT;
                break;
            }

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
    let break1,
        notationType; // type parsed

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
        notationType = 'delins';
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
        [, notationType, altSeq] = match;

        if (parseInt(altSeq, 10)) {
            if (notationType === 'ins' || notationType === 'dup') {
                result.untemplatedSeqSize = parseInt(altSeq, 10);
            }
        } else if (altSeq && altSeq !== '?') {
            if (notationType === 'dup') {
                result.untemplatedSeq = altSeq;
                result.refSeq = altSeq;
            } else if (notationType === 'ins') {
                result.untemplatedSeq = altSeq;
            } else {
                result.refSeq = altSeq;
            }
        }
    } else if (match = new RegExp(`^(${AA_PATTERN}|=)$`, 'i').exec(tail) || tail.length === 0) {
        if (prefix !== _position.ProteinPosition.prefix) {
            throw new ParsingError({
                message: 'only protein notation does not use ">" for a substitution',
                violatedAttr: 'break1',
            });
        }
        notationType = '>';

        if (tail.length > 0 && tail !== '?') {
            result.untemplatedSeq = tail;
        }
    } else if (match = /^([A-Z?])>([A-Z?](\^[A-Z?])*)$/i.exec(tail)) {
        if (prefix === _position.ProteinPosition.prefix) {
            throw new ParsingError({
                message: 'protein notation does not use ">" for a substitution',
                violatedAttr: 'type',
            });
        } else if (prefix === _position.ExonicPosition.prefix) {
            throw new ParsingError({
                message: 'Cannot define substitutions at the exon coordinate level',
                violatedAttr: 'type',
            });
        }
        notationType = '>';
        [, result.refSeq, result.untemplatedSeq] = match;
    } else if (match = new RegExp(`^(${AA_PATTERN})?(fs|ext)((\\*|-|Ter)(\\d+|\\?|\\w)?)?$`, 'i').exec(tail)) {
        const [, alt, type,, stop, truncation] = match;

        if (prefix !== _position.ProteinPosition.prefix) {
            throw new ParsingError({
                message: 'only protein notation can notate frameshift variants',
                violatedAttr: 'type',
            });
        }
        notationType = type.toLowerCase();

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
        notationType = 'spl';
    } else {
        notationType = tail;
    }
    if (!NOTATION_TO_TYPES[notationType]) {
        throw new ParsingError({
            message: `unsupported notation type: '${notationType}'`,
            violatedAttr: 'type',
        });
    }
    result.type = NOTATION_TO_TYPES[notationType];

    if (result.untemplatedSeq && result.untemplatedSeqSize === undefined && result.untemplatedSeq !== '') {
        if (result.untemplatedSeq.includes('^')) {
            throw new ParsingError({
                message: `unsupported alternate sequence notation: ${result.untemplatedSeq}`,
                violatedAttr: 'untemplatedSeq',
            });
        }
    }
    // check for innapropriate types
    if (prefix === _position.CytobandPosition.prefix) {
        if (result.refSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements (refSeq) at the cytoband level',
                violatedAttr: 'refSeq',
            });
        } else if (result.untemplatedSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements (untemplatedSeq) at the cytoband level',
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

    if (prefix === _position.ProteinPosition.prefix) {
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

    if (result.truncation !== undefined) {
        if (![
            NOTATION_TO_TYPES.fs, NOTATION_TO_TYPES.ext, NOTATION_TO_TYPES.spl, TRUNCATING_FS,
        ].includes(result.type)) {
            throw new InputValidationError({
                message: `truncation cannot be specified with this event type (${result.type})`,
                violatedAttr: 'type',
            });
        }
        if (result.truncation !== null) {
            if (Number.isNaN(Number(result.truncation))) {
                throw new InputValidationError({
                    message: 'truncation must be a number',
                    violatedAttr: 'truncation',
                });
            }
            result.truncation = Number(result.truncation);
        }
    }

    if (result.untemplatedSeqSize !== undefined) {
        if (Number.isNaN(Number(result.untemplatedSeqSize))) {
            throw new InputValidationError({
                message: `untemplatedSeqSize must be a number not ${result.untemplatedSeqSize}`,
                violatedAttr: 'untemplatedSeqSize',
            });
        }
    }
    // refine the type name
    if (prefix === _position.ProteinPosition.prefix) {
        if (result.type === NOTATION_TO_TYPES['>']) {
            if (result.truncation || result.untemplatedSeq === '*') {
                result.type = NONSENSE;
            } else if (result.untemplatedSeq !== '=') {
                result.type = NOTATION_TO_TYPES.mis;
            }
        } else if (result.type === NOTATION_TO_TYPES.fs && result.truncation) {
            result.type = TRUNCATING_FS;
        }
    }
    return { ...result, notationType };
};

module.exports = { parseContinuous, getPrefix };
