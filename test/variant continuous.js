

const {expect} = require('chai');
const {ParsingError} = require('../app/error');
const {
    parse
} = require('../app/variant');
const {
    GenomicPosition,
    ProteinPosition,
    CdsPosition,
    CytobandPosition,
    ExonicPosition
} = require('../app/position');
const {
    NOTATION_TO_TYPES
} = require('../app/constants');


describe('genomic', () => {
    it('deletion single bp', () => {
        const notation = 'FEATURE:g.3del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new GenomicPosition({pos: 3}),
            break1Repr: 'g.3',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('deletion spans a range', () => {
        const notation = 'FEATURE:g.3_5del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('deletion has a reference sequence', () => {
        const notation = 'FEATURE:g.3_5delTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            refSeq: 'TAA',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain start', () => {
        const notation = 'FEATURE:g.(3_4)_5dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new GenomicPosition({pos: 3}),
            break1End: new GenomicPosition({pos: 4}),
            break2Start: new GenomicPosition({pos: 5}),
            break1Repr: 'g.(3_4)',
            break2Repr: 'g.5',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain end', () => {
        const notation = 'FEATURE:g.3_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break2End: new GenomicPosition({pos: 7}),
            break1Repr: 'g.3',
            break2Repr: 'g.(5_7)',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain start and end', () => {
        const notation = 'FEATURE:g.(1_3)_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new GenomicPosition({pos: 1}),
            break1End: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break2End: new GenomicPosition({pos: 7}),
            break1Repr: 'g.(1_3)',
            break2Repr: 'g.(5_7)',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication has a reference sequence', () => {
        const notation = 'FEATURE:g.3_5dupTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break1Repr: 'g.3',
            break2Repr: 'g.5',
            untemplatedSeq: 'TAA',
            refSeq: 'TAA',
            untemplatedSeqSize: 3,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('basic substitution', () => {
        const notation = 'FEATURE:g.4A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new GenomicPosition({pos: 4}),
            break1Repr: 'g.4',
            untemplatedSeq: 'T',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('substitution with alt seq options', () => {
        const notation = 'FEATURE:g.4A>T^C';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new GenomicPosition({pos: 4}),
            break1Repr: 'g.4',
            untemplatedSeq: 'T^C',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('substitution with uncertainty', () => {
        const notation = 'FEATURE:g.(4_7)A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new GenomicPosition({pos: 4}),
            break1End: new GenomicPosition({pos: 7}),
            break1Repr: 'g.(4_7)',
            untemplatedSeq: 'T',
            refSeq: 'A',
            untemplatedSeqSize: 1,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel spans a range uncertain start and end ref and alt specified', () => {
        const notation = 'FEATURE:g.(1_3)_(5_7)delTAAinsACG';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new GenomicPosition({pos: 1}),
            break1End: new GenomicPosition({pos: 3}),
            break2Start: new GenomicPosition({pos: 5}),
            break2End: new GenomicPosition({pos: 7}),
            break1Repr: 'g.(1_3)',
            break2Repr: 'g.(5_7)',
            untemplatedSeq: 'ACG',
            refSeq: 'TAA',
            untemplatedSeqSize: 3,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel ref specified', () => {
        const notation = 'FEATURE:g.10delTins';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new GenomicPosition({pos: 10}),
            break1Repr: 'g.10',
            refSeq: 'T',
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel alt specified', () => {
        const notation = 'FEATURE:g.10delinsACC';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new GenomicPosition({pos: 10}),
            break1Repr: 'g.10',
            untemplatedSeq: 'ACC',
            untemplatedSeqSize: 3,
            prefix: 'g',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('errors on protein style missense', () => {
        expect(() => { parse('FEATURE:g.15T'); }).to.throw(ParsingError);
    });
});

describe('coding sequence', () => {
    it('deletion single bp', () => {
        const notation = 'FEATURE:c.3+1del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new CdsPosition({pos: 3, offset: 1}),
            break1Repr: 'c.3+1',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('deletion spans a range', () => {
        const notation = 'FEATURE:c.3+1_5-2del';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new CdsPosition({pos: 3, offset: 1}),
            break2Start: new CdsPosition({pos: 5, offset: -2}),
            break1Repr: 'c.3+1',
            break2Repr: 'c.5-2',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('deletion has a reference sequence', () => {
        const notation = 'FEATURE:c.3_5delTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new CdsPosition({pos: 3, offset: 0}),
            break2Start: new CdsPosition({pos: 5, offset: 0}),
            break1Repr: 'c.3',
            break2Repr: 'c.5',
            refSeq: 'TAA',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain start', () => {
        const notation = 'FEATURE:c.(3+1_4-1)_10dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CdsPosition({pos: 3, offset: 1}),
            break1End: new CdsPosition({pos: 4, offset: -1}),
            break2Start: new CdsPosition({pos: 10, offset: 0}),
            break1Repr: 'c.(3+1_4-1)',
            break2Repr: 'c.10',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain end', () => {
        const notation = 'FEATURE:c.3_(5+1_55-1)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CdsPosition({pos: 3, offset: 0}),
            break2Start: new CdsPosition({pos: 5, offset: 1}),
            break2End: new CdsPosition({pos: 55, offset: -1}),
            break1Repr: 'c.3',
            break2Repr: 'c.(5+1_55-1)',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication spans a range uncertain start and end', () => {
        const notation = 'FEATURE:c.(1_3)_(5_7)dup';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CdsPosition({pos: 1, offset: 0}),
            break1End: new CdsPosition({pos: 3, offset: 0}),
            break2Start: new CdsPosition({pos: 5, offset: 0}),
            break2End: new CdsPosition({pos: 7, offset: 0}),
            break1Repr: 'c.(1_3)',
            break2Repr: 'c.(5_7)',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('duplication has a reference sequence', () => {
        const notation = 'FEATURE:c.3_5dupTAA';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CdsPosition({pos: 3, offset: 0}),
            break2Start: new CdsPosition({pos: 5, offset: 0}),
            break1Repr: 'c.3',
            break2Repr: 'c.5',
            refSeq: 'TAA',
            untemplatedSeq: 'TAA',
            untemplatedSeqSize: 3,
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('basic substitution', () => {
        const notation = 'FEATURE:c.4A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new CdsPosition({pos: 4, offset: 0}),
            break1Repr: 'c.4',
            refSeq: 'A',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('substitution with uncertainty', () => {
        const notation = 'FEATURE:c.(4_7)A>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new CdsPosition({pos: 4, offset: 0}),
            break1End: new CdsPosition({pos: 7, offset: 0}),
            break1Repr: 'c.(4_7)',
            refSeq: 'A',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel spans a range uncertain start and end ref and alt specified', () => {
        const notation = 'FEATURE:c.(1_3)_(5_7)delTAAinsACG';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new CdsPosition({pos: 1, offset: 0}),
            break1End: new CdsPosition({pos: 3, offset: 0}),
            break2Start: new CdsPosition({pos: 5, offset: 0}),
            break2End: new CdsPosition({pos: 7, offset: 0}),
            break1Repr: 'c.(1_3)',
            break2Repr: 'c.(5_7)',
            refSeq: 'TAA',
            untemplatedSeq: 'ACG',
            untemplatedSeqSize: 3,
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel ref specified', () => {
        const notation = 'FEATURE:c.10delTins';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new CdsPosition({pos: 10, offset: 0}),
            break1Repr: 'c.10',
            refSeq: 'T',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('indel alt specified', () => {
        const notation = 'FEATURE:c.10delinsACC';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES.delins,
            break1Start: new CdsPosition({pos: 10, offset: 0}),
            break1Repr: 'c.10',
            untemplatedSeq: 'ACC',
            untemplatedSeqSize: 3,
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).eql(exp);
        expect(result.toString()).to.equal(notation);
    });
    it('substitution before the coding sequence', () => {
        const notation = 'FEATURE:c.-124C>T';
        const result = parse(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new CdsPosition({pos: 1, offset: -124}),
            break1Repr: 'c.1-124',
            untemplatedSeq: 'T',
            untemplatedSeqSize: 1,
            refSeq: 'C',
            prefix: 'c',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
        expect(result.toString()).to.equal('FEATURE:c.1-124C>T');
    });
});

describe('exonic', () => {
    it('errors because exon cannot have substitution type', () => {
        expect(() => { parse('FEATURE:e.1C>T'); }).to.throw(ParsingError)
            .that.has.property('content')
            .that.has.property('violatedAttr', 'type');
    });
    it('errors because exon cannot have protein-style substitution type', () => {
        expect(() => { parse('FEATURE:e.C1T'); }).to.throw(ParsingError)
            .that.has.property('content')
            .that.has.property('violatedAttr', 'break1');
    });
    it('duplication single exon', () => {
        const notation = 'FEATURE:e.1dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 1}),
            break1Repr: 'e.1',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('duplication single exon with uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 1}),
            break1End: new ExonicPosition({pos: 2}),
            break1Repr: 'e.(1_2)',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('duplication of multiple exons', () => {
        const notation = 'FEATURE:e.1_3dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 1}),
            break2Start: new ExonicPosition({pos: 3}),
            break1Repr: 'e.1',
            break2Repr: 'e.3',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('duplication of multiple exons with uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)_(3_4)dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 1}),
            break1End: new ExonicPosition({pos: 2}),
            break1Repr: 'e.(1_2)',
            break2Start: new ExonicPosition({pos: 3}),
            break2End: new ExonicPosition({pos: 4}),
            break2Repr: 'e.(3_4)',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('duplication of multiple exons with uncertainty', () => {
        const notation = 'FEATURE:e.(1_2)_4dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 1}),
            break1End: new ExonicPosition({pos: 2}),
            break1Repr: 'e.(1_2)',
            break2Start: new ExonicPosition({pos: 4}),
            break2Repr: 'e.4',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('duplication of multiple exons with uncertainty', () => {
        const notation = 'FEATURE:e.2_(3_4)dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.dup,
            break1Start: new ExonicPosition({pos: 2}),
            break1Repr: 'e.2',
            break2Start: new ExonicPosition({pos: 3}),
            break2End: new ExonicPosition({pos: 4}),
            break2Repr: 'e.(3_4)',
            prefix: 'e',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
});

describe('protein', () => {
    it('splice site variant', () => {
        const notation = 'FEATURE:p.W288spl';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result.type).to.equal('splice-site');
    });
    it('case insensitive frameshift', () => {
        // civic example
        const notation = 'FEATURE:p.W288FS';
        const result = parse(notation);
        expect(result.toString()).to.equal('FEATURE:p.W288fs');
        expect(result.type).to.equal('frameshift');
    });
    it('lowercase substitution', () => {
        const notation = 'FEATURE:p.D816N';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result.untemplatedSeq).to.equal('N');
        expect(result.type).to.equal('substitution');
        expect(result.refSeq).to.equal('D');
    });
    it('substitution no alt', () => {
        const notation = 'FEATURE:p.D816';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result.refSeq).to.equal('D');
        expect(result.type).to.equal('substitution');
    });
    it('frameshift alt specified', () => {
        const notation = 'FEATURE:p.R10Kfs';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            untemplatedSeq: 'K',
            break1Repr: 'p.R10',
            refSeq: 'R',
            untemplatedSeqSize: 1,
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('frameshift alt specified and truncation point', () => {
        const notation = 'FEATURE:p.R10Kfs*10';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            untemplatedSeq: 'K',
            untemplatedSeqSize: 1,
            truncation: 10,
            refSeq: 'R',
            break1Repr: 'p.R10',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('parses 3 letter amino acids for protein frameshift', () => {
        const notation = 'FEATURE:p.Arg10Lysfs*10';
        const result = parse(notation);
        expect(result.toString()).to.equal('FEATURE:p.R10Kfs*10');
    });
    it('parses 3 letter amino acids for reference sequence', () => {
        const notation = 'FEATURE:p.Arg10_Lys12delArgGluLysinsLeu';
        const result = parse(notation);
        expect(result.toString()).to.equal('FEATURE:p.R10_K12delREKinsL');
    });
    it('frameshift truncation conflict error', () => {
        expect(() => {
            parse('FEATURE:p.R10*fs*10');
        }).to.throw('conflict')
            .that.has.property('content')
            .that.has.property('violatedAttr', 'truncation');
    });
    it('frameshift set null on truncation point without position', () => {
        const notation = 'FEATURE:p.R10Kfs*';
        const result = parse(notation);
        expect(result.toString()).to.equal('FEATURE:p.R10Kfs');
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            untemplatedSeq: 'K',
            untemplatedSeqSize: 1,
            truncation: null,
            refSeq: 'R',
            break1Repr: 'p.R10',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('frameshift immeadiate truncation', () => {
        const notation = 'FEATURE:p.R10*fs';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        expect(result).to.eql({
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            untemplatedSeq: '*',
            untemplatedSeqSize: 1,
            truncation: 1,
            refSeq: 'R',
            break1Repr: 'p.R10',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        });
    });
    it('frameshift errors on range', () => {
        expect(() => { const result = parse('FEATURE:p.R10_M11Kfs*'); console.log(result); }).to.throw(ParsingError);
    });
    it('frameshift allows uncertain range', () => {
        const notation = 'FEATURE:p.(R10_M11)fs*10';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            break1End: new ProteinPosition({pos: 11, refAA: 'M'}),
            break1Repr: 'p.(R10_M11)',
            truncation: 10,
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('frameshift no alt but truncation point specified', () => {
        const notation = 'FEATURE:p.R10fs*10';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            break1Repr: 'p.R10',
            truncation: 10,
            refSeq: 'R',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('frameshift no alt or truncation point', () => {
        const notation = 'FEATURE:p.R10fs';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.fs,
            break1Start: new ProteinPosition({pos: 10, refAA: 'R'}),
            break1Repr: 'p.R10',
            refSeq: 'R',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('missense mutation', () => {
        const notation = 'FEATURE:p.F12G';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES['>'],
            break1Start: new ProteinPosition({pos: 12, refAA: 'F'}),
            break1Repr: 'p.F12',
            untemplatedSeq: 'G',
            untemplatedSeqSize: 1,
            refSeq: 'F',
            prefix: 'p',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('errors on genomic style missense', () => {
        expect(() => { parse('p.G12G>T'); }).to.throw(ParsingError);
    });
    it('extension without alt AA', () => {
        const notation = 'p.*807ext';
        const result = parse(notation, false);
        console.log(result);
        expect(result).to.have.property('type', NOTATION_TO_TYPES.ext);
        expect(result.toString()).to.equal(notation);
    });
    it('extnesion without alt AA with new truncation', () => {
        const notation = 'p.*807ext*101';
        const result = parse(notation, false);
        expect(result).to.have.property('type', NOTATION_TO_TYPES.ext);
        expect(result).to.have.property('untemplatedSeq', null);
        expect(result).to.have.property('truncation', 101);
        expect(result.toString()).to.equal(notation);
    });
    it('extension with alt AA', () => {
        const notation = 'p.*807Lext';
        const result = parse(notation, false);
        expect(result).to.have.property('type', NOTATION_TO_TYPES.ext);
        expect(result).to.have.property('untemplatedSeq', 'L');
        expect(result).to.have.property('truncation', 101);
        expect(result.toString()).to.equal(notation);
    });
    it('extension with alt AA and new truncation', () => {
        const notation = 'p.*807Lext*101';
        const result = parse(notation, false);
        expect(result).to.have.property('type', NOTATION_TO_TYPES.ext);
        expect(result).to.have.property('untemplatedSeq', 'L');
        expect(result).to.have.property('truncation', 101);
        expect(result.toString()).to.equal(notation);
    });
});

describe('cytoband', () => {
    it('errors because cytoband variant cannot have ins type', () => {
        expect(() => { parse('FEATURE:y.p12.1ins'); }).to.throw(ParsingError);
        expect(() => { parse('FEATURE:y.p12.1_p13ins'); }).to.throw(ParsingError);
    });
    it('errors because cytoband variant cannot have delins type', () => {
        expect(() => { parse('FEATURE:y.p12.1delins'); }).to.throw(ParsingError);
        expect(() => { parse('FEATURE:y.p12.1_p13delins'); }).to.throw(ParsingError);
    });
    it('errors because cytoband variant cannot have > type', () => {
        expect(() => { parse('FEATURE:y.p12.1G>T'); }).to.throw(ParsingError);
        expect(() => { parse('FEATURE:y.Gp12.1T'); }).to.throw(ParsingError);
    });
    it('errors because cytoband variant cannot have fs type', () => {
        expect(() => { parse('FEATURE:y.p12.1fs'); }).to.throw(ParsingError);
        expect(() => { parse('FEATURE:y.(p12.1_p13)fs'); }).to.throw(ParsingError);
    });
    it('duplication of whole p arm', () => {
        const notation = 'FEATURE:y.pdup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p'}),
            break1Repr: 'y.p',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication of range on p major band', () => {
        const notation = 'FEATURE:y.p11dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11}),
            break1Repr: 'y.p11',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication of range on p minor band', () => {
        const notation = 'FEATURE:y.p11.1dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 1}),
            break1Repr: 'y.p11.1',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication of range on p arm', () => {
        const notation = 'FEATURE:y.p11.1_p13.3dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 1}),
            break1Repr: 'y.p11.1',
            break2Start: new CytobandPosition({arm: 'p', majorBand: 13, minorBand: 3}),
            break2Repr: 'y.p13.3',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication on p arm uncertain positions', () => {
        const notation = 'FEATURE:y.(p11.1_p11.2)_(p13.4_p14)dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 1}),
            break1End: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 2}),
            break1Repr: 'y.(p11.1_p11.2)',
            break2Start: new CytobandPosition({arm: 'p', majorBand: 13, minorBand: 4}),
            break2End: new CytobandPosition({arm: 'p', majorBand: 14}),
            break2Repr: 'y.(p13.4_p14)',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication on p arm uncertain start', () => {
        const notation = 'FEATURE:y.(p11.1_p11.2)_p13.3dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 1}),
            break1End: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 2}),
            break1Repr: 'y.(p11.1_p11.2)',
            break2Start: new CytobandPosition({arm: 'p', majorBand: 13, minorBand: 3}),
            break2Repr: 'y.p13.3',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication on p arm uncertain end', () => {
        const notation = 'FEATURE:y.p13.3_(p15.1_p15.2)dup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 13, minorBand: 3}),
            break1Repr: 'y.p13.3',
            break2Start: new CytobandPosition({arm: 'p', majorBand: 15, minorBand: 1}),
            break2End: new CytobandPosition({arm: 'p', majorBand: 15, minorBand: 2}),
            break2Repr: 'y.(p15.1_p15.2)',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('duplication of whole q arm', () => {
        const notation = 'FEATURE:y.qdup';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.dup,
            break1Start: new CytobandPosition({arm: 'q'}),
            break1Repr: 'y.q',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('deletion of whole p arm', () => {
        const notation = 'FEATURE:y.pdel';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.del,
            break1Start: new CytobandPosition({arm: 'p'}),
            break1Repr: 'y.p',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
    it('inversion of a range on the p arm', () => {
        const notation = 'FEATURE:y.p11.1_p13.3inv';
        const result = parse(notation);
        expect(result.toString()).to.equal(notation);
        const exp = {
            type: NOTATION_TO_TYPES.inv,
            break1Start: new CytobandPosition({arm: 'p', majorBand: 11, minorBand: 1}),
            break2Start: new CytobandPosition({arm: 'p', majorBand: 13, minorBand: 3}),
            break1Repr: 'y.p11.1',
            break2Repr: 'y.p13.3',
            prefix: 'y',
            reference1: 'FEATURE',
            multiFeature: false,
            noFeatures: false
        };
        expect(result).to.eql(exp);
    });
});

it('error on short string', () => {
    expect(() => { parse(''); }).to.throw(ParsingError);
});
it('errors on bad prefix', () => {
    expect(() => { parse('FEATURE:f.G12D'); }).to.throw(ParsingError);
});
it('errors on missing . delimiter after prefix', () => {
    expect(() => { parse('FEATURE:pG12D'); }).to.throw(ParsingError);
});
