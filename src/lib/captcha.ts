import { Client, createClient } from '@private-captcha/private-captcha-js';

class CaptchaSingleton {
	static #instance: CaptchaSingleton;
	public readonly client: Client;

	private constructor() {
		this.client = createClient({
			apiKey: process.env.PRIVATE_CAPTCHA_KEY as string,
			//logger: console.log,
		});
	}

	public static get instance(): CaptchaSingleton {
		if (!CaptchaSingleton.#instance) {
			console.log(
				'Creating new CaptchaClient instance with key',
				process.env.PRIVATE_CAPTCHA_KEY,
			);
			CaptchaSingleton.#instance = new CaptchaSingleton();
		}

		return CaptchaSingleton.#instance;
	}
}

export const CaptchaClient = CaptchaSingleton.instance.client;
