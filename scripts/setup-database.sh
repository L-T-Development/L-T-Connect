#!/bin/bash

# Appwrite Database Schema Setup - Quick Start
# This script installs dependencies and runs the database setup

echo "🚀 Appwrite Database Setup - Quick Start"
echo "========================================"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your Appwrite credentials."
    exit 1
fi

echo "✅ .env.local file found"

# Check if node-appwrite is installed
echo ""
echo "📦 Checking dependencies..."

if ! npm list node-appwrite &> /dev/null; then
    echo "📥 Installing node-appwrite..."
    npm install --save-dev node-appwrite
else
    echo "✅ node-appwrite already installed"
fi

# Check if dotenv is installed
if ! npm list dotenv &> /dev/null; then
    echo "📥 Installing dotenv..."
    npm install --save-dev dotenv
else
    echo "✅ dotenv already installed"
fi

echo ""
echo "🔧 Running database schema setup..."
echo "========================================"
echo ""

# Run the setup script
node scripts/setup-database-schema.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Verify in Appwrite Console: https://cloud.appwrite.io"
    echo "  2. Restart your dev server: npm run dev"
    echo "  3. Test the application"
else
    echo ""
    echo "❌ Setup failed. Please check the error messages above."
    exit 1
fi
