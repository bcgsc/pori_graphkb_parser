import { AA_CODES } from '../src/constants';
import {
    convert3to1,
    extractPositions,
    getPrefix,
    parseContinuous,
} from '../src/continuous';
import { ParsingError, InputValidationError } from '../src/error';

describe('convert3to1', () => {
    test.each([
        [AA_CODES.ter, AA_CODES.ter],
        ['=', '='],
        ['abc', ''],
        ['trp', 'w'],
        ['Trp', 'w'],
        ['ArgLysLeu', 'rkl'],
    ])('convert %s to %s', (string, expected) => {
        expect(convert3to1(string)).toBe(expected);
    });

    test('throw ParsingError on length not multiple of 3', () => {
        expect(() => convert3to1('abcd')).toThrow(ParsingError);
    });
});

describe('getPrefix', () => {
    test.each([
        ['g.', 'g'],
        ['g.123', 'g'],
        ['y.123', 'y'],
        ['c.123', 'c'],
        ['r.123', 'r'],
        ['i.123', 'i'],
        ['e.123', 'e'],
        ['p.123', 'p'],
        ['n.123', 'n'],
    ])('convert %s to %s', (string, expected) => {
        expect(getPrefix(string)).toBe(expected);
    });

    test.each([
        ['z', 'is not an accepted prefix'],
        ['g', 'is missing seperator'],
        ['g123', 'is missing seperator'],
    ])('throw ParsingError on %s because %s', (string, _) => {
        expect(() => getPrefix(string)).toThrow(ParsingError);
    });
});

describe('extractPosition', () => {
    test.each([
        ['c', '1-2384C>T', { // TODO: needs to be fixed to '-2384C>T'
            input: '1-2384',
            start: {
                '@class': 'CdsPosition', offset: -2384, pos: 1, prefix: 'c',
            },
        }],
        ['p', 'G12D', {
            input: 'G12',
            start: {'@class': 'ProteinPosition', longRefAA: null, pos: 12, prefix: 'p', refAA: 'G'},
        }],
        // extract 1st position only
        ['c', '123_456del', {
            input: '123',
            start: {'@class': 'CdsPosition', offset: 0, pos: 123, prefix: 'c'},
        }],
        ['c', '(123_456)_(567_890)del', {
            input: '(123_456)',
            start: {'@class': 'CdsPosition', offset: 0, pos: 123, prefix: 'c'},
            end: {'@class': 'CdsPosition', offset: 0, pos: 456, prefix: 'c'},
        }],
    ])('extracting positions for %s.%s', (prefix, string, expected) => {
        expect(extractPositions(prefix, string)).toEqual(expected);
    });

    test.each([
        ['c', '(123_456del', 'is missing closing parenthesis'],
        ['c', '(123)del', 'is missing end position'],
        // [ 'c', 'del', 'no position'],  // TODO: to be addressed
    ])('throw ParsingError on %s.%s because %s', (prefix, string, _) => {
        expect(() => extractPositions(prefix, string)).toThrow(ParsingError);
    });
});

describe('parseContinuous', () => {
    test.each([
        ['c.del', { // pos 1 assumed by default
            break1Start: {
                '@class': 'CdsPosition', offset: 0, pos: 1, prefix: 'c',
            },
            break1End: undefined,
            break2Start: undefined,
            break2End: undefined,
            notationType: 'del',
            prefix: 'c',
            refSeq: undefined,
            truncation: undefined,
            type: 'deletion',
            untemplatedSeq: undefined,
            untemplatedSeqSize: undefined,
        }],
        ['p.G12D', {
            break1End: undefined,
            break1Start: {
                '@class': 'ProteinPosition', longRefAA: null, pos: 12, prefix: 'p', refAA: 'G',
            },
            break2End: undefined,
            break2Start: undefined,
            notationType: '>',
            prefix: 'p',
            refSeq: 'G',
            truncation: undefined,
            type: 'missense mutation',
            untemplatedSeq: 'D',
            untemplatedSeqSize: undefined,
        }],
        ['c.123_456del', {
            break1Start: {
                '@class': 'CdsPosition', offset: 0, pos: 123, prefix: 'c', 
            },
            break1End: undefined,
            break2Start: {
                '@class': 'CdsPosition', offset: 0, pos: 456, prefix: 'c',
            },
            break2End: undefined,
            notationType: 'del',
            prefix: 'c',
            refSeq: undefined,
            truncation: undefined,
            type: 'deletion',
            untemplatedSeq: undefined,
            untemplatedSeqSize: undefined,
        }],
        ['c.(123_456)_(567_890)del', {
            break1Start: {
                '@class': 'CdsPosition', offset: 0, pos: 123, prefix: 'c',
            },
            break1End: {
                '@class': 'CdsPosition', offset: 0, pos: 456, prefix: 'c',
            },
            break2Start: {
                '@class': 'CdsPosition', offset: 0, pos: 567, prefix: 'c',
            },
            break2End: {
                '@class': 'CdsPosition', offset: 0, pos: 890, prefix: 'c',
            },
            notationType: 'del',
            prefix: 'c',
            refSeq: undefined,
            truncation: undefined,
            type: 'deletion',
            untemplatedSeq: undefined,
            untemplatedSeqSize: undefined,
        }],
        ['p.(123_456)_(567_890)del', {
            break1Start: {
                '@class': 'ProteinPosition', pos: 123, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break1End: {
                '@class': 'ProteinPosition', pos: 456, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break2Start: {
                '@class': 'ProteinPosition', pos: 567, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break2End: {
                '@class': 'ProteinPosition', pos: 890, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            notationType: 'del',
            prefix: 'p',
            refSeq: undefined,
            truncation: undefined,
            type: 'deletion',
            untemplatedSeq: undefined,
            untemplatedSeqSize: undefined,
        }],
        ['p.(L797P)', { // protein predicted consequences
            break1Start: {
                '@class': 'ProteinPosition', pos: 797, prefix: 'p', longRefAA: null, refAA: 'L',
            },
            break1End: undefined,
            break2Start: undefined,
            break2End: undefined,
            notationType: '>',
            prefix: 'p',
            refSeq: 'L',
            truncation: undefined,
            type: 'missense mutation',
            untemplatedSeq: 'P',
            untemplatedSeqSize: undefined,
        }],
        ['p.((123_456)_(567_890)del)', {
            break1Start: {
                '@class': 'ProteinPosition', pos: 123, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break1End: {
                '@class': 'ProteinPosition', pos: 456, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break2Start: {
                '@class': 'ProteinPosition', pos: 567, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            break2End: {
                '@class': 'ProteinPosition', pos: 890, prefix: 'p', longRefAA: null, refAA: undefined,
            },
            notationType: 'del',
            prefix: 'p',
            refSeq: undefined,
            truncation: undefined,
            type: 'deletion',
            untemplatedSeq: undefined,
            untemplatedSeqSize: undefined,
        }],
    ])('parsing %s', (inputString, expected) => {
        expect(parseContinuous(inputString)).toEqual(expected);
    });

    test.each([
        ['p.del', 'error on extracting 1st position'],
        ['p.123_del', 'expecting 2nd position but there is none'],
    ])('throw Error on %s because %s', (inputString, _) => {
        expect(() => parseContinuous(inputString)).toThrow(Error);
    });

    test.each([
        ['p.', 'length is too short'],
        ['g.A123C', 'all substitutions except protein must use the \'>\' symbol'],
        ['p.123w>a', 'the \'>\' symbol should not be used for protein substitutions'],
        ['e.1a>b', 'substitutions not allowed with exonic notation'],
        ['c.123fs', 'framechift only with protein notation'],
        ['p.W123*fs*2', 'invalidd framechift'],
        ['p.A123_B23Cfs*', 'frameshifts cannot span a range'],
        ['c.123indelCC', 'unsupported indel (in lieu of delins) notation type'],
        ['g.123T>A^B', 'cannot use ^ as untemplated'],
        ['y.q1_q2dupA', 'cannot define reference sequence when using \'y\' prefix'],
        ['y.p1_p2insA', 'cannot define untemplated sequence when using \'y\' prefix'],
    ])('throw ParsingError on %s because %s', (inputString, _) => {
        expect(() => parseContinuous(inputString)).toThrow(ParsingError);
    });

    test.each([
        ['p.A123Bfs*A', 'truncation must be a number'],
    ])('throw InputValidationError on %s because %s', (inputString, _) => {
        expect(() => parseContinuous(inputString)).toThrow(InputValidationError);
    });
});
