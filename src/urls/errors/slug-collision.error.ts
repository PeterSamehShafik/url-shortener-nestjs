export class SlugCollisionError extends Error {
  constructor(public readonly slug: string) {
    super(`Slug '${slug}' is already taken.`);
    this.name = 'SlugCollisionError';
  }
}
