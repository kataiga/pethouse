import { Language } from '@common/enums/language.enum';
import { User } from '../entity/user.entity';
import { UserRepository } from '../repository/user.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const flush = jest.fn();
  const persist = jest.fn();
  const repository = {
    create: jest.fn((data: Partial<User>) => Object.assign(new User(), data)),
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    getEntityManager: () => ({
      flush,
      persist,
    }),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(repository as unknown as UserRepository);
  });

  it('applies only the provided profile fields and flushes once', async () => {
    const user = new User();
    user.displayName = 'Alex';
    user.preferredLanguage = Language.FR;

    await service.updateProfile(user, { preferredLanguage: Language.EN });

    expect(user.displayName).toBe('Alex');
    expect(user.preferredLanguage).toBe(Language.EN);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('creates a user with a lower-cased email and the default language, persisted but not flushed', () => {
    const user = service.create({
      email: 'Alex@Example.com',
      passwordHash: 'hash',
      displayName: 'Alex',
    });

    expect(user.email).toBe('alex@example.com');
    expect(user.preferredLanguage).toBe(Language.FR);
    expect(persist).toHaveBeenCalledWith(user);
    expect(flush).not.toHaveBeenCalled();
  });

  it('looks users up by lower-cased email through the repository', async () => {
    repository.findByEmail.mockResolvedValue(null);

    await expect(service.findByEmail('Alex@Example.com')).resolves.toBeNull();
    expect(repository.findByEmail).toHaveBeenCalledWith('Alex@Example.com');
  });
});
