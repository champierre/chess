import '@testing-library/jest-dom'
import './index.css'

import { vi } from 'vitest'

class MockWorker implements Worker {
  onmessage: ((this: Worker, ev: MessageEvent<any>) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent<any>) => any) | null = null;
  
  constructor(_stringUrl: string | URL) {}

  postMessage(_message: any, _transfer?: Transferable[]): void {
    if (this.onmessage) {
      const event = new MessageEvent<string>('message', { data: 'readyok' });
      this.onmessage.call(this, event);
    }
  }

  terminate(): void {}

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(_event: Event): boolean { return true; }
}

vi.stubGlobal('Worker', MockWorker);
