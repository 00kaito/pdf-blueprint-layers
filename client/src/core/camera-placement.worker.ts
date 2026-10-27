import {placeCameras, type PlacementInput, type PlacementResult} from './camera-placement';

/** Messages back to the page: progress (0–1) while computing, then the result. */
export type PlacementMessage = { type: 'progress'; value: number } | { type: 'done'; result: PlacementResult };

const post = (message: PlacementMessage) => (self as unknown as Worker).postMessage(message);

self.onmessage = (e: MessageEvent<PlacementInput>) => {
  post({ type: 'done', result: placeCameras(e.data, value => post({ type: 'progress', value })) });
};
