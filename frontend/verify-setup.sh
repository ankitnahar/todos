#!/bin/bash

echo "=================================="
echo "Frontend Setup Verification"
echo "=================================="
echo ""

# Count files
echo "📁 File Statistics:"
echo "-----------------------------------"
echo "TypeScript/React files: $(find src -name '*.tsx' -o -name '*.ts' | wc -l)"
echo "Components: $(find src/components -name '*.tsx' | wc -l)"
echo "Pages: $(find src/pages -name '*.tsx' | wc -l)"
echo "API files: $(find src/api -name '*.ts' | wc -l)"
echo ""

echo "📦 Configuration Files:"
echo "-----------------------------------"
for file in package.json vite.config.ts tsconfig.json tailwind.config.js postcss.config.js; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (missing)"
  fi
done
echo ""

echo "🎯 Key Directories:"
echo "-----------------------------------"
for dir in src/api src/components src/pages src/types src/hooks src/contexts; do
  if [ -d "$dir" ]; then
    echo "✓ $dir ($(find $dir -type f | wc -l) files)"
  else
    echo "✗ $dir (missing)"
  fi
done
echo ""

echo "📝 Pages:"
echo "-----------------------------------"
ls -1 src/pages/ | grep -E '\.tsx$' | sed 's/^/  - /'
echo ""

echo "🧩 Shared Components:"
echo "-----------------------------------"
ls -1 src/components/shared/ | grep -E '\.tsx$' | sed 's/^/  - /'
echo ""

echo "✨ Next Steps:"
echo "-----------------------------------"
echo "1. cd /home/titan/project/todo-app/frontend"
echo "2. npm install"
echo "3. npm run dev"
echo ""
echo "=================================="
echo "Setup Complete! 🎉"
echo "=================================="
