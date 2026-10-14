import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleWindow,afterShift} from './gallery-window.js';
const six = ['A','B','C','D','E','F'];
test('Six projects slide one at a time; the first returns on the second click', () => {
  assert.deepEqual(visibleWindow(six,0),['A','B','C','D','E']);
  const one = afterShift(0,2,1,6);
  assert.deepEqual(visibleWindow(six,one.start),['B','C','D','E','F']);
  const two = afterShift(one.start,one.active,1,6);
  assert.deepEqual(visibleWindow(six,two.start),['C','D','E','F','A']);
  assert.equal(visibleWindow(six,two.start)[two.active], 'C');
});
test('Reverse wrap preserves the selected project when it remains visible', () => {
  const previous=afterShift(0,2,-1,6);
  assert.deepEqual(visibleWindow(six,previous.start),['F','A','B','C','D']);
  assert.equal(visibleWindow(six,previous.start)[previous.active],'C');
});
test('An outgoing selected panel transfers expansion to the arriving panel', () => {
  const next=afterShift(0,0,1,6);
  assert.equal(visibleWindow(six,next.start)[next.active],'F');
  const previous=afterShift(0,4,-1,6);
  assert.equal(visibleWindow(six,previous.start)[previous.active],'F');
});
test('A full circle returns to the same five-item view without duplicates', () => {
  let state={start:0,active:2};
  for(let i=0;i<6;i++) {
    state=afterShift(state.start,state.active,1,6);
    const window=visibleWindow(six,state.start);
    assert.equal(window.length,5);
    assert.equal(new Set(window).size,5);
  }
  assert.deepEqual(visibleWindow(six,state.start),['A','B','C','D','E']);
});
