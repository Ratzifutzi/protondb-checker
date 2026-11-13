import mongoose, { Schema } from 'mongoose';

const ScanLogSchema = new Schema({
	date: { type: Date, required: true },
	ipAddress: { type: String, required: true },
	targetProfile: { type: Number, required: true },
});

// Session checks and rate limits filter by IP or by profile and a date range.
ScanLogSchema.index({ ipAddress: 1, date: -1 });
ScanLogSchema.index({ targetProfile: 1, date: -1 });

const ScanLog =
	mongoose.models.ScanLog || mongoose.model('ScanLog', ScanLogSchema);

export default ScanLog;
