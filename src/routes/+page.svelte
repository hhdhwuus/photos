<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';

	type Photo = {
		url: string;
	};

	let photos: Photo[] = []; // Array of photo objects
	let content: HTMLIonContentElement;

	onMount(async () => {
		photos = [
			{ url: 'https://placehold.co/600x400' },
			{ url: 'https://placehold.co/800x600' },
			{ url: 'https://placehold.co/1200x800' },
			{ url: 'https://placehold.co/1600x1200' },
			{ url: 'https://placehold.co/2000x1600' },
			{ url: 'https://placehold.co/400x300' },
			{ url: 'https://placehold.co/700x500' },
			{ url: 'https://placehold.co/1000x700' },
			{ url: 'https://placehold.co/1400x1000' },
			{ url: 'https://placehold.co/1800x1400' },
			{ url: 'https://placehold.co/500x800' },
			{ url: 'https://placehold.co/900x1200' },
			{ url: 'https://placehold.co/1300x1800' },
			{ url: 'https://placehold.co/1700x2200' },
			{ url: 'https://placehold.co/300x200' },
			{ url: 'https://placehold.co/600x500' },
			{ url: 'https://placehold.co/900x800' },
			{ url: 'https://placehold.co/1200x1100' },
			{ url: 'https://placehold.co/1500x1400' },
			{ url: 'https://placehold.co/200x1800' }
		];

		window.addEventListener('touchstart', (event) => {});

		window.addEventListener('touchmove', (event) => {});

		window.addEventListener('touchend', (event) => {});
	});

	let open = false;
	let opened = false;
	let currentElement: HTMLDivElement;

	$: console.log(open, opened);

	function openPhoto(photo: Photo, event: MouseEvent) {
		if (opened) {
			closePhoto(event);
			return;
		}
		if (open) {
			return;
		}
		console.log('opening');
		open = true;
		currentElement = event.target as HTMLDivElement;
		if (!currentElement) {
			return;
		}
		if (currentElement.classList.contains('photo-container') === false) {
			return;
		}
		let rect = currentElement.getBoundingClientRect();
		let img = new Image();
		img.src = photo.url;
		img.onload = () => {
			let imgRatio = img.width / img.height;
			let windowRatio = window.innerWidth / window.innerHeight;
			content.scrollY = false;
			currentElement.style.zIndex = '1000';
			if (imgRatio > windowRatio) {
				let width = window.innerWidth;
				let height = width / imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = height + 'px';
				console.log(width, height, window.innerWidth, window.innerHeight);
				currentElement.style.left = -rect.left + 'px';
				currentElement.style.top = (window.innerHeight - height) / 2 - rect.top + 'px';
			} else {
				let height = window.innerHeight;
				let width = height * imgRatio;
				currentElement.style.width = width + 'px';
				currentElement.style.height = height + 'px';
				currentElement.style.left = (window.innerWidth - width) / 2 - rect.left + 'px';
				currentElement.style.top = -rect.top + 'px';
			}
			currentElement.removeEventListener('transitionend', transitionEndClose);
			currentElement.addEventListener('transitionend', transitionEndOpen, { once: true });
		};
	}

	function closePhoto(event: MouseEvent) {

		currentElement = event.target as HTMLDivElement;
		if (!currentElement) {
			return;
		}
		if (opened === false) {
			return;
		}
		console.log('closing');
		open = false;
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

	function transitionEndClose(e: TransitionEvent) {
		opened = false;
		content.scrollY = true;
		let element = e.target as HTMLDivElement;
		element.style.zIndex = '';
	}
</script>

<ion-header translucent class={open ? 'hidden' : ''}>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
	</ion-toolbar>
</ion-header>

<ion-content fullscreen bind:this={content}>
	<div class="photo-grid">
		{#each photos as photo}
			<div class="element">
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-interactive-supports-focus -->
				<div
					class="photo-container"
					style="background-image: url({photo.url})"
					on:click={(event) => openPhoto(photo, event)}
					aria-label="Open Photo"
					role="button"
				></div>
			</div>
		{/each}
	</div>
</ion-content>

<div class="fullscreen-overlay {open ? 'active' : ''}"></div>

<style>
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(100px, 1fr));
		grid-gap: 5px;
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

	.fullscreen-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 1);
		opacity: 0;
		pointer-events: none;
		transition-property: opacity;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.1, 0, 0.15, 1);
	}

	.fullscreen-overlay.active {
		opacity: 1;
	}

	.clip {
		overflow: clip;
	}

	ion-header {
		transition-property: opacity;
		transition-duration: 0.3s;
		transition-timing-function: cubic-bezier(0.1, 0, 0.15, 1);
	}

	ion-header.hidden {
		opacity: 0;
	}
</style>
