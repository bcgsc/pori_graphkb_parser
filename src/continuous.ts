import { ParsingError, InputValidationError }from './error';
import { PREFIX_CLASS, PATTERNS, parsePosition, AnyPosition } from './position';
import {
    AA_CODES,
    AA_PATTERN,
    NOTATION_TO_TYPES,
    NONSENSE,
    TRUNCATING_FS,
    Prefix,
} from './constants';


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
const getPrefix = (string: string): Prefix => {
    const [prefix] = string;
    const expectedPrefix = Object.keys(PREFIX_CLASS);

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
    return prefix as Prefix;
};

/**
 * Covert some sequence of 3-letter amino acids to single letter version
 *
 * @example
 * convert3to1('ArgLysLeu')
 * 'RKL'
 */
const convert3to1 = (notation: string): string => {
    if (notation === '=') {
        // = does not have a 3-letter AA equivalent
        return '=';
    }
    if (notation.length % 3 !== 0) {
        throw new ParsingError(`Cannot convert to single letter AA notation. The input (${notation}) is not in 3-letter form`);
    }
    const result: string[] = [];

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
const extractPositions = (prefix: Prefix, string: string): {input: string; start?: AnyPosition; end?: AnyPosition} => {
    let input: string;

    if (string.startsWith('(')) {
        // expect the first breakpoint to be a range of two positions
        if (string.indexOf(')') < 0) {
            throw new ParsingError('Expected a range of positions. Missing the closing parenthesis');
        }
        if (string.indexOf('_') < 0) {
            throw new ParsingError('Positions within a range must be separated by an underscore. Missing underscore');
        }
        input = string.slice(0, string.indexOf(')') + 1);
        return {
            input,
            start: parsePosition(prefix, string.slice(1, string.indexOf('_'))),
            end: parsePosition(prefix, string.slice(string.indexOf('_') + 1, string.indexOf(')'))),
        }
    }
    const pattern = PATTERNS[prefix] || /(?<pos>\d+)/;
    const match = new RegExp(`^(${pattern.source})`, 'i').exec(string);

    if (!match) {
        throw new ParsingError('Failed to parse the initial position');
    }
    [input] = match;
    return {
        input,
        start: parsePosition(prefix, input.slice(0)),
    }
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
    string = string.slice(prefix.length + 1);
    // get the first position
    let break1Start,
        break1End,
        break2Start,
        break2End,
        refSeq,
        untemplatedSeq,
        untemplatedSeqSize,
        truncation,
        notationType; // type parsed

    try {
        const parsedPosition = extractPositions(prefix, string);
        break1Start = parsedPosition.start;
        break1End = parsedPosition.end;
        string = string.slice(parsedPosition.input.length); // remove the consumed positions from the input string
    } catch (err: any) {
        err.content.violatedAttr = 'break1';
        throw err;
    }


    if (string.startsWith('_')) {
        // expect a range. Extract more positions
        string = string.slice(1);

        try {
            const parsedPosition = extractPositions(prefix, string);
            break2Start = parsedPosition.start;
            break2End = parsedPosition.end;
            string = string.slice(parsedPosition.input.length);
        } catch (err: any) {
            err.content.violatedAttr = 'break2';
            throw err;
        }
    }

    const tail = string;
    let match;

    if (match = /^del([A-Z?*]+)?ins([A-Z?*]+|\d+)?$/i.exec(tail)) { // indel
        notationType = 'delins';
        const [, ref, altSeq] = match;
        refSeq = ref;


        if (parseInt(altSeq, 10)) {
            untemplatedSeqSize = parseInt(altSeq, 10);
        } else if (altSeq && altSeq !== '?') {
            untemplatedSeq = altSeq;
        }
    } else if (match = /^(del|inv|ins|dup)([A-Z?*]+|\d+)?$/i.exec(tail)) { // deletion
        let altSeq;
        [, notationType, altSeq] = match;

        if (parseInt(altSeq, 10)) {
            if (notationType === 'ins' || notationType === 'dup') {
                untemplatedSeqSize = parseInt(altSeq, 10);
            }
        } else if (altSeq && altSeq !== '?') {
            if (notationType === 'dup') {
                untemplatedSeq = altSeq;
                refSeq = altSeq;
            } else if (notationType === 'ins') {
                untemplatedSeq = altSeq;
            } else {
                refSeq = altSeq;
            }
        }
    } else if (match = new RegExp(`^(${AA_PATTERN}|=)$`, 'i').exec(tail) || tail.length === 0) {
        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation does not use ">" for a substitution',
                violatedAttr: 'break1',
            });
        }
        notationType = '>';

        if (tail.length > 0 && tail !== '?') {
            untemplatedSeq = tail;
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
        notationType = '>';
        [, refSeq, untemplatedSeq] = match;
    } else if (match = new RegExp(`^(${AA_PATTERN})?(fs|ext)((\\*|-|Ter)(\\d+|\\?|\\w)?)?$`, 'i').exec(tail)) {
        const [, alt, type,, stop, trunc] = match;

        if (prefix !== 'p') {
            throw new ParsingError({
                message: 'only protein notation can notate frameshift variants',
                violatedAttr: 'type',
            });
        }
        notationType = type.toLowerCase();

        if (alt !== undefined && alt !== '?') {
            untemplatedSeq = alt;
        }
        if (trunc === '?') {
            truncation = null;
        } else if (trunc !== undefined) {
            truncation = parseInt(trunc, 10);

            if (stop === '-') {
                truncation *= -1;
            }

            if (alt === '*' && truncation !== 1) {
                throw new ParsingError({
                    message: 'invalid framshift specifies a non-immeadiate truncation which conflicts with the terminating alt seqeuence',
                    violatedAttr: 'truncation',
                });
            }
        } else if (alt === '*') {
            truncation = 1;
        } else if (stop) {
            // specified trunction at some unknown position
            truncation = null;
        }
        if (break2Start !== undefined) {
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
    let variantType = NOTATION_TO_TYPES[notationType];

    if (untemplatedSeq && untemplatedSeqSize === undefined && untemplatedSeq !== '') {
        if (untemplatedSeq.includes('^')) {
            throw new ParsingError({
                message: `unsupported alternate sequence notation: ${untemplatedSeq}`,
                violatedAttr: 'untemplatedSeq',
            });
        }
    }
    // check for innapropriate types
    if (prefix === 'y') {
        if (refSeq) {
            throw new ParsingError({
                message: 'cannot define sequence elements (refSeq) at the cytoband level',
                violatedAttr: 'refSeq',
            });
        } else if (untemplatedSeq) {
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
        ].includes(variantType)) {
            throw new ParsingError({
                message: `Invalid type (${variantType}) for cytoband level event notation`,
                parsed: {
                    break1Start,
                    break1End,
                    break2Start,
                    break2End,
                    refSeq,
                    untemplatedSeq,
                    untemplatedSeqSize,
                    truncation,
                    notationType,
                    type: variantType,
                },
                violatedAttr: 'type',
            });
        }
    }

    if (prefix === 'p') {
        // special case refSeq protein substitutions
        if (!break1End && !break2Start && !break2End && break1Start.refAA) {
            refSeq = break1Start.longRefAA || break1Start.refAA;
        }
        // covert to 1AA code? check if any of the positions were converted
        const convert = [break1Start, break1End, break2Start, break2End].some(x => x && x.longRefAA);

        if (convert) {
            if (untemplatedSeq) {
                untemplatedSeq = convert3to1(untemplatedSeq);
            }
            if (refSeq) {
                refSeq = convert3to1(refSeq);
            }
        }
    }

    if (truncation !== undefined) {
        if (![
            NOTATION_TO_TYPES.fs, NOTATION_TO_TYPES.ext, NOTATION_TO_TYPES.spl, TRUNCATING_FS,
        ].includes(variantType)) {
            throw new InputValidationError({
                message: `truncation cannot be specified with this event type (${variantType})`,
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
            truncation = Number(truncation);
        }
    }

    if (untemplatedSeqSize !== undefined) {
        if (Number.isNaN(Number(untemplatedSeqSize))) {
            throw new InputValidationError({
                message: `untemplatedSeqSize must be a number not ${untemplatedSeqSize}`,
                violatedAttr: 'untemplatedSeqSize',
            });
        }
    }
    // refine the type name
    if (prefix === 'p') {
        if (variantType === NOTATION_TO_TYPES['>']) {
            if (truncation || untemplatedSeq === '*') {
                variantType = NONSENSE;
            } else if (untemplatedSeq !== '=') {
                variantType = NOTATION_TO_TYPES.mis;
            }
        } else if (variantType === NOTATION_TO_TYPES.fs && truncation) {
            variantType = TRUNCATING_FS;
        }
    }
    return {
        break1Start,
        break1End,
        break2Start,
        break2End,
        refSeq,
        untemplatedSeq,
        untemplatedSeqSize,
        truncation,
        notationType,
        type: variantType,
        prefix,
    };
};

export { parseContinuous, getPrefix };
