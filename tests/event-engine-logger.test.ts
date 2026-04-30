import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEngine } from '@/lib/utils/event-engine';
import { EventLogger, IndexedDBEventLogger } from '@/lib/utils/event-logger';
import { createRandomProposal } from '@/lib/utils/proposal-utils';

vi.mock('@/lib/utils/proposal-utils', () => ({
  createRandomProposal: vi.fn(),
}));

function createModel(overrides: Record<string, unknown> = {}) {
  const published: Array<{ event: string; data: unknown }> = [];
  const proposals: unknown[] = [];
  const model = {
    currentStep: 7,
    dao: {
      members: [{ uniqueId: 'member_1' }],
      proposals,
      treasury: {
        price: 1,
        getTokenPrice: vi.fn(() => 1),
        updateTokenPrice: vi.fn((_: string, price: number) => {
          model.dao.treasury.price = price;
        }),
      },
      addProposal: vi.fn((proposal: unknown) => {
        proposals.push(proposal);
      }),
    },
    eventBus: {
      publish: vi.fn((event: string, data: unknown) => {
        published.push({ event, data });
      }),
    },
    ...overrides,
  };

  return { model, published, proposals };
}

describe('EventEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads events by step and exports them as JSON', () => {
    const engine = new EventEngine([
      { step: 2, type: 'market_shock', severity: -0.2 },
      { step: 2, type: 'create_proposal', title: 'Budget' },
      { step: 5, type: 'unknown' },
    ]);

    expect(engine.getEventsForStep(2)).toHaveLength(2);
    expect(engine.listEvents()).toHaveLength(3);
    expect(JSON.parse(engine.toJson()).events).toHaveLength(3);
  });

  it('loads events from array or object JSON and rejects malformed JSON shape', () => {
    const engine = new EventEngine();
    engine.loadFromJson(JSON.stringify({ events: [{ step: 1, type: 'market_shock' }] }));
    expect(engine.getEventsForStep(1)).toHaveLength(1);

    engine.loadFromJson(JSON.stringify([{ step: 3, type: 'create_proposal' }]));
    expect(engine.getEventsForStep(3)).toHaveLength(1);

    expect(() => engine.loadFromJson(JSON.stringify({ nope: [] }))).toThrow(
      'Event data must be an array or contain an "events" array'
    );
  });

  it('triggers market shocks with a model-provided shock method', () => {
    const triggerMarketShock = vi.fn();
    const { model } = createModel({ triggerMarketShock });
    const engine = new EventEngine([{ step: 4, type: 'market_shock', severity: -0.4 }]);

    engine.triggerEvents(4, model as never);

    expect(triggerMarketShock).toHaveBeenCalledWith(-0.4);
    expect(engine.getEventsForStep(4)).toEqual([]);
  });

  it('falls back to treasury price updates for market shocks', () => {
    const { model } = createModel();
    const engine = new EventEngine([{ step: 4, type: 'market_shock', severity: -0.25 }]);

    engine.triggerEvents(4, model as never);

    expect(model.dao.treasury.updateTokenPrice).toHaveBeenCalledWith('DAO_TOKEN', 0.75);
    expect(model.eventBus.publish).toHaveBeenCalledWith('market_shock', {
      step: 7,
      severity: -0.25,
      oldPrice: 1,
      newPrice: 0.75,
    });
  });

  it('creates proposals from event configuration', () => {
    const proposal = { id: 'proposal_1' };
    vi.mocked(createRandomProposal).mockReturnValue(proposal as never);
    const { model, proposals } = createModel();
    const engine = new EventEngine([{ step: 4, type: 'create_proposal', title: 'Upgrade' }]);

    engine.triggerEvents(4, model as never);

    expect(createRandomProposal).toHaveBeenCalledWith(model.dao, model.dao.members[0], 'Upgrade');
    expect(model.dao.addProposal).toHaveBeenCalledWith(proposal);
    expect(proposals).toEqual([proposal]);
  });

  it('warns for unknown event types and supports runtime events', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { model } = createModel();
    const engine = new EventEngine();

    engine.addEvent({ step: 8, type: 'unknown_type' });
    engine.triggerEvents(8, model as never);

    expect(warn).toHaveBeenCalledWith('Unknown event type: unknown_type');
    engine.clear();
    expect(engine.listEvents()).toEqual([]);
  });
});

describe('EventLogger', () => {
  it('records, filters, summarizes, exports, and clears events', () => {
    const logger = new EventLogger(2);

    logger.log(1, 'alpha', { value: 1 });
    logger.handleEvent('beta,event', { step: 2, message: 'hello "dao"' });
    logger.log(3, 'alpha', { value: 3 });

    expect(logger.getEntries()).toHaveLength(2);
    expect(logger.getEntriesForStep(2)).toHaveLength(1);
    expect(logger.getEntriesForEvent('alpha')).toHaveLength(1);
    expect(logger.getSummary()).toEqual({
      totalEvents: 2,
      eventTypes: 2,
      stepRange: [2, 3],
      counts: {
        'beta,event': 1,
        alpha: 1,
      },
    });
    expect(logger.toCSV()).toContain('2,"beta,event","{""message"":""hello \\""dao\\""""}"');
    expect(JSON.parse(logger.toJSON())).toHaveLength(2);

    logger.clear();
    expect(logger.getEntries()).toEqual([]);
  });

  it('throws for browser-only downloads when running on the server', () => {
    const logger = new EventLogger();

    expect(() => logger.downloadCSV()).toThrow('downloadCSV is only available in browser environment');
    expect(() => logger.downloadJSON()).toThrow('downloadJSON is only available in browser environment');
  });
});

describe('IndexedDBEventLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to memory storage when IndexedDB is unavailable', async () => {
    const logger = new IndexedDBEventLogger('test-db', 10);

    await logger.log(1, 'event', { ok: true });

    expect(logger.getEntries()).toEqual([{ step: 1, event: 'event', details: { ok: true } }]);
    await expect(logger.loadFromDB()).resolves.toEqual([]);
    await expect(logger.clearDB()).resolves.toBeUndefined();
    logger.close();
  });
});
