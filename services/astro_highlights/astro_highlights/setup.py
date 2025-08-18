from setuptools import setup, find_packages

setup(
    name="astro_highlights",
    version="0.1.0",
    description="Astronomy highlights generator for WotNow",
    packages=find_packages(),
    install_requires=[
        "skyfield>=1.49",
        "python-dateutil>=2.9.0",
        "pytz>=2024.1",
        "pyyaml>=6.0",
    ],
    python_requires=">=3.9",
    entry_points={
        "console_scripts": [
            "astro-highlights=astro_highlights.build_highlights:main",
        ],
    },
)
