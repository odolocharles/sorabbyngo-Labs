"""Kenya-specific constants: counties, facility levels, NHIF packages."""

COUNTIES = {
    1: "Mombasa", 2: "Kwale", 3: "Kilifi", 4: "Tana River", 5: "Lamu",
    6: "Taita-Taveta", 7: "Garissa", 8: "Wajir", 9: "Mandera", 10: "Marsabit",
    11: "Isiolo", 12: "Meru", 13: "Tharaka-Nithi", 14: "Embu", 15: "Kitui",
    16: "Machakos", 17: "Makueni", 18: "Nyandarua", 19: "Nyeri", 20: "Kirinyaga",
    21: "Murang'a", 22: "Kiambu", 23: "Turkana", 24: "West Pokot", 25: "Samburu",
    26: "Trans Nzoia", 27: "Uasin Gishu", 28: "Elgeyo-Marakwet", 29: "Nandi",
    30: "Baringo", 31: "Laikipia", 32: "Nakuru", 33: "Narok", 34: "Kajiado",
    35: "Kericho", 36: "Bomet", 37: "Kakamega", 38: "Vihiga", 39: "Bungoma",
    40: "Busia", 41: "Siaya", 42: "Kisumu", 43: "Homa Bay", 44: "Migori",
    45: "Kisii", 46: "Nyamira", 47: "Nairobi",
}

FACILITY_LEVELS = {
    "L1": "Community Health Unit",
    "L2": "Dispensary",
    "L3": "Health Centre",
    "L4": "Sub-County Hospital",
    "L5": "County Referral Hospital",
    "L6": "National Referral Hospital",
}

NHIF_PACKAGES = {
    "NHIF-001": {"name": "Outpatient", "limit_kes": 5000, "renewable": "monthly"},
    "NHIF-002": {"name": "Inpatient General", "limit_kes": 150000, "renewable": "annual"},
    "NHIF-003": {"name": "Maternity", "limit_kes": 15000, "renewable": "per_delivery"},
    "NHIF-004": {"name": "Surgery", "limit_kes": 200000, "renewable": "annual"},
    "NHIF-005": {"name": "Renal Dialysis", "limit_kes": 500000, "renewable": "annual"},
    "NHIF-006": {"name": "Cancer Treatment", "limit_kes": 300000, "renewable": "annual"},
    "NHIF-007": {"name": "Mental Health", "limit_kes": 80000, "renewable": "annual"},
}

MALARIA_SEASON = {
    "high": [3, 4, 5, 10, 11],   # March-May, Oct-Nov
    "low":  [1, 2, 6, 7, 8, 9, 12],
}

KEMSA_CATEGORIES = ["essential", "emergency", "chronic", "maternal", "pediatric"]
