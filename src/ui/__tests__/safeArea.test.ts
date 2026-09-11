import { resolveInsets } from '../safeArea';

const native = { top: 59, bottom: 34, left: 0, right: 0 };

describe('resolveInsets', () => {
  it('на нативе отдаёт отступы как есть', () => {
    expect(resolveInsets(native, 'ios')).toEqual(native);
    expect(resolveInsets(native, 'android')).toEqual(native);
  });

  it('на вебе обнуляет их, потому что отступ уже взял на себя #root', () => {
    // Иначе безопасная зона отсчитывается дважды: один раз в CSS env(),
    // второй — в стилях компонента, и таб-бар отъезжает вверх на 34 пикселя.
    expect(resolveInsets(native, 'web')).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
