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
    ter: '*',
};

const AA_PATTERN = `${
    Object.values(AA_CODES).filter((x) => x !== '*').join('|')
}|\\?|X|x|\\*|${
    Object.keys(AA_CODES).join('|')
}`;

const NOTATION_TO_TYPES = {
    ins: 'insertion',
    del: 'deletion',
    '>': 'substitution',
    inv: 'inversion',
    delins: 'indel',
    copygain: 'copy gain',
    copyloss: 'copy loss',
    trans: 'translocation',
    itrans: 'inverted translocation',
    ext: 'extension',
    fs: 'frameshift',
    fusion: 'fusion',
    dup: 'duplication',
    me: 'methylation',
    ac: 'acetylation',
    ub: 'ubiquitination',
    spl: 'splice-site',
    mut: 'mutation',
    mis: 'missense mutation',
    phos: 'phosphorylation',
};

// specific subtypes of types that are not reversible (refined from parent type above)
const TRUNCATING_FS = 'truncating frameshift mutation';
const NONSENSE = 'nonsense mutation';

const TYPES_TO_NOTATION = {
    [NONSENSE]: '>',
    [TRUNCATING_FS]: 'fs',
    // deprecated forms and aliases
    'frameshift mutation': 'fs',
    'frameshift truncation': 'fs',
    'missense variant': 'mis',
    'truncating frameshift': 'fs',
    missense: 'mis',
    mutations: 'mut',
    nonsense: '>',
};

const addTypeMappings = (mapping) => {
    for (const [notation, type] of Object.entries(mapping)) {
        if (TYPES_TO_NOTATION[type]) {
            throw new Error(`Mapping must be reversible unique. Duplicate key found (${type})`);
        }
        TYPES_TO_NOTATION[type] = notation;
    }
};

addTypeMappings(NOTATION_TO_TYPES);

/**
 * the mapping of positional variant notation prefixes to their corresponging position classes
 * @namespace
 *
 * @property {string} g genomic postions
 * @property {string} i intronic positions
 * @property {string} e exonic positions
 * @property {string} p protein positions (amino acid coordinates)
 * @property {string} y cytoband positions
 * @property {string} c coding sequence positions
 * @property {string} r rna sequence positions
 * @property {string} n non-coding sequence positions
 */
const PREFIX_CLASS = {
    g: 'GenomicPosition',
    y: 'CytobandPosition',
    c: 'CdsPosition',
    r: 'RnaPosition',
    i: 'IntronicPosition',
    e: 'ExonicPosition',
    p: 'ProteinPosition',
    n: 'NonCdsPosition',
};

module.exports = {
    PREFIX_CLASS,
    AA_CODES,
    AA_PATTERN,
    NOTATION_TO_TYPES,
    TYPES_TO_NOTATION,
    addTypeMappings,
    NONSENSE,
    TRUNCATING_FS,
};
