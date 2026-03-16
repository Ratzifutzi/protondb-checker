declare global {
	namespace NodeJS {
		interface ProcessEnv {
			// Database
			MONGODB_URI: string;
			MONGODB_NAME: string;

			// Captcha
			NEXT_PUBLIC_PRIVATE_CAPTCHA_SITEKEY: string,
			PRIVATE_CAPTCHA_KEY: string,
		}
	}
}

export {};
