/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  memorable,
  Memorable,
  DefaultStorage,
  DefaultReconciler,
  MemorableStorage,
} from './memorable';

describe('memorable', () => {
  it('should initialize', () => {
    memorable();
    expect(Memorable).toBeDefined();
    expect(Memorable.storage).toBeInstanceOf(DefaultStorage);
    expect(Memorable.reconciler).toBeInstanceOf(DefaultReconciler);
    expect(Memorable.storage.state).toEqual({});
  });

  it('should work with a custom storage', async () => {
    class CustomStorage extends MemorableStorage {
      get(key: string) {
        return super.get(key);
      }

      set(key: string, value: any) {
        return super.set(key, `HELLO_${value}`);
      }

      remove(key: string) {
        return super.remove(key);
      }
    }

    memorable({
      storage: new CustomStorage(),
    });

    Memorable.storage.set('greetings', 'world');

    expect(await Memorable.storage.get('greetings')).toBe('HELLO_world');
    expect(await Memorable.storage.get('greetings')).not.toBe('world');
  });

  it('should work with a custom reconciler', () => {
    const customReconciler = new DefaultReconciler();
    memorable({
      reconciler: customReconciler,
    });
    expect(Memorable.reconciler).toBe(customReconciler);
  });

  it('should return a brain emoji for fun', () => {
    expect(memorable()).toBe('🧠');
  });
});

describe('storage', () => {
  it('should set/get a key', async () => {
    const storage = new DefaultStorage();
    storage.set('yo', 'lo');
    expect(await storage.get('yo')).toEqual('lo');
  });

  it('should remove a key', async () => {
    const storage = new DefaultStorage();
    storage.set('yo', 'lo');
    storage.remove('yo');
    expect(await storage.get('yo')).toEqual(undefined);
  });
});

// describe('memo', () => {
//   it('should set/get a key', async () => {
//     const storage = new DefaultStorage();
//     storage.set('yo', 'lo');
//     expect(await storage.get('yo')).toEqual('lo');
//   });
// });
