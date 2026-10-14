import { Fragment } from 'react';

// Keep real text in the DOM; only the visual word spans are animated.
export function MotionWords({ text, className = '' }) {
  return <span className={`motion-words ${className}`}>
    {text.split(/\s+/).map((word, index) => <Fragment key={`${word}-${index}`}>
      {index > 0 && ' '}
      <span className="motion-word-mask"><span className="motion-word" data-motion-word>{word}</span></span>
    </Fragment>)}
  </span>;
}

export function MotionChapter({ title }) {
  return <div className="motion-chapter page-width" data-motion-heading aria-hidden="true">
    <MotionWords text={title} />
  </div>;
}
