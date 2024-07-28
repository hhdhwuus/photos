import { writable } from 'svelte/store';

type Photo = {
	id: string;
	date: Date;
	url: string;
};

function createPhotosStore() {
    const initialPhotos = [
        {
            id: "7af08569-6918-4893-bdea-9ca2b93fd963",
            date: new Date('2021-08-01T12:00:00Z'),
            url: 'https://picsum.photos/200/300'
        },
        {
            id: "5f7396cf-0081-485f-a60d-ad81d1c3f3bb",
            date: new Date('2021-08-02T12:00:00Z'),
            url: 'https://picsum.photos/400/500'
        },
        {
            id: "fe90399c-3c12-47bf-bf61-42bd6a6abe59",
            date: new Date('2021-08-03T12:00:00Z'),
            url: 'https://picsum.photos/600/700'
        },
        {
            id: "e7e8d5b2-6a8e-4e8e-9e5e-5e4e3d2c1b0a",
            date: new Date('2021-08-04T12:00:00Z'),
            url: 'https://picsum.photos/800/900'
        },
        {
            id: "a1a2a3a4-a5a6-a7a8-a9a0-1b2b3b4b5b6",
            date: new Date('2021-08-05T12:00:00Z'),
            url: 'https://picsum.photos/1000/1100'
        },
        {
            id: "c1c2c3c4-c5c6-c7c8-c9c0-1d2d3d4d5d6",
            date: new Date('2021-08-06T12:00:00Z'),
            url: 'https://picsum.photos/1200/1300'
        },
        {
            id: "f1f2f3f4-f5f6-f7f8-f9f0-1e2e3e4e5e6",
            date: new Date('2021-08-07T12:00:00Z'),
            url: 'https://picsum.photos/1400/1500'
        },
        {
            id: "g1g2g3g4-g5g6-g7g8-g9g0-1f2f3f4f5f6",
            date: new Date('2021-08-08T12:00:00Z'),
            url: 'https://picsum.photos/1600/1700'
        },
        {
            id: "h1h2h3h4-h5h6-h7h8-h9h0-1g2g3g4g5g6",
            date: new Date('2021-08-09T12:00:00Z'),
            url: 'https://picsum.photos/1800/1900'
        },
        {
            id: "i1i2i3i4-i5i6-i7i8-i9i0-1h2h3h4h5h6",
            date: new Date('2021-08-10T12:00:00Z'),
            url: 'https://picsum.photos/2000/2100'
        }
    ];

    const { subscribe, update } = writable<Photo[]>(initialPhotos);

    const sortPhotosByDate = (photos: Photo[]) => {
        return photos.sort((a, b) => a.date.getTime() - b.date.getTime());
    };

    return {
        subscribe,
        add: (photo: Photo) => update((photos) => sortPhotosByDate([...photos, photo])),
        remove: (photoId: string) =>
            update((photos) => sortPhotosByDate(photos.filter((p) => p.id !== photoId)))
    };
}

export const photosStore = createPhotosStore();

export type { Photo };
