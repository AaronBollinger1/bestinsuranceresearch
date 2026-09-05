/// <reference types="astro/client" />

interface Window {
	dataLayer: Array<Record<string, unknown>>;
}

interface ImportMetaEnv {
	readonly PUBLIC_SITE_ORIGIN?: string;
	readonly PUBLIC_BOLLINSURE_ORIGIN?: string;
	readonly PUBLIC_GTM_ID?: string;
	readonly PUBLIC_SITE_ENV?: 'preview' | 'production';
	readonly PUBLIC_GOOGLE_PLACES_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
