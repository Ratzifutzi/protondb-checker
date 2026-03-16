import mongoose, { Schema } from 'mongoose';

const ScanLogSchema = new Schema({
	date: {type: Date, required: true},
	ipAddress: { type: String, required: true},
	targetProfile: { type: Number, required: true}
})

const ScanLog = mongoose.models.ScanLog || mongoose.model("ScanLog", ScanLogSchema)

export default ScanLog;