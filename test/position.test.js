

const { ParsingError } = require('../src/error');
const {
    parsePosition,
    GenomicPosition,
    ExonicPosition,
    IntronicPosition,
    ProteinPosition,
    CdsPosition,
    RnaPosition,
    CytobandPosition,
} = require('../src/position');


describe('Position', () => {
    describe('CytobandPosition', () => {
        test('errors on invalid arm', () => {
            expect(() => {
                new CytobandPosition({ arm: 'k' });
            }).toThrowError('must be p or q');
            expect(() => {
                new CytobandPosition({ arm: 1 });
            }).toThrowError('must be p or q');
        });

        test('errors on non-number major band', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: 'k' });
            }).toThrowError('must be a positive integer');
        });

        test('error on majorBand = 0', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: 0 });
            }).toThrowError('must be a positive integer');
        });

        test('error on negative majorBand', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: -1 });
            }).toThrowError('must be a positive integer');
        });

        test('errors on non-number minor band', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: 1, minorBand: 'k' });
            }).toThrowError('must be a positive integer');
        });

        test('error on minorBand = 0', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: 1, minorBand: 0 });
            }).toThrowError('must be a positive integer');
        });

        test('error on negative number minorBand', () => {
            expect(() => {
                new CytobandPosition({ arm: 'p', majorBand: 1, minorBand: -1 });
            }).toThrowError('must be a positive integer');
        });

        test('allows explicit nulls', () => {
            const pos = new CytobandPosition({ arm: 'p', majorBand: null, minorBand: null });
            expect(pos.toString()).toBe('p?.?');
        });

        test('allows majorBand explicit null minorBand specified', () => {
            const pos = new CytobandPosition({ arm: 'p', majorBand: null, minorBand: 2 });
            expect(pos.toString()).toBe('p?.2');
        });

        test('allows majorBand specified minorBand expect null', () => {
            const pos = new CytobandPosition({ arm: 'p', majorBand: 1, minorBand: null });
            expect(pos.toString()).toBe('p1.?');
        });
    });

    describe('CdsPosition', () => {
        test('error on non-integer offset', () => {
            expect(() => {
                new CdsPosition({ pos: 1, offset: 'k' });
            }).toThrowError('must be an integer');
        });

        test('offset specified with explicit null position', () => {
            const pos = new CdsPosition({ pos: null, offset: -10 });
            expect(pos.toString()).toBe('?-10');
        });
    });

    describe('RnaPosition', () => {
        test('offset specified with explicit null position', () => {
            const pos = new RnaPosition({ pos: null, offset: -10 });
            expect(pos.toString()).toBe('?-10');
        });
    });

    describe('ProteinPosition', () => {
        test('allows refAA explicit null', () => {
            expect((new ProteinPosition({ pos: 1, refAA: null })).toString()).toBe('?1');
        });

        test('allows both explicit null', () => {
            expect((new ProteinPosition({ pos: null, refAA: null })).toString()).toBe('??');
        });

        test('allows pos explicit null refAA specified', () => {
            expect((new ProteinPosition({ pos: null, refAA: 'B' })).toString()).toBe('B?');
        });
    });
});


describe('parsePosition', () => {
    test('errors on invalid prefix', () => {
        expect(() => { parsePosition('k', '1'); }).toThrowError(ParsingError);
    });


    describe('g prefix', () => {
        test('valid', () => {
            const result = parsePosition('g', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(GenomicPosition);
        });

        test('errors on non integer', () => {
            expect(() => { parsePosition('g', 'f1'); }).toThrowError(ParsingError);
        });
    });

    describe('intronic', () => {
        test('valid', () => {
            const result = parsePosition('i', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(IntronicPosition);
        });
    });

    describe('c prefix', () => {
        test('positive offset', () => {
            const result = parsePosition('c', '1+3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(3);
            expect(result).toBeInstanceOf(CdsPosition);
        });

        test('negative offset', () => {
            const result = parsePosition('c', '1-3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(-3);
            expect(result).toBeInstanceOf(CdsPosition);
        });

        test('no offset specified', () => {
            const result = parsePosition('c', '1');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(0);
            expect(result).toBeInstanceOf(CdsPosition);
        });

        test('errors on spaces', () => {
            expect(() => { parsePosition('c', '1 + 3'); }).toThrowError(ParsingError);
        });
    });

    describe('p prefix', () => {
        test('defaults to ? on reference AA not given', () => {
            const result = parsePosition('p', '1');
            expect(result.pos).toBe(1);
            expect(result.refAA).toBeUndefined();
            expect(result).toBeInstanceOf(ProteinPosition);
        });

        test('non-specific reference AA', () => {
            const result = parsePosition('p', '?1');
            expect(result.pos).toBe(1);
            expect(result.refAA).toBeUndefined();
            expect(result).toBeInstanceOf(ProteinPosition);
        });

        test('valid', () => {
            const result = parsePosition('p', 'P11');
            expect(result.pos).toBe(11);
            expect(result.refAA).toBe('P');
            expect(result).toBeInstanceOf(ProteinPosition);
        });

        test('ok on lowercase reference AA', () => {
            expect(() => { parsePosition('p', 'p1'); }).not.toThrowError(ParsingError);
        });

        test('errors on position not given', () => {
            expect(() => { parsePosition('p', 'p'); }).toThrowError(ParsingError);
        });
    });

    describe('e prefix', () => {
        test('valid', () => {
            const result = parsePosition('e', '1');
            expect(result.pos).toBe(1);
            expect(result).toBeInstanceOf(ExonicPosition);
        });

        test('errors on non integer', () => {
            expect(() => { parsePosition('e', 'f1'); }).toThrowError(ParsingError);
        });
    });

    describe('y prefix', () => {
        test('errors on arm not given', () => {
            expect(() => { parsePosition('y', '1.1'); }).toThrowError(ParsingError);
        });

        test('p arm', () => {
            const result = parsePosition('y', 'p1.1');
            expect(result.arm).toBe('p');
            expect(result.majorBand).toBe(1);
            expect(result.minorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });

        test('q arm', () => {
            const result = parsePosition('y', 'q1.1');
            expect(result.arm).toBe('q');
            expect(result.majorBand).toBe(1);
            expect(result.minorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });

        test('errors on invalid arm', () => {
            expect(() => { parsePosition('y', 'k1.1'); }).toThrowError(ParsingError);
        });

        test('errors on uppercase P arm', () => {
            expect(() => { parsePosition('y', 'P1.1'); }).toThrowError(ParsingError);
        });

        test('errors on uppercase Q arm', () => {
            expect(() => { parsePosition('y', 'Q1.1'); }).toThrowError(ParsingError);
        });

        test('minor band null if not given', () => {
            const result = parsePosition('y', 'q1');
            expect(result.arm).toBe('q');
            expect(result.majorBand).toBe(1);
            expect(result).toBeInstanceOf(CytobandPosition);
        });

        test('major band null if not given', () => {
            const result = parsePosition('y', 'q');
            expect(result.arm).toBe('q');
            expect(result).toBeInstanceOf(CytobandPosition);
        });

        test('errors on minor band but no major band', () => {
            expect(() => { parsePosition('y', 'p.1'); }).toThrowError(ParsingError);
        });
    });
});
