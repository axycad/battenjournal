#!/bin/bash

# Fix result type assertions in profile section files

files=(
  "src/app/[locale]/(app)/case/[caseId]/profile/baseline-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/care-intent-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/conditions-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/contacts-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/measurements-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/medications-section.tsx"
  "src/app/[locale]/(app)/case/[caseId]/profile/profile-section.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    # Add type assertion after API calls that return result
    sed -i 's/\(const result = await [^(]*API([^)]*)\)/\1 as { success: boolean; error?: string }/g' "$file"
    echo "  ✓ Fixed"
  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo ""
echo "✅ All files processed"
