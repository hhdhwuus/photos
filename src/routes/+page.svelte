<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { Camera as CameraIcon, Trash2, X } from 'lucide-svelte';
	import { writable, type Writable } from 'svelte/store';
	import { Camera, CameraResultType } from '@capacitor/camera';

	type Photo = {
		id: string;
		date: Date;
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
	let currentPhoto: Photo | null;
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
			let imgRatio = img.width / img.height;
			let topPadding = fullscreenOverlay.firstElementChild?.clientHeight ?? 0;
			let windowHeight = window.innerHeight - topPadding;
			let windowWidth = window.innerWidth;
			let windowRatio = windowWidth / windowHeight;
			content.scrollY = false;
			currentElement.style.zIndex = '50';
			fullscreenOverlayOpacity.set(1);
			if (imgRatio > windowRatio) {
				let height = windowWidth / imgRatio;
				currentElement.style.width = windowWidth + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = -rect.left + 'px';
				currentElement.style.top = (windowHeight + topPadding - height) / 2 - rect.top + 'px';
			} else {
				let height = windowHeight;
				let width = height * imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = `calc(${height}px - var(--ion-safe-area-bottom) - var(--ion-safe-area-top))`;
				currentElement.style.left = (windowWidth - width) / 2 - rect.left + 'px';
				currentElement.style.top = `calc(${-rect.top + topPadding}px + var(--ion-safe-area-top))`;
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
		currentPhoto = null;
	}
</script>

<div class="fullscreen-overlay" bind:this={fullscreenOverlay}>
	<div class="container">
		<h4>{currentPhoto?.date.toLocaleDateString(navigator.language, {day: "numeric", month: "long", year: "numeric"})}</h4>
		<div class="buttons">
			<button>
				<Trash2 strokeWidth="1.5" size="20" />
			</button>
			<button on:click={closePhoto}>
				<X strokeWidth="1.5" />
			</button>
		</div>
	</div>
</div>


<ion-content fullscreen bind:this={content}>
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
		on:click={async () => {
			const image = await Camera.getPhoto({
				quality: 90,
				allowEditing: false,
				resultType: CameraResultType.DataUrl
			});

			// image.webPath will contain a path that can be set as an image src.
			// You can access the original file using image.path, which can be
			// passed to the Filesystem API to read the raw data of the image,
			// if desired (or pass resultType: CameraResultType.Base64 to getPhoto)
			let imageUrl = image.dataUrl;
			console.log(imageUrl);
			if (!imageUrl) {
				return;
			}
			photos.update((currentPhotos) => {
				let photo = {
					id: crypto.randomUUID(),
					date: new Date(),
					url: imageUrl,
					loaded: false
				};
				let img = new Image();
				img.src = photo.url;
				img.onload = async () => {
					photos.update((currentPhotos) => {
						let updatedPhoto = currentPhotos.find((p) => p.id === photo.id);
						if (updatedPhoto) {
							updatedPhoto.loaded = true;
						}
						return currentPhotos;
					});
					console.log('loaded ' + photo.loaded);
				};
				return [...currentPhotos, photo];
			});
			console.log(photos);
		}}
	>
		<CameraIcon />
	</button>
</ion-content>

<style>
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
		opacity: 0;
		z-index: 40;
		pointer-events: none;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.1, 0, 0.15, 1);
	}

	.fullscreen-overlay .buttons {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		gap: 16px;
	}
	.fullscreen-overlay .buttons button {
		background-color: rgba(255, 255, 255, 0.25);
		color: white;
		border: none;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		padding: 3px;
		display: flex;
		z-index: 100;
		justify-content: center;
		align-items: center;
	}

	.fullscreen-overlay .container {
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
	}
</style>
