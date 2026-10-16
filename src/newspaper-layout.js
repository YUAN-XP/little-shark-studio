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
  const preferred = { 'machine-learning': 'data', 'ai-robotics': 'reflection', 'survey-system': 'prototype' }[project.id];
  const illustrated = sections.find(section => section.id === preferred && section.figures?.length)
    || sections.find(section => section.figures?.length);
  const film = project.videos?.[0];
  const videoIssue = project.id === 'video-design' && Boolean(film);
  // Gallery illustrations remain in the gallery. Inside the newspaper, use
  // original project evidence, a real film frame, or a typographic cover.
  const coverFigure = videoIssue || project.typographicCover ? null : project.coverFigure || illustrated?.figures[0] || (film ? {
    src: film.poster, width: film.width, height: film.height,
    alt: `${film.title}视频画面`, caption: `${film.title} · 视频画面`, filmPoster: true,
  } : null);
  // Introduce the work before its detailed figures or results.
  const readInOrder = ['machine-learning', 'ai-robotics', 'survey-system', 'game-design'].includes(project.id);
  const featureSection = videoIssue || readInOrder ? null : sections.find(section => section.figures?.some(figure => figure !== coverFigure));
  const featureFigure = featureSection?.figures.find(figure => figure !== coverFigure);
  const featureTable = videoIssue || readInOrder ? null : sections.find(section => section.table)?.table;
  const hasOverview = Boolean(featureFigure || featureTable || project.videos?.length);
  const blocks = videoIssue ? [
    { id: 'front-intro', kind: 'video-intro', isolated: true, name: '影像作品导读', project },
  ] : [
    { id: 'front-cover', kind: 'cover', isolated: true, name: '头版', project, coverFigure },
    ...(project.guide?.length ? [{ id: 'front-guide', kind: 'guide', isolated: true, name: '创作导读', guide: project.guide }]
      : hasOverview ? [{ id: 'front-overview', kind: 'overview', isolated: true, name: '项目记录', project,
      featureFigure, featureTable, featureCopy: [], sections }]
      : sections.length ? [{ id: 'body-masthead', kind: 'masthead', name: '项目记录' }] : []),
  ];
  const guideSections = new Set((project.guide || []).map(entry => entry.sectionId));
  for (const [index, film] of (project.videos || []).entries()) {
    blocks.push({ id: `film-${film.id}`, kind: 'film', isolated: true, name: film.title, film,
      combined: videoIssue, flightTarget: videoIssue && index === 0 });
    if (!videoIssue) blocks.push({ id: `notes-${film.id}`, kind: 'film-notes', isolated: true, name: `${film.title} · 制作说明`, film });
  }
  sections.forEach(section => {
    const common = { sectionId: section.id, sectionTitle: section.title, name: section.title };
    // Only an independent project starts a new headline. Ordinary process
    // sections and page continuations flow straight into the next paragraph.
    if (section.projectStart) blocks.push({ ...common, id: `${section.id}-heading`, kind: 'heading', title: section.title, breakBefore: true });
    else if (section.showHeading) blocks.push({ ...common, id: `${section.id}-subheading`, kind: 'subheading', title: section.title, breakBefore: guideSections.has(section.id) });
    const figures = (section.figures || []).filter(figure => figure !== featureFigure && figure !== coverFigure)
      .map((figure, figureIndex) => ({ figure, figureIndex }));
    const addFigure = ({ figure, figureIndex }) => blocks.push({
      ...common, id: `${section.id}-figure-${figureIndex}`, kind: 'figure', figure,
    });
    (section.paragraphs || []).forEach((paragraph, paragraphIndex) => {
      splitCopy(paragraph).forEach((text, partIndex) => blocks.push({
        ...common, id: `${section.id}-p-${paragraphIndex}-${partIndex}`, kind: 'copy', text,
        paragraphId: `${section.id}-p-${paragraphIndex}`,
      }));
      figures.filter(({ figure }) => figure.afterParagraph === paragraphIndex).forEach(addFigure);
    });
    figures.filter(({ figure }) => !Number.isInteger(figure.afterParagraph)
      || figure.afterParagraph < 0 || figure.afterParagraph >= (section.paragraphs || []).length).forEach(addFigure);
    if (section.table && section.table !== featureTable) blocks.push({ ...common, id: `${section.id}-table`, kind: 'table', table: section.table });
    if (section.links?.length) blocks.push({ ...common, id: `${section.id}-links`, kind: 'links', links: section.links });
  });
  return blocks;
}

export function paginateNewspaper(blocks, heights, room, gap = 10) {
  const pages = [];
  let current = [], used = 0;
  const height = block => heights[block.id] || 24;
  const flush = () => {
    if (!current.length) return;
    const first = current[0];
    pages.push({ key: first.id, name: first.name, blocks: current });
    current = []; used = 0;
  };
  const add = block => { used += (current.length ? gap : 0) + height(block); current.push(block); };
  blocks.forEach((block, index) => {
    if (block.isolated) { flush(); add(block); flush(); return; }
    if (block.breakBefore) flush();
    const next = blocks[index + 1];
    const together = ['heading', 'subheading', 'masthead'].includes(block.kind) && next && !next.isolated ? gap + height(next) : 0;
    // Keep a heading with its first paragraph when the pair fits a sheet.
    const required = height(block) + (height(block) + together <= room ? together : 0);
    if (current.length && used + gap + required > room) flush();
    add(block);
  });
  flush();
  return pages;
}
