<script lang="ts">
	import {
		albumStore,
		loadAlbums,
		addAlbum,
		addImageToAlbum,
		requestAlbum
	} from '$lib/album';
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { writable, type Writable } from 'svelte/store';

	import { photosStore, type Photo } from '$lib/photos';
	import { changeTab } from '$lib/tabStore';

	import { Capacitor } from '@capacitor/core';
	import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

	import '@ionic/core/css/ionic.bundle.css';

	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	import { Camera as CameraIcon, Trash2, X } from 'lucide-svelte';


	let content: HTMLIonContentElement;

	// Beispiel: Hinzufügen eines neuen Bildes zu einem Album
	function addImage(albumId) {
		const newImage = {
			id: Date.now().toString(),
			url: 'path/to/image.jpg',
			description: 'Ein tolles Bild'
		};
		addImageToAlbum(albumId, newImage);
	}

	function viewAlbum(albumId) {
		changeTab("albumview")
		requestAlbum(albumId)
		
	}

	onMount(() => {
    loadAlbums()

  });
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Albums</ion-title>
	</ion-toolbar>
</ion-header>

<ion-content fullscreen bind:this={content}>
	<div class="photo-grid">
		{#each $albumStore as album}
			<div class="element">
				{#if false}
					<ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
				{:else}
					<ion-card on:click={viewAlbum(album.id)}>
						<div class="square-image-container">
							<img alt="Silhouette of mountains" src={album.images[0]} />
						</div>
						<ion-card-header>
							<ion-card-title>{album.title}</ion-card-title>
							<ion-card-subtitle>{(album.images).length} Items</ion-card-subtitle>
						</ion-card-header>
					</ion-card>
				{/if}
			</div>
		{/each}
	</div>
</ion-content>

<style>
	* {
		user-select: none;
	}

	.square-image-container {
		width: 100%;
		padding-top: 100%; /* This makes the height equal to the width */
		position: relative;
	}

	.square-image-container img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover; /* Ensures the image covers the entire container */
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

	ion-col {
		text-align: center;
	}
</style>
