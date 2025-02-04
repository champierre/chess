import '@testing-library/jest-dom'
import './index.css'

import { vi } from 'vitest'

class MockWorker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;

  constructor(stringUrl: string | URL) {}

  postMessage(message: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: 'readyok' }));
    }
  }

  terminate() {}
}

vi.stubGlobal('Worker', MockWorker);
