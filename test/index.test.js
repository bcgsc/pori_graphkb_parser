const { parseVariant, stringifyVariant } = require('../src');

// acceptable notation
test.each([
    'KRAS:p.G12D',
    'KRAS:p.G12_G13insH',
    'KRAS:p.G12delG',
    'KRAS:p.G12_H14dupGHH',
    'EGFR:e.20_21ins',
    'FEATURE:c.-23+1A>G',
    'FEATURE:c.3+1del',
    'FEATURE:n.3+1del',
    'FEATURE:c.3+1_5-2del',
    'FEATURE:c.3_5delTAA',
    'FEATURE:c.(3+1_4-1)_10dup',
    'FEATURE:c.3_(5+1_55-1)dup',
    'FEATURE:c.(1_3)_(5_7)dup',
    'FEATURE:c.3_5dupTAA',
    'FEATURE:c.4A>T',
    'FEATURE:c.(4_7)A>T',
    'FEATURE:c.(1_3)_(5_7)delTAAinsACG',
    'FEATURE:c.10delTins',
    'FEATURE:c.10delinsACC',
    'FEATURE:c.-124C>T',
    'FEATURE:e.1dup',
    'FEATURE:e.(1_2)dup',
    'FEATURE:e.1_3dup',
    'FEATURE:e.(1_2)_(3_4)dup',
    'FEATURE:e.(1_2)_4dup',
    'FEATURE:e.2_(3_4)dup',
    'FEATURE:p.W288spl',
    'FEATURE:p.D816N',
    'FEATURE:p.D816',
    'FEATURE:p.D?N',
    'FEATURE:p.R10Kfs',
    'FEATURE:p.R10Kfs*10',
    'FEATURE:p.R10*fs',
    'FEATURE:p.(R10_M11)fs*10',
    'FEATURE:p.R10fs*10',
    'FEATURE:p.R10fs',
    'FEATURE:p.F12G',
    'FEATURE:p.F12*',
    'FEATURE:y.pdup',
    'FEATURE:y.p11dup',
    'FEATURE:y.p11.1dup',
    'FEATURE:y.p11.1_p13.3dup',
    'FEATURE:y.(p11.1_p11.2)_(p13.4_p14)dup',
    'FEATURE:y.(p11.1_p11.2)_p13.3dup',
    'FEATURE:y.p13.3_(p15.1_p15.2)dup',
    'FEATURE:y.qdup',
    'FEATURE:y.pdel',
    'FEATURE:y.p11.1_p13.3inv',
    '(FEATURE1,FEATURE2):fusion(e.1,e.2)',
    '(FEATURE1,FEATURE2):trans(g.1,g.2)',
    '(FEATURE1,FEATURE2):fusion(e.1,e.2)ATGC',
    '(FEATURE1,FEATURE2):fusion(e.1,e.2)5',
    '(FEATURE1,FEATURE2):fusion(e.1_17,e.20_28)',
    'FEATURE:g.3del',
    'FEATURE:g.3_5del',
    'FEATURE:g.3_5delTAA',
    'FEATURE:g.(3_4)_5dup',
    'FEATURE:g.3_(5_7)dup',
    'FEATURE:g.(1_3)_(5_7)dup',
    'FEATURE:g.3_5dupTAA',
    'FEATURE:g.4A>T',
    'FEATURE:g.(4_7)A>T',
    'FEATURE:g.(1_3)_(5_7)delTAAinsACG',
    'FEATURE:g.10delTins',
    'FEATURE:g.10delinsACC',
    'FEATURE:g.3_4ins8',
    'FEATURE:g.3_4insATC',
    'FEATURE:g.1234_1235delins29',
])('can reproduce %s', (notation) => {
    const parsed = parseVariant(notation, true);
    expect(stringifyVariant(parsed)).toBe(notation);
});


// notation without features
test.each([
    'p.*807ext',
    'p.M1ext-85',
    'p.*807ext*101',
    'p.R80=',
    'p.*807Lext',
    'p.*807Lext*101',
    '12:y.q13_q14copygain',
])('valid without features %s', (notation) => {
    const parsed = parseVariant(notation, false);
    expect(stringifyVariant(parsed)).toBe(notation);
});


// reformatted notation
test.each([
    ['FEATURE:p.W288FS', 'FEATURE:p.W288fs'],
    ['FEATURE:p.R10Kfs*', 'FEATURE:p.R10Kfs'],
    ['FEATURE:p.Arg10Lysfs*10', 'FEATURE:p.R10Kfs*10'],
    ['FEATURE:p.Arg10_Lys12delArgGluLysinsLeu', 'FEATURE:p.R10_K12delREKinsL'],
    ['FEATURE:g.(1234_1237)_(1234_1237)dup2', 'FEATURE:g.(1234_1237)_(1234_1237)dup'], // useq size is irrelevant to dups
])('transforms from %s to %s', (notationIn, notationOut) => {
    const parsed = parseVariant(notationIn, true);
    expect(stringifyVariant(parsed)).toBe(notationOut);
});

// reformatted notation without features
test.each([
    ['p.E55RfsTer11', 'p.E55Rfs*11'],
    ['p.*661Lext*?', 'p.*661Lext'],
    ['p.Arg80=', 'p.R80='],
])('transforms from %s to %s', (notationIn, notationOut) => {
    const parsed = parseVariant(notationIn, false);
    expect(stringifyVariant(parsed)).toBe(notationOut);
});

// bad notation with features
test.each([
    ['(FEATURE1,FEATURE2):ins(e.123,e.124)', 'Continuous notation is preferred'],
    ['(FEATURE1,FEATURE2):delins(e.123,e.123)', 'Continuous notation is preferred'],
    ['(FEATURE1,FEATURE2):inv(e.123,e.123)', 'Continuous notation is preferred'],
    ['(FEATURE1,FEATURE2):del(e.123,e.123)', 'Continuous notation is preferred'],
    ['(FEATURE1,FEATURE2):dup(e.123,e.123)', 'Continuous notation is preferred'],
    ['(FEATURE1,FEATURE2):fusion(e.123,e.123k)', 'Error in parsing the second breakpoint'],
    ['(FEATURE1,FEATURE2):trans(e.123k,e.1234)', 'Error in parsing the first breakpoint'],
    ['(FEATURE1,FEATURE2):trans(e.123)', 'Missing comma'],
    ['(FEATURE1,FEATURE2):trans(e.1,e.2,e.3)', 'Single comma expected'],
    ['(FEATURE1,FEATURE2):trans(k.1,e.2)', 'Error in parsing the first breakpoint'],
    ['(FEATURE1,FEATURE2):trans(1,2)', 'Error in parsing the first breakpoint'],
    ['(FEATURE1,FEATURE2):blargh(e.1,e.2)', 'Variant type (blargh) not recognized'],
    ['(FEATURE1,FEATURE2):(e.1,e.2)', 'Variant type was not specified'],
    ['(FEATURE1):trans(e.1,e.2)', 'Multi-feature notation must contain two reference features separated by a comma'],
    ['(FEATURE1,FEATURE2,FEATURE3):trans(e.1,e.2)', 'May only specify two features. Found more than a single comma'],
    ['(FEATURE1,FEATURE2:trans(e.1,e.2)', 'Missing closing'],
    ['(FEATURE1,FEATURE2):trans(e.1,e.2', 'Missing closing'],
    ['FEATURE1,FEATURE2):trans(e.1,e.2)', 'Missing opening'],
    ['FEATURE1,FEATURE2):trans(e.1,e.2)', 'Missing opening'],
    ['(FEATURE1,FEATURE2):transe.1,e.2)', 'Missing opening'],
    ['FEATURE:g.4A>T^C', 'unsupported alternate sequence notation: T^C'],
    ['', 'Too short'],
    ['FEATURE:g.15T', 'only protein notation does not use ">" for a substitution'],
    ['FEATURE:e.1C>T', 'Cannot define'],
    ['FEATURE:e.C1T', 'Failed to parse the initial position'],
    ['FEATURE:p.816D>K', 'protein notation does not use ">" for a substitution'],
    ['FEATURE:p.R10*fs*10', 'conflict'],
    ['FEATURE:p.R10_M11Kfs*', 'range'],
    ['FEATURE:y.p12.1ins', 'Invalid type'],
    ['FEATURE:y.p12.1_p13ins', 'Invalid type'],
    ['FEATURE:y.p12.1delins', 'Invalid type'],
    ['FEATURE:y.p12.1_p13delins', 'Invalid type'],
    ['FEATURE:y.p12.1G>T', 'cannot define sequence elements'],
    ['FEATURE:y.Gp12.1T', 'Failed to parse the initial position'],
    ['FEATURE:y.p12.1fs', 'only protein notation can notate frameshift variants'],
    ['FEATURE:y.(p12.1_p13)fs', 'only protein notation can notate frameshift variants'],
    ['12:y.q13_q14dupATCG', 'cannot define sequence elements (refSeq) at the cytoband level'],
    ['12:y.q13_q14insATCG', 'cannot define sequence elements (untemplatedSeq) at the cytoband level'],
    ['FEATURE:f.G12D', 'not an accepted prefix'],
    ['FEATURE:pG12D', 'Missing \'.\' separator after prefix'],
    ['FEATURE:OTHER:pG12D', 'Variant notation must contain a single colon'],
    ['FEATURE:p.G12_HH13insH', 'Failed to parse the initial position'],
    ['p.G12K', 'Feature name not specified'],
    ['(,):()', 'Multi-feature notation must be a minimum of six characters'],
    ['FEATURE:c.123+?G>A', 'offset (+?) must be an integer'],
])('error on %s', (notation, errorMessage) => {
    expect(() => {
        parseVariant(notation, true);
    }).toThrowError(errorMessage);
});


// bad notation without features
test.each([
    ['', 'Too short'],
    ['p.G12G>T', 'protein notation does not use ">" for a substitution'],
    ['p.R661Kfs*m', 'truncation must be a number'],
    ['p.(R123 R124)del', 'Positions within a range must be separated by an underscore'],
    ['p.(R123 R124del', 'Missing the closing parenthesis'],
    ['p.G12del*12', 'unsupported notation'],
])('error on %s', (notation, errorMessage) => {
    expect(() => {
        parseVariant(notation, false);
    }).toThrowError(errorMessage);
});
