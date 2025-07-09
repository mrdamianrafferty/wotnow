const userPreferences = [
  "picnicking",
  "running",
  "fly_fishing_freshwater",
  "outdoor_gardening",
  "bbq"
];
const fs = require("fs");
const path = require("path");

// paths to your files
const activityTypesPath = path.join(__dirname, "src/data/activityTypes.ts");
const activitiesPath = path.join(__dirname, "src/data/activities.ts");

// extract ids from activityTypes.ts
const activityTypesContent = fs.readFileSync(activityTypesPath, "utf8");
const activityTypesIds = Array.from(
  activityTypesContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)
).map((m) => m[1]);

// extract ids from activities.ts
const activitiesContent = fs.readFileSync(activitiesPath, "utf8");
const activitiesIds = Array.from(
  activitiesContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)
).map((m) => m[1]);

console.log(`✅ Found ${activityTypesIds.length} ids in activityTypes.ts`);
console.log(`✅ Found ${activitiesIds.length} ids in activities.ts`);

const missing = activitiesIds.filter((id) => !activityTypesIds.includes(id));

if (missing.length > 0) {
  console.log("\n⚠️ IDs in activities.ts but NOT in activityTypes.ts:");
  missing.forEach((id) => console.log(` - ${id}`));
} else {
  console.log("\n🎉 All activities.ts ids are present in activityTypes.ts.");
}

const missingInActivities = activityTypesIds.filter((id) => !activitiesIds.includes(id));

if (missingInActivities.length > 0) {
  console.log("\n⚠️ IDs in activityTypes.ts but NOT in activities.ts:");
  missingInActivities.forEach((id) => console.log(` - ${id}`));
} else {
  console.log("\n✅ All activityTypes.ts ids are present in activities.ts.");
}

const missingForUser = userPreferences.filter(
  (id) => !activityTypesIds.includes(id)
);

if (missingForUser.length > 0) {
  console.log("\n⚠️ User preferences missing from activityTypes.ts:");
  missingForUser.forEach((id) => console.log(` - ${id}`));
} else {
  console.log("\n🎯 All user preferences are present in activityTypes.ts.");
}

const duplicates = activityTypesIds.filter(
  (id, idx, arr) => arr.indexOf(id) !== idx
);

if (duplicates.length > 0) {
  console.log("\n⚠️ Duplicate IDs in activityTypes.ts:");
  duplicates.forEach((id) => console.log(` - ${id}`));
} else {
  console.log("\n✅ No duplicate IDs found in activityTypes.ts.");
}