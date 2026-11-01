import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('verifies the password it hashed and rejects another one', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong')).resolves.toBe(false);
  });
});
