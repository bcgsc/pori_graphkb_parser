

/** @module app/position */
const { ParsingError, InputValidationError } = require('./error');
const {
    AA_PATTERN, AA_CODES, PREFIX_CLASS,
} = require('./constants');

const CDSLIKE_PATT = /(?<pos>-?(\d+|\?))?(?<offset>[-+](\d+|\?))?/;

const CLASS_FIELD = '@class';
const PATTERNS = {
    y: /(?<arm>[pq])((?<majorBand>\d+|\?)(\.(?<minorBand>\d+|\?))?)?/,
    p: new RegExp(`(?<refAA>${AA_PATTERN})?(?<pos>\\d+|\\?)`),
    c: CDSLIKE_PATT,
    n: CDSLIKE_PATT,
    r: CDSLIKE_PATT,
};


const convertPositionToJson = (position, exclude = ['prefix', 'longRefAA']) => {
    const json = {};

    for (const [attr, val] of Object.entries(position)) {
        if (val !== undefined && !exclude.includes(attr)) {
            json[attr] = val;
        }
    }
    return json;
};


const createCytoBandPosition = ({ arm, majorBand, minorBand }) => {
    const prefix = 'y';
    const result = {
        arm, majorBand, minorBand, [CLASS_FIELD]: PREFIX_CLASS[prefix], prefix,
    };

    if (arm !== 'p' && arm !== 'q') {
        throw new InputValidationError({
            message: `cytoband arm must be p or q (${arm})`,
            violatedAttr: 'arm',
        });
    }
    if (majorBand !== undefined && majorBand !== null) {
        result.majorBand = Number(majorBand);

        if (Number.isNaN(Number(result.majorBand)) || result.majorBand <= 0) {
            throw new InputValidationError({
                message: `majorBand must be a positive integer (${majorBand})`,
                violatedAttr: 'majorBand',
            });
        }
    }
    if (minorBand !== undefined && minorBand !== null) {
        result.minorBand = Number(minorBand);

        if (Number.isNaN(Number(result.minorBand)) || result.minorBand <= 0) {
            throw new InputValidationError({
                message: `minorBand must be a positive integer (${minorBand})`,
                violatedAttr: 'minorBand',
            });
        }
    }
    return result;
};


const checkBasicPosition = (pos, allowNegative = false) => {
    if (pos === '?' || pos === null) {
        return null;
    } if (Number.isNaN(Number(pos)) || (pos <= 0 && !allowNegative)) {
        throw new InputValidationError({
            message: `pos (${pos}) must be a positive integer`,
            violatedAttr: 'pos',
        });
    }
    return Number(pos);
};


const createBasicPosition = (pos, prefix, allowNegative = false) => {
    const result = {
        [CLASS_FIELD]: PREFIX_CLASS[prefix],
        pos: checkBasicPosition(pos, allowNegative),
        prefix,
    };
    return result;
};


const createCdsLikePosition = ({ offset, pos }, prefix) => {
    const result = { ...createBasicPosition(pos, prefix, true) };

    if (offset !== undefined) {
        result.offset = Number(offset);

        if (Number.isNaN(Number(result.offset))) {
            throw new InputValidationError({
                message: `offset (${offset}) must be an integer`,
                violatedAttr: 'offset',
            });
        }
    }
    return result;
};


const createProteinPosition = ({ refAA, pos }) => {
    const prefix = 'p';
    const result = { ...createBasicPosition(pos, prefix), longRefAA: null, refAA };

    if (result.refAA) {
        if (result.refAA === '?') {
            result.refAA = null;
        } else if (AA_CODES[result.refAA.toLowerCase()]) {
            result.longRefAA = result.refAA;
            result.refAA = AA_CODES[result.refAA.toLowerCase()];
        } else {
            result.refAA = result.refAA.toUpperCase();
        }
    }
    return result;
};


const createPosition = (prefix, position) => {
    if (prefix === 'p') {
        return createProteinPosition(position);
    } if (prefix === 'y') {
        return createCytoBandPosition(position);
    } if (['r', 'n', 'c'].includes(prefix)) {
        return createCdsLikePosition(position, prefix);
    } if (PREFIX_CLASS[prefix] !== undefined) {
        // basic pos
        return createBasicPosition(position.pos, prefix);
    }
    throw new ParsingError(`did not regcognize position prefix: ${prefix}`);
};


const convertPositionToString = (position) => {
    if (position.prefix === 'y') {
        let result = `${position.arm}`;

        if (position.majorBand !== undefined) {
            result = `${result}${position.majorBand || '?'}`;

            if (position.minorBand !== undefined) {
                result = `${result}.${position.minorBand || '?'}`;
            }
        }
        return result;
    } if (['c', 'r', 'n'].includes(position.prefix)) {
        let offset = '';

        if (position.offset === null) {
            offset = '?';
        } else if (position.offset) {
            if (position.offset > 0) {
                offset = '+';
            }
            offset = `${offset}${position.offset}`;
        }
        return `${position.pos || '?'}${offset}`;
    } if (position.prefix === 'p') {
        return `${position.refAA || '?'}${position.pos || '?'}`;
    }
    return `${position.pos || '?'}`;
};


/**
 * Convert parsed breakpoints into a string representing the breakpoint range
 *
 * @param {string} prefix the prefix denoting the coordinate system being used
 * @param {string} start the start of the breakpoint range
 * @param {string} [end=null] the end of the breakpoint range (if the breakpoint is a range)
 * @param {boolean} [multiFeature=false] flag to indicate this is for multi-feature notation and should not contain brackets
 *
 * @example
 * > break1Repr('g', {pos: 1}, {pos: 10});
 * 'g.(1_10)'
 *
 * @example
 * > break1Repr('g', {pos: 1})
 * 'g.1'
 *
 * @returns {string} the string representation of a breakpoint or breakpoint range including the prefix
 */
const createBreakRepr = (start, end = null, multiFeature = false) => {
    if (end) {
        if (start.prefix !== end.prefix) {
            throw new ParsingError('Mismatch prefix in range');
        }
    }
    if (end && multiFeature) { // range
        return `${start.prefix}.${convertPositionToString(start)}_${convertPositionToString(end)}`;
    } if (end) {
        return `${start.prefix}.(${convertPositionToString(start)}_${convertPositionToString(end)})`;
    }
    return `${start.prefix}.${convertPositionToString(start)}`;
};


/**
 * Given a prefix and string, parse a position
 *
 * @param {string} prefix the prefix type which defines the type of position to be parsed
 * @param {string} string the string the position information is being parsed from
 *
 * @example
 * > parsePosition('c', '100+2');
 * {'@class': 'CdsPosition', pos: 100, offset: 2}
 *
 * @returns {object} the parsed position
 */
const parsePosition = (prefix, string) => {
    try {
        if (prefix === 'p') {
            const m = new RegExp(`^${PATTERNS.p.source}$`, 'i').exec(string);

            if (m === null) {
                throw new ParsingError(`input string '${string}' did not match the expected pattern for 'p' prefixed positions`);
            }
            const { refAA, pos } = m.groups;
            return createPosition(prefix, { refAA, pos });
        } if (prefix === 'y') {
            const m = new RegExp(`^${PATTERNS.y.source}$`, 'i').exec(string);

            if (m == null) {
                throw new ParsingError(`input string '${string}' did not match the expected pattern for 'y' prefixed positions`);
            }
            let majorBand,
                minorBand;

            if (m.groups.majorBand !== undefined && m.groups.majorBand !== '?') {
                majorBand = parseInt(m.groups.majorBand, 10);
            }
            if (m.groups.minorBand !== undefined && m.groups.minorBand !== '?') {
                minorBand = parseInt(m.groups.minorBand, 10);
            }
            return createPosition(prefix, { arm: m.groups.arm, majorBand, minorBand });
        } if (['r', 'n', 'c'].includes(prefix)) {
            const m = new RegExp(`^${PATTERNS[prefix].source}$`, 'i').exec(string);

            if (m === null || (!m[1] && !m[2])) {
                throw new ParsingError(`input '${string}' did not match the expected pattern for 'c' prefixed positions`);
            }
            const { pos, offset } = m.groups;

            return createPosition(prefix, {
                pos: pos || 1,
                offset: offset === undefined
                    ? 0
                    : offset,
            });
        } if (PREFIX_CLASS[prefix] !== undefined) {
            // basic pos
            return createPosition(prefix, { pos: string });
        }
    } catch (err) {
        if (err instanceof InputValidationError) {
            throw new ParsingError(err);
        }
        throw err;
    }
    throw new ParsingError(`did not regcognize position prefix: ${prefix}`);
};


module.exports = {
    createBreakRepr,
    parsePosition,
    PREFIX_CLASS,
    convertPositionToJson,
    convertPositionToString,
    createPosition,
    PATTERNS,
};
