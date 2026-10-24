// Subject + qualification mapping reviewed in docs/SCIE_EXPANSION_2026-10-24.md.
// These include same-subject reference versions, not a claim about current exam entries.
// Keep this explicit: newly imported or discovered subjects require an opt-in/review.
const scieCodes=new Set(`
0400 0410 0413 0450 0455 0457 0460 0470 0478 0509 0519 0520 0530 0547
0580 0610 0620 0625 0653 1DR0 1EN0 1JA0 1PE0 4EA1 4ET1
8022 8028 8386 8695 9093 9231 9479 9482 9483 9489 9608 9618 9695 9696 9699
9700 9701 9702 9706 9708 9709 9844 9898 9990 9DR0 9PE0
AP-ARTH AP-BIO AP-CALCBC AP-CHEM AP-CSA AP-HUG AP-LANG AP-LIT AP-MACRO
AP-MICRO AP-MUSIC AP-PHYSM AP-PSY AP-STAT AQA-7582 AQA-8261
`.trim().split(/\s+/));

export const isScieSubject=code=>scieCodes.has(code);
export function normalizeScope(value){
  return {mode:value?.mode==='all'?'all':'scie',extraCodes:[...new Set(Array.isArray(value?.extraCodes)?value.extraCodes.filter(c=>typeof c==='string'&&/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(c)&&!isScieSubject(c)):[])]};
}
export function scopeCodes(available,scope){
  const extras=new Set(scope.extraCodes);
  return [...new Set(available)].filter(c=>scope.mode==='all'||isScieSubject(c)||extras.has(c)).sort((a,b)=>Number(isScieSubject(b))-Number(isScieSubject(a))||a.localeCompare(b));
}
