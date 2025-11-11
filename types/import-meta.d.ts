// Ambient declaration to allow using import.meta.env.VITE_MAPBOX_TOKEN in Next.js
interface ImportMeta {
	env: {
		VITE_MAPBOX_TOKEN?: string;
		[key: string]: string | undefined;
	};
}


