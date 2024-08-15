<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { derived, writable, type Writable } from 'svelte/store';

	import { photosStore, type Photo } from '$lib/photos';
	import { changeTab } from '$lib/tabStore';
	import { activeTab } from '$lib/tabStore';

	import { albumStore, type Album } from '$lib/album';

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
	let deleteSelectionDialog: boolean;
	let createAlbumDialog: boolean;

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

		deleteSelectionDialog = false;
		selectedPhotos.set([]);
		toggleSelectionMode();
	}

	async function shareSelectedPhoto() {
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
		createAlbumDialog = false;

		console.log($albumStore);
	}
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Photos</ion-title>
		{#if $isSelectionMode}
			<div class="pr-5" slot="secondary">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Group>
							<DropdownMenu.Item on:click={() => (createAlbumDialog = true)}>
								<FolderPlus class="mr-2 h-4 w-4" />
								<span>Add to Album</span>
							</DropdownMenu.Item>
							<DropdownMenu.Item on:click={() => (deleteSelectionDialog = true)}>
								<Trash2 class="mr-2 h-4 w-4" />
								<span>Delete</span>
							</DropdownMenu.Item>
							<DropdownMenu.Item on:click={shareSelectedPhoto}>
								<Share2 class="mr-2 h-4 w-4" />
								<span>Share</span>
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}
		<ion-buttons class="pr-5" slot="primary" on:click={toggleSelectionMode}>
			{$isSelectionMode ? 'Cancel' : 'Select'}
		</ion-buttons>
	</ion-toolbar>
</ion-header>

<Dialog.Root bind:open={createAlbumDialog}>
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
			<Button variant="destructive" on:click={createAlbum}>Delete</Button>
			<Button variant="outline" on:click={() => (createAlbumDialog = false)}>Cancel</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteSelectionDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
		</Dialog.Header>

		<!-- Buttons Section -->
		<div class="dialog-footer">
			<Button variant="destructive" on:click={handleDeleteSelectedPhoto}>Delete</Button>
			<Button variant="outline" on:click={() => (deleteSelectionDialog = false)}>Cancel</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<PhotoGrid bind:isSelectionMode bind:selectedPhotos {photosStore}></PhotoGrid>

<style>
	* {
		user-select: none;
	}
</style>
