import { Language } from '@common/enums/language.enum';
import { notificationContent } from './notification-content';

describe('notificationContent', () => {
  const target = {
    occurrenceId: 311,
    routineId: 7,
    routineName: 'Water change',
    tankId: 42,
    tankName: 'Living room',
  };

  it('writes the due notification in the recipient language, with the deep link', () => {
    expect(notificationContent(target, 0, Language.FR)).toEqual({
      title: 'Water change',
      body: 'À faire maintenant · Living room',
      data: {
        url: 'pethouse://tanks/42/routines/7',
        occurrenceId: 311,
        routineId: 7,
        tankId: 42,
        attempt: 0,
      },
    });
    expect(notificationContent(target, 0, Language.EN).body).toBe('Due now · Living room');
  });

  it('words reminders differently', () => {
    expect(notificationContent(target, 2, Language.EN).body).toBe('Reminder: still to do · Living room');
    expect(notificationContent(target, 1, Language.FR).body).toBe('Rappel : toujours à faire · Living room');
  });
});
