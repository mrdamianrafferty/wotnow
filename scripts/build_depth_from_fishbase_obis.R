#!/usr/bin/env Rscript
# ------------------------------------------------------------
# build_depth_from_fishbase_obis.R (patched v2)
# Depth enrichment from FishBase + WoRMS + OBIS
# - Reads your target species list (tries species_targets.csv, then species_list.csv)
# - Resolves names via WoRMS
# - Pulls FishBase depth ranges (requests only needed columns; safe fallback)
# - Backfills gaps from OBIS (p25–p75 bathymetry/depth)
# - Writes CSV (+ Parquet if arrow available):
#     scientific_name, opt_min, opt_max, min_depth, max_depth, depth_source
# ------------------------------------------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(purrr)
  library(readr)
  library(stringr)
  library(tibble)
  library(rfishbase)
  library(worrms)
  library(robis)
})

# --- helpers -------------------------------------------------
read_targets <- function(){
  cand <- c(
    "~/Projects/WotNow/data/fishbase/species_targets.csv",
    "~/Projects/WotNow/species_list.csv"
  )
  for (p in cand){
    p2 <- path.expand(p)
    if (file.exists(p2)){
      message("📥 Reading target species list: ", p2)
      df <- suppressMessages(readr::read_csv(p2, show_col_types = FALSE))
      stopifnot("scientific_name" %in% names(df))
      return(df %>% mutate(scientific_name = str_trim(scientific_name)) %>% distinct(scientific_name))
    }
  }
  stop("Could not find a target list. Create one at data/fishbase/species_targets.csv or project root species_list.csv with a 'scientific_name' column.")
}

num <- function(x) suppressWarnings(as.numeric(x))

# --- 1) targets ---------------------------------------------
targets <- read_targets()

# --- 2) WoRMS name resolution -------------------------------
message("🐚 Resolving names via WoRMS...")
resolve_one <- function(name){
  tryCatch({
    rec <- worrms::wm_records_name(name)
    if (is.null(rec) || nrow(rec) == 0) return(tibble(input=name, valid_name=NA_character_))
    tibble(input=name, valid_name = rec$valid_name[1] %||% rec$scientificname[1])
  }, error = function(e) tibble(input=name, valid_name=NA_character_))
}
worms <- purrr::map_dfr(targets$scientific_name, resolve_one)
canon <- targets %>% left_join(worms, by=c("scientific_name"="input")) %>%
  mutate(canonical = coalesce(valid_name, scientific_name)) %>%
  distinct(canonical)

# --- 3) FishBase species table (fast + safe) ----------------
message("🐟 Fetching FishBase species table...")
want <- c(
  "SpecCode","Genus","Species",
  "DepthRangeShallow","DepthRangeDeep",
  "DepthRangeComShallow","DepthRangeComDeep"
)
# Try asking for just the fields we want; if that fails, pull full table and trim
fb_try <- try(rfishbase::species(fields = want), silent = TRUE)
if (inherits(fb_try, "try-error")) {
  fb_raw <- rfishbase::species()
  present <- intersect(names(fb_raw), want)
  fb <- fb_raw[, present, drop = FALSE]
  for (nm in setdiff(want, names(fb))) fb[[nm]] <- NA_real_
} else {
  fb <- fb_try
}
fb <- fb %>% mutate(scientific_name = paste(Genus, Species))

# Join and derive optimal band
fb_depth <- canon %>%
  left_join(fb, by = c("canonical" = "scientific_name")) %>%
  transmute(
    scientific_name = canonical,
    opt_min = case_when(
      !is.na(DepthRangeComShallow) & !is.na(DepthRangeComDeep) ~ num(DepthRangeComShallow),
      TRUE ~ NA_real_
    ),
    opt_max = case_when(
      !is.na(DepthRangeComShallow) & !is.na(DepthRangeComDeep) ~ num(DepthRangeComDeep),
      TRUE ~ NA_real_
    ),
    min_depth = num(DepthRangeShallow),
    max_depth = num(DepthRangeDeep)
  ) %>%
  mutate(
    # Fallback: if optimal missing but overall present, use inner 50%
    opt_min = ifelse(is.na(opt_min) & !is.na(min_depth) & !is.na(max_depth),
                     min_depth + 0.25*(max_depth - min_depth), opt_min),
    opt_max = ifelse(is.na(opt_max) & !is.na(min_depth) & !is.na(max_depth),
                     min_depth + 0.75*(max_depth - min_depth), opt_max)
  )

# --- 4) OBIS backfill for gaps ------------------------------
message("🌍 Querying OBIS for missing species (p25–p75 bathymetry/depth)...")
needs_obis <- fb_depth %>% filter(is.na(opt_min) | is.na(opt_max)) %>% pull(scientific_name)

fill_from_obis <- function(name){
  message("  → ", name)
  occ <- tryCatch(robis::occurrence(scientificname = name, fields = c("depth","bathymetry")),
                  error=function(e) NULL)
  if (is.null(occ) || nrow(occ) == 0) return(tibble(scientific_name=name, obis_p25=NA_real_, obis_p75=NA_real_))
  v <- if ("bathymetry" %in% names(occ)) occ$bathymetry else occ$depth
  v <- suppressWarnings(as.numeric(v))
  v <- v[is.finite(v)]
  if (length(v) < 10) return(tibble(scientific_name=name, obis_p25=NA_real_, obis_p75=NA_real_))
  qs <- stats::quantile(v, probs=c(0.25,0.75), na.rm=TRUE, names=FALSE)
  tibble(scientific_name=name, obis_p25=qs[1], obis_p75=qs[2])
}

obis_fill <- if (length(needs_obis)) purrr::map_dfr(needs_obis, fill_from_obis) else tibble(scientific_name=character(), obis_p25=double(), obis_p75=double())

# --- 5) Merge and finalise ---------------------------------
message("🧮 Merging FishBase + OBIS data...")
all_depth <- fb_depth %>%
  left_join(obis_fill, by="scientific_name") %>%
  mutate(
    opt_min_final = coalesce(opt_min, obis_p25),
    opt_max_final = coalesce(opt_max, obis_p75),
    source = case_when(
      !is.na(opt_min) & !is.na(opt_max) ~ "FishBase",
      !is.na(obis_p25) & !is.na(obis_p75) ~ "OBIS p25–p75",
      TRUE ~ NA_character_
    ),
    min_depth_final = coalesce(min_depth, opt_min_final),
    max_depth_final = coalesce(max_depth, opt_max_final)
  ) %>%
  filter(!is.na(opt_min_final) & !is.na(opt_max_final) & opt_max_final >= opt_min_final) %>%
  distinct(scientific_name, .keep_all = TRUE)

# --- 6) Write outputs --------------------------------------
out_csv <- "~/Projects/WotNow/data/fishbase/species_depth_enriched.csv"
dir.create(dirname(path.expand(out_csv)), showWarnings = FALSE, recursive = TRUE)
readr::write_csv(all_depth %>%
  transmute(
    scientific_name,
    opt_min = round(opt_min_final, 2),
    opt_max = round(opt_max_final, 2),
    min_depth = round(min_depth_final, 2),
    max_depth = round(max_depth_final, 2),
    depth_source = source
  ), out_csv)

# Also write Parquet if arrow is available
if (requireNamespace("arrow", quietly = TRUE)) {
  out_pq <- "~/Projects/WotNow/data/fishbase/species_depth_enriched.parquet"
  try(arrow::write_parquet(
    all_depth %>% transmute(
      scientific_name,
      opt_min = round(opt_min_final, 2),
      opt_max = round(opt_max_final, 2),
      min_depth = round(min_depth_final, 2),
      max_depth = round(max_depth_final, 2),
      depth_source = source
    ),
    path.expand(out_pq)
  ), silent = TRUE)
}

message("✅ Wrote ", out_csv, " with ", nrow(all_depth), " species rows.")
