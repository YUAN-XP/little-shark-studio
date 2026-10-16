import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { newspaperBlocks, paginateNewspaper, splitCopy } from '../src/newspaper-layout.js';
import { withProjectStory } from '../src/project-details-data.js';

// Load the real source accounts without changing the Vite-only asset prefix.
const sourceRoot = process.env.PORTFOLIO_SOURCE_ROOT ? `${process.env.PORTFOLIO_SOURCE_ROOT.replaceAll('\\', '/')}/` : new URL('../src/', import.meta.url);
const readSource = name => readFile(typeof sourceRoot === 'string' ? `${sourceRoot}${name}` : new URL(name, sourceRoot), 'utf8');
const importSource = source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { projectEvidence } = await importSource(await readSource('projectEvidence.js'));
const { projectStories } = await importSource((await readSource('projectStories.js'))
  .replace(/import \{ projectEvidence \} from '\.\/projectEvidence\.js';/, `const projectEvidence = ${JSON.stringify(projectEvidence)};`)
  .replaceAll('import.meta.env.BASE_URL', "'/'"));
const { projects: metadata } = await importSource((await readSource('content.js'))
  .replace(/import \{ projectStories \} from '\.\/projectStories\.js';/, `const projectStories = ${JSON.stringify(projectStories)};`)
  .replaceAll('import.meta.env.BASE_URL', "'/'"));

const projects = metadata.map(project => withProjectStory(project, projectStories));

test('paragraph boundaries do not lose or rewrite any characters', () => {
  const text = '读懂一个结果，也要看它的来处。'.repeat(50) + '😀';
  const chunks = splitCopy(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => Array.from(chunk).length <= 220));
});

for (const project of projects) {
  test(`${project.label}: every paragraph, image, table, link and video note is retained`, () => {
    const blocks = newspaperBlocks(project), overview = blocks.find(block=>block.kind==='overview');
    const sections = [...(project.sections || []).map((section, index) => ({ ...section, id: `short-${index}`, paragraphs: [section.text] })), ...(project.story || [])];
    for (const section of sections) {
      assert.equal(blocks.filter(block => block.kind === 'heading' && block.sectionId === section.id).length, section.projectStart ? 1 : 0);
      section.paragraphs.forEach((paragraph, index) => {
        const copies=[...blocks.filter(block=>block.kind==='copy'),...(overview?.featureCopy||[])];
        assert.equal(copies.filter(block => block.paragraphId === `${section.id}-p-${index}`).map(block => block.text).join(''), paragraph);
      });
    }
    const figures = [...blocks.filter(block => block.kind === 'figure').map(block => block.figure), ...(overview?.featureFigure ? [overview.featureFigure] : []), ...(blocks[0].coverFigure&&!blocks[0].coverFigure.filmPoster?[blocks[0].coverFigure]:[])];
    assert.deepEqual(figures.map(figure => figure.src).sort(), [...sections.flatMap(section => section.figures || []), ...(project.coverFigure ? [project.coverFigure] : [])].map(figure => figure.src).sort());
    const tables = [...blocks.filter(block => block.kind === 'table').map(block => block.table), ...(overview?.featureTable ? [overview.featureTable] : [])];
    assert.deepEqual(tables, sections.filter(section => section.table).map(section => section.table));
    assert.deepEqual(blocks.filter(block => block.kind === 'links').flatMap(block => block.links), sections.flatMap(section => section.links || []));
    assert.equal(blocks[0].project.intro, project.intro);
    assert.deepEqual(blocks.filter(block => block.kind === 'film-notes' || (block.kind === 'film' && block.combined)).map(block => block.film.productionNotes), (project.videos || []).map(film => film.productionNotes));
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
test('the video issue opens with its guide followed by one complete page per film', () => {
  const project = projects.find(project => project.id === 'video-design');
  const blocks = newspaperBlocks(project);
  const pages = paginateNewspaper(blocks, {}, 450);
  assert.equal(pages.length, 3);
  assert.deepEqual(pages.map(page => page.blocks[0].kind), ['video-intro', 'film', 'film']);
  assert.equal(blocks[0].project.intro, project.intro);
  assert.deepEqual(blocks.slice(1).map(block=>block.film.id), ['three-body','digital-hubei']);
  assert.ok(blocks.slice(1).every(block=>block.combined && block.film.productionNotes));
  assert.equal(blocks[1].flightTarget, true);
  assert.equal(blocks[2].flightTarget, false);
  assert.ok(blocks.every(block=>!['cover','overview','film-notes'].includes(block.kind)));
});
test('a heading travels with its paragraph rather than ending a sheet alone', () => {
  const blocks = [{ id: 'a', kind: 'copy' }, { id: 's-heading', kind: 'heading', sectionId: 's', title: '标题' }, { id: 'b', kind: 'copy', sectionId: 's' }];
  const pages = paginateNewspaper(blocks, { a: 210, 's-heading': 50, b: 140 }, 350);
  assert.deepEqual(pages.map(page => page.blocks.map(block => block.id)), [['a'], ['s-heading', 'b']]);
});

test('a continued page begins with the next paragraph rather than a repeated headline',()=>{
  const blocks=[{id:'s-heading',kind:'heading',sectionId:'s',title:'独立项目'},...Array.from({length:5},(_,i)=>({id:`s-p-${i}`,kind:'copy',sectionId:'s'}))];
  const heights=Object.fromEntries(blocks.map(block=>[block.id,block.kind==='heading'?50:140]));
  const pages=paginateNewspaper(blocks,heights,350);
  assert.equal(pages.flatMap(page=>page.blocks).filter(block=>block.kind==='heading').length,1);
  assert.ok(pages.slice(1).every(page=>page.blocks[0].kind==='copy'));
  assert.ok(pages.every(page=>page.blocks.every(block=>!block.continued)));
});

test('machine-learning introduces its course and workflow before data, experiments and the original report',()=>{
  const project=projects.find(item=>item.id==='machine-learning'),blocks=newspaperBlocks(project);
  assert.match(blocks[0].coverFigure.src,/ml-workflow\.webp$/);
  assert.match(project.intro,/^在 Mark Vogelsberger 教授指导的线上项目中/);
  assert.ok(!blocks.some(block=>block.kind==='overview'||block.sectionId==='starting-point'));
  const at=id=>blocks.findIndex(block=>block.id===id);
  assert.ok(at('data-p-1-0')<at('xgboost-p-0-0'));
  assert.ok(at('xgboost-p-0-0')<at('xgboost-figure-0'));
  assert.ok(at('xgboost-figure-0')<at('xgboost-table'));
  assert.ok(at('xgboost-table')<at('report-p-0-0'));
  assert.ok(at('report-p-1-0')<at('report-links'));
  assert.ok(at('report-links')<at('bullying-review-heading'));
  assert.match(blocks[at('report-links')].links[0].href,/media\/projects\/reports\/student-stress-group-report\.pdf$/);
  assert.deepEqual(blocks.filter(block=>block.kind==='heading').map(block=>block.sectionId),['bullying-review','campus-survey']);
  assert.ok(blocks.find(block=>block.sectionId==='campus-survey').breakBefore);
});

test('robotics opens with its certificate and introduces each activity before its evidence',()=>{
  const blocks=newspaperBlocks(projects.find(item=>item.id==='ai-robotics'));
  assert.match(blocks[0].coverFigure.src,/hk-certificate\.webp$/);
  assert.ok(!blocks.some(block=>block.kind==='overview'));
  assert.equal(blocks[1].kind,'masthead');
  const at=id=>blocks.findIndex(block=>block.id===id);
  assert.ok(at('journey-p-0-0')<at('assembly-figure-0'));
  assert.ok(at('programming-p-0-0')<at('programming-figure-0'));
  assert.ok(!blocks.some(block=>block.kind==='figure'&&/hk-certificate/.test(block.figure.src)));
});

test('survey design explains the workflow before its schema and ends with the course report',()=>{
  const project=projects.find(item=>item.id==='survey-system'),blocks=newspaperBlocks(project);
  assert.match(project.intro,/这次独立课程设计中/);
  assert.match(blocks[0].coverFigure.src,/survey-list\.webp$/);
  assert.ok(!blocks.some(block=>block.kind==='overview'));
  assert.equal(blocks[1].kind,'masthead');
  const at=id=>blocks.findIndex(block=>block.id===id);
  assert.ok(at('workflow-p-0-0')<at('architecture-p-0-0'));
  assert.ok(at('architecture-p-0-0')<at('database-p-0-0'));
  assert.ok(at('database-p-0-0')<at('database-figure-0'));
  assert.ok(at('database-figure-0')<at('security-deployment-p-0-0'));
  assert.ok(at('security-deployment-p-0-0')<at('prototype-p-0-0'));
  assert.ok(at('prototype-p-0-0')<at('prototype-figure-0'));
  assert.ok(at('prototype-figure-1')<at('progress-p-0-0'));
  assert.equal(blocks.at(-1).id,'progress-links');
  assert.match(blocks.at(-1).links[0].href,/media\/projects\/reports\/survey-system-course-report\.pdf$/);
});

test('every detail cover uses original evidence, a video frame, or typography instead of its gallery illustration',()=>{
  for(const project of projects){
    const cover=newspaperBlocks(project)[0];
    if(cover.coverFigure)assert.notEqual(cover.coverFigure.src,project.image);
  }
  for(const id of ['innovation-lidar']){
    const blocks=newspaperBlocks(projects.find(project=>project.id===id));
    assert.equal(blocks[0].coverFigure,null);
    assert.equal(blocks[1].kind,'masthead','text should start on the facing page without an empty overview');
  }
});
test('the confirmed Hong Kong date and all original evidence images survive alongside the game design drawings', () => {
  assert.equal(projects.find(project => project.id === 'ai-robotics').period, '2026 年 1 月 31 日—2 月 6 日');
  const count = projects.flatMap(project => newspaperBlocks(project)).reduce((sum, block) => sum + (block.kind === 'figure' ? 1 : block.featureFigure ? 1 : block.coverFigure&&!block.coverFigure.filmPoster ? 1 : 0), 0);
  assert.equal(count, 26);
  const game = projects.find(project => project.id === 'game-design');
  assert.equal(game.story.flatMap(section => section.figures || []).length, 11);
});

test('the game design guide targets existing sections and keeps the original sketches in the body', () => {
  const project = projects.find(project => project.id === 'game-design');
  const blocks = newspaperBlocks(project);
  assert.equal(blocks[0].coverFigure, project.coverFigure);
  assert.match(blocks[0].coverFigure.src, /game-gatsby-cover\.jpg$/);
  assert.equal(blocks[1].kind, 'guide');
  assert.ok(blocks[1].isolated);
  assert.ok(!blocks.some(block => block.kind === 'overview'));
  for (const entry of project.guide) {
    const target = blocks.find(block => block.sectionId === entry.sectionId);
    assert.ok(target, entry.sectionId);
    assert.ok(target.breakBefore, `${entry.sectionId} opens at the top of a sheet`);
  }
  assert.equal(blocks.filter(block => block.kind === 'subheading').length, project.story.length);
  assert.equal(blocks.filter(block => block.kind === 'figure').length, 11);
  assert.equal(blocks.at(-1).kind, 'links');
  assert.equal(blocks.at(-1).links[0].href, 'https://github.com/YUAN-XP/ProjectMystery');
});

test('design figures follow their explanation, preserve the original index and appear once', () => {
  const project = projects.find(project => project.id === 'game-design');
  const blocks = newspaperBlocks(project);
  for (const section of project.story) {
    for (const [index, figure] of (section.figures || []).entries()) {
      const figurePosition = blocks.findIndex(block => block.id === `${section.id}-figure-${index}`);
      const precedingParagraph = blocks.map((block, position) => ({block, position})).filter(({block}) => block.paragraphId === `${section.id}-p-${figure.afterParagraph}`).at(-1);
      assert.ok(precedingParagraph, figure.src);
      assert.ok(precedingParagraph.position < figurePosition, figure.src);
      const followingParagraphPosition = blocks.findIndex(block => block.paragraphId === `${section.id}-p-${figure.afterParagraph + 1}`);
      if (followingParagraphPosition >= 0) assert.ok(figurePosition < followingParagraphPosition, figure.src);
    }
  }
  const sources = blocks.filter(block => block.kind === 'figure').map(block => block.figure.src);
  assert.equal(new Set(sources).size, sources.length);
  assert.equal(blocks.filter(block => block.figure?.sketch).length, 11);
});

test('compact design headings stay with the opening paragraph across page sizes', () => {
  const blocks = [{id: 'previous', kind: 'copy'}, {id: 'design-title', kind: 'subheading'}, {id: 'design-copy', kind: 'copy'}];
  for (const room of [300, 350, 450]) {
    const pages = paginateNewspaper(blocks, {previous: 230, 'design-title': 38, 'design-copy': 170}, room);
    assert.ok(pages.some(page => page.blocks.some(block => block.id === 'design-title') && page.blocks.some(block => block.id === 'design-copy')));
  }
});

test('the game separates viewpoints and core tools before following the Demo route', () => {
  const project = projects.find(project => project.id === 'game-design');
  const sections = project.story.map(section => section.id);
  const ordered = ids => {
    const positions = ids.map(id => sections.indexOf(id));
    assert.ok(positions.every(position => position >= 0));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  };
  ordered(['story', 'xiaopeng-view', 'qiutian-view', 'narrative-order', 'spatial-loops', 'core-tools', 'camera', 'lamp', 'opening']);
  ordered(['opening', 'courtyard-first', 'corridor', 'childhood', 'street-games', 'maze', 'guitar', 'family-photo', 'fog-passage', 'school', 'school-youth', 'chase', 'return-hub', 'ending']);
  assert.equal(sections.indexOf('lamp'), sections.indexOf('camera') + 1);
  assert.ok(project.story.find(section => section.id === 'courtyard-first').figures.some(figure => /game-hidden-door-sketch/.test(figure.src)));
  assert.equal(project.story.find(section => section.id === 'camera').figures, undefined);
});
