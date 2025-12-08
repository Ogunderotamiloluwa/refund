#!/bin/bash
# START_BACKEND.sh - Mac/Linux startup script
# For Windows, use: node backend.js in PowerShell

cd "$(dirname "$0")"
echo "Starting Tax Refund Portal Backend..."
echo "=====================================\n"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo "\n"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  WARNING: .env file not found!"
    echo "Please create .env file with:"
    echo "  EMAIL_USER=your-email@gmail.com"
    echo "  EMAIL_PASSWORD=your-app-password"
    echo "\nSee SETUP.md for details\n"
fi

# Start server
echo "Starting server on port 3001..."
node backend.js
