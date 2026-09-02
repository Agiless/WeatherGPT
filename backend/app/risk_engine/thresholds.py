"""
Configurable hazard scoring thresholds.
Values can be tuned without modifying logic.
"""

THRESHOLDS = {
    # 24-hour accumulated rainfall in millimeters
    "rainfall": {
        "low": 15.0,        # < 15mm
        "moderate": 64.5,   # 15 - 64.5mm (IMD moderate rain)
        "high": 115.5,      # 64.5 - 115.5mm (IMD heavy rain)
        "severe": 204.4,    # > 115.5mm (IMD very heavy / extremely heavy)
    },
    # Sustained wind speed in km/h
    "wind": {
        "low": 30.0,        # < 30 km/h (breeze)
        "moderate": 50.0,   # 30 - 50 km/h (strong breeze)
        "high": 75.0,       # 50 - 75 km/h (gale)
        "severe": 100.0,    # > 75 km/h (storm / cyclone)
    },
    # Maximum temperature in °C
    "temperature": {
        "low": 32.0,        # < 32°C
        "moderate": 38.0,   # 32 - 38°C
        "high": 42.0,       # 38 - 42°C (heatwave threshold)
        "severe": 46.0,     # > 42°C (severe heatwave)
    },
}
