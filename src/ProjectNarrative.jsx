import './ProjectNarrative.css';

export default function ProjectNarrative({ projectId, sections }) {
  return <div className="project-narrative">
    {sections.map(section => <section className="project-narrative__section" key={section.id}
      aria-labelledby={`story-${projectId}-${section.id}`}>
      <h3 id={`story-${projectId}-${section.id}`}>{section.title}</h3>
      <div className="project-narrative__copy">
        {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      {section.table && <div className="project-narrative__table-wrap" tabIndex={0}
        role="region" aria-label={section.table.caption}>
        <table>
          <caption>{section.table.caption}</caption>
          <thead><tr>{section.table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
          <tbody>{section.table.rows.map(row => <tr key={row[0]}>{row.map((cell, index) =>
            index === 0 ? <th scope="row" key={index}>{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>
        {section.table.note && <p className="project-narrative__note">{section.table.note}</p>}
      </div>}
      {section.figures?.length > 0 && <div className={`project-narrative__figures${section.figures.length > 1 ? ' project-narrative__figures--pair' : ''}`}>
        {section.figures.map(figure => <figure key={figure.src} className="project-narrative__figure">
          <a href={figure.src} target="_blank" rel="noreferrer" aria-label={`查看大图：${figure.alt}`}>
            <img src={figure.src} width={figure.width} height={figure.height} alt={figure.alt}
              loading="lazy" decoding="async" />
          </a>
          <figcaption>{figure.caption}<span>点击图片查看大图</span></figcaption>
        </figure>)}
      </div>}
      {section.links?.length > 0 && <div className="project-narrative__links">
        {section.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a>)}
      </div>}
    </section>)}
  </div>;
}
