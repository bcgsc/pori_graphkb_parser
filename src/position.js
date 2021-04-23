

/** @module app/position */
const { ParsingError, InputValidationError } = require('./error');
const { AA_PATTERN, AA_CODES } = require('./constants');


const CDS_PATT = /(-?\d+)?([-+]\d+)?/;
const PROTEIN_PATT = new RegExp(`(${AA_PATTERN})?(\\d+|\\?)`);
const CYTOBAND_PATT = /[pq]((\d+|\?)(\.(\d+|\?))?)?/;


class Position {
    toJSON() {
        const json = {
            '@class': this.name,
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
        return this.constructor.prefix;
    }
}


class CytobandPosition extends Position {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {string} opt.arm the chromosome arm
     * @param {?Number} opt.majorBand the major band number
     * @param {?Number} opt.minorBand the minor band number
     */

    constructor({ arm, majorBand, minorBand }) {
        super();
        this.arm = arm;

        if (this.arm !== 'p' && this.arm !== 'q') {
            throw new InputValidationError({
                message: `cytoband arm must be p or q (${this.arm})`,
                violatedAttr: 'arm',
            });
        }
        if (majorBand === null) {
            this.majorBand = null;
        } else if (majorBand !== undefined) {
            this.majorBand = Number(majorBand);

            if (Number.isNaN(Number(this.majorBand)) || this.majorBand <= 0) {
                throw new InputValidationError({
                    message: `majorBand must be a positive integer (${majorBand})`,
                    violatedAttr: 'majorBand',
                });
            }
        }
        if (minorBand === null) {
            this.minorBand = null;
        } else if (minorBand !== undefined) {
            this.minorBand = Number(minorBand);

            if (Number.isNaN(Number(this.minorBand)) || this.minorBand <= 0) {
                throw new InputValidationError({
                    message: `minorBand must be a positive integer (${minorBand})`,
                    violatedAttr: 'minorBand',
                });
            }
        }
    }

    toString() {
        let result = `${this.arm}`;

        if (this.majorBand !== undefined) {
            result = `${result}${this.majorBand || '?'}`;

            if (this.minorBand !== undefined) {
                result = `${result}.${this.minorBand || '?'}`;
            }
        }
        return result;
    }

    static get prefix() {
        return 'y';
    }
}


class BasicPosition extends Position {
    /**
     * @param {Object} opt options
     * @param {Number} opt.pos
     */
    constructor({ pos }) {
        super();

        if (pos === '?' || pos === null) {
            this.pos = null;
        } else if (Number.isNaN(Number(pos)) || pos <= 0) {
            throw new InputValidationError({
                message: `pos (${pos}) must be a positive integer`,
                violatedAttr: 'pos',
            });
        } else if (pos) {
            this.pos = Number(pos);
        }
    }

    toString() {
        return `${this.pos || '?'}`;
    }
}


class GenomicPosition extends BasicPosition {
    static get prefix() {
        return 'g';
    }
}


class ExonicPosition extends BasicPosition {
    static get prefix() {
        return 'e';
    }
}


class IntronicPosition extends BasicPosition {
    static get prefix() {
        return 'i';
    }
}


class CdsPosition extends Position {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {Number} opt.offset the offset from the nearest cds position
     */
    constructor(opt) {
        const { offset, pos } = opt;
        super(opt);

        if (pos === '?' || pos === null) {
            this.pos = null;
        } else {
            this.pos = Number(pos);
        }

        if (offset === null) {
            this.offset = null;
        } else if (offset !== undefined) {
            this.offset = Number(offset);

            if (Number.isNaN(Number(this.offset))) {
                throw new InputValidationError({
                    message: `offset (${offset}) must be an integer`,
                    violatedAttr: 'offset',
                });
            }
        }
    }


    toString() {
        let offset = '';

        if (this.offset === null) {
            offset = '?';
        } else if (this.offset) {
            if (this.offset > 0) {
                offset = '+';
            }
            offset = `${offset}${this.offset}`;
        }
        return `${this.pos || '?'}${offset}`;
    }

    static get prefix() {
        return 'c';
    }
}


class RnaPosition extends CdsPosition {
    static get prefix() {
        return 'r';
    }
}

class NonCdsPosition extends CdsPosition {
    static get prefix() {
        return 'n';
    }
}


class ProteinPosition extends BasicPosition {
    /**
     * @param {Object} opt options
     * @param {string} opt.prefix the position prefix
     * @param {Number} opt.pos
     * @param {string} opt.refAA the reference amino acid
     */
    constructor(opt) {
        super(opt);
        this.refAA = opt.refAA;
        this.longRefAA = null;

        if (this.refAA) {
            if (AA_CODES[this.refAA.toLowerCase()]) {
                this.longRefAA = this.refAA;
                this.refAA = AA_CODES[this.refAA.toLowerCase()];
            }
            this.refAA = this.refAA.toUpperCase();
        }
    }

    toString() {
        return `${this.refAA || '?'}${super.toString(this)}`;
    }

    toJSON() {
        const json = {
            '@class': this.name,
            refAA: this.refAA,
            pos: this.pos,
        };
        return json;
    }

    static get prefix() {
        return 'p';
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
const breakRepr = (start, end = null, multiFeature = false) => {
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
    [GenomicPosition.prefix]: GenomicPosition,
    [IntronicPosition.prefix]: IntronicPosition,
    [ExonicPosition.prefix]: ExonicPosition,
    [ProteinPosition.prefix]: ProteinPosition,
    [CytobandPosition.prefix]: CytobandPosition,
    [CdsPosition.prefix]: CdsPosition,
    [RnaPosition.prefix]: RnaPosition,
    [NonCdsPosition.prefix]: NonCdsPosition,
};

const CLASS_PREFIX = {};

for (const [prefix, clsName] of Object.entries(PREFIX_CLASS)) {
    CLASS_PREFIX[clsName.name] = prefix;
}

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
        Cls;

    switch (prefix) {
        case IntronicPosition.prefix:
            Cls = IntronicPosition;
            result = { pos: string };
            break;
        case ExonicPosition.prefix:
            Cls = ExonicPosition;
            result = { pos: string };
            break;
        case GenomicPosition.prefix:
            Cls = GenomicPosition;
            result = { pos: string };
            break;

        case RnaPosition.prefix:

        case NonCdsPosition.prefix: // eslint-disable-line no-fallthrough

        case CdsPosition.prefix: { // eslint-disable-line no-fallthrough
            const m = new RegExp(`^${CDS_PATT.source}$`, 'i').exec(string);

            if (m === null || (!m[1] && !m[2])) {
                throw new ParsingError(`input '${string}' did not match the expected pattern for 'c' prefixed positions`);
            }
            result.pos = m[1]
                ? parseInt(m[1], 10)
                : 1;
            result.offset = m[2] === undefined
                ? 0
                : parseInt(m[2], 10);

            Cls = PREFIX_CLASS[prefix];

            break;
        }

        case ProteinPosition.prefix: {
            const m = new RegExp(`^${PROTEIN_PATT.source}$`, 'i').exec(string);

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
            Cls = ProteinPosition;
            break;
        }

        case CytobandPosition.prefix: {
            const m = new RegExp(`^${CYTOBAND_PATT.source}$`, 'i').exec(string);

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
            Cls = CytobandPosition;
            break;
        }

        default: {
            throw new ParsingError({ message: `Prefix not recognized: ${prefix}`, input: string, violatedAttr: 'prefix' });
        }
    }

    try {
        return new Cls(result);
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
    NonCdsPosition,
    parsePosition,
    Position,
    PREFIX_CLASS,
    PROTEIN_PATT,
    ProteinPosition,
    RnaPosition,
};
