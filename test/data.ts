import { NOTATION_TO_TYPES } from '../src/constants';

const standardVariants = {
    'EGFR:e.20_21ins': {
        break1Start: {
            '@class': 'ExonicPosition',
            pos: 20,
            prefix: 'e',
        },
        break1Repr: 'e.20',
        break2Start: {
            '@class': 'ExonicPosition',
            pos: 21,
            prefix: 'e',
        },
        break2Repr: 'e.21',
        prefix: 'e',
        reference1: 'EGFR',
        type: NOTATION_TO_TYPES.ins,
    },
    'KRAS:p.G12D': {
        break1Start: {
            '@class': 'ProteinPosition',
            pos: 12,
            prefix: 'p',
            refAA: 'G',
        },
        break1Repr: 'p.G12',
        prefix: 'p',
        reference1: 'KRAS',
        type: NOTATION_TO_TYPES.mis,
        untemplatedSeq: 'D',
    },
};

// Actual fusion variant with legacy notation (from KBDEV-974)
const fusionVariants = {
    '(ATP1B1,NRG1):fusion(g.169080736,g.32453346)': {
        reference1: 'ATP1B1',
        reference2: 'NRG1',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'GenomicPosition',
            pos: 169080736,
            prefix: 'g',
        },
        break1Repr: 'g.169080736',
        break2Start: {
            '@class': 'GenomicPosition',
            pos: 32453346,
            prefix: 'g',
        },
        break2Repr: 'g.32453346',
        noFeatures: false,
        prefix: 'g',
    },
    '(ENST00000357447,ENST00000371953):fusion(c.1118,c.165)': {
        reference1: 'ENST00000357447',
        reference2: 'ENST00000371953',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'CdsPosition',
            pos: 1118,
            prefix: 'c',
            offset: 0,
        },
        break1Repr: 'c.1118',
        break2Start: {
            '@class': 'CdsPosition',
            pos: 165,
            prefix: 'c',
            offset: 0,
        },
        break2Repr: 'c.165',
        noFeatures: false,
        prefix: 'c',
    },
    '(COL1A1,PDGFB):fusion(r.2354,r.852)': {
        reference1: 'COL1A1',
        reference2: 'PDGFB',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'RnaPosition',
            pos: 2354,
            prefix: 'r',
            offset: 0,
        },
        break1Repr: 'r.2354',
        break2Start: {
            '@class': 'RnaPosition',
            pos: 852,
            prefix: 'r',
            offset: 0,
        },
        break2Repr: 'r.852',
        noFeatures: false,
        prefix: 'r',
    },
    '(CLTC,ALK):fusion(e.30,e.20)': {
        reference1: 'CLTC',
        reference2: 'ALK',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'ExonicPosition',
            pos: 30,
            prefix: 'e',
        },
        break1Repr: 'e.30',
        break2Start: {
            '@class': 'ExonicPosition',
            pos: 20,
            prefix: 'e',
        },
        break2Repr: 'e.20',
        noFeatures: false,
        prefix: 'e',
    },
    // Cases with mixed prefix
    // resulting in malformed positions
    '(ZNF532,NUTM1):fusion(p.?4,e.2)': {
        reference1: 'ZNF532',
        reference2: 'NUTM1',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'ExonicPosition',
            pos: 4,
            prefix: 'e',
        },
        break1Repr: 'e.4',
        break2Start: {
            '@class': 'ExonicPosition',
            pos: 2,
            prefix: 'e',
        },
        break2Repr: 'e.2',
        noFeatures: false,
        prefix: 'e',
    },
    '(CDH1,LARS):fusion(i.2,e.17)': {
        reference1: 'CDH1',
        reference2: 'LARS',
        multiFeature: true,
        type: 'fusion',
        break1Start: {
            '@class': 'ExonicPosition',
            pos: 2,
            prefix: 'e',
        },
        break1Repr: 'e.2',
        break2Start: {
            '@class': 'ExonicPosition',
            pos: 17,
            prefix: 'e',
        },
        break2Repr: 'e.17',
        noFeatures: false,
        prefix: 'e',
    },
    // Cases with mixed prefix
    // resulting in error
    // '(chr3,BRAF):fusion(y.p26.3,e.4)' : {
    // },
};

export default {
    fusionVariants,
    standardVariants,
};
