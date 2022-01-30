

import { ParsingError } from '../src/error';
import {
    parsePosition,
    createPosition,
    convertPositionToString,
} from '../src/position';


describe('Position', () => {
    describe('CytobandPosition', () => {
        test('errors on invalid arm', () => {
            expect(() => {
                createPosition('y', { arm: 'k' });
            }).toThrowError('must be p or q');
            expect(() => {
                createPosition('y', { arm: 1 });
            }).toThrowError('must be p or q');
        });

        test('errors on non-number major band', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: 'k' });
            }).toThrowError('must be a positive integer');
        });

        test('error on majorBand = 0', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: 0 });
            }).toThrowError('must be a positive integer');
        });

        test('error on negative majorBand', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: -1 });
            }).toThrowError('must be a positive integer');
        });

        test('errors on non-number minor band', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: 1, minorBand: 'k' });
            }).toThrowError('must be a positive integer');
        });

        test('error on minorBand = 0', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: 1, minorBand: 0 });
            }).toThrowError('must be a positive integer');
        });

        test('error on negative number minorBand', () => {
            expect(() => {
                createPosition('y', { arm: 'p', majorBand: 1, minorBand: -1 });
            }).toThrowError('must be a positive integer');
        });

        test('allows explicit nulls', () => {
            const pos = createPosition('y', { arm: 'p', majorBand: null, minorBand: null });
            expect(convertPositionToString(pos)).toBe('p?.?');
        });

        test('allows majorBand explicit null minorBand specified', () => {
            const pos = createPosition('y', { arm: 'p', majorBand: null, minorBand: 2 });
            expect(convertPositionToString(pos)).toBe('p?.2');
        });

        test('allows majorBand specified minorBand expect null', () => {
            const pos = createPosition('y', { arm: 'p', majorBand: 1, minorBand: null });
            expect(convertPositionToString(pos)).toBe('p1.?');
        });
    });

    describe('CdsPosition', () => {
        test('error on non-integer offset', () => {
            expect(() => {
                createPosition('c', { pos: 1, offset: 'k' });
            }).toThrowError('must be an integer');
        });

        test('offset specified with explicit null position', () => {
            const pos = createPosition('c', { pos: null, offset: -10 });
            expect(convertPositionToString(pos)).toBe('?-10');
        });
    });

    describe('RnaPosition', () => {
        test('offset specified with explicit null position', () => {
            const pos = createPosition('r', { pos: null, offset: -10 });
            expect(convertPositionToString(pos)).toBe('?-10');
        });
    });

    describe('ProteinPosition', () => {
        test('allows refAA explicit null', () => {
            const pos = createPosition('p', { pos: 1, refAA: null });
            expect(convertPositionToString(pos)).toBe('?1');
        });

        test('allows both explicit null', () => {
            const pos = createPosition('p', { pos: null, refAA: null });
            expect(convertPositionToString(pos)).toBe('??');
        });

        test('allows pos explicit null refAA specified', () => {
            const pos = createPosition('p', { pos: null, refAA: 'B' });
            expect(convertPositionToString(pos)).toBe('B?');
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
            expect(result).toHaveProperty('prefix', 'g');
        });

        test('errors on non integer', () => {
            expect(() => { parsePosition('g', 'f1'); }).toThrowError(ParsingError);
        });
    });

    describe('intronic', () => {
        test('valid', () => {
            const result = parsePosition('i', '1');
            expect(result.pos).toBe(1);
            expect(result).toHaveProperty('prefix', 'i');
        });
    });

    describe('c prefix', () => {
        test('positive offset', () => {
            const result = parsePosition('c', '1+3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(3);
            expect(result).toHaveProperty('prefix', 'c');
        });

        test('negative offset', () => {
            const result = parsePosition('c', '1-3');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(-3);
            expect(result).toHaveProperty('prefix', 'c');
        });

        test('no offset specified', () => {
            const result = parsePosition('c', '1');
            expect(result.pos).toBe(1);
            expect(result.offset).toBe(0);
            expect(result).toHaveProperty('prefix', 'c');
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
            expect(result).toHaveProperty('prefix', 'p');
        });

        test('non-specific reference AA', () => {
            const result = parsePosition('p', '?1');
            expect(result.pos).toBe(1);
            expect(result.refAA).toBe(null);
            expect(result).toHaveProperty('prefix', 'p');
        });

        test('valid', () => {
            const result = parsePosition('p', 'P11');
            expect(result.pos).toBe(11);
            expect(result.refAA).toBe('P');
            expect(result).toHaveProperty('prefix', 'p');
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
            expect(result).toHaveProperty('prefix', 'e');
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
            expect(result).toHaveProperty('prefix', 'y');
        });

        test('q arm', () => {
            const result = parsePosition('y', 'q1.1');
            expect(result.arm).toBe('q');
            expect(result.majorBand).toBe(1);
            expect(result.minorBand).toBe(1);
            expect(result).toHaveProperty('prefix', 'y');
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
            expect(result).toHaveProperty('prefix', 'y');
        });

        test('major band null if not given', () => {
            const result = parsePosition('y', 'q');
            expect(result.arm).toBe('q');
            expect(result).toHaveProperty('prefix', 'y');
        });

        test('errors on minor band but no major band', () => {
            expect(() => { parsePosition('y', 'p.1'); }).toThrowError(ParsingError);
        });
    });
});
