// Dithers webcam frames off the main thread and draws them to the transferred display canvas.
import { createWebcamDitherer, type WebcamDitherMessageT } from '#lib/utils/webcam-ditherer.js';

const handleMessage = createWebcamDitherer(() => self.postMessage('done'));

self.onmessage = ({ data }: MessageEvent<WebcamDitherMessageT>) => handleMessage(data);
