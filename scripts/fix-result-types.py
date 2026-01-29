#!/usr/bin/env python3
import re
import sys

files = [
    'src/app/[locale]/(app)/case/[caseId]/profile/care-intent-section.tsx',
    'src/app/[locale]/(app)/case/[caseId]/profile/conditions-section.tsx',
    'src/app/[locale]/(app)/case/[caseId]/profile/contacts-section.tsx',
    'src/app/[locale]/(app)/case/[caseId]/profile/measurements-section.tsx',
    'src/app/[locale]/(app)/case/[caseId]/profile/medications-section.tsx',
    'src/app/[locale]/(app)/case/[caseId]/profile/profile-section.tsx',
]

type_assertion = ' as { success: boolean; error?: string }'

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern to match: const result = await ...API(...) followed by newline and whitespace
        # But NOT if it already has the type assertion
        pattern = r'(const result = await \w+API\([^)]*(?:\([^)]*\)[^)]*)*\))(\s*\n)'

        def replace_func(match):
            api_call = match.group(1)
            whitespace = match.group(2)

            # Check if already has type assertion
            if type_assertion in api_call:
                return match.group(0)

            return api_call + type_assertion + whitespace

        new_content = re.sub(pattern, replace_func, content)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('+ Fixed: ' + filepath)
        else:
            print('  No changes: ' + filepath)

    except FileNotFoundError:
        print('! Not found: ' + filepath)
    except Exception as e:
        print('X Error in ' + filepath + ': ' + str(e))

print('\nProcessing complete')
