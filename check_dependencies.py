#!/usr/bin/env python3

import importlib.util
import sys

# List of required packages
required_packages = [
    "flask",
    "google.generativeai",
    "pygame",
    "werkzeug"
]

missing_packages = []

print("Checking for required dependencies...")

for package in required_packages:
    package_name = package.split('.')[0]  # Get the base package name
    try:
        spec = importlib.util.find_spec(package_name)
        if spec is None:
            missing_packages.append(package_name)
        else:
            print(f"✓ {package_name} is installed")
    except ModuleNotFoundError:
        missing_packages.append(package_name)

if missing_packages:
    print("\nThe following packages are missing and need to be installed:")
    for package in missing_packages:
        print(f"  - {package}")
    
    print("\nYou can install them with the following command:")
    print(f"pip3 install {' '.join(missing_packages)}")
    sys.exit(1)
else:
    print("\nAll required dependencies are installed! You're ready to run the chatbot server.")
    print("Run the server with: bash run_chatbot.sh")
    sys.exit(0) 