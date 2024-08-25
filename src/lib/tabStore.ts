import { writable } from 'svelte/store';

export const activeTab = writable<string>('');

export function changeTab(tabName: string) {
    activeTab.set(tabName);
}
