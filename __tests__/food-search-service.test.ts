import type {
  FoodProvider,
  SearchOptions,
} from '../src/domain/food/FoodProvider';
import {
  searchOnline,
  shouldSearchOnline,
  MIN_ONLINE_QUERY,
  PRODUCTS_LIMIT,
  type OnlineSearchDeps,
} from '../src/domain/food/FoodSearchService';
import {
  REFERENCE_SERVING,
  type FoodSource,
  type NormalizedFood,
} from '../src/domain/food/NormalizedFood';

function food(
  id: string,
  name: string,
  extra: Partial<NormalizedFood> = {},
): NormalizedFood {
  const [source, sourceId] = id.split(':');
  return {
    id,
    source: source as FoodSource,
    sourceId,
    name: { pt: name, en: name },
    verified: false,
    per100g: {
      kcal: 100,
      protein_g: 1,
      carbs_g: 10,
      fat_g: 1,
      energySource: 'declared',
    },
    servings: [{ ...REFERENCE_SERVING, isDefault: true }],
    completeness: 1,
    lastFetchedAt: '2026-09-09T00:00:00.000Z',
    attribution: { license: 'ODbL-1.0+DbCL', text: '' },
    ...extra,
  };
}

class FakeProvider implements FoodProvider {
  readonly offline = false;
  calls: string[] = [];

  constructor(
    readonly source: FoodSource,
    private readonly answer: (
      query: string,
      options: SearchOptions,
    ) => Promise<NormalizedFood[]>,
  ) {}

  search(query: string, options: SearchOptions) {
    this.calls.push(query);
    return this.answer(query, options);
  }

  async getById() {
    return null;
  }
}

const answering = (foods: NormalizedFood[]) => async () => foods;
const failing = () => async () => {
  throw new Error('network down');
};
const hanging = () => () => new Promise<NormalizedFood[]>(() => {});

function deps(
  off: FoodProvider,
  usda: FoodProvider,
  overrides: Partial<OnlineSearchDeps> = {},
): OnlineSearchDeps {
  return { off, usda, timeoutMs: 50, ...overrides };
}

const NUTELLA = [
  food('off:789', 'Nutella', { brand: 'Ferrero', barcode: '789' }),
];

describe('the online gate', () => {
  it('needs three characters', () => {
    expect(MIN_ONLINE_QUERY).toBe(3);
    expect(shouldSearchOnline('nu')).toBe(false);
    expect(shouldSearchOnline('  nu  ')).toBe(false);
    expect(shouldSearchOnline('nut')).toBe(true);
  });

  it('asks no provider for a short query', async () => {
    const off = new FakeProvider('off', answering(NUTELLA));
    const usda = new FakeProvider('usda', answering([]));

    const result = await searchOnline(deps(off, usda), {
      query: 'nu',
      locale: 'pt-BR',
      local: [],
    });

    expect(off.calls).toEqual([]);
    expect(usda.calls).toEqual([]);
    expect(result).toMatchObject({
      attempted: false,
      offline: false,
      products: [],
    });
  });
});

describe('the products group', () => {
  it('returns what Open Food Facts answered', async () => {
    const off = new FakeProvider('off', answering(NUTELLA));
    const usda = new FakeProvider('usda', answering([]));

    const result = await searchOnline(deps(off, usda), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(result.products.map(item => item.id)).toEqual(['off:789']);
    expect(result.attempted).toBe(true);
    expect(result.offline).toBe(false);
  });

  it('never lists a product the local table already shows', async () => {
    const local = [
      food('taco:3', 'Nutella', {
        verified: true,
        barcode: '789',
        source: 'taco',
      }),
    ];
    const off = new FakeProvider('off', answering(NUTELLA));
    const usda = new FakeProvider('usda', answering([]));

    const result = await searchOnline(deps(off, usda), {
      query: 'nutella',
      locale: 'pt-BR',
      local,
    });

    expect(result.products).toEqual([]);
    expect(result.base[0].id).toBe('taco:3');
  });

  it('shows at most ten products', async () => {
    const many = Array.from({ length: 25 }, (_value, index) =>
      food(`off:${index}`, `Nutella ${index}`, { barcode: String(index) }),
    );
    const off = new FakeProvider('off', answering(many));
    const usda = new FakeProvider('usda', answering([]));

    const result = await searchOnline(deps(off, usda), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(result.products).toHaveLength(PRODUCTS_LIMIT);
  });
});

describe('when USDA joins in', () => {
  it('is never dialled while the local table already answered', async () => {
    const local = Array.from({ length: 6 }, (_value, index) =>
      food(`taco:${index}`, `Arroz ${index}`, {
        source: 'taco',
        verified: true,
      }),
    );
    const off = new FakeProvider('off', answering([]));
    const usda = new FakeProvider('usda', answering([]));

    await searchOnline(deps(off, usda), {
      query: 'arroz',
      locale: 'pt-BR',
      local,
    });

    expect(usda.calls).toEqual([]);
  });

  it('stays out of the list while Brazil answered enough', async () => {
    const many = Array.from({ length: 6 }, (_value, index) =>
      food(`off:${index}`, `Arroz ${index}`, { barcode: String(index) }),
    );
    const off = new FakeProvider('off', answering(many));
    const usda = new FakeProvider(
      'usda',
      answering([food('usda:1', 'Rice, white', { source: 'usda' })]),
    );

    const result = await searchOnline(deps(off, usda), {
      query: 'arroz',
      locale: 'pt-BR',
      local: [],
    });

    // It may have been dialled in parallel, but the gate keeps it out.
    expect(result.products.some(item => item.source === 'usda')).toBe(false);
  });

  it('joins when the answer came back thin', async () => {
    const off = new FakeProvider('off', answering([]));
    const usda = new FakeProvider(
      'usda',
      answering([food('usda:1', 'Rice, white', { source: 'usda' })]),
    );

    const result = await searchOnline(deps(off, usda), {
      query: 'rice',
      locale: 'pt-BR',
      local: [],
    });

    expect(usda.calls).toEqual(['rice']);
    expect(result.products.map(item => item.id)).toEqual(['usda:1']);
  });

  it('always joins in en-US', async () => {
    const many = Array.from({ length: 6 }, (_value, index) =>
      food(`off:${index}`, `Rice ${index}`, { barcode: String(index) }),
    );
    const off = new FakeProvider('off', answering(many));
    const usda = new FakeProvider('usda', answering([]));

    await searchOnline(deps(off, usda), {
      query: 'rice',
      locale: 'en-US',
      local: [],
    });

    expect(usda.calls).toEqual(['rice']);
  });
});

describe('failure and cancellation', () => {
  it('reports offline when every provider asked failed', async () => {
    const off = new FakeProvider('off', failing());
    const usda = new FakeProvider('usda', failing());

    const result = await searchOnline(deps(off, usda), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(result.offline).toBe(true);
    expect(result.products).toEqual([]);
  });

  it('is not offline while one provider still answers', async () => {
    const off = new FakeProvider('off', failing());
    const usda = new FakeProvider(
      'usda',
      answering([food('usda:1', 'Rice', { source: 'usda' })]),
    );

    const result = await searchOnline(deps(off, usda), {
      query: 'rice',
      locale: 'pt-BR',
      local: [],
    });

    expect(result.offline).toBe(false);
    expect(result.products).toHaveLength(1);
  });

  it('gives up on a provider that never answers, without throwing', async () => {
    const off = new FakeProvider('off', hanging());
    const usda = new FakeProvider('usda', hanging());
    const local = [food('taco:3', 'Arroz', { source: 'taco', verified: true })];

    const started = Date.now();
    const result = await searchOnline(deps(off, usda), {
      query: 'arroz',
      locale: 'pt-BR',
      local,
    });

    // The local list stands, untouched, and the round ends on its own.
    expect(Date.now() - started).toBeLessThan(1000);
    expect(result.offline).toBe(true);
    expect(result.base.map(item => item.id)).toEqual(['taco:3']);
  });

  it('spends one deadline on the whole round, not one per provider', async () => {
    // Both hang: a ceiling per provider would take 2 × timeoutMs.
    const off = new FakeProvider('off', hanging());
    const usda = new FakeProvider('usda', hanging());
    const timeoutMs = 120;

    const started = Date.now();
    const result = await searchOnline(deps(off, usda, { timeoutMs }), {
      query: 'arroz',
      locale: 'pt-BR',
      local: [],
    });
    const elapsed = Date.now() - started;

    expect(elapsed).toBeGreaterThanOrEqual(timeoutMs - 20);
    expect(elapsed).toBeLessThan(timeoutMs * 2);
    expect(result.offline).toBe(true);
  });

  it('still fills the group when Open Food Facts times out', async () => {
    // The two run inside the same window, so a dead provider no longer eats
    // the round and leaves the other with nothing.
    const off = new FakeProvider('off', hanging());
    const usda = new FakeProvider(
      'usda',
      answering([food('usda:1', 'Rice, white', { source: 'usda' })]),
    );

    const result = await searchOnline(deps(off, usda, { timeoutMs: 120 }), {
      query: 'rice',
      locale: 'pt-BR',
      local: [],
    });

    expect(result.products.map(item => item.id)).toEqual(['usda:1']);
    expect(result.offline).toBe(false);
  });

  it('says which provider ended the round how', async () => {
    const off = new FakeProvider('off', failing());
    const usda = new FakeProvider('usda', answering([]));
    const onProviderDone = jest.fn();
    const onRoundDone = jest.fn();

    await searchOnline(deps(off, usda, { onProviderDone, onRoundDone }), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(onProviderDone).toHaveBeenCalledWith(
      'off',
      'error',
      0,
      expect.any(Number),
      expect.stringContaining('network down'),
    );
    expect(onRoundDone).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'nutella', products: 0 }),
    );
  });

  it('hands the abort signal to the provider', async () => {
    const controller = new AbortController();
    let seen: AbortSignal | undefined;
    const off = new FakeProvider('off', async (_query, options) => {
      seen = options.signal;
      return [];
    });
    const usda = new FakeProvider('usda', answering([]));

    await searchOnline(deps(off, usda), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
      signal: controller.signal,
    });

    expect(seen).toBe(controller.signal);
  });
});

describe('the search cache', () => {
  it('answers from the cache without touching the network', async () => {
    const off = new FakeProvider('off', answering(NUTELLA));
    const usda = new FakeProvider('usda', answering([]));
    const readCache = jest.fn(async (source: string) =>
      source === 'off' ? NUTELLA : [],
    );

    const result = await searchOnline(deps(off, usda, { readCache }), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(off.calls).toEqual([]);
    expect(result.products.map(item => item.id)).toEqual(['off:789']);
  });

  it('stores what a provider answered', async () => {
    const off = new FakeProvider('off', answering(NUTELLA));
    const usda = new FakeProvider('usda', answering([]));
    const writeCache = jest.fn(async () => undefined);

    await searchOnline(deps(off, usda, { writeCache }), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(writeCache).toHaveBeenCalledWith('off', 'pt-BR', 'nutella', NUTELLA);
  });

  it('does not cache a failed round', async () => {
    const off = new FakeProvider('off', failing());
    const usda = new FakeProvider('usda', failing());
    const writeCache = jest.fn(async () => undefined);

    await searchOnline(deps(off, usda, { writeCache }), {
      query: 'nutella',
      locale: 'pt-BR',
      local: [],
    });

    expect(writeCache).not.toHaveBeenCalled();
  });
});
