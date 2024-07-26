<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { Camera as CameraIcon } from 'lucide-svelte';
	import { writable, type Writable } from 'svelte/store';
	import { Camera, CameraResultType } from '@capacitor/camera';

	type Photo = {
		id: number;
		url: string;
		loaded: boolean;
	};

	let photos = writable<Photo[]>([]); // Array of photo objects
	let content: HTMLIonContentElement;
	let touching = false;
	let touch = [0, 0];
	let touchDistance = spring(0, {
		stiffness: 0.5,
		damping: 0.9
	});
	let touchTransform = spring([0, 0], {
		stiffness: 0.1,
		damping: 0.5
	});
	let fullscreenOverlayOpacity = spring(0, {
		stiffness: 0.5,
		damping: 0.9
	});

	$: if (currentElement) {
		currentElement.style.transform = `translate(${$touchTransform[0]}px, ${$touchTransform[1]}px)`;
	}
	$: if (fullscreenOverlay) {
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
			let dx = x - touch[0];
			let dy = y - touch[1];
			touchTransform.set([dx, dy]);
			touchDistance.set(Math.sqrt(dx * dx + dy * dy));
		}

		window.addEventListener('touchstart', (event) => {
			if (!open) {
				return;
			}
			touching = true;
			touch[0] = event.touches[0].clientX;
			touch[1] = event.touches[0].clientY;
		});

		window.addEventListener('touchmove', (event) => {
			handleMove(event.touches[0].clientX, event.touches[0].clientY);
		});

		window.addEventListener('touchend', (event) => {
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

		window.addEventListener('mousedown', (event) => {
			if (!open) {
				return;
			}
			touching = true;
			touch[0] = event.clientX;
			touch[1] = event.clientY;
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
	});

	let open = false;
	let opened = false;
	let currentElement: HTMLDivElement | null;
	let rect: DOMRect;
	let fullscreenOverlay: HTMLDivElement;

	function openPhoto(photo: Photo, event: MouseEvent) {
		if (opened) {
			return;
		}
		if (open) {
			return;
		}
		console.log('opening');
		open = true;
		currentElement = event.target as HTMLDivElement;
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
			let imgRatio = img.width / img.height;
			let windowRatio = window.innerWidth / window.innerHeight;
			content.scrollY = false;
			currentElement.style.zIndex = '100';
			fullscreenOverlayOpacity.set(1);
			if (imgRatio > windowRatio) {
				let width = window.innerWidth;
				let height = width / imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = -rect.left + 'px';
				currentElement.style.top = (window.innerHeight - height) / 2 - rect.top + 'px';
			} else {
				let height = window.innerHeight;
				let width = height * imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = `calc(${height}px - var(--ion-safe-area-bottom) - var(--ion-safe-area-top))`;
				currentElement.style.left = (window.innerWidth - width) / 2 - rect.left + 'px';
				currentElement.style.top = `calc(${-rect.top}px + var(--ion-safe-area-top))`;
			}
			currentElement.removeEventListener('transitionend', transitionEndClose);
			currentElement.addEventListener('transitionend', transitionEndOpen, { once: true });
		};
	}

	function closePhoto() {
		if (!currentElement) {
			return;
		}
		if (opened === false) {
			return;
		}
		console.log('closing');
		open = false;
		fullscreenOverlayOpacity.set(0);
		currentElement.style.width = '';
		currentElement.style.height = '';
		currentElement.style.left = '';
		currentElement.style.top = '';
		currentElement.removeEventListener('transitionend', transitionEndOpen);
		currentElement.addEventListener('transitionend', transitionEndClose, { once: true });
	}

	function transitionEndOpen() {
		opened = true;
	}

	function transitionEndClose() {
		opened = false;
		if (!content) {
			return;
		}
		if (!currentElement) {
			return;
		}
		content.scrollY = true;
		currentElement.style.zIndex = '';
		currentElement.style.transform = '';
		currentElement = null;
	}

	let camera = false;
</script>

<ion-header translucent class={camera ? 'hidden' : ''}>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
	</ion-toolbar>
</ion-header>

<ion-content class="gallery {camera ? 'inactive' : ''}" fullscreen bind:this={content}>
	<div class="photo-grid">
		{#each $photos as photo}
			<div class="element">
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<!-- <Image
					class=""
					photo={photo}
					on:click={(event) => openPhoto(photo, event)}
				></Image> -->
				{#if !photo.loaded}
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
	<button
		on:click={() => {
			const takePicture = async () => {
				const image = await Camera.getPhoto({
					quality: 90,
					allowEditing: true,
					resultType: CameraResultType.Uri
				});

				// image.webPath will contain a path that can be set as an image src.
				// You can access the original file using image.path, which can be
				// passed to the Filesystem API to read the raw data of the image,
				// if desired (or pass resultType: CameraResultType.Base64 to getPhoto)
				var imageUrl = image.webPath;
			};
		}}
	>
		<ion-icon name="camera"></ion-icon>
	</button>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<ion-button
		on:click={() => {
			let photoList = [
				'https://placehold.co/600x400',
				'https://placehold.co/800x600',
				'https://placehold.co/1200x800',
				'https://placehold.co/1600x1200',
				'https://placehold.co/2000x1600',
				'https://placehold.co/400x300',
				'https://placehold.co/700x500',
				'https://placehold.co/1000x700',
				'https://placehold.co/1400x1000',
				'https://placehold.co/1800x1400',
				'https://placehold.co/500x800',
				'https://placehold.co/900x1200',
				'https://placehold.co/1300x1800',
				'https://placehold.co/1700x2200',
				'https://placehold.co/300x200',
				'https://placehold.co/600x500',
				'https://placehold.co/900x800',
				'https://placehold.co/1200x1100',
				'https://placehold.co/1500x1400',
				'https://placehold.co/200x1800'
			];
			photos.update((currentPhotos) => {
				let randomPhoto = {
					id: currentPhotos.length,
					url: photoList[Math.floor(Math.random() * photoList.length)],
					loaded: false
				};
				let img = new Image();
				img.src = randomPhoto.url;
				img.onload = async () => {
					photos.update((currentPhotos) => {
						let photo = currentPhotos.find((photo) => photo.id === randomPhoto.id);
						if (photo) {
							photo.loaded = true;
						}
						return currentPhotos;
					});
					console.log('loaded ' + randomPhoto.loaded);
				};
				return [...currentPhotos, randomPhoto];
			});
			console.log(photos);
		}}
	>
		<Camera />
	</ion-button>
</ion-content>

<div class="camera {camera ? '' : 'inactive'}">camera</div>

<ion-footer>
	<ion-toolbar>
		<ion-segment>
			<ion-segment-button value="gallery" on:click={() => (camera = false)}>
				<ion-label>Gallery</ion-label>
			</ion-segment-button>
			<ion-segment-button value="camera" on:click={() => (camera = true)}>
				<ion-label>Camera</ion-label>
			</ion-segment-button>
		</ion-segment>
	</ion-toolbar>
</ion-footer>

<div class="fullscreen-overlay" bind:this={fullscreenOverlay}></div>

<style>
	.camera {
		position: fixed;
		height: 100vh;
		width: 100vw;
		left: 0;
		top: 0;
		background: #000;
		transition: left 0.3s cubic-bezier(0.1, 0, 0.15, 1);
	}

	.camera.inactive {
		left: 100vw;
	}

	.gallery {
		transition: left 0.3s cubic-bezier(0.1, 0, 0.15, 1);
		left: 0;
	}

	.gallery.inactive {
		left: -100vw;
	}

	.photo-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(100px, 1fr));
		grid-gap: 4px;
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
		opacity: 0;
		z-index: 90;
		pointer-events: none;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.1, 0, 0.15, 1);
	}

	ion-header {
		transform: translateY(0);
		transition: transform 0.3s cubic-bezier(0.1, 0, 0.15, 1);
	}

	ion-header.hidden {
		transform: translateY(-100%);
	}
</style>
