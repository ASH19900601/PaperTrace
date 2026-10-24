import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeIndex, search, normalize} from '../dist/search.mjs';

// Transcribed from the original QP PDFs, independently of the corpus extractor.
// Existing fixtures cover 9701/9702/9709/0620; the other PDFs were checked in
// .cache/search-audit. Expected pages are the start of the MAIN question.
// Re-run with: node --test tests/search-audit.test.mjs
export const auditCases = [
  ['9701_m20_qp_52-q1', 2, 'Brass is an alloy of copper and zinc. Typical copper concentrations vary from 50% to 85%'],
  ['9701_m20_qp_52-q2', 6, 'Place both boiling tubes into a water-bath at approximately 50 °C and allow the temperature of both solutions to become equal and constant'],
  ['9702_s24_qp_22-q2', 6, 'A skydiver jumps from an aircraft at time t = 0 and falls vertically downwards'],
  ['9702_s24_qp_22-q3', 8, 'Lightning occurs when charge builds up in the atmosphere, creating a potential difference between the ground and the atmosphere'],
  ['9709_m24_qp_12-q2', 3, 'Translation of 2 units in the negative y-direction Reflection in the x-axis'],
  ['9709_m24_qp_12-q3', 4, 'It is given that the points (1, 9) and (5, a) lie on the curve. Find the value of a'],
  ['9618_s24_qp_11-q2', 3, 'A video doorbell is attached to the front door of a house. The doorbell uses a motion sensor'],
  ['9618_s24_qp_11-q3', 6, 'The developer uses an interpreter while writing the program code because it is easier for debugging'],
  ['0620_s24_qp_21-q3', 2, 'Hydrogen chloride gas [Mr: HCl, 36.5] is released at P in the apparatus shown. The universal indicator paper turns red after 38s'],
  ['0620_s24_qp_21-q10', 4, '8.5g of ammonia reacts with an excess of copper(II) oxide to produce 26.4g of copper'],
  ['0625_s24_qp_12-q1', 2, 'Four athletes run twice around a track. The table shows their times at the end of each lap'],
  ['0625_s24_qp_12-q2', 2, 'A racing car is fitted with an on-board computer. Every time the car passes the starting line'],
  ['0580_s24_qp_22-q2', 2, 'A gardener charges $6.55 for each hour he works plus a fixed charge of $15.50'],
  ['0580_s24_qp_22-q5', 3, 'All the trams take the same number of minutes to complete the journey from Newpoint to Westhill'],
  ['0478_s24_qp_11-q2', 2, 'Hypertext markup language (HTML) colour codes can be represented as hexadecimal'],
  ['0478_s24_qp_11-q3', 3, 'The binary number 10100011 is stored in random access memory (RAM). A logical left shift of three places is performed on the binary number'],
].map(([id, page, query]) => ({
  id, page, query,
  source: 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/' + id.split('-q')[0] + '.pdf',
}));

const manifest = JSON.parse(fs.readFileSync(new URL('../dist/data/manifest.json', import.meta.url)));
const records = manifest.subjects.flatMap(s => JSON.parse(fs.readFileSync(new URL('../dist/data/' + s.code + '.json', import.meta.url))));
const index = makeIndex(records);

test('independent original-PDF audit: 16 questions across all eight original subjects', t => {
  let top1 = 0, top5 = 0, absent = 0, exactSourcePage = 0;
  const details = auditCases.map(c => {
    const results = search(index, c.query);
    const rank = results.findIndex(r => r.id === c.id) + 1;
    const expected = results.find(r => r.id === c.id);
    if (rank === 1) top1++;
    if (rank > 0 && rank <= 5) top5++;
    if (!results.length) absent++;
    if (expected?.page === c.page) exactSourcePage++;
    return {id: c.id, rank, page: expected?.page, expectedPage: c.page, first: results[0]?.id, candidates: results.length};
  });
  t.diagnostic(JSON.stringify({questions: records.length, samples: auditCases.length, top1, top5, absent, exactSourcePage, details}));
  for (const d of details) {
    assert(d.rank > 0 && d.rank <= 5, `${d.id} has rank ${d.rank}; first ${d.first}`);
    assert.equal(d.page, d.expectedPage, d.id);
  }
});

test('OCR-like punctuation and line breaks preserve distinctive source matches', () => {
  for (const c of auditCases) {
    const noisy = c.query.replace(/[-—–]/g, ' ').replace(/[(),.]/g, '').replace(/ /g, '\n');
    const results = search(index, noisy);
    assert(results.slice(0,5).some(r => r.id === c.id), c.id);
  }
});

test('short diagram wording remains a candidate search, not a unique source claim', t => {
  const results = search(index, 'Measure the length of line AB in millimetres');
  assert(results.some(r => r.id === '0580_s24_qp_11-q2'));
  const repeated = results.filter(r => normalize(r.text).includes('measure the length of line ab in millimetres'));
  assert(repeated.length > 1);
  t.diagnostic(`The same short diagram instruction appears in ${repeated.length} indexed questions; a diagram is needed to distinguish sources.`);
});

// Captured from actual browser Tesseract runs. The short integral is a known
// challenge, reported separately rather than hidden inside the text benchmark.
export const browserOcrCases = [
  {id:'9702_s24_qp_22-q2',page:6,query:'A skydiver jumps from an aircraft at time t = 0 and falls vertically downwards. The variation with ¢\nof her velocity v is shown in Fig. 2.1.\nFE EE EEE EE EEE EE EE EE EE eo oe Te To eT eS EE ET |',required:true},
  {id:'0620_s24_qp_21-q10',page:4,query:'10 When heated, copper(ll) oxide, CuO, reacts with ammonia, NH,.\n3Cu0 + 2NH; — 3Cu + N, + 3H,0\n8.5g of ammonia reacts with an excess of copper(II) oxide to produce 26.4 g of copper.\nWhat is the percentage yield of copper in this reaction?\nA 27.5% B 322% C 55.0% D 825%',required:true},
  {id:'9709_m24_qp_12-q1',page:2,query:'1 Find the exact value of | 2 dr. [3]\n3x',required:false},
];
test('actual browser OCR outputs: report short-formula challenge separately', t => {
  for(const c of browserOcrCases){
    const results=search(index,c.query);
    const rank=results.findIndex(r=>r.id===c.id)+1;
    t.diagnostic(JSON.stringify({id:c.id,rank,first:results[0]?.id,candidates:results.length,knownChallenge:!c.required}));
    if(c.required){assert.equal(results[0]?.id,c.id);assert.equal(results[0]?.page,c.page)}
  }
});
