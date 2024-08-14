import { writable } from 'svelte/store';
import { set as idbSet, get as idbGet } from 'idb-keyval';


export const requestedAlbumID = writable<string>('');

export function requestAlbum(albumId: string) {
    requestedAlbumID.set(albumId);
}

// Definiere das Album-Store
export const albumStore = writable([]);

// Funktion zum Laden der Alben aus der IndexedDB
export async function loadAlbums() {
    const albums = await idbGet('albums');
    if (albums) {
        albumStore.set(albums);
    }
}

// Funktion zum Hinzufügen eines Albums
export function addAlbum(newAlbum) {
    albumStore.update(albums => {
        const updatedAlbums = [...albums, newAlbum];
        idbSet('albums', updatedAlbums);
        return updatedAlbums;
    });
}

// Funktion zum Entfernen eines Albums
export function removeAlbum(albumId) {
    albumStore.update(albums => {
        const updatedAlbums = albums.filter(album => album.id !== albumId);
        idbSet('albums', updatedAlbums);
        return updatedAlbums;
    });
}

// Funktion zum Hinzufügen eines Bildes zu einem Album
export function addImageToAlbum(albumId, newImage) {
    albumStore.update(albums => {
        const updatedAlbums = albums.map(album => {
            if (album.id === albumId) {
                return { ...album, images: [...album.images, newImage] };
            }
            return album;
        });
        idbSet('albums', updatedAlbums);
        return updatedAlbums;
    });
}

// Funktion zum Entfernen eines Bildes aus einem Album
export function removeImageFromAlbum(albumId, imageId) {
    albumStore.update(albums => {
        const updatedAlbums = albums.map(album => {
            if (album.id === albumId) {
                return {
                    ...album,
                    images: album.images.filter(image => image.id !== imageId),
                };
            }
            return album;
        });
        idbSet('albums', updatedAlbums);
        return updatedAlbums;
    });
}

export function updateAlbumTitle(albumId, newTitle) {
    albumStore.update(albums => {
        const updatedAlbums = albums.map(album => {
            if (album.id === albumId) {
                return { ...album, title: newTitle };
            }
            return album;
        });
        idbSet('albums', updatedAlbums);
        return updatedAlbums;
    });
}
