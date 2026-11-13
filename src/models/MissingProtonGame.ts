import mongoose, { type Model, Schema } from 'mongoose';

/** A Steam app ProtonDB has no reports for (it answered 404). */
export type MissingProtonGameRow = {
	appId: number;
	savedAt: Date;
};

const MissingProtonGameSchema = new Schema<MissingProtonGameRow>({
	appId: { type: Number, required: true, unique: true },
	// TTL index: MongoDB deletes the row 3 days after savedAt.
	savedAt: { type: Date, required: true, expires: '3d' },
});

const MissingProtonGame =
	(mongoose.models.MissingProtonGame as
		Model<MissingProtonGameRow> | undefined) ||
	mongoose.model<MissingProtonGameRow>(
		'MissingProtonGame',
		MissingProtonGameSchema,
	);

export default MissingProtonGame;
