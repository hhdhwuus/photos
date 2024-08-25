<script>
	import '../app.css';
	import { setupIonicBase } from 'ionic-svelte';
	import { videocam, pin } from 'ionicons/icons';
	import { Toaster } from "$lib/components/ui/sonner";

	/* Theme variables */
	import '../theme/variables.css';

	/* load and register all components - you can also import separately to code split */
	import 'ionic-svelte/components/all';
	import { onMount } from 'svelte';
	import { setMode } from 'mode-watcher';

	/* run base configuration code from ionic/core */
	setupIonicBase();

	onMount(() => {
		setMode('light');
	})
</script>

<ion-app>
	<Toaster></Toaster>
		<slot></slot>
</ion-app>
