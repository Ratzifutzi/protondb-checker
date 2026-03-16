import mongoose, { Schema } from 'mongoose';

const CachedProtonGameSchema = new Schema({
	data: {
		bestReportedTier: { type: String},
		confidence: { type: String, required: true},
		score: { type: Number, required: true},
		tier: { type: String, required: true},
		total: { type: Number, required: true},
		trendingTier: { type: String, required: true},
		id: { type: Number, required: true},
	},
	savedAt: {type: Date, required: true},
	appId: { type: Number, required: true, unique: true},
});

const CachedProtonGame = mongoose.models.CachedProtonGame || mongoose.model('CachedProtonGame', CachedProtonGameSchema);

export default CachedProtonGame;
