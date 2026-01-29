#!/bin/bash

# Fix imports in components directory
find src/components -name "*.tsx" -type f | while read file; do
  # Skip if file doesn't contain @/actions
  if ! grep -q "from '@/actions" "$file"; then
    continue
  fi

  echo "Fixing: $file"

  # Backup
  cp "$file" "${file}.bak"

  # Replace action imports with API imports
  sed -i "s|from '@/actions/appointment'|from '@/lib/api/appointments'|g" "$file"
  sed -i "s|from '@/actions/flags'|from '@/lib/api/clinical'|g" "$file"
  sed -i "s|from '@/actions/clinical-notes'|from '@/lib/api/clinical'|g" "$file"
  sed -i "s|from '@/actions/tasks'|from '@/lib/api/tasks'|g" "$file"
  sed -i "s|from '@/actions/messaging'|from '@/lib/api/messaging'|g" "$file"
  sed -i "s|from '@/actions/event'|from '@/lib/api/events'|g" "$file"
  sed -i "s|from '@/actions/notifications'|from '@/lib/api/notifications'|g" "$file"
  sed -i "s|from '@/actions/notification'|from '@/lib/api/notifications'|g" "$file"
  sed -i "s|from '@/actions/medication-admin'|from '@/lib/api/medications'|g" "$file"
done

echo "Done!"
