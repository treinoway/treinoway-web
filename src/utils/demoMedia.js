// True when the exercise has its own demo media (YouTube link or GIF), the same fields the student app plays.
export const hasDemoMedia = (exercise) => Boolean(exercise?.videoUrl?.trim?.() || exercise?.gifUrl?.trim?.());
