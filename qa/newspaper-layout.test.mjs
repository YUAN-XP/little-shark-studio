import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newspaperBlocks, paginateNewspaper, splitCopy } from '../src/newspaper-layout.js';

// Load the real source accounts without changing the Vite-only asset prefix.
const sourceRoot = process.env.PORTFOLIO_SOURCE_ROOT ? `${process.env.PORTFOLIO_SOURCE_ROOT.replaceAll('\\', '/')}/` : new URL('../src/', import.meta.url);
const readSource = name => readFile(typeof sourceRoot === 'string' ? `${sourceRoot}${name}` : new URL(name, sourceRoot), 'utf8');
const importSource = source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { projectEvidence } = await importSource(await readSource('projectEvidence.js'));
const { projectStories } = await importSource((await readSource('projectStories.js'))
  .replace(/import \{ projectEvidence \} from '\.\/projectEvidence\.js';/, `const projectEvidence = ${JSON.stringify(projectEvidence)};`)
  .replaceAll('import.meta.env.BASE_URL', "'/'"));
const { projects } = await importSource((await readSource('content.js'))
  .replace(/import \{ projectStories \} from '\.\/projectStories\.js';/, `const projectStories = ${JSON.stringify(projectStories)};`)
  .replaceAll('import.meta.env.BASE_URL', "'/'"));

test('paragraph boundaries do not lose or rewrite any characters', () => {
  const text = '读懂一个结果，也要看它的来处。'.repeat(50) + '😀';
  const chunks = splitCopy(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => Array.from(chunk).length <= 220));
});

for (const project of projects) {
  test(`${project.label}: every paragraph, image, table, link and video note is retained`, () => {
    const blocks = newspaperBlocks(project), overview = blocks[1];
    const sections = [...(project.sections || []).map((section, index) => ({ ...section, id: `short-${index}`, paragraphs: [section.text] })), ...(project.story || [])];
    for (const section of sections) {
      assert.equal(blocks.filter(block => block.kind === 'heading' && block.sectionId === section.id).length, 1);
      section.paragraphs.forEach((paragraph, index) => {
        assert.equal(blocks.filter(block => block.paragraphId === `${section.id}-p-${index}`).map(block => block.text).join(''), paragraph);
      });
    }
    const figures = [...blocks.filter(block => block.kind === 'figure').map(block => block.figure), ...(overview.featureFigure ? [overview.featureFigure] : [])];
    assert.deepEqual(figures.map(figure => figure.src).sort(), sections.flatMap(section => section.figures || []).map(figure => figure.src).sort());
    const tables = [...blocks.filter(block => block.kind === 'table').map(block => block.table), ...(overview.featureTable ? [overview.featureTable] : [])];
    assert.deepEqual(tables, sections.filter(section => section.table).map(section => section.table));
    assert.deepEqual(blocks.filter(block => block.kind === 'links').flatMap(block => block.links), sections.flatMap(section => section.links || []));
    assert.equal(blocks[0].project.intro, project.intro);
    assert.deepEqual(blocks.filter(block => block.kind === 'film-notes').map(block => block.film.productionNotes), (project.videos || []).map(film => film.productionNotes));
  });
  test(`${project.label}: repagination keeps every content unit exactly once`, () => {
    const blocks = newspaperBlocks(project), heights = Object.fromEntries(blocks.map(block => [block.id, block.kind === 'heading' ? 52 : block.kind === 'copy' ? 170 : 230]));
    for (const room of [350, 450, 600, 760]) {
      const pages = paginateNewspaper(blocks, heights, room);
      const originals = pages.flatMap(page => page.blocks).filter(block => !block.continued);
      assert.deepEqual(originals.map(block => block.id), blocks.map(block => block.id));
      for (const page of pages) {
        if (page.blocks.some(block => block.isolated)) assert.equal(page.blocks.length, 1);
        else assert.ok(page.blocks.reduce((total, block, index) => total + heights[block.id] + (index ? 10 : 0), 0) <= room);
      }
    }
  });
}
test('video works each occupy their own facing video/notes spread', () => {
  const blocks = newspaperBlocks(projects.find(project => project.id === 'video-design'));
  const pages = paginateNewspaper(blocks, {}, 450);
  assert.equal(pages.length, 6);
  assert.deepEqual(pages.map(page => page.blocks[0].kind), ['cover', 'overview', 'film', 'film-notes', 'film', 'film-notes']);
});
test('a heading travels with its paragraph rather than ending a sheet alone', () => {
  const blocks = [{ id: 'a', kind: 'copy' }, { id: 's-heading', kind: 'heading', sectionId: 's', title: '标题' }, { id: 'b', kind: 'copy', sectionId: 's' }];
  const pages = paginateNewspaper(blocks, { a: 210, 's-heading': 50, b: 140 }, 350);
  assert.deepEqual(pages.map(page => page.blocks.map(block => block.id)), [['a'], ['s-heading', 'b']]);
});
test('the confirmed Hong Kong date and all fourteen evidence images survive', () => {
  assert.equal(projects.find(project => project.id === 'ai-robotics').period, '2026 年 1 月 31 日—2 月 6 日');
  const count = projects.flatMap(project => newspaperBlocks(project)).reduce((sum, block) => sum + (block.kind === 'figure' ? 1 : block.featureFigure ? 1 : 0), 0);
  assert.equal(count, 14);
});
