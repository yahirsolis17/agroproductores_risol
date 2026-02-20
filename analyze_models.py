import os
import re
import ast
import sys

views_dir = r'c:\Users\Yahir\agroproductores_risol\backend\gestion_bodega\views'
sys.path.insert(0, r'c:\Users\Yahir\agroproductores_risol\backend')

try:
    from gestion_bodega.utils.constants import NOTIFICATION_MESSAGES
    valid_keys = set(NOTIFICATION_MESSAGES.keys())
except Exception as e:
    print('Failed to import constants:', e)
    valid_keys = set()
    
used_keys = set()
pattern = re.compile(r'(?:key|message_key)\s*=\s*(?:f?[\'\"]([^\'\"]+)[\'\"])')
for root, _, files in os.walk(views_dir):
    for f in files:
        if f.endswith('.py'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                content = file.read()
                matches = pattern.findall(content)
                used_keys.update(matches)

missing_keys = used_keys - valid_keys
print('--- MISSING NOTIFICATION KEYS ---')
if missing_keys:
    for k in sorted(missing_keys):
        print(f'- {k}')
else:
    print('All keys are present in constants.py.')

models_file = r'c:\Users\Yahir\agroproductores_risol\backend\gestion_bodega\models.py'
print('\n--- MODELS WITH def clean() ---')
with open(models_file, 'r', encoding='utf-8') as f:
    node = ast.parse(f.read())
    
for cls in [n for n in node.body if isinstance(n, ast.ClassDef)]:
    for func in [m for m in cls.body if isinstance(m, ast.FunctionDef)]:
        if func.name == 'clean':
            print(f'{cls.name}')
