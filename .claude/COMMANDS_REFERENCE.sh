#!/bin/bash
# AegisFlow AI - Quick Command Reference
# Generated: 2026-04-24
# Use these commands to quickly start implementation tasks

echo "🚀 AegisFlow AI - Quick Commands Reference"
echo "==========================================="
echo ""

# Task #1 - API Documentation
echo "📚 TASK #1: API Documentation (Swagger)"
echo "Time: 2.5 hours"
echo "Commands:"
echo '  cd backend'
echo '  composer require darkaonline/l5-swagger'
echo '  php artisan vendor:publish --provider "L5Swagger\L5SwaggerServiceProvider"'
echo '  php artisan l5-swagger:generate'
echo "  # View at: http://localhost:8000/api/docs"
echo ""

# Task #2 - Unit Tests
echo "✅ TASK #2: Unit Tests"
echo "Time: 6-8 hours"
echo "Commands:"
echo '  cd backend'
echo '  php artisan make:test --unit Models/AlertTest'
echo '  php artisan make:test AuthTest'
echo '  php artisan make:test IncidentTest'
echo '  php artisan test'
echo '  php artisan test --coverage'
echo ""

# Task #3 - Demo Seeder
echo "🌱 TASK #3: Demo Seeder Data"
echo "Time: 3 hours"
echo "Commands:"
echo '  cd backend'
echo '  php artisan make:seeder DemoDataSeeder'
echo '  # Edit database/seeders/DemoDataSeeder.php'
echo '  php artisan db:seed --class=DemoDataSeeder'
echo '  # Or fresh migration + seed:'
echo '  php artisan migrate:fresh --seed'
echo ""

# Task #4 - CI/CD
echo "🔄 TASK #4: GitHub Actions CI/CD"
echo "Time: 2 hours"
echo "Commands:"
echo '  mkdir -p .github/workflows'
echo '  # Create .github/workflows/test.yml (see QUICK_START_IMPROVEMENTS.md)'
echo '  git add .github/'
echo '  git commit -m "ci: add GitHub Actions workflow"'
echo '  git push'
echo ""

# Task #5 - Form Validation
echo "✏️ TASK #5: Form Validation"
echo "Time: 4-5 hours"
echo "Commands:"
echo '  cd frontend'
echo '  npm install zod'
echo '  # Update form components with validation'
echo '  yarn dev'
echo '  # Test forms in browser'
echo ""

# Task #6 & 7 - Maps
echo "🗺️ TASK #6 & #7: Maps (Team & Citizen)"
echo "Time: 6-8 hours combined"
echo "Commands:"
echo '  cd frontend'
echo '  yarn dev'
echo '  # Navigate to: /team/map and /citizen/map'
echo '  # Test with DevTools Mobile view'
echo '  # Check WebSocket in Network tab'
echo ""

# Task #8 - Privacy & Audit
echo "🔐 TASK #8: Privacy & Audit Logging"
echo "Time: 3 hours"
echo "Commands:"
echo '  cd backend'
echo '  php artisan make:migration CreateAuditLogsTable'
echo '  php artisan make:middleware LogAuditTrail'
echo '  # Add to app/Http/Middleware'
echo '  php artisan migrate'
echo ""

# Task #9 - i18n
echo "🌐 TASK #9: Internationalization (i18n)"
echo "Time: 4-6 hours"
echo "Commands:"
echo '  cd frontend'
echo '  npm install next-intl'
echo '  # Create src/i18n/ translation files'
echo '  yarn dev'
echo ""

# Task #10 - Analytics
echo "📊 TASK #10: Analytics Dashboard"
echo "Time: 2-3 hours"
echo "Commands:"
echo '  cd frontend'
echo '  # Verify /dashboard/analytics loads'
echo '  yarn dev'
echo '  # Navigate to: http://localhost:3000/dashboard/analytics'
echo ""

echo "==========================================="
echo "📖 Documentation Files:"
echo "  - .claude/EXECUTIVE_SUMMARY.md (Start here!)"
echo "  - .claude/QUICK_START_IMPROVEMENTS.md"
echo "  - .claude/PROJECT_ANALYSIS_AND_IMPROVEMENT_PLAN.md"
echo "  - .claude/CHECKLIST_VISUAL.txt"
echo ""
echo "🎯 Next Step: Read EXECUTIVE_SUMMARY.md (10 min)"
echo "💪 Then start Task #1: API Documentation (2.5 hours)"
echo ""
