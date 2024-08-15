<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { derived, writable, type Writable } from 'svelte/store';

	import { photosStore, type Photo } from '$lib/photos';
	import { changeTab } from '$lib/tabStore';
	import { activeTab } from '$lib/tabStore';

	import {
		albumStore,
		type Album,
	} from '$lib/album';

	import { Capacitor } from '@capacitor/core';
	import { Filesystem, Directory } from '@capacitor/filesystem';
	import { Share } from '@capacitor/share';

	import '@ionic/core/css/ionic.bundle.css';

	import { Carousel } from 'flowbite-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	import { Camera as CameraIcon, FolderPen, Images, Share2, Trash2, X } from 'lucide-svelte';
	import { FolderPlus } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import PhotoGrid from '$lib/PhotoGrid.svelte';

	let albumTitle: Album['title'];
	let sharedPhotos: string[] = [];

	onMount(async () => {
		const platform = Capacitor.getPlatform();
		console.log(new Date(new Date(1723420462406).toISOString()));

		photosStore.init();
	});

	let opened = false;

	export let isSelectionMode = writable(false);
	let selectedPhotos = writable<string[]>([]);

	function toggleSelectionMode() {
		isSelectionMode.update((mode) => !mode);
		selectedPhotos.set([]);
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
		if (!currentElement) {
			const photoPromises = $selectedPhotos.map(async (element) => {
				let selectedPhoto = $photosStore.find((photo) => photo.id === element);
				console.log('Photo:', JSON.stringify(selectedPhoto));
				const selectedFileUrl = selectedPhoto?.localurl;

				console.log('FileUrl:', selectedFileUrl);
				if (selectedFileUrl) {
					sharedPhotos.push(selectedFileUrl);
				}
			});

			// Warten bis alle asynchronen Operationen abgeschlossen sind
			await Promise.all(photoPromises);
		} else {
			let selectedPhoto = $photosStore.find((photo) => photo.id === currentElement?.id);
			const selectedFileUrl = selectedPhoto?.localurl;
			if (selectedFileUrl) {
				sharedPhotos.push(selectedFileUrl);
			}
		}

		console.log('List', sharedPhotos);

		await Share.share({
			files: sharedPhotos
		});

		// Listen und Status zurücksetzen
		sharedPhotos = [];
		if ($isSelectionMode) {
			selectedPhotos.set([]);
			toggleSelectionMode();
		}
	}

	async function createAlbum() {
		let albumImages: Album['images'] = [];
		$selectedPhotos.forEach(async (element) => {
			let selectedPhoto = $photosStore.find((photo) => photo.id === element);
			if (selectedPhoto) {
				albumImages.push(selectedPhoto?.url);
			}
		});
		const newAlbum = {
			id: Date.now().toString(), // Einfache ID basierend auf dem aktuellen Timestamp
			title: albumTitle,
			images: albumImages
		};
		albumTitle = '';

		console.log(albumImages);
		albumStore.addAlbum(newAlbum);
		changeTab('album');

		if ($isSelectionMode) {
			selectedPhotos.set([]);
			toggleSelectionMode();
		}

		console.log($albumStore);
	}
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
		<ion-buttons class="pr-5" slot="end" on:click={toggleSelectionMode}>
			{$isSelectionMode ? 'Cancel' : 'Select'}
		</ion-buttons>
		<div class="pr-5" slot="end">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Label>Album Options</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<FolderPlus class="text-black-700" />
							<span>Add to Album</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<Trash2 class="mr-2 h-4 w-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<Share2 class="mr-2 h-4 w-4" />
							<span>Share</span>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</ion-toolbar>
</ion-header>

<PhotoGrid bind:isSelectionMode bind:selectedPhotos {photosStore}></PhotoGrid>

<!-- <ion-content fullscreen bind:this={content}>
	<div class="photo-grid">
		{#each $photos as photo}
			<div class="element">
				{#await photo.loaded}
					<ion-skeleton-text animated class="skeleton"></ion-skeleton-text>
				{:then}
					<div
						class="photo-container"
						aria-label="Open Photo"
						style="background-image: url({photo.url})"
						role="button"
						on:click={$isSelectionMode
							? () => selectPhoto(photo.id)
							: (event) => openPhoto(photo, event)}
					></div>
					{#if $isSelectionMode}
						{#if $selectedPhotos.includes(photo.id)}
							<CircleCheck class="relative z-[60]" />
						{:else}
							<Circle class="relative z-[60]" />
						{/if}
					{/if}
				{/await}
			</div>
		{/each}
	</div>
</ion-content> -->

<!-- <div class="fullscreen-overlay" bind:this={fullscreenOverlay}>
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
</div> -->

{#if $isSelectionMode || opened}
	<ion-footer translucent class="z-[10000]">
		<ion-toolbar>
			<div class="flex justify-end space-x-5 pr-10">
				<div>
					<Dialog.Root>
						<Dialog.Trigger>
							<button>
								<FolderPlus class="text-black-700" />
							</button>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Enter album name</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-4 py-4">
								<div class="grid grid-cols-4 items-center gap-4">
									<Label class="text-right">Name</Label>
									<Input id="name" class="col-span-3" bind:value={albumTitle} />
								</div>
							</div>
							<!-- Buttons Section -->
							<div class="dialog-footer">
								<Dialog.Close>
									<Button on:click={createAlbum}>Create</Button>
								</Dialog.Close>
								<Dialog.Close>
									<Button variant="outline">Cancel</Button></Dialog.Close
								>
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
				<div>
					<button on:click={shareSelectedPhoto}>
						<Share2 class="text-black-700" />
					</button>
				</div>
				<div>
					<Dialog.Root>
						<Dialog.Trigger>
							<button>
								<Trash2 class="text-red-500" />
							</button>
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
							</Dialog.Header>

							<!-- Buttons Section -->
							<div class="dialog-footer">
								<Dialog.Close>
									<Button variant="destructive" on:click={handleDeleteSelectedPhoto}>Delete</Button>
								</Dialog.Close>
								<Dialog.Close><Button variant="outline">Cancel</Button></Dialog.Close>
							</div>
						</Dialog.Content>
					</Dialog.Root>
				</div>
			</div>
		</ion-toolbar>
	</ion-footer>
{/if}

<style>
	* {
		user-select: none;
	}
</style>
