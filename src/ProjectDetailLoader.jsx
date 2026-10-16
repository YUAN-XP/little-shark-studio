import { useMemo } from 'react';
import ProjectDetail from './ProjectDetail.jsx';
import { projectStories } from './projectStories.js';
import { withProjectStory } from './project-details-data.js';

export default function ProjectDetailLoader({ project, ...props }) {
  const resolved = useMemo(() => withProjectStory(project, projectStories), [project]);
  return <ProjectDetail {...props} project={resolved} />;
}
