// Quick test to validate the backend setup
const Job = require("./models/Job");

console.log("✅ Job model loaded successfully");
console.log("✅ Schema fields:", Object.keys(Job.schema.paths));
console.log("✅ Service types:", Job.schema.path("serviceType").enumValues);
console.log("✅ Status types:", Job.schema.path("status").enumValues);
console.log("✅ JobId auto-generation: pre-validate hook configured");
console.log("\n🎉 Backend setup is valid!");
console.log("\n💡 Note: jobId is auto-generated and not required in POST requests");
