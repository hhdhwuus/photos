<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { derived, writable, type Writable } from 'svelte/store';
	import { photosStore, type Photo } from '$lib/photos';

	import { changeTab } from '$lib/tabStore';
	import { requestedAlbumID } from '$lib/album';

	import { albumStore, type Album } from '$lib/album';
	import { activeTab } from '$lib/tabStore';

	import { Capacitor } from '@capacitor/core';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
	import { Share } from '@capacitor/share';

	import '@ionic/core/css/ionic.bundle.css';

	import * as Dialog from '$lib/components/ui/dialog';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';

	import { Camera as CameraIcon, FolderPen, Share2, Trash2, X } from 'lucide-svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PhotoGrid from '$lib/PhotoGrid.svelte';

	let newAlbumName: Album['title'];
	let requestedAlbum: Album;
	let openEdit: boolean;
	let openDelete: boolean;
	let selectedPhotos = writable<string[]>([]);
	let sharedPhotos: string[] = [];

	let unsubscribe = requestedAlbumID.subscribe((albumId) => {
		requestedAlbum = $albumStore.find((album) => album.id === albumId) as Album;
	});

	let photos = derived(photosStore, ($photosStore) => {
		console.log('images', requestedAlbum);
		return $photosStore.filter((photo) => requestedAlbum?.images.includes(photo.url));
	});

	onMount(async () => {
		const platform = Capacitor.getPlatform();

		console.log($photos);
	});

	onDestroy(() => {
		console.log('destroy');
		unsubscribe();
	});

	let open = false;

	let isSelectionMode = writable(false);

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

	function removeAlbumByID() {
		albumStore.removeAlbum(requestedAlbum.id);
		openDelete = false;
		changeTab('album');
	}

	function renameAlbum() {
		if (newAlbumName) {
			albumStore.updateAlbumTitle(requestedAlbum.id, newAlbumName);
			requestedAlbum.title = newAlbumName;
			openEdit = false;
			newAlbumName = '';
		}
	}
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>{requestedAlbum?.title}</ion-title>
		<div class="pr-5" slot="end">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Options</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Group>
						<DropdownMenu.Label>Album Options</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item on:click={() => (openEdit = true)}>
							<FolderPen class="mr-2 h-4 w-4" />
							<span>Rename</span>
						</DropdownMenu.Item>
						<DropdownMenu.Item on:click={() => (openDelete = true)}>
							<Trash2 class="mr-2 h-4 w-4" />
							<span>Delete</span>
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</ion-toolbar>
</ion-header>

<Dialog.Root bind:open={openEdit}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Rename album</Dialog.Title>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label class="text-right">Name</Label>
				<Input
					id="name"
					class="col-span-3"
					placeholder={requestedAlbum.title}
					bind:value={newAlbumName}
				/>
			</div>
		</div>
		<!-- Buttons Section -->
		<div class="dialog-footer">
			<Button on:click={renameAlbum}>Rename</Button>
			<Button
				variant="outline"
				on:click={() => {
					openEdit = false;
					newAlbumName = '';
				}}>Cancel</Button
			>
		</div>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={openDelete}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure absolutely sure?</Dialog.Title>
		</Dialog.Header>
		<div class="dialog-footer">
			<Button variant="destructive" on:click={removeAlbumByID}>Delete</Button>
			<Button variant="outline" on:click={() => (openDelete = false)}>Cancel</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<PhotoGrid bind:isSelectionMode bind:selectedPhotos photosStore={photos}></PhotoGrid>

<style>
	* {
		user-select: none;
	}
</style>
