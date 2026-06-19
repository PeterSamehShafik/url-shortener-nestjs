export class EmailAlreadyExistsError extends Error {
  constructor(public readonly email: string) {
    super(`Email '${email}' is already registered.`);
    this.name = 'EmailAlreadyExistsError';
  }
}
