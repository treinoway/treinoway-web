// True when the exercise has its own demo media (uploaded video, YouTube link or GIF), the same fields the student app plays.
export const hasDemoMedia = (exercise) =>
  Boolean(exercise?.videoFileKey || exercise?.videoFileUrl || exercise?.videoUrl?.trim?.() || exercise?.gifUrl?.trim?.());
