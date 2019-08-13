

const {expect} = require('chai');
const {
    parse
} = require('../app/variant');
const {
    NOTATION_TO_TYPES
} = require('../app/constants');

describe('multi-feature notation', () => {
    describe('throws an error on', () => {
        it('short string', () => {
            expect(() => {
                parse('');
            }).to.throw('Too short.');
        });
        it('missing opening bracket', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):transe.1,e.2)');
            }).to.throw('Missing opening');
        });
        it('missing closing bracket', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.1,e.2');
            }).to.throw('Missing closing');
        });
        it('missing variant type', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):(e.1,e.2)');
            }).to.throw('Variant type was not specified');
        });
        it('invalid variant type', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):blargh(e.1,e.2)');
            }).to.throw('Variant type (blargh) not recognized');
        });
        it('missing prefix', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(1,2)');
            }).to.throw('Error in parsing the first breakpoint');
        });
        it('invalid prefix', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(k.1,e.2)');
            }).to.throw('Error in parsing the first breakpoint');
        });
        it('multiple commas', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.1,e.2,e.3)');
            }).to.throw('Single comma expected');
        });
        it('missing comma', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):trans(e.123)');
            }).to.throw('Missing comma');
        });
        it('bad first breakpoint', () => {
            expect(() => {
                const notation = '(FEATURE1,FEATURE2):trans(e.123k,e.1234)';
                const result = parse(notation);
                console.log(result);
            }).to.throw('Error in parsing the first breakpoint');
        });
        it('bad second breakpoint', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):fusion(e.123,e.123k)');
            }).to.throw('Error in parsing the second breakpoint');
        });
        it('insertion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):ins(e.123,e.124)');
            }).to.throw('Continuous notation is preferred');
        });
        it('indel types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):delins(e.123,e.123)');
            }).to.throw('Continuous notation is preferred');
        });
        it('inversion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):inv(e.123,e.123)');
            }).to.throw('Continuous notation is preferred');
        });
        it('deletion types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):del(e.123,e.123)');
            }).to.throw('Continuous notation is preferred');
        });
        it('duplication types', () => {
            expect(() => {
                parse('(FEATURE1,FEATURE2):dup(e.123,e.123)');
            }).to.throw('Continuous notation is preferred');
        });
    });
    it('parses exon gene fusion', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).to.eql({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: {'@class': 'ExonicPosition', pos: 1},
            break2Start: {'@class': 'ExonicPosition', pos: 2},
            type: NOTATION_TO_TYPES.fusion,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2'
        });
        expect(parsed.toString()).to.equal(notation);
    });
    it('parses genomic translocation', () => {
        const notation = '(FEATURE1,FEATURE2):trans(g.1,g.2)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).to.eql({
            break1Repr: 'g.1',
            break2Repr: 'g.2',
            break1Start: {'@class': 'GenomicPosition', pos: 1},
            break2Start: {'@class': 'GenomicPosition', pos: 2},
            type: NOTATION_TO_TYPES.trans,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2'
        });
        expect(parsed.toString()).to.equal(notation);
    });
    it('parses untemplated sequence', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)ATGC';
        const parsed = parse(notation);
        expect(parsed.toJSON()).to.eql({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: {'@class': 'ExonicPosition', pos: 1},
            break2Start: {'@class': 'ExonicPosition', pos: 2},
            type: NOTATION_TO_TYPES.fusion,
            untemplatedSeq: 'ATGC',
            untemplatedSeqSize: 4,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2'
        });
        expect(parsed.toString()).to.equal(notation);
    });
    it('parses non-specific untemplated sequence', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1,e.2)5';
        const parsed = parse(notation);
        expect(parsed.toJSON()).to.eql({
            break1Repr: 'e.1',
            break2Repr: 'e.2',
            break1Start: {'@class': 'ExonicPosition', pos: 1},
            break2Start: {'@class': 'ExonicPosition', pos: 2},
            type: NOTATION_TO_TYPES.fusion,
            untemplatedSeqSize: 5,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2'
        });
        expect(parsed.toString()).to.equal(notation);
    });
    it('parses breakpoint ranges', () => {
        const notation = '(FEATURE1,FEATURE2):fusion(e.1_17,e.20_28)';
        const parsed = parse(notation);
        expect(parsed.toJSON()).to.eql({
            break1Repr: 'e.1_17',
            break2Repr: 'e.20_28',
            break1Start: {'@class': 'ExonicPosition', pos: 1},
            break1End: {'@class': 'ExonicPosition', pos: 17},
            break2Start: {'@class': 'ExonicPosition', pos: 20},
            break2End: {'@class': 'ExonicPosition', pos: 28},
            type: NOTATION_TO_TYPES.fusion,
            reference1: 'FEATURE1',
            reference2: 'FEATURE2'
        });
        expect(parsed.toString()).to.equal(notation);
    });
});
