import re

with open(r'c:\Users\Yahir\agroproductores_risol\backend\gestion_bodega\models.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove 'def clean(self):' blocks
# We match '    def clean(self):' and everything indented inside it
clean_pattern = re.compile(r'^ {4}def clean\(self\):.*?(?=\n {4}\w|\nclass |\Z)', re.MULTILINE | re.DOTALL)
text = clean_pattern.sub('', text)

# Remove 'self.full_clean()' lines and optionally the surrounding ifs
full_clean_pattern = re.compile(r'\n {8}if not _is_only_archival_fields\(update_fields\):\n {12}self\.full_clean\(\)')
text = full_clean_pattern.sub('', text)

# Remove the standalone self.full_clean() if they exist
standalone_clean_pattern = re.compile(r'\n\s+self\.full_clean\(\)')
text = standalone_clean_pattern.sub('', text)

with open(r'c:\Users\Yahir\agroproductores_risol\backend\gestion_bodega\models.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("Models refactored successfully.")
