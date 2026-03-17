import SteamAuth from 'node-steam-openid';

class OpenIdSteam {
	static #instance: OpenIdSteam;
	public readonly client: SteamAuth;

	private constructor() {
		this.client = new SteamAuth({
			realm: process.env.HOSTED_DOMAIN,
			returnUrl: `${process.env.HOSTED_DOMAIN}/api/auth/steam/verify`,
			apiKey: process.env.STEAM_API_KEY,
		});
	}

	public static get instance(): OpenIdSteam {
		if (!OpenIdSteam.#instance) {
			OpenIdSteam.#instance = new OpenIdSteam();
		}

		return OpenIdSteam.#instance;
	}
}

export const openIdSteam = OpenIdSteam.instance.client;
