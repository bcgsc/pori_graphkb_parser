

const {expect} = require('chai');
const {
    VariantNotation,
    stripParentheses
} = require('./../app/variant');
const {
    ProteinPosition
} = require('./../app/position');
const {
    NOTATION_TO_TYPES
} = require('./../app/constants');


describe('VariantNotation', () => {
    it('use object name for reference', () => {
        const notation = new VariantNotation({
            reference1: {name: 'KRAS', sourceId: 'hgnc:1234'},
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({pos: 12, refAA: 'G'}),
            type: NOTATION_TO_TYPES['>']
        });
        expect(notation.toString()).to.equal('KRAS:p.G12D');
    });
    it('use sourceId if no name on reference object', () => {
        const notation = new VariantNotation({
            reference1: {sourceId: 'ENSG001'},
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({pos: 12, refAA: 'G'}),
            type: NOTATION_TO_TYPES['>']
        });
        expect(notation.toString()).to.equal('ENSG001:p.G12D');
    });
    it('include reference version if available', () => {
        const notation = new VariantNotation({
            reference1: {sourceId: 'ENSG001', sourceIdVersion: '1'},
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({pos: 12, refAA: 'G'}),
            type: NOTATION_TO_TYPES['>']
        });
        expect(notation.toString()).to.equal('ENSG001.1:p.G12D');
    });
    it('ontology term for type', () => {
        const notation = new VariantNotation({
            reference1: {sourceId: 'ENSG001', sourceIdVersion: '1'},
            untemplatedSeq: 'D',
            break1Start: new ProteinPosition({pos: 12, refAA: 'G'}),
            type: {name: NOTATION_TO_TYPES['>']}
        });
        expect(notation.toString()).to.equal('ENSG001.1:p.G12D');
    });
    it('throws error on subsitituion with range', () => {
        expect(() => {
            new VariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1
                },
                break2Start: {
                    '@class': 'GenomicPosition',
                    pos: 18
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'substitution'
            });
        }).to.throw('cannot be a range');
    });
    it('ok for insertion with a range', () => {
        const notation = {
            type: 'insertion',
            reference1: 'EGFR',
            break1Start: {
                '@class': 'ExonicPosition',
                pos: 20
            },
            break2Start: {
                '@class': 'ExonicPosition',
                pos: 21
            }
        };
        const variant = new VariantNotation(notation);
        expect(variant.toString()).to.eql('EGFR:e.20_21ins');
    });
    it('throws error on invalid type', () => {
        expect(() => {
            new VariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'bad_type'
            });
        }).to.throw('invalid type');
    });
    it('use ? for undefined elements', () => {
        const variant = new VariantNotation({
            break1Start: {
                '@class': 'GenomicPosition',
                pos: 1
            },
            break1End: {
                '@class': 'GenomicPosition',
                pos: 18
            },
            germline: false,
            prefix: 'g',
            reference1: 'a1bgas',
            type: 'substitution'
        });
        expect(variant.toString()).to.equal('A1BGAS:g.(1_18)?>?');
    });
    it('error on insertion without range', () => {
        expect(() => {
            new VariantNotation({
                break1Start: {
                    '@class': 'GenomicPosition',
                    pos: 1
                },
                break1End: {
                    '@class': 'GenomicPosition',
                    pos: 18
                },
                germline: false,
                prefix: 'g',
                reference1: 'a1bgas',
                type: 'insertion'
            });
        }).to.throw('must be specified with a range');
    });
});

describe('stripParentheses', () => {
    it('ignores single positions', () => {
        expect(stripParentheses('e.1')).to.equal('e.1');
    });
    it('ignores range positions', () => {
        expect(stripParentheses('e.1_2')).to.equal('e.1_2');
    });
    it('strips uncertain positions', () => {
        expect(stripParentheses('e.(1_2)')).to.equal('e.1_2');
    });
});


describe('VariantNotation.toString', () => {
    it('builds string from duck-typed object', () => {
        const obj = {
            '@class': 'PositionalVariant',
            reference1: 'KRAS1',
            type: 'substitution',
            break1Start: {'@class': 'ProteinPosition', pos: 12, refAA: 'G'},
            untemplatedSeq: 'D',
            untemplatedSeqSize: 1,
            uuid: '209f648a-ea5f-4e2a-9c4a-45186821cf1e',
            createdAt: 1563408581057,
            displayName: 'KRAS1:p.G12',
            break1Repr: 'p.G12',
            '@version': 1
        };
        expect(VariantNotation.toString(obj)).to.eql('KRAS1:p.G12D');
    });
    it('allows non-standard types', () => {
        const obj = {
            '@class': 'PositionalVariant',
            reference1: 'EWSR1',
            reference2: 'FLI1',
            type: {name: 'in-frame fusion'},
            break1Start: {'@class': 'GenomicPosition', pos: 1230},
            break2Start: {'@class': 'GenomicPosition', pos: 1400},
            uuid: '209f648a-ea5f-4e2a-9c4a-45186821cf1e',
            createdAt: 1563408581057,
            break1Repr: 'g.1230',
            break2Repr: 'g.1400'
        };
        expect(VariantNotation.toString(obj)).to.eql('(EWSR1,FLI1):in-frame-fusion(g.1230,g.1400)');
    });
});
