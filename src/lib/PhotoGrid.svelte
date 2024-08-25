<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { derived, writable, type Writable } from 'svelte/store';

	import { albumStore, type Album } from '$lib/album';

	import { activeTab } from '$lib/tabStore';

	import { Capacitor } from '@capacitor/core';
	import { Filesystem, Directory, Encoding, type FileInfo } from '@capacitor/filesystem';
	import { Share } from '@capacitor/share';
	import { PhotoEditor } from '@capawesome/capacitor-photo-editor';

	import '@ionic/core/css/ionic.bundle.css';
	import { CircleCheck, Trash2, ArrowLeft, Share2, SquarePen } from 'lucide-svelte';
	import { Circle } from 'lucide-svelte';

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from './components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Photo, PhotosStore } from './photos';
	import { open } from '$lib/uistore';
	import { flyAndScale, flyUp } from './utils';
	import { fly } from 'svelte/transition';

	type Direction = 'right' | 'left' | 'top' | 'down';

	export let photosStore: PhotosStore;

	interface Image extends Photo {
		loaded: boolean;
	}

	let photos = writable<Image[]>([]);

	let deleteSelectionDialog: boolean;
	let platform: String;
	let imageResetLoad: boolean = false;

	let content: HTMLIonContentElement;
	let swipeDirection: Direction;
	let touching = false;
	let zooming = false;
	let rect = { top: 0, left: 0, width: 0, height: 0 };
	let initialZoomDistance = 0;
	let lastZoomScale = 1;
	let zoomOrigin = [50, 50];
	let touchDistance = spring(0, {
		stiffness: 0.2,
		damping: 1
	});
	let initialTouchPosition = [0, 0];
	let lastTouchPosition = [0, 0];
	let touchTransform = [0, 0];
	let touchTransformSpring = spring(touchTransform, {
		stiffness: 0.1,
		damping: 0.5
	});
	let scaleTransform = 1;
	let scaleTransformSpring = spring(1, {
		stiffness: 0.2,
		damping: 1
	});
	let fullscreenOverlayOpacity = spring(0, {
		stiffness: 0.2,
		damping: 1
	});

	$: if (currentElement) {
		currentElement.style.transform = `translate(${$touchTransformSpring[0]}px, ${$touchTransformSpring[1]}px) scale(${$scaleTransformSpring})`;
	}
	$: if (currentElement) {
		currentRect = currentElement.getBoundingClientRect();
	}
	$: if (fullscreenOverlay && !zooming) {
		fullscreenOverlay.style.opacity = $fullscreenOverlayOpacity - $touchDistance / 500 + '';
	}

	function touchstart(event: TouchEvent) {
		if (!$open) {
			return;
		}

		console.log($photosStore);
		rect = currentRect;
		// more than one finger
		if (event.touches.length > 1) {
			zooming = true;
			let dx = event.touches[0].clientX - event.touches[1].clientX;
			let dy = event.touches[0].clientY - event.touches[1].clientY;
			let centerx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
			let centery = (event.touches[0].clientY + event.touches[1].clientY) / 2;
			initialTouchPosition[0] = centerx;
			initialTouchPosition[1] = centery;
			zoomOrigin = [(centerx - rect.left) / rect.width, (centery - rect.top) / rect.height];
			initialZoomDistance = Math.sqrt(dx * dx + dy * dy);
		}
		// one finger
		if (event.touches.length === 1) {
			touching = true;
			initialTouchPosition[0] = event.touches[0].clientX;
			initialTouchPosition[1] = event.touches[0].clientY;
		}
		console.log('touchstart');
	}

	function touchmove(event: TouchEvent) {
		if (!$open || !touching) {
			return;
		}
		if (!currentElement) {
			return;
		}
		if (zooming) {
			if (event.touches.length > 1) {
				let distancex = event.touches[0].clientX - event.touches[1].clientX;
				let distancey = event.touches[0].clientY - event.touches[1].clientY;
				let centerx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
				let centery = (event.touches[0].clientY + event.touches[1].clientY) / 2;

				let distance = Math.sqrt(distancex * distancex + distancey * distancey);
				let scale = distance / initialZoomDistance;

				let offsetX = (zoomOrigin[0] - 0.5) * rect.width * (1 - scale);
				let offsetY = (zoomOrigin[1] - 0.5) * rect.height * (1 - scale);
				let dx = centerx - initialTouchPosition[0] + lastTouchPosition[0] + offsetX;
				let dy = centery - initialTouchPosition[1] + lastTouchPosition[1] + offsetY;
				// console.log(offsetX, offsetY, zoomOrigin, scale, rect.width, rect.height);

				touchTransform = [dx, dy];
				scaleTransform = lastZoomScale * scale;
			} else {
				let dx = event.touches[0].clientX - initialTouchPosition[0] + lastTouchPosition[0];
				let dy = event.touches[0].clientY - initialTouchPosition[1] + lastTouchPosition[1];
				touchTransform = [dx, dy];
			}
			scaleTransformSpring.set(scaleTransform);
			touchTransformSpring.set(touchTransform);
		} else {
			let dx = event.touches[0].clientX - initialTouchPosition[0] + lastTouchPosition[0];
			let dy = event.touches[0].clientY - initialTouchPosition[1] + lastTouchPosition[1];
			touchDistance.set(Math.sqrt(dx * dx + dy * dy));
			touchTransform = [dx, dy];
			touchTransformSpring.set(touchTransform);
			if (Math.abs(touchTransform[0]) > Math.abs(touchTransform[1])) {
				if (touchTransform[0] < 0) {
					swipeDirection = 'left';
				} else {
					swipeDirection = 'right';
				}
			} else {
				if (touchTransform[0] < 0) {
					swipeDirection = 'top';
				} else {
					swipeDirection = 'down';
				}
			}
		}
	}

	function touchend(event: TouchEvent) {
		if (!$open) {
			return;
		}
		touching = false;
		if (zooming) {
			if (event.touches.length > 0) {
				return;
			}
			if ($scaleTransformSpring < 0.7) {
				closePhoto();
				return;
			}
			if ($scaleTransformSpring < 1) {
				scaleTransform = 1;
				zooming = false;
			}

			let windowHeight = window.innerHeight;
			let windowWidth = window.innerWidth;
			let topPadding =
				(fullscreenControlsHeight ?? 0) +
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top')
				);

			if (currentRect.height > windowHeight) {
				if (currentRect.top > topPadding) {
					touchTransform[1] = $touchTransformSpring[1] + topPadding - currentRect.top;
				}
				if (currentRect.bottom < windowHeight + topPadding) {
					touchTransform[1] = $touchTransformSpring[1] + window.innerHeight - currentRect.bottom;
				}
			} else {
				console.log('height', currentRect.height, windowHeight);
				touchTransform[1] = 0;
			}
			if (currentRect.width > windowWidth) {
				if (currentRect.left > 0) {
					touchTransform[0] = $touchTransformSpring[0] - currentRect.left;
				}
				if (currentRect.left + currentRect.width < windowWidth) {
					touchTransform[0] = $touchTransformSpring[0] + windowWidth - currentRect.right;
				}
			} else {
				console.log('width', currentRect.width, windowWidth);
				touchTransform[0] = 0;
			}
			lastZoomScale = scaleTransform;
			lastTouchPosition = [...touchTransform];

			console.log('touchend', touchTransform, scaleTransform);
			// touchTransformSpring.set(touchTransform, { hard: false });
			scaleTransformSpring.set(scaleTransform, { hard: false });
			touchTransformSpring.set(touchTransform, { hard: false });
			return;
		} else {
			if ($touchDistance > 50) {
				if (swipeDirection === 'top') {
					closePhoto();
				}
				if (swipeDirection === 'down') {
					closePhoto();
				}
				if (swipeDirection === 'right') {
					switchPhoto('right');
				}
				if (swipeDirection === 'left') {
					switchPhoto('left');
				}
			}
			touchTransform = [0, 0];
			scaleTransform = 1;

			touchTransformSpring.set(touchTransform);
			scaleTransformSpring.set(scaleTransform);

			touchDistance.set(0);
		}
	}

	const unsubscribe = photosStore.subscribe(() => {
		photos.set(
			$photosStore.map((photo) => {
				return { ...photo, loaded: $photosStore.find((p) => p.id === photo.id)?.loaded ?? false };
			})
		);
	});

	onMount(async () => {
		platform = Capacitor.getPlatform();

		window.addEventListener('touchend', touchend);
		window.addEventListener('touchmove', touchmove);
		window.addEventListener('touchstart', touchstart);
	});

	onDestroy(() => {
		window.removeEventListener('touchend', touchend);
		window.removeEventListener('touchmove', touchmove);
		window.removeEventListener('touchstart', touchstart);
		currentElement?.removeEventListener('transitionend', transitionEndOpen);
		currentElement?.removeEventListener('transitionend', transitionEndClose);
		unsubscribe();
		if ($open) {
			closePhoto();
		}
	});

	let opened = false;
	let currentElement: HTMLDivElement | null;
	let currentPhoto: Photo | null;
	let currentRect: DOMRect;
	let fullscreenOverlay: HTMLDivElement;
	let ionSafeAreaBottom = parseInt(
		getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-bottom')
	);
	let fullscreenControlsHeight: number;
	let imgRatio = 1;
	//$:console.log(currentPhoto)

	export let isSelectionMode = writable(false);
	export let selectedPhotos = writable<string[]>([]);

	function selectPhoto(photoId: string) {
		selectedPhotos.update((currentPhotos) => {
			if (currentPhotos.includes(photoId)) {
				// Entferne das Foto, wenn es schon ausgewählt ist
				return currentPhotos.filter((id) => id !== photoId);
			} else {
				// Füge das Foto hinzu, wenn es noch nicht ausgewählt ist
				return [...currentPhotos, photoId];
			}
		});
	}

	function openPhoto(photo: Photo, event?: MouseEvent | null, element?: Element | null) {
		console.log('open', photo);
		if (opened) {
			return;
		}
		if ($open) {
			return;
		}
		if (event) {
			currentElement = (event.target as HTMLDivElement).parentElement as HTMLDivElement;
		}
		if (element) {
			currentElement = element as HTMLDivElement;
		}
		if (!currentElement) {
			return;
		}
		currentPhoto = photo;
		if (currentElement.classList.contains('photo-container') === false) {
			console.log('tets');
			return;
		}
		console.log('tets');
		$open = true;
		rect = currentElement.getBoundingClientRect();
		console.log(currentElement);
		let img = new Image();

		img.src = photo.url;
		img.onload = () => {
			if (!currentElement) {
				return;
			}
			let topPadding =
				(fullscreenControlsHeight ?? 0) +
				parseInt(
					getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top')
				);
			let windowHeight = window.innerHeight - topPadding - ionSafeAreaBottom;
			let windowWidth = window.innerWidth;
			let windowRatio = windowWidth / windowHeight;
			imgRatio = img.width / img.height;
			content.scrollY = false;
			fullscreenOverlay.style.zIndex = '40';
			fullscreenOverlayOpacity.set(1);
			currentElement.style.zIndex = '50';
			// left to right
			if (imgRatio > windowRatio) {
				let height = windowWidth / imgRatio;
				currentElement.style.width = windowWidth + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = -rect.left + 'px';
				currentElement.style.top =
					Math.max((windowHeight - height + topPadding) / 2, topPadding) - rect.top + 'px';
				// top to bottom
			} else {
				let height = windowHeight;
				let width = height * imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = (windowWidth - width) / 2 - rect.left + 'px';
				currentElement.style.top = topPadding - rect.top + 'px';
			}
			currentElement.removeEventListener('transitionend', transitionEndClose);
			currentElement.addEventListener('transitionend', transitionEndOpen, { once: true });
		};
	}

	function closePhoto(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (opened === false) {
				resolve();
				return;
			}
			$open = false;
			zooming = false;
			fullscreenOverlayOpacity.set(0);
			touchTransform = [0, 0];
			touchTransformSpring.set(touchTransform);
			scaleTransform = 1;
			scaleTransformSpring.set(scaleTransform);
			lastTouchPosition = [0, 0];
			lastZoomScale = 1;
			if (!currentElement) {
				resolve();
				return;
			}
			currentElement.style.width = '';
			currentElement.style.height = '';
			currentElement.style.left = '';
			currentElement.style.top = '';
			currentElement.removeEventListener('transitionend', transitionEndOpen);
			currentElement.addEventListener(
				'transitionend',
				() => {
					transitionEndClose();
					resolve();
				},
				{ once: true }
			);
		});
	}

	async function shareCurrentPhoto() {
		console.log(JSON.stringify(currentElement));
		if (!currentElement) {
			return;
		} else {
			let selectedPhoto = $photosStore.find((photo) => photo.id === currentPhoto?.id);
			const selectedFileUrl = selectedPhoto?.localurl;
			console.log(selectedFileUrl);
			if (selectedFileUrl) {
				await Share.share({
					url: selectedFileUrl
				});
			}
		}
	}

	async function editCurrentPhoto() {
		if (!currentElement) {
			return;
		}

		const selectedPhoto = currentPhoto;
		const selectedFileUrl = selectedPhoto?.localurl;

		if (selectedFileUrl) {
			imageResetLoad = true;
			try {
				await PhotoEditor.editPhoto({ path: selectedFileUrl });
				//await closePhoto();
			} catch (error) {
				imageResetLoad = false;
				console.error('Error editing photo:', error);
			}
			console.log(selectedPhoto.id);

			

			// let photo: Photo = {
			// 	id: crypto.randomUUID(),
			// 	date: selectedPhoto.date,
			// 	url: Capacitor.convertFileSrc(selectedFileUrl),
			// 	localurl: selectedFileUrl
			// };
			// await photosStore.add(photo);

			// const element = content.querySelector(`img[src*="${photo.url}"]`)?.parentElement;
			const img = currentElement.querySelector('img');

			if (!img) {
				console.log('img element not found');
				return;
			}

			console.log('img element', img);

			img.src = img.src.split('?')[0] + `?t=${Date.now()}`;
			rect = currentElement.getBoundingClientRect();
			img.onload = () => {
				if (!currentElement) {
					return;
				}
				let topPadding =
					(fullscreenControlsHeight ?? 0) +
					parseInt(
						getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top')
					);
				let windowHeight = window.innerHeight - topPadding - ionSafeAreaBottom;
				let windowWidth = window.innerWidth;
				let windowRatio = windowWidth / windowHeight;
				imgRatio = img.width / img.height;
				content.scrollY = false;
				fullscreenOverlay.style.zIndex = '40';
				fullscreenOverlayOpacity.set(1);
				currentElement.style.zIndex = '50';
				// left to right
				if (imgRatio > windowRatio) {
					let height = windowWidth / imgRatio;
					currentElement.style.width = windowWidth + 'px';
					currentElement.style.height = height + 'px';
					currentElement.style.left = -rect.left + 'px';
					currentElement.style.top =
						Math.max((windowHeight - height + topPadding) / 2, topPadding) - rect.top + 'px';
					// top to bottom
				} else {
					let height = windowHeight;
					let width = height * imgRatio;
					currentElement.style.width = width + 'px';
					currentElement.style.height = height + 'px';
					currentElement.style.left = (windowWidth - width) / 2 - rect.left + 'px';
					currentElement.style.top = topPadding - rect.top + 'px';
				}
				currentElement.removeEventListener('transitionend', transitionEndClose);
				currentElement.addEventListener('transitionend', transitionEndOpen, { once: true });
				imageResetLoad = false;
			};
		}
	}

	function transitionEndOpen() {
		opened = true;
		if (!currentElement) {
			return;
		}
		console.log('transitionEndOpen', currentElement);
		currentRect = currentElement.getBoundingClientRect();
	}

	function transitionEndClose() {
		opened = false;
		fullscreenOverlay.style.zIndex = '';
		currentPhoto = null;
		if (!content) {
			return;
		}
		content.scrollY = true;
		if (!currentElement) {
			return;
		}
		currentElement.style.zIndex = '';
		currentElement.style.transform = '';
		currentElement = null;
	}

	async function switchPhoto(swipeDirection: Direction) {
		let photos = $photos;
		let currentIndex = photos.findIndex((photo) => photo.id === currentPhoto?.id);
		// Warten auf das vollständige Schließen des aktuellen Fotos
		await closePhoto();

		let nextIndex = 0;

		if (currentIndex === -1) {
			return;
		}

		if (swipeDirection === 'left') {
			nextIndex = (currentIndex + 1) % photos.length;
		}
		if (swipeDirection === 'right') {
			nextIndex = (currentIndex - 1 + photos.length) % photos.length;
		}
		const nextPhoto = photos[nextIndex];
		currentPhoto = nextPhoto;

		const element = content.querySelector(`img[src="${nextPhoto.url}"]`)?.parentElement;

		if (nextPhoto) {
			openPhoto(nextPhoto, undefined, element);
		}
	}

	async function deleteCurrentPhotoConfirmed() {
		if (!currentPhoto) {
			return;
		}
		closePhoto();
		fullscreenOverlayOpacity.set(0);
		touchTransformSpring.set([0, 0], { hard: true });
		setTimeout(() => {
			transitionEndClose();
		}, 300);

		let selectedPhoto = $photosStore.find((photo) => photo.id === currentPhoto?.id);
		const selectedFileUrl = selectedPhoto?.url;
		console.log(selectedFileUrl);

		if (!selectedFileUrl) {
			return;
		} else {
			const selectedFilename = selectedFileUrl.split('/').pop();

			if (selectedFilename) {
				await Filesystem.deleteFile({
					path: selectedFilename,
					directory: Directory.External
				});
			}

			albumStore.removeImageFromAllAlbums(selectedFileUrl);
			photosStore.remove(currentPhoto.id);
		}
	}
</script>

<ion-content fullscreen bind:this={content} transition:fly={flyUp}>
	<div class="z-0 grid grid-cols-3 gap-1">
		{#each $photos as photo}
			<div class="relative aspect-square w-full">
				{#if !photo?.loaded}
					<ion-skeleton-text animated class="absolute m-0 h-full w-full"></ion-skeleton-text>
				{/if}
				<div
					class="photo-container ease-[cubic-bezier(0.1, 0, 0.15, 1)] absolute left-0 top-0 h-full w-full bg-transparent transition-[top,left,width,height] duration-300"
					aria-label="Open Photo"
					role="button"
					on:click={$isSelectionMode
						? () => selectPhoto(photo.id)
						: (event) => openPhoto(photo, event)}
				>
					<img
						src={photo.url}
						class="h-full w-full object-cover"
						on:load|once={(event) => {
							photo.loaded = true;
						}}
						on:error={(event) => {
							console.error('Image failed to load', event);
						}}
						alt=""
					/>
				</div>
				{#if $isSelectionMode}
					{#if $selectedPhotos.includes(photo.id)}
						<CircleCheck class="relative left-0.5 top-0.5 z-[60] fill-white stroke-black" />
					{:else}
						<Circle class="relative  left-0.5 top-0.5  z-[60] fill-white stroke-black" />
					{/if}
				{/if}
			</div>
		{/each}
	</div>
	{#if $photos.length === 0}
		<div class="flex h-full w-full items-center justify-center">
			<p class="text-center">No Photos</p>
		</div>
	{/if}
</ion-content>
<div
	class="fixed left-0 top-0 z-[-10] h-lvh w-full bg-black p-[var(--ion-safe-area-top)_0_0_0]"
	bind:this={fullscreenOverlay}
>
	<div
		bind:clientHeight={fullscreenControlsHeight}
		class="relative z-[70] flex w-full flex-row items-center justify-between p-4 text-white"
	>
		<button
			on:click={closePhoto}
			class="z-70 relative flex h-8 w-8 items-center justify-center rounded-full border-none text-white"
		>
			<ArrowLeft />
		</button>
		<h4 class="z-[70] m-0">
			{currentPhoto?.date.toLocaleDateString(navigator.language, {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}
		</h4>

		<ion-loading is-open={imageResetLoad} message="Loading..." spinner="circles"></ion-loading>
		<div class="relative flex flex-row justify-between gap-4">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Item on:click={shareCurrentPhoto}>
							<Share2 class="mr-2 h-4 w-4" />
							<span>Share</span>
						</DropdownMenu.Item>
						{#if platform === 'android' && $activeTab != 'albumview'}
							<DropdownMenu.Item on:click={editCurrentPhoto}>
								<SquarePen class="mr-2 h-4 w-4" />
								<span>Edit</span>
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Item on:click={() => (deleteSelectionDialog = true)}>
							<Trash2 class="mr-2 h-4 w-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
</div>

<Dialog.Root bind:open={deleteSelectionDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Photo?</Dialog.Title>
		</Dialog.Header>

		<!-- Buttons Section -->
		<div class="dialog-footer grid w-full grid-cols-2">
			<Dialog.Close>
				<Button variant="destructive" class="w-full" on:click={deleteCurrentPhotoConfirmed}
					>Delete</Button
				>
			</Dialog.Close>
			<Dialog.Close><Button variant="outline">Cancel</Button></Dialog.Close>
		</div>
	</Dialog.Content>
</Dialog.Root>
