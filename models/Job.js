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
    enum: ["", "FRP", "Screen Lock", "Software", "Other"],
    default: "",
  },
  customService: { type: String, default: "" },
  status: {
    type: String,
    enum: ["Received", "In-Progress", "Ready", "Delivered"],
    default: "Received",
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Paid"],
    default: "Pending",
  },
  paymentMethod: {
    type: String,
    enum: ["Cash", "JazzCash", "Easypaisa", "Bank Transfer", "Other"],
    default: "Cash",
  },
  paidAt: { type: Date, default: null },
  price: { type: Number, default: 0 },
  receivedAt: { type: Date, default: Date.now },
});

// Generate unique jobId before validation
JobSchema.pre("validate", async function () {
  if (!this.jobId) {
    let isUnique = false;
    let jobId;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      jobId = `OA-${randomNum}`;

      const existingJob = await mongoose.models.Job.findOne({ jobId });
      if (!existingJob) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique jobId after max attempts");
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
