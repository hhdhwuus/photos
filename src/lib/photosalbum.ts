import { writable } from 'svelte/store';

type Photo = {
    id: string;
    date: Date;
    url: string;
    localurl: string;
};

function createPhotosStore() {
    const { subscribe, update } = writable<Photo[]>([]);

    const sortPhotosByDate = (photos: Photo[]) => {
        return photos.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    return {
        subscribe,
        add: (photo: Photo) => update((photos) => sortPhotosByDate([...photos, photo])),
        remove: (photoId: string) =>
            update((photos) => sortPhotosByDate(photos.filter((p) => p.id !== photoId))),
        clear: () => update(() => [])  // Hier wird der Store auf ein leeres Array zurückgesetzt
    };
}

export const photosStore = createPhotosStore();

export type { Photo };