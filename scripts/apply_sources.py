#!/usr/bin/env python3
"""Apply collected review sources to all brand JSON files.

For each shoe slug, sets sources field with non-null URLs only.
Replaces any existing sources data.
"""
import json
import glob

# All collected sources from research agents
# Key: brand -> slug -> {site: url_or_null}
SOURCES = {
    "adidas": {
        "supernova-rise-3": {
            "runrepeat": None,
            "rtings": None,
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2025/12/adidas-supernova-rise-3-review.html",
            "bitr": None,
        },
        "supernova-prima-2": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/supernova-prima-2",
            "dor": None,
            "rtr": None,
            "bitr": None,
        },
        "supernova-solution-2": {
            "runrepeat": "https://runrepeat.com/adidas-supernova-solution-2",
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2025/03/adidas-supernova-solution-2-2025.html",
            "rtr": None,
            "bitr": None,
        },
        "adizero-sl-2": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-sl2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-sl2",
            "dor": "https://www.doctorsofrunning.com/2024/07/adidas-adizero-sl-2-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/06/adidas-adizero-sl2-video-review-light.html",
            "bitr": "https://believeintherun.com/shoe-reviews/adidas-adizero-sl-2-review/",
        },
        "adizero-adios-9": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-adios-9",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-adios-9",
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2025/04/adidas-adizero-adios-9-review-6.html",
            "bitr": None,
        },
        "adizero-evo-sl": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-evo-sl",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-evo-sl",
            "dor": "https://www.doctorsofrunning.com/2025/01/adidas-adizero-evo-sl-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/12/review-adidas-adizero-evo-sl-lot-of.html",
            "bitr": "https://believeintherun.com/shoe-reviews/adidas-adizero-evo-sl-review/",
        },
        "adizero-boston-13": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-boston-13",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-boston-13",
            "dor": "https://www.doctorsofrunning.com/2026/02/adidas-adizero-boston-13-quick.html",
            "rtr": "https://www.roadtrailrun.com/2025/04/adidas-adizero-boston-13-review-7.html",
            "bitr": "https://believeintherun.com/shoe-reviews/adidas-adizero-boston-13-review/",
        },
        "adizero-takumi-sen-11": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-takumi-sen-11",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-takumi-sen-11",
            "dor": "https://www.doctorsofrunning.com/2025/08/adidas-adizero-takumi-sen-11-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/08/adidas-adizero-takumi-sen-11-review-5.html",
            "bitr": None,
        },
        "adizero-prime-x3-strung": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-prime-x-3-strung",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-prime-x3-strung",
            "dor": "https://www.doctorsofrunning.com/2025/07/adidas-adizero-prime-x3-strung-review.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/adidas-adizero-prime-x3-initial-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/adidas-prime-x3-strung-review/",
        },
        "adizero-adios-pro-4": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-adios-pro-4",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-adios-pro-4",
            "dor": "https://www.doctorsofrunning.com/2024/10/adidas-adizero-adios-pro-4-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/10/adidas-adizero-adios-pro-4-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/adidas-adizero-adios-pro-4-review/",
        },
        "adizero-pro-evo-2": {
            "runrepeat": "https://runrepeat.com/adidas-adizero-adios-pro-evo-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/adidas/adizero-adios-pro-evo-2",
            "dor": "https://www.doctorsofrunning.com/2025/05/adidas-adizero-adios-pro-evo-2-review.html",
            "rtr": "https://www.roadtrailrun.com/2025/04/adidas-adizero-adios-pro-evo-2-details.html",
            "bitr": None,
        },
    },
    "asics": {
        "gel-nimbus-28": {
            "runrepeat": "https://runrepeat.com/asics-gel-nimbus-28",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/gel-nimbus-28",
            "dor": "https://www.doctorsofrunning.com/2025/12/asics-gel-nimbus-28-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2026/01/ryans-asics-gel-nimbus-28-review-6.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-nimbus-28-review/",
        },
        "glideride-max-2": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/glideride-max-2-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/12/asics-glideride-max-2-review-2025.html",
            "rtr": None,
            "bitr": None,
        },
        "gel-kayano-32": {
            "runrepeat": "https://runrepeat.com/asics-gel-kayano-32",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/gel-kayano-32",
            "dor": "https://www.doctorsofrunning.com/2025/05/asics-gel-kayano-32-review-2025-8mm-drop.html",
            "rtr": None,
            "bitr": "https://believeintherun.com/shoe-reviews/asics-gel-kayano-32-review/",
        },
        "novablast-5": {
            "runrepeat": "https://runrepeat.com/asics-novablast-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/novablast-5",
            "dor": "https://www.doctorsofrunning.com/2024/11/asics-novablast-5-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/11/asics-novablast-5-iniital-review-fun.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-novablast-5-review/",
        },
        "superblast-2": {
            "runrepeat": "https://runrepeat.com/asics-superblast-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/superblast-2-paris",
            "dor": "https://www.doctorsofrunning.com/2024/06/asics-superblast-2-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/07/article-by-michael-ellenberger-asics.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-superblast-2-review/",
        },
        "megablast": {
            "runrepeat": "https://runrepeat.com/asics-megablast",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/megablast",
            "dor": "https://www.doctorsofrunning.com/2025/08/asics-megablast-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/09/asics-megablast-review-5-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-megablast-review/",
        },
        "sonicblast": {
            "runrepeat": "https://runrepeat.com/asics-sonicblast",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/sonicblast",
            "dor": "https://www.doctorsofrunning.com/2025/08/asics-sonicblast-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/08/asics-sonicblast-review-4-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-sonicblast-review/",
        },
        "magic-speed-5": {
            "runrepeat": "https://runrepeat.com/asics-magic-speed-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/magic-speed-5-carbon-fiber",
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2026/02/asics-magic-speed-5-review-magic-and.html",
            "bitr": None,
        },
        "metaspeed-ray": {
            "runrepeat": "https://runrepeat.com/asics-metaspeed-ray",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/metaspeed-ray",
            "dor": "https://www.doctorsofrunning.com/2025/12/asics-metaspeed-ray-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/11/asics-metaspeed-ray-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-metaspeed-ray-review/",
        },
        "yogiri-s4-plus": {
            "runrepeat": "https://runrepeat.com/asics-s-4-yogiri",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/s4-plus-yogiri",
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2025/04/asics-s4-yogiri-review.html",
            "bitr": None,
        },
        "metaspeed-sky-tokyo": {
            "runrepeat": "https://runrepeat.com/asics-metaspeed-sky-tokyo",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/metaspeed-sky-tokyo",
            "dor": "https://www.doctorsofrunning.com/2025/06/asics-metaspeed-sky-tokyo-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/asics-metaspeed-sky-tokyo-review-3.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-metaspeed-sky-tokyo-review/",
        },
        "metaspeed-edge-tokyo": {
            "runrepeat": "https://runrepeat.com/asics-metaspeed-edge-tokyo",
            "rtings": "https://www.rtings.com/running-shoes/reviews/asics/metaspeed-edge-tokyo",
            "dor": "https://www.doctorsofrunning.com/2025/05/asics-metaspeed-edge-tokyo-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/asics-metaspeed-edge-tokyo-review-2.html",
            "bitr": "https://believeintherun.com/shoe-reviews/asics-metaspeed-edge-tokyo-review/",
        },
    },
    "brooks": {
        "ghost-17": {
            "runrepeat": "https://runrepeat.com/brooks-ghost-17",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/ghost-17",
            "dor": "https://www.doctorsofrunning.com/2025/06/brooks-ghost-17-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/brooks-ghost-17-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-ghost-17-review/",
        },
        "hyperion-3": {
            "runrepeat": "https://runrepeat.com/brooks-hyperion-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/hyperion-3",
            "dor": "https://www.doctorsofrunning.com/2025/10/brooks-hyperion-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/08/brooks-hyperion-3-mulit-tester-review-6.html",
            "bitr": None,
        },
        "ghost-max-3": {
            "runrepeat": "https://runrepeat.com/brooks-ghost-max-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/ghost-max-3",
            "dor": "https://www.doctorsofrunning.com/2025/05/brooks-ghost-max-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/11/brooks-ghost-max-3-multi-tester-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-ghost-max-3-review/",
        },
        "glycerin-22": {
            "runrepeat": "https://runrepeat.com/brooks-glycerin-22",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/glycerin-22",
            "dor": "https://www.doctorsofrunning.com/2025/05/brooks-glycerin-22-review-2025.html",
            "rtr": None,
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-glycerin-22-review/",
        },
        "glycerin-23": {
            "runrepeat": None,
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2026/02/brooks-glycerin-23-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2026/01/brooks-glycerin-23-review-5-comparisons.html",
            "bitr": None,
        },
        "glycerin-max-2": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/glycerin-max-2-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/12/brooks-glycerin-max-2-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/11/brooks-glycerin-max-2-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-glycerin-max-2-review/",
        },
        "adrenaline-gts-25": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/adrenaline-gts-25",
            "dor": "https://www.doctorsofrunning.com/2025/09/brooks-adrenaline-gts-25-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/08/brooks-adrenaline-gts-25-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-adrenaline-gts-25-review/",
        },
        "hyperion-max-3": {
            "runrepeat": "https://runrepeat.com/brooks-hyperion-max-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/hyperion-max-3-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/05/brooks-hyperion-max-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/brooks-hyperion-max-3-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-hyperion-max-3-review/",
        },
        "hyperion-elite-5": {
            "runrepeat": "https://runrepeat.com/brooks-hyperion-elite-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/brooks/hyperion-elite-5",
            "dor": "https://www.doctorsofrunning.com/2025/08/brooks-hyperion-elite-5-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/brooks-hyperion-elite-5-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/brooks-hyperion-elite-5-review/",
        },
    },
    "hoka": {
        "clifton-10": {
            "runrepeat": "https://runrepeat.com/hoka-clifton-10",
            "rtings": "https://www.rtings.com/running-shoes/reviews/hoka/clifton-10",
            "dor": "https://www.doctorsofrunning.com/2025/01/hoka-clifton-10-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/01/hoka-clifton-10-multi-tester-review-big.html",
            "bitr": "https://believeintherun.com/shoe-reviews/hoka-clifton-10-review/",
        },
        "bondi-9": {
            "runrepeat": "https://runrepeat.com/hoka-bondi-9",
            "rtings": "https://www.rtings.com/running-shoes/reviews/hoka/bondi-9",
            "dor": "https://www.doctorsofrunning.com/2025/01/hoka-bondi-9-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/01/hoka-bondi-9-og-of-max-cushion-roars.html",
            "bitr": "https://believeintherun.com/shoe-reviews/hoka-bondi-9-review/",
        },
        "arahi-8": {
            "runrepeat": "https://runrepeat.com/hoka-arahi-8",
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2025/08/hoka-arahi-8-review-2025.html",
            "rtr": None,
            "bitr": None,
        },
        "mach-x-3": {
            "runrepeat": "https://runrepeat.com/hoka-mach-x-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/hoka/mach-x-3",
            "dor": "https://www.doctorsofrunning.com/2025/09/hoka-mach-x-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/09/hoka-mach-x-3-multi-tester-review-3.html",
            "bitr": "https://believeintherun.com/shoe-reviews/hoka-mach-x-3-review/",
        },
        "cielo-x1-3-0": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/hoka/cielo-x1-3-0-carbon-fiber",
            "dor": "https://www.doctorsofrunning.com/2026/01/hoka-cielo-x1-30-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2026/01/hoka-cielo-x-1-30-review-all-good.html",
            "bitr": None,
        },
        "rocket-x-3": {
            "runrepeat": "https://runrepeat.com/hoka-rocket-x-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/hoka/rocket-x-3",
            "dor": "https://www.doctorsofrunning.com/2025/07/hoka-rocket-x-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/hoka-rocket-x-3-multi-tester-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/hoka-rocket-x-3-review/",
        },
    },
    "mizuno": {
        "wave-rider-29": {
            "runrepeat": "https://runrepeat.com/mizuno-wave-rider-29",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/wave-rider-29",
            "dor": "https://www.doctorsofrunning.com/2025/08/mizuno-wave-rider-29-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/mizuno-wave-rider-29-review-true-to-its.html",
            "bitr": "https://believeintherun.com/shoe-reviews/mizuno-wave-rider-29-review/",
        },
        "wave-sky-9": {
            "runrepeat": "https://runrepeat.com/mizuno-wave-sky-9",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/wave-sky-9",
            "dor": "https://www.doctorsofrunning.com/2025/12/mizuno-wave-sky-9-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/mizuno-wave-sky-9-review-6-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/mizuno-wave-sky-9-review/",
        },
        "neo-vista-2": {
            "runrepeat": "https://runrepeat.com/mizuno-neo-vista-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/neo-vista-2",
            "dor": "https://www.doctorsofrunning.com/2025/06/mizuno-neo-vista-2-review-2025-45mm.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/mizuno-neo-vista-2-multi-tester-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/mizuno-neo-vista-2-review/",
        },
        "neo-zen": {
            "runrepeat": "https://runrepeat.com/mizuno-neo-zen",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/neo-zen",
            "dor": "https://www.doctorsofrunning.com/2025/01/mizuno-neo-zen-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/01/mizuno-neo-zen-multi-tester-review-art.html",
            "bitr": "https://believeintherun.com/shoe-reviews/mizuno-neo-zen-review/",
        },
        "wave-rebellion-flash-3": {
            "runrepeat": "https://runrepeat.com/mizuno-wave-rebellion-flash-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/wave-rebellion-flash-3-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/09/mizuno-wave-rebellion-flash-3-review.html",
            "rtr": "https://www.roadtrailrun.com/2025/09/mizuno-wave-rebellion-flash-3-review-3.html",
            "bitr": "https://believeintherun.com/shoe-reviews/mizuno-wave-rebellion-flash-3-review/",
        },
        "hyperwarp-pure": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/hyperwarp-pure-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/12/mizuno-hyperwarp-pure-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2025/12/mizuno-hyperwrap-pure-multi-tester.html",
            "bitr": None,
        },
        "hyperwarp-elite": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/hyperwarp-elite",
            "dor": "https://www.doctorsofrunning.com/2025/12/mizuno-hyperwarp-elite-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2025/12/mizuno-hyperwarp-elite-review-5.html",
            "bitr": None,
        },
        "hyperwarp-pro": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/hyperwarp-pro",
            "dor": "https://www.doctorsofrunning.com/2025/12/mizuno-hyperwarp-pro-review-2026.html",
            "rtr": None,
            "bitr": None,
        },
        "wave-rebellion-pro-3": {
            "runrepeat": "https://runrepeat.com/mizuno-wave-rebellion-pro-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/mizuno/wave-rebellion-pro-3",
            "dor": "https://www.doctorsofrunning.com/2025/01/mizuno-wave-rebellion-pro-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/01/mizuno-wave-rebellion-pro-3-review-8.html",
            "bitr": None,
        },
    },
    "new-balance": {
        "fresh-foam-x-880v15": {
            "runrepeat": "https://runrepeat.com/new-balance-fresh-foam-x-880-v-15",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fresh-foam-x-880v15",
            "dor": "https://www.doctorsofrunning.com/2025/01/new-balance-fresh-foam-x-880-v15-review.html",
            "rtr": "https://www.roadtrailrun.com/2025/01/new-balance-fresh-foam-x-880-v15-multi.html",
            "bitr": "https://believeintherun.com/shoe-reviews/new-balance-fresh-foam-880v15-review/",
        },
        "fresh-foam-x-1080v15": {
            "runrepeat": "https://runrepeat.com/new-balance-1080-v-15",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fresh-foam-x-1080v15",
            "dor": "https://www.doctorsofrunning.com/2025/11/new-balance-1080-v15-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2025/11/new-balance-1080-v15-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/new-balance-1080-v15-review/",
        },
        "fresh-foam-x-more-v6": {
            "runrepeat": "https://runrepeat.com/new-balance-fresh-foam-x-more-v-6",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fresh-foam-x-more-v6",
            "dor": None,
            "rtr": None,
            "bitr": "https://believeintherun.com/shoe-reviews/new-balance-fresh-foam-more-v6-review/",
        },
        "fuelcell-rebel-v5": {
            "runrepeat": "https://runrepeat.com/new-balance-fuel-cell-rebel-v-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fuelcell-rebel-v5",
            "dor": "https://www.doctorsofrunning.com/2025/05/new-balance-fuelcell-rebel-v5-review.html",
            "rtr": "https://www.roadtrailrun.com/2025/05/new-balance-fuelcell-rebel-v5-multi.html",
            "bitr": "https://believeintherun.com/shoe-reviews/new-balance-rebel-v5-review/",
        },
        "fuelcell-propel-v5": {
            "runrepeat": "https://runrepeat.com/new-balance-fuelcell-propel-v5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fuelcell-propel-v5-running-shoe",
            "dor": None,
            "rtr": None,
            "bitr": None,
        },
        # slug in JSON is fuelcell-sc-elite-v5
        "fuelcell-sc-elite-v5": {
            "runrepeat": "https://runrepeat.com/new-balance-fuel-cell-super-comp-elite-v-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/new-balance/fuelcell-supercomp-elite-v5-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/06/new-balance-fuelcell-supercomp-elite-v5.html",
            "rtr": "https://www.roadtrailrun.com/2025/06/new-balance-fuelcell-sc-elite-v5-multi.html",
            "bitr": "https://believeintherun.com/shoe-reviews/new-balance-sc-elite-v5-review/",
        },
    },
    "nike": {
        "pegasus-41": {
            "runrepeat": "https://runrepeat.com/nike-pegasus-41",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/pegasus-41",
            "dor": "https://www.doctorsofrunning.com/2024/06/nike-pegasus-41-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/06/nike-pegasus-41-review-6-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-pegasus-41-review/",
        },
        "vomero-18": {
            "runrepeat": "https://runrepeat.com/nike-vomero-18",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/vomero-18",
            "dor": "https://www.doctorsofrunning.com/2025/04/nike-vomero-18-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/02/nike-vomero-18-multi-tester-review-with.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-vomero-18-review/",
        },
        "vomero-plus": {
            "runrepeat": "https://runrepeat.com/nike-vomero-plus",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/vomero-plus",
            "dor": "https://www.doctorsofrunning.com/2025/08/nike-vomero-plus-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/nike-vomero-plus-initial-review-big-fun.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-vomero-plus-review/",
        },
        "vomero-premium": {
            "runrepeat": "https://runrepeat.com/nike-vomero-premium",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/vomero-premium-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/11/nike-vomero-premium-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/09/nike-vomero-premium-review-bold-radical.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-vomero-premium-review/",
        },
        "structure-26": {
            "runrepeat": "https://runrepeat.com/nike-structure-26",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/structure-26-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/07/nike-structure-26-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/nike-structure-26-multi-tester-review.html",
            "bitr": None,
        },
        "structure-plus": {
            "runrepeat": None,
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2026/01/nike-structure-plus-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2025/12/nike-structure-plus-review-gentle.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-structure-plus-review/",
        },
        "rival-fly-4": {
            "runrepeat": None,
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2024/12/nike-rival-fly-4-review-2024-100-racing.html",
            "rtr": None,
            "bitr": None,
        },
        "pegasus-plus": {
            "runrepeat": "https://runrepeat.com/nike-pegasus-plus",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/pegasus-plus",
            "dor": "https://www.doctorsofrunning.com/2024/09/nike-pegasus-plus-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/08/nike-pegasus-plus-100-miles-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-pegasus-plus-review/",
        },
        "zoom-fly-6": {
            "runrepeat": "https://runrepeat.com/nike-zoom-fly-6",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/zoom-fly-6",
            "dor": "https://www.doctorsofrunning.com/2025/01/nike-zoom-fly-6-review-2024-release.html",
            "rtr": "https://www.roadtrailrun.com/2024/11/nike-zoomfly-6-multi-tester-review-5.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-zoom-fly-6-review/",
        },
        "streakfly-2": {
            "runrepeat": "https://runrepeat.com/nike-streakfly-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/streakfly-2",
            "dor": "https://www.doctorsofrunning.com/2025/06/nike-streakfly-2-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/nike-streakfly-2-multi-tester-review-7.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-streakfly-2-review/",
        },
        "vaporfly-4": {
            "runrepeat": "https://runrepeat.com/nike-vaporfly-4",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/vaporfly-4",
            "dor": "https://www.doctorsofrunning.com/2025/04/nike-vaporfly-4-review-2025-midfoot-and.html",
            "rtr": "https://www.roadtrailrun.com/2025/04/nike-vaporfly-4-multi-tester-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-vaporfly-4-review/",
        },
        "alphafly-3": {
            "runrepeat": "https://runrepeat.com/nike-alphafly-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/nike/alphafly-3",
            "dor": "https://www.doctorsofrunning.com/2024/01/nike-alphafly-3-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2023/12/nike-alphfly-3-review-6-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/nike-alphafly-3-review/",
        },
    },
    "puma": {
        "velocity-nitro-4": {
            "runrepeat": "https://runrepeat.com/puma-velocity-nitro-4",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/velocity-nitro-4-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/11/puma-velocity-nitro-4-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/puma-velocity-nitro-4-review-5.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-velocity-nitro-4-review/",
        },
        "magmax-nitro-2": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/magmax-nitro-2-shoe",
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2025/11/puma-magmax-nitro-2-review-4-comparisons.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-magmax-nitro-2-review/",
        },
        "magnify-nitro-3": {
            "runrepeat": "https://runrepeat.com/puma-magnify-nitro-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/magnify-nitro-3",
            "dor": "https://www.doctorsofrunning.com/2025/09/puma-magnify-nitro-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/07/puma-magnify-nitro-3-review-2.html",
            "bitr": None,
        },
        "foreverrun-nitro-2": {
            "runrepeat": "https://runrepeat.com/puma-foreverrun-nitro-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/foreverrun-nitro-2-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/02/puma-foreverrun-nitro-2-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/02/puma-forever-run-nitro-2-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-foreverrun-nitro-2-review/",
        },
        "deviate-nitro-3": {
            "runrepeat": "https://runrepeat.com/puma-deviate-nitro-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/deviate-nitro-3-fade",
            "dor": "https://www.doctorsofrunning.com/2024/06/puma-deviate-nitro-3-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/06/puma-deviate-nitro-3-review-4.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-deviate-nitro-3-review/",
        },
        "deviate-nitro-4": {
            "runrepeat": None,
            "rtings": None,
            "dor": "https://www.doctorsofrunning.com/2026/01/puma-deviate-nitro-4-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2026/01/puma-running-deviate-4-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-deviate-nitro-4-review/",
        },
        "deviate-nitro-elite-3": {
            "runrepeat": "https://runrepeat.com/puma-deviate-nitro-elite-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/deviate-nitro-elite-3",
            "dor": "https://www.doctorsofrunning.com/2024/10/puma-deviate-nitro-elite-3-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/08/puma-deviate-nitro-elite-3-review-up-in.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-deviate-nitro-elite-3-review/",
        },
        "deviate-nitro-elite-4": {
            "runrepeat": None,
            "rtings": None,
            "dor": None,
            "rtr": "https://www.roadtrailrun.com/2026/01/puma-deviate-elite-4-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-deviate-nitro-elite-4-review/",
        },
        "fast-r-nitro-elite-3": {
            "runrepeat": "https://runrepeat.com/puma-fast-r-nitro-elite-3",
            "rtings": "https://www.rtings.com/running-shoes/reviews/puma/fast-r-nitro-elite-3",
            "dor": "https://www.doctorsofrunning.com/2025/06/puma-fast-r-nitro-elite-3-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/04/puma-fast-r-nitro-elite-3-review-bold.html",
            "bitr": "https://believeintherun.com/shoe-reviews/puma-fast-r-nitro-elite-3-review/",
        },
    },
    "saucony": {
        "ride-18": {
            "runrepeat": "https://runrepeat.com/saucony-ride-18",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/ride-18",
            "dor": "https://www.doctorsofrunning.com/2024/12/saucony-ride-18-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2024/12/saucony-ride-18-multi-tester-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-ride-18-review/",
        },
        "kinvara-16": {
            "runrepeat": "https://runrepeat.com/saucony-kinvara-16",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/kinvara-16",
            "dor": None,
            "rtr": None,
            "bitr": None,
        },
        "triumph-23": {
            "runrepeat": "https://runrepeat.com/saucony-triumph-23",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/triumph-23-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/06/saucony-triumph-23-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/05/saucony-triumph-23-review-soft-and-fun.html",
            "bitr": None,
        },
        "guide-18": {
            "runrepeat": "https://runrepeat.com/saucony-guide-18",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/guide-18-shoe",
            "dor": "https://www.doctorsofrunning.com/2024/12/saucony-guide-18-review-2025.html",
            "rtr": None,
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-guide-18-review/",
        },
        "hurricane-25": {
            "runrepeat": "https://runrepeat.com/saucony-hurricane-25",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/hurricane-25-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2025/06/saucony-hurricane-25-review-2025.html",
            "rtr": None,
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-hurricane-25-review/",
        },
        "tempus-2": {
            "runrepeat": "https://runrepeat.com/saucony-tempus-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/tempus-2",
            "dor": "https://www.doctorsofrunning.com/2024/10/saucony-tempus-2-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/11/saucony-tempus-2-review.html",
            "bitr": None,
        },
        "endorphin-trainer": {
            "runrepeat": "https://runrepeat.com/saucony-endorphin-trainer",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-trainer-carbon-fiber",
            "dor": "https://www.doctorsofrunning.com/2024/12/saucony-endorphin-trainer-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2024/12/saucony-endorphin-trainer-review-with8.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-trainer-review/",
        },
        "endorphin-azura": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-azura-running-shoe",
            "dor": "https://www.doctorsofrunning.com/2026/01/saucony-endorphin-azura-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2025/11/saucony-azura-multi-tester-review-light.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-azura-review/",
        },
        "endorphin-speed-5": {
            "runrepeat": "https://runrepeat.com/saucony-endorphin-speed-5",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-speed-5",
            "dor": "https://www.doctorsofrunning.com/2025/05/saucony-endorphin-speed-5-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2025/05/saucony-endorphin-speed-5-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-speed-5-review/",
        },
        "endorphin-elite-2": {
            "runrepeat": "https://runrepeat.com/saucony-endorphin-elite-2",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-elite-2",
            "dor": "https://www.doctorsofrunning.com/2024/12/saucony-endorphin-elite-2-review-2025.html",
            "rtr": "https://www.roadtrailrun.com/2024/12/saucony-endorphin-elite-2-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-elite-2-review/",
        },
        "endorphin-pro-4": {
            "runrepeat": "https://runrepeat.com/saucony-endorphin-pro-4",
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-pro-4",
            "dor": "https://www.doctorsofrunning.com/2024/04/saucony-endorphin-pro-4-review-2024.html",
            "rtr": "https://www.roadtrailrun.com/2024/02/saucony-endorphin-pro-4-multi-tester.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-pro-4-review/",
        },
        "endorphin-pro-5": {
            "runrepeat": None,
            "rtings": "https://www.rtings.com/running-shoes/reviews/saucony/endorphin-pro-5-pink",
            "dor": "https://www.doctorsofrunning.com/2026/01/saucony-endorphin-pro-5-review-2026.html",
            "rtr": "https://www.roadtrailrun.com/2026/01/saucony-endorphin-pro-5-review.html",
            "bitr": "https://believeintherun.com/shoe-reviews/saucony-endorphin-pro-5-review/",
        },
    },
}


def make_sources(url_map):
    """Return sources dict with only non-null values, or None if all null."""
    filtered = {k: v for k, v in url_map.items() if v is not None}
    return filtered if filtered else None


total_updated = 0
total_skipped = 0

for path in sorted(glob.glob("data/brands/*.json")):
    brand_id = path.split("/")[-1].replace(".json", "")
    brand_sources = SOURCES.get(brand_id, {})

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    changed = 0
    for shoe in data["shoes"]:
        slug = shoe["slug"]
        if slug in brand_sources:
            sources = make_sources(brand_sources[slug])
            if sources:
                shoe["sources"] = sources
            else:
                # No reviews found — remove sources if previously set
                shoe.pop("sources", None)
            changed += 1
        else:
            total_skipped += 1
            print(f"  WARNING: {brand_id}/{slug} not in SOURCES dict")

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    total_updated += changed
    print(f"{path}: {changed}개 신발 업데이트")

print(f"\n총 {total_updated}개 신발 sources 업데이트, {total_skipped}개 건너뜀")
