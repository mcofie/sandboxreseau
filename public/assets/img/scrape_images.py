import urllib.request
import urllib.parse
import re
import json

founders = [
    "Isidore Kpotufe Rivia Clinics",
    "Francis Val-Neboh MegaQuest",
    "Bright Kportiklah BitSpenda",
    "Desmond Ofori Appiah STACX",
    "Peter Tokor Phundit",
    "Augusta Addy BoostMate",
    "Charles Yeboah Frimpong BMPT Books",
    "Kingsley Adu-wiredu BMPT Books"
]

results = {}

for query in founders:
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        html = urllib.request.urlopen(req).read().decode('utf-8')
        # Find first image source or something in the results
        # DuckDuckGo HTML doesn't reliably have images in regular search, let's use Wikipedia or direct known articles if possible.
        # Wait, DuckDuckGo image search endpoint:
        pass
    except Exception as e:
        pass

