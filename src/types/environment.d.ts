declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// Database
			MONGODB_URI: string;
			MONGODB_NAME: string;

			// Captcha
			NEXT_PUBLIC_PRIVATE_CAPTCHA_SITEKEY: string;
			PRIVATE_CAPTCHA_KEY: string;

			// Etc
			HOSTED_DOMAIN: string;
			STEAM_API_KEY: string;

			// ProtonDB API base URL, https://www.protondb.com when unset.
			// Point it at a local mock for tests.
			PROTONDB_API_BASE?: string;
		}
	}
}

export {};
