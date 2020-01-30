

const {ParsingError} = require('./../app/error');
const {
    parsePosition,
    GenomicPosition,
    ExonicPosition,
    IntronicPosition,
    ProteinPosition,
    CdsPosition,
    RnaPosition,
    CytobandPosition
} = require('./../app/position');


describe('Position', () => {
    describe('CytobandPosition', () => {
        it('errors on invalid arm', () => {
            expect(() => {
                new CytobandPosition({arm: 'k'});
            }).toThrowError('must be p or q');
            expect(() => {
                new CytobandPosition({arm: 1});
            }).toThrowError('must be p or q');
        });
        it('errors on non-number major band', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 'k'});
            }).toThrowError('must be a positive integer');
        });
        it('error on majorBand = 0', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 0});
            }).toThrowError('must be a positive integer');
        });
        it('error on negative majorBand', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: -1});
            }).toThrowError('must be a positive integer');
        });
        it('errors on non-number minor band', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: 'k'});
            }).toThrowError('must be a positive integer');
        });
        it('error on minorBand = 0', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: 0});
            }).toThrowError('must be a positive integer');
        });
        it('error on negative number minorBand', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: -1});
            }).toThrowError('must be a positive integer');
        });
        it('allows explicit nulls', () => {
            const pos = new CytobandPosition({arm: 'p', majorBand: null, minorBand: null});
            expect(pos.toString()).toBe('p?.?');
        });
        it('allows majorBand explicit null minorBand specified', () => {
            const pos = new CytobandPosition({arm: 'p', majorBand: null, minorBand: 2});
            expect(pos.toString()).toBe('p?.2');
        });
        it('allows majorBand specified minorBand expect null', () => {
            const pos = new CytobandPosition({arm: 'p', majorBand: 1, minorBand: null});
            expect(pos.toString()).toBe('p1.?');
        });
    });
    describe('CdsPosition', () => {
        it('error on non-integer offset', () => {
            expect(() => {
                new CdsPosition({pos: 1, offset: 'k'});
            }).toThrowError('must be an integer');
        });
        it('offset specified with explicit null position', () => {
            const pos = new CdsPosition({pos: null, offset: -10});
            expect(pos.toString()).toBe('?-10');
        });
    });
    describe('RnaPosition', () => {
        it('offset specified with explicit null position', () => {
            const pos = new RnaPosition({pos: null, offset: -10});
            expect(pos.toString()).toBe('?-10');
        });
    });
    describe('ProteinPosition', () => {
        it('allows refAA explicit null', () => {
            expect((new ProteinPosition({pos: 1, refAA: null})).toString()).toBe('?1');
        });
        it('allows both explicit null', () => {
            expect((new ProteinPosition({pos: null, refAA: null})).toString()).toBe('??');
        });
        it('allows pos explicit null refAA specified', () => {
            expect((new ProteinPosition({pos: null, refAA: 'B'})).toString()).toBe('B?');
        });
    });
});


describe('parsePosition', () => {
    it('errors on invalid prefix', () => {
        expect(() => { parsePosition('k', '1'); }).toThrowError(ParsingError);
    });
    describe('g prefix', () => {
        it('valid', () => {
            const result = parsePosition('g', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(GenomicPosition);
        });
        it('errors on non integer', () => {
            expect(() => { parsePosition('g', 'f1'); }).toThrowError(ParsingError);
        });
    });
    describe('intronic', () => {
        it('valid', () => {
            const result = parsePosition('i', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(IntronicPosition);
        });
    });
    describe('c prefix', () => {
        it('positive offset', () => {
            const result = parsePosition('c', '1+3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(3);
            expect(result).toBeInstanceOf(CdsPosition);
        });
        it('negative offset', () => {
            const result = parsePosition('c', '1-3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(-3);
            expect(result).toBeInstanceOf(CdsPosition);
        });
        it('no offset specified', () => {
            const result = parsePosition('c', '1');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(0);
            expect(result).toBeInstanceOf(CdsPosition);
        });
        it('errors on spaces', () => {
            expect(() => { parsePosition('c', '1 + 3'); }).toThrowError(ParsingError);
        });
    });
    describe('p prefix', () => {
        it('defaults to ? on reference AA not given', () => {
            const result = parsePosition('p', '1');
            expect(result.pos).toBe(1);
            expect(result.refAA).toBeUndefined();
            expect(result).toBeInstanceOf(ProteinPosition);
        });
        it('non-specific reference AA', () => {
            const result = parsePosition('p', '?1');
            expect(result.pos).toBe(1);
            expect(result.refAA).toBeUndefined();
            expect(result).toBeInstanceOf(ProteinPosition);
        });
        it('valid', () => {
            const result = parsePosition('p', 'P11');
            expect(result.pos).toBe(11);
            expect(result.refAA).toBe('P');
            expect(result).toBeInstanceOf(ProteinPosition);
        });
        it('ok on lowercase reference AA', () => {
            expect(() => { parsePosition('p', 'p1'); }).not.toThrowError(ParsingError);
        });
        it('errors on position not given', () => {
            expect(() => { parsePosition('p', 'p'); }).toThrowError(ParsingError);
        });
    });
    describe('e prefix', () => {
        it('valid', () => {
            const result = parsePosition('e', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(ExonicPosition);
        });
        it('errors on non integer', () => {
            expect(() => { parsePosition('e', 'f1'); }).toThrowError(ParsingError);
        });
    });
    describe('y prefix', () => {
        it('errors on arm not given', () => {
            expect(() => { parsePosition('y', '1.1'); }).toThrowError(ParsingError);
        });
        it('p arm', () => {
            const result = parsePosition('y', 'p1.1');
            expect(result.arm).toBe('p');
            expect(result.majorBand).toBe(1);
            expect(result.minorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });
        it('q arm', () => {
            const result = parsePosition('y', 'q1.1');
            expect(result.arm).toBe('q');
            expect(result.majorBand).toBe(1);
            expect(result.minorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });
        it('errors on invalid arm', () => {
            expect(() => { parsePosition('y', 'k1.1'); }).toThrowError(ParsingError);
        });
        it('errors on uppercase P arm', () => {
            expect(() => { parsePosition('y', 'P1.1'); }).toThrowError(ParsingError);
        });
        it('errors on uppercase Q arm', () => {
            expect(() => { parsePosition('y', 'Q1.1'); }).toThrowError(ParsingError);
        });
        it('minor band null if not given', () => {
            const result = parsePosition('y', 'q1');
            expect(result.arm).toBe('q');
            expect(result.majorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });
        it('major band null if not given', () => {
            const result = parsePosition('y', 'q');
            expect(result.arm).toBe('q');
            expect(result).toBeInstanceOf(CytobandPosition);
        });
        it('errors on minor band but no major band', () => {
            expect(() => { parsePosition('y', 'p.1'); }).toThrowError(ParsingError);
        });
    });
});
