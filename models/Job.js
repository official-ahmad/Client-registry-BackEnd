const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema({
  jobId: { type: String, unique: true },
  receiptId: { type: String, index: true },
  customerName: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  deviceModel: { type: String, default: "" },
  cnic: { type: String, default: "" },
  serviceType: {
    type: String,
    enum: ["", "FRP", "Screen Lock", "Software"],
    default: "",
  },
  status: {
    type: String,
    enum: ["Received", "In-Progress", "Ready", "Delivered"],
    default: "Received",
  },
  price: { type: Number, default: 0 },
  receivedAt: { type: Date, default: Date.now },
});

// Generate unique jobId before validation
JobSchema.pre("validate", async function () {
  if (!this.jobId) {
    // Generate a random 5-digit number
    let isUnique = false;
    let jobId;

    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      jobId = `OA-${randomNum}`;

      // Check if this jobId already exists
      const existingJob = await mongoose.models.Job.findOne({ jobId });
      if (!existingJob) {
        isUnique = true;
      }
    }

    this.jobId = jobId;
  }

  if (!this.receiptId) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString().slice(-6);
    this.receiptId = `RCT-${timestamp}${randomNum}`;
  }
});

module.exports = mongoose.model("Job", JobSchema);
