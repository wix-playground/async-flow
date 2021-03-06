describe('AsyncFlow: OnErrorPolicy', () => {
  const AsyncFlow = require('../src/AsyncFlow');
  const createAsyncFlow = AsyncFlow.createAsyncFlow;
  const AFTask = AsyncFlow.AFTask;
  const OnErrorAction = AsyncFlow.OnErrorAction;
  const RunningState = AsyncFlow.RunningState;

  class SymbolTask extends AFTask {
    constructor({symbol, interval, onSuccess, onError, onErrorPolicy, run}) {
      const func = (string) => {
        let resolve;
        let reject;

        const promise = new Promise((res, rej) => {
          resolve = res;
          reject = rej;
        });
        setTimeout(function () {
          try {
            if (run) {
              run();
            }
            resolve(string + symbol);
          } catch (error) {
            reject(error);
          }
        }, interval);

        return promise;
      };

      super({func, onSuccess, onError, onErrorPolicy});

      this.symbol = symbol;
      this.interval = interval;
    }
  }

  it('Should try attempts times (not succeed)', async (done) => {
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {action: OnErrorAction.RETRY_FIRST, attempts: 2}
    });

    flow.addFlowIsEmptyListener(({result}) => {
      expect(result).toBe('ac');
      done();
    });

    flow.addTask(new SymbolTask({symbol: 'a', interval: 30}));
    flow.start();
    flow.addTask(new SymbolTask({
      symbol: 'b', interval: 10, run: () => {
        throw 'Test Exception';
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
  });

  it('Should try attempts times (RETRY_FIRST, succeed)', async (done) => {
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {action: OnErrorAction.RETRY_FIRST, attempts: 3}
    });

    flow.addFlowIsEmptyListener(({result}) => {
      expect(result).toBe('abc');
      done();
    });

    flow.addTask(new SymbolTask({symbol: 'a', interval: 30}));
    flow.start();

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'b', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
  });

  it('Should try attempts times (RETRY_LAST, succeed)', async (done) => {
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {action: OnErrorAction.RETRY_LAST, attempts: 3}
    });

    flow.addFlowIsEmptyListener(({result}) => {
      expect(result).toBe('acb');
      done();
    });

    flow.addTask(new SymbolTask({symbol: 'a', interval: 30}));
    flow.start();

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'b', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
  });

  it('Should try attempts times with delay (RETRY_FIRST, succeed)', async (done) => {
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {action: OnErrorAction.RETRY_FIRST, attempts: 3, delay: 10}
    });

    flow.addFlowIsEmptyListener(({result}) => {
      expect(result).toBe('bac');
      done();
    });

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'a', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'b', interval: 30}));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
    flow.start();
  });

  it('Should try attempts times with delay (RETRY_LAST, succeed)', async (done) => {
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {action: OnErrorAction.RETRY_LAST, attempts: 3, delay: 10}
    });

    flow.addFlowIsEmptyListener(({result}) => {
      expect(result).toBe('bca');
      done();
    });

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'a', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'b', interval: 30}));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
    flow.start();
  });

  it('Should try attempts times with delay function (RETRY_FIRST, succeed)', async (done) => {
    let delay = 30;
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {
        action: OnErrorAction.RETRY_FIRST, attempts: 3, delay: () => {
          delay *= 2;
          return delay;
        }
      }
    });

    flow.addFlowIsEmptyListener(({result, hasScheduledTasks}) => {
      if (!hasScheduledTasks) {
        expect(result).toBe('bca');
        done();
      }
    });

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'a', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'b', interval: 30}));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
    flow.start();
  });

  it('Should try attempts times with delay  (RETRY_AFTER_DELAY, succeed)', async (done) => {
    let delay = 30;
    const flow = createAsyncFlow({
      name: 'flow',
      initValue: '',
      onErrorPolicy: {
        action: OnErrorAction.RETRY_AFTER_PAUSE, attempts: 3, delay: 50
      }
    });

    flow.addFlowIsEmptyListener(({result, hasScheduledTasks}) => {
      if (!hasScheduledTasks) {
        expect(result).toBe('abc');
        done();
      }
    });

    let step = 0;
    flow.addTask(new SymbolTask({
      symbol: 'a', interval: 10, run: () => {
        if (step === 0) {
          step++;
          throw 'Test Exception';
        }
      }
    }));
    flow.addTask(new SymbolTask({symbol: 'b', interval: 30}));
    flow.addTask(new SymbolTask({symbol: 'c', interval: 20}));
    flow.start();

    setTimeout(() => {expect(flow.getRunningState()).toBe(RunningState.PAUSED)}, 30);
  });

});
