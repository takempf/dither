import { derived, readable, writable, type Readable, type Writable } from 'svelte/store';
import store from 'store2';

import type { CameraResolutionId, ColorPaletteId } from './constants.js';
import {
	COLOR_PALETTES,
	STORE_WEBCAM_ENABLED,
	STORE_COLOR_PALETTE_ID,
	STORE_ROOM_HISTORY,
	STORE_CAMERA_RESOLUTION_ID,
	CAMERA_RESOLUTIONS
} from '$/constants.js';

// Ensure `document` is available in the browser
export const pageVisible: Readable<boolean> = readable(
	typeof document !== 'undefined' && !document.hidden,
	(set) => {
		if (typeof document !== 'undefined') {
			function handleVisibilityChange() {
				set(!document.hidden);
			}

			document.addEventListener('visibilitychange', handleVisibilityChange, false);

			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange, false);
			};
		}
	}
);

// Type the webcamEnabled store
export const webcamEnabled: Writable<boolean> = writable(store.get(STORE_WEBCAM_ENABLED) || false);

webcamEnabled.subscribe((value) => store.set(STORE_WEBCAM_ENABLED, value));

// Type the mediaDeviceId store, allowing for null initially
export const mediaDeviceId: Writable<string | undefined> = writable(undefined);

// Correctly type previousMediaStream
let previousMediaStream: MediaStream | null = null;

async function getMediaStream(deviceId: string | undefined): Promise<MediaStream | null> {
	if (previousMediaStream) {
		previousMediaStream.getVideoTracks().forEach((track) => track.stop());
	}

	try {
		const userMediaStream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				deviceId: { ideal: deviceId },
				aspectRatio: { ideal: 4 / 3 },
				frameRate: { ideal: 10 },
				width: { ideal: 640 },
				height: { ideal: 480 }
			}
		});
		previousMediaStream = userMediaStream;

		return userMediaStream;
	} catch (error) {
		console.error('Unable to activate webcam:', error);
		return null; // Indicate failure by returning null
	}
}

// Define the type for the mediaStream store's value
interface DerivedMediaStream {
	status: 'initial' | 'requesting' | 'active' | 'error';
	stream: MediaStream | null;
}

export const mediaStream: Readable<DerivedMediaStream> = derived<
	[typeof mediaDeviceId, typeof webcamEnabled],
	DerivedMediaStream
>(
	[mediaDeviceId, webcamEnabled],
	([$mediaDeviceId, $webcamEnabled], set) => {
		(async () => {
			if (!$webcamEnabled) {
				set({
					status: 'initial',
					stream: null
				});
				return;
			}

			try {
				set({
					status: 'requesting',
					stream: null
				});

				const userMediaStream = await getMediaStream($mediaDeviceId);

				if (!userMediaStream) {
					throw new Error('No media stream returned from getMediaStream');
				}

				set({
					status: 'active',
					stream: userMediaStream
				});
			} catch (error) {
				console.error('Unable to activate webcam:', error);
				set({
					status: 'error',
					stream: null
				});
			}
		})();
	},
	{
		status: 'initial',
		stream: null
	}
);

async function getCameras() {
	try {
		const mediaDevices = await navigator.mediaDevices.enumerateDevices();
		return mediaDevices.filter((mediaDevice) => mediaDevice.kind === 'videoinput');
	} catch (error) {
		console.error('Could not get the devices', error);
		return []; // Return an empty array on error
	}
}

// Type the 'cameras' store
export const cameras: Readable<MediaDeviceInfo[]> = derived<typeof mediaStream, MediaDeviceInfo[]>(
	mediaStream,
	($mediaStream, set) => {
		if (!$mediaStream?.stream) {
			return;
		}

		async function handleDeviceChange() {
			const cameras = await getCameras();
			set(cameras);
		}

		handleDeviceChange();

		navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

		return () => {
			navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
		};
	},
	[]
);

// Type the cameraResolutionId store
const storedCameraResolutionId = store.get(STORE_CAMERA_RESOLUTION_ID);
const initialCameraResolutionId =
	storedCameraResolutionId && Object.hasOwn(CAMERA_RESOLUTIONS, storedCameraResolutionId)
		? storedCameraResolutionId
		: '320 x 240';
export const cameraResolutionId: Writable<CameraResolutionId> = writable(initialCameraResolutionId);

cameraResolutionId.subscribe((newCameraResolutionId) =>
	store.set(STORE_CAMERA_RESOLUTION_ID, newCameraResolutionId)
);

// Type the colorPaletteId store
export const colorPaletteId: Writable<ColorPaletteId> = writable(
	store.get(STORE_COLOR_PALETTE_ID) || 'JD093A'
);

colorPaletteId.subscribe((newColorPaletteId) =>
	store.set(STORE_COLOR_PALETTE_ID, newColorPaletteId)
);

// Define the type for the colorPalette store's value
type ColorPalette = readonly [string, string];

// Type the colorPalette store
export const colorPalette: Readable<ColorPalette> = derived(
	[colorPaletteId],
	([$colorPaletteId], set) => {
		const palette = COLOR_PALETTES[$colorPaletteId] || COLOR_PALETTES['Black & White'];
		set(palette);
	}
);

interface RoomHistoryEntry {
	name: string;
	lastSeen: number;
}
type RoomHistoryT = Record<string, RoomHistoryEntry>;

const storedRoomHistory = store.get(STORE_ROOM_HISTORY);
const initialRoomHistory: RoomHistoryT =
	storedRoomHistory && !Array.isArray(storedRoomHistory) ? storedRoomHistory : {};
export const roomHistory: Writable<RoomHistoryT> = writable(initialRoomHistory);

roomHistory.subscribe((updatedRoomHistory) => store.set(STORE_ROOM_HISTORY, updatedRoomHistory));
