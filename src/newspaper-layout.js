// The source accounts stay unchanged. Only their presentation is paginated.
export function splitCopy(text, limit = 220) {
  const chars = Array.from(text || '');
  const pieces = [];
  while (chars.length > limit) {
    let end = limit;
    for (let i = limit - 1; i >= Math.floor(limit * .55); i--) {
      if (/[。！？；.!?]/.test(chars[i])) { end = i + 1; break; }
    }
    pieces.push(chars.splice(0, end).join(''));
  }
  if (chars.length) pieces.push(chars.join(''));
  return pieces;
}

export function newspaperBlocks(project) {
  const sections = [
    ...(project.sections || []).map((section, index) => ({
      ...section, id: `short-${index}`, paragraphs: [section.text],
    })),
    ...(project.story || []),
  ];
  const preferred = project.id === 'machine-learning' ? 'xgboost' : project.id === 'survey-system' ? 'prototype' : null;
  const illustrated = sections.find(section => section.id === preferred && section.figures?.length)
    || sections.find(section => section.figures?.length);
  const featureFigure = illustrated?.figures[0];
  const featureTable = sections.find(section => section.table)?.table;
  const blocks = [
    { id: 'front-cover', kind: 'cover', isolated: true, name: '头版', project },
    { id: 'front-overview', kind: 'overview', isolated: true, name: '本期导读', project,
      featureFigure, featureTable, featureTitle: featureTable?.caption || illustrated?.title, sections },
  ];
  for (const film of project.videos || []) {
    blocks.push({ id: `film-${film.id}`, kind: 'film', isolated: true, name: film.title, film });
    blocks.push({ id: `notes-${film.id}`, kind: 'film-notes', isolated: true, name: `${film.title} · 制作说明`, film });
  }
  sections.forEach((section, index) => {
    const common = { sectionId: section.id, sectionTitle: section.title, name: section.title };
    blocks.push({ ...common, id: `${section.id}-heading`, kind: 'heading', title: section.title, breakBefore: index === 0 });
    (section.paragraphs || []).forEach((paragraph, paragraphIndex) => {
      splitCopy(paragraph).forEach((text, partIndex) => blocks.push({
        ...common, id: `${section.id}-p-${paragraphIndex}-${partIndex}`, kind: 'copy', text,
        paragraphId: `${section.id}-p-${paragraphIndex}`,
      }));
    });
    (section.figures || []).filter(figure => figure !== featureFigure).forEach((figure, figureIndex) => {
      blocks.push({ ...common, id: `${section.id}-figure-${figureIndex}`, kind: 'figure', figure });
    });
    if (section.table && section.table !== featureTable) blocks.push({ ...common, id: `${section.id}-table`, kind: 'table', table: section.table });
    if (section.links?.length) blocks.push({ ...common, id: `${section.id}-links`, kind: 'links', links: section.links });
  });
  return blocks;
}

export function paginateNewspaper(blocks, heights, room, gap = 10) {
  const pages = [];
  let current = [], used = 0;
  const height = block => heights[block.continued ? `${block.id}:continued` : block.id] || heights[block.id] || 24;
  const flush = () => {
    if (!current.length) return;
    const first = current.find(block => !block.continued) || current[0];
    pages.push({ key: first.id, name: first.name, blocks: current });
    current = []; used = 0;
  };
  const add = block => { used += (current.length ? gap : 0) + height(block); current.push(block); };
  const continuation = block => {
    if (!block.sectionId || block.kind === 'heading' || current.length) return;
    const original = blocks.find(item => item.id === `${block.sectionId}-heading`);
    if (original) add({ ...original, continued: true });
  };
  blocks.forEach((block, index) => {
    if (block.isolated) { flush(); add(block); flush(); return; }
    if (block.breakBefore) flush();
    const next = blocks[index + 1];
    const together = block.kind === 'heading' && next && !next.isolated ? gap + height(next) : 0;
    // Keep a heading with its first paragraph when the pair fits a sheet.
    const required = height(block) + (height(block) + together <= room ? together : 0);
    if (current.length && used + gap + required > room) flush();
    continuation(block);
    if (current.length && used + gap + height(block) > room && !current.every(item => item.continued)) {
      flush(); continuation(block);
    }
    add(block);
  });
  flush();
  return pages;
}
