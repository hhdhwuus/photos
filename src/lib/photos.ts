import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, type FileInfo } from '@capacitor/filesystem';
import { writable } from 'svelte/store';

type Photo = {
	id: string;
	date: Date;
	url: string;
	localurl: string;
};

function createPhotosStore() {
	const { subscribe, update } = writable<Photo[]>([]);
	let initialized = false;

	const sortPhotosByDate = (photos: Photo[]) => {
		return photos.sort((a, b) => a.date.getTime() - b.date.getTime());
	};

	return {
		subscribe,
		init: async () => {
			if (initialized) return;
			let directoryContents = await Filesystem.readdir({
				directory: Directory.External,
				path: ''
			});
			initialized = true;
			console.log('Directory Contents:', JSON.stringify(directoryContents));
			const platform = Capacitor.getPlatform();

			if (platform === 'web') {
				directoryContents.files = [
					{
						uri: 'http://picsum.photos/1000/2000?random=1',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test1.jpeg',
						mtime: new Date().getTime()
					},
					{
						uri: 'http://picsum.photos/1300/2000?random=2',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test2.jpeg',
						mtime: new Date().getTime()
					},
					{
						uri: 'http://picsum.photos/1600/2000?random=3',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test3.jpeg',
						mtime: new Date().getTime()
					},
					{
						uri: 'http://picsum.photos/1900/2000?random=4',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test4.jpeg',
						mtime: new Date().getTime()
					},
					{
						uri: 'http://picsum.photos/2200/2000?random=5',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test5.jpeg',
						mtime: new Date().getTime()
					},
					{
						uri: 'http://picsum.photos/2000/1000?random=6',
						ctime: new Date().getTime(),
						size: 1000,
						type: 'file',
						name: 'test6.jpeg',
						mtime: new Date().getTime()
					}
				];

				directoryContents.files.forEach((file: FileInfo) => {
					let photo: Photo = {
						id: crypto.randomUUID(),
						date: file.ctime ? new Date(file.ctime) : new Date(),
						url: file.uri,
						localurl: file.uri
					};
					photosStore.add(photo);
				});
                return;
			}

			directoryContents.files.forEach((file: FileInfo) => {
				if (file.uri.includes('.jpeg')) {
					let photo: Photo = {
						id: crypto.randomUUID(),
						date: file.ctime ? new Date(file.ctime) : new Date(),
						url: Capacitor.convertFileSrc(file.uri),
						localurl: file.uri
					};
					photosStore.add(photo);
				}
			});
		},
		add: (photo: Photo) => update((photos) => sortPhotosByDate([...photos, photo])),
		remove: (photoId: string) =>
			update((photos) => sortPhotosByDate(photos.filter((p) => p.id !== photoId)))
	};
}

export const photosStore = createPhotosStore();
export type { Photo };
export type PhotosStore = ReturnType<typeof createPhotosStore>;
