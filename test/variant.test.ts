import data from '../data/variants';
import {
    stringifyVariant,
    stripParentheses,
    createVariantNotation,
    jsonifyVariant,
    parseVariant,
} from '../src/variant';
import { createPosition } from '../src/position';
import { NOTATION_TO_TYPES } from '../src/constants';

describe('createVariantNotation', () => {
    test('use object name if no sourceId on reference', () => {
        const notation = createVariantNotation({
            reference1: { name: 'KRAS' },
            untemplatedSeq: 'D',
            break1Start: createPosition('p', { pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
            prefix: 'p',
        });
        expect(stringifyVariant(notation)).toBe('KRAS:p.G12D');
    });

    test('use sourceId before name on reference object', () => {
        const notation = createVariantNotation({
            reference1: { sourceId: 'ENSG001', name: 'blargh' },
            untemplatedSeq: 'D',
            break1Start: createPosition('p', { pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
            prefix: 'p',
        });
        expect(stringifyVariant(notation)).toBe('ENSG001:p.G12D');
    });

    test('prefer displayName', () => {
        const notation = createVariantNotation({
            reference1: { sourceId: 'ENSG001', sourceIdVersion: '1', displayName: 'ENSG001.1' },
            untemplatedSeq: 'D',
            break1Start: createPosition('p', { pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
            prefix: 'p',
        });
        expect(stringifyVariant(notation)).toBe('ENSG001.1:p.G12D');
    });

    test('throws error on subsitituion with range', () => {
        expect(() => {
            createVariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1,
                },
                break2Start: {
                    '@class': 'GenomicPosition',
                    pos: 18,
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'substitution',
            });
        }).toThrowError('cannot be a range');
    });

    test('ok for insertion with a range', () => {
        const notation = {
            type: 'insertion',
            reference1: 'EGFR',
            break1Start: {
                '@class': 'ExonicPosition',
                pos: 20,
            },
            break2Start: {
                '@class': 'ExonicPosition',
                pos: 21,
            },
            prefix: 'e',
        };
        const variant = createVariantNotation(notation);
        expect(stringifyVariant(variant)).toBe('EGFR:e.20_21ins');
    });

    test('throws error on invalid type', () => {
        expect(() => {
            createVariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1,
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'bad_type',
            });
        }).toThrowError('invalid type');
    });

    test('use ? for undefined elements', () => {
        const variant = createVariantNotation({
            break1Start: {
                '@class': 'GenomicPosition',
                pos: 1,
            },
            break1End: {
                '@class': 'GenomicPosition',
                pos: 18,
            },
            germline: false,
            prefix: 'g',
            reference1: 'A1BGAS',
            type: 'substitution',
        });
        expect(stringifyVariant(variant)).toBe('A1BGAS:g.(1_18)?>?');
    });

    test('error on insertion without range', () => {
        expect(() => {
            createVariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1,
                },
                break1End: {
                    '@class': 'GenomicPosition',
                    pos: 18,
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'insertion',
            });
        }).toThrowError('must be specified with a range');
    });
});

describe('stripParentheses', () => {
    test('ignores single positions', () => {
        expect(stripParentheses('e.1')).toBe('e.1');
    });

    test('ignores range positions', () => {
        expect(stripParentheses('e.1_2')).toBe('e.1_2');
    });

    test('strips uncertain positions', () => {
        expect(stripParentheses('e.(1_2)')).toBe('e.1_2');
    });
});

describe('jsonifyVariant', () => {
    test('continuous notation', () => {
        const json = jsonifyVariant(parseVariant('p.G12D', false));
        expect(json).toEqual({
            break1Start: { '@class': 'ProteinPosition', pos: 12, refAA: 'G' },
            untemplatedSeq: 'D',
            untemplatedSeqSize: 1,
            break1Repr: 'p.G12',
            refSeq: 'G',
            type: 'missense mutation',
        });
    });
});

describe('parseVariant & strignifyVariant', () => {
    const variants = {
        ...data.standardVariants,
        ...data.legacyNomenclatureFusionVariants,
        ...data.newNomenclatureFusionVariants,
    };

    test.each(Object.keys(variants))('Parsing and strignifying back %s', (variantString) => {
        const variantNotation = parseVariant(variantString);

        // Parse variant string and compare notations
        expect(variantNotation).toStrictEqual(
            expect.objectContaining({
                ...variants[variantString],
                break1Start: expect.objectContaining(
                    variants[variantString].break1Start,
                ),
            }),
        );
        // Strignify notation and compare variant strings
        const newFusion = variantString.split('::').length > 1;
        expect(stringifyVariant(variants[variantString], newFusion)).toBe(variantString);
    });
});
