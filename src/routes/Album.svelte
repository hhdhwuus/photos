<script lang="ts">
	import { albumStore, requestAlbum } from '$lib/album';
	import { onMount } from 'svelte';
	import { changeTab } from '$lib/tabStore';

	import '@ionic/core/css/ionic.bundle.css';
	import { flyAndScale, flyUp } from '$lib/utils';
	import { fly } from 'svelte/transition';

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

<ion-content fullscreen transition:fly={flyUp}>
	<div class="grid grid-cols-2">
		{#each $albumStore as album}
			<div class="element">
				<ion-card on:click={viewAlbum(album.id)}>
					<div class="aspect-square w-full">
						<img
							alt=""
							class="h-full w-full object-cover"
							src={album.images.length > 0
								? album.images[Math.floor(Math.random() * album.images.length) | 0]
								: './placeholder_empty.svg'}
						/>
					</div>
					<ion-card-header>
						<ion-card-title>{album.title}</ion-card-title>
						<ion-card-subtitle
							>{album.images.length}
							{album.images.length === 1 ? 'Photo' : 'Photos'}</ion-card-subtitle
						>
					</ion-card-header>
				</ion-card>
			</div>
		{/each}
	</div>
	{#if $albumStore.length === 0}
		<div class="flex h-full w-full items-center justify-center">
			<p class="text-center">No Albums</p>
		</div>
	{/if}
</ion-content>
