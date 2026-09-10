import { newlyArrivedIds } from '../src/components/useEntryArrival';

describe('newlyArrivedIds', () => {
  it('has no arrivals the first time a list is seen', () => {
    // Opening the app, or coming back to a day for the first time: every row
    // is "new" to the code and none of them is new to the user.
    expect(newlyArrivedIds(null, ['a', 'b', 'c'])).toEqual([]);
  });

  it('finds the entry that was just written', () => {
    expect(newlyArrivedIds(['a', 'b'], ['a', 'b', 'c'])).toEqual(['c']);
  });

  it('says nothing when the list only lost rows', () => {
    // Removing with "Desfazer" moves rows around; none of them arrived.
    expect(newlyArrivedIds(['a', 'b', 'c'], ['a', 'c'])).toEqual([]);
  });

  it('says nothing when the list did not change', () => {
    expect(newlyArrivedIds(['a', 'b'], ['a', 'b'])).toEqual([]);
  });

  it('keeps a copied meal in the order the list prints it', () => {
    // The stagger index comes from this order, so it has to be the reading
    // order and not the order the writes happened to resolve in.
    expect(newlyArrivedIds(['a'], ['a', 'b', 'c', 'd'])).toEqual([
      'b',
      'c',
      'd',
    ]);
  });

  it('counts an entry put back by "Desfazer" as an arrival', () => {
    expect(newlyArrivedIds(['a'], ['a', 'b'])).toEqual(['b']);
  });
});
