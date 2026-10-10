import { on } from 'svelte/events';
import { createSubscriber } from 'svelte/reactivity';

import {
	CAMERA_RESOLUTIONS,
	COLOR_PALETTES,
	STORE_CAMERA_RESOLUTION_ID,
	STORE_COLOR_PALETTE_ID,
	STORE_ROOM_HISTORY,
	STORE_WEBCAM_ENABLED,
	type CameraResolutionId,
	type ColorPaletteId
} from '#lib/constants.js';

// A value saved to localStorage as JSON. Falls back when storage is blocked or the value is invalid.
class PersistedState<T> {
	#key: string;
	#value = $state.raw<T>() as T;

	constructor(key: string, isValid: (value: unknown) => value is T, fallback: T) {
		this.#key = key;
		this.#value = fallback;

		try {
			const stored = localStorage.getItem(key);
			if (stored !== null) {
				const value: unknown = JSON.parse(stored);
				if (isValid(value)) {
					this.#value = value;
				}
			}
		} catch (error) {
			console.warn(`Could not read ${key} from localStorage`, error);
		}
	}

	get current(): T {
		return this.#value;
	}

	set current(value: T) {
		this.#value = value;

		try {
			localStorage.setItem(this.#key, JSON.stringify(value));
		} catch (error) {
			console.warn(`Could not save ${this.#key} to localStorage`, error);
		}
	}
}

function isBoolean(value: unknown): value is boolean {
	return typeof value === 'boolean';
}

function isCameraResolutionId(value: unknown): value is CameraResolutionId {
	return typeof value === 'string' && Object.hasOwn(CAMERA_RESOLUTIONS, value);
}

function isColorPaletteId(value: unknown): value is ColorPaletteId {
	return typeof value === 'string' && Object.hasOwn(COLOR_PALETTES, value);
}

interface RoomHistoryEntry {
	name: string;
	lastSeen: number;
}
type RoomHistoryT = Record<string, RoomHistoryEntry>;

function isRoomHistory(value: unknown): value is RoomHistoryT {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const webcamEnabled = new PersistedState(STORE_WEBCAM_ENABLED, isBoolean, false);

export const cameraResolutionId = new PersistedState<CameraResolutionId>(
	STORE_CAMERA_RESOLUTION_ID,
	isCameraResolutionId,
	'320 x 240'
);

// replace the whole object to update, so the change is saved
export const roomHistory = new PersistedState<RoomHistoryT>(STORE_ROOM_HISTORY, isRoomHistory, {});

class ColorPaletteState {
	#id = new PersistedState<ColorPaletteId>(STORE_COLOR_PALETTE_ID, isColorPaletteId, 'JD093A');

	get id(): ColorPaletteId {
		return this.#id.current;
	}

	set id(id: ColorPaletteId) {
		this.#id.current = id;
	}

	readonly colors = $derived(COLOR_PALETTES[this.id]);
}

export const colorPalette = new ColorPaletteState();

class PageVisibility {
	#subscribe = createSubscriber((update) => on(document, 'visibilitychange', update));

	get visible(): boolean {
		this.#subscribe();
		return !document.hidden;
	}
}

export const pageVisibility = new PageVisibility();

// 'unknown' until the query resolves, or forever where browsers can't query the camera
type CameraPermissionT = PermissionState | 'unknown';

class CameraPermission {
	#state: CameraPermissionT = $state('unknown');

	#subscribe = createSubscriber(() => {
		let stopped = false;
		let removeChangeListener: (() => void) | undefined;

		navigator.permissions?.query({ name: 'camera' as PermissionName }).then(
			(status) => {
				if (stopped) {
					return;
				}

				const update = () => (this.#state = status.state);
				update();
				removeChangeListener = on(status, 'change', update);
			},
			() => {}
		);

		return () => {
			stopped = true;
			removeChangeListener?.();
		};
	});

	get state(): CameraPermissionT {
		this.#subscribe();
		return this.#state;
	}
}

export const cameraPermission = new CameraPermission();

type WebcamStatusT = 'initial' | 'requesting' | 'active' | 'error';

function stopMediaStream(stream: MediaStream | null) {
	stream?.getTracks().forEach((track) => track.stop());
}

async function getMediaStream(deviceId: string | undefined): Promise<MediaStream | null> {
	try {
		return await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				deviceId: { ideal: deviceId },
				aspectRatio: { ideal: 4 / 3 },
				frameRate: { ideal: 10 },
				width: { ideal: 640 },
				height: { ideal: 480 }
			}
		});
	} catch (error) {
		console.error('Unable to activate webcam:', error);
		return null;
	}
}

async function getCameras(): Promise<MediaDeviceInfo[]> {
	try {
		const mediaDevices = await navigator.mediaDevices.enumerateDevices();
		return mediaDevices.filter((mediaDevice) => mediaDevice.kind === 'videoinput');
	} catch (error) {
		console.error('Could not get the devices', error);
		return [];
	}
}

// The camera runs only while something reads it and webcamEnabled is on, so it turns off when
// the last component using it goes away.
class Webcam {
	deviceId: string | undefined = $state();

	#status: WebcamStatusT = $state('initial');
	#stream: MediaStream | null = $state.raw(null);
	#cameras: MediaDeviceInfo[] = $state.raw([]);

	#subscribe = createSubscriber(() =>
		$effect.root(() => {
			$effect(() => this.#start(webcamEnabled.current, this.deviceId));
		})
	);

	get status(): WebcamStatusT {
		this.#subscribe();
		return this.#status;
	}

	get stream(): MediaStream | null {
		this.#subscribe();
		return this.#stream;
	}

	get cameras(): MediaDeviceInfo[] {
		this.#subscribe();
		return this.#cameras;
	}

	// returns a cleanup that stops the stream, run when inputs change or the last reader leaves
	#start(enabled: boolean, deviceId: string | undefined) {
		this.#stream = null;

		if (!enabled) {
			this.#status = 'initial';
			return;
		}

		this.#status = 'requesting';

		let stopped = false;
		let activeStream: MediaStream | null = null;
		let removeDeviceChangeListener: (() => void) | undefined;

		const updateCameras = async () => {
			this.#cameras = await getCameras();
		};

		getMediaStream(deviceId).then((userMediaStream) => {
			// stream arrived after the inputs changed or the last reader left
			if (stopped) {
				stopMediaStream(userMediaStream);
				return;
			}

			if (!userMediaStream) {
				this.#status = 'error';
				return;
			}

			activeStream = userMediaStream;
			this.#stream = userMediaStream;
			this.#status = 'active';

			updateCameras();
			removeDeviceChangeListener = on(navigator.mediaDevices, 'devicechange', updateCameras);
		});

		return () => {
			stopped = true;
			stopMediaStream(activeStream);
			removeDeviceChangeListener?.();
		};
	}
}

export const webcam = new Webcam();
