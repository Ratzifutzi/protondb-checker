import winston from 'winston';

class Logger {
	static #instance: Logger;
	public readonly winston: winston.Logger;

	private constructor() {
		this.winston = winston.createLogger({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple(),
			),
			transports: [
				new winston.transports.Console(),
				new winston.transports.File({
					filename: 'combined.log',
					format: winston.format.json(),
					dirname: 'logs',
					maxFiles: 5,
					maxsize: 5242880, // 5MB
				}),
				new winston.transports.File({
					filename: 'logs/error.log',
					level: 'error',
					format: winston.format.json(),
					dirname: 'logs',
					maxFiles: 5,
					maxsize: 5242880, // 5MB
				}),
			],
		});

		this.winston.info('Logger initialized');
	}

	public static get instance(): Logger {
		if (!Logger.#instance) {
			Logger.#instance = new Logger();
		}

		return Logger.#instance;
	}
}

export const logger = Logger.instance.winston;
