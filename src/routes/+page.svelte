<script lang="ts">
	import '@ionic/core/css/ionic.bundle.css';
	import { onMount } from 'svelte';
	import { Capacitor } from '@capacitor/core';
	import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

	import { photosStore, type Photo } from '$lib/photos';
	import { photosStore as photosStoreAlbum} from '$lib/photosalbum';
	import { activeTab } from '$lib/tabStore';
	import { changeTab } from '$lib/tabStore';

	import { Camera as CameraIcon, Trash2, X } from 'lucide-svelte';
	import { Images } from 'lucide-svelte';
	import { BookImage } from 'lucide-svelte';

	import Photos from './Photos.svelte';
	import Album from './Album.svelte';
	import AlbumView from './AlbumView.svelte';

	let selectionMode;
	let openPhoto;

	let tabsElement;


	onMount(() => {
		// Get the ion-tabs element
		tabsElement = document.querySelector('ion-tabs');

		console.log(tabsElement)

		// Subscribe to store changes
		activeTab.subscribe((tabName) => {
			if (tabsElement) {
				if (tabName) {
					tabsElement.select(tabName);
					changeTab('');
					photosStoreAlbum.clear();
				}				
			}
		});
	});

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
</script>

<ion-tab tab="photos" component={Photos}></ion-tab>
<ion-tab tab="album"></ion-tab>
<ion-tab tab="albumview"></ion-tab>
<ion-app>
	<ion-tabs>
		<ion-tab tab="photos">
			<Photos bind:isSelectionMode={selectionMode} bind:open={openPhoto} />
		</ion-tab>
		<ion-tab tab="album">
			<Album/>
		</ion-tab>
		<ion-tab tab="albumview">
			<AlbumView/>
		</ion-tab>
		{#if !openPhoto && !$selectionMode}
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="photos">
					<Images />
				</ion-tab-button>
				<ion-tab-button tab="album">
					<BookImage />
				</ion-tab-button>
				<ion-tab-button on:click={addPhoto}>
					<CameraIcon />
				</ion-tab-button>
			</ion-tab-bar>
		{/if}
	</ion-tabs>
</ion-app>
