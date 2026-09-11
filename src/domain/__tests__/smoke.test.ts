import { PROJECT_NAME } from '../meta';

describe('тестовый контур', () => {
  it('видит модули из src/domain', () => {
    expect(PROJECT_NAME).toBe('SubTrack');
  });
});
