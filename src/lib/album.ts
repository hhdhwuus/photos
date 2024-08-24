import { writable } from 'svelte/store';
import { set as idbSet, get as idbGet } from 'idb-keyval';
import type { Photo } from './photos';

export const requestedAlbumID = writable<string>('');

export type Album = {
	id: string;
	title: string;
	images: Photo['localurl'][];
};

export function requestAlbum(albumId: string) {
	requestedAlbumID.set(albumId);
}

// Define the Album Store
export const albumStore = (() => {
	const { subscribe, set, update } = writable<Album[]>([]);

	// Function to load the albums from IndexedDB
	async function loadAlbums() {
		const albums: Album[] = (await idbGet('albums')) ?? [];
		if (albums) {
			set(albums);
		}
	}

	// Function to add an album
	function addAlbum(newAlbum: Album) {
		update((albums) => {
			const updatedAlbums = [...albums, newAlbum];
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	// Function to remove an album
	function removeAlbum(albumId: Album['id']) {
		update((albums) => {
			const updatedAlbums = albums.filter((album) => album.id !== albumId);
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	// Function to add an image to an album
	function addImageToAlbum(albumId: Album['id'], newImage: Photo['localurl']) {
		update((albums) => {
			const updatedAlbums = albums.map((album) => {
				if (album.id === albumId) {
					// Check if the image already exists in the album
					console.log("new",newImage)
					console.log("test", album.images)
					if (!album.images.includes(newImage)) {
						return { ...album, images: [...album.images, newImage] };
					}
				}
				return album;
			});
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	// Function to remove an image from an album
	function removeImageFromAlbum(albumId: Album['id'], imageUrl: Photo['localurl']) {
		update((albums) => {
			const updatedAlbums = albums.map((album) => {
				if (album.id === albumId) {
					return {
						...album,
						images: album.images.filter((image) => image !== imageUrl)
					};
				}
				return album;
			});
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	// Function to update the title of an album
	function updateAlbumTitle(albumId: Album['id'], newTitle: Album['title']) {
		update((albums) => {
			const updatedAlbums = albums.map((album) => {
				if (album.id === albumId) {
					return { ...album, title: newTitle };
				}
				return album;
			});
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	function removeImageFromAllAlbums(imageUrl: Photo['localurl']) {
		update((albums) => {
			// Bild aus jedem Album entfernen
			const updatedAlbums = albums.map((album) => {
				return {
					...album,
					images: album.images.filter((image) => image !== imageUrl)
				};
			});
			// Aktualisierte Alben in IndexedDB speichern
			idbSet('albums', updatedAlbums);
			return updatedAlbums;
		});
	}

	return {
		subscribe,
		loadAlbums,
		addAlbum,
		removeAlbum,
		addImageToAlbum,
		removeImageFromAlbum,
		updateAlbumTitle,
		removeImageFromAllAlbums
	};
})();