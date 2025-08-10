#!/usr/bin/env python3
"""
Cleanup script for temporary JSON files.
Removes all tmp*.json files from the project root.
"""
import os
import glob

def cleanup_tmp_json():
    """Remove all temporary JSON files from the current directory."""
    tmp_files = glob.glob("tmp*.json")
    if tmp_files:
        for file in tmp_files:
            try:
                os.remove(file)
                print(f"Removed: {file}")
            except OSError as e:
                print(f"Error removing {file}: {e}")
        print(f"Cleaned up {len(tmp_files)} temporary JSON files")
    else:
        print("No temporary JSON files found")

if __name__ == "__main__":
    cleanup_tmp_json()