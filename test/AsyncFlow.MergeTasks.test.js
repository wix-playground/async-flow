describe('AsyncFlow: merge tasks with basic merger', () => {
  const AsyncFlow = require('../src/AsyncFlow');
  const createAsyncFlow = AsyncFlow.createAsyncFlow;
  const MergingPolicy = AsyncFlow.MergingPolicy;
  const AFTask = AsyncFlow.AFTask;
  const AFTaskMerger = AsyncFlow.AFTaskMerger;

  class SymbolTask extends AFTask {
    constructor({symbol, array, interval, onSuccess, onError, onErrorPolicy}) {
      const func = () => {
        let resolve;
        let reject;

        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        setTimeout(function () {
          try {
            array.push(symbol);
            resolve(symbol);
          } catch (error) {
            reject(error);
          }
        }, interval);

        return promise;
      };

      super({func, onSuccess, onError, onErrorPolicy, merger: AFTaskMerger.BASIC});

      this.symbol = symbol;
      this.interval = interval;
    }

    isTaskEqual(task) {
      return this.symbol === task.symbol && this.interval === task.interval;
    }
  }

  function arrayToString(array) {
    let string = '';
    for (const symbol of array) {
      string += symbol;
    }
    return string;
  }

  it('Should merge waiting task (HEAD policy)', async (done) => {
    const flow = createAsyncFlow({name: 'flow', mergingPolicy: MergingPolicy.HEAD});

    flow.addFlowIsEmptyListener(() => {
      expect(arrayToString(array)).toBe('abc');
      done();
    });

    let array = [];

    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 100}));
    flow.start();
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
    flow.addTask(new SymbolTask({symbol: 'c', array, interval: 50}));
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
  });

  it('Should not merge running task', async (done) => {
    const flow = createAsyncFlow({name: 'flow', mergingPolicy: MergingPolicy.HEAD});

    flow.addFlowIsEmptyListener(() => {
      expect(arrayToString(array)).toBe('aba');
      done();
    });

    let array = [];

    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 100}));
    flow.start();
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 50}));
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
  });

  it('Should merge onSuccess listeners', async (done) => {
    const flow = createAsyncFlow({name: 'flow', mergingPolicy: MergingPolicy.HEAD});

    flow.addFlowIsEmptyListener(() => {
      expect(arrayToString(array)).toBe('ab!?c');
      done();
    });

    let array = [];

    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 100}));
    flow.start();
    flow.addTask(new SymbolTask({
      symbol: 'b', array, interval: 10, onSuccess: () => {
        array.push('!');
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'c', array, interval: 50}));
    flow.addTask(new SymbolTask({
      symbol: 'b', array, interval: 10, onSuccess: () => {
        array.push('?');
      }
    }));
  });

  it('Should merge tail task (TAIL policy)', async (done) => {
    const flow = createAsyncFlow({name: 'flow', mergingPolicy: MergingPolicy.TAIL});

    flow.addFlowIsEmptyListener(() => {
      expect(arrayToString(array)).toBe('abc');
      done();
    });

    let array = [];

    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 100}));
    flow.start();
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
    flow.addTask(new SymbolTask({symbol: 'c', array, interval: 50}));
    flow.addTask(new SymbolTask({symbol: 'c', array, interval: 50}));
  });

  it('Should not merge non tail task (TAIL policy)', async (done) => {
    const flow = createAsyncFlow({name: 'flow', mergingPolicy: MergingPolicy.TAIL});

    flow.addFlowIsEmptyListener(() => {
      expect(arrayToString(array)).toBe('abcb');
      done();
    });

    let array = [];

    flow.addTask(new SymbolTask({symbol: 'a', array, interval: 100}));
    flow.start();
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
    flow.addTask(new SymbolTask({symbol: 'c', array, interval: 50}));
    flow.addTask(new SymbolTask({symbol: 'b', array, interval: 10}));
  });

});
