import {
    stringifyVariant,
    stripParentheses,
    createVariantNotation,
    jsonifyVariant,
    parseVariant,
} from '../src/variant';
import { createPosition } from '../src/position';
import { NOTATION_TO_TYPES } from '../src/constants';

describe('VariantNotation', () => {
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

    test('hide leading 1 on negative offset; single position', () => {
        const variant = {
            reference1: 'CEP72',
            multiFeature: false,
            type: 'deletion',
            break1Start: {
                '@class': 'CdsPosition',
                pos: 1,
                prefix: 'c',
                offset: -125,
            },
            break1Repr: 'c.1-125',
            noFeatures: false,
            notationType: 'del',
            prefix: 'c',
        };
        expect(stringifyVariant(variant)).toBe('CEP72:c.-125del');
    });

    test('hide leading 1 on negative offset; region position', () => {
        const variant = {
            reference1: 'CEP72',
            multiFeature: false,
            type: 'deletion',
            break1Start: {
                '@class': 'CdsPosition',
                pos: 1,
                prefix: 'c',
                offset: -125,
            },
            break1Repr: 'c.1-125',
            break2Start: {
                '@class': 'CdsPosition',
                pos: 1,
                prefix: 'c',
                offset: -100,
            },
            break2Repr: 'c.1-100',
            noFeatures: false,
            notationType: 'del',
            prefix: 'c',
        };
        expect(stringifyVariant(variant)).toBe('CEP72:c.-125_-100del');
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
