import React, { useState, useEffect } from "react";
import { activityTypes } from "../data/activityTypes";
import { useUserPreferences } from "../context/UserPreferencesContext";

// The full set of activity IDs for each grouping—synchronize these with activityTypes!
const mainCategories = [
	{
		key: "Active Sports",
		icon: "🏃‍♂️",
		subcategories: [
			{
				key: "Team Sports",
				icon: "🤾‍♂️",
				acts: [
					"football_soccer",
					"cricket",
					"rugby",
					"basketball_outdoor",
					"beach_volleyball",
					"american_football",
					"baseball",
					"hurling_camogie",
					"gaelic_football",
					"hockey",
					"netball",
					"ice_hockey_us",
				],
			},
			{
				key: "Individual Sports",
				icon: "🎾",
				acts: [
					"golf",
					"tennis",
					"tennis_indoor",
					"squash",
					"badminton",
					"table_tennis",
					"archery",
					"pickleball",
					"padel",
				],
			},
			{
				key: "Water Sports",
				icon: "🛶",
				acts: [
					"kayaking",
					"canoeing",
					"surfing",
					"stand_up_paddleboarding",
					"snorkeling",
					"swimming",
					"indoor_swimming",
					"sea_fishing_shore",
					"sea_fishing_boat",
					"windsurfing",
					"kitesurfing",
					"jet_skiing",
					"scuba_diving",
				],
			},
			{
				key: "Action Sports",
				icon: "🚵‍♂️",
				acts: [
					"mountain_biking",
					"road_cycling",
					"gravel_biking",
					"rock_climbing",
					"indoor_climbing",
					"skateboarding",
					"rollerblading",
				],
			},
			{
				key: "Cardio & Running",
				icon: "🏃",
				acts: ["running", "trail_running", "cycling", "urban_exploring"],
			},
			{
				key: "Strength & Gym",
				icon: "🏋️‍♂️",
				acts: ["gym_workout", "outdoor_gym"],
			},
		],
	},
	{
		key: "Fitness & Wellness",
		icon: "💪",
		subcategories: [
			{
				key: "Mindfulness",
				icon: "🧘‍♂️",
				acts: [
					"yoga",
					"outdoor_yoga",
					"meditation",
					"outdoor_meditation",
					"pilates",
					"martial_arts",
					"tai_chi",
				],
			},
		],
	},
	{
		key: "Outdoor Activities",
		icon: "🌲",
		subcategories: [
			{
				key: "Nature Activities",
				icon: "🌳",
				acts: [
					"hiking",
					"birdwatching",
					"photography",
					"foraging",
					"mushroom_hunting",
					"stargazing",
				],
			},
			{
				key: "Fishing",
				icon: "🎣",
				acts: [
					"fly_fishing_freshwater",
					"coarse_fishing",
					"sea_fishing_shore",
					"sea_fishing_boat",
					"ice_fishing",
				],
			},
			{
				key: "Recreation",
				icon: "🍔",
				acts: [
					"picnicking",
					"bbq",
					"beach",
					"geocaching",
					"camping",
					"outdoor_reading",
					"dog_walking",
					"outdoor_playground",
					"outdoor_chess",
					"outdoor_painting",
					"outdoor_music",
					"outdoor_gym",
					"outdoor_meditation",
					"outdoor_yoga",
				],
			},
		],
	},
	{
		key: "Winter Sports",
		icon: "❄️",
		subcategories: [
			{
				key: "Snow Sports",
				icon: "⛷️",
				acts: ["skiing", "snowboarding", "cross_country_skiing"],
			},
			{
				key: "Ice Sports",
				icon: "⛸️",
				acts: [
					"ice_skating",
					"curling",
					"ice_hockey",
					"ice_fishing",
					"ice_hockey_indoor",
				],
			},
		],
	},
	{
		key: "Creative & Arts",
		icon: "🎨",
		subcategories: [
			{
				key: "Visual Arts",
				icon: "🎨",
				acts: [
					"painting",
					"outdoor_painting",
					"crafts",
					"photography",
					"knitting",
					"diy",
				],
			},
			{
				key: "Music & Performance",
				icon: "🎷",
				acts: [
					"playing_records",
					"make_music",
					"dance",
					"outdoor_music",
				],
			},
			{
				key: "Literature & Learning",
				icon: "📚",
				acts: ["reading", "outdoor_reading"],
			},
		],
	},
	{
		key: "Indoor Recreation",
		icon: "🏠",
		subcategories: [
			{
				key: "Home Activities",
				icon: "🧶",
				acts: [
					"crafts",
					"knitting",
					"reading",
					"diy",
					"playing_records",
					"cooking",
					"painting",
				],
			},
			{
				key: "Social Activities",
				icon: "🍻",
				acts: [
					"going_to_pub",
					"table_tennis",
					"playing_cards",
					"watch_a_movie",
					"cafe",
					"cinema",
					"museum",
					"shopping",
				],
			},
			{
				key: "Indoor Sports",
				icon: "🏓",
				acts: [
					"indoor_climbing",
					"squash",
					"badminton",
					"tennis_indoor",
					"indoor_swimming",
					"gym_workout",
					"pilates",
					"yoga",
					"meditation",
					"dance",
				],
			},
		],
	},
];

// These are the activity IDs that should trigger a coastal spot dialog if chosen
const waterActivityIds = [
	"kayaking",
	"canoeing",
	"surfing",
	"stand_up_paddleboarding",
	"snorkeling",
	"swimming",
	"sea_fishing_shore",
	"sea_fishing_boat",
  "beach",
	"indoor_swimming",
];

// --------------- COASTAL LOCATION MODAL ---------------
const CoastalLocationDialog: React.FC<{
	open: boolean;
	onClose: () => void;
	onSave: (loc: { name: string; lat: number; lon: number }) => void;
}> = ({ open, onClose, onSave }) => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
	const [loading, setLoading] = useState(false);

	const doSearch = async () => {
		if (!query) return;
		setLoading(true);
		setResults([]);
		try {
			const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
			const resp = await fetch(
				`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
			);
			const data = await resp.json();
			setResults(
				Array.isArray(data)
					? data.map((r: any) => ({
							name: `${r.name}${r.state ? ", " + r.state : ""}${r.country ? ", " + r.country : ""}`,
							lat: r.lat,
							lon: r.lon,
					  }))
					: []
			);
		} catch (e) {
			setResults([]);
		}
		setLoading(false);
	};

	if (!open) return null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				backgroundColor: "rgba(0,0,0,0.36)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 9999,
			}}
		>
			<div
				style={{
					padding: 28,
					background: "#fff",
					borderRadius: 18,
					maxWidth: 460,
					width: "92vw",
					position: "relative",
				}}
			>
				<button
					onClick={onClose}
					style={{
						position: "absolute",
						right: 12,
						top: 8,
						fontSize: 22,
						background: "none",
						border: "none",
						color: "#888",
						cursor: "pointer",
					}}
				>
					&times;
				</button>
				<h3
					style={{
						margin: "0 0 13px 0",
						color: "#2563eb",
						fontWeight: 700,
					}}
				>
					Pick your beach or coastal spot
				</h3>
				<input
					type="text"
					value={query}
					autoFocus
					placeholder="Search for beach, town, or coast"
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && doSearch()}
					style={{
						width: "100%",
						padding: 10,
						fontSize: "1rem",
						border: "1.4px solid #bbb",
						borderRadius: 7,
						marginBottom: 13,
					}}
				/>
				<button
					style={{
						padding: "8px 18px",
						borderRadius: 7,
						fontWeight: 600,
						background: "#059669",
						color: "#fff",
						fontSize: "1rem",
						border: "none",
						width: "100%",
						marginBottom: 12,
					}}
					onClick={doSearch}
					disabled={loading || !query}
				>
					Search
				</button>
				{loading && <div>Searching…</div>}
				{!loading && results.length > 0 && (
					<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
						{results.map((r, i) => (
							<li
								key={i}
								style={{
									cursor: "pointer",
									padding: "10px 0",
									borderBottom:
										i !== results.length - 1 ? "1px solid #eef" : "none",
								}}
							>
								<button
									style={{
										width: "100%",
										background: "none",
										border: "none",
										color: "#174031",
										fontSize: "1.09rem",
										textAlign: "left",
										padding: 0,
									}}
									onClick={() => onSave(r)}
								>
									{r.name}
									<span
										style={{
											color: "#70b0ea",
											fontSize: "0.99rem",
											marginLeft: 6,
										}}
									>
										({r.lat.toFixed(3)}, {r.lon.toFixed(3)})
									</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};

// ------------- BREADCRUMB -------------
const Breadcrumb: React.FC<{ path: string[]; onBack: () => void }> = ({ path, onBack }) => (
	<div className="breadcrumb" style={{ marginBottom: 23 }}>
		{path.length > 1 && (
			<button className="back-button" onClick={onBack}>
				← Back
			</button>
		)}
		<span>{path.join(" / ")}</span>
	</div>
);

// ------------- MAIN PAGE COMPONENT -------------
const Interests: React.FC = () => {
	const { preferences, setPreferences } = useUserPreferences();
	const [mainCat, setMainCat] = useState<string | null>(null);
	const [subCat, setSubCat] = useState<string | null>(null);
	const [showCoastDialog, setShowCoastDialog] = useState(false);
	const [showToast, setShowToast] = useState(false);

	// Path for breadcrumb
	const path = [mainCat, subCat].filter(Boolean);

	// Use the up-to-date interests from preferences
	const interests: string[] = preferences.interests || [];

	// Dialog logic for coastal activities
	useEffect(() => {
		const wantsCoast = interests.some((id) => waterActivityIds.includes(id));
		const hasCoast = preferences.locations?.some((l) => l.type === "coastal");
		if (wantsCoast && !hasCoast) setShowCoastDialog(true);
	}, [interests, preferences.locations]);

	const handleCoastSave = (loc: { name: string; lat: number; lon: number }) => {
		setPreferences((prev) => ({
			...prev,
			locations: [...(prev.locations || []), { ...loc, type: "coastal" }],
		}));
		setShowCoastDialog(false);
	};

	const toggleInterest = (id: string) => {
		setPreferences((prev) => {
			const chosen = prev.interests ?? [];
			const newList = chosen.includes(id)
				? chosen.filter((i) => i !== id)
				: [...chosen, id];
			return { ...prev, interests: newList };
		});
	};

	const handleBack = () => {
		if (subCat) setSubCat(null);
		else if (mainCat) setMainCat(null);
	};

	// Render content according to step
	let content: React.ReactNode;
	if (!mainCat) {
		content = (
			<div className="main-categories-grid">
				{mainCategories.map((cat) => (
					<div
						key={cat.key}
						className="main-category-card"
						onClick={() => setMainCat(cat.key)}
					>
						<span className="category-icon">{cat.icon}</span>
						<span className="category-name">{cat.key}</span>
					</div>
				))}
			</div>
		);
	} else if (!subCat) {
		const mainObj = mainCategories.find((c) => c.key === mainCat)!;
		content = (
			<div className="subcategories-grid">
				{mainObj.subcategories.map((sub) => (
					<div
						key={sub.key}
						className="subcategory-card"
						onClick={() => setSubCat(sub.key)}
					>
						<span className="category-icon">{sub.icon}</span>
						<h3
							style={{
								display: "inline-block",
								marginRight: 12,
							}}
						>
							{sub.key}
						</h3>
						<span
							style={{
								color: "#6b7280",
								fontSize: 14,
							}}
						>
							{sub.acts.length} activities
						</span>
					</div>
				))}
			</div>
		);
	} else {
		const mainObj = mainCategories.find((c) => c.key === mainCat)!;
		const subObj = mainObj.subcategories.find((s) => s.key === subCat)!;
		const acts = subObj.acts
			.map((id) => activityTypes.find((a) => a.id === id))
			.filter(Boolean)
			.sort((a, b) => a!.name.localeCompare(b!.name));
		content = (
			<div className="interests-grid">
				{acts.map((act) => (
					<div
						key={act!.id}
						className={`interest-card${
							interests.includes(act!.id) ? " selected" : ""
						}`}
						onClick={() => toggleInterest(act!.id)}
					>
						{act!.name}
					</div>
				))}
			</div>
		);
	}

	const handleDone = () => {
		setShowToast(true);
		setTimeout(() => {
			setShowToast(false);
			window.location.href = "/";
		}, 2200);
	};

	return (
		<div
			className="interests-page"
			style={{
				maxWidth: 650,
				margin: "0 auto",
				padding: "32px 18px",
			}}
		>
			<h1
				className="page-title"
				style={{
					fontSize: 28,
					fontWeight: 700,
				}}
			>
				Choose Your Interests
			</h1>
			<Breadcrumb path={["Interests", ...path]} onBack={handleBack} />
			{content}

			{/* Selected activities */}
			{interests.length > 0 && (
				<section
					className="selected-activities-container"
					aria-label="Your Selected Activities"
					style={{ marginTop: 28, justifyContent: "center" }}
				>
					{interests
						.map((id) => activityTypes.find((a) => a.id === id))
						.filter(Boolean)
						.map((act) => (
							<button
								key={act!.id}
								onClick={() => toggleInterest(act!.id)}
								className="selected-activity-btn"
								aria-label={`Remove ${act!.name} from selected interests`}
							>
								{act!.name}
								<span>×</span>
							</button>
						))}
				</section>
			)}

			{/* Buttons below */}
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					gap: 24,
					marginTop: 42,
				}}
			>
				{(mainCat || subCat) && (
					<button
						onClick={() => {
							setMainCat(null);
							setSubCat(null);
						}}
						style={{
							padding: "12px 28px",
							borderRadius: 9,
							fontSize: "1.08rem",
							background: "#3b82f6",
							border: "none",
							color: "#fff",
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						➕ Add More Interests
					</button>
				)}
				<button
					onClick={handleDone}
					style={{
						padding: "12px 28px",
						borderRadius: 9,
						fontSize: "1.08rem",
						background: "#059669",
						border: "none",
						color: "#fff",
						fontWeight: 700,
						cursor: "pointer",
					}}
				>
					✅ I'm Done
				</button>
			</div>

			{showToast && (
				<div
					className="custom-toast show"
					aria-live="polite"
					aria-atomic="true"
					style={{
						position: "fixed",
						bottom: "2.5rem",
						left: "50%",
						transform: "translateX(-50%)",
						background: "#059669",
						color: "#fff",
						padding: "1.1rem 2.2rem",
						borderRadius: 15,
						fontSize: "1.14rem",
						zIndex: 1009,
						fontWeight: 600,
					}}
				>
					You've chosen a fine array of activities. It's good to be you!
				</div>
			)}
			<CoastalLocationDialog
				open={showCoastDialog}
				onClose={() => setShowCoastDialog(false)}
				onSave={handleCoastSave}
			/>
		</div>
	);
};

export default Interests;
