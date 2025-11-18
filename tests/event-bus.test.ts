import { EventBus } from '@/lib/utils/event-bus';

describe('EventBus', () => {
  it('publishes to specific and wildcard subscribers', () => {
    const bus = new EventBus();
    const events: any[] = [];

    const handler = (data: any) => events.push(data);
    const wildcard = (data: any) => events.push({ tag: 'wildcard', ...data });

    bus.subscribe('test', handler);
    bus.subscribe('*', wildcard);

    bus.publish('test', { payload: 1 });

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ event: 'test', payload: 1 });
    expect(events[1]).toMatchObject({ tag: 'wildcard', event: 'test', payload: 1 });
  });

  it('removes subscribers on unsubscribe', () => {
    const bus = new EventBus();
    const handler = () => {};

    bus.subscribe('once', handler);
    expect(bus.getSubscriberCount('once')).toBe(1);

    bus.unsubscribe('once', handler);
    expect(bus.getSubscriberCount('once')).toBe(0);
  });
});
