import SteamAPI from 'steamapi';

class Steam {
	static #instance: Steam;
	public readonly client: SteamAPI;

	private constructor() {
		this.client = new SteamAPI(process.env.STEAM_API_KEY as string);
	}

	public static get instance(): Steam {
		if (!Steam.#instance) {
			Steam.#instance = new Steam();
		}

		return Steam.#instance;
	}
}

export const steam = Steam.instance.client;
