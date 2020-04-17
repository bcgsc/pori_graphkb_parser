

const { ParsingError } = require('../../src/error');
const {
    parse,
} = require('../../src/variant');
const {
    NOTATION_TO_TYPES,
} = require('../../src/constants');


describe('genomic', () => {
    test('deletion single bp', () => {
        const notation = 'FEATURE:g.3del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break1Repr: 'g.3',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('deletion spans a range', () => {
        const notation = 'FEATURE:g.3_5del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('deletion has a reference sequence', () => {
        const notation = 'FEATURE:g.3_5delTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            refSeq: 'TAA',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain start', () => {
        const notation = 'FEATURE:g.(3_4)_5dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break1End: { '@class': 'GenomicPosition', pos: 4 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break1Repr: 'g.(3_4)',
            break2Repr: 'g.5',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain end', () => {
        const notation = 'FEATURE:g.3_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break2End: { '@class': 'GenomicPosition', pos: 7 },
            break1Repr: 'g.3',
            break2Repr: 'g.(5_7)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain start and end', () => {
        const notation = 'FEATURE:g.(1_3)_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'GenomicPosition', pos: 1 },
            break1End: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break2End: { '@class': 'GenomicPosition', pos: 7 },
            break1Repr: 'g.(1_3)',
            break2Repr: 'g.(5_7)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication has a reference sequence', () => {
        const notation = 'FEATURE:g.3_5dupTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            untemplatedSeq: 'TAA',
            refSeq: 'TAA',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('basic substitution', () => {
        const notation = 'FEATURE:g.4A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'GenomicPosition', pos: 4 },
            break1Repr: 'g.4',
            untemplatedSeq: 'T',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('substitution with alt seq options', () => {
        const notation = 'FEATURE:g.4A>T^C';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'GenomicPosition', pos: 4 },
            break1Repr: 'g.4',
            untemplatedSeq: 'T^C',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('substitution with uncertainty', () => {
        const notation = 'FEATURE:g.(4_7)A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'GenomicPosition', pos: 4 },
            break1End: { '@class': 'GenomicPosition', pos: 7 },
            break1Repr: 'g.(4_7)',
            untemplatedSeq: 'T',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel spans a range uncertain start and end ref and alt specified', () => {
        const notation = 'FEATURE:g.(1_3)_(5_7)delTAAinsACG';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'GenomicPosition', pos: 1 },
            break1End: { '@class': 'GenomicPosition', pos: 3 },
            break2Start: { '@class': 'GenomicPosition', pos: 5 },
            break2End: { '@class': 'GenomicPosition', pos: 7 },
            break1Repr: 'g.(1_3)',
            break2Repr: 'g.(5_7)',
            untemplatedSeq: 'ACG',
            refSeq: 'TAA',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel ref specified', () => {
        const notation = 'FEATURE:g.10delTins';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'GenomicPosition', pos: 10 },
            break1Repr: 'g.10',
            refSeq: 'T',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel alt specified', () => {
        const notation = 'FEATURE:g.10delinsACC';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'GenomicPosition', pos: 10 },
            break1Repr: 'g.10',
            untemplatedSeq: 'ACC',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('errors on protein style missense', () => {
        expect(() => { parse('FEATURE:g.15T'); }).toThrowError(ParsingError);
    });
});

describe('coding sequence', () => {
    test('deletion single bp', () => {
        const notation = 'FEATURE:c.3+1del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 1 },
            break1Repr: 'c.3+1',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('deletion spans a range', () => {
        const notation = 'FEATURE:c.3+1_5-2del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 1 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: -2 },
            break1Repr: 'c.3+1',
            break2Repr: 'c.5-2',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('deletion has a reference sequence', () => {
        const notation = 'FEATURE:c.3_5delTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 0 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: 0 },
            break1Repr: 'c.3',
            break2Repr: 'c.5',
            refSeq: 'TAA',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain start', () => {
        const notation = 'FEATURE:c.(3+1_4-1)_10dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 1 },
            break1End: { '@class': 'CdsPosition', pos: 4, offset: -1 },
            break2Start: { '@class': 'CdsPosition', pos: 10, offset: 0 },
            break1Repr: 'c.(3+1_4-1)',
            break2Repr: 'c.10',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain end', () => {
        const notation = 'FEATURE:c.3_(5+1_55-1)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 0 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: 1 },
            break2End: { '@class': 'CdsPosition', pos: 55, offset: -1 },
            break1Repr: 'c.3',
            break2Repr: 'c.(5+1_55-1)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication spans a range uncertain start and end', () => {
        const notation = 'FEATURE:c.(1_3)_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CdsPosition', pos: 1, offset: 0 },
            break1End: { '@class': 'CdsPosition', pos: 3, offset: 0 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: 0 },
            break2End: { '@class': 'CdsPosition', pos: 7, offset: 0 },
            break1Repr: 'c.(1_3)',
            break2Repr: 'c.(5_7)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('duplication has a reference sequence', () => {
        const notation = 'FEATURE:c.3_5dupTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CdsPosition', pos: 3, offset: 0 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: 0 },
            break1Repr: 'c.3',
            break2Repr: 'c.5',
            refSeq: 'TAA',
            untemplatedSeq: 'TAA',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('basic substitution', () => {
        const notation = 'FEATURE:c.4A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'CdsPosition', pos: 4, offset: 0 },
            break1Repr: 'c.4',
            refSeq: 'A',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('substitution with uncertainty', () => {
        const notation = 'FEATURE:c.(4_7)A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'CdsPosition', pos: 4, offset: 0 },
            break1End: { '@class': 'CdsPosition', pos: 7, offset: 0 },
            break1Repr: 'c.(4_7)',
            refSeq: 'A',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel spans a range uncertain start and end ref and alt specified', () => {
        const notation = 'FEATURE:c.(1_3)_(5_7)delTAAinsACG';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'CdsPosition', pos: 1, offset: 0 },
            break1End: { '@class': 'CdsPosition', pos: 3, offset: 0 },
            break2Start: { '@class': 'CdsPosition', pos: 5, offset: 0 },
            break2End: { '@class': 'CdsPosition', pos: 7, offset: 0 },
            break1Repr: 'c.(1_3)',
            break2Repr: 'c.(5_7)',
            refSeq: 'TAA',
            untemplatedSeq: 'ACG',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel ref specified', () => {
        const notation = 'FEATURE:c.10delTins';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'CdsPosition', pos: 10, offset: 0 },
            break1Repr: 'c.10',
            refSeq: 'T',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('indel alt specified', () => {
        const notation = 'FEATURE:c.10delinsACC';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: { '@class': 'CdsPosition', pos: 10, offset: 0 },
            break1Repr: 'c.10',
            untemplatedSeq: 'ACC',
            untemplatedSeqSize: 3,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe(notation);
    });

    test('substitution before the coding sequence', () => {
        const notation = 'FEATURE:c.-124C>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'CdsPosition', pos: 1, offset: -124 },
            break1Repr: 'c.1-124',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            refSeq: 'C',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
        expect(result.toString()).toBe('FEATURE:c.1-124C>T');
    });
});

describe('exonic', () => {
    test('errors because exon cannot have substitution type', () => {
        expect(() => { parse('FEATURE:e.1C>T'); }).toThrowError(ParsingError);
    });

    test('errors because exon cannot have protein-style substitution type', () => {
        expect(() => { parse('FEATURE:e.C1T'); }).toThrowError(ParsingError);
    });

    test('duplication single exon', () => {
        const notation = 'FEATURE:e.1dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break1Repr: 'e.1',
            reference1: 'FEATURE',
        });
    });

    test('duplication single exon with uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break1End: { '@class': 'ExonicPosition', pos: 2 },
            break1Repr: 'e.(1_2)',
            reference1: 'FEATURE',
        });
    });

    test('duplication of multiple exons', () => {
        const notation = 'FEATURE:e.1_3dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break2Start: { '@class': 'ExonicPosition', pos: 3 },
            break1Repr: 'e.1',
            break2Repr: 'e.3',
            reference1: 'FEATURE',
        });
    });

    test('duplication of multiple exons with uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)_(3_4)dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break1End: { '@class': 'ExonicPosition', pos: 2 },
            break1Repr: 'e.(1_2)',
            break2Start: { '@class': 'ExonicPosition', pos: 3 },
            break2End: { '@class': 'ExonicPosition', pos: 4 },
            break2Repr: 'e.(3_4)',
            reference1: 'FEATURE',
        });
    });

    test('duplication of multiple exons with break1 uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)_4dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 1 },
            break1End: { '@class': 'ExonicPosition', pos: 2 },
            break1Repr: 'e.(1_2)',
            break2Start: { '@class': 'ExonicPosition', pos: 4 },
            break2Repr: 'e.4',
            reference1: 'FEATURE',
        });
    });

    test('duplication of multiple exons with break2 uncertainty', () => {
        const notation = 'FEATURE:e.2_(3_4)dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'ExonicPosition', pos: 2 },
            break1Repr: 'e.2',
            break2Start: { '@class': 'ExonicPosition', pos: 3 },
            break2End: { '@class': 'ExonicPosition', pos: 4 },
            break2Repr: 'e.(3_4)',
            reference1: 'FEATURE',
        });
    });
});

describe('protein', () => {
    test('splice site variant', () => {
        const notation = 'FEATURE:p.W288spl';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.type).toBe('splice-site');
    });

    test('case insensitive frameshift', () => {
        // civic example
        const notation = 'FEATURE:p.W288FS';
        const result = parse(notation);
        expect(result.toString()).toBe('FEATURE:p.W288fs');
        expect(result.type).toBe('frameshift');
    });

    test('lowercase substitution', () => {
        const notation = 'FEATURE:p.D816N';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.untemplatedSeq).toBe('N');
        expect(result.type).toBe('substitution');
        expect(result.refSeq).toBe('D');
    });

    test('substitution no alt', () => {
        const notation = 'FEATURE:p.D816';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.refSeq).toBe('D');
        expect(result.type).toBe('substitution');
    });

    test('frameshift alt specified', () => {
        const notation = 'FEATURE:p.R10Kfs';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            untemplatedSeq: 'K',
            break1Repr: 'p.R10',
            refSeq: 'R',
            untemplatedSeqSize: 1,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('frameshift alt specified and truncation point', () => {
        const notation = 'FEATURE:p.R10Kfs*10';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            untemplatedSeq: 'K',
            untemplatedSeqSize: 1,
            truncation: 10,
            refSeq: 'R',
            break1Repr: 'p.R10',
            reference1: 'FEATURE',
        });
    });

    test('parses 3 letter amino acids for protein frameshift', () => {
        const notation = 'FEATURE:p.Arg10Lysfs*10';
        const result = parse(notation);
        expect(result.toString()).toBe('FEATURE:p.R10Kfs*10');
    });

    test('parses 3 letter amino acids for reference sequence', () => {
        const notation = 'FEATURE:p.Arg10_Lys12delArgGluLysinsLeu';
        const result = parse(notation);
        expect(result.toString()).toBe('FEATURE:p.R10_K12delREKinsL');
    });

    test('frameshift truncation conflict error', () => {
        expect(() => {
            parse('FEATURE:p.R10*fs*10');
        }).toThrowError('conflict');
    });

    test('frameshift set null on truncation point without position', () => {
        const notation = 'FEATURE:p.R10Kfs*';
        const result = parse(notation);
        expect(result.toString()).toBe('FEATURE:p.R10Kfs');
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            untemplatedSeq: 'K',
            untemplatedSeqSize: 1,
            truncation: null,
            refSeq: 'R',
            break1Repr: 'p.R10',
            reference1: 'FEATURE',
        });
    });

    test('frameshift immeadiate truncation', () => {
        const notation = 'FEATURE:p.R10*fs';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        expect(result.toJSON()).toEqual({
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            untemplatedSeq: '*',
            untemplatedSeqSize: 1,
            truncation: 1,
            refSeq: 'R',
            break1Repr: 'p.R10',
            reference1: 'FEATURE',
        });
    });

    test('frameshift errors on range', () => {
        expect(() => { parse('FEATURE:p.R10_M11Kfs*'); }).toThrowError(ParsingError);
    });

    test('frameshift allows uncertain range', () => {
        const notation = 'FEATURE:p.(R10_M11)fs*10';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            break1End: { '@class': 'ProteinPosition', pos: 11, refAA: 'M' },
            break1Repr: 'p.(R10_M11)',
            truncation: 10,
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('frameshift no alt but truncation point specified', () => {
        const notation = 'FEATURE:p.R10fs*10';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            break1Repr: 'p.R10',
            truncation: 10,
            refSeq: 'R',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('frameshift no alt or truncation point', () => {
        const notation = 'FEATURE:p.R10fs';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: { '@class': 'ProteinPosition', pos: 10, refAA: 'R' },
            break1Repr: 'p.R10',
            refSeq: 'R',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('missense mutation', () => {
        const notation = 'FEATURE:p.F12G';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: { '@class': 'ProteinPosition', pos: 12, refAA: 'F' },
            break1Repr: 'p.F12',
            untemplatedSeq: 'G',
            untemplatedSeqSize: 1,
            refSeq: 'F',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('errors on genomic style missense', () => {
        expect(() => { parse('p.G12G>T'); }).toThrowError(ParsingError);
    });

    test('extension without alt AA', () => {
        const notation = 'p.*807ext';
        const result = parse(notation, false);
        expect(result).toHaveProperty('type', NOTATION_TO_TYPES.ext);
        expect(result).toHaveProperty('untemplatedSeq', undefined);
        expect(result).toHaveProperty('truncation', undefined);
        expect(result.toString()).toBe(notation);
    });

    test('extension without alt AA with new truncation', () => {
        const notation = 'p.*807ext*101';
        const result = parse(notation, false);
        expect(result).toHaveProperty('type', NOTATION_TO_TYPES.ext);
        expect(result).toHaveProperty('untemplatedSeq', undefined);
        expect(result).toHaveProperty('truncation', 101);
        expect(result.toString()).toBe(notation);
    });

    test('extension with alt AA', () => {
        const notation = 'p.*807Lext';
        const result = parse(notation, false);
        expect(result).toHaveProperty('type', NOTATION_TO_TYPES.ext);
        expect(result).toHaveProperty('untemplatedSeq', 'L');
        expect(result).toHaveProperty('truncation', undefined);
        expect(result.toString()).toBe(notation);
    });

    test('extension with alt AA and new truncation', () => {
        const notation = 'p.*807Lext*101';
        const result = parse(notation, false);
        expect(result).toHaveProperty('type', NOTATION_TO_TYPES.ext);
        expect(result).toHaveProperty('untemplatedSeq', 'L');
        expect(result).toHaveProperty('truncation', 101);
        expect(result.toString()).toBe(notation);
    });

    test('extension with new truncation position not specified', () => {
        const notation = 'p.*661Lext*?';
        const result = parse(notation, false);
        expect(result).toHaveProperty('type', NOTATION_TO_TYPES.ext);
        expect(result).toHaveProperty('untemplatedSeq', 'L');
        expect(result).toHaveProperty('truncation', null);
        expect(result.toString()).toBe('p.*661Lext');
    });
});

describe('cytoband', () => {
    test('errors because cytoband variant cannot have ins type', () => {
        expect(() => { parse('FEATURE:y.p12.1ins'); }).toThrowError(ParsingError);
        expect(() => { parse('FEATURE:y.p12.1_p13ins'); }).toThrowError(ParsingError);
    });

    test('errors because cytoband variant cannot have delins type', () => {
        expect(() => { parse('FEATURE:y.p12.1delins'); }).toThrowError(ParsingError);
        expect(() => { parse('FEATURE:y.p12.1_p13delins'); }).toThrowError(ParsingError);
    });

    test('errors because cytoband variant cannot have > type', () => {
        expect(() => { parse('FEATURE:y.p12.1G>T'); }).toThrowError(ParsingError);
        expect(() => { parse('FEATURE:y.Gp12.1T'); }).toThrowError(ParsingError);
    });

    test('errors because cytoband variant cannot have fs type', () => {
        expect(() => { parse('FEATURE:y.p12.1fs'); }).toThrowError(ParsingError);
        expect(() => { parse('FEATURE:y.(p12.1_p13)fs'); }).toThrowError(ParsingError);
    });

    test('copy gain', () => {
        const notation = '12:y.q13_q14copygain';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: 'copy gain',
            break1Start: { '@class': 'CytobandPosition', arm: 'q', majorBand: 13 },
            break2Start: { '@class': 'CytobandPosition', arm: 'q', majorBand: 14 },
            break1Repr: 'y.q13',
            break2Repr: 'y.q14',
            reference1: '12',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication of whole p arm', () => {
        const notation = 'FEATURE:y.pdup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CytobandPosition', arm: 'p' },
            break1Repr: 'y.p',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication of range on p major band', () => {
        const notation = 'FEATURE:y.p11dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CytobandPosition', arm: 'p', majorBand: 11 },
            break1Repr: 'y.p11',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication of range on p minor band', () => {
        const notation = 'FEATURE:y.p11.1dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 1,
            },
            break1Repr: 'y.p11.1',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication of range on p arm', () => {
        const notation = 'FEATURE:y.p11.1_p13.3dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 1,
            },
            break1Repr: 'y.p11.1',
            break2Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 13, minorBand: 3,
            },
            break2Repr: 'y.p13.3',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication on p arm uncertain positions', () => {
        const notation = 'FEATURE:y.(p11.1_p11.2)_(p13.4_p14)dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 1,
            },
            break1End: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 2,
            },
            break1Repr: 'y.(p11.1_p11.2)',
            break2Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 13, minorBand: 4,
            },
            break2End: { '@class': 'CytobandPosition', arm: 'p', majorBand: 14 },
            break2Repr: 'y.(p13.4_p14)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication on p arm uncertain start', () => {
        const notation = 'FEATURE:y.(p11.1_p11.2)_p13.3dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 1,
            },
            break1End: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 2,
            },
            break1Repr: 'y.(p11.1_p11.2)',
            break2Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 13, minorBand: 3,
            },
            break2Repr: 'y.p13.3',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication on p arm uncertain end', () => {
        const notation = 'FEATURE:y.p13.3_(p15.1_p15.2)dup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 13, minorBand: 3,
            },
            break1Repr: 'y.p13.3',
            break2Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 15, minorBand: 1,
            },
            break2End: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 15, minorBand: 2,
            },
            break2Repr: 'y.(p15.1_p15.2)',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('duplication of whole q arm', () => {
        const notation = 'FEATURE:y.qdup';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: { '@class': 'CytobandPosition', arm: 'q' },
            break1Repr: 'y.q',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('deletion of whole p arm', () => {
        const notation = 'FEATURE:y.pdel';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: { '@class': 'CytobandPosition', arm: 'p' },
            break1Repr: 'y.p',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });

    test('inversion of a range on the p arm', () => {
        const notation = 'FEATURE:y.p11.1_p13.3inv';
        const result = parse(notation);
        expect(result.toString()).toBe(notation);
        const exp = {
            type: NOTATION_TO_TYPES.inv,
            break1Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 11, minorBand: 1,
            },
            break2Start: {
                '@class': 'CytobandPosition', arm: 'p', majorBand: 13, minorBand: 3,
            },
            break1Repr: 'y.p11.1',
            break2Repr: 'y.p13.3',
            reference1: 'FEATURE',
        };
        expect(result.toJSON()).toEqual(exp);
    });
});

test('error on short string', () => {
    expect(() => { parse(''); }).toThrowError(ParsingError);
});

test('errors on bad prefix', () => {
    expect(() => { parse('FEATURE:f.G12D'); }).toThrowError(ParsingError);
});

test('errors on missing . delimiter after prefix', () => {
    expect(() => { parse('FEATURE:pG12D'); }).toThrowError(ParsingError);
});