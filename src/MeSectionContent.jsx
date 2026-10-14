import HangingProfileCard from './HangingProfileCard.jsx';
import {personalIntro,experiences} from './content.js';
import './me-section.css';

export default function MeSectionContent({reducedMotion=false}) {
  return <div className="page-width me-content">
    <div className="me-dossier" data-motion-group>
      <div className="me-card-column" data-motion="card">
        <HangingProfileCard reducedMotion={reducedMotion}/>
      </div>
      <div className="me-information">
        <div className="me-introduction" data-motion-group>
          <h2 id="me-title" className="me-handwritten handwritten" data-motion="copy">Hi, I'm Xiaopeng.</h2>
          <p className="me-intro-text" data-motion="copy">{personalIntro.text}</p>
          <div className="me-interests" data-motion="copy">
            {personalIntro.interests.map(text=><span key={text}>{text}</span>)}
          </div>
        </div>
        <div className="me-experience" data-motion-group>
          <h3 className="me-subheading" data-motion="copy"><span>Experience</span><span>相关经历</span></h3>
          <ol className="me-timeline">
            {experiences.map(item=><li key={item.id} data-motion="copy">
              <div className="me-experience-top">
                <h4>{item.title}</h4>
                <span className="me-period"><time dateTime={item.start}>{item.start.replace('-','.')}</time>{item.end&&<> — <time dateTime={item.end}>{item.end.replace('-','.')}</time></>}</span>
              </div>
              <p className="me-organization">{item.organization}</p>
              <p className="me-experience-text">{item.text}</p>
              {item.details.map(detail=><p className="me-experience-text" key={detail.label}>
                <span className="me-experience-label">{detail.label}</span>{detail.text}
              </p>)}
            </li>)}
          </ol>
        </div>
      </div>
    </div>
  </div>;
}
