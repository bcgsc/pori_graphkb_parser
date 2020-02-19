

const {
    VariantNotation,
    stripParentheses,
} = require('../../src/variant');
const {
    ProteinPosition,
} = require('../../src/position');
const {
    NOTATION_TO_TYPES,
} = require('../../src/constants');


describe('VariantNotation', () => {
    test('use object name if no sourceId on reference', () => {
        const notation = new VariantNotation({
            reference1: { name: 'KRAS' },
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({ pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
        });
        expect(notation.toString()).toBe('KRAS:p.G12D');
    });

    test('use sourceId before name on reference object', () => {
        const notation = new VariantNotation({
            reference1: { sourceId: 'ENSG001', name: 'blargh' },
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({ pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
        });
        expect(notation.toString()).toBe('ENSG001:p.G12D');
    });

    test('prefer displayName', () => {
        const notation = new VariantNotation({
            reference1: { sourceId: 'ENSG001', sourceIdVersion: '1', displayName: 'ENSG001.1' },
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({ pos: 12, refAA: 'G' }),
            type: NOTATION_TO_TYPES['>'],
        });
        expect(notation.toString()).toBe('ENSG001.1:p.G12D');
    });

    test('throws error on subsitituion with range', () => {
        expect(() => {
            new VariantNotation({
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
        };
        const variant = new VariantNotation(notation);
        expect(variant.toString()).toBe('EGFR:e.20_21ins');
    });

    test('throws error on invalid type', () => {
        expect(() => {
            new VariantNotation({
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
        const variant = new VariantNotation({
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
        expect(variant.toString()).toBe('A1BGAS:g.(1_18)?>?');
    });

    test('error on insertion without range', () => {
        expect(() => {
            new VariantNotation({
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


describe('VariantNotation.toString', () => {
    test('builds string from duck-typed object', () => {
        const obj = {
            '@class': 'PositionalVariant',
            reference1: 'KRAS1',
            type: 'substitution',
            break1Start: { '@class': 'ProteinPosition', pos: 12, refAA: 'G' },
            untemplatedSeq: 'D',
            untemplatedSeqSize: 1,
            uuid: '209f648a-ea5f-4e2a-9c4a-45186821cf1e',
            createdAt: 1563408581057,
            displayName: 'KRAS1:p.G12',
            break1Repr: 'p.G12',
            '@version': 1,
        };
        expect(VariantNotation.toString(obj)).toBe('KRAS1:p.G12D');
    });

    test('allows non-standard types', () => {
        const obj = {
            '@class': 'PositionalVariant',
            reference1: 'EWSR1',
            reference2: 'FLI1',
            type: { name: 'in-frame fusion' },
            break1Start: { '@class': 'GenomicPosition', pos: 1230 },
            break2Start: { '@class': 'GenomicPosition', pos: 1400 },
            uuid: '209f648a-ea5f-4e2a-9c4a-45186821cf1e',
            createdAt: 1563408581057,
            break1Repr: 'g.1230',
            break2Repr: 'g.1400',
        };
        expect(VariantNotation.toString(obj)).toBe('(EWSR1,FLI1):in-frame-fusion(g.1230,g.1400)');
    });
});
