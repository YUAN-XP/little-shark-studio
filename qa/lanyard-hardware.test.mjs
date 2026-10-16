import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

function glb(name) {
  const raw = fs.readFileSync(new URL(`../src/assets/lanyard/${name}`, import.meta.url));
  const length = raw.readUInt32LE(12);
  return { json: JSON.parse(raw.subarray(20, 20 + length).toString()), bin: raw.subarray(28 + length), bytes: raw.length };
}

test('the lighter lanyard retains the exact clip/clamp geometry and metal appearance', () => {
  const original = glb('card.glb'), optimized = glb('hardware.glb');
  assert.ok(optimized.bytes < original.bytes * .06);
  assert.equal(optimized.json.images, undefined);
  for (const name of ['clip', 'clamp']) {
    const primitives = source => source.json.meshes[source.json.nodes.find(node => node.name === name).mesh].primitives[0];
    const a = primitives(original), b = primitives(optimized);
    const attributes = { ...a.attributes, indices: a.indices };
    for (const [key, id] of Object.entries(attributes)) {
      const aa = original.json.accessors[id], bb = optimized.json.accessors[key === 'indices' ? b.indices : b.attributes[key]];
      for (const field of ['componentType', 'count', 'type', 'byteOffset', 'normalized', 'min', 'max']) assert.deepEqual(bb[field], aa[field]);
      const av = original.json.bufferViews[aa.bufferView], bv = optimized.json.bufferViews[bb.bufferView];
      assert.deepEqual(original.bin.subarray(av.byteOffset || 0, (av.byteOffset || 0) + av.byteLength), optimized.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
    }
    assert.deepEqual(optimized.json.materials[b.material], original.json.materials[a.material]);
  }
});
