<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { Camera as CameraIcon, Trash2, X } from 'lucide-svelte';
	import { writable, type Writable } from 'svelte/store';
	import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
	import { photosStore, type Photo } from '$lib/photos';

	let content: HTMLIonContentElement;
	let touching = false;
	let initialTouchPosition = [0, 0];
	let lastTouchPosition = [0, 0];
	let zooming = false;
	let initialZoomDistance = 0;
	let lastZoomScale = 1;
	let touchDistance = spring(0, {
		stiffness: 0.2,
		damping: 1
	});
	let touchTransform = spring([0, 0], {
		stiffness: 0.1,
		damping: 0.5
	});
	let scaleTransform = spring(1, {
		stiffness: 0.5,
		damping: 1
	});
	let fullscreenOverlayOpacity = spring(0, {
		stiffness: 0.2,
		damping: 1
	});

	$: if (currentElement) {
		currentElement.style.transform = `translate(${$touchTransform[0]}px, ${$touchTransform[1]}px) scale(${$scaleTransform})`;
		rect = currentElement.getBoundingClientRect();
	}
	$: if (fullscreenOverlay && !zooming) {
		fullscreenOverlay.style.opacity = $fullscreenOverlayOpacity - $touchDistance / 500 + '';
	}

	onMount(async () => {
		function handleMove(x: number, y: number) {
			if (!open) {
				return;
			}
			if (!touching) {
				return;
			}
			if (!currentElement) {
				return;
			}

			let dx = x - initialTouchPosition[0];
			let dy = y - initialTouchPosition[1];
			touchTransform.set([dx, dy]);
			touchDistance.set(Math.sqrt(dx * dx + dy * dy));
		}

		window.addEventListener('touchstart', (event) => {
			if (!open) {
				return;
			}
			// more than one finger
			if (event.touches.length > 1) {
				zooming = true;
				let dx = event.touches[0].clientX - event.touches[1].clientX;
				let dy = event.touches[0].clientY - event.touches[1].clientY;
				initialTouchPosition[0] = (event.touches[0].clientX + event.touches[1].clientX) / 2;
				initialTouchPosition[1] = (event.touches[0].clientY + event.touches[1].clientY) / 2;
				initialZoomDistance = Math.sqrt(dx * dx + dy * dy);
			}
			// one finger
			if (event.touches.length === 1) {
				touching = true;
				initialTouchPosition[0] = event.touches[0].clientX;
				initialTouchPosition[1] = event.touches[0].clientY;
			}
		});

		window.addEventListener('touchmove', (event) => {
			if (!open || !touching) {
				return;
			}

			if (event.touches.length > 1 && zooming) {
				let xx = event.touches[0].clientX - event.touches[1].clientX;
				let yy = event.touches[0].clientY - event.touches[1].clientY;
				let x = (event.touches[0].clientX + event.touches[1].clientX) / 2;
				let y = (event.touches[0].clientY + event.touches[1].clientY) / 2;
				let dx = x - initialTouchPosition[0] + lastTouchPosition[0];
				let dy = y - initialTouchPosition[1] + lastTouchPosition[1];
				touchTransform.set([dx, dy]);
				let distance = Math.sqrt(xx * xx + yy * yy);
				let scale = lastZoomScale * (distance / initialZoomDistance);
				scaleTransform.set(scale)
				return;
			} else {
				let dx = event.touches[0].clientX - initialTouchPosition[0] + lastTouchPosition[0];
				let dy = event.touches[0].clientY - initialTouchPosition[1] + lastTouchPosition[1];
				touchTransform.set([dx, dy]);
				touchDistance.set(Math.sqrt(dx * dx + dy * dy));
			}
		});

		window.addEventListener('touchend', (event) => {
			if (!open) {
				return;
			}
			touching = false;
			if (zooming) {
				lastZoomScale = $scaleTransform;
				lastTouchPosition = $touchTransform;
				return;
			}
			touchTransform.set([0, 0]);
			console.log($scaleTransform);
			scaleTransform.set(1);
			touchDistance.set(0);
			if ($touchDistance > 50) {
				closePhoto();
			}
		});

		window.addEventListener('mousedown', (event) => {
			if (!open) {
				return;
			}
			touching = true;
			initialTouchPosition[0] = event.clientX;
			initialTouchPosition[1] = event.clientY;
		});

		window.addEventListener('mousemove', (event) => {
			handleMove(event.clientX, event.clientY);
		});

		window.addEventListener('mouseup', (event) => {
			if (!open) {
				return;
			}
			touching = false;
			touchTransform.set([0, 0]);
			if ($touchDistance > 50) {
				closePhoto();
			} else {
				fullscreenOverlayOpacity.set(1);
			}
			touchDistance.set(0);
		});

		topPadding =
			(fullscreenOverlay.firstElementChild?.clientHeight ?? 0) +
			parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-top'));
	});

	let open = false;
	let opened = false;
	let currentElement: HTMLDivElement | null;
	let currentPhoto: Photo | null;
	let rect: DOMRect;
	let fullscreenOverlay: HTMLDivElement;
	let ionSafeAreaBottom = parseInt(
		getComputedStyle(document.documentElement).getPropertyValue('--ion-safe-area-bottom')
	);
	let topPadding = 0;
	let windowHeight = window.innerHeight - topPadding + ionSafeAreaBottom;
	let windowWidth = window.innerWidth;
	let windowRatio = windowWidth / windowHeight;
	let imgRatio = 1;

	function openPhoto(photo: Photo, event: MouseEvent) {
		if (opened) {
			return;
		}
		if (open) {
			return;
		}
		open = true;
		currentElement = event.target as HTMLDivElement;
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
			if (imgRatio > windowRatio) {
				let height = windowWidth / imgRatio;
				currentElement.style.width = windowWidth + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = -rect.left + 'px';
				console.log(Math.max((windowHeight + topPadding - height) / 2, topPadding) - rect.top);
				currentElement.style.top =
					Math.max((windowHeight - height) / 2, topPadding) - rect.top + 'px';
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

	function closePhoto() {
		if (opened === false) {
			return;
		}
		open = false;
		zooming = false;
		fullscreenOverlayOpacity.set(0);
		touchTransform.set([0, 0]);
		scaleTransform.set(1);
		lastTouchPosition = [0, 0];
		lastZoomScale = 1;
		if (!currentElement) {
			return;
		}
		currentElement.style.width = '';
		currentElement.style.height = '';
		currentElement.style.left = '';
		currentElement.style.top = '';
		currentElement.removeEventListener('transitionend', transitionEndOpen);
		currentElement.addEventListener('transitionend', transitionEndClose, { once: true });
	}

	function transitionEndOpen() {
		opened = true;
		if (!currentElement) {
			return;
		}
		rect = currentElement.getBoundingClientRect();
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
		const image = await Camera.getPhoto({
			quality: 100,
			allowEditing: true,
			resultType: CameraResultType.DataUrl,
			source: CameraSource.Camera
		});
		console.log(image.exif);
		let imageUrl = image.dataUrl;
		if (!imageUrl) {
			return;
		}

		let photo: Photo = {
			id: crypto.randomUUID(),
			date: new Date(),
			url: imageUrl
		};
		photosStore.add(photo);
		// photos.update((currentPhotos) => {
		// 	let photo = {
		// 		id: crypto.randomUUID(),
		// 		date: new Date(),
		// 		url: imageUrl,
		// 		loaded: false
		// 	};
		// 	let img = new Image();
		// 	img.src = photo.url;
		// 	img.onload = async () => {
		// 		photos.update((currentPhotos) => {
		// 			let updatedPhoto = currentPhotos.find((p) => p.id === photo.id);
		// 			if (updatedPhoto) {
		// 				updatedPhoto.loaded = true;
		// 			}
		// 			return currentPhotos;
		// 		});
		// 	};
		// 	return [...currentPhotos, photo];
		// });
	}

	function deleteCurrentPhoto() {
		if (!currentPhoto) {
			return;
		}
		closePhoto();
		fullscreenOverlayOpacity.set(0);
		touchTransform.set([0, 0], { hard: true });
		setTimeout(() => {
			transitionEndClose();
		}, 300);
		photosStore.remove(currentPhoto.id);
		// photos.update((currentPhotos) => {
		// 	return currentPhotos.filter((p) => p.id !== currentPhoto.id);
		// });
	}
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
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
			></Image> -->
				{#if false}
					<ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
				{:else}
					<div
						class="photo-container"
						aria-label="Open Photo"
						style="background-image: url({photo.url})"
						role="button"
						on:click={(event) => openPhoto(photo, event)}
					></div>
				{/if}
			</div>
		{/each}
	</div>
	<button class="camera-button" on:click={addPhoto}>
		<CameraIcon />
	</button>
</ion-content>

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
			<button on:click={deleteCurrentPhoto}>
				<Trash2 strokeWidth="1.5" size="20" />
			</button>
			<button on:click={closePhoto}>
				<X strokeWidth="1.5" />
			</button>
		</div>
	</div>
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
