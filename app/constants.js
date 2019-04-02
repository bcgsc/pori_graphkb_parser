const AA_CODES = {
    ala: 'a',
    arg: 'r',
    asn: 'n',
    asp: 'd',
    asx: 'b',
    cys: 'c',
    glu: 'e',
    gln: 'q',
    glx: 'z',
    gly: 'g',
    his: 'h',
    ile: 'i',
    leu: 'l',
    lys: 'k',
    met: 'm',
    phe: 'f',
    pro: 'p',
    ser: 's',
    thr: 't',
    trp: 'w',
    tyr: 'y',
    val: 'v',
    ter: '*'
};

const AA_PATTERN = `${
    Object.values(AA_CODES).filter(x => x !== '*').join('|')
}|\\?|X|x|\\*|${
    Object.keys(AA_CODES).join('|')
}`;

const EVENT_SUBTYPE = {
    INS: 'insertion',
    DEL: 'deletion',
    SUB: 'substitution',
    INV: 'inversion',
    INDEL: 'indel',
    GAIN: 'copy gain',
    LOSS: 'copy loss',
    TRANS: 'translocation',
    ITRANS: 'inverted translocation',
    EXT: 'extension',
    FS: 'frameshift',
    FUSION: 'fusion',
    DUP: 'duplication',
    ME: 'methylation',
    AC: 'acetylation',
    UB: 'ubiquitination',
    SPL: 'splice-site',
    MUT: 'mutation'
};


const NOTATION_TO_SUBTYPE = {};
const SUBTYPE_TO_NOTATION = {};
for (const [notation, subtype] of [
    ['fs', EVENT_SUBTYPE.FS],
    ['>', EVENT_SUBTYPE.SUB],
    ['delins', EVENT_SUBTYPE.INDEL],
    ['inv', EVENT_SUBTYPE.INV],
    ['ext', EVENT_SUBTYPE.EXT],
    ['del', EVENT_SUBTYPE.DEL],
    ['dup', EVENT_SUBTYPE.DUP],
    ['ins', EVENT_SUBTYPE.INS],
    ['copygain', EVENT_SUBTYPE.GAIN],
    ['copyloss', EVENT_SUBTYPE.LOSS],
    ['trans', EVENT_SUBTYPE.TRANS],
    ['itrans', EVENT_SUBTYPE.ITRANS],
    ['spl', EVENT_SUBTYPE.SPL],
    ['fusion', EVENT_SUBTYPE.FUSION],
    ['mut', EVENT_SUBTYPE.MUT]
]) {
    NOTATION_TO_SUBTYPE[notation] = subtype;
    SUBTYPE_TO_NOTATION[subtype] = notation;
}

module.exports = {
    AA_CODES, AA_PATTERN, EVENT_SUBTYPE, NOTATION_TO_SUBTYPE, SUBTYPE_TO_NOTATION
};
