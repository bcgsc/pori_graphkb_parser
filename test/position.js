

const {expect} = require('chai');
const {ParsingError} = require('./../app/error');
const {
    parsePosition,
    GenomicPosition,
    ExonicPosition,
    IntronicPosition,
    ProteinPosition,
    CdsPosition,
    CytobandPosition
} = require('./../app/position');


describe('Position', () => {
    describe('CytobandPosition', () => {
        it('errors on invalid arm', () => {
            expect(() => {
                new CytobandPosition({arm: 'k'});
            }).to.throw('must be p or q');
            expect(() => {
                new CytobandPosition({arm: 1});
            }).to.throw('must be p or q');
        });
        it('errors on non-number major band', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 'k'});
            }).to.throw('must be a positive integer');
        });
        it('error on majorBand = 0', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 0});
            }).to.throw('must be a positive integer');
        });
        it('error on negative majorBand', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: -1});
            }).to.throw('must be a positive integer');
        });
        it('errors on non-number minor band', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: 'k'});
            }).to.throw('must be a positive integer');
        });
        it('error on minorBand = 0', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: 0});
            }).to.throw('must be a positive integer');
        });
        it('error on negative number minorBand', () => {
            expect(() => {
                new CytobandPosition({arm: 'p', majorBand: 1, minorBand: -1});
            }).to.throw('must be a positive integer');
        });
    });
    describe('CdsPosition', () => {
        it('error on non-integer offset', () => {
            expect(() => {
                new CdsPosition({pos: 1, offset: 'k'});
            }).to.throw('must be an integer');
        });
    });
    describe('ProteinPosition', () => {
        it('uses ? for null refAA', () => {
            expect((new ProteinPosition({pos: 1, refAA: null})).toString()).to.equal('?1');
        });
    });
});


describe('parsePosition', () => {
    it('errors on invalid prefix', () => {
        expect(() => { parsePosition('k', '1'); }).to.throw(ParsingError);
    });
    describe('g prefix', () => {
        it('valid', () => {
            const result = parsePosition('g', '1');
            expect(result.pos).to.equal(1);
            expect(result).to.be.instanceof(GenomicPosition);
        });
        it('errors on non integer', () => {
            expect(() => { parsePosition('g', 'f1'); }).to.throw(ParsingError);
        });
    });
    describe('intronic', () => {
        it('valid', () => {
            const result = parsePosition('i', '1');
            expect(result.pos).to.equal(1);
            expect(result).to.be.instanceof(IntronicPosition);
        })
    })
    describe('c prefix', () => {
        it('positive offset', () => {
            const result = parsePosition('c', '1+3');
            expect(result.pos).to.equal(1);
            expect(result.offset).to.equal(3);
            expect(result).to.be.instanceof(CdsPosition);
        });
        it('negative offset', () => {
            const result = parsePosition('c', '1-3');
            expect(result.pos).to.equal(1);
            expect(result.offset).to.equal(-3);
            expect(result).to.be.instanceof(CdsPosition);
        });
        it('no offset specified', () => {
            const result = parsePosition('c', '1');
            expect(result.pos).to.equal(1);
            expect(result.offset).to.equal(0);
            expect(result).to.be.instanceof(CdsPosition);
        });
        it('errors on spaces', () => {
            expect(() => { parsePosition('c', '1 + 3'); }).to.throw(ParsingError);
        });
    });
    describe('p prefix', () => {
        it('defaults to ? on reference AA not given', () => {
            const result = parsePosition('p', '1');
            expect(result.pos).to.equal(1);
            expect(result.refAA).to.be.undefined;
            expect(result).to.be.instanceof(ProteinPosition);
        });
        it('non-specific reference AA', () => {
            const result = parsePosition('p', '?1');
            expect(result.pos).to.equal(1);
            expect(result.refAA).to.be.undefined;
            expect(result).to.be.instanceof(ProteinPosition);
        });
        it('valid', () => {
            const result = parsePosition('p', 'P11');
            expect(result.pos).to.equal(11);
            expect(result.refAA).to.equal('P');
            expect(result).to.be.instanceof(ProteinPosition);
        });
        it('ok on lowercase reference AA', () => {
            expect(() => { parsePosition('p', 'p1'); }).to.not.throw(ParsingError);
        });
        it('errors on position not given', () => {
            expect(() => { parsePosition('p', 'p'); }).to.throw(ParsingError);
        });
    });
    describe('e prefix', () => {
        it('valid', () => {
            const result = parsePosition('e', '1');
            expect(result.pos).to.equal(1);
            expect(result).to.be.instanceof(ExonicPosition);
        });
        it('errors on non integer', () => {
            expect(() => { parsePosition('e', 'f1'); }).to.throw(ParsingError);
        });
    });
    describe('y prefix', () => {
        it('errors on arm not given', () => {
            expect(() => { parsePosition('y', '1.1'); }).to.throw(ParsingError);
        });
        it('p arm', () => {
            const result = parsePosition('y', 'p1.1');
            expect(result.arm).to.equal('p');
            expect(result.majorBand).to.equal(1);
            expect(result.minorBand).to.equal(1);
            expect(result).to.be.instanceof(CytobandPosition);
        });
        it('q arm', () => {
            const result = parsePosition('y', 'q1.1');
            expect(result.arm).to.equal('q');
            expect(result.majorBand).to.equal(1);
            expect(result.minorBand).to.equal(1);
            expect(result).to.be.instanceof(CytobandPosition);
        });
        it('errors on invalid arm', () => {
            expect(() => { parsePosition('y', 'k1.1'); }).to.throw(ParsingError);
        });
        it('errors on uppercase P arm', () => {
            expect(() => { parsePosition('y', 'P1.1'); }).to.throw(ParsingError);
        });
        it('errors on uppercase Q arm', () => {
            expect(() => { parsePosition('y', 'Q1.1'); }).to.throw(ParsingError);
        });
        it('minor band null if not given', () => {
            const result = parsePosition('y', 'q1');
            expect(result.arm).to.equal('q');
            expect(result.majorBand).to.equal(1);
            expect(result).to.be.instanceof(CytobandPosition);
        });
        it('major band null if not given', () => {
            const result = parsePosition('y', 'q');
            expect(result.arm).to.equal('q');
            expect(result).to.be.instanceof(CytobandPosition);
        });
        it('errors on minor band but no major band', () => {
            expect(() => { parsePosition('y', 'p.1'); }).to.throw(ParsingError);
        });
    });
});
