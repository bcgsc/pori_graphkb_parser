

const {
    parse,
} = require('../src/variant');
const {
    NOTATION_TO_TYPES,
} = require('../src/constants');

describe('multi-feature notation', () => {
    describe('throws an error on', () => {
        test('short string', () => {
            expect(() => {
                parse('');
            }).toThrowError('Too short.');
        });
        test('missing opening bracket', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):transe.1,e.2)');
            }).toThrowError('Missing opening');
        });
        test('missing closing bracket', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.1,e.2');
            }).toThrowError('Missing closing');
        });
        test('missing variant type', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):(e.1,e.2)');
            }).toThrowError('Variant type was not specified');
        });
        test('invalid variant type', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):blargh(e.1,e.2)');
            }).toThrowError('Variant type (blargh) not recognized');
        });
        test('missing prefix', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(1,2)');
            }).toThrowError('Error in parsing the first breakpoint');
        });
        test('invalid prefix', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(k.1,e.2)');
            }).toThrowError('Error in parsing the first breakpoint');
        });
        test('multiple commas', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.1,e.2,e.3)');
            }).toThrowError('Single comma expected');
        });
        test('missing comma', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.123)');
            }).toThrowError('Missing comma');
        });
        test('bad first breakpoint', () => {
            expect(() => {
                const notation = '(FEATURE1,FEATURE2):trans(e.123k,e.1234)';
                const result = parse(notation);
                console.log(result);
            }).toThrowError('Error in parsing the first breakpoint');
        });
        test('bad second breakpoint', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):fusion(e.123,e.123k)');
            }).toThrowError('Error in parsing the second breakpoint');
        });
        test('insertion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):ins(e.123,e.124)');
            }).toThrowError('Continuous notation is preferred');
        });
        test('indel types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):delins(e.123,e.123)');
            }).toThrowError('Continuous notation is preferred');
        });
        test('inversion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):inv(e.123,e.123)');
            }).toThrowError('Continuous notation is preferred');
        });
        test('deletion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):del(e.123,e.123)');
            }).toThrowError('Continuous notation is preferred');
        });
        test('duplication types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):dup(e.123,e.123)');
            }).toThrowError('Continuous notation is preferred');
        });
    });
    test('parses exon gene fusion', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).toEqual({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break2Start: { '@class': 'ExonicPosition', pos: 2 },
            type: NOTATION_TO_TYPES.fusion,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2',
        });
        expect(parsed.toString()).toBe(notation);
    });
    test('parses genomic translocation', () => {
        const notation = '(FEATURE1,FEATURE2):trans(g.1,g.2)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).toEqual({
            break1Repr: 'g.1',
            break2Repr: 'g.2',
            break1Start: { '@class': 'GenomicPosition', pos: 1 },
            break2Start: { '@class': 'GenomicPosition', pos: 2 },
            type: NOTATION_TO_TYPES.trans,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2',
        });
        expect(parsed.toString()).toBe(notation);
    });
    test('parses untemplated sequence', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)ATGC';
        const parsed = parse(notation);
        expect(parsed.toJSON()).toEqual({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break2Start: { '@class': 'ExonicPosition', pos: 2 },
            type: NOTATION_TO_TYPES.fusion,
            untemplatedSeq: 'ATGC',
            untemplatedSeqSize: 4,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2',
        });
        expect(parsed.toString()).toBe(notation);
    });
    test('parses non-specific untemplated sequence', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)5';
        const parsed = parse(notation);
        expect(parsed.toJSON()).toEqual({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break2Start: { '@class': 'ExonicPosition', pos: 2 },
            type: NOTATION_TO_TYPES.fusion,
            untemplatedSeqSize: 5,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2',
        });
        expect(parsed.toString()).toBe(notation);
    });
    test('parses breakpoint ranges', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1_17,e.20_28)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).toEqual({
            break1Repr: 'e.1_17',
            break2Repr: 'e.20_28',
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break1End: { '@class': 'ExonicPosition', pos: 17 },
            break2Start: { '@class': 'ExonicPosition', pos: 20 },
            break2End: { '@class': 'ExonicPosition', pos: 28 },
            type: NOTATION_TO_TYPES.fusion,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2',
        });
        expect(parsed.toString()).toBe(notation);
    });
});
