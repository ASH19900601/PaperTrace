import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readableBlocks,readableExcerpt,cleanOCR} from '../dist/readability.mjs';

test('joins wrapped questions, including short last lines, but separates parts',()=>{
  const b=readableBlocks('(a) The upthrust on the skydiver is\nnegligible.\n(b) Calculate the acceleration at time\nt = 9.0 s.');
  assert.deepEqual(b.map(x=>x.text),['(a) The upthrust on the skydiver is negligible.','(b) Calculate the acceleration at time t = 9.0 s.']);
});
test('preserves formula coefficients, units and all MCQ choices',()=>{
  const text='3CuO + 2NH3 → 3Cu + N2 + 3H2O\nA\n27.5%\nB\n32.2%\nC\n55.0%\nD\n82.5%';
  const b=readableBlocks(text);
  assert.equal(b.length,5);assert.equal(b[0].text,text.split('\n')[0]);
  assert.deepEqual(b.slice(1).map(x=>x.text),['A  27.5%','B  32.2%','C  55.0%','D  82.5%']);
});
test('OCR background noise is removed without discarding numerical expressions',()=>{
  const text='A skydiver falls vertically downwards.\nFE EE EEE EE EEE EE EE EE EE eo oe Te To eT eS EE ET |\n1 2 3 4 5 6 7 8 9 0\nF = ma';
  const result=cleanOCR(text);assert.equal(result.removed.length,1);
  assert.match(result.text,/1 2 3 4 5 6 7 8 9 0/);assert.match(result.text,/F = ma/);
  const bases='A C G T A C G T A C G T A C G T';
  assert.equal(cleanOCR(bases).text,bases);
});
test('excerpt uses matching prose rather than detached graph labels',()=>{
  const text='A skydiver falls vertically downwards.\nv\n0\nt\n(a) Calculate the acceleration of the skydiver.';
  assert.equal(readableExcerpt(text,['skydiver','vertically']),text.split('\n')[0]);
});
