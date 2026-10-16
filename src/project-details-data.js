// Keep the gallery metadata small. Long-form accounts join it only in the reader.
export function withProjectStory(project, stories) {
  return { ...project, story: stories[project.storyKey] || [] };
}
