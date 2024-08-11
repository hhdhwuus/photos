<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { writable, type Writable } from 'svelte/store';

	import { photosStore, type Photo } from '$lib/photos';

	import { Capacitor } from '@capacitor/core';
	import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import { Share } from '@capacitor/share';

	import '@ionic/core/css/ionic.bundle.css';

	import { Carousel } from 'flowbite-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	import { Camera as CameraIcon, Share2, Trash2, X } from 'lucide-svelte';
	import { CircleCheck } from 'lucide-svelte';
	import { Circle } from 'lucide-svelte';

	type Direction = 'right' | 'left' | 'top' | 'down';

	let testpath;

	let content: HTMLIonContentElement;
	let selectedPhotos = writable<string[]>([]);
	let sharedPhotos: string[] = [];
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

	$: if (selectedPhotos) {
		console.log(selectedPhotos);
	}

	onMount(async () => {
		const platform = Capacitor.getPlatform();
		console.log(platform);

		async function initPhotostore() {
			const directoryContents = await Filesystem.readdir({
				directory: Directory.External,
				path: ''
			});

			console.log('Directory Contents:', JSON.stringify(directoryContents));

			directoryContents.files.forEach((file) => {
				if (file.uri.includes('.jpeg')) {
					let photo: Photo = {
						id: crypto.randomUUID(),
						date: new Date(),
						url: Capacitor.convertFileSrc(file.uri),
						localurl: file.uri
					};
					photosStore.add(photo);
				}
			});
		}

		initPhotostore();

		window.addEventListener('touchstart', (event) => {
			if (!open) {
				return;
			}

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
		});

		window.addEventListener('touchmove', (event) => {
			if (!open || !touching) {
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
		});

		window.addEventListener('touchend', (event) => {
			if (!open) {
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
				// if ($scaleTransformSpring > 3) {
				// 	scaleTransform = 3;
				// }

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
		});

		topPadding =
			(fullscreenOverlay.firstElementChild?.clientHeight ?? 0) +
			parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top'));
		windowHeight = window.innerHeight - topPadding - ionSafeAreaBottom;
		windowRatio = windowWidth / windowHeight;
	});

	let open = false;
	let opened = false;
	let currentElement: HTMLDivElement | null;
	let currentPhoto: Photo | null;
	let currentRect: DOMRect;
	let fullscreenOverlay: HTMLDivElement;
	let ionSafeAreaBottom = parseInt(
		getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-bottom')
	);
	let topPadding = ionSafeAreaBottom;
	let windowHeight = window.innerHeight - topPadding - ionSafeAreaBottom;
	let windowWidth = window.innerWidth;
	let windowRatio = windowWidth / windowHeight;
	let imgRatio = 1;
	//$:console.log(currentPhoto)

	let isSelectionMode = writable(false);

	function toggleSelectionMode() {
		isSelectionMode.update((mode) => !mode);
		selectedPhotos.set([]);
	}

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

	async function handleDeleteSelectedPhoto() {
		$selectedPhotos.forEach(async (element) => {
			let selectedPhoto = $photosStore.find((photo) => photo.id === element);
			const selectedFileUrl = selectedPhoto?.url;

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

				photosStore.remove(element);
			}
		});

		selectedPhotos.set([]);
		toggleSelectionMode();
	}

	async function shareSelectedPhoto() {
		// Alle asynchronen Operationen sammeln
		const photoPromises = $selectedPhotos.map(async (element) => {
			let selectedPhoto = $photosStore.find((photo) => photo.id === element);
			console.log("Photo:",JSON.stringify(selectedPhoto))
			const selectedFileUrl = selectedPhoto?.localurl;
			
			console.log("FileUrl:", selectedFileUrl);
			if (selectedFileUrl) {
				sharedPhotos.push(selectedFileUrl);
			}
		});

		// Warten bis alle asynchronen Operationen abgeschlossen sind
		await Promise.all(photoPromises);

		console.log("List", sharedPhotos);

		await Share.share({
			files: sharedPhotos,
		});

		// Listen und Status zurücksetzen
		sharedPhotos = [];
		selectedPhotos.set([]);
		toggleSelectionMode();
	}

	function openPhoto(photo: Photo, event: MouseEvent, hallo = 'ja') {
		if (opened) {
			return;
		}
		if (open) {
			return;
		}
		console.log(event.target);
		open = true;
		if (hallo === 'ja') {
			currentElement = event.target as HTMLDivElement;
		} else {
			currentElement = hallo;
		}

		console.log(currentElement);
		currentPhoto = photo;
		if (currentElement.classList.contains('photo-container') === false) {
			return;
		}
		rect = currentElement.getBoundingClientRect();
		let img = new Image();
		img.src = photo.url;
		img.onload = () => {
			if (!currentElement) {
				return;
			}
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
				console.log(currentElement);
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

	async function switchPhoto(swipeDirection: Direction) {
		let photos = $photosStore;
		let currentIndex = photos.findIndex((photo) => photo.id === currentPhoto.id);
		// Warten auf das vollständige Schließen des aktuellen Fotos
		await closePhoto();

		let nextIndex;

		if (currentIndex === -1) {
			return;
		}

		if (swipeDirection === 'right') {
			nextIndex = (currentIndex + 1) % photos.length;
		}
		if (swipeDirection === 'left') {
			nextIndex = (currentIndex - 1 + photos.length) % photos.length;
		}

		const nextPhoto = photos[nextIndex];
		currentPhoto = nextPhoto;

		const element = document.querySelector(`.photo-container[style*="${nextPhoto.url}"]`);

		console.log(element);

		if (nextPhoto) {
			openPhoto(nextPhoto, event as MouseEvent, element);
		}
	}

	function closePhoto(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (opened === false) {
				resolve();
				return;
			}
			open = false;
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

	function transitionEndOpen() {
		opened = true;
		if (!currentElement) {
			return;
		}
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

	async function addPhoto() {
		const tester99 = await Filesystem.checkPermissions();
		console.log(tester99.publicStorage); // warum???

		const image = await Camera.getPhoto({
			quality: 100,
			allowEditing: false,
			resultType: CameraResultType.Base64,
			source: CameraSource.Camera
		});

		const fileName = Date.now() + '.jpeg';
		const savedFile = await Filesystem.writeFile({
			directory: Directory.External,
			path: fileName,
			data: image.base64String
		});

		let photo: Photo = {
			id: crypto.randomUUID(),
			date: new Date(),
			url: Capacitor.convertFileSrc(savedFile.uri),
			localurl: savedFile.uri
		};
		photosStore.add(photo);
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


		let selectedPhoto = $photosStore.find((photo) => photo.id === currentPhoto.id);
		const selectedFileUrl = selectedPhoto?.url;

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

			photosStore.remove(currentPhoto.id);
		}
	}



</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
		<ion-buttons class="pr-5" slot="end" on:click={toggleSelectionMode}>
			{$isSelectionMode ? 'Cancel' : 'Select'}
		</ion-buttons>
	</ion-toolbar>
</ion-header>

<ion-content fullscreen bind:this={content}>
	<div class="photo-grid">
		{#each $photosStore as photo}
			<div class="element">
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<!-- <Image
			class=""
			photo={photo}
			on:click={(event) => openPhoto(photo, event)}
			></Image> 
		
		//{((open == opened) && (open || opened) && swipeDirection !== 'down') ? 'photo-container opacity-0' : 'photo-container'}
		-->
				{#if false}
					<ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
				{:else}
					<div
						class="photo-container"
						aria-label="Open Photo"
						style="background-image: url({photo.url})"
						role="button"
						on:click={$isSelectionMode ? selectPhoto(photo.id) : (event) => openPhoto(photo, event)}
					></div>
					{#if $isSelectionMode}
						{#if $selectedPhotos.includes(photo.id)}
							<CircleCheck class="relative z-[60]" />
						{:else}
							<Circle class="relative z-[60]" />
						{/if}
					{/if}
				{/if}
			</div>
		{/each}
	</div>
	{#if !$isSelectionMode}
		<button class="camera-button" on:click={addPhoto}>
			<CameraIcon />
		</button>
	{/if}
</ion-content>
{#if $isSelectionMode || opened}
	<ion-footer translucent class="z-[10000]">
		<ion-toolbar>
			<div class="flex justify-end space-x-5 pr-10">
				<div>
					<button  on:click={shareSelectedPhoto}>
						<Share2 class="text-black-700"/>
					</button>
				</div>
				<div>
					<button>
						<Trash2 class="text-red-500"/>
					</button>
				</div>
			</div>
		</ion-toolbar>
	</ion-footer>
{/if}

<div class="fullscreen-overlay" bind:this={fullscreenOverlay}>
	<div class="container">
		<h4>
			{currentPhoto?.date.toLocaleDateString(navigator.language, {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})}
		</h4>
		<div class="buttons">
			<Dialog.Root>
				<Dialog.Trigger>
					<button>
						<Trash2 strokeWidth="1.5" size="20" />
					</button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
					</Dialog.Header>

					<!-- Buttons Section -->
					<div class="dialog-footer">
						<Dialog.Close>
							<Button variant="destructive" on:click={deleteCurrentPhotoConfirmed}>Delete</Button>
						</Dialog.Close>
						<Dialog.Close><Button variant="outline">Cancel</Button></Dialog.Close>
					</div>
				</Dialog.Content>
			</Dialog.Root>
			<button on:click={closePhoto}>
				<X strokeWidth="1.5" />
			</button>
		</div>
	</div>
	<!--<Carousel
		{images}
		imgClass="h-full w-fit"
		let:Indicators
		let:Controls
		class="min-h-[320px] items-center"
	></Carousel> -->
</div>

<style>
	* {
		user-select: none;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(100px, 1fr));
		grid-gap: 4px;
		z-index: 0;
	}

	.photo-grid .element {
		position: relative;
		width: 100%;
		aspect-ratio: 1 / 1;
	}

	.photo-grid .element .photo-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		transition-property: top, left, width, height;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.1, 0, 0.15, 1);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.photo-grid .element .skeleton {
		margin: 0;
		width: 100%;
		height: 100%;
	}

	.fullscreen-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 1);
		z-index: -10;
		padding: var(--ion-safe-area-top) 0 var(--ion-safe-area-bottom) 0;
	}

	.fullscreen-overlay .buttons {
		position: relative;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		gap: 16px;
	}
	.fullscreen-overlay .buttons button {
		background-color: rgba(255, 255, 255, 0.25);
		position: relative;
		color: white;
		border: none;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		padding: 3px;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 70;
	}

	.fullscreen-overlay .container {
		position: relative;
		z-index: 70;
		color: white;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
	}

	.fullscreen-overlay h4 {
		margin: 0;
		z-index: 70;
	}

	.camera-button {
		position: fixed;
		bottom: calc(16px + var(--ion-safe-area-bottom));
		right: 16px;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		z-index: 10;
	}
</style>
