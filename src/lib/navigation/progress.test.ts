import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyNavigationStart, setNavigationStartListener } from './progress';

describe('navigation progress bridge', () => {
  afterEach(() => {
    setNavigationStartListener(null);
  });

  it('does nothing when no listener is registered', () => {
    expect(() => notifyNavigationStart()).not.toThrow();
  });

  it('calls the registered listener synchronously on every navigation start', () => {
    const listener = vi.fn();
    setNavigationStartListener(listener);

    notifyNavigationStart();
    expect(listener).toHaveBeenCalledTimes(1);

    notifyNavigationStart();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops calling a listener that was cleared', () => {
    const listener = vi.fn();
    setNavigationStartListener(listener);
    setNavigationStartListener(null);

    notifyNavigationStart();
    expect(listener).not.toHaveBeenCalled();
  });
});
