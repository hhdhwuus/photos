<script lang="ts">
	import { albumStore, requestAlbum } from '$lib/album';
	import { onMount } from 'svelte';
	import { changeTab } from '$lib/tabStore';

	import '@ionic/core/css/ionic.bundle.css';
	import { flyAndScale } from '$lib/utils';

	function viewAlbum(albumId) {
		changeTab('albumview');
		requestAlbum(albumId);
	}

	onMount(() => {
		albumStore.loadAlbums();
	});
</script>

<ion-header translucent>
	<ion-toolbar>
		<ion-title>Albums</ion-title>
	</ion-toolbar>
</ion-header>

<ion-content fullscreen>
	<div class="grid grid-cols-2" transition:flyAndScale>
		{#each $albumStore as album}
			<div class="element">
				<ion-card on:click={viewAlbum(album.id)}>
					<div class="aspect-square w-full">
						<img
							alt=""
							class="h-full w-full object-cover"
							src={album.images[Math.floor(Math.random() * album.images.length) | 0]}
						/>
					</div>
					<ion-card-header>
						<ion-card-title>{album.title}</ion-card-title>
						<ion-card-subtitle>{album.images.length} {album.images.length === 1 ? "Photo" : "Photos"}</ion-card-subtitle>
					</ion-card-header>
				</ion-card>
			</div>
		{/each}
	</div>
</ion-content>
