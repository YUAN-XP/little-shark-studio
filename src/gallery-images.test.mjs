import test from 'node:test';
import assert from 'node:assert/strict';
import { createGalleryImageCache } from './gallery-images.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

function imageFixture() {
  const images = [];
  class Cover {
    constructor() { images.push(this); this.decoded = deferred(); this.naturalWidth = 0; }
    decode() { return this.decoded.promise; }
    load() { this.naturalWidth = 1448; this.onload?.(); }
    fail() { this.onerror?.(); }
  }
  return { images, prepare: createGalleryImageCache(Cover) };
}

test('An incoming cover is ready only after decoding; simultaneous requests share it', async () => {
  const { images, prepare } = imageFixture();
  const cover = prepare('/new-cover.webp');
  assert.equal(prepare('/new-cover.webp'), cover);
  assert.equal(images.length, 1);
  images[0].load();
  await Promise.resolve();
  assert.equal(cover.ready, false);
  images[0].decoded.resolve();
  assert.equal(await cover.promise, true);
  assert.equal(cover.ready, true);
});

test('The sixth cover and both circular directions reuse the same decoded resources', async () => {
  const { images, prepare } = imageFixture();
  const paths = ['ml', 'robot', 'game', 'video', 'survey', 'innovation'].map(id => `/${id}.webp`);
  const covers = paths.map(prepare);
  images.forEach(image => { image.load(); image.decoded.resolve(); });
  await Promise.all(covers.map(cover => cover.promise));
  for (const index of [5, 0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0]) {
    assert.equal(prepare(paths[index]), covers[index]);
    assert.equal(covers[index].ready, true);
  }
  assert.equal(images.length, 6);
});

test('A failed cover resolves and can be retried; a stale decode cannot revive it', async () => {
  const { images, prepare } = imageFixture();
  const first = prepare('/retry.webp');
  images[0].load();
  images[0].fail();
  assert.equal(await first.promise, false);
  images[0].decoded.resolve();
  await Promise.resolve();
  assert.equal(first.ready, false);
  const retry = prepare('/retry.webp');
  assert.notEqual(retry, first);
  images[1].load();
  images[1].decoded.resolve();
  assert.equal(await retry.promise, true);
});

test('A loaded image survives decode rejection and a server needs no Image API', async () => {
  const { images, prepare } = imageFixture();
  const cover = prepare('/supported.webp');
  images[0].load();
  images[0].decoded.reject(new Error('decode unavailable'));
  assert.equal(await cover.promise, true);
  assert.equal(await createGalleryImageCache(null)('/ssr.webp').promise, false);
});
