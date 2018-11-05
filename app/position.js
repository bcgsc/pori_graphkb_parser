

/** @module app/position */
const { ParsingError, InputValidationError } = require('./error');

/**
 * the mapping of positional variant notation prefixes to their corresponging position classes
 * @namespace
 *
 * @property {string} g genomic postions
 * @property {string} i intronic positions
 * @property {string} e exonic positions
 * @property {string} p protein positions (amino acid coordinates)
 * @property {string} y cytoband positions
 * @property {string} c coding sequence positions
 */
const PREFIX_CLASS = {
    g: 'GenomicPosition',
    i: 'IntronicPosition',
    e: 'ExonicPosition',
    p: 'ProteinPosition',
    y: 'CytobandPosition',
    c: 'CdsPosition'
};

const CLASS_PREFIX = {};
for (const [prefix, clsName] of Object.entries(PREFIX_CLASS)) {
    CLASS_PREFIX[clsName] = prefix;
}


const CDS_PATT = /(\d+)?([-+]\d+)?/;
const PROTEIN_PATT = /([A-Za-z?*])?(\d+|\?)/;
const CYTOBAND_PATT = /[pq]((\d+|\?)(\.(\d+|\?))?)?/;


class Position {

    toJSON() {
        const json = {
            '@class': this.name
        };
        for (const [attr, val] of Object.entries(this)) {
            if (val !== undefined) {
                json[attr] = val;
            }
        }
        return json;
    }

    get name() {
        return this.constructor.name;
    }

    get prefix() {
        return CLASS_PREFIX[this.name];
    }
}


class CytobandPosition extends Position {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {string} opt.@class the class name
     * @param {string} opt.arm the chromosome arm
     * @param {?Number} opt.majorBand the major band number
     * @param {?Number} opt.minorBand the minor band number
     */

    constructor(opt) {
        super();
        this.arm = opt.arm;
        if (this.arm !== 'p' && this.arm !== 'q') {
            throw new InputValidationError({
                message: `cytoband arm must be p or q (${this.arm})`,
                violatedAttr: 'arm'
            });
        }
        if (opt.majorBand !== undefined) {
            this.majorBand = Number(opt.majorBand);
            if (isNaN(this.majorBand) || this.majorBand <= 0) {
                throw new InputValidationError({
                    message: `majorBand must be a positive integer (${opt.majorBand})`,
                    violatedAttr: 'majorBand'
                });
            }
        }
        if (opt.minorBand !== undefined) {
            this.minorBand = Number(opt.minorBand);
            if (isNaN(this.minorBand) || this.minorBand <= 0) {
                throw new InputValidationError({
                    message: `minorBand must be a positive integer (${opt.minorBand})`,
                    violatedAttr: 'minorBand'
                });
            }
        }
    }
    toString() {
        let result = `${this.arm}`;
        if (this.majorBand) {
            result = `${result}${this.majorBand}`;
            if (this.minorBand) {
                result = `${result}.${this.minorBand}`;
            }
        }
        return result;
    }
}


class BasicPosition extends Position {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {string} opt.@class the class name
     * @param {Number} opt.pos
     */
    constructor(opt) {
        super();
        if (opt.pos === '?') {
            this.pos = null;
        } else if (isNaN(opt.pos) || opt.pos <= 0) {
            throw new InputValidationError({
                message: `pos (${opt.pos}) must be a positive integer`,
                violatedAttr: 'pos'
            });
        } else if (opt.pos) {
            this.pos = Number(opt.pos);
        }
    }

    toString() {
        return `${this.pos || '?'}`;
    }
}


class GenomicPosition extends BasicPosition { }


class ExonicPosition extends BasicPosition { }


class IntronicPosition extends BasicPosition { }


class CdsPosition extends BasicPosition {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {string} opt.@class the class name
     * @param {Number} opt.offset the offset from the nearest cds position
     */
    constructor(opt) {
        super(opt);
        if (opt.offset !== undefined) {
            this.offset = Number(opt.offset);
            if (isNaN(this.offset)) {
                throw new InputValidationError({
                    message: `offset (${opt.offset}) must be an integer`,
                    violatedAttr: 'offset'
                });
            }
        }
    }

    toString() {
        let offset = '';
        if (this.offset) {
            if (this.offset > 0) {
                offset = '+';
            }
            offset = `${offset}${this.offset}`;
        }
        return `${super.toString(this)}${offset}`;
    }
}


class ProteinPosition extends BasicPosition {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {string} opt.@class the class name
     * @param {Number} opt.pos
     * @param {string} opt.refAA the reference amino acid
     */
    constructor(opt) {
        super(opt);
        this.refAA = opt.refAA;
        if (this.refAA) {
            this.refAA = this.refAA.toUpperCase();
        }
    }

    toString() {
        return `${this.refAA || '?'}${super.toString(this)}`;
    }
}


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
const breakRepr = (prefix, start, end = null, multiFeature = false) => {
    if (end) {
        if (start.prefix !== end.prefix) {
            throw new ParsingError('Mismatch prefix in range');
        }
    }
    if (end && multiFeature) { // range
        return `${start.prefix}.${start.toString()}_${end.toString()}`;
    } if (end) {
        return `${start.prefix}.(${start.toString()}_${end.toString()})`;
    }
    return `${start.prefix}.${start.toString()}`;
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
    let result = {},
        cls;
    switch (prefix) {
        case 'i':
            cls = IntronicPosition;
            result = { pos: string };
            break;
        case 'e':
            cls = ExonicPosition;
            result = { pos: string };
            break;
        case 'g':
            cls = GenomicPosition;
            result = { pos: string };
            break;
        case 'c': {
            const m = new RegExp(`^${CDS_PATT.source}$`).exec(string);
            if (m === null || (!m[1] && !m[2])) {
                throw new ParsingError(`input '${string}' did not match the expected pattern for 'c' prefixed positions`);
            }
            result.pos = m[1]
                ? parseInt(m[1], 10)
                : 1;
            result.offset = m[2] === undefined
                ? 0
                : parseInt(m[2], 10);
            cls = CdsPosition;

            break;
        }
        case 'p': {
            const m = new RegExp(`^${PROTEIN_PATT.source}$`).exec(string);
            if (m === null) {
                throw new ParsingError(`input string '${string}' did not match the expected pattern for 'p' prefixed positions`);
            }
            if (m[2] !== '?') {
                result.pos = parseInt(m[2], 10);
            } else {
                result.pos = m[2];
            }
            if (m[1] !== undefined && m[1] !== '?') {
                [, result.refAA] = m;
            }
            cls = ProteinPosition;
            break;
        }
        case 'y': {
            const m = new RegExp(`^${CYTOBAND_PATT.source}$`).exec(string);
            if (m == null) {
                throw new ParsingError(`input string '${string}' did not match the expected pattern for 'y' prefixed positions`);
            }
            [result.arm] = string;
            if (m[2] !== undefined && m[2] !== '?') {
                result.majorBand = parseInt(m[2], 10);
            }
            if (m[4] !== undefined && m[4] !== '?') {
                result.minorBand = parseInt(m[4], 10);
            }
            cls = CytobandPosition;
            break;
        }
        default: {
            throw new ParsingError({ message: `Prefix not recognized: ${prefix}`, input: string, violatedAttr: 'prefix' });
        }
    }
    try {
        return new cls(result);
    } catch (err) {
        const content = err.content || {};
        content.message = err.message;
        throw new ParsingError(content);
    }
};


module.exports = {
    breakRepr,
    CDS_PATT,
    CLASS_PREFIX,
    CYTOBAND_PATT,
    CdsPosition,
    CytobandPosition,
    ExonicPosition,
    GenomicPosition,
    IntronicPosition,
    parsePosition,
    Position,
    PREFIX_CLASS,
    PROTEIN_PATT,
    ProteinPosition
};
